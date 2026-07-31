import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { runProcess, runTaskAnalysis, validateGeneratedModule } from '../../src/coding-agent/index.mjs';
import { runTraining } from '../../src/training/index.mjs';
import { loadTask } from '../../src/storage/workspace.mjs';
import { writeCandidate } from '../helpers/candidate-fixture.mjs';

const repositoryRoot = resolve(import.meta.dirname, '..', '..');

async function trainFixture(root) {
  const theory = join(root, 'authority.md');
  await writeFile(theory, '# Authority\nObserve grounded claims.\n', 'utf8');
  return runTraining({
    dataRoot: join(root, 'environment'), agentId: 'audit-agent', theoryPaths: [theory], repositoryRoot,
    skillsRoot: join(repositoryRoot, '.agents', 'skills'), codexBin: 'codex-test',
    processRunner: async (command, arguments_, options) => {
      if (command !== 'codex-test') return runProcess(command, arguments_, options);
      if (options.cwd.includes('codex-training')) await writeCandidate(join(options.cwd, 'generated'), repositoryRoot, 'audit-agent');
      else await writeFile(join(options.cwd, 'generated', 'handoff.md'), '# Review\n\nAccepted.\n', 'utf8');
      return { code: 0, stdout: 'complete', stderr: '' };
    }
  });
}

test('analysis pins one build, generates task-local LongTextJS through its sole skill, and never mutates the theory', async () => {
  const root = await mkdtemp(join(tmpdir(), 'nll-task-analysis-'));
  try {
    const trained = await trainFixture(root);
    const before = await readFile(join(trained.buildRoot, 'agent.mjs'), 'utf8');
    const input = join(root, 'document.md');
    const output = join(root, 'report.md');
    await writeFile(input, '# Document\nA grounded statement.\n', 'utf8');
    let codexWorkspace;
    const result = await runTaskAnalysis({
      dataRoot: join(root, 'environment'), agentId: 'audit-agent', taskId: 'document-review',
      inputPath: input, outputPath: output, foundation: 'off', repositoryRoot,
      skillsRoot: join(repositoryRoot, '.agents', 'skills'), codexBin: 'codex-analysis',
      processRunner: async (command, arguments_, options) => {
        if (command !== 'codex-analysis') return runProcess(command, arguments_, options);
        codexWorkspace = options.cwd;
        assert.match(await readFile(join(options.cwd, 'context', 'agent-context.md'), 'utf8'), /audit-agent/u);
        assert.match(await readFile(join(options.cwd, 'task', 'input.md'), 'utf8'), /grounded statement/u);
        await writeFile(join(options.cwd, 'generated', 'program.mjs'), 'export default function materialize() { return []; }\n', 'utf8');
        await writeFile(join(options.cwd, 'generated', 'notes.md'), '# Notes\n\nNo observable terms.\n', 'utf8');
        await writeFile(join(options.cwd, 'generated', 'handoff.md'), '# Handoff\n\nNo verdict emitted.\n', 'utf8');
        return { code: 0, stdout: 'materialized', stderr: '' };
      }
    });
    assert.equal(result.buildId, trained.buildId);
    assert.equal(result.status, 'reported');
    const task = await loadTask(join(root, 'environment'), 'document-review');
    assert.equal(task.agentBuild, trained.buildId);
    assert.equal(task.agentBuildDigest, trained.digest);
    assert.equal(task.status, 'reported');
    assert.match(codexWorkspace, /tasks\/document-review\/codex/u);
    assert.match(await readFile(output, 'utf8'), /# nllAgent audit/u);
    assert.equal(await readFile(join(trained.buildRoot, 'agent.mjs'), 'utf8'), before);
    assert.equal((await stat(join(result.root, 'generated', 'program.mjs'))).isFile(), true);
  } finally {
    await rm(root, { recursive: true });
  }
});

test('task materializers with imports are rejected before deterministic execution', async () => {
  const root = await mkdtemp(join(tmpdir(), 'nll-task-import-'));
  const generated = join(root, 'generated');
  await mkdir(generated);
  const modulePath = join(generated, 'program.mjs');
  await writeFile(modulePath, "import process from 'node:process';\nexport default function materialize(){ return process.argv; }\n", 'utf8');
  try {
    await assert.rejects(() => validateGeneratedModule({
      modulePath, workspaceRoot: generated, repositoryRoot, kind: 'materializer'
    }), (error) => error.code === 'generated-module-rejected');
  } finally {
    await rm(root, { recursive: true });
  }
});
