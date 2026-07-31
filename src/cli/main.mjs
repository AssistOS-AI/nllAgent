import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as vocabulary from '../../ontologies/core/index.mjs';
import { field, WorkspaceEvent, workspaceEvent } from '../artifacts/workspace-event.mjs';
import { runBenchmark } from '../benchmark/runner.mjs';
import { runTaskAnalysis } from '../coding-agent/index.mjs';
import { quote } from '../core/canonical-source.mjs';
import { asNllError } from '../core/errors.mjs';
import { loadModule, resolvePath } from '../core/io.mjs';
import { analyzeProject } from '../runtime/agent-runner.mjs';
import {
  createWorkspaceEvent, listAgents, listModules, listTasks, loadAgent, loadAgentBuild, loadTask,
  relativeSpecifier
} from '../storage/workspace.mjs';
import { runTraining } from '../training/index.mjs';
import { parseArguments, requireOption, validateCommandArguments } from './arguments.mjs';
import { HELP } from './help.mjs';

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SKILLS_ROOT = join(REPOSITORY_ROOT, '.agents', 'skills');

function print(stream, value) { stream.write(`${value}\n`); }

function exitFor(error) {
  if ([
    'invalid-arguments', 'invalid-agent-name', 'invalid-workspace-id', 'agent-not-trained',
    'agent-build-not-found', 'module-not-found', 'folder-not-found', 'input-not-found',
    'module-extension-required', 'task-already-exists'
  ].includes(error.code)) return 64;
  if (error.code === 'benchmark-mismatch') return 9;
  if (error.code.startsWith('training-') || error.code.startsWith('coding-agent-') || error.code === 'review-empty-output') return 10;
  return 70;
}

async function listWorkspaceEvents(agent, family, status) {
  const modules = await listModules(join(agent.agentRoot, family));
  const events = [];
  for (const path of modules) {
    const loaded = await loadModule(path).catch(() => null);
    if (loaded?.default instanceof WorkspaceEvent && (!status || loaded.default.get('status') === status)) events.push(loaded.default);
  }
  return events;
}

async function runCli(argv, context) {
  try {
    const { positionals, options } = parseArguments(argv);
    if (options.help || !positionals.length) { print(context.stdout, HELP.trimEnd()); return 0; }
    validateCommandArguments(positionals, options);
    const dataRoot = resolvePath(context.cwd, options['data-root'] || 'data');
    const environment = context.env ?? process.env;
    const codexBin = options['codex-bin'] || environment.NLL_CODEX_BIN || 'codex';
    const foundation = options.foundation || 'core';
    let summary;
    let exitCode = 0;

    if (positionals[0] === 'train') {
      const theory = requireOption(options, 'theory').map((path) => resolvePath(context.cwd, path));
      const result = await runTraining({
        dataRoot, agentId: requireOption(options, 'agent'), theoryPaths: theory,
        repositoryRoot: REPOSITORY_ROOT, skillsRoot: SKILLS_ROOT, codexBin,
        env: environment, processRunner: context.processRunner, contextProvider: context.contextProvider
      });
      summary = `Promoted ${result.agentId}@${result.buildId} after tests, benchmarks, and independent review.`;
    } else if (positionals[0] === 'analyze') {
      const result = await runTaskAnalysis({
        dataRoot, agentId: requireOption(options, 'agent'), taskId: requireOption(options, 'task'),
        inputPath: resolvePath(context.cwd, requireOption(options, 'input')),
        outputPath: options.output ? resolvePath(context.cwd, options.output) : null,
        target: options.target || 'findings', foundation, repositoryRoot: REPOSITORY_ROOT,
        skillsRoot: SKILLS_ROOT, codexBin, env: environment,
        processRunner: context.processRunner, contextProvider: context.contextProvider
      });
      summary = `Task ${result.id} used ${result.agentId}@${result.buildId}; status ${result.status}; report: ${result.outputPath}`;
      if (result.status.startsWith('blocked')) exitCode = 3;
    } else if (positionals[0] === 'benchmark') {
      const agent = await loadAgent(dataRoot, requireOption(options, 'agent'));
      const benchmark = await runBenchmark(
        agent,
        (text, id) => analyzeProject(agent.project, text, id, { foundation }),
        vocabulary
      );
      summary = `Benchmark ${benchmark.passed ? 'passed' : 'failed'} for ${agent.name}@${agent.buildId}: ${benchmark.passedCount}/${benchmark.total}.`;
      exitCode = benchmark.passed ? 0 : 9;
    } else if (positionals[0] === 'agent' && positionals[1] === 'list') {
      const agents = await listAgents(dataRoot);
      summary = agents.length ? agents.join('\n') : 'No trained agents found.';
    } else if (positionals[0] === 'agent' && positionals[1] === 'inspect') {
      const agent = await loadAgentBuild(dataRoot, requireOption(options, 'agent'), options.build || null);
      summary = [
        `${agent.name}@${agent.buildId}`, `Digest: ${agent.buildDigest}`, agent.project.description,
        `Ontology: ${agent.project.ontology?.id || 'not configured'}`,
        `Circuits: ${agent.project.circuits.length}`, `Planning circuits: ${agent.project.planningCircuits.length}`
      ].join('\n');
    } else if (positionals[0] === 'task' && positionals[1] === 'list') {
      const tasks = await listTasks(dataRoot);
      summary = tasks.length ? tasks.join('\n') : 'No tasks found.';
    } else if (positionals[0] === 'task' && positionals[1] === 'inspect') {
      const task = await loadTask(dataRoot, requireOption(options, 'task'));
      summary = [
        `${task.taskId}: ${task.status}`, `Agent: ${task.agentId}@${task.agentBuild}`,
        `Build digest: ${task.agentBuildDigest}`, `Source digest: ${task.sourceDigest}`, `Target: ${task.target}`
      ].join('\n');
    } else if (positionals[0] === 'issue' && positionals[1] === 'list') {
      const agent = await loadAgent(dataRoot, requireOption(options, 'agent'));
      const events = await listWorkspaceEvents(agent, 'issues', options.status);
      summary = events.length ? events.map((event) => `${event.id}: ${event.get('type')} (${event.get('status')})`).join('\n') : 'No issues found.';
    } else if (positionals[0] === 'feedback' && positionals[1] === 'add') {
      const agent = await loadAgent(dataRoot, requireOption(options, 'agent'));
      const api = relativeSpecifier(join(agent.agentRoot, 'feedback'), join(REPOSITORY_ROOT, 'src', 'artifacts', 'workspace-event.mjs'));
      const event = await createWorkspaceEvent(agent, 'feedback', (id) => [
        `import { field, workspaceEvent } from ${quote(api)};`,
        `export default workspaceEvent('feedback',${quote(id)},`,
        `  field('run',${quote(requireOption(options, 'run'))}),`,
        `  field('type',${quote(requireOption(options, 'type'))}),`,
        `  field('message',${quote(requireOption(options, 'message'))}),`,
        `  field('finding',${quote(options.finding || '')}),`,
        `  field('role',${quote(options.role || 'reviewer')})`, ');', ''
      ].join('\n'));
      summary = `Recorded feedback ${event.id}.`;
    }
    print(context.stdout, summary);
    return exitCode;
  } catch (caught) {
    const error = asNllError(caught);
    print(context.stderr, `nllagent: ${error.message}`);
    return exitFor(error);
  }
}

export { REPOSITORY_ROOT, SKILLS_ROOT, exitFor, runCli };
