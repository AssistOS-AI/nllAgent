import assert from 'node:assert/strict';
import test from 'node:test';

import { circuit, include, instantiateEach, match, pure, stage } from '../../src/circuit/api.mjs';
import { longTextProgram, semanticUnit, source } from '../../src/longtext/api.mjs';
import { exactlyOne, from, ontology, requires, to, variable } from '../../src/ontology/api.mjs';
import { executeCircuit } from '../../src/runtime/scheduler.mjs';
import { ContentCache, ExecutionGraph } from '../../src/runtime/execution-graph.mjs';
import { SemanticStore } from '../../src/store/semantic-store.mjs';

test('execution graph canonicalizes instances and binds each public value once', () => {
  const model = circuit('test.graph@1');
  const graph = new ExecutionGraph();
  assert.equal(graph.instantiate(model).created, true);
  assert.equal(graph.instantiate(model).created, false);
});

test('pure stages reuse content-addressed deltas across equivalent snapshots', async () => {
  let executions = 0;
  const operation = stage('calculate', async () => { executions += 1; }, pure());
  const model = circuit('test.cache@1', include(operation));
  const cache = new ContentCache();
  await executeCircuit(model, new SemanticStore(), { cache });
  await executeCircuit(model, new SemanticStore(), { cache });
  assert.equal(executions, 1);
  assert.equal(cache.size, 1);
});

test('instantiateEach creates one canonical child instance per semantic binding', async () => {
  const O = ontology('test.instances@1');
  const label = O.role('label', from(O.Entity), to(O.Value), exactlyOne());
  const Item = O.entity('Item', requires(label));
  O.seal();
  const sourceValue = source('instances.md', 'a b');
  const program = longTextProgram('instances', sourceValue,
    semanticUnit('items', Item(label('a')), Item(label('b'))));
  const store = new SemanticStore();
  store.publish(program);
  const value = variable(O.Value, 'value');
  const observed = [];
  const child = circuit('test.instance-child@1', include(stage('observe', async (ctx) => {
    observed.push(ctx.binding.get(value));
  })));
  const root = circuit('test.instance-root@1', instantiateEach(match(Item(label(value))), child));
  const result = await executeCircuit(root, store);
  assert.deepEqual(observed.sort(), ['a', 'b']);
  assert.equal(result.graph.instances.length, 3);
});
