import { benchmarkCase, excludesFinding, findingCount } from '../../../../src/benchmark/api.mjs';

export default benchmarkCase(
  'continuity-no-leave', './input.md', findingCount(0), excludesFinding('object-used-without-retrieval')
);
