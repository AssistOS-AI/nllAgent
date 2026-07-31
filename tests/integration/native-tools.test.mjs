import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

import { runNativeTool } from '../../src/tooling/native-tools.mjs';
import {
  agentAuthoringContext, agentBuild, contextField, contextRecord, renderAgentContextModule, sdkImport,
  semanticDemand
} from '../../src/context/index.mjs';

class BufferStream {
  value = '';
  write(value) { this.value += value; }
}

test('native source tooling emits Markdown and validates Unicode spans', async () => {
  const root = await mkdtemp(join(tmpdir(), 'nll-native-tool-'));
  const source = join(root, 'input.md');
  const report = join(root, 'outline.md');
  await writeFile(source, '# Titlu\n\nAna deschide poarta.\n', 'utf8');
  const stdout = new BufferStream();
  const stderr = new BufferStream();
  try {
    assert.equal(await runNativeTool(['source', 'outline', source, '--report', report], {
      cwd: root, stdout, stderr
    }), 0);
    assert.match(stdout.value, /Characters/u);
    assert.match(await readFile(report, 'utf8'), /# Source outline/u);
  } finally {
    await rm(root, { recursive: true });
  }
});

test('native ontology and circuit checks execute real DSL modules', async () => {
  const root = await mkdtemp(join(tmpdir(), 'nll-native-modules-'));
  const ontologyPath = join(root, 'supplier.ontology.mjs');
  const circuitPath = join(root, 'supplier.circuit.mjs');
  await writeFile(ontologyPath, [
    `import { ontology } from '${pathToFileURL(join(process.cwd(), 'src/ontology/api.mjs')).href}';`,
    "const O = ontology('supplier.native-tool@1');",
    "export const Incident = O.event('Incident');",
    'export default O.seal();', ''
  ].join('\n'), 'utf8');
  await writeFile(circuitPath, [
    `import { circuit } from '${pathToFileURL(join(process.cwd(), 'src/circuit/api.mjs')).href}';`,
    "export default circuit('supplier.native-tool.root@1');", ''
  ].join('\n'), 'utf8');
  try {
    for (const arguments_ of [
      ['ontology', 'check', ontologyPath], ['circuit', 'preflight', circuitPath]
    ]) {
      const stdout = new BufferStream();
      const stderr = new BufferStream();
      assert.equal(await runNativeTool(arguments_, { cwd: root, stdout, stderr }), 0, stderr.value);
      assert.match(stdout.value, /check|preflight/ui);
    }
  } finally {
    await rm(root, { recursive: true });
  }
});

test('native context tooling validates and explains the exact selected agent build', async () => {
  const root = await mkdtemp(join(tmpdir(), 'nll-context-tool-'));
  const path = join(root, 'agent-context.mjs');
  const context = agentAuthoringContext('context-tool-agent.analyze@1').digest('sha256:context').purpose('ANALYZE')
    .agent(contextRecord('agent', 'context-tool-agent', contextField('build',
      agentBuild('context-tool-agent', 'context-tool-agent@1', 'sha256:build'))))
    .ontology(contextRecord('ontology', 'context-tool.ontology@1'))
    .materializationProfile(contextRecord('materialization-profile', 'context-tool.profile@1'))
    .semanticDemand(semanticDemand().coverage().seal())
    .sdkImports(sdkImport('context-tool-sdk', 'src/sdk/index.mjs', ['semanticQueryPrimitive']))
    .commands('node --test').seal();
  await writeFile(path, renderAgentContextModule(context, {
    apiModule: new URL('../../src/context/index.mjs', import.meta.url).href
  }), 'utf8');
  const stdout = new BufferStream();
  const stderr = new BufferStream();
  try {
    assert.equal(await runNativeTool(['context', 'inspect', path], { cwd: root, stdout, stderr }), 0, stderr.value);
    assert.match(stdout.value, /context-tool-agent/u);
    assert.match(stdout.value, /Purpose: ANALYZE/u);
    assert.match(stdout.value, /Coverage demands:/u);
  } finally {
    await rm(root, { recursive: true });
  }
});
