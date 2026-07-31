import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { runProcess, runTaskAnalysis } from '../../src/coding-agent/index.mjs';
import { runTraining } from '../../src/training/index.mjs';
import { writeCandidate } from '../helpers/candidate-fixture.mjs';

const repositoryRoot = resolve(import.meta.dirname, '..', '..');

test('task analysis persists reimportable LongTextJS, result, trace, and exact task pin modules', async () => {
  const root = await mkdtemp(join(tmpdir(), 'nll-persistence-'));
  const dataRoot = join(root, 'environment');
  const authority = join(root, 'authority.md');
  const input = join(root, 'input.md');
  await writeFile(authority, '# Authority\nObserve the document.\n', 'utf8');
  await writeFile(input, '# Document\nA statement.\n', 'utf8');
  try {
    const trained = await runTraining({
      dataRoot, agentId: 'persistence-agent', theoryPaths: [authority], repositoryRoot,
      skillsRoot: join(repositoryRoot, '.agents', 'skills'), codexBin: 'codex-train',
      processRunner: async (command, arguments_, options) => {
        if (command !== 'codex-train') return runProcess(command, arguments_, options);
        if (options.cwd.includes('codex-training')) await writeCandidate(join(options.cwd, 'generated'), repositoryRoot, 'persistence-agent');
        else await writeFile(join(options.cwd, 'generated', 'handoff.md'), '# Review\n\nAccepted.\n', 'utf8');
        return { code: 0, stdout: 'complete', stderr: '' };
      }
    });
    const analysis = await runTaskAnalysis({
      dataRoot, agentId: 'persistence-agent', taskId: 'persisted-analysis', inputPath: input,
      foundation: 'off', repositoryRoot, skillsRoot: join(repositoryRoot, '.agents', 'skills'),
      codexBin: 'codex-analyze',
      processRunner: async (command, arguments_, options) => {
        if (command !== 'codex-analyze') return runProcess(command, arguments_, options);
        await writeFile(join(options.cwd, 'generated', 'program.mjs'), 'export default function materialize() { return []; }\n', 'utf8');
        await writeFile(join(options.cwd, 'generated', 'handoff.md'), '# Handoff\n', 'utf8');
        return { code: 0, stdout: 'complete', stderr: '' };
      }
    });
    const program = await import(pathToFileURL(join(analysis.root, 'longtext/program.mjs')));
    const result = await import(pathToFileURL(join(analysis.root, 'result.mjs')));
    const trace = await import(pathToFileURL(join(analysis.root, 'trace/run.trace.mjs')));
    const task = await import(pathToFileURL(join(analysis.root, 'task.mjs')));
    assert.equal(program.default.kind, 'LongTextProgram');
    assert.equal(result.default.outputs.length, 0);
    assert.ok(Array.isArray(trace.default.events));
    assert.equal(task.agentBuild, trained.buildId);
    assert.equal(task.agentBuildDigest, trained.digest);
  } finally {
    await rm(root, { recursive: true });
  }
});
