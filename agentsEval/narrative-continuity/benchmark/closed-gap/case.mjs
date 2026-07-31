import { benchmarkCase, containsFinding, findingCount } from '../../../../src/benchmark/api.mjs';

export default benchmarkCase(
  'continuity-closed-gap', './input.md', findingCount(1), containsFinding('object-used-without-retrieval')
);
