import { analysisResult } from '../../../../src/artifacts/api.mjs';
import { Finding, assurance, evidence, findingType, message, severity } from '../../generated/ontologies/index.mjs';
import { sourceValue } from './longtext/program.mjs';
import { span } from '../../../../src/longtext/api.mjs';
export default analysisResult('isolated-analysis','reported',
  Finding(findingType('scientific-numeric-inconsistency'),message('TABLE-7 versus DRAFT-PRIMARY-12: Comparable normalized value intervals are disjoint.'),severity('error'),evidence(span(sourceValue,7559,7982)),evidence(span(sourceValue,5443,5862)),assurance('mechanical'))
);