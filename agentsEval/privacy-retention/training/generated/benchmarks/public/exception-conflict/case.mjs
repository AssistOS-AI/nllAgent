import { benchmarkCase, containsFinding, findingCount } from '../../../../../../../src/benchmark/api.mjs';
export default benchmarkCase('exception-conflict', './input.md', findingCount(1), containsFinding('retention-conflict'));

