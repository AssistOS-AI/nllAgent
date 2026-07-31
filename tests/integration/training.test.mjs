import assert from 'node:assert/strict';
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { runProcess } from '../../src/coding-agent/process.mjs';
import { runTraining } from '../../src/training/index.mjs';
import { listAgents, loadAgent } from '../../src/storage/workspace.mjs';
import { writeCandidate } from '../helpers/candidate-fixture.mjs';

const repositoryRoot = resolve(import.meta.dirname, '..', '..');

test('training copies every theory source, reviews, validates, and atomically promotes one immutable build', async () => {
  const root = await mkdtemp(join(tmpdir(), 'nll-training-'));
  const first = join(root, 'retention.md');
  const second = join(root, 'exceptions.md');
  await writeFile(first, '# Retention\nFive years.\n', 'utf8');
  await writeFile(second, '# Exceptions\nDocumented law.\n', 'utf8');
  const calls = [];
  try {
    const result = await runTraining({
      dataRoot: join(root, 'environment'), agentId: 'privacy-agent', theoryPaths: [first, second],
      repositoryRoot, skillsRoot: join(repositoryRoot, '.agents', 'skills'), codexBin: 'codex-test',
      processRunner: async (command, arguments_, options) => {
        if (command !== 'codex-test') return runProcess(command, arguments_, options);
        calls.push(options.cwd);
        if (options.cwd.includes('codex-training')) {
          const context = (await import(`${pathToFileURL(join(options.cwd, 'context', 'agent-context.mjs')).href}?train`)).default;
          assert.equal(context.kind, 'AgentAuthoringContext');
          assert.equal(context.purpose, 'TRAIN');
          assert.equal(context.agent.value('build').id, 'new-candidate');
          assert.match(await readFile(join(options.cwd, 'theory-input', '001-retention.md'), 'utf8'), /Five years/u);
          assert.match(await readFile(join(options.cwd, 'theory-input', '002-exceptions.md'), 'utf8'), /Documented law/u);
          await writeCandidate(join(options.cwd, 'generated'), repositoryRoot, 'privacy-agent');
        } else {
          const context = (await import(`${pathToFileURL(join(options.cwd, 'context', 'agent-context.mjs')).href}?review`)).default;
          assert.equal(context.purpose, 'REVIEW');
          await writeFile(join(options.cwd, 'generated', 'handoff.md'), '# Independent review\n\nAccepted.\n', 'utf8');
        }
        return { code: 0, stdout: 'completed', stderr: '' };
      }
    });
    assert.equal(result.status, 'PROMOTED');
    assert.equal(calls.length, 2);
    assert.deepEqual(await listAgents(join(root, 'environment')), ['privacy-agent']);
    const loaded = await loadAgent(join(root, 'environment'), 'privacy-agent');
    assert.equal(loaded.buildId, result.buildId);
    assert.equal(loaded.buildDigest, result.digest);
    assert.equal(loaded.project.id, 'privacy-agent');
    const promotedContext = (await import(`${pathToFileURL(join(result.buildRoot, 'context', 'agent-context.mjs')).href}?promoted`)).default;
    assert.equal(promotedContext.purpose, 'ANALYZE');
    assert.equal(promotedContext.agent.value('build').id, result.buildId);
    await access(join(result.buildRoot, 'theory', 'sources', '001-retention.md'));
    assert.match(await readFile(join(result.root, 'final-validation.md'), 'utf8'), /benchmarks=1\/1/u);
  } finally {
    await rm(root, { recursive: true });
  }
});

test('a candidate with a failing test is retained for diagnosis but is never promoted', async () => {
  const root = await mkdtemp(join(tmpdir(), 'nll-training-rejected-'));
  const theory = join(root, 'authority.md');
  await writeFile(theory, '# Authority\nA test must pass.\n', 'utf8');
  try {
    await assert.rejects(() => runTraining({
      dataRoot: join(root, 'environment'), agentId: 'rejected-agent', theoryPaths: [theory],
      repositoryRoot, skillsRoot: join(repositoryRoot, '.agents', 'skills'), codexBin: 'codex-test',
      processRunner: async (command, arguments_, options) => {
        if (command !== 'codex-test') return runProcess(command, arguments_, options);
        await writeCandidate(join(options.cwd, 'generated'), repositoryRoot, 'rejected-agent');
        await writeFile(join(options.cwd, 'generated', 'tests', 'agent.test.mjs'), [
          "import test from 'node:test';", "import assert from 'node:assert/strict';",
          "test('rejected',()=>assert.fail('intentional failure'));", ''
        ].join('\n'), 'utf8');
        return { code: 0, stdout: 'candidate', stderr: '' };
      }
    }), (error) => error.code === 'training-tests-failed');
    assert.deepEqual(await listAgents(join(root, 'environment')), []);
  } finally {
    await rm(root, { recursive: true });
  }
});
