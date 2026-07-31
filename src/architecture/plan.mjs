import { NllError, invariant } from '../core/errors.mjs';
import {
  ArchitectureReference, ArchitectureValue, OwnedModule, SOURCE_FORM, assertInstances, assertUnique,
  freeze, quote, sourceChain, validateId, validateModulePath, validateText
} from './common.mjs';
import { diagnostic } from './diagnostics.mjs';
import {
  CONCRETE, InterpreterMode, MethodCatalog, MethodDescriptor, MethodCondition, ProblemShape,
  methodApplies, methodRequest
} from './methods.mjs';
import { RuleAnalysis } from './rule-analysis.mjs';

class CyclePolicy extends ArchitectureValue {
  constructor(kind, groupId) {
    if (!['fixed-point', 'procedural'].includes(kind)) {
      throw new NllError('invalid-cycle-policy', `Cycle policy must be fixed-point or procedural: ${kind}`);
    }
    super('CyclePolicy', { kind, groupId: validateId(groupId, 'invalid-cycle-group', 'Cycle group') });
  }
  get policyKind() { return this.detail('kind'); }
  get groupId() { return this.detail('groupId'); }
  [SOURCE_FORM]() { return `cyclePolicy(${quote(this.policyKind)},${quote(this.groupId)})`; }
}

class PlanStep extends ArchitectureValue {
  constructor(id, fields) { super('PlanStep', { id, ...fields }); }
  get id() { return this.detail('id'); }
  get obligationIds() { return this.detail('obligationIds'); }
  get problemShapes() { return this.detail('problemShapes'); }
  get signals() { return this.detail('signals'); }
  get inputs() { return this.detail('inputs'); }
  get outputs() { return this.detail('outputs'); }
  get methods() { return this.detail('methods'); }
  get reusedComponents() { return this.detail('reusedComponents'); }
  get createdModules() { return this.detail('createdModules'); }
  get dependencies() { return this.detail('dependencies'); }
  get owner() { return this.detail('owner'); }
  get rationale() { return this.detail('rationale'); }
  get cyclePolicy() { return this.detail('cyclePolicy'); }
  [SOURCE_FORM]() {
    let source = `planStep(${quote(this.id)})`;
    source = sourceChain(source, 'obligations', this.obligationIds);
    source = sourceChain(source, 'shapes', this.problemShapes);
    source = sourceChain(source, 'signals', this.signals);
    source = sourceChain(source, 'inputs', this.inputs);
    source = sourceChain(source, 'outputs', this.outputs);
    source = sourceChain(source, 'methods', this.methods);
    source = sourceChain(source, 'reuse', this.reusedComponents);
    source = sourceChain(source, 'create', this.createdModules);
    source = sourceChain(source, 'dependsOn', this.dependencies);
    if (this.owner) source += `.owner(${quote(this.owner)})`;
    if (this.rationale) source += `.rationale(${quote(this.rationale)})`;
    if (this.cyclePolicy) source += `.cycle(${this.cyclePolicy[SOURCE_FORM]()})`;
    return `${source}.seal()`;
  }
}

