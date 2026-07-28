import assert from 'node:assert/strict';
import test from 'node:test';
import { canonicalStringify, digestJson } from '../../src/core/canonical.mjs';
import { assertJsonSchema } from '../../src/core/json-schema.mjs';
import { containedPath, validateAgentName } from '../../src/core/paths.mjs';

test('canonical JSON sorts object keys and creates stable digests', () => {
  assert.equal(canonicalStringify({ z: 1, a: { d: 2, b: 3 } }), '{\n  "a": {\n    "b": 3,\n    "d": 2\n  },\n  "z": 1\n}\n');
  assert.equal(digestJson({ b: 2, a: 1 }), digestJson({ a: 1, b: 2 }));
});

test('canonical JSON rejects cycles and non-plain objects', () => {
  const cycle = {};
  cycle.self = cycle;
  assert.throws(() => canonicalStringify(cycle), /cycles/u);
  assert.throws(() => canonicalStringify(new Map()), /plain objects/u);
});

test('canonical JSON and schema validation reject lossy or executable values', () => {
  assert.throws(() => canonicalStringify({ omitted: undefined }), /undefined/u);
  const cyclic = [];
  cyclic.push(cyclic);
  assert.throws(() => canonicalStringify(cyclic), /cycles/u);
  const accessor = {};
  Object.defineProperty(accessor, 'value', { enumerable: true, get: () => 'hidden' });
  assert.throws(() => assertJsonSchema(accessor, { type: 'object' }), /schema/u);
});

test('agent names and contained paths fail closed', () => {
  assert.equal(validateAgentName('editorial-ro'), 'editorial-ro');
  assert.throws(() => validateAgentName('../escape'), /must match/u);
  assert.equal(containedPath('/tmp/agents', 'one'), '/tmp/agents/one');
  assert.throws(() => containedPath('/tmp/agents', '..', 'escape'), /escapes/u);
});
