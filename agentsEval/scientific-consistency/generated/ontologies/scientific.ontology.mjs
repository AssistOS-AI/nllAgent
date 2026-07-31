import {
  exactlyOne,
  extendsOntology,
  from,
  identifiedAs,
  ontology,
  requires,
  to,
  zeroOrMany,
  zeroOrOne
} from '../../../../src/ontology/index.mjs';
import core from '../../../../ontologies/core/index.mjs';

const O = ontology('eval.scientific-report@1', extendsOntology(core));

export const Value = O.Value;
export const Claim = O.State;
export const Assessment = O.Proposition;

export const claimId = O.role('claimId', from(Claim), to(Value), exactlyOne());
export const claimSection = O.role('claimSection', from(Claim), to(Value), exactlyOne());
export const claimKind = O.role('claimKind', from(Claim), to(Value), exactlyOne());
export const metric = O.role('metric', from(Claim), to(Value), exactlyOne());
export const estimand = O.role('estimand', from(Claim), to(Value), exactlyOne());
export const baseline = O.role('baseline', from(Claim), to(Value), exactlyOne());
export const population = O.role('population', from(Claim), to(Value), exactlyOne());
export const aggregation = O.role('aggregation', from(Claim), to(Value), exactlyOne());
export const horizon = O.role('horizon', from(Claim), to(Value), exactlyOne());
export const estimate = O.role('estimate', from(Claim), to(Value), exactlyOne());
export const estimateUnit = O.role('estimateUnit', from(Claim), to(Value), exactlyOne());
export const precision = O.role('precision', from(Claim), to(Value), exactlyOne());
export const isReference = O.role('isReference', from(Claim), to(Value), exactlyOne());
export const sourceAnchor = O.role('sourceAnchor', from(Claim), to(Value), exactlyOne());

export const QuantitativeClaim = O.state(
  'QuantitativeClaim',
  requires(claimId), requires(claimSection), requires(claimKind), requires(metric), requires(estimand),
  requires(baseline), requires(population), requires(aggregation), requires(horizon), requires(estimate),
  requires(estimateUnit), requires(precision), requires(isReference), requires(sourceAnchor)
);

export const leftClaim = O.role('leftClaim', from(Assessment), to(Value), exactlyOne());
export const rightClaim = O.role('rightClaim', from(Assessment), to(Value), exactlyOne());
export const comparisonStatus = O.role('comparisonStatus', from(Assessment), to(Value), exactlyOne());
export const comparisonReason = O.role('comparisonReason', from(Assessment), to(Value), exactlyOne());
export const normalizedMetric = O.role('normalizedMetric', from(Assessment), to(Value), zeroOrOne());
export const normalizedLeft = O.role('normalizedLeft', from(Assessment), to(Value), zeroOrOne());
export const normalizedRight = O.role('normalizedRight', from(Assessment), to(Value), zeroOrOne());
export const assessmentEvidence = O.role('assessmentEvidence', from(Assessment), to(Value), zeroOrMany());
export const assurancePath = O.role('assurancePath', from(Assessment), to(Value), exactlyOne());

export const ScientificConsistencyAssessment = O.derivedConcept(
  'ScientificConsistencyAssessment',
  requires(leftClaim), requires(rightClaim), requires(comparisonStatus), requires(comparisonReason),
  requires(normalizedMetric), requires(normalizedLeft), requires(normalizedRight),
  requires(assessmentEvidence), requires(assurancePath)
);

export const identifiedClaim = (id, ...roles) => QuantitativeClaim(identifiedAs(`scientific-claim:${id}`), ...roles);

export default O.seal();
