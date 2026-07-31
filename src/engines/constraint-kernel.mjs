import { NllError, invariant } from '../core/errors.mjs';

const SAT = 'SAT';
const UNSAT = 'UNSAT';
const UNKNOWN = 'UNKNOWN';
const BOOLEAN = 'BOOLEAN';
const VALUE = 'VALUE';
const NUMBER = 'NUMBER';
const DETAILS = new WeakMap();

class ConstraintValue {
  constructor(kind, details) {
    DETAILS.set(this, Object.freeze({ kind, ...details }));
    Object.freeze(this);
  }
  get kind() { return DETAILS.get(this).kind; }
  detail(name) { return DETAILS.get(this)[name]; }
}

class ConstraintVariable extends ConstraintValue {
  constructor(name, sort = VALUE) {
    invariant(typeof name === 'string' && name.length > 0,
      'invalid-constraint-variable', 'Constraint variable names must be non-empty strings.');
    invariant([BOOLEAN, VALUE, NUMBER].includes(sort),
      'invalid-constraint-sort', `Unsupported constraint sort: ${String(sort)}.`);
    super('ConstraintVariable', { name, sort });
  }
  get name() { return this.detail('name'); }
  get sort() { return this.detail('sort'); }
  get id() { return `${this.sort}:${this.name}`; }
}

class ConstraintConstant extends ConstraintValue {
  constructor(value, sort = VALUE) {
    invariant(sort === VALUE || sort === NUMBER,
      'invalid-constraint-constant', 'Constraint constants must have VALUE or NUMBER sort.');
    invariant(sort !== NUMBER || (typeof value === 'number' && Number.isFinite(value)),
      'invalid-difference-bound', 'Numeric constraint constants must be finite numbers.');
    invariant(['string', 'number', 'boolean', 'bigint'].includes(typeof value) || value === null,
      'invalid-constraint-constant', 'Constraint constants must be scalar values.');
    super('ConstraintConstant', { value, sort });
  }
  get value() { return this.detail('value'); }
  get sort() { return this.detail('sort'); }
}

class BooleanLiteral extends ConstraintValue {
  constructor(variable, positive = true) {
    invariant(variable instanceof ConstraintVariable && variable.sort === BOOLEAN,
      'invalid-boolean-literal', 'Boolean literals require a BOOLEAN constraint variable.');
    invariant(typeof positive === 'boolean',
      'invalid-boolean-literal', 'Boolean literal polarity must be boolean.');
    super('BooleanLiteral', { variable, positive });
  }
  get variable() { return this.detail('variable'); }
  get positive() { return this.detail('positive'); }
}

class BooleanClause extends ConstraintValue {
  constructor(literals) {
    invariant(literals.every((item) => item instanceof BooleanLiteral),
      'invalid-boolean-clause', 'Boolean clauses accept only boolean literals.');
    super('BooleanClause', { literals: Object.freeze([...literals]) });
  }
  get literals() { return this.detail('literals'); }
}

class EqualityAtom extends ConstraintValue {
  constructor(left, right, equal) {
    const normalizedLeft = normalizeTerm(left);
    const normalizedRight = normalizeTerm(right, normalizedLeft.sort);
    invariant(normalizedLeft.sort === normalizedRight.sort && normalizedLeft.sort !== BOOLEAN,
      'constraint-sort-mismatch', 'Equality operands must have the same non-boolean sort.');
    super('EqualityAtom', { left: normalizedLeft, right: normalizedRight, equal });
  }
  get left() { return this.detail('left'); }
  get right() { return this.detail('right'); }
  get equal() { return this.detail('equal'); }
}

class DifferenceAtom extends ConstraintValue {
  constructor(left, right, maximum) {
    invariant(left instanceof ConstraintVariable && left.sort === NUMBER
      && right instanceof ConstraintVariable && right.sort === NUMBER,
    'invalid-difference-variable', 'Difference constraints require NUMBER variables.');
    invariant(typeof maximum === 'number' && Number.isFinite(maximum),
      'invalid-difference-bound', 'Difference bounds must be finite numbers.');
    super('DifferenceAtom', { left, right, maximum });
  }
  get left() { return this.detail('left'); }
  get right() { return this.detail('right'); }
  get maximum() { return this.detail('maximum'); }
}

