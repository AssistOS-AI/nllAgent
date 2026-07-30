import { SOURCE_FORM, quote } from '../core/canonical-source.mjs';
import { SemanticValue } from '../ontology/model.mjs';

class TraceEvent extends SemanticValue {
  constructor(sequence, state, node, detail = '') { super('TraceEvent', { sequence, state, node, eventDetail: detail }); }
  get sequence() { return this.detail('sequence'); }
  get state() { return this.detail('state'); }
  get node() { return this.detail('node'); }
  get eventDetail() { return this.detail('eventDetail'); }
  [SOURCE_FORM]() {
    return `traceEvent(${this.sequence},${quote(this.state)},${quote(this.node)},${quote(this.eventDetail)})`;
  }
}

class ExecutionTrace extends SemanticValue {
  #events = [];
  constructor(id) { super('ExecutionTrace', { id }); }
  get id() { return this.detail('id'); }
  record(state, node, detail = '') {
    const event = new TraceEvent(this.#events.length + 1, state, node, detail);
    this.#events.push(event);
    return event;
  }
  get events() { return Object.freeze([...this.#events]); }
}

const traceEvent = (sequence, state, node, detail = '') => new TraceEvent(sequence, state, node, detail);

export { ExecutionTrace, TraceEvent, traceEvent };
