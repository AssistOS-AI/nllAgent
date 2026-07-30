import { SOURCE_FORM, digestSource, digestText, quote } from '../core/canonical-source.mjs';
import { NllError } from '../core/errors.mjs';
import { SemanticValue, Term } from '../ontology/model.mjs';

function codePoints(text) { return [...text]; }

class SourceDocument extends SemanticValue {
  constructor(id, text, revision = 'working') {
    if (typeof text !== 'string') throw new NllError('invalid-source', 'Source text must be a string.');
    super('SourceDocument', { id, text, revision, digest: digestText(text), length: codePoints(text).length });
  }
  get id() { return this.detail('id'); }
  get text() { return this.detail('text'); }
  get revision() { return this.detail('revision'); }
  get digest() { return this.detail('digest'); }
  get length() { return this.detail('length'); }
  [SOURCE_FORM]() { return `source(${quote(this.id)},${quote(this.text)},${quote(this.revision)})`; }
}

class Span extends SemanticValue {
  constructor(source, start, end) {
    if (!(source instanceof SourceDocument)) throw new NllError('invalid-span-source', 'Span requires a source.');
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || end > source.length) {
      throw new NllError('invalid-anchor', `Invalid half-open span [${start}, ${end}) for ${source.id}.`);
    }
    const excerpt = codePoints(source.text).slice(start, end).join('');
    super('Span', { source, start, end, excerpt, digest: digestText(excerpt) });
  }
  get source() { return this.detail('source'); }
  get start() { return this.detail('start'); }
  get end() { return this.detail('end'); }
  get excerpt() { return this.detail('excerpt'); }
  get id() { return `${this.source.id}@${this.source.revision}:${this.start}-${this.end}`; }
  [SOURCE_FORM]() { return `span(sourceRef(${quote(this.source.id)}),${this.start},${this.end})`; }
}

class EpistemicStatus extends SemanticValue {
  constructor(name, assurance = name) { super('EpistemicStatus', { name, assurance }); }
  get name() { return this.detail('name'); }
  [SOURCE_FORM]() { return `${this.name}()`; }
}

class Qualifier extends SemanticValue {
  constructor(name, value) { super('Qualifier', { name, value }); }
  get name() { return this.detail('name'); }
  get value() { return this.detail('value'); }
  [SOURCE_FORM]() { return `${this.name}(${sourceOf(this.value)})`; }
}

class Mention extends SemanticValue {
  constructor(anchor, lexicalForm) {
    if (!(anchor instanceof Span)) throw new NllError('invalid-mention', 'Mention requires an exact span.');
    super('Mention', {
      anchor,
      lexicalForm,
      identity: `mention:${digestSource([anchor.id, lexicalForm])}`
    });
  }
  get anchor() { return this.detail('anchor'); }
  get lexicalForm() { return this.detail('lexicalForm'); }
  get identity() { return this.detail('identity'); }
  [SOURCE_FORM]() { return `mention(${this.anchor[SOURCE_FORM]()},${quote(this.lexicalForm)})`; }
}

class IdentityCandidate extends SemanticValue {
  constructor(mentionValue, entity, qualifiers) {
    if (!(mentionValue instanceof Mention) || !(entity instanceof Term)) {
      throw new NllError('invalid-identity-candidate', 'Identity candidate requires a mention and an entity term.');
    }
    super('IdentityCandidate', {
      mention: mentionValue,
      entity,
      qualifiers: Object.freeze([...qualifiers]),
      identity: `identity-candidate:${digestSource([mentionValue.identity, entity.identity, ...qualifiers.map(sourceOf)])}`
    });
  }
  get mention() { return this.detail('mention'); }
  get entity() { return this.detail('entity'); }
  get qualifiers() { return this.detail('qualifiers'); }
  get identity() { return this.detail('identity'); }
  [SOURCE_FORM]() { return `identityCandidate(${this.mention[SOURCE_FORM]()},${this.entity[SOURCE_FORM]()}${this.qualifiers.length ? `,${this.qualifiers.map(sourceOf).join(',')}` : ''})`; }
}