class UnsupportedAtom extends ConstraintValue {
  constructor(description) {
    invariant(typeof description === 'string' && description.length > 0,
      'invalid-unsupported-atom', 'Unsupported atom descriptions must be non-empty strings.');
    super('UnsupportedAtom', { description });
  }
  get description() { return this.detail('description'); }
}

class ConstraintTraceStep extends ConstraintValue {
  constructor(phase, action, subject, value = undefined) {
    super('ConstraintTraceStep', { phase, action, subject, value });
  }
  get phase() { return this.detail('phase'); }
  get action() { return this.detail('action'); }
  get subject() { return this.detail('subject'); }
  get value() { return this.detail('value'); }
}

class ConstraintResult extends ConstraintValue {
  constructor(status, model, conflict, unsupportedAtoms, trace) {
    super('ConstraintResult', {
      status,
      model: new Map(model),
      conflict,
      unsupportedAtoms: Object.freeze([...unsupportedAtoms]),
      trace: Object.freeze([...trace])
    });
  }
  get status() { return this.detail('status'); }
  get model() { return new Map(this.detail('model')); }
  get conflict() { return this.detail('conflict'); }
  get unsupportedAtoms() { return this.detail('unsupportedAtoms'); }
  get trace() { return this.detail('trace'); }
  valueOf(variable) { return this.detail('model').get(variable.id); }
}

function normalizeTerm(value, expectedSort = undefined) {
  if (value instanceof ConstraintVariable || value instanceof ConstraintConstant) return value;
  const sort = expectedSort || (typeof value === 'number' ? NUMBER : VALUE);
  return new ConstraintConstant(value, sort);
}

function termKey(term) {
  if (term instanceof ConstraintVariable) return `v:${term.id}`;
  return `c:${term.sort}:${typeof term.value}:${String(term.value)}`;
}

function solveBooleans(clauses, trace) {
  const variables = [...new Set(clauses
    .flatMap((clause) => clause.literals.map((literal) => literal.variable.id)))].sort();
  function recurse(assignment) {
    let changed = true;
    while (changed) {
      changed = false;
      for (const clause of clauses) {
        const open = [];
        let satisfied = false;
        for (const literal of clause.literals) {
          const assigned = assignment.get(literal.variable.id);
          if (assigned === undefined) open.push(literal);
          else if (assigned === literal.positive) satisfied = true;
        }
        if (satisfied) continue;
        if (open.length === 0) return undefined;
        if (open.length === 1) {
          const literal = open[0];
          const previous = assignment.get(literal.variable.id);
          if (previous !== undefined && previous !== literal.positive) return undefined;
          if (previous === undefined) {
            assignment.set(literal.variable.id, literal.positive);
            trace.push(new ConstraintTraceStep('boolean', 'unit', literal.variable.id, literal.positive));
            changed = true;
          }
        }
      }
    }
    const undecided = variables.find((name) => !assignment.has(name));
    if (!undecided) return assignment;
    for (const choice of [false, true]) {
      const branch = new Map(assignment);
      branch.set(undecided, choice);
      trace.push(new ConstraintTraceStep('boolean', 'branch', undecided, choice));
      const result = recurse(branch);
      if (result) return result;
    }
    return undefined;
  }
  return recurse(new Map());
}

