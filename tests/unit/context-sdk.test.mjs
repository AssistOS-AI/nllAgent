import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

import {
  agent, benchmarks, build, materializationProfiles, runs, tests, theorySources, using
} from '../../src/agent/index.mjs';
import {
  architectureRef, conceptRef, groundingRequirement, materializationProfile, observe, requireComplete,
  queryDataflowMethod, roleRef
} from '../../src/architecture/index.mjs';
import {
  capability, circuit, guarantee, include, match, notExists, requireCoverage, requires as requiresCapability,
  rule, then, usesMethod, when
} from '../../src/circuit/index.mjs';
import {
  agentBuild, compileAgentAuthoringContext, contextResource, renderAgentContextMarkdown,
  renderAgentContextModule
} from '../../src/context/index.mjs';
import { equal } from '../../src/engines/index.mjs';
import {
  allows, exactlyOne, from, identifiedAs, ontology, requires as requiresRole, to
} from '../../src/ontology/index.mjs';
import {
  DEFAULT_METHOD_CATALOG, DEFAULT_PRIMITIVE_REGISTRY, constraintSolvePrimitive,
  semanticQueryPrimitive
} from '../../src/sdk/index.mjs';

function fixture() {
  const O = ontology('business.retention@1');
  const Person = O.entity('Person');
  const Item = O.entity('Item');
  const actor = O.role('actor', from(O.Event), to(Person), exactlyOne());
  const theme = O.role('theme', from(O.Event), to(Item), exactlyOne());
  const Retain = O.event('Retain', requiresRole(actor), requiresRole(theme));
  const Exception = O.event('Exception', allows(actor));
  const domain = O.seal();
  const E = ontology('business.evidence@1');
  E.entity('Authority');
  const evidence = E.seal();
  const p = Person(identifiedAs('person'));
  const i = Item(identifiedAs('item'));
  const scope = architectureRef('scope', 'policy-section');
  const assessment = rule('retention-without-exception', when(
    match(Retain(actor(p), theme(i))),
    notExists(match(Exception(actor(p))), scope, requireCoverage(Exception))
  ), then());
  const root = circuit('business.retention.root@1',
    requiresCapability(capability('DocumentClaims', 'explicit-or-verified')),
    guarantee('source-grounded-evidence'), usesMethod(queryDataflowMethod), include(assessment));
  const profile = materializationProfile('business.retention.profile@1')
    .observations(observe(conceptRef(Retain.definition.id), roleRef(actor.definition.id), roleRef(theme.definition.id)))
    .coverage(requireComplete(conceptRef(Exception.definition.id), scope))
    .groundEveryClaimWith(groundingRequirement('source-span')).seal();
  const project = agent('retention-agent', using(domain, evidence), runs(root),
    materializationProfiles(profile), build(agentBuild('retention-agent', 'retention-agent@7', 'sha256:build-7')),
    theorySources(contextResource('theory', 'theory/retention.md', 'sha256:theory')),
    tests(contextResource('test', 'tests/retention.test.mjs', 'sha256:test')),
    benchmarks(contextResource('benchmark', 'benchmarks/retention.mjs', 'sha256:benchmark')));
  return { actor, domain, evidence, project, root };
}

test('agent context pins one build and exposes all ontology, circuit, demand, and SDK inputs', () => {
  const { actor, project } = fixture();
  const context = compileAgentAuthoringContext(project, { purpose: 'TRAIN' });
  assert.equal(context.kind, 'AgentAuthoringContext');
  assert.equal(context.agent.id, 'retention-agent');
  assert.equal(context.agent.value('build').id, 'retention-agent@7');
  assert.deepEqual(context.ontology.map((value) => value.id), ['business.evidence@1', 'business.retention@1']);
  assert.equal(context.circuits.length, 1);
  assert.ok(context.semanticDemand.concepts.has('business.retention@1:Retain'));
  assert.ok(context.semanticDemand.roles.has(actor.definition.id));
  assert.ok(context.semanticDemand.capabilities.has('DocumentClaims'));
  assert.ok(context.semanticDemand.evidencePolicies.has('explicit-or-verified'));
  assert.ok(context.semanticDemand.evidencePolicies.has('source-grounded-evidence'));
  assert.ok(context.semanticDemand.operations.has('method:query-dataflow'));
  assert.deepEqual(context.semanticDemand.coverageRequirements.map((value) => [value.conceptId, value.scopeId]),
    [['business.retention@1:Exception', 'policy-section']]);
  assert.equal(context.materializationProfile.id, 'business.retention.profile@1');
  assert.equal(context.methodCatalog.id, DEFAULT_METHOD_CATALOG.id);
  assert.equal(context.providers.length, DEFAULT_METHOD_CATALOG.descriptors.length);
  assert.equal(context.sdkImports[0].modulePath, 'src/sdk/index.mjs');
  assert.match(renderAgentContextMarkdown(context), /Closed coverage required:[\s\S]*policy-section/u);
});

