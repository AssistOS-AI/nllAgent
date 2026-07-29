import assert from 'node:assert/strict';
import test from 'node:test';
import { runAdvancedScenario } from '../../examples/advanced-circuit/scenario.mjs';

test('advanced example combines observation matching, extension code, foundation, and CNL output', async () => {
  const result = await runAdvancedScenario();
  assert.equal(result.status, 'reported');
  assert.equal(result.model.kind, 'CNLAuditReport');
  assert.equal(result.model.dialect, 'CNL/Audit-1');
  assert.equal(result.findings.length, 3);
  assert.deepEqual(new Set(result.findings.map((finding) => finding.rule)), new Set([
    'EXAMPLE-PARAGRAPH-LENGTH-001',
    'FOUNDATION-LOGIC-001',
    'FOUNDATION-MATH-001'
  ]));
  const paragraphFinding = result.findings.find((finding) =>
    finding.rule === 'EXAMPLE-PARAGRAPH-LENGTH-001');
  assert.equal(paragraphFinding.mainAnchor.quote.startsWith('—'), false);
  assert.match(result.report, /^# CNL\/Audit-1 audit report/mu);
  assert.match(result.report, /Terminal status: `reported`/u);
  assert.match(result.report, /The paragraph contains 19 words/u);
  assert.match(result.report, /Support anchors: `anchor:block:paragraph:/u);
  assert.match(result.report, /example:narrative-paragraphs-have-at-most-twelve-words/u);
});
