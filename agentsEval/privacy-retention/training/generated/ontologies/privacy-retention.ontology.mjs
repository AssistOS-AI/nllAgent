import {
  allows, exactlyOne, extendsOntology, from, ontology, requires, to, zeroOrOne
} from '../../../../../src/ontology/api.mjs';
import core from '../../../../../ontologies/core/index.mjs';

const O = ontology('privacy.retention.eval@1', extendsOntology(core));

export const retentionName = O.role('retentionName', from(O.Entity), to(O.Value), exactlyOne());
export const DataController = O.entity('DataController', requires(retentionName));
export const PersonalDataCategory = O.entity('PersonalDataCategory', requires(retentionName));
export const PolicyScope = O.entity('PolicyScope', requires(retentionName));

export const recordId = O.role('recordId', from(O.Event), to(O.Value), exactlyOne());
export const actor = O.role('retentionActor', from(O.Event), to(DataController), exactlyOne());
export const category = O.role('dataCategory', from(O.Event), to(PersonalDataCategory), exactlyOne());
export const retentionActor = actor;
export const dataCategory = category;
export const durationYears = O.role('durationYears', from(O.Event), to(O.Value), exactlyOne());
export const assessmentScope = O.role('assessmentScope', from(O.Event), to(PolicyScope), exactlyOne());
export const sourceAnchor = O.role('sourceAnchor', from(O.Event), to(O.Value), exactlyOne());
export const exceptionRecordId = O.role('exceptionRecordId', from(O.Event), to(O.Value), exactlyOne());
export const exceptionStatus = O.role('exceptionStatus', from(O.Event), to(O.Value), exactlyOne());
export const legalAuthority = O.role('legalAuthority', from(O.Event), to(O.Value), zeroOrOne());
export const exceptionUntil = O.role('exceptionUntil', from(O.Event), to(O.Value), zeroOrOne());
export const coverageScope = O.role('coverageScope', from(O.Event), to(PolicyScope), exactlyOne());
export const coverageState = O.role('coverageState', from(O.Event), to(O.Value), exactlyOne());

export const RetentionDeclaration = O.event(
  'RetentionDeclaration', requires(recordId), requires(actor), requires(category),
  requires(durationYears), requires(assessmentScope), requires(sourceAnchor)
);
export const ExceptionEvidence = O.event(
  'ExceptionEvidence', requires(exceptionRecordId), requires(exceptionStatus),
  allows(legalAuthority), allows(exceptionUntil), requires(sourceAnchor)
);
export const ExceptionCoverageEvidence = O.event(
  'ExceptionCoverageEvidence', requires(coverageScope), requires(coverageState), requires(sourceAnchor)
);

O.lexicalize(RetentionDeclaration, 'RETENTION');
O.lexicalize(ExceptionEvidence, 'EXCEPTION');
O.lexicalize(ExceptionCoverageEvidence, 'COVERAGE');

export default O.seal();