class Claim extends SemanticValue {
  constructor(content, qualifiers) {
    if (!(content instanceof Term)) throw new NllError('invalid-claim', 'A claim requires a ground ontology term.');
    const status = qualifiers.find((value) => value instanceof EpistemicStatus) || new EpistemicStatus('proposed');
    const anchors = qualifiers.filter((value) => value instanceof Qualifier && value.name === 'groundedAt')
      .map((value) => value.value);
    super('Claim', {
      content,
      status,
      qualifiers: Object.freeze([...qualifiers]),
      anchors: Object.freeze(anchors),
      identity: `claim:${digestSource([content.identity, status.name, ...anchors.map((anchor) => anchor.id)])}`
    });
  }
  get content() { return this.detail('content'); }
  get status() { return this.detail('status'); }
  get qualifiers() { return this.detail('qualifiers'); }
  get anchors() { return this.detail('anchors'); }
  get identity() { return this.detail('identity'); }
  [SOURCE_FORM]() {
    return `claim(${this.content[SOURCE_FORM]()}${this.qualifiers.length ? `,${this.qualifiers.map(sourceOf).join(',')}` : ''})`;
  }
}

class SemanticUnit extends SemanticValue {
  constructor(id, values) { super('SemanticUnit', { id, values: Object.freeze([...values]) }); }
  get id() { return this.detail('id'); }
  get values() { return this.detail('values'); }
  [SOURCE_FORM]() { return `semanticUnit(${quote(this.id)},${this.values.map(sourceOf).join(',')})`; }
}

class Interpretation extends SemanticValue {
  constructor(id, values, confidence) {
    super('Interpretation', { id, values: Object.freeze([...values]), confidence });
  }
  get id() { return this.detail('id'); }
  get values() { return this.detail('values'); }
  get confidence() { return this.detail('confidence'); }
  [SOURCE_FORM]() { return `interpretation(${quote(this.id)},${this.values.map(sourceOf).join(',')})`; }
}

class AlternativeSet extends SemanticValue {
  constructor(id, interpretations, incompatiblePairs = []) {
    super('AlternativeSet', {
      id,
      interpretations: Object.freeze([...interpretations]),
      incompatiblePairs: Object.freeze(incompatiblePairs.map((pair) => Object.freeze([...pair])))
    });
  }
  get id() { return this.detail('id'); }
  get interpretations() { return this.detail('interpretations'); }
  *relevant(predicate = () => true) {
    for (const reading of this.interpretations) if (predicate(reading)) yield reading;
  }
  [SOURCE_FORM]() { return `alternatives(${quote(this.id)},${this.interpretations.map(sourceOf).join(',')})`; }
}

class Coverage extends SemanticValue {
  constructor(concept, scope, state = 'closed') { super('Coverage', { concept, scope, state }); }
  get concept() { return this.detail('concept'); }
  get scope() { return this.detail('scope'); }
  get state() { return this.detail('state'); }
  [SOURCE_FORM]() { return `coverage(${quote(this.concept.id)},${sourceOf(this.scope)},${quote(this.state)})`; }
}

class Gap extends SemanticValue {
  constructor(kind, evidence) { super('Gap', { gapKind: kind, evidence: Object.freeze([...evidence]) }); }
  get gapKind() { return this.detail('gapKind'); }
  get evidence() { return this.detail('evidence'); }
  [SOURCE_FORM]() { return `gap(${quote(this.gapKind)},${this.evidence.map(sourceOf).join(',')})`; }
}

class LongTextProgram extends SemanticValue {
  constructor(id, source, units) {
    if (!(source instanceof SourceDocument)) throw new NllError('invalid-longtext-source', 'Program requires a source.');
    super('LongTextProgram', {
      id,
      source,
      units: Object.freeze([...units]),
      identity: `longtext:${digestSource([id, source.digest, ...units.map(sourceOf)])}`
    });
  }
  get id() { return this.detail('id'); }
  get source() { return this.detail('source'); }
  get units() { return this.detail('units'); }
  get identity() { return this.detail('identity'); }
  values() { return this.units.flatMap((unit) => unit instanceof SemanticUnit ? unit.values : [unit]); }
  [SOURCE_FORM]() { return `longTextProgram(${quote(this.id)},sourceRef(${quote(this.source.id)}),${this.units.map(sourceOf).join(',')})`; }
}

function sourceOf(value) {
  if (value && typeof value[SOURCE_FORM] === 'function') return value[SOURCE_FORM]();
  if (typeof value === 'string') return quote(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  throw new NllError('unsupported-longtext-value', `Unsupported LongTextJS value: ${String(value)}`);
}

export {
  AlternativeSet, Claim, Coverage, EpistemicStatus, Gap, IdentityCandidate, Interpretation, LongTextProgram,
  Mention, Qualifier, SemanticUnit, SourceDocument, Span
};
