import {
  ABSTRACT, AMBIGUITY_REQUIRING_WITNESS, EXPLICIT_UNKNOWNS, FINITE_DECISION,
  FINITE_PATTERN_MATCHING, IRREGULAR_PROCEDURE, RECURSIVE_RELATION, REFINEMENT_DEMAND,
  SYMBOLIC, capabilityRef, circuitArchitecturePlan, circuitRef, conceptRef,
  cegarMethod, decisionTableMethod, javascriptMacroMethod, ownedModule, planStep,
  queryDataflowMethod, relationEngineMethod, symbolicWitnessMethod
} from '../../../src/architecture/index.mjs';
import ruleAnalysis from '../rules/rule-analysis.mjs';

const instantiateUses = planStep('instantiate-uses')
  .obligations('NC-001-PER-USE', 'NC-001-BOUNDARY')
  .shapes(FINITE_PATTERN_MATCHING)
  .inputs(conceptRef('narrative.continuity@1:Use'))
  .outputs(capabilityRef('per-use-circuit-instance'))
  .methods(queryDataflowMethod)
  .create('circuits/continuity.circuit.mjs')
  .owner('nll-train-agent')
  .rationale('Typed instantiateEach matching gives every use one canonical binding and keeps judgment in CircuitJS.')
  .seal();

const resolveIdentity = planStep('resolve-use-identity')
  .obligations('NC-001-IDENTITY', 'NC-001-UNKNOWN')
  .shapes(FINITE_PATTERN_MATCHING, AMBIGUITY_REQUIRING_WITNESS)
  .inputs(conceptRef('narrative.continuity@1:Use'), capabilityRef('identity-candidates'))
  .outputs(capabilityRef('resolved-or-ambiguous-object'))
  .methods(queryDataflowMethod, symbolicWitnessMethod)
  .reuse(circuitRef('narrative.continuity.use-assessment@1'))
  .dependsOn('instantiate-uses')
  .owner('nll-train-agent')
  .rationale('Direct object identity is exact; candidate cardinality remains explicit and result-changing ambiguity is not selected.')
  .seal();

const closeTimeline = planStep('close-temporal-relation')
  .obligations('NC-001-TEMPORAL')
  .shapes(RECURSIVE_RELATION)
  .inputs(conceptRef('narrative.continuity@1:DirectBefore'))
  .outputs(capabilityRef('narrative-precedence-closure'))
  .methods(relationEngineMethod)
  .reuse(capabilityRef('relation-engine'))
  .dependsOn('instantiate-uses')
  .owner('nll-train-agent')
  .rationale('A least fixed point supplies inspectable transitive reachability across section boundaries.')
  .seal();

const classifyContinuity = planStep('classify-continuity')
  .obligations(
    'NC-001-VIOLATION', 'NC-001-RETRIEVAL', 'NC-001-NOT-APPLICABLE',
    'NC-001-UNKNOWN', 'NC-001-CONFLICT', 'NC-001-COVERAGE'
  )
  .shapes(FINITE_DECISION, REFINEMENT_DEMAND)
  .signals(EXPLICIT_UNKNOWNS)
  .inputs(
    capabilityRef('resolved-or-ambiguous-object'), capabilityRef('narrative-precedence-closure'),
    conceptRef('narrative.continuity@1:NarrativeInterval')
  )
  .outputs(conceptRef('narrative.continuity@1:ContinuityAssessment'))
  .methods(decisionTableMethod, cegarMethod)
  .reuse(circuitRef('narrative.continuity.use-assessment@1'))
  .dependsOn('resolve-use-identity', 'close-temporal-relation')
  .owner('nll-train-agent')
  .rationale('Finite statuses enumerate UNKNOWN and CONFLICT; refinement stays targeted to identity, time, or coverage.')
  .seal();

const publishEvidence = planStep('publish-exact-evidence')
  .obligations('NC-001-EVIDENCE')
  .shapes(IRREGULAR_PROCEDURE)
  .inputs(conceptRef('narrative.continuity@1:ContinuityAssessment'))
  .outputs(conceptRef('nll.core@1:Finding'))
  .methods(javascriptMacroMethod)
  .reuse(circuitRef('narrative.continuity.use-assessment@1'))
  .dependsOn('classify-continuity')
  .owner('nll-train-agent')
  .rationale('A bounded macro-stage gathers exact term evidence and publishes only opaque typed outputs transactionally.')
  .seal();

export default circuitArchitecturePlan('narrative.continuity.plan@1')
  .sourceRule(ruleAnalysis)
  .goal(capabilityRef('narrative-continuity-assessment'))
  .assurance(ABSTRACT, SYMBOLIC)
  .steps(instantiateUses, resolveIdentity, closeTimeline, classifyContinuity, publishEvidence)
  .compose(circuitRef('narrative.continuity.root@1'))
  .deriveMaterializationProfile('materialization/continuity.profile.mjs')
  .benchmarkGoals(
    'violation', 'retrieval-counterexample', 'open-closed-coverage', 'identity-alternatives',
    'temporal-order', 'exact-evidence', 'dynamic-instances', 'unknown-versus-finding'
  )
  .ownership(
    ownedModule('circuits/continuity.circuit.mjs', 'nll-train-agent'),
    ownedModule('materialization/continuity.profile.mjs', 'nll-train-agent'),
    ownedModule('assurance/temporal-closure.assurance.mjs', 'nll-train-agent'),
    ownedModule('assurance/coverage-preflight.assurance.mjs', 'nll-train-agent'),
    ownedModule('assurance/decision-proof.assurance.mjs', 'nll-train-agent'),
    ownedModule('assurance/symbolic-boundaries.assurance.mjs', 'nll-train-agent')
  )
  .seal();
