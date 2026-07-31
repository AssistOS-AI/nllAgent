import assert from 'node:assert/strict';
import test from 'node:test';
import * as architecture from '../../src/architecture/index.mjs';
import { canonicalSource } from '../../src/core/canonical-source.mjs';

function rebuildFromSource(value) {
  const names = Object.keys(architecture).join(',');
  return Function('api', `const {${names}} = api; return (${canonicalSource(value)});`)(architecture);
}

function retentionArtifacts() {
  const analysis = architecture.ruleAnalysis('RET-001')
    .authority(architecture.authoritySpan('sources/retention.md', 10, 90))
    .obligations(architecture.ruleObligation('RET-LIMIT', 'Retention must not exceed the limit.'))
    .scope(architecture.scope('policy-scope', 'The policy section defines the assessment scope.'))
    .modality(architecture.modality('prohibition', 'Retention above the limit is prohibited.'))
    .outcomes(architecture.outcome('VIOLATED'), architecture.outcome('UNKNOWN'))
    .unknownWhen(architecture.unknownWhen('open-exception-scope', 'Exception coverage is incomplete.'))
    .evidence(architecture.evidenceRequirement('source-span', 'Every premise needs an exact source span.'))
    .seal();
  const step = architecture.planStep('assess-retention')
    .obligations('RET-LIMIT')
    .shapes(architecture.QUANTITATIVE_CONSTRAINT)
    .inputs(architecture.capabilityRef('RetentionClaim'))
    .outputs(architecture.capabilityRef('RetentionFinding'))
    .methods(architecture.constraintKernelMethod)
    .create('circuits/assess-retention.circuit.mjs')
    .owner('nll-train-agent')
    .rationale('A bounded quantitative comparison is a constraint problem.')
    .seal();
  const plan = architecture.circuitArchitecturePlan('privacy.retention.plan@1')
    .sourceRule(analysis)
    .goal(architecture.capabilityRef('RetentionFinding'))
    .assurance(architecture.ABSTRACT, architecture.SYMBOLIC)
    .steps(step)
    .compose(architecture.circuitRef('privacy.retention.root@1'))
    .deriveMaterializationProfile('materialization/retention.profile.mjs')
    .benchmarkGoals('boundary-values', 'open-vs-closed-coverage')
    .ownership(architecture.ownedModule('circuits/assess-retention.circuit.mjs', 'nll-train-agent'))
    .seal();
  const profile = architecture.materializationProfile('privacy.retention.profile@1')
    .observations(architecture.observe(
      architecture.conceptRef('privacy:Retain'), architecture.roleRef('privacy:duration')
    ))
    .resolve(architecture.resolveRequirement('temporal-anchors'))
    .coverage(architecture.requireComplete(
      architecture.conceptRef('privacy:LegalException'), architecture.architectureRef('scope', 'policy-section')
    ))
    .groundEveryClaimWith(architecture.groundingRequirement('source-span'))
    .preserveAlternatives(architecture.alternativeRequirement('authority-classification'))
    .seal();
  const capability = architecture.capabilityRef('RetentionFinding');
  const selected = architecture.provider('privacy.retention.provider@1')
    .component(architecture.circuitRef('privacy.retention.root@1'))
    .provides(capability)
    .guarantees(architecture.architectureRef('guarantee', 'source-grounded'))
    .local()
    .cost(1)
    .seal();
  const pin = architecture.providerPin(capability).authorize(selected).select(selected).seal();
  const pack = architecture.rulePack('privacy.retention.pack@1')
    .sources(architecture.authorityFile('sources/retention.md'))
    .ontology(architecture.architectureRef('ontology', 'privacy.core@1'))
    .plans(plan)
    .materialization(profile)
    .circuits(architecture.circuitRef('privacy.retention.root@1'))
    .assurance(architecture.ABSTRACT, architecture.SYMBOLIC)
    .benchmarks(architecture.architectureRef('benchmark', 'privacy.retention@1'))
    .providers(pin)
    .seal();
  return { analysis, pack, plan, profile, selected };
}

