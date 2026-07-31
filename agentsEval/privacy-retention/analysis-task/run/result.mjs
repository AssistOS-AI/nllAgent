import { analysisResult } from '../../../../src/artifacts/api.mjs';
import { Finding, assurance, evidence, findingType, message, severity } from '../../training/generated/ontologies/index.mjs';
import { sourceValue } from './longtext/program.mjs';
import { span } from '../../../../src/longtext/api.mjs';
export default analysisResult('isolated-analysis','reported-with-limits',
  Finding(findingType('retention-violated'),message('RET-001 assessment for R1 (support-transcript): VIOLATED; 7 years.'),severity('error'),evidence(span(sourceValue,1877,1951)),evidence(span(sourceValue,1953,1998)),assurance('mechanical')),
  Finding(findingType('retention-accepted-exception'),message('RET-001 assessment for R2 (tax-invoice): ACCEPTED_EXCEPTION; 8 years.'),severity('info'),evidence(span(sourceValue,2965,3032)),evidence(span(sourceValue,3034,3146)),assurance('mechanical')),
  Finding(findingType('retention-satisfied'),message('RET-001 assessment for R3 (customer-profile): SATISFIED; 5 years.'),severity('info'),evidence(span(sourceValue,3990,4062)),assurance('mechanical')),
  Finding(findingType('retention-unknown'),message('RET-001 assessment for R4 (research-interview): UNKNOWN; 9 years.'),severity('warning'),evidence(span(sourceValue,4862,4936)),evidence(span(sourceValue,4938,4981)),assurance('mechanical')),
  Finding(findingType('retention-conflict'),message('RET-001 assessment for R5 (fraud-case): CONFLICT; incompatible duration or exception evidence (9 years).'),severity('error'),evidence(span(sourceValue,5920,5986)),evidence(span(sourceValue,5988,6109)),evidence(span(sourceValue,6111,6193)),assurance('mechanical')),
  Finding(findingType('retention-conflict'),message('RET-001 assessment for R6 (marketing-suppression): CONFLICT; incompatible duration or exception evidence (3, 7 years).'),severity('error'),evidence(span(sourceValue,6998,7075)),evidence(span(sourceValue,7077,7154)),assurance('mechanical'))
);