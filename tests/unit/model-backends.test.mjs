import assert from 'node:assert/strict';
import { lstat, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { writeJson } from '../../src/core/io.mjs';
import {
  chooseTranslationModel,
  createReplayGateway,
  gatewayForAgent,
  inspectAchillesConfiguration
} from '../../src/model/achilles-gateway.mjs';
import { createCodexTranslationGateway } from '../../src/model/codex-translation-backend.mjs';

test('Spark is preferred for translation and routed through LLMAgent.executePrompt', async () => {
  const configuration = {
    defaults: { fast: 'gateway/fast', spark: 'openai_responses/gpt-5.3-codex-spark' },
    providers: { openai_responses: { apiKeyEnv: 'OPENAI_API_KEY' } },
    models: []
  };
  assert.equal(chooseTranslationModel(configuration), 'openai_responses/gpt-5.3-codex-spark');
  const inspection = inspectAchillesConfiguration(configuration, { env: { OPENAI_API_KEY: 'configured-for-test' } });
  assert.equal(inspection.configured, true);
  assert.equal(inspection.provider, 'openai_responses');
  const calls = [];
  const llmAgent = {
    async executePrompt(prompt, options) {
      calls.push({ prompt, options });
      return { observations: [] };
    }
  };
  const gateway = gatewayForAgent(llmAgent, { translationModel: inspection.translationModel });
  await gateway.invoke({ prompt: 'translate', taskRole: 'translation', tags: ['testing'] });
  assert.equal(calls[0].options.model, 'openai_responses/gpt-5.3-codex-spark');
  assert.deepEqual(calls[0].options.tags, ['translation', 'spark', 'testing']);
});

test('Achilles inspection cannot select an unavailable module through a generic API key', () => {
  const inspection = inspectAchillesConfiguration(null, {
    available: false, env: { LLM_API_KEY: 'present-but-no-module' }
  });
  assert.equal(inspection.configured, false);
  assert.match(inspection.reason, /not available/u);
});

test('Codex translation backend creates an isolated call workspace and returns schema JSON', async () => {
  const root = await mkdtemp(join(tmpdir(), 'nllagent-codex-translation-'));
  let invocation;
  const gateway = await createCodexTranslationGateway({
    workspaceRoot: root,
    skillSource: resolve('.agents/skills/nll-translate-longtext'),
    codexBin: '/fake/codex',
    env: {},
    processRunner: async (command, args, options) => {
      invocation = { command, args, options };
      await writeJson(args[args.indexOf('-o') + 1], { observations: [] });
      return { code: 0, signal: null, stdout: '{"type":"result"}\n', stderr: '' };
    }
  });
  const response = await gateway.invoke({
    prompt: 'SOURCE:\nText curat.',
    taskRole: 'extraction',
    outputSchema: { type: 'object', properties: { observations: { type: 'array' } }, required: ['observations'] }
  });
  assert.deepEqual(response.result, { observations: [] });
  assert.equal(invocation.command, '/fake/codex');
  assert.equal(invocation.args[0], 'exec');
  assert.equal(invocation.options.cwd, join(root, 'call-0001'));
  assert.equal((await lstat(join(root, 'call-0001', '.agents', 'skills', 'nll-translate-longtext'))).isSymbolicLink(), true);
  assert.equal(response.capture.gateway, 'codex-translation-backend@1');
});

test('Codex runtime backend selects the optional CNL realization skill', async () => {
  const root = await mkdtemp(join(tmpdir(), 'nllagent-codex-realization-'));
  const gateway = await createCodexTranslationGateway({
    workspaceRoot: root,
    skillSource: resolve('.agents/skills/nll-translate-longtext'),
    realizationSkillSource: resolve('.agents/skills/nll-realize-cnl'),
    processRunner: async (command, args) => {
      await writeJson(args[args.indexOf('-o') + 1], { document: 'Text generat.' });
      return { code: 0, signal: null, stdout: '', stderr: '' };
    }
  });
  await gateway.invoke({
    prompt: 'CNL plan', taskRole: 'realization',
    outputSchema: { type: 'object', properties: { document: { type: 'string' } }, required: ['document'] }
  });
  assert.equal((await lstat(join(root, 'call-0001', '.agents', 'skills', 'nll-realize-cnl'))).isSymbolicLink(), true);
  await assert.rejects(lstat(join(root, 'call-0001', '.agents', 'skills', 'nll-translate-longtext')));
});

test('accepted model captures replay the same semantic request independently of resolved routing', async () => {
  const llmAgent = {
    _callLog: [],
    async executePrompt(prompt, options) {
      this._callLog.push({ model: `resolved:${options.model}` });
      return { observations: [{ quote: prompt }] };
    }
  };
  const request = {
    prompt: 'translate this fragment',
    taskRole: 'translation',
    tags: ['testing'],
    responseShape: 'json',
    outputSchema: { type: 'object', required: ['observations'] }
  };
  const gateway = gatewayForAgent(llmAgent, { translationModel: 'spark-model' });
  const accepted = await gateway.invoke(request);
  const replay = createReplayGateway([accepted.capture]);
  const repeated = await replay.invoke(request);
  assert.deepEqual(repeated.result, accepted.result);
  assert.equal(repeated.capture.replayed, true);
});
