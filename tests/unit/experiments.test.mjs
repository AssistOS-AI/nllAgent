import assert from 'node:assert/strict';
import test from 'node:test';
import alternatives from '../../experiments/architecture/alternatives.experiment.mjs';
import behavior from '../../experiments/architecture/behavior-boundary.experiment.mjs';
import cnl from '../../experiments/architecture/cnl-equivalence.experiment.mjs';
import identity from '../../experiments/architecture/identity.experiment.mjs';
import modelCache from '../../experiments/architecture/model-cache.experiment.mjs';

test('the five architecture decisions retain executable counterexamples', () => {
  assert.equal(identity.observedStructuralEntityMerges, 1);
  assert.equal(behavior.rejectedContextDependentBehaviors, 1);
  assert.ok(alternatives.avoidedMaterializations > 250000);
  assert.equal(modelCache.unsafeCollisions, 1);
  assert.equal(cnl.rejectedCriticalChanges, 2);
});
