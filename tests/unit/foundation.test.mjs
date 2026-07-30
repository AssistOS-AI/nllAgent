import assert from 'node:assert/strict';
import test from 'node:test';
import * as vocabulary from '../../ontologies/core/index.mjs';
import { materializeFoundation, foundationCircuit } from '../../src/foundation/index.mjs';
import { compileMarkdown, source } from '../../src/longtext/index.mjs';
import { executeCircuit } from '../../src/runtime/index.mjs';
import { SemanticStore } from '../../src/store/index.mjs';

test('foundation materializes literal state assertions and verifies explicit conflict', async () => {
  const program = await compileMarkdown(source('state.md', 'The door is open.\n\nThe door is not open.'), vocabulary, [materializeFoundation]);
  const store = new SemanticStore();
  store.publish(program);
  await executeCircuit(foundationCircuit, store);
  assert.equal(store.instancesOf(vocabulary.StateAssertion).length, 2);
  assert.equal(store.outputs[0].value(vocabulary.findingType), 'potential-state-conflict');
});
