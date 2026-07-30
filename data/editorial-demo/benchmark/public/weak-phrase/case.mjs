import { benchmarkCase, containsFinding, findingCount } from '../../../../../src/benchmark/api.mjs';
export default benchmarkCase('weak-phrase', './input.md', findingCount(1), containsFinding('weak-phrase'));
