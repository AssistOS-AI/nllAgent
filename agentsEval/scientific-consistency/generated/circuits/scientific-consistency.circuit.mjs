import {
  anyValue,
  circuit,
  columns,
  decisionTable,
  include,
  primaryRole,
  reads,
  result,
  row,
  stage,
  supports,
  uniqueOrConflict,
  usesMethod,
  usesPrimitives,
  values,
  variable,
  writes
} from '../../../../src/circuit/index.mjs';
import {
  constraintKernelMethod,
  decisionTableMethod,
  eGraphMethod,
  queryDataflowMethod
} from '../../../../src/architecture/index.mjs';
import { differenceAtMost, equal, numberVariable, SAT, UNKNOWN as SOLVER_UNKNOWN, UNSAT } from '../../../../src/engines/index.mjs';
import { query } from '../../../../src/store/index.mjs';
import {
  constraintSolvePrimitive,
  decisionEvaluatePrimitive,
  egraphNormalizePrimitive,
  semanticAbsencePrimitive,
  semanticQueryPrimitive
} from '../../../../src/sdk/index.mjs';
import {
  Finding,
  assurance,
  evidence,
  findingType,
  message,
  severity
} from '../../../../ontologies/core/index.mjs';
import {
  QuantitativeClaim,
  ScientificConsistencyAssessment,
  Value,
  aggregation,
  assessmentEvidence,
  assurancePath,
  baseline,
  claimId,
  claimKind,
  claimSection,
  comparisonReason,
  comparisonStatus,
  estimate,
  estimateUnit,
  estimand,
  horizon,
  isReference,
  leftClaim,
  metric,
  normalizedLeft,
  normalizedMetric,
  normalizedRight,
  population,
  precision,
  rightClaim,
  sourceAnchor
} from '../ontologies/index.mjs';
import { METRIC_RULES, extractedMetric, metricTerm, normalizeEstimate } from '../assurance/metric-normalization.mjs';
import { resultScope } from '../materialization/scientific.profile.mjs';

const v = (name) => variable(Value, name);
const claimPattern = QuantitativeClaim(
  claimId(v('claimId')), claimSection(v('section')), claimKind(v('kind')), metric(v('metric')),
  estimand(v('estimand')), baseline(v('baseline')), population(v('population')),
  aggregation(v('aggregation')), horizon(v('horizon')), estimate(v('estimate')),
  estimateUnit(v('unit')), precision(v('precision')), isReference(v('reference')), sourceAnchor(v('anchor'))
);

const assessmentDecision = decisionTable(
  'scientific-assessment-decision',
  columns('comparability', 'constraint'),
  row(values('COMPARABLE', SAT), result('SATISFIED')),
  row(values('COMPARABLE', UNSAT), result('VIOLATED')),
  row(values('COMPARABLE', SOLVER_UNKNOWN), result('UNKNOWN')),
  row(values('NOT_APPLICABLE', anyValue()), result('NOT_APPLICABLE')),
  row(values('UNKNOWN', anyValue()), result('UNKNOWN')),
  row(values('CONFLICT', anyValue()), result('CONFLICT')),
  uniqueOrConflict()
);

async function normalizeMetric(ctx, claim) {
  const value = claim.value(metric);
  const resultValue = await ctx.applyPrimitive(egraphNormalizePrimitive, metricTerm(value), METRIC_RULES);
  return extractedMetric(resultValue);
}

function dimensionState(left, right, role, label) {
  const a = String(left.value(role));
  const b = String(right.value(role));
  if (a.startsWith('conflict:') || b.startsWith('conflict:')) {
    return Object.freeze({ status: 'CONFLICT', reason: `${label} has incompatible admitted support` });
  }
  if (a === 'unknown' || b === 'unknown') {
    return Object.freeze({ status: 'UNKNOWN', reason: `${label} is unresolved` });
  }
  if (a !== b) return Object.freeze({ status: 'NOT_APPLICABLE', reason: `${label} differs: ${a} versus ${b}` });
  return Object.freeze({ status: 'COMPARABLE', reason: `${label} matches` });
}

