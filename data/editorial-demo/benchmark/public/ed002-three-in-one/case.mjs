import { benchmarkCase, containsFinding, findingCount } from '../../../../../src/benchmark/api.mjs';
export default benchmarkCase('ed002-three-in-one', './input.md', findingCount(1), containsFinding('phrase-frequency'));
