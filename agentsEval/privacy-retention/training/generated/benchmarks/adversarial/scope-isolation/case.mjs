import { benchmarkCase, containsFinding, excludesFinding, findingCount } from '../../../../../../../src/benchmark/api.mjs';
export default benchmarkCase(
  'scope-isolation', './input.md', findingCount(1), containsFinding('retention-unknown'),
  excludesFinding('retention-violated')
);

