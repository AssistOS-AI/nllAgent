import assert from 'node:assert/strict';
import test from 'node:test';
import { capability, circuit, include, provides, reads, requires, stage } from '../../src/circuit/index.mjs';
import { ontology } from '../../src/ontology/index.mjs';
import { CapabilityRegistry, planCapabilities } from '../../src/planner/index.mjs';
import { deriveSemanticDemand, evaluateCompatibility } from '../../src/runtime/index.mjs';
import { SemanticStore } from '../../src/store/index.mjs';

test('the planner resolves a minimal backward capability chain', () => {
  const source = circuit('source@1', provides(capability('Claims')));
  const assessment = circuit('assessment@1', requires(capability('Claims')), provides(capability('Assessment')));
  const registry = new CapabilityRegistry().register(source).register(assessment);
  assert.deepEqual(planCapabilities([capability('Assessment')], registry).map((item) => item.id), ['source@1', 'assessment@1']);
});

test('SemanticDemand reports missing ontology concepts instead of assuming compatibility', () => {
  const O = ontology('test.compatibility@1');
  const Unknown = O.entity('Unknown');
  const sealed = O.seal();
  const consumer = stage('consumer', async () => {}, reads(Unknown));
  const demand = deriveSemanticDemand([circuit('consumer@1', include(consumer))]);
  const compatible = evaluateCompatibility(demand, sealed, new SemanticStore());
  assert.equal(compatible.status, 'COMPATIBLE');
  const empty = ontology('test.empty@1').seal();
  assert.equal(evaluateCompatibility(demand, empty, new SemanticStore()).status, 'BLOCKED_ONTOLOGY');
});
