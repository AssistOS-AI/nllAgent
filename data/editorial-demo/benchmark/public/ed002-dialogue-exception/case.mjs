import { benchmarkCase, excludesFinding, findingCount } from '../../../../../src/benchmark/api.mjs';
export default benchmarkCase('ed002-dialogue-exception', './input.md', findingCount(0), excludesFinding('phrase-frequency'));
