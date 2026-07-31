import { analysisResult } from '../../../../src/artifacts/api.mjs';
import { Finding, assurance, evidence, findingType, message, severity } from '../../ontologies/index.mjs';
import { sourceValue } from './longtext/program.mjs';
import { span } from '../../../../src/longtext/api.mjs';
export default analysisResult('isolated-analysis','reported-with-limits',
  Finding(findingType('object-used-without-retrieval'),message('The brass key is used after being left elsewhere, with no retrieval in the closed interval.'),severity('warning'),evidence(span(sourceValue,390,431)),evidence(span(sourceValue,3885,3927)),evidence(span(sourceValue,4356,4434)),assurance('mechanical'))
);