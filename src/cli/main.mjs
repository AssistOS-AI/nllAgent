import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NllError, asNllError } from '../core/errors.mjs';
import { resolvePath } from '../core/io.mjs';
import { sortableId } from '../core/ids.mjs';
import { runBenchmark } from '../benchmark/runner.mjs';
import { runLearning } from '../learning/runner.mjs';
import { executeCnlPlanningRun } from '../generation/runner.mjs';
import { ensureLearningWorkspace } from '../learning/workspace.mjs';
import {
  inspectAchillesConfiguration,
  readModelConfiguration,
  resolveAchillesModule
} from '../model/achilles-gateway.mjs';
import { resolveTranslationBackend } from '../model/translation-backends.mjs';
import { publishRelease } from '../release/manager.mjs';
import { createStandardRegistries } from '../runtime/standard-operators.mjs';
import { executeProductionRun } from '../runtime/production-run.mjs';
import { createFeedback, initializeAgent, listAgents, listIssues, loadActiveRelease, loadAgent, loadRelease } from '../storage/agent-store.mjs';
import { parseArguments, requireOption, validateCommandArguments } from './arguments.mjs';
import { HELP } from './help.mjs';

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

function print(stream, value) {
  stream.write(`${typeof value === 'string' ? value : JSON.stringify(value, null, 2)}\n`);
}

function errorExit(error) {
  if (['invalid-arguments', 'invalid-agent-name', 'agent-not-found', 'no-active-release',
    'input-not-found', 'unsupported-format', 'folder-not-found', 'rules-empty',
    'realization-backend-required'].includes(error.code)) return 64;
  if (error.code === 'benchmark-mismatch') return 9;
  if (['publication-failed', 'learning-failed', 'learning-policy-violation'].includes(error.code)) return 10;
  return 70;
}