async function compatibility(ctx, left, right) {
  const [leftMetric, rightMetric] = await Promise.all([normalizeMetric(ctx, left), normalizeMetric(ctx, right)]);
  if (leftMetric.status !== 'NORMALIZED' || rightMetric.status !== 'NORMALIZED') {
    return Object.freeze({ status: 'UNKNOWN', reason: 'metric normalization is unsupported', metric: null });
  }
  if (leftMetric.value !== rightMetric.value) {
    return Object.freeze({
      status: 'NOT_APPLICABLE',
      reason: `metric differs: ${leftMetric.value} versus ${rightMetric.value}`,
      metric: `${leftMetric.value}|${rightMetric.value}`
    });
  }
  const dimensions = [
    [estimand, 'estimand'], [baseline, 'baseline'], [population, 'population'],
    [aggregation, 'aggregation'], [horizon, 'horizon']
  ].map(([role, label]) => dimensionState(left, right, role, label));
  const decisive = dimensions.find((value) => value.status === 'CONFLICT')
    ?? dimensions.find((value) => value.status === 'NOT_APPLICABLE')
    ?? dimensions.find((value) => value.status === 'UNKNOWN');
  return decisive
    ? Object.freeze({ ...decisive, metric: leftMetric.value })
    : Object.freeze({ status: 'COMPARABLE', reason: 'all critical dimensions match', metric: leftMetric.value });
}

async function solveOverlap(ctx, left, right, canonicalMetric) {
  const a = normalizeEstimate(canonicalMetric, left.value(estimate), left.value(estimateUnit), left.value(precision));
  const b = normalizeEstimate(canonicalMetric, right.value(estimate), right.value(estimateUnit), right.value(precision));
  if (a.status !== 'NORMALIZED' || b.status !== 'NORMALIZED') {
    return Object.freeze({ status: SOLVER_UNKNOWN, left: a, right: b, traceLength: 0 });
  }
  const common = numberVariable('common-estimate');
  const zero = numberVariable('zero');
  const constraints = [
    equal(zero, 0),
    differenceAtMost(common, zero, a.maximum),
    differenceAtMost(zero, common, -a.minimum),
    differenceAtMost(common, zero, b.maximum),
    differenceAtMost(zero, common, -b.minimum)
  ];
  const solved = await ctx.applyPrimitive(constraintSolvePrimitive, constraints);
  return Object.freeze({ status: solved.status, left: a, right: b, traceLength: solved.trace.length });
}

function assessmentTerm(left, right, compatibilityValue, numeric, status) {
  const optional = [];
  if (compatibilityValue.metric) optional.push(normalizedMetric(compatibilityValue.metric));
  if (numeric.left?.value !== undefined) optional.push(normalizedLeft(numeric.left.value));
  if (numeric.right?.value !== undefined) optional.push(normalizedRight(numeric.right.value));
  const reason = status === 'SATISFIED'
    ? 'Comparable normalized value intervals overlap.'
    : status === 'VIOLATED'
      ? 'Comparable normalized value intervals are disjoint.'
      : compatibilityValue.reason;
  return ScientificConsistencyAssessment(
    leftClaim(left.value(claimId)), rightClaim(right.value(claimId)), comparisonStatus(status),
    comparisonReason(reason), ...optional,
    assessmentEvidence(left.value(sourceAnchor)), assessmentEvidence(right.value(sourceAnchor)),
    assurancePath(`query>egraph>constraint:${numeric.status}>decision:${status}`)
  );
}

function findingFor(assessment, left, right) {
  const status = assessment.value(comparisonStatus);
  return Finding(
    findingType(status === 'CONFLICT' ? 'scientific-claim-conflict' : 'scientific-numeric-inconsistency'),
    message(`${left.value(claimId)} versus ${right.value(claimId)}: ${assessment.value(comparisonReason)}`),
    severity(status === 'CONFLICT' ? 'warning' : 'error'),
    evidence(left.value(sourceAnchor)), evidence(right.value(sourceAnchor)), assurance('mechanical')
  );
}

