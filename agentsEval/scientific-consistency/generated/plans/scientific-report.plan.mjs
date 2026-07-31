import {
  EQUIVALENCE_NORMALIZATION,
  EXPLICIT_UNKNOWNS,
  FINITE_DECISION,
  FINITE_PATTERN_MATCHING,
  QUANTITATIVE_CONSTRAINT,
  REVIEWABILITY_REQUIRED,
  capabilityRef,
  circuitArchitecturePlan,
  circuitRef,
  constraintKernelMethod,
  decisionTableMethod,
  eGraphMethod,
  ownedModule,
  planStep,
  queryDataflowMethod
} from '../../../../src/architecture/index.mjs';
import ruleAnalysis from '../theory/rules/scientific-report-control.rules.mjs';

const selectClaims = planStep('select-claims')
  .obligations('SCI-001', 'SCI-003', 'SCI-004')
  .shapes(FINITE_PATTERN_MATCHING)
  .outputs(capabilityRef('quantitative-claim-set'))
  .methods(queryDataflowMethod)
  .reuse(circuitRef('sdk:semantic.query@1'))
  .create('circuits/scientific-consistency.circuit.mjs')
  .owner('nll-train-agent')
  .rationale('The SemanticStore query primitive selects typed claims without exposing physical indexes.')
  .seal();

const normalizeDimensions = planStep('normalize-dimensions')
  .obligations('SCI-001', 'SCI-002')
  .shapes(EQUIVALENCE_NORMALIZATION)
  .inputs(capabilityRef('quantitative-claim-set'))
  .outputs(capabilityRef('canonical-claim-dimensions'))
  .methods(eGraphMethod)
  .reuse(circuitRef('sdk:egraph.normalize@1'))
  .create('assurance/metric-normalization.mjs')
  .dependsOn('select-claims')
  .owner('nll-train-agent')
  .rationale('A bounded typed rewrite theory canonicalizes metric aliases without changing relative versus absolute meaning.')
  .seal();

const compareValues = planStep('compare-normalized-values')
  .obligations('SCI-002')
  .shapes(QUANTITATIVE_CONSTRAINT)
  .inputs(capabilityRef('canonical-claim-dimensions'))
  .outputs(capabilityRef('numeric-overlap-result'))
  .methods(constraintKernelMethod)
  .reuse(circuitRef('sdk:constraints.solve@1'))
  .create('circuits/scientific-consistency.circuit.mjs')
  .dependsOn('normalize-dimensions')
  .owner('nll-train-agent')
  .rationale('The shared ConstraintKernel establishes equality or conflict for bounded normalized point estimates.')
  .seal();

const decideAssessment = planStep('decide-assessment')
  .obligations('SCI-001', 'SCI-002', 'SCI-003', 'SCI-004')
  .shapes(FINITE_DECISION)
  .signals(EXPLICIT_UNKNOWNS, REVIEWABILITY_REQUIRED)
  .inputs(capabilityRef('canonical-claim-dimensions'), capabilityRef('numeric-overlap-result'))
  .outputs(capabilityRef('scientific-consistency-assessment'))
  .methods(decisionTableMethod)
  .reuse(circuitRef('sdk:decision.evaluate@1'))
  .create('circuits/scientific-consistency.circuit.mjs')
  .dependsOn('compare-normalized-values')
  .owner('nll-train-agent')
  .rationale('The finite table keeps non-applicability, unknown, conflict, satisfaction, and violation distinct.')
  .seal();

export default circuitArchitecturePlan('eval.scientific-report.plan@1')
  .sourceRule(ruleAnalysis)
  .goal(capabilityRef('scientific-consistency-assessment'))
  .steps(selectClaims, normalizeDimensions, compareValues, decideAssessment)
  .compose(circuitRef('eval.scientific-report.consistency@1'))
  .deriveMaterializationProfile('materialization/scientific.profile.mjs')
  .benchmarkGoals(
    'equivalent-percent-proportion', 'compatible-conflict', 'different-metric', 'different-population',
    'different-aggregation', 'different-horizon', 'unknown-dimension', 'dimension-conflict',
    'open-coverage', 'closed-coverage', 'rounding-boundary', 'semantic-mutations'
  )
  .ownership(
    ownedModule('circuits/scientific-consistency.circuit.mjs', 'nll-train-agent'),
    ownedModule('assurance/metric-normalization.mjs', 'nll-train-agent')
  )
  .seal();
