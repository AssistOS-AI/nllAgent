import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { Term } from '../../../src/ontology/model.mjs';
import suite from '../benchmark/index.mjs';
import mutations from '../benchmark/mutations.mjs';
import { ContinuityAssessment, Finding, assessmentStatus, evidence } from '../ontologies/index.mjs';
import { runCase } from './support/case-programs.mjs';

async function execute(id) {
  const text = await readFile(new URL(`../benchmark/${id}/input.md`, import.meta.url), 'utf8');
  const result = await runCase(id, text);
  const assessment = result.store.outputs.find((value) =>
    value instanceof Term && value.concept === ContinuityAssessment.definition);
  const findings = result.store.outputs.filter((value) => value instanceof Term && value.concept === Finding.definition);
  return Object.freeze({ ...result, status: assessment.value(assessmentStatus), findings, assessment });
}

test('all executable benchmark expectations include status, count, and evidence contracts', async () => {
  assert.equal(suite.entries.length, 8);
  for (const [testCase, expected] of suite.entries) {
    const id = testCase.id.replace('continuity-', '');
    const observed = await execute(id);
    assert.equal(observed.status, expected.status, `${id} status`);
    assert.equal(observed.findings.length, expected.findingCount, `${id} finding count`);
    const excerpts = new Set(observed.assessment.values(evidence).map((anchor) => anchor.excerpt));
    for (const excerpt of expected.evidence) assert.ok(excerpts.has(excerpt), `${id} missing evidence: ${excerpt}`);
  }
});

test('six category-error mutations are killed by independent semantic outcomes', async () => {
  assert.equal(mutations.length, 6);
  for (const mutation of mutations) {
    const baseline = await execute(mutation.baselineCase);
    const mutant = await execute(mutation.mutantCase);
    assert.notEqual(
      `${baseline.status}:${baseline.findings.length}`,
      `${mutant.status}:${mutant.findings.length}`,
      `${mutation.id} survived: ${mutation.contract}`
    );
  }
  const open = await execute('open-gap');
  assert.equal(open.status, 'UNKNOWN');
  assert.equal(open.findings.length, 0, 'UNKNOWN must never be treated as false absence');
});
