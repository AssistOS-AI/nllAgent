import { benchmarkCase, containsFinding, findingCount } from '../../../../../../../src/benchmark/api.mjs';
export default benchmarkCase('boundary-satisfied', './input.md', findingCount(1), containsFinding('retention-satisfied'));

