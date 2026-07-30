import { SOURCE_FORM, digestSource, quote } from '../core/canonical-source.mjs';
import { NllError } from '../core/errors.mjs';
import { SemanticValue } from '../ontology/model.mjs';

const CRITICAL_SLOTS = Object.freeze([
  'actor', 'modality', 'action', 'object', 'negated', 'time', 'condition', 'exception', 'authority'
]);

class FrameSlot extends SemanticValue {
  constructor(name, value) { super('FrameSlot', { name, value }); }
  get name() { return this.detail('name'); }
  get value() { return this.detail('value'); }
  [SOURCE_FORM]() { return `slot(${quote(this.name)},${quote(String(this.value))})`; }
}

class CNLFrame extends SemanticValue {
  constructor(kind, slots) {
    const values = new Map();
    for (const slot of slots) {
      if (!(slot instanceof FrameSlot)) throw new NllError('invalid-cnl-slot', 'CNLFrame accepts typed slots.');
      if (values.has(slot.name)) throw new NllError('duplicate-cnl-slot', `Duplicate CNL slot ${slot.name}.`);
      values.set(slot.name, slot.value);
    }
    super('CNLFrame', { frameKind: kind, slots: values, identity: `cnl-frame:${digestSource([kind, values])}` });
  }
  get frameKind() { return this.detail('frameKind'); }
  get identity() { return this.detail('identity'); }
  get(name) { return this.detail('slots').get(name); }
  slots() { return new Map(this.detail('slots')); }
  [SOURCE_FORM]() { return `cnlFrame(${quote(this.frameKind)},${[...this.detail('slots')].map(([name, value]) => `slot(${quote(name)},${quote(String(value))})`).join(',')})`; }
}

class CnlDialect extends SemanticValue {
  constructor(id, render, parse) {
    if (typeof render !== 'function' || typeof parse !== 'function') {
      throw new NllError('invalid-cnl-dialect', 'A CNL dialect requires paired render and parse functions.');
    }
    super('CnlDialect', { id, render, parse });
  }
  get id() { return this.detail('id'); }
  render(frame) { return this.detail('render')(frame); }
  parse(text) { return this.detail('parse')(text); }
}

class GeneratedDocument extends SemanticValue {
  constructor(content, basedOn, artifact = null) {
    super('GeneratedDocument', {
      content,
      basedOn,
      artifact,
      identity: `generated-document:${digestSource([content, basedOn.identity, artifact?.identity || 'deterministic'])}`
    });
  }
  get content() { return this.detail('content'); }
  get basedOn() { return this.detail('basedOn'); }
  get identity() { return this.detail('identity'); }
}

function compareFrames(expected, actual, slots = CRITICAL_SLOTS) {
  if (!(expected instanceof CNLFrame) || !(actual instanceof CNLFrame)) return false;
  if (expected.frameKind !== actual.frameKind) return false;
  const names = new Set([...slots, ...expected.slots().keys(), ...actual.slots().keys()]);
  return [...names].every((name) => (expected.get(name) ?? null) === (actual.get(name) ?? null));
}

function renderVerified(frame, dialect) {
  const text = dialect.render(frame);
  const reconstructed = dialect.parse(text);
  if (!compareFrames(frame, reconstructed)) {
    throw new NllError('cnl-round-trip-mismatch', `Dialect ${dialect.id} did not preserve the semantic frame.`);
  }
  return new GeneratedDocument(text, frame);
}

const slot = (name, value) => new FrameSlot(name, value);
const cnlFrame = (kind, ...slots) => new CNLFrame(kind, slots);
const actor = (value) => slot('actor', value);
const modality = (value) => slot('modality', value);
const action = (value) => slot('action', value);
const object = (value) => slot('object', value);
const negated = (value = true) => slot('negated', value);
const time = (value) => slot('time', value);
const condition = (value) => slot('condition', value);
const exception = (value) => slot('exception', value);
const authority = (value) => slot('authority', value);

export {
  CRITICAL_SLOTS, CNLFrame, CnlDialect, FrameSlot, GeneratedDocument, action, actor, authority,
  cnlFrame, compareFrames, condition, exception, modality, negated, object, renderVerified, slot, time
};
