import { benchmarkCase, containsFinding, findingCount } from '../../../../../../../src/benchmark/api.mjs';
export default benchmarkCase('accepted-exception', './input.md', findingCount(1), containsFinding('retention-accepted-exception'));

