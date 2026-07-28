import { normalizeJson } from '../core/canonical.mjs';
import { invariant } from '../core/errors.mjs';

function nonEmptyString(value) {
  return typeof value === 'string' && Boolean(value.trim());
}

function auditObservation(finding) {
  return normalizeJson({
    id: finding.id,
    kind: 'CNLAuditObservation',
    rule: finding.rule,
    circuit: finding.circuit,
    verdict: finding.verdict,
    severity: finding.severity,
    subject: finding.subject,
    scope: finding.scope,
    statement: finding.explanation,
    evidence: {
      mainAnchor: finding.mainAnchor,
      supportAnchors: finding.supportAnchors || []
    },
    ruleBasis: finding.sourceRuleReferences || [],
    guarantee: finding.guarantee,
    verifierResult: finding.verifierResult,
    certificate: finding.certificate,
    remediation: finding.remediation,
    limitations: finding.limitations || []
  });
}

function createCnlAuditReport(source) {
  invariant(source && typeof source === 'object' && !Array.isArray(source),
    'invalid-cnl-audit', 'A CNL audit report requires a structured source model.');
  invariant(nonEmptyString(source.agent), 'invalid-cnl-audit', 'A CNL audit report requires an agent.');
  invariant(nonEmptyString(source.release), 'invalid-cnl-audit', 'A CNL audit report requires a release.');
  invariant(nonEmptyString(source.sourceDigest),
    'invalid-cnl-audit', 'A CNL audit report requires the audited source digest.');
  invariant(nonEmptyString(source.status), 'invalid-cnl-audit', 'A CNL audit report requires a terminal status.');
  const findings = source.findings || [];
  invariant(Array.isArray(findings), 'invalid-cnl-audit', 'CNL audit findings must be an array.');
  return normalizeJson({
    kind: 'CNLAuditReport',
    schemaVersion: 1,
    dialect: 'CNL/Audit-1',
    profile: 'audit',
    agent: source.agent,
    release: source.release,
    sourceDigest: source.sourceDigest,
    status: source.status,
    compatibility: source.compatibility || {
      status: 'unknown', activeCircuits: [], blockedCircuits: []
    },
    coverage: source.coverage || [],
    auditObservations: findings.map(auditObservation),
    findings,
    conflicts: source.conflicts || [],
    limitations: source.limitations || [],
    ...(source.issue ? { issue: source.issue } : {})
  });
}

export { auditObservation, createCnlAuditReport };
