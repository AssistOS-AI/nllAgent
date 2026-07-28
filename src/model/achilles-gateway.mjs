import { readFile, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';
import { digestJson } from '../core/canonical.mjs';
import { NllError } from '../core/errors.mjs';
import { assertJsonSchema } from '../core/json-schema.mjs';
import { translationRequestDigest } from './request-record.mjs';

async function fileMetadata(path) {
  return stat(path).catch(() => null);
}

async function directoryEntry(path) {
  const metadata = await fileMetadata(path);
  if (!metadata) return null;
  if (metadata.isFile()) return path;
  if (!metadata.isDirectory()) return null;
  const packagePath = join(path, 'package.json');
  const packageMetadata = await fileMetadata(packagePath);
  if (packageMetadata?.isFile()) {
    const manifest = JSON.parse(await readFile(packagePath, 'utf8'));
    const entry = resolve(path, manifest.module || manifest.main || 'index.mjs');
    if ((await fileMetadata(entry))?.isFile()) return entry;
  }
  const indexPath = join(path, 'index.mjs');
  return (await fileMetadata(indexPath))?.isFile() ? indexPath : null;
}

async function resolveAchillesModule(options = {}) {
  const baseDir = resolve(options.baseDir || process.cwd());
  const manualPath = options.modulePath || options.env?.ACHILLES_AGENT_LIB_PATH
    || process.env.ACHILLES_AGENT_LIB_PATH;
  if (manualPath) {
    const entry = await directoryEntry(resolve(baseDir, manualPath));
    if (!entry) {
      throw new NllError(
        'achilles-unavailable',
        'ACHILLES_AGENT_LIB_PATH does not identify an AchillesAgentLib module.',
        { path: resolve(baseDir, manualPath) }
      );
    }
    return { strategy: 'manual-override', entry };
  }

  const candidates = [
    resolve(baseDir, '..', 'AchillesAgentLib'),
    resolve(baseDir, '..', 'achillesAgentLib'),
    resolve(baseDir, '..', 'ploinky', 'node_modules', 'achillesAgentLib')
  ];
  for (const candidate of candidates) {
    const entry = await directoryEntry(candidate);
    if (entry) return { strategy: 'parent-directory', entry };
  }

  try {
    import.meta.resolve('ploinky-agent-lib');
    return { strategy: 'installed-package', specifier: 'ploinky-agent-lib' };
  } catch {
    return null;
  }
}

async function importResolution(resolution) {
  if (!resolution) return null;
  if (resolution.entry) return import(pathToFileURL(resolution.entry).href);
  try {
    return await import(resolution.specifier);
  } catch (error) {
    throw new NllError(
      'achilles-unavailable',
      'AchillesAgentLib is unavailable. Place it in the parent development layout or set ACHILLES_AGENT_LIB_PATH.',
      { resolution },
      { cause: error }
    );
  }
}

async function loadAchillesModule(modulePath = undefined, options = {}) {
  const resolution = await resolveAchillesModule({
    baseDir: options.baseDir,
    env: options.env,
    modulePath
  });
  const module = await importResolution(resolution);
  if (!module) {
    throw new NllError(
      'achilles-unavailable',
      'AchillesAgentLib is unavailable. Place it in the parent development layout or set ACHILLES_AGENT_LIB_PATH.'
    );
  }
  return module;
}

async function readModelConfiguration(resolution, options = {}) {
  const configured = options.env?.LLM_MODELS_CONFIG_PATH || process.env.LLM_MODELS_CONFIG_PATH;
  const candidate = configured
    ? resolve(options.baseDir || process.cwd(), configured)
    : resolution?.entry ? join(dirname(resolution.entry), 'LLMConfig.json') : null;
  if (!candidate) return null;
  try {
    return JSON.parse(await readFile(candidate, 'utf8'));
  } catch {
    return null;
  }
}

function modelDescriptor(configuration, modelPreference) {
  const defaults = configuration?.defaults || {};
  const selected = defaults[modelPreference] || modelPreference;
  const models = Array.isArray(configuration?.models) ? configuration.models : [];
  const descriptor = models.find((model) =>
    model?.name === selected
    || `${model?.provider}/${model?.name}` === selected
    || model?.id === selected) || null;
  const provider = descriptor?.provider || (String(selected).includes('/') ? String(selected).split('/')[0] : null);
  return { descriptor, provider, selected };
}

function inspectAchillesConfiguration(configuration, options = {}) {
  const env = options.env || process.env;
  const translationModel = options.translationModel || chooseTranslationModel(configuration);
  const selected = modelDescriptor(configuration, translationModel);
  const provider = selected.provider ? configuration?.providers?.[selected.provider] : null;
  const keyEnvironment = selected.descriptor?.apiKeyEnv || provider?.apiKeyEnv || null;
  const configured = options.available !== false && (
    options.assumeConfigured === true
    || env.NLL_ACHILLES_ASSUME_CONFIGURED === '1'
    || Boolean((keyEnvironment && env[keyEnvironment]) || env.LLM_API_KEY)
  );
  return {
    configured,
    translationModel,
    resolvedModel: selected.selected,
    provider: selected.provider,
    keyEnvironment,
    reason: options.available === false
      ? 'AchillesAgentLib is not available; auto uses the configured Coding Agent adapter.'
      : configured
      ? 'The selected Achilles provider has usable runtime configuration.'
      : keyEnvironment
        ? `The selected Achilles provider requires ${keyEnvironment}.`
        : 'The selected Achilles model is not linked to a configured provider.'
  };
}

function chooseTranslationModel(configuration) {
  const defaults = configuration?.defaults || {};
  if (typeof defaults.spark === 'string' && defaults.spark) return defaults.spark;
  const models = Array.isArray(configuration?.models) ? configuration.models : [];
  const spark = models.find((model) =>
    /spark/iu.test(String(model?.name || ''))
    || (Array.isArray(model?.tags) && model.tags.some((tag) => String(tag).toLowerCase() === 'spark')));
  if (spark?.provider && spark?.name) return `${spark.provider}/${spark.name}`;
  if (spark?.name) return spark.name;
  return 'fast';
}

async function createAchillesGateway(options = {}) {
  if (options.agent) return gatewayForAgent(options.agent, options.profile || {});
  const resolution = await resolveAchillesModule({
    baseDir: options.baseDir,
    env: options.env,
    modulePath: options.modulePath
  });
  const module = await importResolution(resolution);
  if (!module || typeof module.LLMAgent !== 'function') {
    throw new NllError('achilles-invalid', 'AchillesAgentLib does not export LLMAgent.');
  }
  const configuration = await readModelConfiguration(resolution, options);
  const translationModel = options.profile?.translationModel
    || chooseTranslationModel(configuration);
  const inspection = inspectAchillesConfiguration(configuration, {
    env: options.env,
    translationModel,
    assumeConfigured: options.assumeConfigured
  });
  if (!inspection.configured) {
    throw new NllError('achilles-unconfigured', 'AchillesAgentLib is installed but its selected provider is not configured.', inspection);
  }
  const agent = new module.LLMAgent({
    name: options.name || 'NaturalLanguageLinterAgent',
    ...(options.profile?.modelConfig ? { modelConfig: options.profile.modelConfig } : {}),
    ...(options.profile?.reasoningEffort ? { reasoningEffort: options.profile.reasoningEffort } : {}),
    ...(options.invokerStrategy ? { invokerStrategy: options.invokerStrategy } : {})
  });
  return gatewayForAgent(agent, {
    id: 'achilles-parent-llm-agent@1',
    ...options.profile,
    translationModel,
    resolution: resolution?.strategy || 'unknown',
    configuration: inspection
  });
}

async function tryCreateAchillesGateway(options = {}) {
  try {
    return await createAchillesGateway(options);
  } catch (error) {
    if (['achilles-unavailable', 'achilles-unconfigured'].includes(error?.code)) return null;
    throw error;
  }
}

function gatewayForAgent(agent, profile) {
  if (!agent || typeof agent.executePrompt !== 'function') {
    throw new NllError('achilles-invalid', 'Achilles LLMAgent must expose executePrompt().');
  }
  return Object.freeze({
    id: profile.id || 'achilles-gateway@1',
    modelPreference: profile.translationModel || 'fast',
    resolution: profile.resolution || 'injected',
    configuration: profile.configuration || { configured: true, reason: 'Injected LLMAgent.' },
    async invoke(request) {
      if (!request?.prompt || typeof request.prompt !== 'string') {
        throw new NllError('invalid-model-request', 'Model request requires a prompt.');
      }
      const started = performance.now();
      const rolePrefersSpark = ['extraction', 'translation', 'evaluation', 'testing', 'judgment', 'realization', 'revision']
        .includes(request.taskRole);
      const requestedModel = request.model || request.tier
        || (rolePrefersSpark ? profile.translationModel : null)
        || profile.model || 'fast';
      const tags = [...new Set([
        request.taskRole,
        ...(rolePrefersSpark ? ['spark'] : []),
        ...(request.tags || profile.tags || [])
      ].filter(Boolean))];
      const result = await agent.executePrompt(request.prompt, {
        model: requestedModel,
        tags,
        responseShape: request.responseShape || 'json',
        ...(request.outputSchema ? { outputSchema: request.outputSchema } : {}),
        ...(request.signal ? { signal: request.signal } : {})
      });
      if (request.outputSchema) assertJsonSchema(result, request.outputSchema, {
        code: 'invalid-model-output',
        message: 'Achilles LLMAgent output failed the requested schema.'
      });
      const resolvedModel = agent._callLog?.at(-1)?.model || requestedModel;
      return {
        result,
        capture: {
          gateway: profile.id || 'achilles-gateway@1',
          gatewayResolution: profile.resolution || 'injected',
          taskRole: request.taskRole || null,
          templateId: request.templateId || null,
          requestDigest: translationRequestDigest(request),
          responseDigest: digestJson(result),
          requestedModel,
          model: resolvedModel,
          tags,
          latencyMs: Math.round((performance.now() - started) * 1000) / 1000,
          retries: 0,
          rawResponse: result
        }
      };
    }
  });
}

function createReplayGateway(captures) {
  const index = new Map(captures.map((capture) => [capture.requestDigest, capture]));
  return Object.freeze({
    id: 'replay-model-gateway@1',
    async invoke(request) {
      const requestDigest = translationRequestDigest(request);
      const capture = index.get(requestDigest);
      if (!capture) {
        throw new NllError(
          'replay-capture-missing',
          'No accepted model capture matches this request.',
          { requestDigest }
        );
      }
      return { result: capture.rawResponse, capture: { ...capture, replayed: true } };
    }
  });
}

export {
  chooseTranslationModel,
  createAchillesGateway,
  createReplayGateway,
  gatewayForAgent,
  inspectAchillesConfiguration,
  loadAchillesModule,
  readModelConfiguration,
  resolveAchillesModule,
  tryCreateAchillesGateway
};
