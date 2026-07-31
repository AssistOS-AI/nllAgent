import { NllError, invariant } from '../core/errors.mjs';

const SATURATED = 'SATURATED';
const LIMIT_REACHED = 'LIMIT_REACHED';
const DETAILS = new WeakMap();
const GRAPH_STATE = new WeakMap();
let nextGraphId = 1;

class EGraphValue {
  constructor(kind, details) {
    DETAILS.set(this, Object.freeze({ kind, ...details }));
    Object.freeze(this);
  }
  get kind() { return DETAILS.get(this).kind; }
  detail(name) { return DETAILS.get(this)[name]; }
}

function validName(value) { return typeof value === 'string' && value.length > 0; }
function validScalar(value) {
  return ['string', 'number', 'boolean', 'bigint'].includes(typeof value) || value === null;
}

class EOperator extends EGraphValue {
  constructor(name, resultType, operandTypes) {
    invariant(validName(name) && validName(resultType) && operandTypes.every(validName),
      'invalid-egraph-operator', 'E-graph operators require names and named input/output types.');
    super('EOperator', { name, resultType, operandTypes: Object.freeze([...operandTypes]) });
  }
  get name() { return this.detail('name'); }
  get resultType() { return this.detail('resultType'); }
  get operandTypes() { return this.detail('operandTypes'); }
  get id() { return `${this.name}:${this.operandTypes.join(',')}->${this.resultType}`; }
}

class ETerm extends EGraphValue {
  constructor(type, operator, children, value, leaf) {
    if (leaf) {
      invariant(validName(type) && validScalar(value),
        'invalid-egraph-literal', 'E-graph literals require a type and deterministic scalar value.');
    } else {
      invariant(operator instanceof EOperator && children.length === operator.operandTypes.length,
        'invalid-egraph-term', 'E-graph term arity does not match its operator.');
      for (let index = 0; index < children.length; index += 1) {
        invariant(children[index] instanceof ETerm && children[index].type === operator.operandTypes[index],
          'egraph-type-mismatch', `${operator.name} operand ${index + 1} requires ${operator.operandTypes[index]}.`);
      }
      type = operator.resultType;
    }
    super('ETerm', { type, operator, children: Object.freeze([...children]), value, leaf });
  }
  get type() { return this.detail('type'); }
  get operator() { return this.detail('operator'); }
  get children() { return this.detail('children'); }
  get value() { return this.detail('value'); }
  get leaf() { return this.detail('leaf'); }
}

class EPatternVariable extends EGraphValue {
  constructor(name, type) {
    invariant(validName(name) && validName(type),
      'invalid-egraph-pattern-variable', 'Rewrite variables require a name and type.');
    super('EPatternVariable', { name, type });
  }
  get name() { return this.detail('name'); }
  get type() { return this.detail('type'); }
}

class EPatternLiteral extends EGraphValue {
  constructor(type, value) {
    invariant(validName(type) && validScalar(value),
      'invalid-egraph-pattern-literal', 'Rewrite literals require a type and deterministic scalar value.');
    super('EPatternLiteral', { type, value });
  }
  get type() { return this.detail('type'); }
  get value() { return this.detail('value'); }
}

class EPattern extends EGraphValue {
  constructor(operator, children) {
    invariant(operator instanceof EOperator && children.length === operator.operandTypes.length,
      'invalid-egraph-pattern', 'Rewrite pattern arity does not match its operator.');
    for (let index = 0; index < children.length; index += 1) {
      const child = children[index];
      invariant(child instanceof EPattern
        || child instanceof EPatternVariable
        || child instanceof EPatternLiteral,
        'invalid-egraph-pattern', 'Rewrite patterns contain only typed patterns, variables, or literals.');
      invariant(child.type === operator.operandTypes[index],
        'egraph-type-mismatch',
        `${operator.name} pattern operand ${index + 1} requires ${operator.operandTypes[index]}.`);
    }
    super('EPattern', { operator, children: Object.freeze([...children]) });
  }
  get operator() { return this.detail('operator'); }
  get children() { return this.detail('children'); }
  get type() { return this.operator.resultType; }
}

