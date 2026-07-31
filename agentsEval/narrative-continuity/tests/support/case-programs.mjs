import * as coreVocabulary from '../../../../ontologies/core/index.mjs';
import { compileMarkdown } from '../../../../src/longtext/compiler.mjs';
import {
  alternatives, claim, confidence, coverage, explicit, groundedAt, identityCandidate, inferred,
  interpretation, mention, semanticUnit, source, span
} from '../../../../src/longtext/api.mjs';
import { identifiedAs } from '../../../../src/ontology/api.mjs';
import { executeCircuit } from '../../../../src/runtime/scheduler.mjs';
import { SemanticStore } from '../../../../src/store/semantic-store.mjs';
import circuit from '../../circuits/continuity.circuit.mjs';
import * as vocabulary from '../../ontologies/index.mjs';

const CONFIG = new Map([
  ['closed-gap', Object.freeze({
    events: [
      ['leave', 'Mara', 'brass key', 'boathouse'],
      ['use', 'Mara', 'brass key', 'hill tower']
    ], coverage: 'closed'
  })],
  ['retrieved', Object.freeze({
    events: [
      ['leave', 'Tomas', 'red notebook', 'archive'],
      ['retrieve', 'Tomas', 'red notebook', 'archive'],
      ['use', 'Tomas', 'red notebook', 'hill tower']
    ], coverage: 'closed'
  })],
  ['open-gap', Object.freeze({
    events: [
      ['leave', 'Ivo', 'compass', 'train compartment'],
      ['use', 'Ivo', 'compass', 'harbor office']
    ], coverage: 'partial'
  })],
  ['coverage-conflict', Object.freeze({
    events: [
      ['leave', 'Mara', 'brass key', 'boathouse'],
      ['use', 'Mara', 'brass key', 'hill tower']
    ], coverage: 'conflict'
  })],
  ['reverse-order', Object.freeze({
    events: [
      ['use', 'Mara', 'brass key', 'hill tower'],
      ['leave', 'Mara', 'brass key', 'boathouse']
    ], coverage: 'closed'
  })],
  ['no-leave', Object.freeze({ events: [['use', 'Nora', 'violet scarf', 'harbor office']] })],
  ['different-actor', Object.freeze({
    events: [
      ['leave', 'Mara', 'black umbrella', 'cafe'],
      ['use', 'Elias', 'black umbrella', 'harbor office']
    ], coverage: 'closed'
  })],
  ['ambiguous', Object.freeze({ ambiguous: true })]
]);

function pointOffset(text, index) { return [...text.slice(0, index)].length; }

