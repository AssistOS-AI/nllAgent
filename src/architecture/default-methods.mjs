import { capabilityRef } from './common.mjs';
import {
  ABSTRACT, CONCOLIC, CONCRETE, PROVE, SYMBOLIC, SYNTHESIZE, method, methodCatalog, methodCondition,
  problemShape
} from './methods.mjs';

const FINITE_PATTERN_MATCHING = problemShape('finite-pattern-matching');
const FINITE_DECISION = problemShape('finite-decision');
const QUANTITATIVE_CONSTRAINT = problemShape('quantitative-constraint');
const TEMPORAL_CONSTRAINT = problemShape('temporal-constraint');
const RECURSIVE_RELATION = problemShape('recursive-relation');
const EQUIVALENCE_NORMALIZATION = problemShape('equivalence-normalization');
const AMBIGUITY_REQUIRING_WITNESS = problemShape('ambiguity-requiring-witness');
const REFINEMENT_DEMAND = problemShape('refinement-demand');
const LOCAL_INVARIANT = problemShape('local-invariant');
const REPAIR_SYNTHESIS = problemShape('repair-synthesis');
const IRREGULAR_PROCEDURE = problemShape('irregular-procedure');

const EXPLICIT_UNKNOWNS = methodCondition('explicit-unknowns');
const REVIEWABILITY_REQUIRED = methodCondition('reviewability-required');
const UNBOUNDED_PROCEDURAL_STATE = methodCondition('unbounded-procedural-state');
const ANALYSIS_CROSSES_STEP = methodCondition('analysis-crosses-step');

const queryDataflowMethod = method('query-dataflow')
  .appliesTo(FINITE_PATTERN_MATCHING)
  .provides(capabilityRef('finite-query-result'))
  .supports(CONCRETE, ABSTRACT, SYMBOLIC)
  .engine('semantic-store-query')
  .complexity(0)
  .seal();

const decisionTableMethod = method('finite-decision-table')
  .appliesTo(FINITE_DECISION)
  .requires(EXPLICIT_UNKNOWNS)
  .provides(capabilityRef('decision-result'), capabilityRef('decision-trace'))
  .supports(CONCRETE, ABSTRACT, SYMBOLIC, PROVE)
  .preferWhen(REVIEWABILITY_REQUIRED)
  .rejectWhen(UNBOUNDED_PROCEDURAL_STATE)
  .diagnostics('UNREACHABLE_DECISION_ROW', 'OVERLAPPING_INCOMPATIBLE_ROWS', 'UNHANDLED_UNKNOWN')
  .engine('decision-table')
  .complexity(1)
  .seal();

const constraintKernelMethod = method('constraint-kernel')
  .appliesTo(QUANTITATIVE_CONSTRAINT, TEMPORAL_CONSTRAINT)
  .provides(capabilityRef('constraint-result'))
  .supports(CONCRETE, ABSTRACT, SYMBOLIC, CONCOLIC, PROVE)
  .engine('constraint-kernel')
  .complexity(2)
  .seal();

const relationEngineMethod = method('relation-engine')
  .appliesTo(RECURSIVE_RELATION)
  .provides(capabilityRef('relation-closure'))
  .supports(CONCRETE, ABSTRACT, SYMBOLIC)
  .engine('relation-engine')
  .complexity(2)
  .seal();

const eGraphMethod = method('egraph-lite')
  .appliesTo(EQUIVALENCE_NORMALIZATION)
  .provides(capabilityRef('canonical-semantic-form'))
  .supports(CONCRETE, ABSTRACT, PROVE)
  .engine('egraph-lite')
  .complexity(2)
  .seal();

const symbolicWitnessMethod = method('symbolic-witness')
  .appliesTo(AMBIGUITY_REQUIRING_WITNESS)
  .provides(capabilityRef('replayable-witness'))
  .supports(CONCRETE, ABSTRACT, SYMBOLIC, CONCOLIC)
  .engine('symbolic-interpreter')
  .complexity(3)
  .seal();

const cegarMethod = method('cegar-refinement')
  .appliesTo(REFINEMENT_DEMAND)
  .provides(capabilityRef('refinement-demand'))
  .supports(CONCRETE, ABSTRACT, SYMBOLIC)
  .engine('refinement-manager')
  .complexity(3)
  .seal();

const proofKernelMethod = method('proof-kernel')
  .appliesTo(LOCAL_INVARIANT)
  .provides(capabilityRef('local-certificate'))
  .supports(CONCRETE, PROVE)
  .engine('proof-kernel')
  .complexity(3)
  .seal();

const synthesisMethod = method('synthesis-engine')
  .appliesTo(REPAIR_SYNTHESIS)
  .provides(capabilityRef('validated-repair'))
  .supports(CONCRETE, SYNTHESIZE)
  .engine('synthesis-engine')
  .complexity(3)
  .seal();

const javascriptMacroMethod = method('javascript-macro-node')
  .appliesTo(IRREGULAR_PROCEDURE)
  .provides(capabilityRef('procedural-result'))
  .supports(CONCRETE, ABSTRACT, SYMBOLIC)
  .preferWhen(ANALYSIS_CROSSES_STEP)
  .engine('javascript')
  .complexity(4)
  .seal();

const DEFAULT_METHOD_CATALOG = methodCatalog('nll.core-methods@1',
  queryDataflowMethod, decisionTableMethod, constraintKernelMethod, relationEngineMethod, eGraphMethod,
  symbolicWitnessMethod, cegarMethod, proofKernelMethod, synthesisMethod, javascriptMacroMethod
).seal();

export {
  AMBIGUITY_REQUIRING_WITNESS, ANALYSIS_CROSSES_STEP, DEFAULT_METHOD_CATALOG,
  EQUIVALENCE_NORMALIZATION, EXPLICIT_UNKNOWNS, FINITE_DECISION, FINITE_PATTERN_MATCHING,
  IRREGULAR_PROCEDURE, LOCAL_INVARIANT, QUANTITATIVE_CONSTRAINT, RECURSIVE_RELATION,
  REFINEMENT_DEMAND, REPAIR_SYNTHESIS, REVIEWABILITY_REQUIRED, TEMPORAL_CONSTRAINT,
  UNBOUNDED_PROCEDURAL_STATE, cegarMethod, constraintKernelMethod, decisionTableMethod, eGraphMethod,
  javascriptMacroMethod, proofKernelMethod, queryDataflowMethod, relationEngineMethod,
  symbolicWitnessMethod, synthesisMethod
};
