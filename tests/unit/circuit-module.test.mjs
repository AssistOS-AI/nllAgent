import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateCircuitModule } from '../../src/circuit/module-loader.mjs';

test('restricted CircuitJS MJS evaluates declarative logic references', () => {
  const value = evaluateCircuitModule(`
    export default circuit({
      kind: 'CircuitJS', id: 'test.mjs', version: '1.0.0',
      inputs: { paragraphs: { type: 'document.paragraph@1' } },
      nodes: [
        { id: 'scan', primitive: 'call', operator: 'core.identity@1', inputs: { records: port('paragraphs') } },
        { id: 'check', primitive: 'verify', verifier: 'text.exact-match@1', inputs: { candidates: node('scan') } },
        { id: 'out', primitive: 'emit', inputs: { verified: node('check') } }
      ],
      outputs: { findings: node('out') }
    });
  `, { path: 'test.circuit.mjs' });
  assert.equal(value.id, 'test.mjs');
  assert.deepEqual(value.nodes[0].inputs.records, { $port: 'paragraphs' });
  assert.deepEqual(value.outputs.findings, { $node: 'out' });
});

test('restricted CircuitJS MJS exposes explicit observation-binding author syntax', () => {
  const value = evaluateCircuitModule(`
    export default circuit({
      kind: 'CircuitJS', id: 'test.binding', version: '1.0.0',
      inputs: {
        narrative: observationBinding({
          type: 'document.paragraph@1', statuses: ['extracted'],
          where: [{ path: 'payload.structuralRole', operator: 'eq', value: 'paragraph' }]
        })
      },
      nodes: [{
        id: 'scan', primitive: 'call', operator: 'core.identity@1',
        inputs: { records: binding('narrative') }
      }],
      outputs: { records: node('scan') }
    });
  `, { path: 'binding.circuit.mjs' });
  assert.deepEqual(value.nodes[0].inputs.records, { $port: 'narrative' });
  assert.equal(value.inputs.narrative.where[0].path, 'payload.structuralRole');
});

test('restricted CircuitJS MJS rejects imports and runtime effects', () => {
  assert.throws(
    () => evaluateCircuitModule("import fs from 'node:fs'; export default circuit({});", { path: 'effect.circuit.mjs' }),
    (error) => error.code === 'circuit-module-capability-denied'
  );
  assert.throws(
    () => evaluateCircuitModule("export default circuit({ value: process.cwd() });", { path: 'effect.circuit.mjs' }),
    (error) => error.code === 'circuit-module-capability-denied'
  );
});

test('restricted CircuitJS MJS accepts only the declarative circuit call and rejects lossy values', () => {
  assert.throws(
    () => evaluateCircuitModule(`
      export default (() => circuit({
        kind: 'CircuitJS', id: 'hidden.iife', version: '1.0.0',
        inputs: {}, nodes: [], outputs: {}
      }))();
    `, { path: 'iife.circuit.mjs' }),
    (error) => error.code === 'circuit-module-capability-denied'
  );
  assert.throws(
    () => evaluateCircuitModule(`
      export default circuit({
        kind: 'CircuitJS', id: 'hidden.function', version: '1.0.0',
        inputs: {}, nodes: [], outputs: {}, hidden: function hidden() {}
      });
    `, { path: 'function.circuit.mjs' }),
    (error) => error.code === 'circuit-module-capability-denied'
      || error.code === 'invalid-circuit-module'
  );
});