function caseMaterializer(id, sourceValue) {
  const config = CONFIG.get(id);
  if (!config) throw new Error(`Unknown continuity test case ${id}.`);
  const people = new Map();
  const objects = new Map();
  const places = new Map();
  const person = (name) => {
    if (!people.has(name)) people.set(name, vocabulary.Person(identifiedAs(`person:${name}`), vocabulary.named(name)));
    return people.get(name);
  };
  const portable = (name) => {
    if (!objects.has(name)) objects.set(name, vocabulary.PortableObject(identifiedAs(`object:${name}`), vocabulary.named(name)));
    return objects.get(name);
  };
  const place = (name) => {
    if (!places.has(name)) places.set(name, vocabulary.NarrativePlace(identifiedAs(`place:${name}`), vocabulary.named(name)));
    return places.get(name);
  };
  const exact = (excerpt) => {
    const index = sourceValue.text.indexOf(excerpt);
    if (index < 0) throw new Error(`Missing benchmark excerpt: ${excerpt}`);
    const start = pointOffset(sourceValue.text, index);
    return span(sourceValue, start, start + [...excerpt].length);
  };

  if (config.ambiguous) {
    const sentence = 'Mara used "the silver case" in the hill tower.';
    const phrase = 'the silver case';
    const sentenceAnchor = exact(sentence);
    const mentionAnchor = exact(phrase);
    const reference = mention(mentionAnchor, phrase);
    const use = vocabulary.Use(
      identifiedAs('event:ambiguous-use'), vocabulary.actor(person('Mara')),
      vocabulary.referenceKey(reference.identity), vocabulary.atPlace(place('hill tower')),
      vocabulary.narrativeOrder(1), vocabulary.eventAnchor(sentenceAnchor)
    );
    return [semanticUnit(
      'ambiguous-use', claim(use, explicit(), groundedAt(sentenceAnchor)), reference,
      alternatives('silver-case-readings',
        interpretation('cigarette-case', identityCandidate(reference, portable('cigarette case'), confidence(0.5))),
        interpretation('map-case', identityCandidate(reference, portable('map case'), confidence(0.5))))
    )];
  }

  const constructors = new Map([
    ['leave', vocabulary.Leave], ['retrieve', vocabulary.Retrieve], ['use', vocabulary.Use]
  ]);
  const verbs = new Map([['leave', 'left'], ['retrieve', 'retrieved'], ['use', 'used']]);
  const sentence = (record) => `${record[1]} ${verbs.get(record[0])} the ${record[2]} ${record[0] === 'retrieve' ? 'from' : 'in'} the ${record[3]}.`;
  const events = config.events.map((record, index) => {
    const anchor = exact(sentence(record));
    return constructors.get(record[0])(
      identifiedAs(`event:${id}:${index}`), vocabulary.actor(person(record[1])),
      vocabulary.object(portable(record[2])), vocabulary.atPlace(place(record[3])),
      vocabulary.narrativeOrder(index), vocabulary.eventAnchor(anchor)
    );
  });
  const units = events.map((event, index) => semanticUnit(
    `event-${index}`, claim(event, explicit(), groundedAt(event.value(vocabulary.eventAnchor)))
  ));
  for (let index = 1; index < events.length; index += 1) {
    units.push(semanticUnit(`before-${index}`, claim(
      vocabulary.DirectBefore(vocabulary.earlier(events[index - 1]), vocabulary.later(events[index])),
      inferred(), groundedAt(events[index - 1].value(vocabulary.eventAnchor)),
      groundedAt(events[index].value(vocabulary.eventAnchor))
    )));
  }
  const useEvent = events.find((event) => event.concept === vocabulary.Use.definition);
  const leaveEvent = events.find((event) => event.concept === vocabulary.Leave.definition);
  if (useEvent && leaveEvent && config.coverage) {
    const objectValue = useEvent.value(vocabulary.object);
    const interval = vocabulary.NarrativeInterval(
      identifiedAs(`interval:${id}`), vocabulary.named(`${id} retrieval interval`),
      vocabulary.intervalObject(objectValue), vocabulary.intervalStart(leaveEvent), vocabulary.intervalEnd(useEvent)
    );
    const coverageSentence = sourceValue.text.split('\n').find((line) => line.startsWith('The account between'));
    const coverageAnchor = exact(coverageSentence);
    const notice = vocabulary.CoverageNotice(
      identifiedAs(`coverage:${id}`), vocabulary.intervalScope(interval),
      vocabulary.coverageState(config.coverage), vocabulary.eventAnchor(coverageAnchor)
    );
    units.push(
      semanticUnit('interval', claim(interval, inferred(), groundedAt(leaveEvent.value(vocabulary.eventAnchor)),
        groundedAt(useEvent.value(vocabulary.eventAnchor)))),
      semanticUnit('coverage', claim(notice, explicit(), groundedAt(coverageAnchor)),
        coverage(vocabulary.Retrieve, interval, config.coverage))
    );
  }
  return units;
}

async function runCase(id, text) {
  const sourceValue = source(`${id}.md`, text, 'benchmark-r1');
  const program = await compileMarkdown(sourceValue, { ...coreVocabulary, ...vocabulary }, [
    ({ source: selected }) => caseMaterializer(id, selected)
  ]);
  const store = new SemanticStore();
  store.publish(program);
  const execution = await executeCircuit(circuit, store);
  return Object.freeze({ program, store, execution });
}

export { runCase };
