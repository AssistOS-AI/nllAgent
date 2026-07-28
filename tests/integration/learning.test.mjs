import assert from 'node:assert/strict';
import { access, mkdir, mkdtemp, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { runLearning } from '../../src/learning/runner.mjs';
import { createStandardRegistries } from '../../src/runtime/standard-operators.mjs';
import { initializeAgent } from '../../src/storage/agent-store.mjs';

test('learning invokes Codex with fixed sandbox arguments and permits only agent learning writes', async () => {
  const repoRoot = await mkdtemp(join(tmpdir(), 'nllagent-learning-'));
  const dataRoot = join(repoRoot, 'data');
  const rulesRoot = join(repoRoot, 'rules');
  await initializeAgent(dataRoot, 'learn-demo');
  await mkdir(rulesRoot, { recursive: true });
  await writeFile(join(rulesRoot, 'rules.md'), '# Rule\n\nFlag “x”.\n');
  let invocation;
  const processRunner = async (executable, args, options) => {
    invocation = { executable, args, options };
    await writeFile(join(options.cwd, 'proposals', 'codex-note.md'), '# Candidate note\n');
    const outputPath = args[args.indexOf('-o') + 1];
    await writeFile(outputPath, JSON.stringify({ status: 'completed', summary: 'done', candidateVersions: [], issues: [] }));
    return { code: 0, signal: null, stdout: '{"type":"result"}\n', stderr: '' };
  };
  const result = await runLearning({
    repoRoot: resolve('.'), dataRoot, agentName: 'learn-demo', rulesRoot, codexBin: '/fake/codex',
    registries: createStandardRegistries(), env: {}, processRunner
  });
  assert.equal(result.status, 'completed');
  assert.equal(invocation.executable, '/fake/codex');
  assert.deepEqual(invocation.args.slice(0, 8), ['exec', '--sandbox', 'workspace-write', '--ask-for-approval', 'never', '--ephemeral', '--skip-git-repo-check', '--json']);
  assert.match(invocation.options.cwd, /learning-runs\/learning-[^/]+\/workspace$/u);
  assert.equal(invocation.args[invocation.args.indexOf('-C') + 1], invocation.options.cwd);
  const prompt = invocation.args.at(-1);
  assert.match(prompt, /nll-scope-project/u);
  assert.match(prompt, /Never modify published releases/u);
  assert.match(prompt, /Publishing is a separate manual development command/u);
  await access(join(dataRoot, 'learn-demo', 'proposals', 'codex-note.md'));
});

test('learning sandbox rejects forbidden staging writes without touching production pointers', async () => {
  const repoRoot = await mkdtemp(join(tmpdir(), 'nllagent-learning-policy-'));
  const dataRoot = join(repoRoot, 'data');
  const rulesRoot = join(repoRoot, 'rules');
  const agent = await initializeAgent(dataRoot, 'isolated-demo');
  await mkdir(rulesRoot, { recursive: true });
  await writeFile(join(rulesRoot, 'rules.md'), '# Rule\n\nFlag “x”.\n');
  const processRunner = async (_executable, args, options) => {
    await writeFile(join(options.cwd, 'active-release.json'), JSON.stringify({ release: 'forged' }));
    await writeFile(args[args.indexOf('-o') + 1], JSON.stringify({
      status: 'completed', summary: 'done', candidateVersions: [], issues: []
    }));
    return { code: 0, signal: null, stdout: '', stderr: '' };
  };
  await assert.rejects(() => runLearning({
    repoRoot: resolve('.'), dataRoot, agentName: 'isolated-demo', rulesRoot,
    codexBin: '/fake/codex', registries: createStandardRegistries(), env: {}, processRunner
  }), (error) => error.code === 'learning-policy-violation');
  await assert.rejects(access(join(agent.root, 'active-release.json')));
});

test('learning rejects symlinks in copied agent authoring trees', async () => {
  const repoRoot = await mkdtemp(join(tmpdir(), 'nllagent-learning-symlink-'));
  const dataRoot = join(repoRoot, 'data');
  const rulesRoot = join(repoRoot, 'rules');
  const agent = await initializeAgent(dataRoot, 'symlink-demo');
  await mkdir(rulesRoot, { recursive: true });
  await writeFile(join(rulesRoot, 'rules.md'), '# Rule\n\nFlag “x”.\n');
  await symlink(rulesRoot, join(agent.root, 'circuits', 'outside'));
  await assert.rejects(() => runLearning({
    repoRoot: resolve('.'), dataRoot, agentName: 'symlink-demo', rulesRoot,
    codexBin: '/fake/codex', registries: createStandardRegistries(), env: {},
    processRunner: async () => ({ code: 0, signal: null, stdout: '', stderr: '' })
  }), (error) => error.code === 'learning-workspace-unsafe');
});

test('learning validates the Codex final result before promoting authoring changes', async () => {
  const repoRoot = await mkdtemp(join(tmpdir(), 'nllagent-learning-invalid-final-'));
  const dataRoot = join(repoRoot, 'data');
  const rulesRoot = join(repoRoot, 'rules');
  const agent = await initializeAgent(dataRoot, 'invalid-final-demo');
  await mkdir(rulesRoot, { recursive: true });
  await writeFile(join(rulesRoot, 'rules.md'), '# Rule\n\nFlag “x”.\n');
  const processRunner = async (_executable, args, options) => {
    await writeFile(join(options.cwd, 'proposals', 'must-not-promote.md'), '# Unsafe promotion\n');
    await writeFile(args[args.indexOf('-o') + 1], JSON.stringify({ status: 'completed' }));
    return { code: 0, signal: null, stdout: '', stderr: '' };
  };
  await assert.rejects(() => runLearning({
    repoRoot: resolve('.'), dataRoot, agentName: 'invalid-final-demo', rulesRoot,
    codexBin: '/fake/codex', registries: createStandardRegistries(), env: {}, processRunner
  }), (error) => error.code === 'learning-failed');
  await assert.rejects(access(join(agent.root, 'proposals', 'must-not-promote.md')));
});
