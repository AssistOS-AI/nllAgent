import { benchmarkCase, containsFinding, findingCount } from '../../../../../../../src/benchmark/api.mjs';
export default benchmarkCase('violation-closed', './input.md', findingCount(1), containsFinding('retention-violated'));

