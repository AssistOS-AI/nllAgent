import { invariant } from '../core/errors.mjs';
import { InterpreterDiagnostic } from './abstract-interpreter.mjs';

class RefinementDemand {
  #signature;
  #because;
  #route;
  #needs;

  constructor(signature, because, route, needs = []) {
    invariant(typeof signature === 'string' && signature.length > 0, 'invalid-refinement-demand',
      'RefinementDemand signature must be a non-empty string.');
    invariant(typeof route === 'string' && route.length > 0, 'invalid-refinement-route',
      `RefinementDemand ${signature} requires an explicit route.`);
    this.#signature = signature;
    this.#because = because;
    this.#route = route;
    this.#needs = Object.freeze([...needs]);
    Object.freeze(this);
  }

  get signature() { return this.#signature; }
  get because() { return this.#because; }
  get route() { return this.#route; }
  get needs() { return this.#needs; }
}

class RefinementOutcome {
  #demand;
  #status;
  #diagnostics;

  constructor(demand, status, diagnostics = []) {
    this.#demand = demand;
    this.#status = status;
    this.#diagnostics = Object.freeze([...diagnostics]);
    Object.freeze(this);
  }

  get demand() { return this.#demand; }
  get status() { return this.#status; }
  get diagnostics() { return this.#diagnostics; }
  get progressed() { return this.#status === 'PROGRESSED'; }
  get stalled() { return this.#status === 'STALLED'; }
}

function statesEqual(before, after) {
  if (before && typeof before.equals === 'function') return before.equals(after);
  if (after && typeof after.equals === 'function') return after.equals(before);
  return Object.is(before, after);
}

class RefinementManager {
  #pending = new Set();
  #resolved = new Set();
  #stalled = new Set();

  request(demand) {
    invariant(demand instanceof RefinementDemand, 'invalid-refinement-demand',
      'RefinementManager.request requires a RefinementDemand.');
    const signature = demand.signature;
    if (this.#stalled.has(signature)) {
      return new RefinementOutcome(demand, 'STALLED', [new InterpreterDiagnostic(
        'REFINEMENT_STALLED', signature,
        `Refinement ${signature} previously produced no abstract progress.`
      )]);
    }
    if (this.#pending.has(signature) || this.#resolved.has(signature)) {
      return new RefinementOutcome(demand, 'DEDUPLICATED');
    }
    this.#pending.add(signature);
    return new RefinementOutcome(demand, 'REQUESTED');
  }

  record(demand, before, after) {
    invariant(demand instanceof RefinementDemand, 'invalid-refinement-demand',
      'RefinementManager.record requires a RefinementDemand.');
    invariant(this.#pending.has(demand.signature), 'unrequested-refinement',
      `Refinement ${demand.signature} was not pending.`);
    this.#pending.delete(demand.signature);
    if (statesEqual(before, after)) {
      this.#stalled.add(demand.signature);
      return new RefinementOutcome(demand, 'STALLED', [new InterpreterDiagnostic(
        'REFINEMENT_STALLED', demand.signature,
        `Refinement ${demand.signature} added no information; the semantic result remains UNKNOWN.`
      )]);
    }
    this.#resolved.add(demand.signature);
    return new RefinementOutcome(demand, 'PROGRESSED');
  }

  get pendingCount() { return this.#pending.size; }
  hasStalled(signature) { return this.#stalled.has(signature); }
}

function refinementDemand(signature, because, route, ...needs) {
  return new RefinementDemand(signature, because, route, needs);
}

export { RefinementDemand, RefinementManager, RefinementOutcome, refinementDemand };
