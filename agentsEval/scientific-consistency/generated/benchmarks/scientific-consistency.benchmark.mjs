import { BenchmarkCase, BenchmarkExpectation } from '../../../../src/benchmark/index.mjs';

const expectedStatus = (value) => new BenchmarkExpectation('assessmentStatus', value);

export const cases = Object.freeze([
  new BenchmarkCase('equivalent-percent-proportion', './cases/equivalent-percent-proportion/input.md', [expectedStatus('SATISFIED')]),
  new BenchmarkCase('compatible-conflict', './cases/compatible-conflict/input.md', [expectedStatus('VIOLATED')]),
  new BenchmarkCase('different-metric', './cases/different-metric/input.md', [expectedStatus('NOT_APPLICABLE')]),
  new BenchmarkCase('different-population', './cases/different-population/input.md', [expectedStatus('NOT_APPLICABLE')]),
  new BenchmarkCase('different-aggregation', './cases/different-aggregation/input.md', [expectedStatus('NOT_APPLICABLE')]),
  new BenchmarkCase('different-horizon', './cases/different-horizon/input.md', [expectedStatus('NOT_APPLICABLE')]),
  new BenchmarkCase('unknown-dimension', './cases/unknown-dimension/input.md', [expectedStatus('UNKNOWN')]),
  new BenchmarkCase('dimension-conflict', './cases/dimension-conflict/input.md', [expectedStatus('CONFLICT')]),
  new BenchmarkCase('rounding-boundary', './cases/rounding-boundary/input.md', [expectedStatus('SATISFIED')]),
  new BenchmarkCase('open-support-coverage', './cases/open-support-coverage/input.md', [expectedStatus('UNKNOWN')]),
  new BenchmarkCase('closed-support-coverage', './cases/closed-support-coverage/input.md', [expectedStatus('VIOLATED')])
]);

export default cases;