class PlanStepBuilder {
  #id;
  #obligations = [];
  #shapes = [];
  #signals = [];
  #inputs = [];
  #outputs = [];
  #methods = [];
  #reuse = [];
  #create = [];
  #dependencies = [];
  #owner = null;
  #rationale = null;
  #cyclePolicy = null;
  #sealed = false;
  constructor(id) { this.#id = validateId(id, 'invalid-plan-step-id', 'Plan step id'); }
  #assertOpen() { if (this.#sealed) throw new NllError('plan-step-sealed', `Plan step ${this.#id} is sealed.`); }
  obligations(...values) { this.#assertOpen(); for (const value of values) validateId(value, 'invalid-obligation-id', 'Obligation id'); this.#obligations.push(...values); return this; }
  shapes(...values) { this.#assertOpen(); assertInstances(values, ProblemShape, 'invalid-step-shape', 'Expected a ProblemShape.'); this.#shapes.push(...values); return this; }
  signals(...values) { this.#assertOpen(); assertInstances(values, MethodCondition, 'invalid-step-signal', 'Expected a MethodCondition.'); this.#signals.push(...values); return this; }
  inputs(...values) { this.#assertOpen(); assertInstances(values, ArchitectureReference, 'invalid-step-input', 'Expected an ArchitectureReference.'); this.#inputs.push(...values); return this; }
  outputs(...values) { this.#assertOpen(); assertInstances(values, ArchitectureReference, 'invalid-step-output', 'Expected an ArchitectureReference.'); this.#outputs.push(...values); return this; }
  methods(...values) { this.#assertOpen(); assertInstances(values, MethodDescriptor, 'invalid-step-method', 'Expected a MethodDescriptor.'); this.#methods.push(...values); return this; }
  reuse(...values) { this.#assertOpen(); assertInstances(values, ArchitectureReference, 'invalid-reused-component', 'Expected an ArchitectureReference.'); this.#reuse.push(...values); return this; }
  create(...values) { this.#assertOpen(); for (const value of values) validateModulePath(value); this.#create.push(...values); return this; }
  dependsOn(...values) { this.#assertOpen(); for (const value of values) validateId(value, 'invalid-step-dependency', 'Step dependency'); this.#dependencies.push(...values); return this; }
  owner(value) { this.#assertOpen(); this.#owner = validateId(value, 'invalid-owner', 'Step owner'); return this; }
  rationale(value) { this.#assertOpen(); this.#rationale = validateText(value, 'invalid-step-rationale', 'Step rationale'); return this; }
  cycle(value) { this.#assertOpen(); invariant(value instanceof CyclePolicy, 'invalid-cycle-policy', 'Expected a CyclePolicy.'); this.#cyclePolicy = value; return this; }
  seal() {
    this.#assertOpen();
    invariant(this.#obligations.length > 0, 'missing-step-obligation', `Plan step ${this.#id} maps no rule obligations.`);
    invariant(this.#shapes.length > 0, 'missing-step-shape', `Plan step ${this.#id} has no ProblemShape.`);
    invariant(this.#outputs.length > 0, 'missing-step-output', `Plan step ${this.#id} has no output.`);
    invariant(this.#methods.length > 0, 'missing-step-method', `Plan step ${this.#id} has no chosen method.`);
    for (const values of [this.#shapes, this.#signals, this.#inputs, this.#outputs, this.#methods, this.#reuse]) {
      assertUnique(values, (value) => value.id, 'duplicate-step-entry', `entry in plan step ${this.#id}`);
    }
    for (const values of [this.#obligations, this.#create, this.#dependencies]) {
      assertUnique(values, (value) => value, 'duplicate-step-entry', `entry in plan step ${this.#id}`);
    }
    this.#sealed = true;
    return new PlanStep(this.#id, {
      obligationIds: freeze(this.#obligations), problemShapes: freeze(this.#shapes), signals: freeze(this.#signals),
      inputs: freeze(this.#inputs), outputs: freeze(this.#outputs), methods: freeze(this.#methods),
      reusedComponents: freeze(this.#reuse), createdModules: freeze(this.#create),
      dependencies: freeze(this.#dependencies), owner: this.#owner, rationale: this.#rationale,
      cyclePolicy: this.#cyclePolicy
    });
  }
}

class CircuitArchitecturePlan extends ArchitectureValue {
  constructor(id, fields) { super('CircuitArchitecturePlan', { id, ...fields }); }
  get id() { return this.detail('id'); }
  get sourceRule() { return this.detail('sourceRule'); }
  get goal() { return this.detail('goal'); }
  get assurance() { return this.detail('assurance'); }
  get steps() { return this.detail('steps'); }
  get rootCircuit() { return this.detail('rootCircuit'); }
  get materializationModule() { return this.detail('materializationModule'); }
  get benchmarkGoals() { return this.detail('benchmarkGoals'); }
  get ownership() { return this.detail('ownership'); }
  step(id) { return this.steps.find((value) => value.id === id); }
  [SOURCE_FORM]() {
    let source = `circuitArchitecturePlan(${quote(this.id)})`
      + `.sourceRule(${this.sourceRule[SOURCE_FORM]()})`
      + `.goal(${this.goal[SOURCE_FORM]()})`;
    source = sourceChain(source, 'assurance', this.assurance);
    source = sourceChain(source, 'steps', this.steps);
    source += `.compose(${this.rootCircuit[SOURCE_FORM]()})`;
    source += `.deriveMaterializationProfile(${quote(this.materializationModule)})`;
    source = sourceChain(source, 'benchmarkGoals', this.benchmarkGoals);
    source = sourceChain(source, 'ownership', this.ownership);
    return `${source}.seal()`;
  }
}

class CircuitArchitecturePlanBuilder {
  #id;
  #sourceRule = null;
  #goal = null;
  #assurance = [CONCRETE];
  #steps = [];
  #rootCircuit = null;
  #materializationModule = null;
  #benchmarkGoals = [];
  #ownership = [];
  #sealed = false;
  constructor(id) { this.#id = validateId(id, 'invalid-plan-id', 'Circuit architecture plan id'); }
  #assertOpen() { if (this.#sealed) throw new NllError('plan-sealed', `Circuit architecture plan ${this.#id} is sealed.`); }
  sourceRule(value) { this.#assertOpen(); invariant(value instanceof RuleAnalysis, 'invalid-plan-rule', 'Plan source must be a RuleAnalysis.'); this.#sourceRule = value; return this; }
  goal(value) { this.#assertOpen(); invariant(value instanceof ArchitectureReference && value.referenceKind === 'capability', 'invalid-plan-goal', 'Plan goal must be a capability reference.'); this.#goal = value; return this; }
  assurance(...values) { this.#assertOpen(); assertInstances(values, InterpreterMode, 'invalid-plan-assurance', 'Expected an InterpreterMode.'); this.#assurance = [CONCRETE, ...values.filter((value) => value.id !== 'CONCRETE')]; return this; }
  steps(...values) { this.#assertOpen(); assertInstances(values, PlanStep, 'invalid-plan-step', 'Expected a PlanStep.'); this.#steps.push(...values); return this; }
  step(...values) { return this.steps(...values); }
  compose(value) { this.#assertOpen(); invariant(value instanceof ArchitectureReference && value.referenceKind === 'circuit', 'invalid-root-circuit', 'Plan root must be a circuit reference.'); this.#rootCircuit = value; return this; }
  deriveMaterializationProfile(value) { this.#assertOpen(); this.#materializationModule = validateModulePath(value); return this; }
  benchmarkGoals(...values) { this.#assertOpen(); for (const value of values) validateId(value, 'invalid-benchmark-goal', 'Benchmark goal'); this.#benchmarkGoals.push(...values); return this; }
  ownership(...values) { this.#assertOpen(); assertInstances(values, OwnedModule, 'invalid-plan-ownership', 'Expected an OwnedModule.'); this.#ownership.push(...values); return this; }
  seal() {
    this.#assertOpen();
    invariant(this.#sourceRule, 'missing-plan-rule', `Plan ${this.#id} has no source rule.`);
    invariant(this.#goal, 'missing-plan-goal', `Plan ${this.#id} has no goal.`);
    invariant(this.#steps.length > 0, 'missing-plan-step', `Plan ${this.#id} has no steps.`);
    invariant(this.#rootCircuit, 'missing-root-circuit', `Plan ${this.#id} has no root circuit.`);
    invariant(this.#materializationModule, 'missing-materialization-profile', `Plan ${this.#id} has no materialization profile path.`);
    invariant(this.#benchmarkGoals.length > 0, 'missing-benchmark-goal', `Plan ${this.#id} has no benchmark goals.`);
    assertUnique(this.#steps, (value) => value.id, 'duplicate-plan-step', 'plan step');
    assertUnique(this.#assurance, (value) => value.id, 'duplicate-plan-assurance', 'plan assurance mode');
    assertUnique(this.#benchmarkGoals, (value) => value, 'duplicate-benchmark-goal', 'benchmark goal');
    this.#sealed = true;
    return new CircuitArchitecturePlan(this.#id, {
      sourceRule: this.#sourceRule, goal: this.#goal, assurance: freeze(this.#assurance), steps: freeze(this.#steps),
      rootCircuit: this.#rootCircuit, materializationModule: this.#materializationModule,
      benchmarkGoals: freeze(this.#benchmarkGoals), ownership: freeze(this.#ownership)
    });
  }
}

function checkArchitecturePlan(plan, catalog) {
  invariant(plan instanceof CircuitArchitecturePlan, 'invalid-plan', 'Expected a CircuitArchitecturePlan.');
  invariant(catalog instanceof MethodCatalog, 'invalid-method-catalog', 'Expected a MethodCatalog.');
  const diagnostics = [];
  const mapped = new Set(plan.steps.flatMap((step) => step.obligationIds));
  for (const obligation of plan.sourceRule.obligations) {
    if (!mapped.has(obligation.id)) diagnostics.push(planDiagnostic(
      'PLAN_UNMAPPED_RULE_OBLIGATION', `Rule obligation ${obligation.id} is not mapped to a plan step.`, obligation.id
    ));
  }
  for (const step of plan.steps) checkStepMethods(plan, step, catalog, diagnostics);
  checkCycles(plan, diagnostics);
  checkOwnership(plan, diagnostics);
  return freeze(diagnostics);
}

function checkStepMethods(plan, step, catalog, diagnostics) {
  const requestBuilder = methodRequest(`${plan.id}:${step.id}`).shapes(...step.problemShapes).signals(...step.signals)
    .assurance(...plan.assurance);
  const request = requestBuilder.seal();
  const covered = new Set();
  for (const selected of step.methods) {
    const registered = catalog.method(selected.id);
    if (!registered || registered[SOURCE_FORM]() !== selected[SOURCE_FORM]() || !methodApplies(selected, request)) {
      diagnostics.push(planDiagnostic('METHOD_NOT_APPLICABLE',
        `Method ${selected.id} is not applicable to plan step ${step.id}.`, step.id));
      continue;
    }
    for (const shape of selected.problemShapes) {
      if (step.problemShapes.some((value) => value.id === shape.id)) covered.add(shape.id);
    }
  }
  const missing = step.problemShapes.filter((shape) => !covered.has(shape.id));
  if (missing.length) diagnostics.push(planDiagnostic('METHOD_NOT_APPLICABLE',
    `Chosen methods do not cover every ProblemShape in ${step.id}.`, step.id,
    step.problemShapes.map((shape) => shape.id).join(','), missing.map((shape) => shape.id).join(',')));
}

function checkCycles(plan, diagnostics) {
  const stepIds = new Set(plan.steps.map((step) => step.id));
  for (const step of plan.steps) {
    const missing = step.dependencies.filter((id) => !stepIds.has(id));
    if (missing.length) diagnostics.push(planDiagnostic('UNCLASSIFIED_CAPABILITY_CYCLE',
      `Plan step ${step.id} depends on unknown steps: ${missing.join(', ')}.`, step.id));
  }
  for (const component of stronglyConnected(plan.steps)) {
    const cyclic = component.length > 1 || component[0].dependencies.includes(component[0].id);
    if (!cyclic) continue;
    const policies = component.map((step) => step.cyclePolicy);
    const first = policies[0];
    if (!first || policies.some((value) => !value || value.policyKind !== first.policyKind || value.groupId !== first.groupId)) {
      diagnostics.push(planDiagnostic('UNCLASSIFIED_CAPABILITY_CYCLE',
        `Capability cycle ${component.map((step) => step.id).sort().join(' -> ')} lacks one explicit shared policy.`,
        component.map((step) => step.id).sort().join(',')));
    }
  }
}

function stronglyConnected(steps) {
  const byId = new Map(steps.map((step) => [step.id, step]));
  const indexById = new Map();
  const lowById = new Map();
  const stack = [];
  const onStack = new Set();
  const components = [];
  let index = 0;
  function visit(step) {
    indexById.set(step.id, index); lowById.set(step.id, index); index += 1; stack.push(step); onStack.add(step.id);
    for (const id of step.dependencies) {
      const target = byId.get(id); if (!target) continue;
      if (!indexById.has(id)) { visit(target); lowById.set(step.id, Math.min(lowById.get(step.id), lowById.get(id))); }
      else if (onStack.has(id)) lowById.set(step.id, Math.min(lowById.get(step.id), indexById.get(id)));
    }
    if (lowById.get(step.id) !== indexById.get(step.id)) return;
    const component = [];
    let value;
    do { value = stack.pop(); onStack.delete(value.id); component.push(value); } while (value !== step);
    components.push(component);
  }
  for (const step of steps) if (!indexById.has(step.id)) visit(step);
  return components;
}

function checkOwnership(plan, diagnostics) {
  for (const step of plan.steps) {
    if (!step.owner) diagnostics.push(planDiagnostic('PLAN_OWNERSHIP_MISMATCH',
      `Plan step ${step.id} has no owner.`, step.id));
    for (const path of step.createdModules) {
      const entries = plan.ownership.filter((entry) => entry.path === path);
      if (entries.length !== 1 || entries[0].owner !== step.owner) diagnostics.push(planDiagnostic(
        'PLAN_OWNERSHIP_MISMATCH', `Created module ${path} is not owned exactly once by ${step.owner || 'an assigned skill'}.`,
        step.id, step.owner || 'one owner', entries.map((entry) => entry.owner).join(',') || 'unowned'
      ));
    }
  }
}

function planDiagnostic(code, message, subject, expected = null, received = null) {
  const builder = diagnostic(code, message).subject(subject).gate('G3');
  if (expected) builder.expected(expected);
  if (received) builder.received(received);
  return builder.seal();
}

const cyclePolicy = (kind, groupId) => new CyclePolicy(kind, groupId);
const fixedPointCycle = (groupId) => cyclePolicy('fixed-point', groupId);
const proceduralCycle = (groupId) => cyclePolicy('procedural', groupId);
const planStep = (id) => new PlanStepBuilder(id);
const circuitArchitecturePlan = (id) => new CircuitArchitecturePlanBuilder(id);

export {
  CircuitArchitecturePlan, CircuitArchitecturePlanBuilder, CyclePolicy, PlanStep, PlanStepBuilder,
  checkArchitecturePlan, circuitArchitecturePlan, cyclePolicy, fixedPointCycle, planStep, proceduralCycle
};
