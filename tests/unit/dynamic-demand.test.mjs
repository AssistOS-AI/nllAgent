import assert from 'node:assert/strict';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { writeJson } from '../../src/core/io.mjs';
import { analyzeText } from '../../src/runtime/analyzer.mjs';
import { createStandardRegistries } from '../../src/runtime/standard-operators.mjs';

test('an unresolved critical NeedObservation stops incomplete instead of becoming absence', async () => {
  const root = await mkdtemp(join(tmpdir(), 'nllagent-demand-'));
  await mkdir(join(root, 'circuits'), { recursive: true });
  await writeJson(join(root, 'circuits', 'demand.json'), {
    kind: 'CircuitJS', id: 'test.dynamic-demand', version: '1.0.0',
    inputs: {},
    nodes: [{
      id: 'need', primitive: 'ask',
      inputs: { type: 'narrative.retrieve-event@1', critical: true, reason: 'Continuity cannot be closed.' }
    }],
    outputs: { demands: { $node: 'need' } }
  });
  const release = {
    root,
    manifest: { version: '1.0.0', circuits: ['circuits/demand.json'], extractionProfiles: [] }
  };
  const analysis = await analyzeText({
    agentName: 'test', text: 'Mara folosește telefonul.\n', release,
    registries: createStandardRegistries()
  });
  assert.equal(analysis.status, 'stopped-incomplete');
  assert.equal(analysis.unresolvedDemands[0].type, 'narrative.retrieve-event@1');
  assert.equal(analysis.findings.length, 0);
});
