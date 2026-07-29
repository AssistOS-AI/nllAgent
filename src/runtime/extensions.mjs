import { lstat, realpath } from 'node:fs/promises';
import { basename, extname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { deepFreeze, normalizeJson, sha256Bytes } from '../core/canonical.mjs';
import { NllError, invariant } from '../core/errors.mjs';
import { readUtf8Strict } from '../core/io.mjs';
import { normalizeValueSchema, validateValueAgainstSchema } from './value-schema.mjs';

const VERSIONED_ID = /^[A-Za-z][A-Za-z0-9._-]*@\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u;
const ENTRY_ID = /^[A-Za-z][A-Za-z0-9._-]*@\d+(?:\.\d+){0,2}(?:-[0-9A-Za-z.-]+)?$/u;
const SHA256 = /^sha256:[0-9a-f]{64}$/u;
const OPERATOR_KEYS = new Set([
  'id', 'description', 'primitives', 'inputSchema', 'outputSchema', 'deterministic',
  'effects', 'capabilities', 'cost', 'limits', 'failureCodes', 'ordering',
  'coverageBehavior', 'guaranteeCeiling', 'witnessSchema', 'execute'
]);
const VERIFIER_KEYS = new Set([
  'id', 'description', 'candidateSchema', 'witnessSchema', 'checkedProperties',
  'inputSchema', 'outputSchema', 'outcomes', 'guaranteeContribution', 'limits', 'execute'
]);

function assertObject(value, label) {
  invariant(value && typeof value === 'object' && !Array.isArray(value),
    'invalid-runtime-extension', `${label} must be an object.`);
}

function assertKeys(value, allowed, label) {
  const unknown = Object.keys(value).filter((key) => !allowed.has(key));
  invariant(unknown.length === 0, 'invalid-runtime-extension',
    `${label} contains unsupported property ${unknown[0]}.`, { unknown });
}

function stringArray(value, label, { allowEmpty = false } = {}) {
  invariant(Array.isArray(value) && (allowEmpty || value.length > 0)
    && value.every((item) => typeof item === 'string' && item.length > 0),
  'invalid-runtime-extension', `${label} must be ${allowEmpty ? 'a' : 'a non-empty'} string array.`);
  return [...value];
}

function contractSchema(value, label) {
  try {
    return normalizeValueSchema(value);
  } catch (error) {
    throw new NllError('invalid-runtime-extension', `${label} must be a valid structured value schema.`, {
      causeCode: error.code, schemaPath: error.details?.path || null
    }, { cause: error });
  }
}

function defineRuntimeOperator(definition) {
  assertObject(definition, 'Runtime operator');
  assertKeys(definition, OPERATOR_KEYS, `Runtime operator ${definition.id || '<unknown>'}`);
  invariant(ENTRY_ID.test(definition.id || ''), 'invalid-runtime-extension',
    'Runtime operator requires an exact versioned id.');
  invariant(typeof definition.description === 'string' && definition.description.trim(),
    'invalid-runtime-extension', `Runtime operator ${definition.id} requires a description.`);
  const inputSchema = contractSchema(definition.inputSchema, `${definition.id}.inputSchema`);
  const outputSchema = contractSchema(definition.outputSchema, `${definition.id}.outputSchema`);
  invariant(typeof definition.deterministic === 'boolean', 'invalid-runtime-extension',
    `Runtime operator ${definition.id} requires an explicit deterministic flag.`);
  invariant(typeof definition.cost === 'string' && definition.cost, 'invalid-runtime-extension',
    `Runtime operator ${definition.id} requires a cost class.`);
  invariant(typeof definition.execute === 'function', 'invalid-runtime-extension',
    `Runtime operator ${definition.id} requires execute().`);
  assertObject(definition.limits, `${definition.id}.limits`);
  return Object.freeze({
    ...definition,
    primitives: stringArray(definition.primitives, `${definition.id}.primitives`),
    effects: stringArray(definition.effects, `${definition.id}.effects`, { allowEmpty: true }),
    capabilities: stringArray(definition.capabilities, `${definition.id}.capabilities`, { allowEmpty: true }),
    failureCodes: stringArray(definition.failureCodes, `${definition.id}.failureCodes`),
    inputSchema,
    outputSchema,
    limits: deepFreeze(normalizeJson(definition.limits))
  });
}

function defineRuntimeVerifier(definition) {
  assertObject(definition, 'Runtime verifier');
  assertKeys(definition, VERIFIER_KEYS, `Runtime verifier ${definition.id || '<unknown>'}`);
  invariant(ENTRY_ID.test(definition.id || ''), 'invalid-runtime-extension',
    'Runtime verifier requires an exact versioned id.');
  invariant(typeof definition.description === 'string' && definition.description.trim(),
    'invalid-runtime-extension', `Runtime verifier ${definition.id} requires a description.`);
  for (const field of ['candidateSchema', 'witnessSchema', 'guaranteeContribution']) {
    invariant(typeof definition[field] === 'string' && definition[field], 'invalid-runtime-extension',
      `Runtime verifier ${definition.id} requires ${field}.`);
  }
  const inputSchema = contractSchema(definition.inputSchema, `${definition.id}.inputSchema`);
  const outputSchema = contractSchema(definition.outputSchema, `${definition.id}.outputSchema`);
  invariant(typeof definition.execute === 'function', 'invalid-runtime-extension',
    `Runtime verifier ${definition.id} requires execute().`);
  assertObject(definition.limits, `${definition.id}.limits`);
  return Object.freeze({
    ...definition,
    checkedProperties: stringArray(definition.checkedProperties, `${definition.id}.checkedProperties`),
    outcomes: stringArray(definition.outcomes, `${definition.id}.outcomes`),
    inputSchema,
    outputSchema,
    limits: deepFreeze(normalizeJson(definition.limits))
  });
}

function defineRuntimeExtension(definition) {
  assertObject(definition, 'Runtime extension');
  assertKeys(definition, new Set(['kind', 'id', 'description', 'operators', 'verifiers']), 'Runtime extension');
  invariant(definition.kind === 'NllRuntimeExtension', 'invalid-runtime-extension',
    'Runtime extension kind must be NllRuntimeExtension.');
  invariant(VERSIONED_ID.test(definition.id || ''), 'invalid-runtime-extension',
    'Runtime extension requires an exact semantic-versioned id.');
  invariant(typeof definition.description === 'string' && definition.description.trim(),
    'invalid-runtime-extension', `Runtime extension ${definition.id} requires a description.`);
  invariant(Array.isArray(definition.operators) && Array.isArray(definition.verifiers),
    'invalid-runtime-extension', 'Runtime extension requires operator and verifier arrays.');
  const operators = definition.operators.map(defineRuntimeOperator);
  const verifiers = definition.verifiers.map(defineRuntimeVerifier);
  invariant(operators.length + verifiers.length > 0, 'invalid-runtime-extension',
    `Runtime extension ${definition.id} contains no registry entries.`);
  for (const [kind, entries] of [['operator', operators], ['verifier', verifiers]]) {
    const ids = entries.map((entry) => entry.id);
    invariant(new Set(ids).size === ids.length, 'invalid-runtime-extension',
      `Runtime extension ${definition.id} contains duplicate ${kind} ids.`);
  }
  return Object.freeze({ ...definition, operators: Object.freeze(operators), verifiers: Object.freeze(verifiers) });
}

function safeContext(context) {
  return Object.freeze({
    program: deepFreeze(normalizeJson(context.program)),
    circuit: deepFreeze(normalizeJson(context.circuit)),
    node: deepFreeze(normalizeJson(context.node)),
    operationalContext: deepFreeze(normalizeJson(context.options?.operationalContext || null))
  });
}

function guardedExecute(entry, extension, descriptor) {
  return async (inputs, context) => {
    try {
      const normalizedInputs = deepFreeze(normalizeJson(inputs));
      validateValueAgainstSchema(normalizedInputs, entry.inputSchema, {
        code: 'runtime-extension-input-invalid', label: `${entry.id} input`
      });
      const output = deepFreeze(normalizeJson(await entry.execute(
        normalizedInputs,
        safeContext(context)
      )));
      validateValueAgainstSchema(output, entry.outputSchema, {
        code: 'runtime-extension-output-invalid', label: `${entry.id} output`
      });
      return output;
    } catch (error) {
      if (error instanceof NllError) throw error;
      throw new NllError('runtime-extension-failed',
        `${entry.id} from ${extension.id} failed: ${error.message}`, {
          extension: extension.id, entry: entry.id, implementationDigest: descriptor.digest
        }, { cause: error });
    }
  };
}

function installRuntimeExtension(registries, value, suppliedDescriptor = undefined) {
  assertObject(registries, 'Registries');
  invariant(registries.operators?.register && registries.verifiers?.register,
    'invalid-runtime-extension', 'Runtime extension installation requires operator and verifier registries.');
  const loaded = value?.kind === 'LoadedRuntimeExtension' ? value : null;
  const extension = defineRuntimeExtension(loaded ? loaded.definition : value);
  const descriptor = suppliedDescriptor || loaded?.descriptor;
  assertObject(descriptor, `Descriptor for ${extension.id}`);
  invariant(descriptor.id === extension.id && SHA256.test(descriptor.digest || ''),
    'invalid-runtime-extension', `Descriptor for ${extension.id} requires its id and a SHA-256 digest.`);
  const existing = registries.extensions || [];
  invariant(!existing.some((item) => item.id === extension.id), 'duplicate-runtime-extension',
    `Runtime extension ${extension.id} is already installed.`);
  for (const entry of extension.operators) {
    invariant(!registries.operators.has(entry.id), 'duplicate-registry-entry',
      `${entry.id} is already registered.`);
  }
  for (const entry of extension.verifiers) {
    invariant(!registries.verifiers.has(entry.id), 'duplicate-registry-entry',
      `${entry.id} is already registered.`);
  }
  for (const entry of extension.operators) registries.operators.register({
    ...entry, extension: extension.id, implementationDigest: descriptor.digest,
    execute: guardedExecute(entry, extension, descriptor)
  });
  for (const entry of extension.verifiers) registries.verifiers.register({
    ...entry, extension: extension.id, implementationDigest: descriptor.digest,
    execute: guardedExecute(entry, extension, descriptor)
  });
  const publicDescriptor = Object.freeze({
    id: extension.id, description: extension.description, digest: descriptor.digest,
    entry: descriptor.entry || null, selfContained: descriptor.selfContained === true,
    operators: extension.operators.map((entry) => entry.id),
    verifiers: extension.verifiers.map((entry) => entry.id)
  });
  if (!registries.extensions) registries.extensions = [];
  registries.extensions.push(publicDescriptor);
  return publicDescriptor;
}

function maskedExtensionSource(source) {
  let state = 'code';
  let escaped = false;
  let result = '';
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];
    if (state === 'code' && ['\'', '"', '`'].includes(character)) {
      state = character;
      result += ' ';
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
    if (['\'', '"', '`'].includes(state)) {
      result += character === '\n' ? '\n' : ' ';
      if (!escaped && character === state) state = 'code';
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

function assertSelfContainedSource(source, path) {
  const inspected = maskedExtensionSource(source);
  if (/\b(?:import|require)\b/u.test(inspected) || /\bexport\s+(?:\*|\{)[\s\S]*?\bfrom\b/u.test(inspected)) {
    throw new NllError('runtime-extension-not-self-contained',
      `Runtime extension ${path} must be one self-contained ESM file without imports or re-exports.`, { path });
  }
}

async function loadRuntimeExtension(path, options = {}) {
  const absolute = resolve(options.baseDir || process.cwd(), path);
  invariant(extname(absolute).toLowerCase() === '.mjs', 'invalid-runtime-extension',
    'Runtime extension entry must use the .mjs extension.', { path: absolute });
  const metadata = await lstat(absolute).catch(() => null);
  invariant(metadata?.isFile() && !metadata.isSymbolicLink(), 'invalid-runtime-extension',
    'Runtime extension entry must be a regular non-symlink file.', { path: absolute });
  const canonicalPath = await realpath(absolute);
  const source = await readUtf8Strict(canonicalPath);
  assertSelfContainedSource(source, canonicalPath);
  const digest = sha256Bytes(source);
  let imported;
  try {
    imported = await import(`${pathToFileURL(canonicalPath).href}?nll-digest=${digest.slice(7)}`);
  } catch (error) {
    throw new NllError('runtime-extension-load-failed',
      `Unable to load trusted runtime extension ${canonicalPath}: ${error.message}`,
      { path: canonicalPath, digest }, { cause: error });
  }
  const definition = defineRuntimeExtension(imported.default);
  return Object.freeze({
    kind: 'LoadedRuntimeExtension', definition,
    descriptor: Object.freeze({
      id: definition.id, digest, entry: basename(canonicalPath), selfContained: true
    })
  });
}

async function loadAndInstallRuntimeExtension(registries, path, options = {}) {
  return installRuntimeExtension(registries, await loadRuntimeExtension(path, options));
}

function validateRuntimeExtensionLocks(manifest, compiledCircuits, registries, options = {}) {
  const declared = manifest.runtimeExtensions || [];
  invariant(Array.isArray(declared), 'invalid-release', 'runtimeExtensions must be an array.');
  const declaredById = new Map();
  for (const descriptor of declared) {
    assertObject(descriptor, 'Release runtime extension descriptor');
    invariant(VERSIONED_ID.test(descriptor.id || '') && SHA256.test(descriptor.digest || ''),
      'invalid-release', 'Release runtime extension descriptors require exact id and digest.');
    invariant(!declaredById.has(descriptor.id), 'invalid-release',
      `Release declares runtime extension ${descriptor.id} more than once.`);
    declaredById.set(descriptor.id, descriptor);
  }
  const installedById = new Map((registries.extensions || []).map((descriptor) => [descriptor.id, descriptor]));
  const requiredIds = new Set();
  for (const compiled of compiledCircuits) {
    for (const node of compiled.circuit.nodes) {
      const entry = node.operator ? registries.operators.get(node.operator)
        : node.verifier ? registries.verifiers.get(node.verifier) : null;
      if (entry?.extension) requiredIds.add(entry.extension);
    }
  }
  for (const id of requiredIds) {
    const expected = declaredById.get(id);
    const installed = installedById.get(id);
    invariant(expected, 'runtime-extension-lock-missing',
      `Release does not lock required runtime extension ${id}.`, { extension: id });
    invariant(installed && installed.digest === expected.digest, 'runtime-extension-lock-mismatch',
      `Installed runtime extension ${id} does not match the release digest.`, {
        extension: id, expected: expected.digest, actual: installed?.digest || null
      });
  }
  if (options.requireExact) {
    const unused = [...declaredById.keys()].filter((id) => !requiredIds.has(id));
    invariant(unused.length === 0, 'invalid-release',
      `Release locks unused runtime extension ${unused[0]}.`, { unused });
  }
  return [...requiredIds].sort().map((id) => ({ id, digest: declaredById.get(id).digest }));
}

export {
  defineRuntimeExtension,
  defineRuntimeOperator,
  defineRuntimeVerifier,
  installRuntimeExtension,
  loadAndInstallRuntimeExtension,
  loadRuntimeExtension,
  validateRuntimeExtensionLocks
};
