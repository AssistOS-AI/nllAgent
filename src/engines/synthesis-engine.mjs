import { invariant } from '../core/errors.mjs';

const FOUND = 'FOUND';
const EXHAUSTED = 'EXHAUSTED';
const LIMIT_REACHED = 'LIMIT_REACHED';
const DETAILS = new WeakMap();

class SynthesisValue {
  constructor(kind, details) {
    DETAILS.set(this, Object.freeze({ kind, ...details }));
    Object.freeze(this);
  }
  get kind() { return DETAILS.get(this).kind; }
  detail(name) { return DETAILS.get(this)[name]; }
}

class GrammarSort extends SynthesisValue {
  constructor(name) {
    invariant(typeof name === 'string' && name.length > 0,
      'invalid-grammar-sort', 'Grammar sorts require a non-empty name.');
    super('GrammarSort', { name });
  }
  get name() { return this.detail('name'); }
  get id() { return this.name; }
}

class GrammarProduction extends SynthesisValue {
  constructor(name, resultSort, operandSorts, build, cost) {
    invariant(typeof name === 'string' && name.length > 0 && resultSort instanceof GrammarSort,
      'invalid-grammar-production', 'Grammar productions require a name and result sort.');
    invariant(operandSorts.every((sort) => sort instanceof GrammarSort) && typeof build === 'function',
      'invalid-grammar-production', 'Grammar productions require typed operands and a builder.');
    invariant(Number.isInteger(cost) && cost > 0,
      'invalid-synthesis-cost', 'Grammar production costs must be positive integers.');
    super('GrammarProduction', {
      name, resultSort, operandSorts: Object.freeze([...operandSorts]), build, cost
    });
  }
  get name() { return this.detail('name'); }
  get resultSort() { return this.detail('resultSort'); }
  get operandSorts() { return this.detail('operandSorts'); }
  get build() { return this.detail('build'); }
  get cost() { return this.detail('cost'); }
}

class TypedGrammar extends SynthesisValue {
  constructor(name, startSort, productions) {
    invariant(typeof name === 'string' && name.length > 0 && startSort instanceof GrammarSort,
      'invalid-typed-grammar', 'Typed grammars require a name and start sort.');
    invariant(productions.length > 0 && productions.every((item) => item instanceof GrammarProduction),
      'invalid-typed-grammar', 'Typed grammars require at least one grammar production.');
    const names = new Set();
    for (const production of productions) {
      invariant(!names.has(production.name), 'duplicate-grammar-production',
        `Duplicate grammar production: ${production.name}.`);
      names.add(production.name);
    }
    invariant(productions.some((production) => production.resultSort.id === startSort.id),
      'uninhabited-start-sort', `No production returns start sort ${startSort.name}.`);
    super('TypedGrammar', { name, startSort, productions: Object.freeze([...productions]) });
  }
  get name() { return this.detail('name'); }
  get startSort() { return this.detail('startSort'); }
  get productions() { return this.detail('productions'); }
}

class SynthesisTerm extends SynthesisValue {
  constructor(production, children) {
    invariant(production instanceof GrammarProduction && children.length === production.operandSorts.length,
      'invalid-synthesis-term', 'Synthesis term arity does not match its production.');
    for (let index = 0; index < children.length; index += 1) {
      invariant(children[index] instanceof SynthesisTerm
        && children[index].sort.id === production.operandSorts[index].id,
      'synthesis-sort-mismatch',
      `${production.name} operand ${index + 1} requires ${production.operandSorts[index].name}.`);
    }
    super('SynthesisTerm', { production, children: Object.freeze([...children]) });
  }
  get production() { return this.detail('production'); }
  get children() { return this.detail('children'); }
  get sort() { return this.production.resultSort; }
  get cost() { return this.production.cost + this.children.reduce((total, child) => total + child.cost, 0); }
  get key() { return `${this.production.name}(${this.children.map((child) => child.key).join(',')})`; }
  evaluate() { return this.production.build(...this.children.map((child) => child.evaluate())); }
}

class SynthesisTraceStep extends SynthesisValue {
  constructor(candidate, cost, accepted, message) {
    super('SynthesisTraceStep', { candidate, cost, accepted, message });
  }
  get candidate() { return this.detail('candidate'); }
  get cost() { return this.detail('cost'); }
  get accepted() { return this.detail('accepted'); }
  get message() { return this.detail('message'); }
}

class SynthesisResult extends SynthesisValue {
  constructor(status, candidate, value, cost, attempts, maxCost, trace) {
    super('SynthesisResult', {
      status, candidate, value, cost, attempts, maxCost, trace: Object.freeze([...trace])
    });
  }
  get status() { return this.detail('status'); }
  get candidate() { return this.detail('candidate'); }
  get value() { return this.detail('value'); }
  get cost() { return this.detail('cost'); }
  get attempts() { return this.detail('attempts'); }
  get maxCost() { return this.detail('maxCost'); }
  get trace() { return this.detail('trace'); }
}

