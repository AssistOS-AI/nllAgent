import assert from 'node:assert/strict';
import test from 'node:test';
import { circuit, include, stage } from '../../src/circuit/index.mjs';
import { exactlyOne, from, ontology, requires, to } from '../../src/ontology/index.mjs';
import { executeCircuit } from '../../src/runtime/index.mjs';
import { SemanticStore } from '../../src/store/index.mjs';

test('procedural macro-nodes use normal async JavaScript and commit atomically', async () => {
  const O = ontology('test.runtime@1');
  const value = O.role('value', from(O.Proposition), to(O.Value), exactlyOne());
  const Derived = O.derivedConcept('Derived', requires(value));
  const store = new SemanticStore();
  const operation = stage('loop', async (ctx) => {
    for (let index = 0; index < 3; index += 1) ctx.derive(Derived(value(index)));
    await Promise.resolve();
  });
  const execution = await executeCircuit(circuit('runtime@1', include(operation)), store);
  assert.equal(store.instancesOf(Derived).length, 3);
  assert.ok(execution.trace.events.some((event) => event.state === 'COMMITTED'));
});

test('a failed macro-node publishes no partial semantic delta', async () => {
  const O = ontology('test.rollback@1');
  const value = O.role('value', from(O.Proposition), to(O.Value), exactlyOne());
  const Derived = O.derivedConcept('Derived', requires(value));
  const store = new SemanticStore();
  const failing = stage('failing', async (ctx) => {
    ctx.derive(Derived(value('candidate')));
    throw new Error('stop');
  });
  await assert.rejects(executeCircuit(circuit('rollback@1', include(failing)), store), /stop/u);
  assert.equal(store.instancesOf(Derived).length, 0);
});
