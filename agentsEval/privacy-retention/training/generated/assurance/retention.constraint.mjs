import {
  ConstraintKernel, differenceAtMost, equal, numberVariable
} from '../../../../../src/engines/constraint-kernel.mjs';

function solveAboveBoundary() {
  const duration = numberVariable('duration');
  const limit = numberVariable('limit');
  return new ConstraintKernel().solve([
    equal(duration, 6),
    equal(limit, 5),
    differenceAtMost(limit, duration, -1)
  ]);
}

function solveAtBoundary() {
  const duration = numberVariable('duration');
  const limit = numberVariable('limit');
  return new ConstraintKernel().solve([
    equal(duration, 5),
    equal(limit, 5),
    differenceAtMost(duration, limit, 0)
  ]);
}

export { solveAboveBoundary, solveAtBoundary };
export default solveAboveBoundary;

