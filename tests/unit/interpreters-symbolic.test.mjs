import assert from 'node:assert/strict';
import test from 'node:test';
import {
  branchDecision, concolicTrace, generateBranchGoals, pathCondition, replayWitness,
  symbolicConstant, symbolicPredicate, symbolicVariable, witness, witnessReplayProtocol
} from '../../src/interpreters/index.mjs';

test('concolic goal generation flips an uncovered comparator at its boundary', () => {
  const duration = symbolicVariable('duration');
  const exceeds = symbolicPredicate('>', duration, symbolicConstant(5));
  const trace = concolicTrace('seed-six-years', branchDecision('retention-limit', exceeds, true));
  const goals = generateBranchGoals(trace);

  assert.equal(goals.length, 1);
  assert.equal(goals[0].branchId, 'retention-limit');
  assert.equal(goals[0].targetTaken, false);
  assert.equal(goals[0].targetPredicate.operator, '<=');
  assert.equal(goals[0].boundary.variable, 'duration');
  assert.equal(goals[0].boundary.value, 5);
  assert.equal(goals[0].pathCondition.satisfiedBy(new Map([['duration', 5]])), true);
  assert.equal(goals[0].pathCondition.satisfiedBy(new Map([['duration', 6]])), false);
});

test('a later branch goal retains the concrete symbolic prefix', () => {
  const duration = symbolicVariable('duration');
  const exception = symbolicVariable('exception');
  const trace = concolicTrace(
    'seed-with-exception',
    branchDecision('limit', symbolicPredicate('>', duration, 5), true),
    branchDecision('exception', symbolicPredicate('===', exception, true), true)
  );
  const exceptionGoal = generateBranchGoals(trace).find((goal) => goal.branchId === 'exception');

  assert.equal(exceptionGoal.pathCondition.decisions.length, 2);
  assert.equal(exceptionGoal.pathCondition.satisfiedBy(new Map([
    ['duration', 6], ['exception', false]
  ])), true);
  assert.equal(exceptionGoal.pathCondition.satisfiedBy(new Map([
    ['duration', 4], ['exception', false]
  ])), false);
});

test('a symbolic witness earns witnessed assurance only after concrete replay', async () => {
  const duration = symbolicVariable('duration');
  const condition = pathCondition(
    branchDecision('limit', symbolicPredicate('>', duration, 5), true)
  );
  const candidate = witness(
    'retention-violation', new Map([['duration', 6]]), condition, 'VIOLATED'
  );
  const protocol = witnessReplayProtocol(
    (value) => value.assignments.get('duration'),
    (concreteDuration) => concreteDuration > 5 ? 'VIOLATED' : 'SATISFIED',
    (result, value) => result === value.expected
  );
  const replay = await replayWitness(candidate, protocol);

  assert.equal(replay.status, 'CONFIRMED');
  assert.equal(replay.confirmed, true);
  assert.equal(replay.assurance, 'WITNESSED');

  const invalid = witness(
    'bad-model', new Map([['duration', 5]]), condition, 'VIOLATED'
  );
  const rejected = await replayWitness(invalid, protocol);
  assert.equal(rejected.status, 'INVALID_ASSIGNMENT');
  assert.equal(rejected.assurance, null);
});
