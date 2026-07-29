function escapeInline(value) {
  return String(value ?? '').replace(/`/gu, '\\`').replace(/\r?\n/gu, ' ');
}

function renderFinding(finding, index) {
  const anchor = finding.mainAnchor;
  const range = anchor?.range || {};
  const references = finding.sourceRuleReferences?.length ? finding.sourceRuleReferences.join(', ') : 'release rule metadata';
  const limitations = finding.limitations?.length ? finding.limitations.join('; ') : 'None declared.';
  return [
    `### ${index + 1}. ${escapeInline(finding.rule)}`,
    '',
    `- Verdict: \`${escapeInline(finding.verdict)}\``,
    `- Finding: \`${escapeInline(finding.id)}\``,
    `- Circuit: \`${escapeInline(finding.circuit)}\``,
    `- Severity: \`${escapeInline(finding.severity)}\``,
    `- Guarantee: \`${escapeInline(finding.guarantee)}\``,
    `- Subject / scope: \`${escapeInline(finding.subject)}\` / \`${escapeInline(finding.scope)}\``,
    `- Verifier: \`${escapeInline(finding.verifierResult?.verifier || 'none')}\` (\`${escapeInline(finding.verifierResult?.status || 'unknown')}\`)`,
    `- Certificate: \`${escapeInline(finding.certificate?.kind || 'none')}\``,
    `- Location: Unicode code points ${range.start ?? '?'}–${range.end ?? '?'}`,
    `- Support anchors: ${(finding.supportAnchors || []).map((item) => `\`${escapeInline(item)}\``).join(', ') || 'None'}`,
    `- Rule basis: ${escapeInline(references)}`,
    '',
    `> ${String(anchor?.quote || '').replace(/\r?\n/gu, '\n> ')}`,
    '',
    escapeInline(finding.explanation),
    '',
    `Remediation: ${escapeInline(finding.remediation)}`,
    '',
    `Limitations: ${escapeInline(limitations)}`
  ].join('\n');
}

function renderReport(model) {
  const profile = model.kind === 'CNLAuditReport' ? model.dialect : 'CNL/Audit-1';
  const findings = [...(model.findings || [])].sort((a, b) =>
    (a.mainAnchor?.range?.start ?? 0) - (b.mainAnchor?.range?.start ?? 0) || a.rule.localeCompare(b.rule));
  const coverage = model.coverage || [];
  const lines = [
    `# ${escapeInline(profile)} audit report`,
    '',
    `- Agent: \`${escapeInline(model.agent)}\``,
    `- Release: \`${escapeInline(model.release)}\``,
    `- Foundation: \`${escapeInline(model.foundation?.mode === 'off'
      ? 'off' : `${model.foundation?.id || 'unspecified'}@${model.foundation?.version || 'unknown'}`)}\``,
    `- Source digest: \`${escapeInline(model.sourceDigest)}\``,
    `- Terminal status: \`${escapeInline(model.status)}\``,
    `- Compatibility: \`${escapeInline(model.compatibility?.status || 'unknown')}\``,
    `- Active circuits: ${model.compatibility?.activeCircuits?.map((item) => `\`${escapeInline(item)}\``).join(', ') || 'None'}`,
    `- Blocked circuits: ${model.compatibility?.blockedCircuits?.map((item) => `\`${escapeInline(item)}\``).join(', ') || 'None'}`,
    '',
    '## Coverage',
    ''
  ];
  if (coverage.length === 0) lines.push('No coverage certificate was produced.');
  else for (const item of coverage) {
    lines.push(`- \`${escapeInline(item.scope)}\`: ${escapeInline(item.mode)} for ${item.types.map((type) => `\`${escapeInline(type)}\``).join(', ')} via \`${escapeInline(item.producer)}\`; verified: \`${escapeInline(Boolean(item.verified))}\`${item.method ? `; method: \`${escapeInline(item.method)}\`` : ''}.`);
  }
  const limitedObligations = (model.compatibility?.obligations || []).filter((item) => item.status !== 'satisfied');
  if (limitedObligations.length) {
    lines.push('', '## Compatibility obligations requiring attention', '');
    for (const obligation of limitedObligations) {
      lines.push(`- \`${escapeInline(obligation.status)}\` ${escapeInline(obligation.kind)}: ${escapeInline(Array.isArray(obligation.requirement) ? obligation.requirement.join(', ') : obligation.requirement)}${obligation.circuit ? ` (circuit \`${escapeInline(obligation.circuit)}\`)` : ''}.`);
    }
  }
  lines.push('', '## Findings', '');
  if (findings.length === 0) {
    lines.push('No findings were produced by the active circuits over the coverage stated above.');
  } else {
    for (let index = 0; index < findings.length; index += 1) {
      if (index) lines.push('', '---', '');
      lines.push(renderFinding(findings[index], index));
    }
  }
  if (model.conflicts?.length) {
    lines.push('', '## Finding conflicts', '');
    for (const conflict of model.conflicts) {
      lines.push(`- Rule \`${escapeInline(conflict.rule)}\` produced incompatible verdicts ${conflict.verdicts.map((item) => `\`${escapeInline(item)}\``).join(' and ')} for findings ${conflict.findings.map((item) => `\`${escapeInline(item)}\``).join(', ')}.`);
    }
  }
  if (model.issue) {
    lines.push('', '## Processing issue', '', `- Issue: \`${escapeInline(model.issue.id)}\``, `- Type: \`${escapeInline(model.issue.type || model.issue.kind)}\``, '', escapeInline(model.issue.message));
  }
  if (model.limitations?.length) {
    lines.push('', '## Limitations', '', ...model.limitations.map((item) => `- ${escapeInline(item)}`));
  }
  lines.push('');
  return lines.join('\n');
}

export { renderReport };
