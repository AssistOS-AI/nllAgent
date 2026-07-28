import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { runCli } from '../../src/cli/main.mjs';
import { digestJson, sha256Bytes } from '../../src/core/canonical.mjs';
import { readJson, writeJson } from '../../src/core/io.mjs';
import { gatewayForAgent } from '../../src/model/achilles-gateway.mjs';
import { analyzeText } from '../../src/runtime/analyzer.mjs';
import { createStandardRegistries } from '../../src/runtime/standard-operators.mjs';
import { initializeAgent } from '../../src/storage/agent-store.mjs';

async function continuityRelease(root) {
  const circuits = join(root, 'circuits');
  const extraction = join(root, 'extraction');
  await mkdir(circuits, { recursive: true });
  await mkdir(extraction, { recursive: true });
  await writeFile(join(circuits, 'continuity.circuit.mjs'), `
    export default circuit({
      kind: 'CircuitJS', id: 'narrative.phone-continuity', version: '1.0.0',
      inputs: { events: { type: 'narrative.object-event@1', statuses: ['proposed'], coverage: 'open-world', critical: true } },
      nodes: [
        { id: 'candidates', primitive: 'call', operator: 'narrative.object-continuity@1', inputs: {
          events: port('events'), rules: [{ id: 'CONT-001', verdict: 'continuity-gap', severity: 'warning' }]
        } },
        { id: 'verified', primitive: 'verify', verifier: 'narrative.object-continuity@1', inputs: { candidates: node('candidates') } },
        { id: 'findings', primitive: 'emit', inputs: { verified: node('verified') } }
      ], outputs: { findings: node('findings') }
    });
  `);
  await writeJson(join(extraction, 'events.json'), {
    id: 'narrative-object-events@1',
    outputType: 'narrative.object-event@1',
    instruction: 'Extract actual leave, retrieve, transfer, replace, and use events for the phone.',
    scopeTypes: ['document.paragraph@1'],
    minimumObservations: 2,
    schema: {
      required: ['objectId', 'action', 'order'],
      enums: { action: ['leave', 'retrieve', 'transfer', 'replace', 'use'] }
    }
  });
  await writeJson(join(root, 'compatibility.json'), {
    id: 'narrative-en@1', schemaVersion: 1, formats: ['text/markdown'], languages: ['en'], producers: ['narrative-object-events@1']
  });
  return {
    root,
    manifest: {
      version: '1.0.0',
      circuits: ['circuits/continuity.circuit.mjs'],
      extractionProfiles: ['extraction/events.json'],
      compatibilityProfile: 'compatibility.json'
    }
  };
}

function extractionAgent() {
  return {
    async executePrompt(prompt) {
      if (prompt.includes('left the phone')) return { observations: [{ quote: 'left the phone', payload: { objectId: 'phone:alice', action: 'leave', order: 1 }, confidence: 0.96, alternatives: [], reason: 'Explicit leave event.' }] };
      if (prompt.includes('retrieved the phone')) return { observations: [{ quote: 'retrieved the phone', payload: { objectId: 'phone:alice', action: 'retrieve', order: 2 }, confidence: 0.94, alternatives: [], reason: 'Explicit recovery event.' }] };
      if (prompt.includes('used the phone')) return { observations: [{ quote: 'used the phone', payload: { objectId: 'phone:alice', action: 'use', order: 3 }, confidence: 0.95, alternatives: [], reason: 'Explicit use event.' }] };
      return { observations: [] };
    }
  };
}

test('LLMAgent translation plus CircuitJS detects and then closes a long-range continuity gap', async () => {
  const root = await mkdtemp(join(tmpdir(), 'nllagent-semantic-continuity-'));
  const release = await continuityRelease(root);
  const gateway = gatewayForAgent(extractionAgent(), { translationModel: 'spark-test' });
  const registries = createStandardRegistries({ modelGateway: gateway });

  const gap = await analyzeText({
    agentName: 'semantic-test',
    text: 'Alice left the phone in the car.\n\nSeven chapters later, she used the phone in the hotel.\n',
    release,
    registries,
    language: 'en'
  });
  assert.equal(gap.status, 'reported');
  assert.equal(gap.findings.length, 1);
  assert.equal(gap.findings[0].rule, 'CONT-001');
  assert.equal(gap.findings[0].guarantee, 'evidence-certified');
  assert.equal(gap.modelCaptures.length, 2);

  const recovered = await analyzeText({
    agentName: 'semantic-test',
    text: 'Alice left the phone in the car.\n\nAlice retrieved the phone before leaving.\n\nAt the hotel, she used the phone.\n',
    release,
    registries,
    language: 'en'
  });
  assert.equal(recovered.status, 'reported');
  assert.equal(recovered.findings.length, 0);
  assert.equal(recovered.modelCaptures.length, 3);
});

