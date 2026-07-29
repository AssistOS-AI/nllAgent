import assert from 'node:assert/strict';
import { access, cp, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { runCli } from '../../src/cli/main.mjs';
import { writeJson } from '../../src/core/io.mjs';
import {
  validateCandidate, validateCapabilityGapReport, validateObservationAlignment
} from '../../src/release/manager.mjs';
import { loadAndInstallRuntimeExtension } from '../../src/runtime/extensions.mjs';
import { createStandardRegistries } from '../../src/runtime/standard-operators.mjs';
import { loadAgent } from '../../src/storage/agent-store.mjs';

function capture() {
  let value = '';
  return { stream: { write(chunk) { value += chunk; } }, read: () => value };
}

test('manual publication creates a reproducible release and updates the active pointer', async () => {
  const root = await mkdtemp(join(tmpdir(), 'nllagent-release-'));
  const dataRoot = join(root, 'data');
  const agentRoot = join(dataRoot, 'editorial-demo');
  await cp(resolve('data/editorial-demo'), agentRoot, { recursive: true });
  const candidate = join(agentRoot, 'candidates', '0.1.1');
  await cp(join(agentRoot, 'candidates', '0.1.0'), candidate, { recursive: true });
  const manifest = JSON.parse(await readFile(join(candidate, 'release.json'), 'utf8'));
  manifest.version = '0.1.1';
  manifest.lineage = '0.1.0';
  manifest.capabilityGapReport = 'capability-gap-report.json';
  manifest.circuits.push('circuits/query-first-noop.circuit.mjs');
  await writeJson(join(candidate, 'capability-gap-report.json'), {
    kind: 'CapabilityGapReport', schemaVersion: 1,
    gaps: [{
      issue: 'serious-issue:1', status: 'mitigated',
      summary: 'The query-first test uses reference-to-lowered comparison but claims no mutation score.',
      reproducer: 'circuits/query-first-noop.circuit.mjs',
      evidence: ['query-first-artifacts.json'], guaranteeCeiling: 'mechanically-certified-for-tested-cases'
    }]
  });
  await writeFile(join(candidate, 'circuits', 'query-first-noop.circuit.mjs'), `export default queryFirstCircuit({
    kind: 'CircuitJSQueryFirst', dialect: 'circuitjs-query-first@1',
    id: 'editorial.query-first-noop', version: '0.1.1',
    description: 'Exercise query-first publication without changing the editorial findings.',
    sourceRuleReferences: ['authority/style-guide.md#rule-ed-001-weak-phrase-in-narration'],
    queries: {
      paragraphs: {
        kind: 'LongTextQuery', schemaVersion: 1, id: 'q:all-paragraphs',
        from: {
          relation: 'observations', as: 'p', type: 'document.paragraph@1',
          statuses: ['extracted'], coverage: 'closed-world'
        },
        select: { paragraph: { ref: 'p' } },
        orderBy: [{ expr: { field: 'p.payload.order' }, direction: 'asc' }]
      }
    },
    decisionTables: [{
      kind: 'DecisionTable', schemaVersion: 1, id: 'table:no-op', input: 'q:all-paragraphs',
      hitPolicy: 'collect', unknownPolicy: 'report-undetermined',
      verifyWith: 'query.decision-replay@1',
      rows: [{
        id: 'QF-NOOP', authority: ['authority/style-guide.md#rule-ed-001-weak-phrase-in-narration'],
        when: { literal: false },
        then: { rule: 'QF-NOOP', mainAnchor: { anchorFrom: 'p' } }
      }]
    }],
    budgets: { nodes: 10, wallTimeMs: 5000 }
  });\n`);
  await writeJson(join(candidate, 'release.json'), manifest);
  const stdout = capture();
  const stderr = capture();
  let code = await runCli([
    'release', 'publish', '--agent', 'editorial-demo', '--candidate', '0.1.1', '--data-root', dataRoot, '--translator', 'none', '--json'
  ], { stdout: stdout.stream, stderr: stderr.stream, env: {}, cwd: root });
  assert.equal(code, 0, stderr.read());
  const published = JSON.parse(stdout.read());
  assert.equal(published.status, 'published');
  assert.equal(published.pointer.release, '0.1.1');
  assert.ok(published.checks.includes('capability-gap-report'));
  const publishedManifest = JSON.parse(await readFile(join(agentRoot, 'releases', '0.1.1', 'release.json'), 'utf8'));
  assert.equal(publishedManifest.kind, 'NaturalLanguageLinterRelease');
  assert.equal(publishedManifest.status, 'published');
  await access(join(agentRoot, 'releases', '0.1.1', 'publication.json'));
  await access(join(agentRoot, 'releases', '0.1.1', 'capability-gap-report.json'));
  await access(join(agentRoot, 'releases', '0.1.1', 'observation-contracts.json'));
  const queryArtifacts = JSON.parse(await readFile(
    join(agentRoot, 'releases', '0.1.1', 'query-first-artifacts.json'), 'utf8'
  ));
  assert.equal(queryArtifacts.circuits[0].author.kind, 'CircuitJSQueryFirst');
  assert.equal(queryArtifacts.circuits[0].generatedGraph.kind, 'CircuitJS');
  assert.equal(queryArtifacts.circuits[0].queryContract.kind, 'CircuitQueryContract');
  assert.equal(queryArtifacts.circuits[0].sourceMap.kind, 'QueryFirstSourceMap');
  assert.deepEqual(queryArtifacts.circuits[0].analysis, { diagnostics: [], status: 'passed' });
  await access(join(agentRoot, 'releases', '0.1.1', 'alignment-report.json'));
  await access(join(agentRoot, 'releases', '0.1.1', 'benchmark-results.json'));
  await access(join(agentRoot, 'releases', '0.1.1', 'benchmark-snapshot', 'public', 'weak-phrase', 'input.md'));
});

test('publication checks reject a critical observation binding with no LongTextJS producer', async () => {
  const root = await mkdtemp(join(tmpdir(), 'nllagent-release-alignment-'));
  const dataRoot = join(root, 'data');
  const agentRoot = join(dataRoot, 'editorial-demo');
  await cp(resolve('data/editorial-demo'), agentRoot, { recursive: true });
  const candidate = join(agentRoot, 'candidates', '0.1.2');
  await cp(join(agentRoot, 'candidates', '0.1.0'), candidate, { recursive: true });
  const manifest = JSON.parse(await readFile(join(candidate, 'release.json'), 'utf8'));
  manifest.version = '0.1.2';
  await writeJson(join(candidate, 'release.json'), manifest);
  const circuitPath = join(candidate, 'circuits', 'weak-phrase.circuit.mjs');
  const source = await readFile(circuitPath, 'utf8');
  await writeFile(circuitPath, source.replace('document.paragraph@1', 'narrative.unknown@1'));
  const agent = await loadAgent(dataRoot, 'editorial-demo');
  await assert.rejects(
    () => validateCandidate(agent, '0.1.2', createStandardRegistries()),
    (error) => error.code === 'invalid-release' && error.details?.status === 'misaligned'
  );
});

test('candidate validation locks every referenced trusted runtime extension digest', async () => {
  const root = await mkdtemp(join(tmpdir(), 'nllagent-release-extension-'));
  const dataRoot = join(root, 'data');
  const agentRoot = join(dataRoot, 'editorial-demo');
  await cp(resolve('data/editorial-demo'), agentRoot, { recursive: true });
  const candidate = join(agentRoot, 'candidates', '0.1.3');
  await cp(join(agentRoot, 'candidates', '0.1.0'), candidate, { recursive: true });
  const circuitRelative = 'circuits/custom-paragraph-length.circuit.mjs';
  const source = (await readFile(resolve('examples/runtime-extension/paragraph-length.circuit.mjs'), 'utf8'))
    .replace('example.paragraph-length', 'editorial.custom-paragraph-length')
    .replace('1.0.0', '0.1.3')
    .replace('example:paragraphs-must-have-at-most-twelve-words',
      'authority/style-guide.md#rule-ed-001-weak-phrase-in-narration');
  await writeFile(join(candidate, circuitRelative), source);
  const registries = createStandardRegistries();
  const descriptor = await loadAndInstallRuntimeExtension(
    registries,
    resolve('examples/runtime-extension/paragraph-length.extension.mjs')
  );
  const manifestPath = join(candidate, 'release.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  manifest.version = '0.1.3';
  manifest.circuits.push(circuitRelative);
  manifest.runtimeExtensions = [{ id: descriptor.id, digest: descriptor.digest }];
  await writeJson(manifestPath, manifest);
  const agent = await loadAgent(dataRoot, 'editorial-demo');
  const validated = await validateCandidate(agent, '0.1.3', registries);
  assert.deepEqual(validated.runtimeExtensions, [{ id: descriptor.id, digest: descriptor.digest }]);

  manifest.runtimeExtensions[0].digest = `sha256:${'0'.repeat(64)}`;
  await writeJson(manifestPath, manifest);
  await assert.rejects(() => validateCandidate(agent, '0.1.3', registries),
    (error) => error.code === 'runtime-extension-lock-mismatch');
});

test('candidate capability-gap reports use explicit reviewable states and evidence', () => {
  const report = validateCapabilityGapReport({
    kind: 'CapabilityGapReport', schemaVersion: 1,
    gaps: [{
      issue: 'serious-issue:5', status: 'blocked',
      summary: 'Cross-document identity is required but no approved materializer is installed.',
      reproducer: 'benchmark/identity/repeated-name/input.md',
      evidence: ['benchmark/identity/repeated-name/expected.json', 'proposals/identity-materializer.md'],
      guaranteeCeiling: 'review-required'
    }]
  });
  assert.equal(report.gaps[0].status, 'blocked');
  assert.throws(() => validateCapabilityGapReport({
    kind: 'CapabilityGapReport', schemaVersion: 1,
    gaps: [{
      issue: 'serious-issue:5', status: 'fixed-in-prose', summary: 'No executable evidence.',
      reproducer: 'case.md', evidence: ['note.md'], guaranteeCeiling: 'unknown'
    }]
  }), (error) => error.code === 'invalid-release' && /invalid status/u.test(error.message));
});

test('release alignment does not treat proposed extraction as mechanical evidence', () => {
  const alignment = validateObservationAlignment([{
    circuit: { id: 'test.semantic' },
    observationContract: {
      ports: [{
        name: 'events', types: ['narrative.event@1'], statuses: ['proposed'],
        cardinality: 'many', coverage: 'open-world', critical: true,
        scopeRelation: null, guarantee: 'mechanically-certified'
      }]
    }
  }], [{ id: 'extract.events@1', outputType: 'narrative.event@1' }]);
  assert.equal(alignment.status, 'misaligned');
  assert.equal(alignment.ports[0].guaranteeCompatible, false);
});

test('release alignment recognizes default foundation observations as open-world extracted inputs', () => {
  const alignment = validateObservationAlignment([{
    circuit: { id: 'test.foundation-emotions' },
    observationContract: {
      ports: [{
        name: 'emotions', types: ['foundation.emotion-assertion@1'], statuses: ['extracted'],
        cardinality: 'many', coverage: 'open-world', critical: true,
        scopeRelation: null, guarantee: null
      }]
    }
  }], []);
  assert.equal(alignment.status, 'aligned');
  assert.equal(alignment.ports[0].producers[0].id, 'foundation.controlled-english@1');
});
