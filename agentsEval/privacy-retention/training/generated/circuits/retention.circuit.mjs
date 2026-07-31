import {
  CONFLICT, FALSE, TRUE, UNKNOWN, anyValue, circuit, columns, decisionTable, include,
  primaryRole, reads, result, row, stage, supports, usesMethod, usesPrimitives, values, writes
} from '../../../../../src/circuit/index.mjs';
import { SAT, differenceAtMost, equal, numberVariable } from '../../../../../src/engines/constraint-kernel.mjs';
import { constraintSolvePrimitive, decisionEvaluatePrimitive } from '../../../../../src/sdk/index.mjs';
import {
  Finding, assurance, evidence, findingType, message, severity
} from '../../../../../ontologies/core/index.mjs';
import {
  ExceptionCoverageEvidence, ExceptionEvidence, RetentionDeclaration, assessmentScope,
  category, coverageScope, coverageState, durationYears, exceptionRecordId, exceptionStatus,
  exceptionUntil, legalAuthority, recordId, retentionName, sourceAnchor
} from '../ontologies/index.mjs';

const STATUS_TABLE = decisionTable(
  'privacy-retention-status', columns('duration-comparison', 'documented-exception'),
  row(values(CONFLICT, anyValue()), result('CONFLICT'), 100),
  row(values(anyValue(), CONFLICT), result('CONFLICT'), 100),
  row(values(FALSE, anyValue()), result('SATISFIED'), 80),
  row(values(TRUE, TRUE), result('ACCEPTED_EXCEPTION'), 80),
  row(values(TRUE, FALSE), result('VIOLATED'), 80),
  row(values(TRUE, UNKNOWN), result('UNKNOWN'), 80),
  row(values(UNKNOWN, anyValue()), result('UNKNOWN'), 70),
  'priority'
);

function uniqueAnchors(anchors) {
  return [...new Map(anchors.map((anchor) => [anchor.id, anchor])).values()];
}

async function durationTruth(ctx, declarations) {
  const durations = new Set(declarations.map((item) => item.value(durationYears)));
  if (durations.size !== 1) return CONFLICT;
  const duration = numberVariable('retention-duration');
  const limit = numberVariable('retention-limit');
  const solved = await ctx.applyPrimitive(constraintSolvePrimitive, [
    equal(duration, [...durations][0]),
    equal(limit, 5),
    differenceAtMost(limit, duration, -1)
  ]);
  return solved.status === SAT ? TRUE : FALSE;
}

function completeDocumentedException(item) {
  if (item.value(exceptionStatus) !== 'documented') return false;
  const authorityValue = item.value(legalAuthority);
  const untilValue = item.value(exceptionUntil);
  return typeof authorityValue === 'string' && authorityValue.trim().length > 0 && authorityValue !== 'none'
    && typeof untilValue === 'string' && untilValue.trim().length > 0 && untilValue !== 'unresolved';
}

function exceptionTruth(exceptions, coverage) {
  const hasCompleteDocumented = exceptions.some(completeDocumentedException);
  const hasUndocumented = exceptions.some((item) => item.value(exceptionStatus) === 'undocumented');
  if (hasCompleteDocumented && hasUndocumented) return CONFLICT;
  if (hasCompleteDocumented) return TRUE;
  if (hasUndocumented) return FALSE;
  return coverage === 'closed' ? FALSE : UNKNOWN;
}

function coverageForScope(scope, evidenceValues) {
  const states = new Set(evidenceValues
    .filter((item) => item.value(coverageScope).identity === scope.identity)
    .map((item) => item.value(coverageState)));
  if (states.has('conflict') || states.size > 1) return 'conflict';
  return [...states][0] || 'unknown';
}

