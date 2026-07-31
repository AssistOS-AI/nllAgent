import {
  branchDecision, concolicTrace, generateBranchGoals, symbolicPredicate, symbolicVariable
} from '../../../src/interpreters/symbolic.mjs';

const coverageClosed = symbolicVariable('coverageClosed');

function generateCoverageBoundaryGoals() {
  const trace = concolicTrace(
    'open-coverage-seed',
    branchDecision('coverage-is-closed', symbolicPredicate('===', coverageClosed, 1), false)
  );
  return generateBranchGoals(trace);
}

export { coverageClosed, generateCoverageBoundaryGoals };
