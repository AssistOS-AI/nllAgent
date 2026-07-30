import { benchmarkCase, excludesFinding, findingCount } from '../../../../../src/benchmark/api.mjs';
export default benchmarkCase('ed002-code-scope', './input.md', findingCount(0), excludesFinding('phrase-frequency'));
