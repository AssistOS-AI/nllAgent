import assert from 'node:assert/strict';
import test from 'node:test';
import * as architecture from '../../src/architecture/index.mjs';
import { canonicalSource } from '../../src/core/canonical-source.mjs';

function analysis(id, ...obligationIds) {
  return architecture.ruleAnalysis(id)
    .authority(architecture.authoritySpan('policy.md', 0, 100))
    .obligations(...obligationIds.map((value) => architecture.ruleObligation(value, `Authority clause ${value}.`)))
    .outcomes(architecture.outcome('SATISFIED'), architecture.outcome('UNKNOWN'))
    .seal();
}

function planFor(rule, ...steps) {
  const builder = architecture.circuitArchitecturePlan(`${rule.id}.plan@1`)
    .sourceRule(rule)
    .goal(architecture.capabilityRef('Assessment'))
    .assurance(architecture.ABSTRACT)
    .steps(...steps)
    .compose(architecture.circuitRef(`${rule.id}.root@1`))
    .deriveMaterializationProfile(`materialization/${rule.id}.profile.mjs`)
    .benchmarkGoals('normal-case');
  for (const step of steps) {
    for (const path of step.createdModules) builder.ownership(architecture.ownedModule(path, step.owner || 'wrong-owner'));
  }
  return builder;
}

test('MethodCatalog suggestions and minimal covers are deterministic', () => {
  const request = architecture.methodRequest('retention-decision')
    .shapes(architecture.FINITE_DECISION, architecture.QUANTITATIVE_CONSTRAINT)
    .signals(architecture.EXPLICIT_UNKNOWNS, architecture.REVIEWABILITY_REQUIRED)
    .assurance(architecture.ABSTRACT)
    .reusable('constraint-kernel')
    .seal();
  const suggestions = architecture.DEFAULT_METHOD_CATALOG.suggest(request);
  assert.deepEqual(suggestions.map((value) => value.descriptor.id), [
    'finite-decision-table', 'constraint-kernel'
  ]);
  const cover = architecture.DEFAULT_METHOD_CATALOG.suggestCover(request);
  assert.equal(cover.complete, true);
  assert.deepEqual(cover.suggestions.map((value) => value.descriptor.id), [
    'finite-decision-table', 'constraint-kernel'
  ]);

  const alpha = architecture.method('alpha').appliesTo(architecture.FINITE_PATTERN_MATCHING)
    .supports(architecture.CONCRETE).seal();
  const zeta = architecture.method('zeta').appliesTo(architecture.FINITE_PATTERN_MATCHING)
    .supports(architecture.CONCRETE).seal();
  const catalog = architecture.methodCatalog('tie-break@1', alpha, zeta).seal();
  const reusable = architecture.methodRequest('tie-break').shapes(architecture.FINITE_PATTERN_MATCHING)
    .reusable('zeta').seal();
  assert.deepEqual(catalog.suggest(reusable).map((value) => value.descriptor.id), ['zeta', 'alpha']);
});

test('plan checks accept fully mapped, applicable, acyclic, owned plans', () => {
  const rule = analysis('RET-VALID', 'SELECT', 'DECIDE');
  const select = architecture.planStep('select')
    .obligations('SELECT')
    .shapes(architecture.FINITE_PATTERN_MATCHING)
    .outputs(architecture.capabilityRef('Claims'))
    .methods(architecture.queryDataflowMethod)
    .create('circuits/select.circuit.mjs')
    .owner('nll-train-agent')
    .rationale('Finite source-grounded selection uses query dataflow.')
    .seal();
  const decide = architecture.planStep('decide')
    .obligations('DECIDE')
    .shapes(architecture.FINITE_DECISION)
    .signals(architecture.EXPLICIT_UNKNOWNS)
    .inputs(architecture.capabilityRef('Claims'))
    .outputs(architecture.capabilityRef('Assessment'))
    .methods(architecture.decisionTableMethod)
    .create('circuits/decide.circuit.mjs')
    .dependsOn('select')
    .owner('nll-train-agent')
    .rationale('The finite status policy must enumerate unknown states.')
    .seal();
  const plan = planFor(rule, select, decide).seal();
  assert.deepEqual(architecture.checkArchitecturePlan(plan, architecture.DEFAULT_METHOD_CATALOG), []);
  assert.match(canonicalSource(plan), /^circuitArchitecturePlan\(/u);
});

test('plan checks report unmapped obligations, inapplicable methods, cycles, and ownership', () => {
  const rule = analysis('RET-BROKEN', 'MAPPED', 'UNMAPPED');
  const broken = architecture.planStep('broken')
    .obligations('MAPPED')
    .shapes(architecture.FINITE_DECISION)
    .outputs(architecture.capabilityRef('Assessment'))
    .methods(architecture.queryDataflowMethod)
    .create('circuits/broken.circuit.mjs')
    .dependsOn('broken')
    .rationale('Intentionally invalid fixture.')
    .seal();
  const plan = architecture.circuitArchitecturePlan('broken.plan@1')
    .sourceRule(rule)
    .goal(architecture.capabilityRef('Assessment'))
    .steps(broken)
    .compose(architecture.circuitRef('broken.root@1'))
    .deriveMaterializationProfile('materialization/broken.profile.mjs')
    .benchmarkGoals('normal-case')
    .ownership(architecture.ownedModule('circuits/broken.circuit.mjs', 'wrong-owner'))
    .seal();
  const diagnostics = architecture.checkArchitecturePlan(plan, architecture.DEFAULT_METHOD_CATALOG);
  const codes = new Set(diagnostics.map((value) => value.code));
  assert.deepEqual(codes, new Set([
    'PLAN_UNMAPPED_RULE_OBLIGATION', 'METHOD_NOT_APPLICABLE',
    'UNCLASSIFIED_CAPABILITY_CYCLE', 'PLAN_OWNERSHIP_MISMATCH'
  ]));
  const owners = new Set(architecture.DEFAULT_DIAGNOSTIC_ROUTER.routeAll(diagnostics).map((value) => value.owner));
  assert.deepEqual(owners, new Set(['nll-train-agent']));
});

test('an explicitly classified fixed-point cycle passes the cycle check', () => {
  const rule = analysis('REL-CLOSURE', 'CLOSURE');
  const closure = architecture.planStep('closure')
    .obligations('CLOSURE')
    .shapes(architecture.RECURSIVE_RELATION)
    .outputs(architecture.capabilityRef('RelationClosure'))
    .methods(architecture.relationEngineMethod)
    .create('circuits/closure.circuit.mjs')
    .dependsOn('closure')
    .cycle(architecture.fixedPointCycle('relation-closure'))
    .owner('nll-train-agent')
    .rationale('Positive monotone reachability uses a least fixed point.')
    .seal();
  const plan = planFor(rule, closure).seal();
  assert.deepEqual(architecture.checkArchitecturePlan(plan, architecture.DEFAULT_METHOD_CATALOG), []);
});
