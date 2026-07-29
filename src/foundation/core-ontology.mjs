import { digestJson } from '../core/canonical.mjs';
import { NllError } from '../core/errors.mjs';
import {
  FOUNDATION_CLASSES,
  FOUNDATION_MEASURES,
  MEASURE_UNITS,
  normalizeFoundationTerm,
  parseArithmeticSentence,
  parseEmotionSentence,
  parseQuantitySentence,
  stripFoundationSentenceEnd,
  typeAssertionFromState
} from './domain-ontology.mjs';

const FOUNDATION_MODES = new Set(['core', 'off']);
const FOUNDATION_PRODUCER = 'foundation.controlled-english@1';
const FOUNDATION_TYPES = Object.freeze([
  'foundation.entity-mention@1',
  'foundation.state-assertion@1',
  'foundation.type-assertion@1',
  'foundation.temporal-relation@1',
  'foundation.arithmetic-assertion@1',
  'foundation.quantity-assertion@1',
  'foundation.emotion-assertion@1'
]);

const FOUNDATION_CORE = Object.freeze({
  kind: 'FoundationPack',
  id: 'foundation-core',
  version: '1.1.0',
  dialect: 'nll-foundation@1',
  default: true,
  languageProfile: 'controlled-english@1',
  observationTypes: FOUNDATION_TYPES,
  principles: Object.freeze([
    'one bounded assertion cannot be both affirmed and denied',
    'declared mutually exclusive states cannot hold in the same bounded context',
    'a strict before relation cannot contain a directed cycle',
    'an exact decimal equality must replay without division by zero',
    'bounded physical quantities must use compatible units and elementary ranges',
    'explicit type and emotion assertions must respect bounded ontology constraints'
  ]),
  vocabularies: Object.freeze({
    classes: FOUNDATION_CLASSES,
    measures: FOUNDATION_MEASURES,
    units: MEASURE_UNITS
  }),
  limitations: Object.freeze([
    'The deterministic materializer recognizes only documented controlled-English forms.',
    'An omitted time is not proof that two assertions describe the same real-world moment.',
    'Emotion observations are literal source attributions, not diagnoses or inferred feelings.',
    'Physics is limited to documented units, ranges, and exact quantity disagreement.',
    'The pack contains no changing political, social, economic, or geographic facts.'
  ])
});

function normalizeTerm(value) {
  return normalizeFoundationTerm(value);
}

function stripSentenceEnd(value) {
  return stripFoundationSentenceEnd(value);
}

function parseStateSentence(text) {
  const source = stripSentenceEnd(text);
  const match = /^(.+?)\s+(is|are|was|were)\s+(not\s+)?(.+)$/iu.exec(source);
  if (!match) return null;
  const subject = match[1].trim();
  let predicate = match[4].trim();
  let time = null;
  const timed = /^(.+?)\s+at\s+(.+)$/iu.exec(predicate);
  if (timed) {
    predicate = timed[1].trim();
    time = timed[2].trim();
  }
  if (!subject || !predicate) return null;
  return {
    subject,
    subjectKey: normalizeTerm(subject),
    predicate,
    predicateKey: normalizeTerm(predicate),
    polarity: match[3] ? 'denied' : 'affirmed',
    time,
    timeKey: time ? normalizeTerm(time) : 'unspecified',
    timeFrame: ['was', 'were'].includes(match[2].toLocaleLowerCase('en')) ? 'past' : 'present',
    world: 'world:source',
    grammar: 'copular-state@1'
  };
}

function parseTemporalSentence(text) {
  const source = stripSentenceEnd(text);
  const match = /^(.+?)\s+(?:happened|occurred|happens|occurs|took\s+place|takes\s+place)\s+before\s+(.+)$/iu.exec(source);
  if (!match) return null;
  const earlier = match[1].trim();
  const later = match[2].trim();
  if (!earlier || !later) return null;
  return {
    earlier,
    earlierKey: normalizeTerm(earlier),
    later,
    laterKey: normalizeTerm(later),
    relation: 'before',
    world: 'world:source',
    grammar: 'explicit-before@1'
  };
}

function observationId(sentence, role, payload) {
  const suffix = digestJson({ sentence: sentence.id, role, payload }).slice(7, 23);
  return `observation:foundation:${role}:${suffix}`;
}

function makeObservation(sentence, role, type, payload) {
  return {
    id: observationId(sentence, role, payload),
    type,
    status: 'extracted',
    scope: sentence.scope,
    anchors: [...sentence.anchors],
    support: [...sentence.anchors],
    alternatives: [],
    confidence: 1,
    payload,
    provenance: {
      producer: FOUNDATION_PRODUCER,
      sourceObservation: sentence.id,
      grammar: payload.grammar || 'entity-from-foundation-parse@1'
    }
  };
}