function patternVariables(pattern, names = new Map()) {
  if (pattern instanceof EPatternVariable) {
    const previous = names.get(pattern.name);
    invariant(!previous || previous === pattern.type,
      'egraph-pattern-variable-type', `Rewrite variable ${pattern.name} has conflicting types.`);
    names.set(pattern.name, pattern.type);
  } else if (pattern instanceof EPattern) {
    for (const child of pattern.children) patternVariables(child, names);
  }
  return names;
}

class ERewriteRule extends EGraphValue {
  constructor(name, left, right) {
    invariant(validName(name), 'invalid-egraph-rewrite', 'Rewrite rules require a non-empty name.');
    invariant(left instanceof EPattern && (right instanceof EPattern
      || right instanceof EPatternVariable
      || right instanceof EPatternLiteral),
    'invalid-egraph-rewrite', 'Rewrite rules require typed pattern expressions.');
    invariant(left.type === right.type, 'egraph-rewrite-type-change', 'Rewrite rules must preserve their root type.');
    const leftVariables = patternVariables(left);
    for (const [variable, type] of patternVariables(right)) {
      invariant(leftVariables.get(variable) === type,
        'unbound-egraph-rewrite-variable', `Rewrite output variable ${variable} is not bound by its input.`);
    }
    super('ERewriteRule', { name, left, right });
  }
  get name() { return this.detail('name'); }
  get left() { return this.detail('left'); }
  get right() { return this.detail('right'); }
}

class EClassHandle extends EGraphValue {
  constructor(graphId, classId, type) { super('EClassHandle', { graphId, classId, type }); }
  get graphId() { return this.detail('graphId'); }
  get classId() { return this.detail('classId'); }
  get type() { return this.detail('type'); }
}

class EGraphTraceStep extends EGraphValue {
  constructor(iteration, rule, eclass) { super('EGraphTraceStep', { iteration, rule, eclass }); }
  get iteration() { return this.detail('iteration'); }
  get rule() { return this.detail('rule'); }
  get eclass() { return this.detail('eclass'); }
}

class EGraphSaturation extends EGraphValue {
  constructor(status, iterations, applications, trace) {
    super('EGraphSaturation', { status, iterations, applications, trace: Object.freeze([...trace]) });
  }
  get status() { return this.detail('status'); }
  get iterations() { return this.detail('iterations'); }
  get applications() { return this.detail('applications'); }
  get trace() { return this.detail('trace'); }
}

class ENodeView extends EGraphValue {
  constructor(type, operator, value, arity) { super('ENodeView', { type, operator, value, arity }); }
  get type() { return this.detail('type'); }
  get operator() { return this.detail('operator'); }
  get value() { return this.detail('value'); }
  get arity() { return this.detail('arity'); }
}

class EGraphExtraction extends EGraphValue {
  constructor(term, cost) { super('EGraphExtraction', { term, cost }); }
  get term() { return this.detail('term'); }
  get cost() { return this.detail('cost'); }
}

function scalarKey(value) { return `${typeof value}:${String(value)}`; }
function nodeKey(node) {
  return node.leaf
    ? `leaf:${node.type}:${scalarKey(node.value)}`
    : `op:${node.operator.id}:${node.children.join(',')}`;
}

function stateOf(engine) { return GRAPH_STATE.get(engine); }
function find(state, id) {
  let root = id;
  while (state.parent.get(root) !== root) root = state.parent.get(root);
  while (state.parent.get(id) !== id) {
    const next = state.parent.get(id);
    state.parent.set(id, root);
    id = next;
  }
  return root;
}

function rootIds(state) {
  return [...state.classes.keys()].filter((id) => find(state, id) === id).sort((a, b) => a - b);
}

function union(state, left, right) {
  left = find(state, left);
  right = find(state, right);
  if (left === right) return false;
  const leftClass = state.classes.get(left);
  const rightClass = state.classes.get(right);
  invariant(leftClass.type === rightClass.type,
    'egraph-union-type-mismatch', 'E-graph classes of different types cannot be merged.');
  const [root, child] = left < right ? [left, right] : [right, left];
  state.parent.set(child, root);
  const rootClass = state.classes.get(root);
  for (const [key, node] of state.classes.get(child).nodes) rootClass.nodes.set(key, node);
  return true;
}

