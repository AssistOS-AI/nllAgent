import { benchmarkCase, containsFinding, findingCount } from '../../../../../../../src/benchmark/api.mjs';
export default benchmarkCase('unknown-open', './input.md', findingCount(1), containsFinding('retention-unknown'));