function missingSupportAssessment(summaryClaim, status, coverageState) {
  return ScientificConsistencyAssessment(
    leftClaim(summaryClaim.value(claimId)), rightClaim('missing-compatible-result'), comparisonStatus(status),
    comparisonReason(`No compatible result claim was observed; result-support coverage is ${coverageState}.`),
    assessmentEvidence(summaryClaim.value(sourceAnchor)),
    assurancePath(`query>absence:${coverageState}>decision:${status}`)
  );
}

const assessClaims = stage(
  'scientific.assess-claims',
  async (ctx) => {
    const bindings = await ctx.applyPrimitive(semanticQueryPrimitive, query(claimPattern));
    const claims = bindings.map((binding) => binding.matched.at(-1))
      .sort((left, right) => left.value(claimId).localeCompare(right.value(claimId)));
    const references = claims.filter((claim) => claim.value(isReference) === true);
    if (references.length === 0) {
      const coverageState = ctx.store.coverageFor(QuantitativeClaim, resultScope);
      const absence = await ctx.applyPrimitive(semanticAbsencePrimitive, [], coverageState);
      const status = absence.name === 'TRUE' ? 'VIOLATED' : absence.name === 'CONFLICT' ? 'CONFLICT' : 'UNKNOWN';
      for (const summaryClaim of claims.filter((claim) => claim.value(claimKind) === 'summary')) {
        const assessment = missingSupportAssessment(summaryClaim, status, coverageState);
        ctx.emit(assessment);
        if (status === 'VIOLATED' || status === 'CONFLICT') {
          ctx.emit(Finding(
            findingType('unsupported-scientific-summary'),
            message(`${summaryClaim.value(claimId)} has no compatible result claim in ${coverageState} coverage.`),
            severity(status === 'VIOLATED' ? 'error' : 'warning'),
            evidence(summaryClaim.value(sourceAnchor)), assurance('mechanical')
          ));
        }
      }
      return;
    }
    if (references.length !== 1) throw new Error(`Expected at most one primary reference claim, received ${references.length}.`);
    const reference = references[0];
    for (const compared of claims.filter((claim) => claim !== reference)) {
      const compatible = await compatibility(ctx, reference, compared);
      const numeric = compatible.status === 'COMPARABLE'
        ? await solveOverlap(ctx, reference, compared, compatible.metric)
        : Object.freeze({ status: 'NOT_RUN', left: null, right: null, traceLength: 0 });
      const decision = await ctx.applyPrimitive(decisionEvaluatePrimitive, assessmentDecision, [compatible.status, numeric.status]);
      if (decision.status !== 'SELECTED') throw new Error(`Decision table did not select one row: ${decision.status}.`);
      const assessment = assessmentTerm(reference, compared, compatible, numeric, decision.result);
      ctx.emit(assessment);
      if (decision.result === 'VIOLATED' || decision.result === 'CONFLICT') {
        ctx.emit(findingFor(assessment, reference, compared));
      }
    }
  },
  usesPrimitives(
    semanticQueryPrimitive, semanticAbsencePrimitive, egraphNormalizePrimitive,
    constraintSolvePrimitive, decisionEvaluatePrimitive
  ),
  reads(QuantitativeClaim),
  writes(ScientificConsistencyAssessment, Finding)
);

export { assessClaims, assessmentDecision, claimPattern };

export default circuit(
  'eval.scientific-report.consistency@1',
  primaryRole(ScientificConsistencyAssessment),
  usesMethod(queryDataflowMethod, eGraphMethod, constraintKernelMethod, decisionTableMethod),
  supports('CONCRETE'),
  include(assessmentDecision, assessClaims)
);