function evidenceFor(status, declarations, exceptions, coverageEvidence) {
  const durationAnchors = declarations.map((item) => item.value(sourceAnchor));
  if (status === 'SATISFIED') return uniqueAnchors(durationAnchors);
  if (status === 'ACCEPTED_EXCEPTION') {
    return uniqueAnchors([
      ...durationAnchors,
      ...exceptions.filter(completeDocumentedException)
        .map((item) => item.value(sourceAnchor))
    ]);
  }
  if (status === 'CONFLICT') {
    return uniqueAnchors([...durationAnchors, ...exceptions.map((item) => item.value(sourceAnchor))]);
  }
  return uniqueAnchors([
    ...durationAnchors,
    ...exceptions.map((item) => item.value(sourceAnchor)),
    ...coverageEvidence.map((item) => item.value(sourceAnchor))
  ]);
}

function statusFinding(status, id, declarations, exceptions, coverageEvidence) {
  const categoryName = declarations[0].value(category).value(retentionName);
  const durationValues = [...new Set(declarations.map((item) => item.value(durationYears)))].sort((a, b) => a - b);
  const findingName = `retention-${status.toLowerCase().replaceAll('_', '-')}`;
  const detail = status === 'CONFLICT'
    ? `incompatible duration or exception evidence (${durationValues.join(', ')} years)`
    : `${durationValues[0]} years`;
  const level = status === 'VIOLATED' || status === 'CONFLICT'
    ? 'error' : status === 'UNKNOWN' ? 'warning' : 'info';
  const anchors = evidenceFor(status, declarations, exceptions, coverageEvidence);
  return Finding(
    findingType(findingName),
    message(`RET-001 assessment for ${id} (${categoryName}): ${status}; ${detail}.`),
    severity(level),
    ...anchors.map((anchor) => evidence(anchor)),
    assurance('mechanical')
  );
}

const assessRetention = stage(
  'privacy-retention.assess-records',
  async (ctx) => {
    const groups = new Map();
    for (const declaration of ctx.store.instancesOf(RetentionDeclaration)) {
      const id = declaration.value(recordId);
      const group = groups.get(id) || [];
      group.push(declaration);
      groups.set(id, group);
    }
    const allExceptions = ctx.store.instancesOf(ExceptionEvidence);
    const allCoverageEvidence = ctx.store.instancesOf(ExceptionCoverageEvidence);

    for (const [id, declarations] of [...groups].sort(([left], [right]) => left.localeCompare(right))) {
      const scope = declarations[0].value(assessmentScope);
      const scopeConflict = declarations.some((item) => item.value(assessmentScope).identity !== scope.identity);
      const exceptions = allExceptions.filter((item) => item.value(exceptionRecordId) === id);
      const coverageEvidence = allCoverageEvidence.filter((item) =>
        item.value(coverageScope).identity === scope.identity);
      const coverage = scopeConflict ? 'conflict' : coverageForScope(scope, allCoverageEvidence);
      const comparison = scopeConflict ? CONFLICT : await durationTruth(ctx, declarations);
      const exception = exceptionTruth(exceptions, coverage);
      const decision = await ctx.applyPrimitive(
        decisionEvaluatePrimitive, STATUS_TABLE, [comparison, exception]
      );
      const status = decision.result || 'UNKNOWN';
      const anchors = evidenceFor(status, declarations, exceptions, coverageEvidence);
      const verified = await ctx.verify(`privacy-retention.evidence-${id}`, () =>
        anchors.length > 0 && anchors.every((anchor) => anchor.excerpt.length > 0));
      if (verified) ctx.emit(statusFinding(status, id, declarations, exceptions, coverageEvidence));
    }
  },
  reads(RetentionDeclaration, ExceptionEvidence, ExceptionCoverageEvidence),
  usesPrimitives(constraintSolvePrimitive, decisionEvaluatePrimitive),
  writes(Finding)
);

export {
  STATUS_TABLE, assessRetention, completeDocumentedException, coverageForScope, durationTruth, exceptionTruth
};

export default circuit(
  'privacy.retention.root@1',
  primaryRole('RetentionAssessment'),
  usesMethod('query-dataflow', 'constraint-kernel', 'finite-decision-table'),
  supports('CONCRETE', 'ABSTRACT', 'SYMBOLIC'),
  include(assessRetention)
);
