function renderFinding(finding, vocabulary) {
  const type = finding.value(vocabulary.findingType);
  const message = finding.value(vocabulary.message);
  const severity = finding.value(vocabulary.severity);
  const evidence = finding.values(vocabulary.evidence);
  return [
    `## ${severity}: ${type}`,
    '',
    message,
    '',
    ...evidence.map((anchor) => `- Evidence: ${anchor.id} — “${anchor.excerpt}”`),
    ''
  ].join('\n');
}

function renderReport({ agent, run, status, source, findings, foundation, vocabulary, limitations = [] }) {
  return [
    '# nllAgent audit',
    '',
    `- Agent: ${agent}`,
    `- Run: ${run}`,
    `- Status: ${status}`,
    `- Source: ${source.id}@${source.revision}`,
    `- Foundation: ${foundation}`,
    `- Findings: ${findings.length}`,
    '',
    ...(findings.length ? findings.map((finding) => renderFinding(finding, vocabulary)) : ['No findings were emitted.', '']),
    ...(limitations.length ? ['## Limits', '', ...limitations.map((item) => `- ${item}`), ''] : [])
  ].join('\n');
}

export { renderFinding, renderReport };