test('architecture DSL values are opaque, frozen, and have executable source forms', () => {
  const { analysis, pack, plan, profile } = retentionArtifacts();
  for (const value of [analysis, architecture.DEFAULT_METHOD_CATALOG, plan, profile, pack]) {
    assert.equal(Object.isFrozen(value), true);
    const rebuilt = rebuildFromSource(value);
    assert.equal(rebuilt.kind, value.kind);
    assert.equal(canonicalSource(rebuilt), canonicalSource(value));
  }
  assert.equal(pack.providerFor(architecture.capabilityRef('RetentionFinding')).id, 'privacy.retention.provider@1');
  assert.throws(() => { pack.id = 'changed'; }, TypeError);
});

test('builders validate required fields and reject anonymous semantic records', () => {
  assert.throws(
    () => architecture.ruleAnalysis('RET-002')
      .authority(architecture.authoritySpan('policy.md', 0, 2))
      .obligations(architecture.ruleObligation('O1', 'One obligation.'))
      .seal(),
    (error) => error.code === 'missing-rule-outcome'
  );
  assert.throws(
    () => architecture.materializationProfile('invalid.profile@1').observations({ concept: 'Retain' }),
    (error) => error.code === 'invalid-observation-requirement'
  );
  assert.throws(
    () => architecture.method('abstract-only')
      .appliesTo(architecture.FINITE_PATTERN_MATCHING)
      .supports(architecture.ABSTRACT)
      .seal(),
    (error) => error.code === 'missing-concrete-method'
  );
});

test('provider pins reject unauthorized choices and preserve the selected provider', () => {
  const capability = architecture.capabilityRef('Assessment');
  const allowed = architecture.provider('allowed@1')
    .component(architecture.circuitRef('allowed.circuit@1')).provides(capability).seal();
  const unapproved = architecture.provider('unapproved@1')
    .component(architecture.circuitRef('unapproved.circuit@1')).provides(capability).seal();
  assert.throws(
    () => architecture.providerPin(capability).authorize(allowed).select(unapproved).seal(),
    (error) => error.code === 'unauthorized-provider-pin'
  );
  const pin = architecture.providerPin(capability).authorize(allowed).select(allowed).seal();
  assert.equal(pin.selected, pin.authorized[0]);
  assert.equal(canonicalSource(rebuildFromSource(pin)), canonicalSource(pin));
});

test('BuildState enforces ordered gates and invalidates downstream passed gates', () => {
  const G1Artifact = architecture.buildArtifact('rules/rule-analysis.mjs', 'sha256:g1', architecture.G1);
  const G2Artifact = architecture.buildArtifact('ontologies/index.ontology.mjs', 'sha256:g2', architecture.G2);
  const state = architecture.buildState('privacy.retention.build@1')
    .results(architecture.passedGate(architecture.G1, G1Artifact))
    .results(architecture.passedGate(architecture.G2, G2Artifact))
    .seal();
  assert.equal(state.nextGate.id, 'G3');
  assert.equal(rebuildFromSource(state).nextGate.id, 'G3');
  const invalidated = state.invalidateFrom(architecture.G1, 'Authority source changed.');
  assert.equal(invalidated.result('G1').status.id, 'STALE');
  assert.equal(invalidated.result('G2').status.id, 'STALE');
  assert.equal(invalidated.result('G3').status.id, 'PENDING');
  assert.throws(
    () => architecture.buildState('invalid.build@1').results(architecture.passedGate(architecture.G2)).seal(),
    (error) => error.code === 'gate-prerequisite-failed'
  );
});

test('diagnostics route deterministically to their authoritative owner', () => {
  const method = architecture.diagnostic('METHOD_NOT_APPLICABLE', 'The selected method cannot handle this shape.')
    .subject('step-b').seal();
  const effect = architecture.diagnostic('EFFECT_DRIFT', 'The macro-node used an undeclared effect.')
    .subject('step-a').seal();
  const routed = architecture.DEFAULT_DIAGNOSTIC_ROUTER.routeAll([method, effect]);
  assert.deepEqual(routed.map((value) => value.owner), ['nll-train-agent', 'nll-train-agent']);
  assert.equal(routed[0].diagnostic, effect);
  assert.equal(canonicalSource(rebuildFromSource(architecture.DEFAULT_DIAGNOSTIC_ROUTER)),
    canonicalSource(architecture.DEFAULT_DIAGNOSTIC_ROUTER));
});
