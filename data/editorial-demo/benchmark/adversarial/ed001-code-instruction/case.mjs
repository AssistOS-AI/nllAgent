import { benchmarkCase, excludesFinding, findingCount } from '../../../../../src/benchmark/api.mjs';
export default benchmarkCase('ed001-code-instruction', './input.md', findingCount(0), excludesFinding('weak-phrase'));
