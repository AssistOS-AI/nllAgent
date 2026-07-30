import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as vocabulary from '../../ontologies/core/index.mjs';
import { renderLongTextModule, renderResultModule, renderTraceModule } from '../artifacts/source-printer.mjs';
import { field, WorkspaceEvent, workspaceEvent } from '../artifacts/workspace-event.mjs';
import { runBenchmark } from '../benchmark/runner.mjs';
import { quote } from '../core/canonical-source.mjs';
import { asNllError, NllError } from '../core/errors.mjs';
import { sortableId } from '../core/ids.mjs';
import { atomicWrite, ensureDirectory, loadModule, readUtf8, resolvePath } from '../core/io.mjs';
import { runLearning } from '../learning/runner.mjs';
import { renderReport } from '../report/markdown-renderer.mjs';
import { analyzeProject, planProject } from '../runtime/agent-runner.mjs';
import { createWorkspaceEvent, initializeAgent, listAgents, listModules, loadAgent, relativeSpecifier } from '../storage/workspace.mjs';
import { parseArguments, requireOption, validateCommandArguments } from './arguments.mjs';
import { HELP } from './help.mjs';

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

function print(stream, value) { stream.write(`${value}\n`); }

function exitFor(error) {
  if (['invalid-arguments', 'invalid-agent-name', 'agent-not-found', 'module-not-found', 'folder-not-found',
    'module-extension-required', 'realization-backend-required'].includes(error.code)) return 64;
  if (error.code === 'benchmark-mismatch') return 9;
  if (error.code === 'learning-failed') return 10;
  return 70;
}

function persistenceOptions(moduleDirectory, agent, longTextModule = null) {
  return {
    moduleDirectory,
    longTextApi: join(REPOSITORY_ROOT, 'src', 'longtext', 'api.mjs'),
    ontologyApi: join(REPOSITORY_ROOT, 'src', 'ontology', 'api.mjs'),
    artifactsApi: join(REPOSITORY_ROOT, 'src', 'artifacts', 'api.mjs'),
    traceApi: join(REPOSITORY_ROOT, 'src', 'runtime', 'trace.mjs'),
    cnlApi: join(REPOSITORY_ROOT, 'src', 'generation', 'cnl.mjs'),
    ontologyModule: join(agent.root, 'ontologies', 'index.mjs'),
    longTextModule
  };
}

async function persistAnalysis(agent, analysis, family, id, report, outputPath) {
  const root = join(agent.root, family, id);
  const longTextDirectory = join(root, 'longtext');
  const traceDirectory = join(root, 'trace');
  await ensureDirectory(longTextDirectory);
  await ensureDirectory(traceDirectory);
  const longTextPath = join(longTextDirectory, 'program.mjs');
  const tracePath = join(traceDirectory, 'run.trace.mjs');
  const resultPath = join(root, 'result.mjs');
  await atomicWrite(join(root, 'input.md'), analysis.source.text);
  await atomicWrite(longTextPath, renderLongTextModule(
    analysis.program,
    persistenceOptions(longTextDirectory, agent)
  ));
  await atomicWrite(tracePath, renderTraceModule(
    analysis.trace,
    persistenceOptions(traceDirectory, agent)
  ));
  await atomicWrite(resultPath, renderResultModule(
    id,
    analysis.status,
    analysis.findings ?? (analysis.frame ? [analysis.frame] : []),
    {
      ...persistenceOptions(root, agent, longTextPath),
      sourceId: analysis.source.id
    }
  ));
  await atomicWrite(join(root, family === 'runs' ? 'report.md' : 'plan.cnl.md'), report);
  await atomicWrite(outputPath, report);
  return root;
}

async function executeRun(agent, inputPath, outputPath, foundation) {
  const text = await readUtf8(inputPath);
  const id = sortableId('run');
  const analysis = await analyzeProject(agent.project, text, inputPath, { foundation });
  const report = renderReport({
    agent: agent.project.id,
    run: id,
    status: analysis.status,
    source: analysis.source,
    findings: analysis.findings,
    foundation,
    vocabulary,
    limitations: analysis.store.gaps.map((gap) => gap.gapKind)
  });
  const root = await persistAnalysis(agent, analysis, 'runs', id, report, outputPath);
  return Object.freeze({ id, root, status: analysis.status, findings: analysis.findings.length, outputPath });
}

async function executePlan(agent, inputPath, outputPath, foundation, realizeOutputPath) {
  const text = await readUtf8(inputPath);
  const id = sortableId('plan');
  const analysis = await planProject(agent.project, text, inputPath, { foundation });
  const report = analysis.document?.content || `# Planning blocked\n\nStatus: ${analysis.status}\n`;
  const root = await persistAnalysis(agent, analysis, 'planning-runs', id, report, outputPath);
  let realizationOutputPath = null;
  if (realizeOutputPath) {
    const writer = agent.project.models.get('writer');
    if (!writer) throw new NllError('realization-backend-required', 'This agent does not configure a writer model.');
    const draft = await writer(Object.freeze({ plan: analysis.frame, text: report }));
    const content = typeof draft === 'string' ? draft : draft.content;
    await atomicWrite(realizeOutputPath, content);
    await atomicWrite(join(root, 'realization.md'), content);
    realizationOutputPath = realizeOutputPath;
  }
  return Object.freeze({ id, root, status: analysis.status, outputPath, realizationOutputPath });
}

