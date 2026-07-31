import { NllError, invariant } from '../core/errors.mjs';

const TRUTH_STATES = Object.freeze(['TRUE', 'FALSE', 'UNKNOWN', 'CONFLICT']);
const COVERAGE_STATES = Object.freeze(['OPEN', 'PARTIAL', 'CLOSED']);

function freezeSet(values) {
  return Object.freeze([...new Set(values)]);
}

function normalizedTruth(value) {
  const state = typeof value === 'string' ? value : value?.name;
  invariant(TRUTH_STATES.includes(state), 'invalid-evidence-truth', `Unknown evidence truth state: ${String(value)}`);
  return state;
}

function sameMembers(left, right) {
  return left.length === right.length && left.every((value) => right.includes(value));
}

function requireCompatible(left, right) {
  invariant(left instanceof AbstractValue && right instanceof AbstractValue,
    'invalid-abstract-value', 'Abstract domain operations require opaque abstract values.');
  invariant(left.domain === right.domain, 'abstract-domain-mismatch',
    `Cannot combine ${left.domain} and ${right.domain}.`);
}

class AbstractValue {
  #domain;

  constructor(domain) {
    this.#domain = domain;
    Object.freeze(this);
  }

  get domain() { return this.#domain; }
}

class EvidenceTruth extends AbstractValue {
  #states;

  constructor(states) {
    super('EvidenceTruth');
    this.#states = freezeSet([...states].map(normalizedTruth));
  }

  static bottom() { return new EvidenceTruth([]); }
  static top() { return new EvidenceTruth(TRUTH_STATES); }
  static constant(value) { return new EvidenceTruth([value]); }
  static of(...values) { return new EvidenceTruth(values.flat()); }