async function runCli(argv, context) {
  let jsonOutput = false;
  try {
    const { positionals, options } = parseArguments(argv);
    jsonOutput = Boolean(options.json);
    if (options.help || positionals.length === 0) {
      print(context.stdout, HELP.trimEnd());
      return 0;
    }
    validateCommandArguments(positionals, options);
    const dataRoot = resolvePath(context.cwd, options['data-root'] || 'data');
    const requestedBackend = options['no-llm'] ? 'none' : options.translator || 'auto';
    const translationOptions = {
      backend: requestedBackend,
      repoRoot: context.repoRoot || PACKAGE_ROOT,
      env: context.env,
      modulePath: context.env.ACHILLES_AGENT_LIB_PATH || context.env.NLL_ACHILLES_MODULE,
      codexBin: options['codex-bin'] || context.env.NLL_CODEX_BIN || 'codex',
      processRunner: context.processRunner,
      assumeConfigured: context.assumeAchillesConfigured
    };
    let result;
    if (positionals[0] === 'run') {
      result = await executeProductionRun({
        dataRoot, agentName: requireOption(options, 'agent'),
        inputPath: resolvePath(context.cwd, requireOption(options, 'input')),
        outputPath: resolvePath(context.cwd, requireOption(options, 'output')),
        releaseVersion: options.release,
        translation: translationOptions
      });
    } else if (positionals[0] === 'plan') {
      result = await executeCnlPlanningRun({
        dataRoot, agentName: requireOption(options, 'agent'),
        inputPath: resolvePath(context.cwd, requireOption(options, 'input')),
        outputPath: resolvePath(context.cwd, requireOption(options, 'output')),
        realizeOutputPath: options['realize-output']
          ? resolvePath(context.cwd, options['realize-output']) : undefined,
        releaseVersion: options.release,
        maximumRevisions: options['max-revisions'] === undefined ? 2 : Number(options['max-revisions']),
        translation: translationOptions
      });
    } else if (positionals[0] === 'benchmark') {
      const agent = await loadAgent(dataRoot, requireOption(options, 'agent'));
      const release = options.release ? await loadRelease(agent, options.release) : await loadActiveRelease(agent);
      const backend = await resolveTranslationBackend({
        ...translationOptions,
        workspaceRoot: resolve(agent.root, 'temporary', sortableId('benchmark'))
      });
      const registries = createStandardRegistries({ modelGateway: backend.gateway });
      const benchmark = await runBenchmark(agent, release, registries);
      result = { exitCode: benchmark.passed ? 0 : 9, ...benchmark };
    } else if (positionals[0] === 'agent' && positionals[1] === 'init') {
      const created = await initializeAgent(dataRoot, requireOption(options, 'agent'), {
        description: options.description, language: options.language
      });
      await ensureLearningWorkspace(created.root, translationOptions.repoRoot);
      result = { exitCode: 0, agent: created.manifest, root: created.root };
    } else if (positionals[0] === 'agent' && positionals[1] === 'inspect') {
      const agent = await loadAgent(dataRoot, requireOption(options, 'agent'));
      const active = await loadActiveRelease(agent).catch((error) => error.code === 'no-active-release' ? null : Promise.reject(error));
      result = { exitCode: 0, agent: agent.manifest, activeRelease: active?.manifest || null, root: agent.root };
    } else if (positionals[0] === 'agent' && positionals[1] === 'list') {
      result = { exitCode: 0, agents: await listAgents(dataRoot) };
    } else if (positionals[0] === 'issue' && positionals[1] === 'list') {
      const agent = await loadAgent(dataRoot, requireOption(options, 'agent'));
      result = { exitCode: 0, issues: await listIssues(agent, options.status ? [options.status] : undefined) };
    } else if (positionals[0] === 'feedback' && positionals[1] === 'add') {
      const agent = await loadAgent(dataRoot, requireOption(options, 'agent'));
      const feedback = await createFeedback(agent, {
        run: requireOption(options, 'run'), type: requireOption(options, 'type'),
        message: requireOption(options, 'message'), finding: options.finding || null,
        reviewerRole: options.role || 'reviewer'
      });
      result = { exitCode: 0, feedback };
    } else if (positionals[0] === 'release' && positionals[1] === 'publish') {
      const agent = await loadAgent(dataRoot, requireOption(options, 'agent'));
      const backend = await resolveTranslationBackend({
        ...translationOptions,
        workspaceRoot: resolve(agent.root, 'temporary', sortableId('publication'))
      });
      const registries = createStandardRegistries({ modelGateway: backend.gateway });
      const published = await publishRelease(agent, requireOption(options, 'candidate'), registries);
      result = { exitCode: 0, ...published.result, pointer: published.pointer };
    } else if (positionals[0] === 'learn') {
      result = await runLearning({
        repoRoot: translationOptions.repoRoot, dataRoot, agentName: requireOption(options, 'agent'),
        rulesRoot: resolvePath(context.cwd, requireOption(options, 'rules')),
        codexBin: options['codex-bin'] || context.env.NLL_CODEX_BIN || 'codex',
        registries: createStandardRegistries(), env: context.env
      });
    } else if (positionals[0] === 'model' && positionals[1] === 'inspect') {
      const resolution = await resolveAchillesModule({
        baseDir: translationOptions.repoRoot,
        env: context.env,
        modulePath: context.env.ACHILLES_AGENT_LIB_PATH || context.env.NLL_ACHILLES_MODULE
      });
      const configuration = await readModelConfiguration(resolution, {
        baseDir: translationOptions.repoRoot,
        env: context.env
      });
      const inspection = inspectAchillesConfiguration(configuration, {
        env: context.env, available: Boolean(resolution)
      });
      result = {
        exitCode: 0,
        available: Boolean(resolution),
        configured: inspection.configured,
        strategy: resolution?.strategy || null,
        entry: resolution?.entry || resolution?.specifier || null,
        preferredTranslationModel: inspection.translationModel,
        resolvedModel: inspection.resolvedModel,
        provider: inspection.provider,
        requiredEnvironment: inspection.keyEnvironment,
        autoBackend: inspection.configured ? 'achilles' : 'codex',
        reason: inspection.reason
      };
    } else {
      throw new NllError('invalid-arguments', `Unknown command: ${positionals.join(' ')}`);
    }
    if (options.json) print(context.stdout, result);
    else print(context.stdout, humanSummary(positionals, result));
    return result.exitCode ?? 0;
  } catch (caught) {
    const error = asNllError(caught);
    print(context.stderr, jsonOutput ? { error: error.toJSON() } : `nllagent: ${error.message}${error.details?.issue ? ` (issue ${error.details.issue})` : ''}`);
    return errorExit(error);
  }
}

function humanSummary(positionals, result) {
  if (positionals[0] === 'run') return `Run ${result.status}; ${result.findings ?? 0} finding(s). Report: ${result.outputPath}${result.issue ? `; issue: ${result.issue}` : ''}`;
  if (positionals[0] === 'plan') return `CNL planning ${result.status}. Plan: ${result.outputPath}${result.realizationOutputPath ? `; optional realization: ${result.realizationOutputPath}` : ''}${result.issue ? `; issue: ${result.issue}` : ''}`;
  if (positionals[0] === 'benchmark') return `Benchmark ${result.passed ? 'passed' : 'failed'}: ${result.summary.passed}/${result.summary.total}.`;
  if (positionals[0] === 'learn') return `Learning run ${result.status}: ${result.learningRun}.`;
  if (positionals[0] === 'release') return `Published and activated release ${result.release}.`;
  if (positionals[0] === 'model') return result.available
    ? `AchillesAgentLib available via ${result.strategy}; ${result.configured ? 'configured' : `not configured, auto uses ${result.autoBackend}`}.`
    : 'AchillesAgentLib is not available.';
  if (positionals[0] === 'agent') return positionals[1] === 'init' ? `Created agent ${result.agent.name} at ${result.root}.` : JSON.stringify(result, null, 2);
  return JSON.stringify(result, null, 2);
}

export { errorExit, humanSummary, runCli };
