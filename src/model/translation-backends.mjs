import { resolve } from 'node:path';
import { NllError } from '../core/errors.mjs';
import { createAchillesGateway, tryCreateAchillesGateway } from './achilles-gateway.mjs';
import { createCodexTranslationGateway } from './codex-translation-backend.mjs';

const BACKENDS = new Set(['auto', 'achilles', 'codex', 'none']);

async function resolveTranslationBackend(options = {}) {
  const backend = options.backend || 'auto';
  if (!BACKENDS.has(backend)) {
    throw new NllError('invalid-translation-backend', `Unknown translation backend ${backend}.`, { backend });
  }
  if (backend === 'none') return { kind: 'none', gateway: null };
  if (backend === 'achilles') {
    return {
      kind: 'achilles',
      gateway: await createAchillesGateway({
        baseDir: options.repoRoot,
        env: options.env,
        modulePath: options.modulePath,
        profile: options.profile,
        assumeConfigured: options.assumeConfigured
      })
    };
  }
  if (backend === 'auto') {
    const gateway = await tryCreateAchillesGateway({
      baseDir: options.repoRoot,
      env: options.env,
      modulePath: options.modulePath,
      profile: options.profile,
      assumeConfigured: options.assumeConfigured
    });
    if (gateway) return { kind: 'achilles', gateway };
  }
  const gateway = await createCodexTranslationGateway({
    workspaceRoot: options.workspaceRoot,
    skillSource: options.skillSource || resolve(options.repoRoot, '.agents', 'skills', 'nll-translate-longtext'),
    realizationSkillSource: options.realizationSkillSource
      || resolve(options.repoRoot, '.agents', 'skills', 'nll-realize-cnl'),
    codexBin: options.codexBin,
    env: options.env,
    processRunner: options.processRunner,
    timeoutMs: options.timeoutMs
  });
  return { kind: 'codex', gateway };
}

export { BACKENDS, resolveTranslationBackend };
