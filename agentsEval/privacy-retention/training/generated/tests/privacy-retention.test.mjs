import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { DEFAULT_METHOD_CATALOG, checkArchitecturePlan } from '../../../../../src/architecture/index.mjs';
import { AgentAuthoringContext } from '../../../../../src/context/index.mjs';
import { SAT } from '../../../../../src/engines/constraint-kernel.mjs';
import { ESTABLISHED } from '../../../../../src/engines/proof-kernel.mjs';
import { analyzeProject } from '../../../../../src/runtime/agent-runner.mjs';
import { evidence, findingType } from '../../../../../ontologies/core/index.mjs';
import { identifiedAs } from '../../../../../src/ontology/api.mjs';

import agent from '../agent.mjs';
import { boundaryPreflight, closedPreflight, openPreflight } from '../assurance/retention.abstract.mjs';
import { solveAboveBoundary, solveAtBoundary } from '../assurance/retention.constraint.mjs';
import { replayViolationProof } from '../assurance/retention.proof.mjs';
import { replayViolationWitness } from '../assurance/retention.symbolic.mjs';
import {
  exceptionDroppingMutant, forceClosedCoverageMutant, inclusiveComparatorMutant
} from '../benchmarks/mutations.mjs';
import context from '../context/agent-context.mjs';
import {
  DataController, PersonalDataCategory, PolicyScope, RetentionDeclaration, actor,
  assessmentScope, category, durationYears, recordId, retentionName, sourceAnchor
} from '../ontologies/index.mjs';
import plan from '../plans/retention.plan.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const benchmarkRoot = join(root, '..', 'benchmarks');

async function input(group, name) {
  return readFile(join(benchmarkRoot, group, name, 'input.md'), 'utf8');
}

function findingTypes(analysis) {
  return analysis.findings.map((finding) => finding.value(findingType));
}

test('training assembly, architecture plan, and generated context are typed', () => {
  assert.equal(agent.id, 'privacy-retention');
  assert.equal(agent.circuits.length, 1);
  assert.equal(agent.rulePacks.length, 1);
  assert.deepEqual(checkArchitecturePlan(plan, DEFAULT_METHOD_CATALOG), []);
  assert.ok(context instanceof AgentAuthoringContext);
  assert.equal(context.purpose, 'ANALYZE');
  assert.ok(context.providers.some((provider) => provider.value('primitive') === 'decision.evaluate@1'));
});

test('OntologyJS rejects missing duration and wrong category sort', () => {
  const scope = PolicyScope(identifiedAs('scope:test'), retentionName('test'));
  const controller = DataController(identifiedAs('controller:test'), retentionName('Test'));
  const data = PersonalDataCategory(identifiedAs('category:test'), retentionName('test'));
  assert.throws(() => RetentionDeclaration(
    identifiedAs('retention:missing-duration'), recordId('T'), actor(controller),
    category(data), assessmentScope(scope), sourceAnchor('span')
  ), { code: 'role-cardinality' });
  assert.throws(() => RetentionDeclaration(
    identifiedAs('retention:wrong-category'), recordId('T'), actor(controller),
    category(scope), durationYears(5), assessmentScope(scope), sourceAnchor('span')
  ), { code: 'role-type-mismatch' });
});

test('concrete circuit preserves boundary, closed absence, open coverage, exception, and conflicts', async () => {
  const cases = [
    ['public', 'boundary-satisfied', 'retention-satisfied'],
    ['public', 'violation-closed', 'retention-violated'],
    ['public', 'unknown-open', 'retention-unknown'],
    ['public', 'accepted-exception', 'retention-accepted-exception'],
    ['public', 'incomplete-exception-closed', 'retention-violated'],
    ['public', 'duration-conflict', 'retention-conflict'],
    ['public', 'exception-conflict', 'retention-conflict']
  ];
  for (const [group, name, expected] of cases) {
    const analysis = await analyzeProject(agent, await input(group, name), `${name}.md`, { foundation: 'off' });
    assert.deepEqual(findingTypes(analysis), [expected], name);
    assert.ok(analysis.findings[0].values(evidence).length > 0, `${name} has no evidence`);
    assert.ok(analysis.trace.events.some((event) => event.node === 'primitive:decision.evaluate@1'), name);
    assert.ok(analysis.trace.events.some((event) => event.node === 'primitive:constraints.solve@1')
      || expected === 'retention-conflict', name);
  }
  const incomplete = await analyzeProject(
    agent, await input('public', 'incomplete-exception-closed'),
    'incomplete-exception-closed.md', { foundation: 'off' }
  );
  assert.deepEqual(incomplete.findings[0].values(evidence).map((anchor) => anchor.excerpt), [
    'RETENTION | id=I1 | category=case-note | years=8 | scope=scope-i1',
    'EXCEPTION | retention=I1 | status=documented | authority=none | until=unresolved',
    'COVERAGE | scope=scope-i1 | exceptions=closed'
  ]);
});

test('absence stays local to the exact assessment scope', async () => {
  const analysis = await analyzeProject(
    agent, await input('adversarial', 'scope-isolation'), 'scope-isolation.md', { foundation: 'off' }
  );
  assert.deepEqual(findingTypes(analysis), ['retention-unknown']);
});

test('unmapped categories become explicit materialization gaps', async () => {
  const analysis = await analyzeProject(
    agent, await input('adversarial', 'ontology-gap'), 'ontology-gap.md', { foundation: 'off' }
  );
  assert.equal(analysis.findings.length, 0);
  assert.deepEqual(analysis.store.gaps.map((gap) => gap.gapKind), ['ontology']);
});

test('bounded assurance checks concrete boundary semantics', async () => {
  assert.deepEqual(openPreflight().output('retention-status').possibilities, ['UNKNOWN']);
  assert.deepEqual(closedPreflight().output('retention-status').possibilities, ['VIOLATED']);
  assert.deepEqual(new Set(boundaryPreflight().output('retention-status').possibilities),
    new Set(['SATISFIED', 'VIOLATED', 'UNKNOWN']));
  assert.equal(solveAboveBoundary().status, SAT);
  assert.equal(solveAtBoundary().status, SAT);
  assert.equal(replayViolationProof().status, ESTABLISHED);
  const replay = await replayViolationWitness((text, id) =>
    analyzeProject(agent, text, id, { foundation: 'off' }));
  assert.equal(replay.status, 'CONFIRMED');
});

test('semantic benchmark kills the three authority-relevant mutants', () => {
  assert.equal(inclusiveComparatorMutant(5), true, 'inclusive comparator mutant must differ at the boundary');
  assert.notEqual(exceptionDroppingMutant(8), 'ACCEPTED_EXCEPTION');
  assert.notEqual(forceClosedCoverageMutant(8, 'open'), 'UNKNOWN');
});

test('candidate contains only ESM and Markdown structured artifacts', async () => {
  async function walk(path) {
    const files = [];
    for (const entry of await readdir(path, { withFileTypes: true })) {
      const child = join(path, entry.name);
      if (entry.isDirectory()) files.push(...await walk(child));
      else files.push(child);
    }
    return files;
  }
  const files = await walk(join(root, '..'));
  assert.equal(files.some((path) => /\.(?:json|ts)$/u.test(path)), false);
});
