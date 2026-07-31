import { benchmarkCase, containsFinding, findingCount } from '../../../../../../../src/benchmark/api.mjs';
export default benchmarkCase('explicit-undocumented', './input.md', findingCount(1), containsFinding('retention-violated'));

