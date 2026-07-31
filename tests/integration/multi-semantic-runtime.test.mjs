import assert from 'node:assert/strict';
import test from 'node:test';

import { circuit } from '../../src/circuit/api.mjs';
import { ALL_FINDINGS, ANALYZED, assuranceProfile } from '../../src/interpreters/index.mjs';
import { executeMultiSemantic } from '../../src/runtime/multi-semantic.mjs';
import { SemanticStore } from '../../src/store/semantic-store.mjs';

test('multi-semantic runtime adds conservative preflight without replacing concrete execution', async () => {
  const model = circuit('test.multi-semantic@1');
  const result = await executeMultiSemantic({
    circuit: model,
    store: new SemanticStore(),
    target: ALL_FINDINGS,
    profile: assuranceProfile(ANALYZED)
  });
  assert.equal(result.concrete.template, model);
  assert.equal(result.abstract.status, 'STABLE');
  assert.equal(result.completed, true);
});