function rebuild(state) {
  let changed = true;
  while (changed) {
    changed = false;
    const memo = new Map();
    for (const root of rootIds(state)) {
      const eclass = state.classes.get(root);
      const canonical = new Map();
      for (const node of eclass.nodes.values()) {
        const normalized = node.leaf ? node : { ...node, children: node.children.map((id) => find(state, id)) };
        const key = nodeKey(normalized);
        canonical.set(key, normalized);
        const previous = memo.get(key);
        if (previous !== undefined && union(state, previous, root)) changed = true;
        else memo.set(key, find(state, root));
      }
      eclass.nodes = canonical;
    }
  }
  state.memo = new Map();
  for (const root of rootIds(state)) {
    const eclass = state.classes.get(root);
    const canonical = new Map();
    for (const node of eclass.nodes.values()) {
      const normalized = node.leaf ? node : { ...node, children: node.children.map((id) => find(state, id)) };
      const key = nodeKey(normalized);
      canonical.set(key, normalized);
      state.memo.set(key, root);
    }
    eclass.nodes = canonical;
  }
}

function addNode(state, node) {
  if (!node.leaf) node = { ...node, children: node.children.map((id) => find(state, id)) };
  const key = nodeKey(node);
  const existing = state.memo.get(key);
  if (existing !== undefined) return find(state, existing);
  const id = state.nextClass;
  state.nextClass += 1;
  state.parent.set(id, id);
  state.classes.set(id, { type: node.type, nodes: new Map([[key, node]]) });
  state.memo.set(key, id);
  return id;
}

function addTerm(state, term) {
  if (term.leaf) return addNode(state, { leaf: true, type: term.type, value: term.value, children: [] });
  const children = term.children.map((child) => addTerm(state, child));
  return addNode(state, { leaf: false, type: term.type, operator: term.operator, children });
}

function matchPattern(state, pattern, classId, binding) {
  const root = find(state, classId);
  const eclass = state.classes.get(root);
  if (eclass.type !== pattern.type) return [];
  if (pattern instanceof EPatternVariable) {
    const previous = binding.get(pattern.name);
    if (previous !== undefined && find(state, previous) !== root) return [];
    const next = new Map(binding);
    next.set(pattern.name, root);
    return [next];
  }
  if (pattern instanceof EPatternLiteral) {
    const key = `leaf:${pattern.type}:${scalarKey(pattern.value)}`;
    return eclass.nodes.has(key) ? [binding] : [];
  }
  const matches = [];
  for (const node of eclass.nodes.values()) {
    if (node.leaf || node.operator.id !== pattern.operator.id) continue;
    let partial = [binding];
    for (let index = 0; index < pattern.children.length; index += 1) {
      partial = partial.flatMap((item) => matchPattern(state, pattern.children[index], node.children[index], item));
    }
    matches.push(...partial);
  }
  return matches;
}

function instantiatePattern(state, pattern, binding) {
  if (pattern instanceof EPatternVariable) return find(state, binding.get(pattern.name));
  if (pattern instanceof EPatternLiteral) {
    return addNode(state, { leaf: true, type: pattern.type, value: pattern.value, children: [] });
  }
  const children = pattern.children.map((child) => instantiatePattern(state, child, binding));
  return addNode(state, { leaf: false, type: pattern.type, operator: pattern.operator, children });
}

function requireHandle(state, handle) {
  invariant(handle instanceof EClassHandle && handle.graphId === state.id,
    'foreign-egraph-handle', 'E-class handle belongs to a different e-graph.');
  return find(state, handle.classId);
}

class EGraphLite {
  constructor() {
    GRAPH_STATE.set(this, {
      id: nextGraphId, nextClass: 0, parent: new Map(), classes: new Map(), memo: new Map()
    });
    nextGraphId += 1;
    Object.freeze(this);
  }

  add(term) {
    invariant(term instanceof ETerm, 'invalid-egraph-term', 'EGraphLite.add expects a typed ETerm.');
    const state = stateOf(this);
    const classId = addTerm(state, term);
    rebuild(state);
    return new EClassHandle(state.id, find(state, classId), term.type);
  }

  equivalent(left, right) {
    const state = stateOf(this);
    return requireHandle(state, left) === requireHandle(state, right);
  }

