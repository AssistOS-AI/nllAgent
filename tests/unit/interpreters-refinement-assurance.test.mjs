import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ABSTRACT_PREFLIGHT, ANALYZED, CNL_REPAIR, CNL_ROUND_TRIP, CONCRETE_EXECUTION,
  LOCAL_PROOF_OBLIGATIONS, NumericInterval, SYMBOLIC_WITNESS, WITNESSED_FINDING,
  WITNESS_REPLAY, AssuranceProfile, RefinementManager, assuranceProfile, composeAssurance,
  refinementDemand
} from '../../src/interpreters/index.mjs';

test('refinement demands deduplicate and stop after no abstract progress', () => {
  const manager = new RefinementManager();
  const demand = refinementDemand(
    'coverage:LegalObligation:policy',
    'A violation is possible but exception coverage is open.',
    'nll-analyze-task',
    'close LegalObligation coverage in policy scope'
  );
  const duplicate = refinementDemand(
    'coverage:LegalObligation:policy',
    'The same semantic need reached the manager from another path.',
    'nll-analyze-task',
    'close LegalObligation coverage in policy scope'
  );

  assert.equal(manager.request(demand).status, 'REQUESTED');
  assert.equal(manager.request(duplicate).status, 'DEDUPLICATED');
  const unchanged = NumericInterval.closed(0, 1);
  const outcome = manager.record(demand, unchanged, NumericInterval.closed(0, 1));
  assert.equal(outcome.status, 'STALLED');
  assert.equal(outcome.diagnostics[0].code, 'REFINEMENT_STALLED');
  assert.equal(manager.request(duplicate).status, 'STALLED');
});

test('refinement records real movement in abstract state as progress', () => {
  const manager = new RefinementManager();
  const demand = refinementDemand(
    'time:leave-before-use', 'Temporal order is unresolved.', 'nll-analyze-task', 'resolve order'
  );
  manager.request(demand);
  const outcome = manager.record(
    demand, NumericInterval.closed(0, 10), NumericInterval.closed(2, 8)
  );
  assert.equal(outcome.progressed, true);
  assert.equal(manager.request(demand).status, 'DEDUPLICATED');
});

test('assurance targets and profiles compose independent runtime components', () => {
  const plan = composeAssurance(WITNESSED_FINDING, assuranceProfile(ANALYZED));
  assert.equal(plan.profile instanceof AssuranceProfile, true);
  assert.equal(plan.includesMode(ANALYZED), true);
  assert.equal(plan.includesComponent(CONCRETE_EXECUTION), true);
  assert.equal(plan.includesComponent(ABSTRACT_PREFLIGHT), true);
  assert.equal(plan.includesComponent(SYMBOLIC_WITNESS), true);
  assert.equal(plan.includesComponent(WITNESS_REPLAY), true);
  assert.equal(plan.includesComponent(LOCAL_PROOF_OBLIGATIONS), false);

  const repair = composeAssurance(CNL_REPAIR, assuranceProfile());
  assert.equal(repair.includesComponent(CNL_ROUND_TRIP), true);
  assert.equal(repair.includesComponent(SYMBOLIC_WITNESS), false);
});