function solveEqualities(atoms, trace) {
  const parent = new Map();
  const terms = new Map();
  const ensure = (term) => {
    const key = termKey(term);
    if (!parent.has(key)) parent.set(key, key);
    terms.set(key, term);
    return key;
  };
  const find = (key) => {
    let root = key;
    while (parent.get(root) !== root) root = parent.get(root);
    while (parent.get(key) !== key) {
      const next = parent.get(key);
      parent.set(key, root);
      key = next;
    }
    return root;
  };
  const union = (left, right) => {
    const a = find(left);
    const b = find(right);
    if (a === b) return;
    const [root, child] = a < b ? [a, b] : [b, a];
    parent.set(child, root);
  };
  for (const atom of atoms.filter((item) => item.equal)) {
    const left = ensure(atom.left);
    const right = ensure(atom.right);
    union(left, right);
    trace.push(new ConstraintTraceStep('equality', 'union', `${left}=${right}`));
  }
  for (const atom of atoms.filter((item) => !item.equal)) {
    const left = ensure(atom.left);
    const right = ensure(atom.right);
    if (find(left) === find(right)) return { conflict: `${left} must differ from ${right}` };
  }
  const classes = new Map();
  for (const [key, term] of terms) {
    const root = find(key);
    if (!classes.has(root)) classes.set(root, []);
    classes.get(root).push(term);
  }
  const model = new Map();
  for (const [root, members] of classes) {
    const constants = members.filter((term) => term instanceof ConstraintConstant);
    const distinct = new Set(constants.map(termKey));
    if (distinct.size > 1) return { conflict: `Equality class ${root} contains distinct constants` };
    const value = constants.length > 0 ? constants[0].value : root;
    for (const term of members) if (term instanceof ConstraintVariable) model.set(term.id, value);
  }
  return { model };
}

function numericEdges(atoms, unsupportedAtoms) {
  const edges = [];
  const variables = new Map();
  const zero = 'NUMBER:$zero';
  variables.set(zero, zero);
  const addEdge = (from, to, weight, subject) => edges.push({ from, to, weight, subject });
  const variableKey = (term) => {
    variables.set(term.id, term);
    return term.id;
  };
  for (const atom of atoms) {
    if (atom instanceof DifferenceAtom) {
      addEdge(variableKey(atom.right), variableKey(atom.left), atom.maximum,
        `${atom.left.name}-${atom.right.name}<=${atom.maximum}`);
      continue;
    }
    if (atom.left.sort !== NUMBER) continue;
    if (!atom.equal) {
      unsupportedAtoms.push(new UnsupportedAtom('numeric disequality'));
      continue;
    }
    const { left, right } = atom;
    if (left instanceof ConstraintConstant && right instanceof ConstraintConstant) {
      if (left.value !== right.value) addEdge(zero, zero, -1, `${left.value}=${right.value}`);
      continue;
    }
    if (left instanceof ConstraintVariable && right instanceof ConstraintVariable) {
      const a = variableKey(left);
      const b = variableKey(right);
      addEdge(b, a, 0, `${left.name}=${right.name}`);
      addEdge(a, b, 0, `${right.name}=${left.name}`);
      continue;
    }
    const variable = left instanceof ConstraintVariable ? left : right;
    const constant = left instanceof ConstraintConstant ? left : right;
    const key = variableKey(variable);
    addEdge(zero, key, constant.value, `${variable.name}<=${constant.value}`);
    addEdge(key, zero, -constant.value, `${variable.name}>=${constant.value}`);
  }
  return { edges, variables, zero };
}

function solveDifferences(atoms, unsupportedAtoms, trace) {
  const { edges, variables, zero } = numericEdges(atoms, unsupportedAtoms);
  const distances = new Map([...variables.keys()].map((key) => [key, 0]));
  let last;
  for (let round = 0; round < variables.size; round += 1) {
    last = undefined;
    for (const edge of edges) {
      const candidate = distances.get(edge.from) + edge.weight;
      if (candidate < distances.get(edge.to)) {
        distances.set(edge.to, candidate);
        last = edge;
        trace.push(new ConstraintTraceStep('difference', 'relax', edge.subject, candidate));
      }
    }
    if (!last) break;
  }
  if (last) return { conflict: `Negative difference cycle includes ${last.subject}` };
  const offset = distances.get(zero);
  const model = new Map();
  for (const [key, variable] of variables) {
    if (key !== zero) model.set(variable.id, distances.get(key) - offset);
  }
  return { model };
}

