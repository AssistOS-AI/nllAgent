import assert from 'node:assert/strict';
import test from 'node:test';
import { CORE_PRIMITIVES, PRIMITIVES, compileCircuit } from '../../src/circuit/compiler.mjs';
import { compileMarkdown } from '../../src/longtext/compiler.mjs';
import { executeCircuit } from '../../src/runtime/scheduler.mjs';
import { createStandardRegistries } from '../../src/runtime/standard-operators.mjs';

function coreInputs(primitive) {
  if (['guard', 'assert', 'require'].includes(primitive)) return { condition: true, value: 'passed' };
  if (primitive === 'choose') return { condition: true, whenTrue: 'left', whenFalse: 'right' };
  if (primitive === 'merge') return { left: [1], right: [2] };
  if (primitive === 'fallback') return { first: [], second: 'available' };
  if (primitive === 'ask') return { type: 'test.observation@1', reason: 'test demand' };
  return { value: primitive };
}

test('the compiler recognizes and links every declared CircuitJS primitive', () => {
  for (const primitive of PRIMITIVES) {
    const registries = createStandardRegistries();
    let nodes;
    let outputs;
    if (primitive === 'verify') {
      nodes = [{
        id: 'subject', primitive, verifier: 'query.decision-replay@1', inputs: { candidates: [] }
      }];
      outputs = { values: { $node: 'subject' } };
    } else if (primitive === 'emit') {
      nodes = [
        { id: 'verified', primitive: 'verify', verifier: 'query.decision-replay@1', inputs: { candidates: [] } },
        { id: 'subject', primitive: 'emit', inputs: { verified: { $node: 'verified' } } }
      ];
      outputs = { findings: { $node: 'subject' } };
    } else if (CORE_PRIMITIVES.has(primitive)) {
      nodes = [{ id: 'subject', primitive, inputs: coreInputs(primitive) }];
      outputs = { values: { $node: 'subject' } };
    } else {
      const operator = `test.${primitive}@1`;
      registries.operators.register({
        id: operator, primitives: [primitive], execute: ({ value }) => ({ primitive, value })
      });
      nodes = [{ id: 'subject', primitive, operator, inputs: { value: 'input' } }];
      outputs = { values: { $node: 'subject' } };
    }
    const compiled = compileCircuit({
      kind: 'CircuitJS', id: `test.primitive-${primitive}`, version: '1.0.0',
      inputs: {}, nodes, outputs
    }, registries);
    assert.ok(compiled.order.includes('subject'), primitive);
  }
});

test('operator metadata prevents a semantic primitive from invoking an unrelated implementation', () => {
  const registries = createStandardRegistries();
  registries.operators.register({
    id: 'test.filter-only@1', primitives: ['filter'], execute: ({ records = [] }) => records
  });
  assert.throws(() => compileCircuit({
    kind: 'CircuitJS', id: 'test.wrong-primitive', version: '1.0.0', inputs: {},
    nodes: [{ id: 'wrong', primitive: 'search', operator: 'test.filter-only@1', inputs: {} }],
    outputs: { values: { $node: 'wrong' } }
  }, registries), /not permitted for primitive search/u);
});

test('core control primitives have explicit runtime value and failure behavior', async () => {
  const registries = createStandardRegistries();
  const circuit = {
    kind: 'CircuitJS', id: 'test.core-controls', version: '1.0.0', inputs: {},
    nodes: [
      { id: 'guard', primitive: 'guard', inputs: { condition: true, value: 'guarded' } },
      { id: 'guard-false', primitive: 'guard', inputs: { condition: false, value: 'hidden' } },
      { id: 'require', primitive: 'require', inputs: { condition: true, value: 'required' } },
      { id: 'choose', primitive: 'choose', inputs: { condition: false, whenTrue: 'yes', whenFalse: 'no' } },
      { id: 'merge', primitive: 'merge', inputs: { a: [1], b: [2, 3] } },
      { id: 'fallback', primitive: 'fallback', inputs: { a: [], b: 'fallback' } },
      { id: 'ask', primitive: 'ask', inputs: { type: 'test.observation@1', reason: 'missing' } },
      { id: 'fork', primitive: 'fork', inputs: { value: 'branch' } },
      { id: 'certify', primitive: 'certify', inputs: { value: 'certificate-scaffold' } },
      { id: 'explain', primitive: 'explain', inputs: { value: 'explanation-scaffold' } }
    ],
    outputs: {
      guard: { $node: 'guard' }, guardFalse: { $node: 'guard-false' },
      require: { $node: 'require' }, choose: { $node: 'choose' }, merge: { $node: 'merge' },
      fallback: { $node: 'fallback' }, ask: { $node: 'ask' }, fork: { $node: 'fork' },
      certify: { $node: 'certify' }, explain: { $node: 'explain' }
    }
  };
  const result = await executeCircuit(compileCircuit(circuit, registries), compileMarkdown('Input.'), registries);
  assert.equal(result.outputs.guard, 'guarded');
  assert.deepEqual(result.outputs.guardFalse, []);
  assert.equal(result.outputs.require, 'required');
  assert.equal(result.outputs.choose, 'no');
  assert.deepEqual(result.outputs.merge, [1, 2, 3]);
  assert.equal(result.outputs.fallback, 'fallback');
  assert.equal(result.outputs.ask.kind, 'NeedObservation');
  assert.equal(result.outputs.fork, 'branch');
  assert.equal(result.outputs.certify, 'certificate-scaffold');
  assert.equal(result.outputs.explain, 'explanation-scaffold');

  const failing = {
    kind: 'CircuitJS', id: 'test.assert-failure', version: '1.0.0', inputs: {},
    nodes: [{ id: 'assert', primitive: 'assert', inputs: { condition: false } }],
    outputs: { value: { $node: 'assert' } }
  };
  await assert.rejects(
    executeCircuit(compileCircuit(failing, registries), compileMarkdown('Input.'), registries),
    (error) => error.code === 'circuit-assertion-failed'
  );
});

test('standard relational operators implement filter, projection, join, and aggregation data semantics', async () => {
  const operators = createStandardRegistries().operators;
  const records = [
    { id: 'a', kind: 'claim', score: 2, group: 'x' },
    { id: 'b', kind: 'note', score: 1, group: 'x' },
    { id: 'c', kind: 'claim', score: 3, group: 'y' }
  ];
  assert.deepEqual(await operators.get('relational.filter@1').execute({
    records, predicates: [{ path: 'kind', op: 'eq', value: 'claim' }]
  }), [records[0], records[2]]);
  assert.deepEqual(await operators.get('relational.project@1').execute({
    records: [records[0]], fields: { identifier: 'id', value: 'score' }
  }), [{ identifier: 'a', value: 2 }]);
  assert.deepEqual(await operators.get('relational.join@1').execute({
    left: [{ claim: 'a', owner: 'u1' }, { claim: 'c', owner: 'u2' }],
    right: [{ claim: 'a', source: 's1' }], leftKey: 'claim', rightKey: 'claim'
  }), [{ left: { claim: 'a', owner: 'u1' }, right: { claim: 'a', source: 's1' } }]);
  assert.deepEqual(await operators.get('relational.aggregate@1').execute({
    records, groupBy: 'group', operation: 'count'
  }), [{ key: 'x', value: 2 }, { key: 'y', value: 1 }]);
});
