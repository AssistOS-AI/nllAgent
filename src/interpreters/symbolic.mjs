import { invariant } from '../core/errors.mjs';

const COMPARATORS = Object.freeze(['>', '>=', '<', '<=', '===', '!==']);
const NEGATED_COMPARATOR = new Map([
  ['>', '<='], ['>=', '<'], ['<', '>='], ['<=', '>'], ['===', '!=='], ['!==', '===']
]);

class SymbolicValue {
  #kind;

  constructor(kind) {
    this.#kind = kind;
    Object.freeze(this);
  }

  get kind() { return this.#kind; }
}

class SymbolicVariable extends SymbolicValue {
  #name;

  constructor(name) {
    super('SymbolicVariable');
    invariant(typeof name === 'string' && name.length > 0, 'invalid-symbolic-variable',
      'Symbolic variable name must be a non-empty string.');
    this.#name = name;
  }

  get name() { return this.#name; }
  evaluate(assignments) { return assignments.get(this.#name); }
}

class SymbolicConstant extends SymbolicValue {
  #value;

  constructor(value) {
    super('SymbolicConstant');
    this.#value = value;
  }

  get value() { return this.#value; }
  evaluate() { return this.#value; }
}

class SymbolicBoundary extends SymbolicValue {
  #variable;
  #value;

  constructor(variable, value) {
    super('SymbolicBoundary');
    this.#variable = variable;
    this.#value = value;
  }

  get variable() { return this.#variable; }
  get value() { return this.#value; }
}

function symbolicValue(value) {
  return value instanceof SymbolicValue ? value : new SymbolicConstant(value);
}

function compare(operator, left, right) {
  if (operator === '>') return left > right;
  if (operator === '>=') return left >= right;
  if (operator === '<') return left < right;
  if (operator === '<=') return left <= right;
  if (operator === '===') return Object.is(left, right);
  return !Object.is(left, right);
}

class SymbolicPredicate extends SymbolicValue {
  #operator;
  #left;
  #right;

  constructor(operator, left, right) {
    super('SymbolicPredicate');
    invariant(COMPARATORS.includes(operator), 'unsupported-symbolic-comparator',
      `Unsupported symbolic comparator: ${operator}`);
    this.#operator = operator;
    this.#left = symbolicValue(left);
    this.#right = symbolicValue(right);
  }

  get operator() { return this.#operator; }
  get left() { return this.#left; }
  get right() { return this.#right; }

  negate() {
    return new SymbolicPredicate(NEGATED_COMPARATOR.get(this.#operator), this.#left, this.#right);
  }

  evaluate(assignments) {
    invariant(assignments instanceof Map, 'invalid-symbolic-assignments',
      'Symbolic predicates require assignments in a Map.');
    return compare(this.#operator, this.#left.evaluate(assignments), this.#right.evaluate(assignments));
  }

  boundary() {
    if (this.#left instanceof SymbolicVariable && this.#right instanceof SymbolicConstant
      && typeof this.#right.value === 'number') {
      return new SymbolicBoundary(this.#left.name, this.#right.value);
    }
    if (this.#right instanceof SymbolicVariable && this.#left instanceof SymbolicConstant
      && typeof this.#left.value === 'number') {
      return new SymbolicBoundary(this.#right.name, this.#left.value);
    }
    return null;
  }
}

class BranchDecision {
  #id;
  #predicate;
  #taken;

  constructor(id, predicate, taken) {
    invariant(typeof id === 'string' && id.length > 0, 'invalid-branch-decision',
      'Branch id must be a non-empty string.');
    invariant(predicate instanceof SymbolicPredicate, 'invalid-branch-predicate',
      `Branch ${id} requires a SymbolicPredicate.`);
    invariant(typeof taken === 'boolean', 'invalid-branch-direction', `Branch ${id} direction must be boolean.`);
    this.#id = id;
    this.#predicate = predicate;
    this.#taken = taken;
    Object.freeze(this);
  }

  get id() { return this.#id; }
  get predicate() { return this.#predicate; }
  get taken() { return this.#taken; }
  get pathPredicate() { return this.#taken ? this.#predicate : this.#predicate.negate(); }
  flip() { return new BranchDecision(this.#id, this.#predicate, !this.#taken); }
}

class PathCondition {
  #decisions;

  constructor(decisions = []) {
    invariant(decisions.every((decision) => decision instanceof BranchDecision),
      'invalid-path-condition', 'PathCondition accepts only BranchDecision values.');
    this.#decisions = Object.freeze([...decisions]);
    Object.freeze(this);
  }

  get decisions() { return this.#decisions; }
  append(decision) { return new PathCondition([...this.#decisions, decision]); }
  satisfiedBy(assignments) {
    return this.#decisions.every((decision) => decision.pathPredicate.evaluate(assignments));
  }
}

class ConcolicTrace {
  #id;
  #decisions;

  constructor(id, decisions) {
    invariant(typeof id === 'string' && id.length > 0, 'invalid-concolic-trace',
      'Concolic trace id must be a non-empty string.');
    invariant(decisions.every((decision) => decision instanceof BranchDecision),
      'invalid-concolic-trace', 'ConcolicTrace accepts only BranchDecision values.');
    this.#id = id;
    this.#decisions = Object.freeze([...decisions]);
    Object.freeze(this);
  }

  get id() { return this.#id; }
  get decisions() { return this.#decisions; }
  get pathCondition() { return new PathCondition(this.#decisions); }
}

const branchKey = (id, taken) => `${id}:${taken ? 'true' : 'false'}`;

class BranchCoverage {
  #keys;

  constructor(decisions = []) {
    invariant(decisions.every((decision) => decision instanceof BranchDecision),
      'invalid-branch-coverage', 'BranchCoverage accepts only BranchDecision values.');
    this.#keys = new Set(decisions.map((decision) => branchKey(decision.id, decision.taken)));
    Object.freeze(this);
  }

  static fromTrace(trace) { return new BranchCoverage(trace.decisions); }
  has(id, taken) { return this.#keys.has(branchKey(id, taken)); }
}

class BranchGoal {
  #traceId;
  #target;
  #condition;

  constructor(traceId, target, condition) {
    this.#traceId = traceId;
    this.#target = target;
    this.#condition = condition;
    Object.freeze(this);
  }

  get traceId() { return this.#traceId; }
  get branchId() { return this.#target.id; }
  get targetTaken() { return this.#target.taken; }
  get targetPredicate() { return this.#target.pathPredicate; }
  get pathCondition() { return this.#condition; }
  get boundary() { return this.#target.predicate.boundary(); }
}

function generateBranchGoals(trace, coverage = BranchCoverage.fromTrace(trace)) {
  invariant(trace instanceof ConcolicTrace, 'invalid-concolic-trace',
    'generateBranchGoals requires a ConcolicTrace.');
  invariant(coverage instanceof BranchCoverage, 'invalid-branch-coverage',
    'generateBranchGoals requires BranchCoverage.');
  const prefix = [];
  const goals = [];
  const generated = new Set();
  for (const decision of trace.decisions) {
    const target = decision.flip();
    const key = branchKey(target.id, target.taken);
    if (!coverage.has(target.id, target.taken) && !generated.has(key)) {
      goals.push(new BranchGoal(trace.id, target, new PathCondition([...prefix, target])));
      generated.add(key);
    }
    prefix.push(decision);
  }
  return Object.freeze(goals);
}

class Witness {
  #id;
  #assignments;
  #pathCondition;
  #expected;

  constructor(id, assignments, pathCondition, expected) {
    invariant(typeof id === 'string' && id.length > 0, 'invalid-witness',
      'Witness id must be a non-empty string.');
    invariant(assignments instanceof Map, 'invalid-witness', 'Witness assignments must be a Map.');
    invariant(pathCondition instanceof PathCondition, 'invalid-witness', 'Witness requires a PathCondition.');
    this.#id = id;
    this.#assignments = new Map(assignments);
    this.#pathCondition = pathCondition;
    this.#expected = expected;
    Object.freeze(this);
  }

  get id() { return this.#id; }
  get assignments() { return new Map(this.#assignments); }
  get pathCondition() { return this.#pathCondition; }
  get expected() { return this.#expected; }
}

class WitnessReplayProtocol {
  #concretize;
  #execute;
  #confirms;

  constructor(concretize, execute, confirms) {
    invariant([concretize, execute, confirms].every((operation) => typeof operation === 'function'),
      'invalid-witness-replay-protocol', 'Witness replay requires concretize, execute, and confirms functions.');
    this.#concretize = concretize;
    this.#execute = execute;
    this.#confirms = confirms;
    Object.freeze(this);
  }

  concretize(witness) { return this.#concretize(witness); }
  execute(concreteCase) { return this.#execute(concreteCase); }
  confirms(result, witness) { return this.#confirms(result, witness); }
}

class WitnessReplayResult {
  #witness;
  #status;
  #result;
  #message;

  constructor(witness, status, result = null, message = null) {
    this.#witness = witness;
    this.#status = status;
    this.#result = result;
    this.#message = message;
    Object.freeze(this);
  }

  get witness() { return this.#witness; }
  get status() { return this.#status; }
  get result() { return this.#result; }
  get message() { return this.#message; }
  get confirmed() { return this.#status === 'CONFIRMED'; }
  get assurance() { return this.confirmed ? 'WITNESSED' : null; }
}

async function replayWitness(witness, protocol) {
  invariant(witness instanceof Witness, 'invalid-witness', 'replayWitness requires a Witness.');
  invariant(protocol instanceof WitnessReplayProtocol, 'invalid-witness-replay-protocol',
    'replayWitness requires a WitnessReplayProtocol.');
  if (!witness.pathCondition.satisfiedBy(witness.assignments)) {
    return new WitnessReplayResult(witness, 'INVALID_ASSIGNMENT', null,
      'Witness assignments do not satisfy the symbolic path condition.');
  }
  try {
    const concreteCase = await protocol.concretize(witness);
    const result = await protocol.execute(concreteCase);
    const confirmed = await protocol.confirms(result, witness);
    return new WitnessReplayResult(witness, confirmed ? 'CONFIRMED' : 'NOT_REPRODUCED', result);
  } catch (error) {
    return new WitnessReplayResult(witness, 'FAILED', null,
      error instanceof Error ? error.message : String(error));
  }
}

function symbolicVariable(name) { return new SymbolicVariable(name); }
function symbolicConstant(value) { return new SymbolicConstant(value); }
function symbolicPredicate(operator, left, right) { return new SymbolicPredicate(operator, left, right); }
function branchDecision(id, predicate, taken) { return new BranchDecision(id, predicate, taken); }
function pathCondition(...decisions) { return new PathCondition(decisions); }
function concolicTrace(id, ...decisions) { return new ConcolicTrace(id, decisions); }
function branchCoverage(...decisions) { return new BranchCoverage(decisions); }
function witness(id, assignments, condition, expected) { return new Witness(id, assignments, condition, expected); }
function witnessReplayProtocol(concretize, execute, confirms) {
  return new WitnessReplayProtocol(concretize, execute, confirms);
}

export {
  BranchCoverage, BranchDecision, BranchGoal, ConcolicTrace, PathCondition, SymbolicBoundary, SymbolicConstant,
  SymbolicPredicate, SymbolicValue, SymbolicVariable, Witness, WitnessReplayProtocol, WitnessReplayResult,
  branchCoverage, branchDecision, concolicTrace, generateBranchGoals, pathCondition, replayWitness,
  symbolicConstant, symbolicPredicate, symbolicVariable, witness, witnessReplayProtocol
};
