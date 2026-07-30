import { createHash } from 'node:crypto';
import { NllError } from './errors.mjs';

const SOURCE_FORM = Symbol.for('nll.source-form');

function quote(value) {
  return `'${value
    .replaceAll('\\', '\\\\')
    .replaceAll("'", "\\'")
    .replaceAll('\r', '\\r')
    .replaceAll('\n', '\\n')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029')}'`;
}

function canonicalSource(value, seen = new Set()) {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return quote(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new NllError('invalid-canonical-value', 'Canonical numbers must be finite.');
    return Object.is(value, -0) ? '-0' : String(value);
  }
  if (typeof value === 'bigint') return `${value}n`;
  if (typeof value === 'symbol' || typeof value === 'function') {
    throw new NllError('invalid-canonical-value', `Unsupported canonical value type: ${typeof value}.`);
  }
  if (seen.has(value)) throw new NllError('cyclic-canonical-value', 'Canonical values must be acyclic.');
  seen.add(value);
  try {
    if (typeof value[SOURCE_FORM] === 'function') return value[SOURCE_FORM]();
    if (Array.isArray(value)) return `sequence(${value.map((item) => canonicalSource(item, seen)).join(',')})`;
    if (value instanceof Set) {
      const items = [...value].map((item) => canonicalSource(item, seen)).sort();
      return `setOf(${items.join(',')})`;
    }
    if (value instanceof Map) {
      const entries = [...value].map(([key, item]) => [canonicalSource(key, seen), canonicalSource(item, seen)]);
      entries.sort(([left], [right]) => left.localeCompare(right));
      return `mapOf(${entries.map(([key, item]) => `entry(${key},${item})`).join(',')})`;
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new NllError('invalid-canonical-value', `Class ${value.constructor?.name || 'unknown'} lacks a source form.`);
    }
    const entries = Object.keys(value).sort().map((key) => `${quote(key)}:${canonicalSource(value[key], seen)}`);
    return `record(${entries.join(',')})`;
  } finally {
    seen.delete(value);
  }
}

function digestSource(value) {
  return createHash('sha256').update(canonicalSource(value)).digest('hex');
}

function digestText(text) {
  return createHash('sha256').update(text).digest('hex');
}

export { SOURCE_FORM, canonicalSource, digestSource, digestText, quote };
