import assert from 'node:assert/strict';
import test from 'node:test';
import {
  capability, circuit, include, match, notExists, provides, reads, requireCoverage, requires, rule, stage,
  then, when, instantiateEach
} from '../../src/circuit/index.mjs';
import { architectureRef } from '../../src/architecture/index.mjs';
import { coverage, longTextProgram, semanticUnit, source } from '../../src/longtext/index.mjs';
import { exactlyOne, from, ontology, requires as requiresRole, to, variable } from '../../src/ontology/index.mjs';
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

test('SemanticDemand includes role and exact coverage scope requirements recursively', () => {
  const O = ontology('test.demand@1');
  const Person = O.entity('Person');
  const actor = O.role('actor', from(O.Event), to(Person), exactlyOne());
  const Notice = O.event('Notice', requiresRole(actor));
  const sealed = O.seal();
  const person = variable(Person, 'person');
  const scope = architectureRef('scope', 'notices-section');
  const check = rule('missing-notice', when(
    notExists(match(Notice(actor(person))), scope, requireCoverage(Notice))
  ), then());
  const nested = circuit('nested@1', include(check));
  const demand = deriveSemanticDemand([circuit('root@1', include(nested))]);
  assert.deepEqual([...demand.roles], [actor.definition.id]);
  assert.deepEqual(demand.coverageRequirements.map((value) => value.scopeId), ['notices-section']);

  const document = source('document', '', 'r1');
  const store = new SemanticStore();
  store.publish(longTextProgram('document@r1', document,
    semanticUnit('coverage', coverage(Notice, scope, 'closed'))));
  assert.equal(evaluateCompatibility(demand, sealed, store).status, 'COMPATIBLE');

  const incomplete = ontology('test.demand@1');
  incomplete.entity('Person');
  incomplete.event('Notice');
  const report = evaluateCompatibility(demand, incomplete.seal(), store);
  assert.equal(report.status, 'BLOCKED_ONTOLOGY');
  assert.deepEqual(report.missingRoles, [actor.definition.id]);

  const dynamic = deriveSemanticDemand([circuit('dynamic-root@1', instantiateEach('notices', nested))]);
  assert.ok(dynamic.concepts.has(Notice.definition.id));
  assert.ok(dynamic.operations.has('instantiate-each'));
});
