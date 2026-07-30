import { SOURCE_FORM, quote } from '../core/canonical-source.mjs';
import { SemanticValue } from '../ontology/model.mjs';

class EventField extends SemanticValue {
  constructor(name, value) { super('EventField', { name, value }); }
  get name() { return this.detail('name'); }
  get value() { return this.detail('value'); }
  [SOURCE_FORM]() { return `field(${quote(this.name)},${quote(String(this.value))})`; }
}

class WorkspaceEvent extends SemanticValue {
  constructor(kind, id, fields) { super('WorkspaceEvent', { eventKind: kind, id, fields: Object.freeze([...fields]) }); }
  get eventKind() { return this.detail('eventKind'); }
  get id() { return this.detail('id'); }
  get fields() { return this.detail('fields'); }
  get(name) { return this.fields.find((item) => item.name === name)?.value; }
}

const field = (name, value) => new EventField(name, value);
const workspaceEvent = (kind, id, ...fields) => new WorkspaceEvent(kind, id, fields);

export { EventField, WorkspaceEvent, field, workspaceEvent };