  get possibilities() { return this.#states; }
  get isBottom() { return this.#states.length === 0; }
  get isTop() { return sameMembers(this.#states, TRUTH_STATES); }
  contains(value) { return this.#states.includes(normalizedTruth(value)); }
  mustBe(value) { return this.#states.length === 1 && this.contains(value); }
  mayBe(value) { return this.contains(value); }

  join(other) {
    requireCompatible(this, other);
    return new EvidenceTruth([...this.#states, ...other.#states]);
  }

  meet(other) {
    requireCompatible(this, other);
    return new EvidenceTruth(this.#states.filter((state) => other.#states.includes(state)));
  }

  equals(other) {
    return other instanceof EvidenceTruth && sameMembers(this.#states, other.#states);
  }
}

const truthNot = (state) => state === 'TRUE' ? 'FALSE' : state === 'FALSE' ? 'TRUE' : state;
const truthAnd = (left, right) => {
  if (left === 'FALSE' || right === 'FALSE') return 'FALSE';
  if (left === 'CONFLICT' || right === 'CONFLICT') return 'CONFLICT';
  if (left === 'UNKNOWN' || right === 'UNKNOWN') return 'UNKNOWN';
  return 'TRUE';
};
const truthOr = (left, right) => {
  if (left === 'TRUE' || right === 'TRUE') return 'TRUE';
  if (left === 'CONFLICT' || right === 'CONFLICT') return 'CONFLICT';
  if (left === 'UNKNOWN' || right === 'UNKNOWN') return 'UNKNOWN';
  return 'FALSE';
};

function liftTruthUnary(value, operation) {
  invariant(value instanceof EvidenceTruth, 'invalid-evidence-truth', 'Expected EvidenceTruth.');
  return EvidenceTruth.of(value.possibilities.map(operation));
}

function liftTruthBinary(left, right, operation) {
  requireCompatible(left, right);
  const results = [];
  for (const leftState of left.possibilities) {
    for (const rightState of right.possibilities) results.push(operation(leftState, rightState));
  }
  return EvidenceTruth.of(results);
}

const evidenceNot = (value) => liftTruthUnary(value, truthNot);
const evidenceAnd = (left, right) => liftTruthBinary(left, right, truthAnd);
const evidenceOr = (left, right) => liftTruthBinary(left, right, truthOr);

class FiniteChoice extends AbstractValue {
  #universe;
  #choices;

  constructor(universe, choices = universe) {
    super('FiniteChoice');
    this.#universe = freezeSet(universe);
    invariant(this.#universe.length > 0, 'empty-choice-universe', 'FiniteChoice requires a non-empty universe.');
    this.#choices = freezeSet(choices);
    invariant(this.#choices.every((choice) => this.#universe.includes(choice)),
      'choice-outside-universe', 'FiniteChoice contains a value outside its universe.');
  }

  static top(universe) { return new FiniteChoice(universe); }
  static bottom(universe) { return new FiniteChoice(universe, []); }
  static constant(universe, value) { return new FiniteChoice(universe, [value]); }
  static of(universe, choices) { return new FiniteChoice(universe, choices); }

  get universe() { return this.#universe; }
  get possibilities() { return this.#choices; }
  get isBottom() { return this.#choices.length === 0; }
  get isTop() { return sameMembers(this.#choices, this.#universe); }
  contains(value) { return this.#choices.includes(value); }
  mustBe(value) { return this.#choices.length === 1 && this.contains(value); }

  #requireUniverse(other) {
    requireCompatible(this, other);
    invariant(sameMembers(this.#universe, other.#universe), 'choice-universe-mismatch',
      'FiniteChoice values use different universes.');
  }

  join(other) {
    this.#requireUniverse(other);
    return new FiniteChoice(this.#universe, [...this.#choices, ...other.#choices]);
  }

  meet(other) {
    this.#requireUniverse(other);
    return new FiniteChoice(this.#universe, this.#choices.filter((choice) => other.#choices.includes(choice)));
  }

  equals(other) {
    return other instanceof FiniteChoice
      && sameMembers(this.#universe, other.#universe)
      && sameMembers(this.#choices, other.#choices);
  }
}

class NumericInterval extends AbstractValue {
  #lower;
  #upper;
  #bottom;

  constructor(lower, upper, bottom = false) {
    super('NumericInterval');
    invariant(typeof lower === 'number' && !Number.isNaN(lower)
      && typeof upper === 'number' && !Number.isNaN(upper),
    'invalid-numeric-interval', 'Numeric interval bounds must be numbers.');
    invariant(bottom || lower <= upper, 'invalid-numeric-interval', 'Numeric interval lower bound exceeds upper bound.');
    this.#lower = lower;
    this.#upper = upper;
    this.#bottom = bottom;
  }

  static bottom() { return new NumericInterval(0, 0, true); }
  static top() { return new NumericInterval(-Infinity, Infinity); }
  static exact(value) { return new NumericInterval(value, value); }
  static closed(lower, upper) { return new NumericInterval(lower, upper); }

  get lower() { return this.#lower; }
  get upper() { return this.#upper; }
  get isBottom() { return this.#bottom; }
  get isTop() { return !this.#bottom && this.#lower === -Infinity && this.#upper === Infinity; }
  contains(value) { return !this.#bottom && this.#lower <= value && value <= this.#upper; }

  join(other) {
    requireCompatible(this, other);
    if (this.#bottom) return other;
    if (other.#bottom) return this;
    return new NumericInterval(Math.min(this.#lower, other.#lower), Math.max(this.#upper, other.#upper));
  }

  meet(other) {
    requireCompatible(this, other);
    if (this.#bottom || other.#bottom) return NumericInterval.bottom();
    const lower = Math.max(this.#lower, other.#lower);
    const upper = Math.min(this.#upper, other.#upper);
    return lower > upper ? NumericInterval.bottom() : new NumericInterval(lower, upper);
  }

  add(other) {
    requireCompatible(this, other);
    if (this.#bottom || other.#bottom) return NumericInterval.bottom();
    return new NumericInterval(this.#lower + other.#lower, this.#upper + other.#upper);
  }

  greaterThan(other) {
    requireCompatible(this, other);
    if (this.#bottom || other.#bottom) return EvidenceTruth.bottom();
    if (this.#lower > other.#upper) return EvidenceTruth.constant('TRUE');
    if (this.#upper <= other.#lower) return EvidenceTruth.constant('FALSE');
    return EvidenceTruth.of('TRUE', 'FALSE');
  }

  widen(next) {
    requireCompatible(this, next);
    if (this.#bottom) return next;
    if (next.#bottom) return this;
    return new NumericInterval(
      next.#lower < this.#lower ? -Infinity : this.#lower,
      next.#upper > this.#upper ? Infinity : this.#upper
    );
  }

  equals(other) {
    return other instanceof NumericInterval && this.#bottom === other.#bottom
      && (this.#bottom || (this.#lower === other.#lower && this.#upper === other.#upper));
  }
}

class CoverageDomain extends AbstractValue {
  #states;

  constructor(states) {
    super('CoverageDomain');
    this.#states = freezeSet(states);
    invariant(this.#states.every((state) => COVERAGE_STATES.includes(state)),
      'invalid-coverage-domain', 'CoverageDomain contains an unknown state.');
  }

  static top() { return new CoverageDomain(COVERAGE_STATES); }
  static bottom() { return new CoverageDomain([]); }
  static constant(state) { return new CoverageDomain([state]); }
  static of(...states) { return new CoverageDomain(states.flat()); }

  get possibilities() { return this.#states; }
  get isBottom() { return this.#states.length === 0; }
  get isTop() { return sameMembers(this.#states, COVERAGE_STATES); }
  mayBe(state) { return this.#states.includes(state); }
  mustBe(state) { return this.#states.length === 1 && this.mayBe(state); }

  absenceWhenNoMatch() {
    if (this.isBottom) return EvidenceTruth.bottom();
    const states = this.#states.map((state) => state === 'CLOSED' ? 'TRUE' : 'UNKNOWN');
    return EvidenceTruth.of(states);
  }

  join(other) {
    requireCompatible(this, other);
    return new CoverageDomain([...this.#states, ...other.#states]);
  }

  meet(other) {
    requireCompatible(this, other);
    return new CoverageDomain(this.#states.filter((state) => other.#states.includes(state)));
  }

  equals(other) {
    return other instanceof CoverageDomain && sameMembers(this.#states, other.#states);
  }
}

class ProductView {
  #dimensions;

  constructor(dimensions) {
    this.#dimensions = dimensions;
    Object.freeze(this);
  }

  get(name) { return this.#dimensions.get(name); }
  has(name) { return this.#dimensions.has(name); }
  get names() { return Object.freeze([...this.#dimensions.keys()]); }
}

function reduceDimensions(initial, reducers) {
  let dimensions = new Map(initial);
  for (let pass = 0; pass < 32; pass += 1) {
    let changed = false;
    for (const reducer of reducers) {
      const refinements = reducer(new ProductView(dimensions));
      invariant(refinements instanceof Map, 'invalid-product-reducer', 'A product reducer must return a Map.');
      for (const [name, refinement] of refinements) {
        const current = dimensions.get(name);
        invariant(current instanceof AbstractValue && refinement instanceof AbstractValue,
          'invalid-product-refinement', `Reducer returned an invalid refinement for ${name}.`);
        const next = current.meet(refinement);
        if (!current.equals(next)) {
          dimensions.set(name, next);
          changed = true;
        }
      }
    }
    if (!changed) return dimensions;
  }
  throw new NllError('product-reduction-nonconvergent', 'Reduced product did not converge within 32 passes.');
}

class ReducedProduct extends AbstractValue {
  #dimensions;
  #reducers;

  constructor(entries, reducers = []) {
    super('ReducedProduct');
    const dimensions = entries instanceof Map ? new Map(entries) : new Map(entries);
    invariant(dimensions.size > 0, 'empty-reduced-product', 'ReducedProduct requires at least one dimension.');
    invariant([...dimensions.values()].every((value) => value instanceof AbstractValue),
      'invalid-product-dimension', 'ReducedProduct dimensions must be opaque abstract values.');
    invariant(reducers.every((reducer) => typeof reducer === 'function'),
      'invalid-product-reducer', 'ReducedProduct reducers must be functions.');
    this.#reducers = Object.freeze([...reducers]);
    this.#dimensions = reduceDimensions(dimensions, this.#reducers);
  }

  static of(entries, ...reducers) { return new ReducedProduct(entries, reducers); }

  get names() { return Object.freeze([...this.#dimensions.keys()]); }
  get isBottom() { return [...this.#dimensions.values()].some((value) => value.isBottom); }
  dimension(name) { return this.#dimensions.get(name); }

  #combine(other, operation) {
    requireCompatible(this, other);
    invariant(sameMembers(this.names, other.names), 'product-dimension-mismatch',
      'ReducedProduct values have different dimensions.');
    const entries = this.names.map((name) => [name, this.dimension(name)[operation](other.dimension(name))]);
    return new ReducedProduct(entries, [...this.#reducers, ...other.#reducers]);
  }

  join(other) { return this.#combine(other, 'join'); }
  meet(other) { return this.#combine(other, 'meet'); }

  equals(other) {
    return other instanceof ReducedProduct && sameMembers(this.names, other.names)
      && this.names.every((name) => this.dimension(name).equals(other.dimension(name)));
  }
}

export {
  AbstractValue, COVERAGE_STATES, CoverageDomain, EvidenceTruth, FiniteChoice, NumericInterval,
  ProductView, ReducedProduct, TRUTH_STATES, evidenceAnd, evidenceNot, evidenceOr
};