function option(options, name, fallback) {
  return options instanceof Map ? (options.get(name) ?? fallback) : (options[name] ?? fallback);
}

function costCompositions(total, count, prefix = []) {
  if (count === 0) return total === 0 ? [prefix] : [];
  const results = [];
  for (let cost = 1; cost <= total - count + 1; cost += 1) {
    results.push(...costCompositions(total - cost, count - 1, [...prefix, cost]));
  }
  return results;
}

function cartesian(groups, index = 0, prefix = []) {
  if (index === groups.length) return [prefix];
  const results = [];
  for (const value of groups[index]) results.push(...cartesian(groups, index + 1, [...prefix, value]));
  return results;
}

function candidatesAt(table, sort, cost) {
  return table.get(sort.id)?.get(cost) || [];
}

function addCandidate(table, seen, term) {
  if (seen.has(term.key)) return false;
  seen.add(term.key);
  if (!table.has(term.sort.id)) table.set(term.sort.id, new Map());
  const byCost = table.get(term.sort.id);
  if (!byCost.has(term.cost)) byCost.set(term.cost, []);
  byCost.get(term.cost).push(term);
  return true;
}

class SynthesisEngine {
  synthesize(grammar, validator, options = new Map()) {
    invariant(grammar instanceof TypedGrammar,
      'invalid-typed-grammar', 'SynthesisEngine requires a typed grammar.');
    invariant(typeof validator === 'function',
      'missing-concrete-validator', 'Synthesis requires a concrete validator function.');
    const maxCost = option(options, 'maxCost', 20);
    const maxCandidates = option(options, 'maxCandidates', 10_000);
    invariant(Number.isInteger(maxCost) && maxCost > 0 && Number.isInteger(maxCandidates) && maxCandidates > 0,
      'invalid-synthesis-limit', 'Synthesis limits must be positive integers.');
    const table = new Map();
    const seen = new Set();
    const trace = [];
    let attempts = 0;
    for (let cost = 1; cost <= maxCost; cost += 1) {
      for (const production of grammar.productions) {
        if (production.cost > cost) continue;
        let childLists;
        if (production.operandSorts.length === 0) {
          if (production.cost !== cost) continue;
          childLists = [[]];
        } else {
          const remaining = cost - production.cost;
          childLists = costCompositions(remaining, production.operandSorts.length)
            .flatMap((costs) => {
              const groups = costs.map((childCost, index) =>
                candidatesAt(table, production.operandSorts[index], childCost));
              return groups.some((group) => group.length === 0) ? [] : cartesian(groups);
            });
        }
        for (const children of childLists) addCandidate(table, seen, new SynthesisTerm(production, children));
      }
      const candidates = candidatesAt(table, grammar.startSort, cost);
      for (const candidate of candidates) {
        if (attempts >= maxCandidates) {
          return new SynthesisResult(LIMIT_REACHED, undefined, undefined, undefined,
            attempts, maxCost, trace);
        }
        attempts += 1;
        let value;
        let accepted = false;
        let message = 'Concrete validator rejected the candidate.';
        try {
          value = candidate.evaluate();
        } catch (error) {
          message = `Candidate evaluation failed: ${error instanceof Error ? error.message : String(error)}`;
          trace.push(new SynthesisTraceStep(candidate, cost, false, message));
          continue;
        }
        const verdict = validator(value, candidate);
        invariant(!(verdict && typeof verdict.then === 'function'),
          'async-synthesis-validator', 'Concrete synthesis validators must be synchronous.');
        invariant(typeof verdict === 'boolean',
          'invalid-synthesis-verdict', 'Concrete synthesis validators must return boolean.');
        accepted = verdict;
        if (accepted) message = 'Concrete validator accepted the candidate.';
        trace.push(new SynthesisTraceStep(candidate, cost, accepted, message));
        if (accepted) {
          return new SynthesisResult(FOUND, candidate, value, cost, attempts, maxCost, trace);
        }
      }
    }
    return new SynthesisResult(EXHAUSTED, undefined, undefined, undefined, attempts, maxCost, trace);
  }

  search(grammar, validator, options = new Map()) { return this.synthesize(grammar, validator, options); }
}

function grammarSort(name) { return new GrammarSort(name); }
function grammarProduction(name, resultSort, operandSorts, build, cost = 1) {
  return new GrammarProduction(name, resultSort, operandSorts, build, cost);
}
function literalProduction(name, resultSort, value, cost = 1) {
  return new GrammarProduction(name, resultSort, [], () => value, cost);
}
function typedGrammar(name, startSort, ...productions) { return new TypedGrammar(name, startSort, productions); }

export {
  EXHAUSTED, FOUND, LIMIT_REACHED, GrammarProduction, GrammarSort, SynthesisEngine, SynthesisResult,
  SynthesisTerm, SynthesisTraceStep, TypedGrammar, grammarProduction, grammarSort, literalProduction,
  typedGrammar
};
