import {
  alternatives, ambiguous, claim, confidence, coverage, explicit, gap, groundedAt, identityCandidate,
  inferred, interpretation, mention, semanticUnit, span
} from '../../../src/longtext/api.mjs';
import { identifiedAs } from '../../../src/ontology/api.mjs';
import {
  CoverageNotice, DirectBefore, Leave, NarrativeInterval, NarrativePlace, Person, PortableObject,
  Retrieve, Use, actor, atPlace, coverageState, earlier, eventAnchor, intervalEnd, intervalObject,
  intervalScope, intervalStart, later, named, narrativeOrder, object, referenceKey
} from '../ontologies/index.mjs';

const EVENT_PATTERNS = Object.freeze([
  Object.freeze({
    kind: 'leave',
    expression: /(?<person>[A-Z][a-z]+) left the (?<object>[a-z][a-z-]*(?: [a-z][a-z-]*){0,3}) in the (?<place>[a-z][a-z-]*(?: [a-z][a-z-]*){0,3})\./gu
  }),
  Object.freeze({
    kind: 'retrieve',
    expression: /(?<person>[A-Z][a-z]+) retrieved the (?<object>[a-z][a-z-]*(?: [a-z][a-z-]*){0,3}) from the (?<place>[a-z][a-z-]*(?: [a-z][a-z-]*){0,3})\./gu
  }),
  Object.freeze({
    kind: 'use',
    expression: /(?<person>[A-Z][a-z]+) used the (?<object>[a-z][a-z-]*(?: [a-z][a-z-]*){0,3}) in the (?<place>[a-z][a-z-]*(?: [a-z][a-z-]*){0,3})\./gu
  }),
  Object.freeze({
    kind: 'ambiguous-use',
    expression: /(?<person>[A-Z][a-z]+) used "(?<reference>the [a-z][a-z-]*(?: [a-z][a-z-]*){0,3})" in the (?<place>[a-z][a-z-]*(?: [a-z][a-z-]*){0,3})\./gu
  })
]);

const COVERAGE_PATTERN = /The account between leaving the (?<left>[a-z][a-z-]*(?: [a-z][a-z-]*){0,3}) and using the (?<used>[a-z][a-z-]*(?: [a-z][a-z-]*){0,3}) is (?<state>complete|incomplete|both complete and incomplete)\./gu;
const IDENTITY_PATTERN = /In that sentence, "(?<reference>the [a-z][a-z-]*(?: [a-z][a-z-]*){0,3})" may name either the (?<first>[a-z][a-z-]*(?: [a-z][a-z-]*){0,3}) or the (?<second>[a-z][a-z-]*(?: [a-z][a-z-]*){0,3})\./gu;

function normalize(value) { return value.toLowerCase().replace(/^the /u, '').replace(/\s+/gu, ' ').trim(); }
function slug(value) { return normalize(value).replace(/[^a-z0-9]+/gu, '-'); }
function pointOffset(text, codeUnitOffset) { return [...text.slice(0, codeUnitOffset)].length; }
function exactSpan(sourceValue, codeUnitStart, codeUnitLength) {
  const start = pointOffset(sourceValue.text, codeUnitStart);
  return span(sourceValue, start, start + [...sourceValue.text.slice(codeUnitStart, codeUnitStart + codeUnitLength)].length);
}

function entityFactories() {
  const people = new Map();
  const objects = new Map();
  const places = new Map();
  return Object.freeze({
    person(value) {
      const key = normalize(value);
      if (!people.has(key)) people.set(key, Person(identifiedAs(`person:${slug(key)}`), named(value)));
      return people.get(key);
    },
    object(value) {
      const key = normalize(value);
      if (!objects.has(key)) objects.set(key, PortableObject(identifiedAs(`object:${slug(key)}`), named(key)));
      return objects.get(key);
    },
    place(value) {
      const key = normalize(value);
      if (!places.has(key)) places.set(key, NarrativePlace(identifiedAs(`place:${slug(key)}`), named(key)));
      return places.get(key);
    }
  });
}

function collectEventRecords(sourceValue) {
  const records = [];
  for (const definition of EVENT_PATTERNS) {
    for (const match of sourceValue.text.matchAll(definition.expression)) {
      const anchor = exactSpan(sourceValue, match.index, match[0].length);
      const reference = match.groups.reference || null;
      const referenceIndex = reference ? match.index + match[0].indexOf(reference) : null;
      records.push({
        kind: definition.kind,
        personName: match.groups.person,
        objectName: match.groups.object || null,
        placeName: match.groups.place,
        reference,
        referenceAnchor: reference ? exactSpan(sourceValue, referenceIndex, reference.length) : null,
        start: anchor.start,
        anchor
      });
    }
  }
  return records.sort((left, right) => left.start - right.start);
}

function constructEvent(record, orderValue, entities) {
  const personTerm = entities.person(record.personName);
  const objectTerm = record.objectName ? entities.object(record.objectName) : null;
  const placeTerm = entities.place(record.placeName);
  const common = [
    identifiedAs(`event:${record.kind}:${record.anchor.start}-${record.anchor.end}`),
    actor(personTerm), atPlace(placeTerm), narrativeOrder(orderValue), eventAnchor(record.anchor)
  ];
  let term;
  let mentionValue = null;
  if (record.kind === 'leave') term = Leave(...common, object(objectTerm));
  else if (record.kind === 'retrieve') term = Retrieve(...common, object(objectTerm));
  else if (record.kind === 'use') term = Use(...common, object(objectTerm));
  else {
    mentionValue = mention(record.referenceAnchor, record.reference);
    term = Use(...common, referenceKey(mentionValue.identity));
  }
  return Object.freeze({ ...record, term, personTerm, objectTerm, placeTerm, mention: mentionValue, order: orderValue });
}

