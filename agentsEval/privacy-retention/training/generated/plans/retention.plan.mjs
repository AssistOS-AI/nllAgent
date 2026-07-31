import {
  ABSTRACT, SYMBOLIC, EXPLICIT_UNKNOWNS, FINITE_DECISION, FINITE_PATTERN_MATCHING,
  QUANTITATIVE_CONSTRAINT, REVIEWABILITY_REQUIRED, architectureRef, capabilityRef,
  circuitArchitecturePlan, circuitRef, constraintKernelMethod, decisionTableMethod,
  ownedModule, planStep, queryDataflowMethod
} from '../../../../../src/architecture/index.mjs';
import analysis from '../theory/rules/rule-analysis.mjs';

const select = planStep('select-grounded-records')
  .obligations('RET-EVIDENCE')
  .shapes(FINITE_PATTERN_MATCHING)
  .outputs(capabilityRef('GroundedRetentionRecords'))
  .methods(queryDataflowMethod)
  .reuse(architectureRef('query', 'semantic-store.instancesOf'))
  .owner('nll-author-circuits')
  .rationale('Finite typed selection preserves exact LongText claim anchors and explicit record identity.')
  .seal();

const compare = planStep('compare-duration')
  .obligations('RET-LIMIT')
  .shapes(QUANTITATIVE_CONSTRAINT)
  .inputs(capabilityRef('GroundedRetentionRecords'))
  .outputs(capabilityRef('DurationComparison'))
  .methods(constraintKernelMethod)
  .reuse(architectureRef('engine', 'constraint-kernel'))
  .dependsOn('select-grounded-records')
  .owner('nll-author-circuits')
  .rationale('The inclusive five-year boundary is a bounded quantitative comparison.')
  .seal();

const resolve = planStep('resolve-documented-exception')
  .obligations('RET-EXCEPTION', 'RET-COVERAGE')
  .shapes(FINITE_PATTERN_MATCHING)
  .inputs(capabilityRef('GroundedRetentionRecords'))
  .outputs(capabilityRef('ExceptionTruth'))
  .methods(queryDataflowMethod)
  .reuse(architectureRef('query', 'typed-exception-coverage-evidence'))
  .dependsOn('select-grounded-records')
  .owner('nll-author-circuits')
  .rationale('Exception presence and exact scope closure are finite, source-grounded store queries.')
  .seal();

const classify = planStep('classify-retention-status')
  .obligations('RET-LIMIT', 'RET-EXCEPTION', 'RET-COVERAGE', 'RET-EVIDENCE')
  .shapes(FINITE_DECISION)
  .signals(EXPLICIT_UNKNOWNS, REVIEWABILITY_REQUIRED)
  .inputs(capabilityRef('DurationComparison'), capabilityRef('ExceptionTruth'))
  .outputs(capabilityRef('RetentionAssessment'))
  .methods(decisionTableMethod)
  .create('circuits/retention.circuit.mjs')
  .dependsOn('compare-duration', 'resolve-documented-exception')
  .owner('nll-author-circuits')
  .rationale('An explicit finite table preserves SATISFIED, VIOLATED, ACCEPTED_EXCEPTION, UNKNOWN, and CONFLICT.')
  .seal();

export default circuitArchitecturePlan('privacy.retention.evaluation.plan@1')
  .sourceRule(analysis)
  .goal(capabilityRef('RetentionAssessment'))
  .assurance(ABSTRACT, SYMBOLIC)
  .steps(select, compare, resolve, classify)
  .compose(circuitRef('privacy.retention.root@1'))
  .deriveMaterializationProfile('materialization/retention.profile.mjs')
  .benchmarkGoals(
    'five-year-boundary', 'documented-exception', 'incomplete-exception', 'open-vs-closed-coverage',
    'duration-conflict', 'exception-conflict', 'exact-evidence', 'ontology-gap'
  )
  .ownership(ownedModule('circuits/retention.circuit.mjs', 'nll-author-circuits'))
  .seal();