  saturate(rules, options = new Map()) {
    invariant(Array.isArray(rules) && rules.every((rule) => rule instanceof ERewriteRule),
      'invalid-egraph-rules', 'EGraphLite.saturate expects rewrite rules.');
    const maximum = options instanceof Map ? (options.get('maxIterations') ?? 20) : (options.maxIterations ?? 20);
    invariant(Number.isInteger(maximum) && maximum > 0,
      'invalid-egraph-limit', 'E-graph saturation limit must be a positive integer.');
    const state = stateOf(this);
    const trace = [];
    let applications = 0;
    for (let iteration = 1; iteration <= maximum; iteration += 1) {
      rebuild(state);
      let changed = false;
      for (const rule of rules) {
        for (const root of rootIds(state)) {
          const seen = new Set();
          for (const binding of matchPattern(state, rule.left, root, new Map())) {
            const signature = [...binding].sort(([a], [b]) => a.localeCompare(b))
              .map(([name, id]) => `${name}:${find(state, id)}`).join('|');
            if (seen.has(signature)) continue;
            seen.add(signature);
            const replacement = instantiatePattern(state, rule.right, binding);
            if (union(state, root, replacement)) {
              changed = true;
              applications += 1;
              trace.push(new EGraphTraceStep(iteration, rule.name, find(state, root)));
            }
          }
        }
      }
      rebuild(state);
      if (!changed) return new EGraphSaturation(SATURATED, iteration, applications, trace);
    }
    return new EGraphSaturation(LIMIT_REACHED, maximum, applications, trace);
  }

  extract(handle, costModel = () => 1) {
    invariant(typeof costModel === 'function',
      'invalid-egraph-cost-model', 'Extraction cost model must be a function.');
    const state = stateOf(this);
    const wanted = requireHandle(state, handle);
    rebuild(state);
    const roots = rootIds(state);
    const best = new Map(roots.map((id) => [id, { cost: Infinity, node: undefined, key: undefined }]));
    for (let pass = 0; pass <= roots.length; pass += 1) {
      let changed = false;
      for (const root of roots) {
        for (const node of state.classes.get(root).nodes.values()) {
          const childCosts = node.children.map((child) => best.get(find(state, child))?.cost ?? Infinity);
          if (childCosts.some((cost) => !Number.isFinite(cost))) continue;
          const view = new ENodeView(node.type, node.operator, node.value, node.children.length);
          const base = costModel(view);
          if (!(typeof base === 'number' && Number.isFinite(base) && base > 0)) {
            throw new NllError('invalid-egraph-cost', 'Extraction costs must be finite positive numbers.');
          }
          const cost = base + childCosts.reduce((sum, child) => sum + child, 0);
          const key = nodeKey(node);
          const previous = best.get(root);
          if (cost < previous.cost || (cost === previous.cost && key < previous.key)) {
            best.set(root, { cost, node, key });
            changed = true;
          }
        }
      }
      if (!changed) break;
    }
    const selected = best.get(wanted);
    invariant(selected && Number.isFinite(selected.cost),
      'egraph-extraction-failed', 'No finite representative can be extracted from the e-class.');
    const build = (classId) => {
      const choice = best.get(find(state, classId)).node;
      if (choice.leaf) return new ETerm(choice.type, undefined, [], choice.value, true);
      return new ETerm(choice.type, choice.operator, choice.children.map(build), undefined, false);
    };
    return new EGraphExtraction(build(wanted), selected.cost);
  }
}

function eOperator(name, resultType, ...operandTypes) { return new EOperator(name, resultType, operandTypes); }
function eLeaf(type, value) { return new ETerm(type, undefined, [], value, true); }
function eTerm(operator, ...children) {
  invariant(operator instanceof EOperator,
    'invalid-egraph-term', 'E-graph terms require a typed operator.');
  return new ETerm(operator.resultType, operator, children, undefined, false);
}
function eVariable(name, type) { return new EPatternVariable(name, type); }
function ePatternLiteral(type, value) { return new EPatternLiteral(type, value); }
function ePattern(operator, ...children) {
  invariant(operator instanceof EOperator,
    'invalid-egraph-pattern', 'E-graph patterns require a typed operator.');
  return new EPattern(operator, children);
}
function eRewrite(name, left, right) { return new ERewriteRule(name, left, right); }

export {
  LIMIT_REACHED, SATURATED, EClassHandle, EGraphExtraction, EGraphLite, EGraphSaturation,
  EGraphTraceStep, ENodeView, EOperator, EPattern, EPatternLiteral, EPatternVariable, ERewriteRule,
  ETerm, eLeaf, eOperator, ePattern, ePatternLiteral, eRewrite, eTerm, eVariable
};
