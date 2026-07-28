import assert from 'node:assert/strict';
import { access, cp, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { runCli } from '../../src/cli/main.mjs';
import { writeJson } from '../../src/core/io.mjs';
import { validateCandidate, validateObservationAlignment } from '../../src/release/manager.mjs';
import { createStandardRegistries } from '../../src/runtime/standard-operators.mjs';
import { loadAgent } from '../../src/storage/agent-store.mjs';

function capture() {
  let value = '';
  return { stream: { write(chunk) { value += chunk; } }, read: () => value };
}

test('CLI qualification creates a reproducible release and activation remains separate', async () => {
  const root = await mkdtemp(join(tmpdir(), 'nllagent-release-'));
  const dataRoot = join(root, 'data');
  const agentRoot = join(dataRoot, 'editorial-demo');
  await cp(resolve('data/editorial-demo'), agentRoot, { recursive: true });
  const candidate = join(agentRoot, 'candidates', '2.0.1');
  await cp(join(agentRoot, 'candidates', '2.0.0'), candidate, { recursive: true });
  const manifest = JSON.parse(await readFile(join(candidate, 'release.json'), 'utf8'));
  manifest.version = '2.0.1';
  manifest.lineage = '2.0.0';
  await writeJson(join(candidate, 'release.json'), manifest);
  const stdout = capture();
  const stderr = capture();
  let code = await runCli([
    'release', 'qualify', '--agent', 'editorial-demo', '--candidate', '2.0.1', '--data-root', dataRoot, '--translator', 'none', '--json'
  ], { stdout: stdout.stream, stderr: stderr.stream, env: {}, cwd: root });
  assert.equal(code, 0, stderr.read());
  assert.equal(JSON.parse(stdout.read()).status, 'qualified');
  const qualifiedManifest = JSON.parse(await readFile(join(agentRoot, 'releases', '2.0.1', 'release.json'), 'utf8'));
  assert.equal(qualifiedManifest.kind, 'NaturalLanguageLinterRelease');
  await access(join(agentRoot, 'releases', '2.0.1', 'observation-contracts.json'));
  await access(join(agentRoot, 'releases', '2.0.1', 'alignment-report.json'));
  await access(join(agentRoot, 'releases', '2.0.1', 'benchmark-results.json'));
  await access(join(agentRoot, 'releases', '2.0.1', 'benchmark-snapshot', 'public', 'weak-phrase', 'input.md'));
  const activationOut = capture();
  code = await runCli([
    'release', 'activate', '--agent', 'editorial-demo', '--release', '2.0.1', '--data-root', dataRoot, '--json'
  ], { stdout: activationOut.stream, stderr: stderr.stream, env: {}, cwd: root });
  assert.equal(code, 0, stderr.read());
  assert.equal(JSON.parse(activationOut.read()).pointer.release, '2.0.1');
});

test('qualification rejects a critical CircuitJS port with no LongTextJS producer', async () => {
  const root = await mkdtemp(join(tmpdir(), 'nllagent-release-alignment-'));
  const dataRoot = join(root, 'data');
  const agentRoot = join(dataRoot, 'editorial-demo');
  await cp(resolve('data/editorial-demo'), agentRoot, { recursive: true });
  const candidate = join(agentRoot, 'candidates', '2.0.2');
  await cp(join(agentRoot, 'candidates', '2.0.0'), candidate, { recursive: true });
  const manifest = JSON.parse(await readFile(join(candidate, 'release.json'), 'utf8'));
  manifest.version = '2.0.2';
  await writeJson(join(candidate, 'release.json'), manifest);
  const circuitPath = join(candidate, 'circuits', 'weak-phrase.circuit.mjs');
  const source = await readFile(circuitPath, 'utf8');
  await writeFile(circuitPath, source.replace('document.paragraph@1', 'narrative.unknown@1'));
  const agent = await loadAgent(dataRoot, 'editorial-demo');
  await assert.rejects(
    () => validateCandidate(agent, '2.0.2', createStandardRegistries()),
    (error) => error.code === 'invalid-release' && error.details?.status === 'misaligned'
  );
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