async function listWorkspaceEvents(agent, family, status) {
  const modules = await listModules(join(agent.root, family));
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
    const foundation = options.foundation || 'core';
    let summary;
    let exitCode = 0;
    if (positionals[0] === 'run') {
      const agent = await loadAgent(dataRoot, requireOption(options, 'agent'));
      const result = await executeRun(agent, resolvePath(context.cwd, requireOption(options, 'input')), resolvePath(context.cwd, requireOption(options, 'output')), foundation);
      summary = `Run ${result.status}; ${result.findings} finding(s). Report: ${result.outputPath}`;
    } else if (positionals[0] === 'plan') {
      const agent = await loadAgent(dataRoot, requireOption(options, 'agent'));
      const result = await executePlan(
        agent,
        resolvePath(context.cwd, requireOption(options, 'input')),
        resolvePath(context.cwd, requireOption(options, 'output')),
        foundation,
        options['realize-output'] ? resolvePath(context.cwd, options['realize-output']) : null
      );
      summary = `Planning ${result.status}. Plan: ${result.outputPath}${result.realizationOutputPath ? `; realization: ${result.realizationOutputPath}` : ''}`;
      if (result.status !== 'planned') exitCode = 3;
    } else if (positionals[0] === 'benchmark') {
      const agent = await loadAgent(dataRoot, requireOption(options, 'agent'));
      const benchmark = await runBenchmark(
        agent,
        (text, id) => analyzeProject(agent.project, text, id, { foundation }),
        vocabulary
      );
      summary = `Benchmark ${benchmark.passed ? 'passed' : 'failed'}: ${benchmark.passedCount}/${benchmark.total}.`;
      exitCode = benchmark.passed ? 0 : 9;
    } else if (positionals[0] === 'agent' && positionals[1] === 'init') {
      const created = await initializeAgent(dataRoot, requireOption(options, 'agent'), {
        description: options.description,
        agentApi: join(REPOSITORY_ROOT, 'src', 'agent', 'api.mjs'),
        ontologyApi: join(REPOSITORY_ROOT, 'src', 'ontology', 'api.mjs')
      });
      summary = `Created agent ${created.name} at ${created.root}.`;
    } else if (positionals[0] === 'agent' && positionals[1] === 'list') {
      const agents = await listAgents(dataRoot);
      summary = agents.length ? agents.join('\n') : 'No agents found.';
    } else if (positionals[0] === 'agent' && positionals[1] === 'inspect') {
      const agent = await loadAgent(dataRoot, requireOption(options, 'agent'));
      summary = `${agent.project.id}\n${agent.project.description}\nOntology: ${agent.project.ontology?.id || 'not configured'}\nCircuits: ${agent.project.circuits.length}\nPlanning circuits: ${agent.project.planningCircuits.length}`;
    } else if (positionals[0] === 'issue' && positionals[1] === 'list') {
      const agent = await loadAgent(dataRoot, requireOption(options, 'agent'));
      const events = await listWorkspaceEvents(agent, 'issues', options.status);
      summary = events.length ? events.map((event) => `${event.id}: ${event.get('type')} (${event.get('status')})`).join('\n') : 'No issues found.';
    } else if (positionals[0] === 'feedback' && positionals[1] === 'add') {
      const agent = await loadAgent(dataRoot, requireOption(options, 'agent'));
      const api = relativeSpecifier(join(agent.root, 'feedback'), join(REPOSITORY_ROOT, 'src', 'artifacts', 'workspace-event.mjs'));
      const event = await createWorkspaceEvent(agent, 'feedback', (id) => [
        `import { field, workspaceEvent } from ${quote(api)};`,
        `export default workspaceEvent('feedback',${quote(id)},`,
        `  field('run',${quote(requireOption(options, 'run'))}),`,
        `  field('type',${quote(requireOption(options, 'type'))}),`,
        `  field('message',${quote(requireOption(options, 'message'))}),`,
        `  field('finding',${quote(options.finding || '')}),`,
        `  field('role',${quote(options.role || 'reviewer')})`,
        ');',
        ''
      ].join('\n'));
      summary = `Recorded feedback ${event.id}.`;
    } else if (positionals[0] === 'learn') {
      const agent = await loadAgent(dataRoot, requireOption(options, 'agent'));
      const result = await runLearning({
        agent,
        rulesRoot: resolvePath(context.cwd, requireOption(options, 'rules')),
        codexBin: options['codex-bin'] || context.env.NLL_CODEX_BIN || 'codex',
        env: context.env,
        processRunner: context.processRunner
      });
      summary = `Learning ${result.status}: ${result.id}.`;
    } else if (positionals[0] === 'model' && positionals[1] === 'inspect') {
      const location = context.env.ACHILLES_AGENT_LIB_PATH || context.env.NLL_ACHILLES_MODULE;
      summary = location ? `AchillesAgentLib override: ${location}` : 'No global model backend configured; agents may inject named model operations.';
    }
    print(context.stdout, summary);
    return exitCode;
  } catch (caught) {
    const error = asNllError(caught);
    print(context.stderr, `nllagent: ${error.message}`);
    return exitFor(error);
  }
}

export { executePlan, executeRun, exitFor, persistAnalysis, runCli };
