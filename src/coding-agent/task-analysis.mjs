import { createHash } from 'node:crypto';
import { cp } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { NllError } from '../core/errors.mjs';
import { atomicWrite, ensureDirectory, loadModule, readUtf8 } from '../core/io.mjs';
import {
  createTask, loadAgentBuild, writeTaskState
} from '../storage/workspace.mjs';
import { invokeCodexRole } from './codex-adapter.mjs';
import { prepareAgentContext } from './context-bridge.mjs';
import { runIsolatedAnalysis } from './isolated-analysis.mjs';
import { runProcess } from './process.mjs';
import { validateGeneratedModule } from './sandbox.mjs';
import { listGeneratedFiles } from './workspace.mjs';

const ANALYSIS_ROLE = 'nll-analyze-task';

function sourceDigest(text) { return `sha256:${createHash('sha256').update(text).digest('hex')}`; }

async function copyGeneratedArtifacts(generatedRoot, targetRoot) {
  const files = await listGeneratedFiles(generatedRoot);
  for (const file of files) {
    const target = join(targetRoot, file);
    await ensureDirectory(dirname(target));
    await cp(join(generatedRoot, file), target);
  }
  return files;
}

async function runTaskAnalysis({
  dataRoot, agentId, taskId, inputPath, outputPath, target = 'findings', foundation = 'core',
  repositoryRoot, skillsRoot, codexBin = 'codex', nodeBin = process.execPath, env = process.env,
  processRunner = runProcess, contextProvider = null
}) {
  if (!['findings', 'plan'].includes(target)) throw new NllError('invalid-analysis-target', `Unsupported analysis target: ${target}`);
  const pinnedAgent = await loadAgentBuild(dataRoot, agentId);
  if (!pinnedAgent.buildDigest) throw new NllError('agent-build-unidentified', `Agent build ${pinnedAgent.buildId} has no content digest.`);
  const input = await readUtf8(inputPath);
  const digest = sourceDigest(input);
  const task = await createTask(dataRoot, taskId, {
    agent: agentId, build: pinnedAgent.buildId, buildDigest: pinnedAgent.buildDigest,
    sourceDigest: digest, target
  });
  await atomicWrite(join(task.root, 'input.md'), input);
  await prepareAgentContext({
    targetRoot: join(task.root, 'context'), purpose: 'analysis', agentId,
    buildId: pinnedAgent.buildId, repositoryRoot,
    sourceRoot: join(pinnedAgent.root, 'context'), contextProvider
  });

  try {
    const authoring = await invokeCodexRole({
      role: ANALYSIS_ROLE,
      request: Object.freeze({
        taskId, agentId, agentBuild: pinnedAgent.buildId, agentBuildDigest: pinnedAgent.buildDigest,
        sourceDigest: digest, target,
        contract: 'Generate only task-local, source-grounded LongTextJS. Do not emit findings or modify the trained agent.'
      }),
      workspaceRoot: join(task.root, 'codex'), skillsRoot, codexBin, env, processRunner,
      inputs: [
        { source: join(task.root, 'input.md'), target: 'task/input.md' },
        { source: join(task.root, 'context'), target: 'context' },
        { source: pinnedAgent.root, target: 'agent' }
      ]
    });
    const program = authoring.files.find((path) => path === 'program.mjs');
    if (!program) throw new NllError('coding-agent-output-missing', 'nll-analyze-task did not produce generated/program.mjs.');
    await validateGeneratedModule({
      modulePath: join(authoring.generatedRoot, program), workspaceRoot: authoring.generatedRoot,
      repositoryRoot, nodeBin, env, processRunner, kind: 'materializer'
    });
    const generatedRoot = join(task.root, 'generated');
    await ensureDirectory(generatedRoot);
    const generatedFiles = await copyGeneratedArtifacts(authoring.generatedRoot, generatedRoot);
    await runIsolatedAnalysis({
      repositoryRoot, agentRoot: pinnedAgent.root,
      generatedModule: join(generatedRoot, 'program.mjs'), inputPath: join(task.root, 'input.md'),
      outputRoot: task.root, mode: target === 'plan' ? 'plan' : 'run', foundation,
      nodeBin, env, processRunner
    });
    const summary = await loadModule(join(task.root, 'summary.mjs'));
    await writeTaskState(task.root, {
      id: taskId, status: summary.status, agent: agentId, build: pinnedAgent.buildId,
      buildDigest: pinnedAgent.buildDigest, sourceDigest: digest, target
    });
    const report = await readUtf8(join(task.root, 'report.md'));
    if (outputPath) await atomicWrite(outputPath, report);
    return Object.freeze({
      id: taskId, root: task.root, status: summary.status, findings: summary.findingCount,
      agentId, buildId: pinnedAgent.buildId, buildDigest: pinnedAgent.buildDigest,
      outputPath: outputPath || join(task.root, 'report.md'), generatedFiles
    });
  } catch (error) {
    await writeTaskState(task.root, {
      id: taskId, status: 'FAILED', agent: agentId, build: pinnedAgent.buildId,
      buildDigest: pinnedAgent.buildDigest, sourceDigest: digest, target
    });
    throw error;
  }
}

export { ANALYSIS_ROLE, copyGeneratedArtifacts, runTaskAnalysis, sourceDigest };
