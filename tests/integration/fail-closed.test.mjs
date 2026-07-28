import assert from 'node:assert/strict';
import { access, cp, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { runCli } from '../../src/cli/main.mjs';
import { digestJson, sha256Bytes } from '../../src/core/canonical.mjs';
import { writeJson } from '../../src/core/io.mjs';

function capture() {
  let value = '';
  return { stream: { write(chunk) { value += chunk; } }, read: () => value };
}

test('incompatible production stops, writes a report, and creates a reusable issue', async () => {
  const root = await mkdtemp(join(tmpdir(), 'nllagent-incompatible-'));
  const dataRoot = join(root, 'data');
  const agentRoot = join(dataRoot, 'editorial-demo');
  await cp(resolve('data/editorial-demo'), agentRoot, { recursive: true });
  const releaseRoot = join(agentRoot, 'releases', '0.1.0');
  const compatibilityPath = join(releaseRoot, 'compatibility.json');
  const compatibility = JSON.parse(await readFile(compatibilityPath, 'utf8'));
  compatibility.languages = ['fr'];
  await writeJson(compatibilityPath, compatibility);
  const manifestPath = join(releaseRoot, 'release.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  manifest.files.find((entry) => entry.path === 'compatibility.json').digest = sha256Bytes(await readFile(compatibilityPath));
  await writeJson(manifestPath, manifest);
  await writeJson(join(releaseRoot, 'publication.json'), {
    kind: 'ReleasePublicationResult', schemaVersion: 1, status: 'published',
    release: '0.1.0', manifestDigest: digestJson(manifest), fixture: true
  });
  await writeJson(join(agentRoot, 'active-release.json'), {
    kind: 'ActiveReleasePointer', schemaVersion: 1, release: '0.1.0', manifestDigest: digestJson(manifest)
  });
  const output = join(root, 'stopped.md');
  const stdout = capture();
  const stderr = capture();
  const code = await runCli([
    'run', '--agent', 'editorial-demo', '--data-root', dataRoot,
    '--input', resolve('data/editorial-demo/benchmark/public/weak-phrase/input.md'), '--output', output, '--json'
  ], { stdout: stdout.stream, stderr: stderr.stream, env: {}, cwd: root });
  assert.equal(code, 3, stderr.read());
  const result = JSON.parse(stdout.read());
  assert.match(await readFile(output, 'utf8'), /stopped-incompatible/u);
  assert.ok(result.issue);
  assert.ok((await readdir(join(agentRoot, 'issues'))).some((name) => name === `${result.issue}.json`));
});

test('agent, release, issue, and feedback CLI operations use structured stores', async () => {
  const root = await mkdtemp(join(tmpdir(), 'nllagent-lifecycle-'));
  const dataRoot = join(root, 'data');
  const stdout = capture();
  const stderr = capture();
  let code = await runCli(['agent', 'init', '--agent', 'fresh-agent', '--data-root', dataRoot, '--json'], {
    stdout: stdout.stream, stderr: stderr.stream, env: {}, cwd: root
  });
  assert.equal(code, 0, stderr.read());
  const manifest = JSON.parse(await readFile(join(dataRoot, 'fresh-agent', 'agent.json'), 'utf8'));
  assert.equal(manifest.kind, 'NaturalLanguageLinterProject');
  const feedbackOut = capture();
  code = await runCli([
    'feedback', 'add', '--agent', 'fresh-agent', '--data-root', dataRoot,
    '--run', 'run-external', '--type', 'observation-correction', '--message', 'The actor is Alice.', '--json'
  ], { stdout: feedbackOut.stream, stderr: stderr.stream, env: {}, cwd: root });
  assert.equal(code, 0, stderr.read());
  assert.equal(JSON.parse(feedbackOut.read()).feedback.type, 'observation-correction');
  const issueOut = capture();
  code = await runCli(['issue', 'list', '--agent', 'fresh-agent', '--data-root', dataRoot, '--json'], {
    stdout: issueOut.stream, stderr: stderr.stream, env: {}, cwd: root
  });
  assert.equal(code, 0, stderr.read());
  assert.deepEqual(JSON.parse(issueOut.read()).issues, []);
});

test('multiple agents remain separately discoverable with independent workspaces', async () => {
  const root = await mkdtemp(join(tmpdir(), 'nllagent-many-agents-'));
  const dataRoot = join(root, 'data');
  const silent = capture();
  for (const name of ['editorial-one', 'normative-two']) {
    const code = await runCli(['agent', 'init', '--agent', name, '--data-root', dataRoot, '--json'], {
      stdout: silent.stream, stderr: silent.stream, env: {}, cwd: root
    });
    assert.equal(code, 0);
  }
  const output = capture();
  const code = await runCli(['agent', 'list', '--data-root', dataRoot, '--json'], {
    stdout: output.stream, stderr: silent.stream, env: {}, cwd: root
  });
  assert.equal(code, 0);
  assert.deepEqual(JSON.parse(output.read()).agents.map((agent) => agent.name), ['editorial-one', 'normative-two']);
  await writeFile(join(dataRoot, 'editorial-one', 'circuits', 'only-editorial.txt'), 'owned');
  await assert.rejects(access(join(dataRoot, 'normative-two', 'circuits', 'only-editorial.txt')));
});
