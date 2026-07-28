import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { digestJson } from '../../src/core/canonical.mjs';
import { executeCnlPlanningRun } from '../../src/generation/runner.mjs';

const ideaPath = resolve('data/editorial-demo/examples/planning/idea.md');

async function workspace(prefix) {
  const root = await mkdtemp(join(tmpdir(), prefix));
  const dataRoot = join(root, 'data');
  await cp(resolve('data/editorial-demo'), join(dataRoot, 'editorial-demo'), { recursive: true });
  return { root, dataRoot };
}

function gatewayReturning(documents) {
  const calls = [];
  return {
    calls,
    gateway: {
      id: 'test-realization-gateway@1',
      async invoke(request) {
        calls.push(request);
        const document = documents[Math.min(calls.length - 1, documents.length - 1)];
        return {
          result: { document },
          capture: {
            gateway: this.id, taskRole: request.taskRole,
            requestDigest: digestJson(request), responseDigest: digestJson({ document }),
            rawResponse: { document }
          }
        };
      }
    }
  };
}

test('planning produces a useful CNL artifact without invoking any text-generation model', async () => {
  const { root, dataRoot } = await workspace('nllagent-planning-');
  const outputPath = join(root, 'plan.cnl.md');
  const result = await executeCnlPlanningRun({
    dataRoot, agentName: 'editorial-demo', releaseVersion: '0.1.0',
    inputPath: ideaPath, outputPath,
    translation: { backend: 'none', repoRoot: resolve('.') }
  });
  assert.equal(result.status, 'planned');
  assert.equal(result.realization, null);
  const plan = await readFile(outputPath, 'utf8');
  assert.match(plan, /Alice returning to an empty railway station/u);
  assert.match(plan, /## Content sequence/u);
  assert.match(plan, /editorial\.scene-cnl-plan@0\.1\.0/u);
  assert.match(plan, /ED-001: realizationGuidance:3, realizationGuidance:5/u);
  assert.doesNotMatch(plan, /CNLConstraint|MUST-NOT|modality/u);
  const runRoot = join(dataRoot, 'editorial-demo', 'planning-runs', result.planningRun);
  assert.ok((await stat(join(runRoot, 'cnl-plan.json'))).isFile());
  assert.ok((await stat(join(runRoot, 'planning-trace.json'))).isFile());
});

test('optional realization uses the CNL plan and validation circuits for bounded repair', async () => {
  const { root, dataRoot } = await workspace('nllagent-realization-');
  const outputPath = join(root, 'plan.cnl.md');
  const realizationOutputPath = join(root, 'draft.md');
  const model = gatewayReturning([
    'In fact, the station seemed perhaps empty, perhaps forgotten, perhaps extinguished.',
    'The station remained empty in the evening light. Alice listened to her footsteps echo.\n\n— The final train has left, said the attendant.'
  ]);
  const result = await executeCnlPlanningRun({
    dataRoot, agentName: 'editorial-demo', releaseVersion: '0.1.0', inputPath: ideaPath,
    outputPath, realizeOutputPath: realizationOutputPath, maximumRevisions: 2,
    modelGateway: model.gateway
  });
  assert.equal(result.status, 'realized');
  assert.equal(result.attempts, 2);
  assert.equal(result.findings, 0);
  assert.deepEqual(model.calls.map((call) => call.taskRole), ['realization', 'revision']);
  assert.match(model.calls[0].prompt, /CNL GENERATION PLAN/u);
  assert.doesNotMatch(await readFile(realizationOutputPath, 'utf8'), /In fact/iu);
  const runRoot = join(dataRoot, 'editorial-demo', 'planning-runs', result.planningRun);
  assert.ok((await stat(join(runRoot, 'realization', 'attempts', 'attempt-01', 'validation', 'findings.json'))).isFile());
});

test('optional realization exits 2 and preserves the final candidate after its revision budget', async () => {
  const { root, dataRoot } = await workspace('nllagent-realization-exhausted-');
  const model = gatewayReturning(['In fact, the platform seemed perhaps empty, perhaps cold, perhaps forgotten.']);
  const result = await executeCnlPlanningRun({
    dataRoot, agentName: 'editorial-demo', releaseVersion: '0.1.0', inputPath: ideaPath,
    outputPath: join(root, 'plan.cnl.md'), realizeOutputPath: join(root, 'draft.md'),
    maximumRevisions: 0, modelGateway: model.gateway
  });
  assert.equal(result.exitCode, 2);
  assert.equal(result.status, 'realization-with-findings');
  assert.equal(result.attempts, 1);
  assert.equal(result.findings, 2);
  assert.ok(result.issue);
});

test('optional realization preserves a validation stopped state', async () => {
  const { root, dataRoot } = await workspace('nllagent-realization-stopped-');
  const model = gatewayReturning(['Text\u0000invalid.']);
  const result = await executeCnlPlanningRun({
    dataRoot, agentName: 'editorial-demo', releaseVersion: '0.1.0', inputPath: ideaPath,
    outputPath: join(root, 'plan.cnl.md'), realizeOutputPath: join(root, 'draft.md'),
    maximumRevisions: 2, modelGateway: model.gateway
  });
  assert.equal(result.exitCode, 3);
  assert.equal(result.status, 'stopped-incompatible');
  assert.equal(result.attempts, 1);
});

test('only optional realization requires a model backend', async () => {
  const { root, dataRoot } = await workspace('nllagent-realization-no-backend-');
  await assert.rejects(() => executeCnlPlanningRun({
    dataRoot, agentName: 'editorial-demo', releaseVersion: '0.1.0', inputPath: ideaPath,
    outputPath: join(root, 'plan.cnl.md'), realizeOutputPath: join(root, 'draft.md'),
    translation: { backend: 'none', repoRoot: resolve('.') }
  }), (error) => error.code === 'realization-backend-required' && Boolean(error.details.issue));
  assert.match(await readFile(join(root, 'plan.cnl.md'), 'utf8'), /CNL\/Plan-1 generation specification/u);
});