function intervalFor(useEvent, leaveEvent) {
  return NarrativeInterval(
    identifiedAs(`interval:${useEvent.term.identity}`),
    named(`retrieval interval for ${useEvent.term.identity}`),
    intervalObject(useEvent.objectTerm), intervalStart(leaveEvent.term), intervalEnd(useEvent.term)
  );
}

function eventUnits(events) {
  return events.map((event, index) => semanticUnit(
    `continuity-event-${index}`,
    claim(event.term, explicit(), groundedAt(event.anchor)),
    ...(event.mention ? [event.mention] : [])
  ));
}

function temporalUnits(events) {
  const units = [];
  for (let index = 1; index < events.length; index += 1) {
    const first = events[index - 1];
    const second = events[index];
    units.push(semanticUnit(
      `direct-before-${index - 1}-${index}`,
      claim(
        DirectBefore(earlier(first.term), later(second.term)),
        inferred(), groundedAt(first.anchor), groundedAt(second.anchor)
      )
    ));
  }
  return units;
}

function identityUnits(sourceValue, events, entities) {
  const units = [];
  const resolvedMentions = new Set();
  for (const match of sourceValue.text.matchAll(IDENTITY_PATTERN)) {
    const useEvent = [...events].reverse().find((event) => event.mention
      && event.reference === match.groups.reference && event.start < pointOffset(sourceValue.text, match.index));
    if (!useEvent) continue;
    const first = identityCandidate(useEvent.mention, entities.object(match.groups.first), confidence(0.5));
    const second = identityCandidate(useEvent.mention, entities.object(match.groups.second), confidence(0.5));
    units.push(semanticUnit(
      `identity-alternatives-${units.length}`,
      alternatives(
        `identity:${useEvent.mention.identity}`,
        interpretation('candidate-first', first),
        interpretation('candidate-second', second)
      )
    ));
    resolvedMentions.add(useEvent.mention.identity);
  }
  for (const event of events.filter((value) => value.mention && !resolvedMentions.has(value.mention.identity))) {
    units.push(semanticUnit(`identity-gap-${units.length}`, gap('identity-unresolved', event.mention.anchor)));
  }
  return units;
}

function intervalUnits(events) {
  const units = [];
  for (const useEvent of events.filter((event) => event.kind === 'use')) {
    const leaveEvent = [...events].reverse().find((event) => event.kind === 'leave'
      && event.objectTerm.identity === useEvent.objectTerm.identity && event.start < useEvent.start);
    if (!leaveEvent) continue;
    units.push(semanticUnit(
      `interval-${units.length}`,
      claim(intervalFor(useEvent, leaveEvent), inferred(), groundedAt(leaveEvent.anchor), groundedAt(useEvent.anchor))
    ));
  }
  return units;
}

function coverageUnits(sourceValue, events) {
  const units = [];
  const coveredUses = new Set();
  for (const match of sourceValue.text.matchAll(COVERAGE_PATTERN)) {
    if (normalize(match.groups.left) !== normalize(match.groups.used)) continue;
    const noticeAnchor = exactSpan(sourceValue, match.index, match[0].length);
    const useEvent = [...events].reverse().find((event) => event.kind === 'use'
      && normalize(event.objectName) === normalize(match.groups.used) && event.start < noticeAnchor.start);
    if (!useEvent) continue;
    const leaveEvent = [...events].reverse().find((event) => event.kind === 'leave'
      && event.objectTerm.identity === useEvent.objectTerm.identity && event.start < useEvent.start);
    if (!leaveEvent) continue;
    const interval = intervalFor(useEvent, leaveEvent);
    const state = match.groups.state === 'complete' ? 'closed'
      : match.groups.state === 'incomplete' ? 'partial' : 'conflict';
    const notice = CoverageNotice(
      identifiedAs(`coverage-notice:${noticeAnchor.start}-${noticeAnchor.end}`),
      intervalScope(interval), coverageState(state), eventAnchor(noticeAnchor)
    );
    const values = [
      claim(notice, explicit(), groundedAt(noticeAnchor)),
      coverage(Retrieve, interval, state)
    ];
    if (state !== 'closed') values.push(gap(
      state === 'conflict' ? 'retrieval-coverage-conflict' : 'retrieval-coverage-open',
      noticeAnchor, useEvent.anchor
    ));
    units.push(semanticUnit(`coverage-${units.length}`, ...values));
    coveredUses.add(useEvent.term.identity);
  }
  for (const useEvent of events.filter((event) => event.kind === 'use' && !coveredUses.has(event.term.identity))) {
    units.push(semanticUnit(`coverage-gap-${units.length}`, gap('retrieval-coverage-unknown', useEvent.anchor)));
  }
  return units;
}

function materializeContinuity({ source: sourceValue }) {
  const entities = entityFactories();
  const records = collectEventRecords(sourceValue);
  const events = records.map((record, index) => constructEvent(record, index, entities));
  return [
    ...eventUnits(events),
    ...temporalUnits(events),
    ...identityUnits(sourceValue, events, entities),
    ...intervalUnits(events),
    ...coverageUnits(sourceValue, events)
  ];
}

export { materializeContinuity };