class ConstraintKernel {
  solve(constraints) {
    invariant(Array.isArray(constraints), 'invalid-constraint-set', 'ConstraintKernel.solve expects an array.');
    const trace = [];
    const unsupportedAtoms = constraints.filter((item) => item instanceof UnsupportedAtom);
    const recognized = constraints.every((item) => item instanceof BooleanLiteral
      || item instanceof BooleanClause || item instanceof EqualityAtom
      || item instanceof DifferenceAtom || item instanceof UnsupportedAtom);
    if (!recognized) throw new NllError('invalid-constraint-atom', 'ConstraintKernel received an unrecognized atom.');
    const clauses = constraints.flatMap((item) => {
      if (item instanceof BooleanLiteral) return [new BooleanClause([item])];
      return item instanceof BooleanClause ? [item] : [];
    });
    const booleanModel = solveBooleans(clauses, trace);
    if (!booleanModel) {
      trace.push(new ConstraintTraceStep('boolean', 'conflict', 'clauses'));
      return new ConstraintResult(UNSAT, new Map(), 'Boolean clauses are inconsistent.', unsupportedAtoms, trace);
    }
    const equalityAtoms = constraints.filter((item) => item instanceof EqualityAtom && item.left.sort === VALUE);
    const equality = solveEqualities(equalityAtoms, trace);
    if (equality.conflict) {
      trace.push(new ConstraintTraceStep('equality', 'conflict', equality.conflict));
      return new ConstraintResult(UNSAT, new Map(), equality.conflict, unsupportedAtoms, trace);
    }
    const numericAtoms = constraints.filter((item) => item instanceof DifferenceAtom
      || (item instanceof EqualityAtom && item.left.sort === NUMBER));
    const difference = solveDifferences(numericAtoms, unsupportedAtoms, trace);
    if (difference.conflict) {
      trace.push(new ConstraintTraceStep('difference', 'conflict', difference.conflict));
      return new ConstraintResult(UNSAT, new Map(), difference.conflict, unsupportedAtoms, trace);
    }
    const model = new Map([...booleanModel, ...equality.model, ...difference.model]);
    if (unsupportedAtoms.length > 0) {
      const descriptions = unsupportedAtoms.map((atom) => atom.description).join(', ');
      trace.push(new ConstraintTraceStep('kernel', 'unsupported', descriptions));
      return new ConstraintResult(UNKNOWN, model, undefined, unsupportedAtoms, trace);
    }
    trace.push(new ConstraintTraceStep('kernel', 'model', `${model.size} assignments`));
    return new ConstraintResult(SAT, model, undefined, [], trace);
  }
}

function constraintVariable(name, sort) { return new ConstraintVariable(name, sort); }
function booleanVariable(name) { return new ConstraintVariable(name, BOOLEAN); }
function numberVariable(name) { return new ConstraintVariable(name, NUMBER); }
function constraintConstant(value, sort) { return new ConstraintConstant(value, sort); }
function booleanLiteral(variable, positive = true) { return new BooleanLiteral(variable, positive); }
function booleanClause(...literals) { return new BooleanClause(literals); }
function equal(left, right) { return new EqualityAtom(left, right, true); }
function notEqual(left, right) { return new EqualityAtom(left, right, false); }
function differenceAtMost(left, right, maximum) {
  return new DifferenceAtom(left, right, maximum);
}
function unsupportedConstraint(description) { return new UnsupportedAtom(description); }

export {
  BOOLEAN, NUMBER, SAT, UNKNOWN, UNSAT, VALUE, BooleanClause, BooleanLiteral, ConstraintConstant,
  ConstraintKernel, ConstraintResult, ConstraintTraceStep, ConstraintVariable, DifferenceAtom,
  EqualityAtom, UnsupportedAtom, booleanClause, booleanLiteral, booleanVariable, constraintConstant,
  constraintVariable, differenceAtMost, equal, notEqual, numberVariable, unsupportedConstraint
};
