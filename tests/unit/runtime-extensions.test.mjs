import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { compileCircuit } from '../../src/circuit/compiler.mjs';
import { loadCircuitSource } from '../../src/circuit/module-loader.mjs';
import { atomicWrite } from '../../src/core/io.mjs';
import { compileMarkdown } from '../../src/longtext/compiler.mjs';
import {
  defineRuntimeExtension,
  installRuntimeExtension,
  loadAndInstallRuntimeExtension,
  loadRuntimeExtension,
  validateRuntimeExtensionLocks
} from '../../src/runtime/extensions.mjs';
import { executeCircuit } from '../../src/runtime/scheduler.mjs';
import { createStandardRegistries } from '../../src/runtime/standard-operators.mjs';

const EXAMPLE_ROOT = resolve('examples/runtime-extension');

test('a trusted JavaScript extension supplies real CircuitJS operator and verifier code', async () => {
  const registries = createStandardRegistries();
  const descriptor = await loadAndInstallRuntimeExtension(
    registries,
    resolve(EXAMPLE_ROOT, 'paragraph-length.extension.mjs')
  );
  const circuit = compileCircuit(
    await loadCircuitSource(resolve(EXAMPLE_ROOT, 'paragraph-length.circuit.mjs')),
    registries
  );
  const program = compileMarkdown([
    '# Test', '', 'One two.', '',
    'One two three four five six seven eight nine ten eleven twelve thirteen.'
  ].join('\n'));
  const result = await executeCircuit(circuit, program, registries);

  assert.equal(descriptor.id, 'example.paragraph-metrics@1.0.0');
  assert.match(descriptor.digest, /^sha256:[0-9a-f]{64}$/u);
  assert.deepEqual(circuit.order, ['candidates', 'verified', 'findings']);
  assert.equal(result.outputs.findings.length, 1);
  assert.equal(result.outputs.findings[0].witness.count, 13);
  assert.equal(result.outputs.findings[0].verifierResult.status, 'accept');
  assert.equal(registries.operators.get('example.paragraph-length@1').extension, descriptor.id);
});

test('extension source must be a self-contained regular MJS file', async () => {
  const root = await mkdtemp(join(tmpdir(), 'nll-runtime-extension-'));
  const imported = join(root, 'imported.mjs');
  await atomicWrite(imported, "import fs from 'node:fs';\nexport default { kind: 'NllRuntimeExtension' };\n");
  await assert.rejects(() => loadRuntimeExtension(imported),
    (error) => error.code === 'runtime-extension-not-self-contained');
  await assert.rejects(() => loadRuntimeExtension(join(root, 'missing.mjs')),
    (error) => error.code === 'invalid-runtime-extension');
});

test('extension contracts require explicit execution and verification metadata', () => {
  assert.throws(() => defineRuntimeExtension({
    kind: 'NllRuntimeExtension', id: 'example.invalid@1.0.0', description: 'Incomplete.',
    operators: [{ id: 'example.invalid@1', description: 'Missing contracts.', execute() { return []; } }],
    verifiers: []
  }), (error) => error.code === 'invalid-runtime-extension' && /inputSchema/u.test(error.message));
});

test('extension execution receives immutable plain data and must return plain data', async () => {
  const mutationExtension = defineRuntimeExtension({
    kind: 'NllRuntimeExtension', id: 'example.mutation@1.0.0', description: 'Mutation probe.',
    operators: [{
      id: 'example.mutation@1', description: 'Attempt to mutate inputs.', primitives: ['call'],
      inputSchema: 'records@1', outputSchema: 'records@1', deterministic: true, effects: [],
      capabilities: [], cost: 'constant', limits: {}, failureCodes: ['runtime-extension-failed'],
      execute(inputs) { inputs.records.push('forbidden'); return inputs.records; }
    }],
    verifiers: []
  });
  const registries = createStandardRegistries();
  installRuntimeExtension(registries, mutationExtension, {
    id: mutationExtension.id,
    digest: `sha256:${'1'.repeat(64)}`,
    entry: 'in-memory-test'
  });
  await assert.rejects(() => registries.operators.get('example.mutation@1').execute(
    { records: [] },
    { program: compileMarkdown('Text.'), circuit: {}, node: {}, options: {} }
  ), (error) => error.code === 'runtime-extension-failed');

  const invalidOutput = defineRuntimeExtension({
    kind: 'NllRuntimeExtension', id: 'example.invalid-output@1.0.0', description: 'Output probe.',
    operators: [{
      id: 'example.invalid-output@1', description: 'Return a non-plain value.', primitives: ['call'],
      inputSchema: 'none@1', outputSchema: 'invalid@1', deterministic: true, effects: [],
      capabilities: [], cost: 'constant', limits: {}, failureCodes: ['runtime-extension-failed'],
      execute() { return new Date(0); }
    }],
    verifiers: []
  });
  const second = createStandardRegistries();
  installRuntimeExtension(second, invalidOutput, {
    id: invalidOutput.id,
    digest: `sha256:${'2'.repeat(64)}`,
    entry: 'in-memory-test'
  });
  await assert.rejects(() => second.operators.get('example.invalid-output@1').execute(
    {}, { program: compileMarkdown('Text.'), circuit: {}, node: {}, options: {} }
  ), (error) => error.code === 'runtime-extension-failed');
});

test('node cache identity includes the extension implementation digest', async () => {
  const registries = createStandardRegistries();
  const descriptor = await loadAndInstallRuntimeExtension(
    registries,
    resolve(EXAMPLE_ROOT, 'paragraph-length.extension.mjs')
  );
  const circuit = compileCircuit(
    await loadCircuitSource(resolve(EXAMPLE_ROOT, 'paragraph-length.circuit.mjs')),
    registries
  );
  const materials = [];
  const cache = {
    async get(material) { materials.push(material); return null; },
    async set() {}
  };
  await executeCircuit(circuit, compileMarkdown('# Test\n\nOne two three.'), registries, { cache });
  assert.equal(materials[0].implementation.id, 'example.paragraph-length@1');
  assert.equal(materials[0].implementation.digest, descriptor.digest);
});

test('published circuits lock the exact extension digest they execute', async () => {
  const registries = createStandardRegistries();
  const loaded = await loadRuntimeExtension(resolve(EXAMPLE_ROOT, 'paragraph-length.extension.mjs'));
  const descriptor = installRuntimeExtension(registries, loaded);
  const circuit = compileCircuit(
    await loadCircuitSource(resolve(EXAMPLE_ROOT, 'paragraph-length.circuit.mjs')),
    registries
  );
  assert.deepEqual(validateRuntimeExtensionLocks({
    runtimeExtensions: [{ id: descriptor.id, digest: descriptor.digest }]
  }, [circuit], registries, { requireExact: true }), [{ id: descriptor.id, digest: descriptor.digest }]);
  assert.throws(() => validateRuntimeExtensionLocks({
    runtimeExtensions: [{ id: descriptor.id, digest: `sha256:${'0'.repeat(64)}` }]
  }, [circuit], registries), (error) => error.code === 'runtime-extension-lock-mismatch');
  assert.throws(() => validateRuntimeExtensionLocks({}, [circuit], registries),
    (error) => error.code === 'runtime-extension-lock-missing');
  assert.throws(() => installRuntimeExtension(registries, loaded),
    (error) => error.code === 'duplicate-runtime-extension');
});