function capture() {
  let value = '';
  return { stream: { write(chunk) { value += chunk; } }, read: () => value };
}

test('CLI auto mode creates LongTextJS through the Codex fallback when Achilles is unconfigured', async () => {
  const root = await mkdtemp(join(tmpdir(), 'nllagent-cli-codex-fallback-'));
  const dataRoot = join(root, 'data');
  const agent = await initializeAgent(dataRoot, 'codex-continuity', { language: 'en' });
  const releaseRoot = join(agent.root, 'releases', '1.0.0');
  const release = await continuityRelease(releaseRoot);
  const filePaths = [
    'circuits/continuity.circuit.mjs',
    'extraction/events.json',
    'compatibility.json'
  ];
  const files = [];
  for (const path of filePaths) {
    files.push({ path, digest: sha256Bytes(await readFile(join(releaseRoot, path))) });
  }
  const manifest = {
    kind: 'NaturalLanguageLinterRelease', version: '1.0.0', status: 'published',
    description: 'CLI Codex translation acceptance release.',
    ...release.manifest,
    files,
    publishedBy: 'integration-fixture@1'
  };
  await writeJson(join(releaseRoot, 'release.json'), manifest);
  await writeJson(join(releaseRoot, 'publication.json'), {
    kind: 'ReleasePublicationResult', schemaVersion: 1, status: 'published',
    release: '1.0.0', manifestDigest: digestJson(manifest), fixture: true
  });
  await writeJson(join(agent.root, 'active-release.json'), {
    kind: 'ActiveReleasePointer', schemaVersion: 1,
    release: '1.0.0', manifestDigest: digestJson(manifest)
  });

  const input = join(root, 'input.md');
  const output = join(root, 'report.md');
  await writeFile(input, 'Alice left the phone in the car.\n\nSeven chapters later, she used the phone at the hotel.\n');
  let codexCalls = 0;
  const processRunner = async (_command, args) => {
    codexCalls += 1;
    const prompt = args.at(-1);
    const observations = prompt.includes('left the phone')
      ? [{
          quote: 'left the phone',
          payload: { objectId: 'phone:alice', action: 'leave', order: 1 },
          confidence: 0.95, alternatives: [], reason: 'Explicit leave event.'
        }]
      : prompt.includes('used the phone')
        ? [{
            quote: 'used the phone',
            payload: { objectId: 'phone:alice', action: 'use', order: 2 },
            confidence: 0.94, alternatives: [], reason: 'Explicit use event.'
          }]
        : [];
    await writeJson(args[args.indexOf('-o') + 1], { observations });
    return { code: 0, signal: null, stdout: '{"type":"result"}\n', stderr: '' };
  };
  const stdout = capture();
  const stderr = capture();
  const exitCode = await runCli([
    'run', '--agent', 'codex-continuity', '--input', input, '--output', output,
    '--data-root', dataRoot, '--translator', 'auto', '--json'
  ], {
    stdout: stdout.stream, stderr: stderr.stream, env: {}, cwd: root,
    repoRoot: resolve('.'), processRunner
  });

  assert.equal(exitCode, 0, stderr.read());
  const result = JSON.parse(stdout.read());
  assert.equal(result.translationBackend, 'codex');
  assert.equal(result.status, 'reported');
  assert.equal(result.findings, 1);
  assert.equal(codexCalls, 2);
  assert.match(await readFile(output, 'utf8'), /CONT-001/u);
  const [runId] = await readdir(join(agent.root, 'runs'));
  const longText = await readJson(join(agent.root, 'runs', runId, 'longtext.json'));
  assert.equal(longText.observations.filter((item) => item.type === 'narrative.object-event@1').length, 2);
  const run = await readJson(join(agent.root, 'runs', runId, 'run.json'));
  assert.equal(run.runtime.translationBackend, 'codex');
});
