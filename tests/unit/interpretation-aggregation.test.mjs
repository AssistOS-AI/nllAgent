import assert from 'node:assert/strict';
import test from 'node:test';

import { FALSE, TRUE, UNKNOWN } from '../../src/circuit/logic.mjs';
import { alternatives, interpretation, longTextProgram, semanticUnit, source } from '../../src/longtext/api.mjs';
import { aggregateInterpretations } from '../../src/runtime/interpretations.mjs';
import { SemanticStore } from '../../src/store/semantic-store.mjs';

test('interpretation aggregation distinguishes robust, conditional, and conflictual results', async () => {
  const sourceValue = source('readings.md', 'ambiguous');
  const store = new SemanticStore();
  store.publish(longTextProgram('readings', sourceValue, semanticUnit('alternatives', alternatives(
    'reading', interpretation('one'), interpretation('two')
  ))));
  const robust = await aggregateInterpretations(store, async () => TRUE);
  const conditional = await aggregateInterpretations(store, async (context) => context.endsWith('one') ? TRUE : UNKNOWN);
  const conflict = await aggregateInterpretations(store, async (context) => context.endsWith('one') ? TRUE : FALSE);
  assert.equal(robust.classification, 'ROBUST_TRUE');
  assert.equal(conditional.classification, 'CONDITIONAL');
  assert.equal(conflict.classification, 'CONFLICTUAL');
});
