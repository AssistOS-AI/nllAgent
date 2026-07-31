import { invariant } from '../core/errors.mjs';
import {
  AbstractValue, EvidenceTruth, evidenceAnd, evidenceNot, evidenceOr
} from './abstract-domains.mjs';

class InterpreterDiagnostic {
  #code;
  #nodeId;
  #message;

  constructor(code, nodeId, message) {
    this.#code = code;
    this.#nodeId = nodeId;
    this.#message = message;
    Object.freeze(this);
  }

  get code() { return this.#code; }
  get nodeId() { return this.#nodeId; }
  get message() { return this.#message; }
}

class AbstractState {
  #values;

  constructor(entries = []) {
    const values = entries instanceof AbstractState ? entries.entries() : entries;
    this.#values = new Map(values);
    invariant([...this.#values.values()].every((value) => value instanceof AbstractValue),
      'invalid-abstract-state', 'AbstractState accepts only opaque abstract values.');
    Object.freeze(this);
  }

  has(id) { return this.#values.has(id); }
  get(id) { return this.#values.get(id); }
  entries() { return Object.freeze([...this.#values].map((entry) => Object.freeze(entry))); }
  get ids() { return Object.freeze([...this.#values.keys()]); }

  equals(other) {
    return other instanceof AbstractState && this.ids.length === other.ids.length
      && this.ids.every((id) => other.has(id) && this.get(id).equals(other.get(id)));
  }
}

class AbstractOperation {
  #id;
  #inputs;
  #transfer;
  #top;
  #widenAfter;

  constructor(id, inputs, transfer, top, widenAfter = 3) {
    invariant(typeof id === 'string' && id.length > 0, 'invalid-abstract-operation',
      'Abstract operation id must be a non-empty string.');
    invariant(Array.isArray(inputs) && inputs.every((input) => typeof input === 'string'),
      'invalid-abstract-operation', `Abstract operation ${id} has invalid inputs.`);
    invariant(transfer === null || typeof transfer === 'function', 'invalid-abstract-transfer',
      `Abstract operation ${id} transfer must be a function or null.`);
    invariant(top instanceof AbstractValue || typeof top === 'function', 'missing-abstract-top',
      `Abstract operation ${id} requires a conservative top value.`);
    invariant(Number.isInteger(widenAfter) && widenAfter >= 1, 'invalid-widening-threshold',
      `Abstract operation ${id} has an invalid widening threshold.`);
    this.#id = id;
    this.#inputs = Object.freeze([...inputs]);
    this.#transfer = transfer;
    this.#top = top;
    this.#widenAfter = widenAfter;
    Object.freeze(this);
  }

  get id() { return this.#id; }
  get inputs() { return this.#inputs; }
  get opaque() { return this.#transfer === null; }
  get widenAfter() { return this.#widenAfter; }

  topValue() {
    const value = typeof this.#top === 'function' ? this.#top() : this.#top;
    invariant(value instanceof AbstractValue, 'invalid-abstract-top',
      `Abstract operation ${this.#id} produced an invalid top value.`);
    return value;
  }

  evaluate(values) {
    if (this.opaque) return this.topValue();
    const value = this.#transfer(...values);
    invariant(value instanceof AbstractValue, 'invalid-abstract-transfer-result',
      `Abstract operation ${this.#id} did not return an abstract value.`);
    return value;
  }
}

class AbstractCircuit {
  #id;
  #operations;
  #outputs;

  constructor(id, operations, outputs = []) {
    invariant(typeof id === 'string' && id.length > 0, 'invalid-abstract-circuit',
      'Abstract circuit id must be a non-empty string.');
    invariant(operations.every((operation) => operation instanceof AbstractOperation),
      'invalid-abstract-circuit', `Abstract circuit ${id} accepts only AbstractOperation values.`);
    const ids = operations.map((operation) => operation.id);
    invariant(new Set(ids).size === ids.length, 'duplicate-abstract-operation',
      `Abstract circuit ${id} contains duplicate operation ids.`);
    this.#id = id;
    this.#operations = Object.freeze([...operations]);
    this.#outputs = Object.freeze(outputs.length ? [...outputs] : ids);
    Object.freeze(this);
  }

  get id() { return this.#id; }
  get operations() { return this.#operations; }
  get outputs() { return this.#outputs; }
}

class AbstractPreflightResult {
  #circuitId;
  #status;
  #state;
  #diagnostics;
  #steps;

  constructor(circuitId, status, state, diagnostics, steps) {
    this.#circuitId = circuitId;
    this.#status = status;
    this.#state = state;
    this.#diagnostics = Object.freeze([...diagnostics]);
    this.#steps = steps;
    Object.freeze(this);
  }

  get circuitId() { return this.#circuitId; }
  get status() { return this.#status; }
  get state() { return this.#state; }
  get diagnostics() { return this.#diagnostics; }
  get steps() { return this.#steps; }
  value(id) { return this.#state.get(id); }
  output(id) { return this.value(id); }
}

function abstractOperation(id, inputs, transfer, top, widenAfter = 3) {
  return new AbstractOperation(id, inputs, transfer, top, widenAfter);
}

function opaqueOperation(id, inputs, top) {
  return new AbstractOperation(id, inputs, null, top);
}

function abstractCircuit(id, operations, outputs = []) {
  return new AbstractCircuit(id, operations, outputs);
}

function numericGreaterThanOperation(id, left, right) {
  return abstractOperation(id, [left, right],
    (leftValue, rightValue) => leftValue.greaterThan(rightValue), EvidenceTruth.top());
}

function evidenceAndOperation(id, left, right) {
  return abstractOperation(id, [left, right], evidenceAnd, EvidenceTruth.top());
}

function evidenceOrOperation(id, left, right) {
  return abstractOperation(id, [left, right], evidenceOr, EvidenceTruth.top());
}

function evidenceNotOperation(id, input) {
  return abstractOperation(id, [input], evidenceNot, EvidenceTruth.top());
}

function coverageAbsenceOperation(id, coverage) {
  return abstractOperation(id, [coverage],
    (coverageValue) => coverageValue.absenceWhenNoMatch(), EvidenceTruth.top());
}

function enqueue(queue, queued, operation) {
  if (queued.has(operation.id)) return;
  queue.push(operation);
  queued.add(operation.id);
}

function publishCandidate(operation, candidate, values, updates) {
  const previous = values.get(operation.id);
  if (!previous) {
    values.set(operation.id, candidate);
    updates.set(operation.id, 1);
    return true;
  }
  invariant(previous.domain === candidate.domain, 'abstract-transfer-domain-drift',
    `Abstract operation ${operation.id} changed its output domain.`);
  let next = previous.join(candidate);
  const count = (updates.get(operation.id) || 0) + 1;
  if (count >= operation.widenAfter && typeof previous.widen === 'function') next = previous.widen(next);
  if (previous.equals(next)) return false;
  values.set(operation.id, next);
  updates.set(operation.id, count);
  return true;
}

function abstractPreflight(circuit, initialState = new AbstractState(), maximumSteps = null) {
  invariant(circuit instanceof AbstractCircuit, 'invalid-abstract-circuit',
    'abstractPreflight requires an AbstractCircuit.');
  const provided = initialState instanceof AbstractState ? initialState : new AbstractState(initialState);
  const values = new Map(provided.entries());
  const diagnostics = [];
  const diagnosticKeys = new Set();
  const operationsById = new Map(circuit.operations.map((operation) => [operation.id, operation]));
  const dependents = new Map();
  for (const operation of circuit.operations) {
    for (const input of operation.inputs) {
      if (!dependents.has(input)) dependents.set(input, []);
      dependents.get(input).push(operation);
    }
  }
  const queue = [...circuit.operations];
  const queued = new Set(queue.map((operation) => operation.id));
  const updates = new Map();
  const limit = maximumSteps ?? Math.max(64, circuit.operations.length * 64);
  let steps = 0;
  let blocked = false;

  const diagnose = (code, nodeId, message) => {
    const key = `${code}:${nodeId}`;
    if (diagnosticKeys.has(key)) return;
    diagnosticKeys.add(key);
    diagnostics.push(new InterpreterDiagnostic(code, nodeId, message));
  };

  while (queue.length > 0) {
    if (steps >= limit) {
      blocked = true;
      diagnose('BLOCKED_RESOURCE', circuit.id, `Abstract preflight exceeded its ${limit}-step budget.`);
      break;
    }
    steps += 1;
    const operation = queue.shift();
    queued.delete(operation.id);
    const missing = operation.inputs.filter((input) => !values.has(input));
    if (missing.some((input) => operationsById.has(input))) continue;

    let candidate;
    if (missing.length > 0) {
      candidate = operation.topValue();
      diagnose('ABSTRACT_INPUT_MISSING', operation.id,
        `Missing abstract inputs: ${missing.join(', ')}; using conservative top.`);
    } else {
      candidate = operation.evaluate(operation.inputs.map((input) => values.get(input)));
      if (operation.opaque) diagnose('OPAQUE_NODE_PRECISION_LOSS', operation.id,
        `Opaque node ${operation.id} uses its declared conservative top.`);
    }
    if (!publishCandidate(operation, candidate, values, updates)) continue;
    for (const dependent of dependents.get(operation.id) || []) enqueue(queue, queued, dependent);
  }

  const unresolved = circuit.operations.filter((operation) => !values.has(operation.id));
  for (const operation of unresolved) {
    values.set(operation.id, operation.topValue());
    diagnose('ABSTRACT_CYCLE_WITHOUT_SEED', operation.id,
      `Abstract operation ${operation.id} could not activate; using conservative top.`);
  }
  if (blocked) {
    for (const operation of circuit.operations) values.set(operation.id, operation.topValue());
  }
  return new AbstractPreflightResult(
    circuit.id,
    blocked ? 'BLOCKED_RESOURCE' : 'STABLE',
    new AbstractState(values),
    diagnostics,
    steps
  );
}

export {
  AbstractCircuit, AbstractOperation, AbstractPreflightResult, AbstractState, InterpreterDiagnostic,
  abstractCircuit, abstractOperation, abstractPreflight, coverageAbsenceOperation, evidenceAndOperation,
  evidenceNotOperation, evidenceOrOperation, numericGreaterThanOperation, opaqueOperation
};