test('rendered context is an executable ESM module with the same digest', async () => {
  const { project } = fixture();
  const context = compileAgentAuthoringContext(project, { purpose: 'TRAIN' });
  const directory = await mkdtemp(join(tmpdir(), 'nll-context-'));
  const file = join(directory, 'agent-context.mjs');
  const apiModule = pathToFileURL(resolve('src/context/index.mjs')).href;
  await writeFile(file, renderAgentContextModule(context, { apiModule }), 'utf8');
  const rebuilt = (await import(`${pathToFileURL(file).href}?digest=${context.digest}`)).default;
  assert.equal(rebuilt.kind, 'AgentAuthoringContext');
  assert.equal(rebuilt.digest, context.digest);
  assert.deepEqual([...rebuilt.semanticDemand.roles], [...context.semanticDemand.roles]);
});

test('default SDK maps every method to a real executable provider', async () => {
  for (const method of DEFAULT_METHOD_CATALOG.descriptors) {
    const providers = DEFAULT_PRIMITIVE_REGISTRY.providersForMethod(method.id);
    assert.ok(providers.length > 0, `missing provider for ${method.id}`);
    assert.equal(providers[0].descriptor.supports('concrete'), true);
  }
  assert.throws(() => DEFAULT_PRIMITIVE_REGISTRY.register(semanticQueryPrimitive),
    (error) => error.code === 'primitive-registry-sealed');
  const queryResult = await semanticQueryPrimitive.evaluate('concrete', { query: (value) => [`seen:${value}`] }, ['claims']);
  assert.deepEqual(queryResult, ['seen:claims']);
  const solved = await constraintSolvePrimitive.evaluate('concrete', null, [[equal('same', 'same')]]);
  assert.equal(solved.status, 'SAT');
});

test('context compilation fails closed for unpinned builds and ambiguous profiles', () => {
  const { evidence, project, root, domain } = fixture();
  const missingBuild = agent('missing-build', using(domain), runs(root),
    materializationProfiles(project.materializationProfiles[0]));
  assert.throws(() => compileAgentAuthoringContext(missingBuild), (error) => error.code === 'missing-agent-build');
  const ambiguous = agent('ambiguous', using(domain), runs(root),
    build(agentBuild('ambiguous', 'ambiguous@1', 'sha256:a')),
    materializationProfiles(project.materializationProfiles[0], project.materializationProfiles[0]));
  assert.throws(() => compileAgentAuthoringContext(ambiguous),
    (error) => error.code === 'ambiguous-materialization-profile');
  assert.throws(() => agent('duplicate-build', build(
    agentBuild('duplicate-build', 'duplicate-build@1', 'sha256:one')
  ), build(agentBuild('duplicate-build', 'duplicate-build@2', 'sha256:two'))),
  (error) => error.code === 'duplicate-agent-build');
  const ontologyGap = agent('ontology-gap', using(evidence), runs(root),
    build(agentBuild('ontology-gap', 'ontology-gap@1', 'sha256:gap')),
    materializationProfiles(project.materializationProfiles[0]));
  assert.throws(() => compileAgentAuthoringContext(ontologyGap),
    (error) => error.code === 'agent-context-ontology-gap');
});

test('context identity is isolated to the selected agent and pinned build', () => {
  const { project } = fixture();
  const first = compileAgentAuthoringContext(project, { purpose: 'analysis' });
  const repeated = compileAgentAuthoringContext(project, { purpose: 'ANALYZE' });
  assert.equal(repeated.digest, first.digest);

  const changedBuild = agent('retention-agent', using(...project.ontologies), runs(...project.circuits),
    materializationProfiles(...project.materializationProfiles),
    build(agentBuild('retention-agent', 'retention-agent@8', 'sha256:build-8')));
  const changed = compileAgentAuthoringContext(changedBuild, { purpose: 'ANALYZE' });
  assert.notEqual(changed.digest, first.digest);

  const unrelated = agent('other-agent', using(...project.ontologies), runs(...project.circuits),
    materializationProfiles(...project.materializationProfiles),
    build(agentBuild('other-agent', 'other-agent@1', 'sha256:other')));
  compileAgentAuthoringContext(unrelated, { purpose: 'ANALYZE' });
  assert.equal(compileAgentAuthoringContext(project, { purpose: 'ANALYZE' }).digest, first.digest);
});
