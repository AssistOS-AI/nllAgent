import { benchmarkCase, containsFinding, findingCount } from '../../../../../../../src/benchmark/api.mjs';

export default benchmarkCase(
  'incomplete-exception-closed', './input.md', findingCount(1), containsFinding('retention-violated')
);
