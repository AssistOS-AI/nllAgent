import { Script, createContext } from 'node:vm';
import { extname } from 'node:path';
import { readJson, readUtf8Strict } from '../core/io.mjs';
import { NllError } from '../core/errors.mjs';
import {
  binding, circuit, node, observationBinding, port, queryFirstCircuit
} from './dsl.mjs';

const FORBIDDEN_SOURCE = [
  ['module imports', /\b(?:import|require)\b/u],
  ['asynchronous execution', /\b(?:await|async)\b/u],
  ['code generation', /\b(?:eval|Function|WebAssembly)\b/u],
  ['runtime globals', /\b(?:process|global|globalThis|Buffer)\b/u],
  ['external effects', /\b(?:fetch|XMLHttpRequest|WebSocket)\b/u],
  ['prototype access', /\b(?:constructor|prototype|__proto__)\b/u],
  ['dynamic object mechanisms', /\b(?:Proxy|Reflect)\b/u],
  ['executable functions', /=>|\b(?:function|class|new|this|yield)\b/u],
  ['imperative control flow', /\b(?:if|else|switch|case|for|while|do|try|catch|throw|return|with|delete)\b/u]
];

const ALLOWED_CALLS = new Set([
  'binding', 'circuit', 'node', 'observationBinding', 'port', 'queryFirstCircuit'
]);

function lexicalView(source, options = {}) {
  let state = 'code';
  let escaped = false;
  let result = '';
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];
    if (state === 'code' && character === '`') {
      throw new NllError(
        'circuit-module-capability-denied',
        'Circuit modules do not allow template literals.',
        { capability: 'template-literal' }
      );
    }
    if (state === 'code' && (character === "'" || character === '"')) {
      state = character === "'" ? 'single' : 'double';
      result += options.maskStrings ? ' ' : character;
      continue;
    }
    if (state === 'code' && character === '/' && next === '/') {
      state = 'line-comment';
      result += '  ';
      index += 1;
      continue;
    }
    if (state === 'code' && character === '/' && next === '*') {
      state = 'block-comment';
      result += '  ';
      index += 1;
      continue;
    }
    if (state === 'single' || state === 'double') {
      result += options.maskStrings ? (character === '\n' ? '\n' : ' ') : character;
      if (!escaped && ((state === 'single' && character === "'") || (state === 'double' && character === '"'))) {
        state = 'code';
      }
      escaped = !escaped && character === '\\';
      if (character !== '\\') escaped = false;
      continue;
    }
    if (state === 'line-comment') {
      if (character === '\n') {
        state = 'code';
        result += '\n';
      } else result += ' ';
      continue;
    }
    if (state === 'block-comment') {
      if (character === '*' && next === '/') {
        state = 'code';
        result += '  ';
        index += 1;
      } else result += character === '\n' ? '\n' : ' ';
      continue;
    }
    result += character;
  }
  return result;
}

function moduleExpression(source, path) {
  const cleaned = lexicalView(source).trim();
  const inspected = lexicalView(cleaned, { maskStrings: true });
  for (const [capability, pattern] of FORBIDDEN_SOURCE) {
    if (pattern.test(inspected)) {
      throw new NllError(
        'circuit-module-capability-denied',
        `Circuit module ${path} requests forbidden ${capability}.`,
        { path, capability }
      );
    }
  }
  const match = cleaned.match(/^export\s+default\s+([\s\S]+?);?\s*$/u);
  if (!match) {
    throw new NllError(
      'invalid-circuit-module',
      'A CircuitJS .mjs file must contain one direct circuit({...}) or queryFirstCircuit({...}) export.',
      { path }
    );
  }
  const expression = match[1].replace(/;\s*$/u, '');
  const expressionView = lexicalView(expression, { maskStrings: true }).trim();
  if (!/^(?:circuit|queryFirstCircuit)\s*\([\s\S]*\)$/u.test(expressionView)) {
    throw new NllError(
      'circuit-module-capability-denied',
      `Circuit module ${path} must be one direct circuit({...}) or queryFirstCircuit({...}) constructor call.`,
      { path, capability: 'arbitrary-expression' }
    );
  }
  for (const call of expressionView.matchAll(/(?:^|[^.$\w])([A-Za-z_$][\w$]*)\s*\(/gu)) {
    if (!ALLOWED_CALLS.has(call[1])) {
      throw new NllError(
        'circuit-module-capability-denied',
        `Circuit module ${path} calls unapproved constructor ${call[1]}.`,
        { path, capability: 'unapproved-call', call: call[1] }
      );
    }
  }
  return expression;
}

function strictPlainData(value, path = '$', seen = new Set()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError(`${path} contains a non-finite number.`);
    return Object.is(value, -0) ? 0 : value;
  }
  if (typeof value !== 'object') throw new TypeError(`${path} contains ${typeof value}.`);
  if (seen.has(value)) throw new TypeError(`${path} contains a cycle.`);
  seen.add(value);
  if (Array.isArray(value)) {
    const array = value.map((item, index) => strictPlainData(item, `${path}[${index}]`, seen));
    seen.delete(value);
    return array;
  }
  if (Object.prototype.toString.call(value) !== '[object Object]' || Object.getOwnPropertySymbols(value).length) {
    throw new TypeError(`${path} is not a plain string-keyed object.`);
  }
  const result = {};
  for (const key of Object.keys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) throw new TypeError(`${path}.${key} is an accessor.`);
    result[key] = strictPlainData(descriptor.value, `${path}.${key}`, seen);
  }
  seen.delete(value);
  return result;
}

function evaluateCircuitModule(source, options = {}) {
  const path = options.path || '<circuit.mjs>';
  const expression = moduleExpression(source, path);
  const sandbox = Object.create(null);
  Object.assign(sandbox, { binding, circuit, node, observationBinding, port, queryFirstCircuit });
  const context = createContext(sandbox, {
    name: `CircuitJS:${path}`,
    codeGeneration: { strings: false, wasm: false }
  });
  let value;
  try {
    value = new Script(`"use strict"; (${expression})`, {
      filename: path,
      displayErrors: true
    }).runInContext(context, { timeout: options.timeoutMs ?? 100 });
  } catch (error) {
    throw new NllError(
      'invalid-circuit-module',
      `Unable to evaluate restricted CircuitJS module ${path}: ${error.message}`,
      { path },
      { cause: error }
    );
  }
  try {
    return strictPlainData(value);
  } catch (error) {
    throw new NllError(
      'invalid-circuit-module',
      `CircuitJS module ${path} did not produce JSON-compatible data.`,
      { path },
      { cause: error }
    );
  }
}

async function loadCircuitSource(path, options = {}) {
  const extension = extname(path).toLowerCase();
  if (extension === '.json') return readJson(path);
  if (extension === '.mjs') {
    return evaluateCircuitModule(await readUtf8Strict(path), { ...options, path });
  }
  throw new NllError(
    'unsupported-circuit-format',
    'Circuit files must use .circuit.mjs or .json.',
    { path }
  );
}

export { evaluateCircuitModule, loadCircuitSource, moduleExpression, strictPlainData };