function entityObservation(sentence, label, role) {
  return makeObservation(sentence, `entity-${role}`, 'foundation.entity-mention@1', {
    label,
    normalized: normalizeTerm(label),
    role,
    world: 'world:source',
    grammar: 'entity-from-foundation-parse@1'
  });
}

function foundationPackDescriptor(mode = 'core') {
  if (!FOUNDATION_MODES.has(mode)) {
    throw new NllError('invalid-foundation', `Unknown foundation mode ${mode}.`, {
      supported: [...FOUNDATION_MODES]
    });
  }
  if (mode === 'off') return Object.freeze({ kind: 'FoundationSelection', mode: 'off' });
  return Object.freeze({ ...FOUNDATION_CORE, mode: 'core', digest: digestJson(FOUNDATION_CORE) });
}

function materializeFoundationCore(program) {
  const added = [];
  for (const sentence of program.observations.filter((item) => item.type === 'document.sentence@1')) {
    const text = sentence.payload?.text;
    if (typeof text !== 'string') continue;
    const arithmetic = parseArithmeticSentence(text);
    if (arithmetic) {
      added.push(makeObservation(sentence, 'arithmetic', 'foundation.arithmetic-assertion@1', arithmetic));
      continue;
    }
    const quantity = parseQuantitySentence(text);
    if (quantity) {
      added.push(
        entityObservation(sentence, quantity.subject, 'quantity-subject'),
        makeObservation(sentence, 'quantity', 'foundation.quantity-assertion@1', quantity)
      );
      continue;
    }
    const emotion = parseEmotionSentence(text);
    if (emotion) {
      added.push(
        entityObservation(sentence, emotion.experiencer, 'emotion-experiencer'),
        ...(emotion.target ? [entityObservation(sentence, emotion.target, 'emotion-target')] : []),
        makeObservation(sentence, 'emotion', 'foundation.emotion-assertion@1', emotion)
      );
      continue;
    }
    const temporal = parseTemporalSentence(text);
    if (temporal) {
      added.push(
        entityObservation(sentence, temporal.earlier, 'earlier-event'),
        entityObservation(sentence, temporal.later, 'later-event'),
        makeObservation(sentence, 'temporal', 'foundation.temporal-relation@1', temporal)
      );
      continue;
    }
    const state = parseStateSentence(text);
    if (!state) continue;
    const typeAssertion = typeAssertionFromState(state);
    added.push(
      entityObservation(sentence, state.subject, 'state-subject'),
      makeObservation(sentence, 'state', 'foundation.state-assertion@1', state),
      ...(typeAssertion
        ? [makeObservation(sentence, 'type', 'foundation.type-assertion@1', typeAssertion)] : [])
    );
  }
  const existing = new Set(program.observations.map((item) => item.id));
  let materialized = 0;
  for (const observation of added) {
    if (!existing.has(observation.id)) {
      program.observations.push(observation);
      existing.add(observation.id);
      materialized += 1;
    }
  }
  if (!program.schemas.includes('foundation-core@1')) program.schemas.push('foundation-core@1');
  program.ontologyPacks = [foundationPackDescriptor('core')];
  for (const type of FOUNDATION_TYPES) {
    if (!program.capabilities.some((item) => item.type === type && item.producer === FOUNDATION_PRODUCER)) {
      program.capabilities.push({
        type,
        producer: FOUNDATION_PRODUCER,
        coverage: 'open',
        statuses: ['extracted']
      });
    }
  }
  if (!program.coverage.some((item) => item.id === 'coverage:foundation-controlled-english')) {
    program.coverage.push({
      id: 'coverage:foundation-controlled-english',
      source: program.source.id,
      revision: program.source.revision,
      scope: 'view:whole',
      types: FOUNDATION_TYPES,
      producer: FOUNDATION_PRODUCER,
      mode: 'open-world',
      exclusions: [
        'implicit propositions and event order',
        'reported speech, modality, identity resolution, figurative emotion, and non-controlled syntax',
        'implicit mathematics, quantities, physical conditions, and psychological interpretation',
        'contingent world knowledge'
      ],
      verified: true,
      channels: ['body'],
      method: 'complete-controlled-english-pattern-scan'
    });
  }
  return { materialized, descriptor: program.ontologyPacks[0] };
}

function configureFoundation(program, mode = 'core') {
  const descriptor = foundationPackDescriptor(mode);
  if (mode === 'off') {
    program.ontologyPacks = [descriptor];
    return { materialized: 0, descriptor };
  }
  return materializeFoundationCore(program);
}

export {
  FOUNDATION_CORE,
  FOUNDATION_MODES,
  FOUNDATION_PRODUCER,
  FOUNDATION_TYPES,
  configureFoundation,
  foundationPackDescriptor,
  materializeFoundationCore,
  normalizeTerm,
  parseStateSentence,
  parseTemporalSentence
};
