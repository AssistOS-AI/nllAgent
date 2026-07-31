import assert from 'node:assert/strict';
import test from 'node:test';
import {
  FALSE, TRUE, circuit, columns, decisionTable, include, result, row, stage, usesPrimitives, values, writes
} from '../../src/circuit/index.mjs';
import { exactlyOne, from, ontology, requires, to } from '../../src/ontology/index.mjs';
import { input, output, primitive, writes as primitiveWrites } from '../../src/primitives/index.mjs';
import { executeCircuit } from '../../src/runtime/index.mjs';
import { SemanticStore } from '../../src/store/index.mjs';

test('procedural macro-nodes use normal async JavaScript and commit atomically', async () => {
  const O = ontology('test.runtime@1');
  const value = O.role('value', from(O.Proposition), to(O.Value), exactlyOne());
  const Derived = O.derivedConcept('Derived', requires(value));
  const store = new SemanticStore();
  const operation = stage(
    'loop',
    async (ctx) => {
      for (let index = 0; index < 3; index += 1) ctx.derive(Derived(value(index)));
      await Promise.resolve();
    },
    writes(Derived)
  );
  const execution = await executeCircuit(circuit('runtime@1', include(operation)), store);
  assert.equal(store.instancesOf(Derived).length, 3);
  assert.ok(execution.trace.events.some((event) => event.state === 'COMMITTED'));
});

test('a failed macro-node publishes no partial semantic delta', async () => {
  const O = ontology('test.rollback@1');
  const value = O.role('value', from(O.Proposition), to(O.Value), exactlyOne());
  const Derived = O.derivedConcept('Derived', requires(value));
  const store = new SemanticStore();
  const failing = stage(
    'failing',
    async (ctx) => {
      ctx.derive(Derived(value('candidate')));
      throw new Error('stop');
    },
    writes(Derived)
  );
  await assert.rejects(executeCircuit(circuit('rollback@1', include(failing)), store), /stop/u);
  assert.equal(store.instancesOf(Derived).length, 0);
});

test('a macro-node cannot use an undeclared semantic effect', async () => {
  const O = ontology('test.effect-drift@1');
  const value = O.role('value', from(O.Proposition), to(O.Value), exactlyOne());
  const Derived = O.derivedConcept('Derived', requires(value));
  const store = new SemanticStore();
  const undeclared = stage('undeclared', async (ctx) => {
    ctx.derive(Derived(value('hidden')));
  });
  await assert.rejects(executeCircuit(circuit('effect-drift@1', include(undeclared)), store), {
    code: 'effect-drift'
  });
  assert.equal(store.instancesOf(Derived).length, 0);
});

test('a stage applies SDK primitives through an instrumented effect boundary', async () => {
  const O = ontology('test.primitive-stage@1');
  const value = O.role('value', from(O.Proposition), to(O.Value), exactlyOne());
  const Derived = O.derivedConcept('Derived', requires(value));
  const deriveValue = primitive('test.derive-value@1')
    .input(input('value', O.Value)).output(output('term', Derived))
    .effects(primitiveWrites(Derived))
    .concrete((ctx, [inputValue]) => ctx.derive(Derived(value(inputValue))))
    .seal();
  const store = new SemanticStore();
  const operation = stage('apply-sdk', async (ctx) => {
    await ctx.applyPrimitive(deriveValue, 'from-sdk');
  }, usesPrimitives(deriveValue));
  const execution = await executeCircuit(circuit('primitive-stage@1', include(operation)), store);
  assert.equal(store.instancesOf(Derived).length, 1);
  assert.ok(execution.trace.events.some((event) => event.node === `primitive:${deriveValue.id}`));
});

test('decision-table execution returns an auditable opaque evaluation', async () => {
  const table = decisionTable('runtime-decision', columns('condition'),
    row(values(TRUE), result('ACCEPTED')),
    row(values(FALSE), result('REJECTED')));
  let evaluation;
  const operation = stage('decide', async (ctx) => {
    evaluation = ctx.decide(table, TRUE);
  });
  const execution = await executeCircuit(circuit('decision-runtime@1', include(operation)), new SemanticStore());
  assert.equal(evaluation.kind, 'DecisionEvaluation');
  assert.equal(evaluation.result, 'ACCEPTED');
  assert.equal(evaluation.matchedRows.length, 1);
  assert.ok(execution.trace.events.some((event) => event.state === 'DECIDED'));
});
