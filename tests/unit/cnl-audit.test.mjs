import assert from 'node:assert/strict';
import test from 'node:test';
import { createCnlAuditReport } from '../../src/report/cnl-audit.mjs';
import { renderReport } from '../../src/report/markdown-renderer.mjs';

test('audit mode produces canonical CNL observations and a deterministic Markdown view', () => {
  const finding = {
    kind: 'Finding', schemaVersion: 1, id: 'finding:1', rule: 'LEGAL-17',
    circuit: 'legal.notice@1.0.0', verdict: 'undetermined', severity: 'warning',
    subject: 'incident:17', scope: 'notice:17',
    explanation: 'The supplied evidence does not establish that the official log is complete.',
    mainAnchor: { id: 'anchor:1', quote: 'Partial export', range: { start: 0, end: 14 } },
    supportAnchors: ['anchor:1'],
    sourceRuleReferences: ['authority/notice-law.md#article-17'],
    guarantee: 'mechanically-certified',
    verifierResult: {
      status: 'accept', verifier: 'coverage.closed-world@1',
      checkedProperties: ['coverage-domain'], diagnostics: []
    },
    certificate: { kind: 'CoverageCertificate', mode: 'open-world' },
    remediation: 'Provide the complete official notification log.',
    limitations: ['No absence claim is permitted over a partial export.']
  };
  const audit = createCnlAuditReport({
    agent: 'legal-demo', release: '1.0.0', sourceDigest: 'sha256:source',
    status: 'reported', compatibility: {
      status: 'compatible', activeCircuits: ['legal.notice'], blockedCircuits: []
    },
    coverage: [], findings: [finding], conflicts: [], limitations: []
  });
  assert.equal(audit.kind, 'CNLAuditReport');
  assert.equal(audit.dialect, 'CNL/Audit-1');
  assert.equal(audit.auditObservations[0].kind, 'CNLAuditObservation');
  assert.equal(audit.auditObservations[0].verdict, 'undetermined');
  assert.match(renderReport(audit), /^# CNL\/Audit-1 audit report/mu);
});
