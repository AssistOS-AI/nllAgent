import { DECIMAL_PATTERN } from './exact-arithmetic.mjs';

const FOUNDATION_CLASSES = Object.freeze([
  'person', 'animal', 'sentient agent', 'inanimate object', 'physical object', 'event', 'place'
]);
const FOUNDATION_MEASURES = Object.freeze([
  'mass', 'duration', 'distance', 'length', 'speed', 'temperature', 'probability', 'percentage'
]);
const MEASURE_UNITS = Object.freeze({
  mass: Object.freeze(['kg', 'g', 'kilogram', 'kilograms', 'gram', 'grams']),
  duration: Object.freeze(['s', 'ms', 'min', 'h', 'second', 'seconds', 'minute', 'minutes', 'hour', 'hours']),
  distance: Object.freeze(['m', 'km', 'cm', 'mm', 'meter', 'meters', 'kilometer', 'kilometers']),
  length: Object.freeze(['m', 'km', 'cm', 'mm', 'meter', 'meters', 'kilometer', 'kilometers']),
  speed: Object.freeze(['m/s', 'km/h']),
  temperature: Object.freeze(['k', 'kelvin', 'c', '°c', 'celsius', 'f', '°f', 'fahrenheit']),
  probability: Object.freeze(['']),
  percentage: Object.freeze(['', '%'])
});

function normalizeFoundationTerm(value) {
  return String(value).normalize('NFKC').trim().toLocaleLowerCase('en')
    .replace(/[“”"']/gu, '').replace(/\s+/gu, ' ');
}

function stripFoundationSentenceEnd(value) {
  return value.trim().replace(/[.!?]+$/u, '').trim();
}

function splitOptionalTime(value) {
  const marker = value.toLocaleLowerCase('en').lastIndexOf(' at ');
  if (marker < 0) return { body: value.trim(), time: null };
  return { body: value.slice(0, marker).trim(), time: value.slice(marker + 4).trim() || null };
}

function parseArithmeticSentence(text) {
  const source = stripFoundationSentenceEnd(text);
  const match = /^([+-]?\d+(?:\.\d+)?)\s+(plus|minus|times|divided\s+by)\s+([+-]?\d+(?:\.\d+)?)\s+equals\s+([+-]?\d+(?:\.\d+)?)$/iu.exec(source);
  if (!match || !match.slice(1, 5).every((value, index) => index === 1 || DECIMAL_PATTERN.test(value))) return null;
  return {
    left: match[1],
    operator: normalizeFoundationTerm(match[2]).replace(/\s+/gu, '-'),
    right: match[3],
    result: match[4],
    world: 'world:source',
    grammar: 'exact-decimal-equality@1'
  };
}

function parseQuantitySentence(text) {
  const source = stripFoundationSentenceEnd(text);
  const match = /^(.+?)\s+has\s+(mass|duration|distance|length|speed|temperature|probability|percentage)\s+(.+)$/iu.exec(source);
  if (!match) return null;
  const { body, time } = splitOptionalTime(match[3]);
  const valueMatch = /^([+-]?\d+(?:\.\d+)?)(?:\s+([^\s]+))?$/u.exec(body);
  if (!valueMatch || !DECIMAL_PATTERN.test(valueMatch[1])) return null;
  const subject = match[1].trim();
  const measure = normalizeFoundationTerm(match[2]);
  const unit = valueMatch[2] || null;
  return {
    subject,
    subjectKey: normalizeFoundationTerm(subject),
    measure,
    measureKey: measure,
    value: valueMatch[1],
    unit,
    unitKey: normalizeFoundationTerm(unit || ''),
    time,
    timeKey: time ? normalizeFoundationTerm(time) : 'unspecified',
    timeFrame: 'present',
    world: 'world:source',
    grammar: 'bounded-quantity@1'
  };
}

function parseEmotionSentence(text) {
  const source = stripFoundationSentenceEnd(text);
  const match = /^(.+?)\s+(does\s+not\s+feel|did\s+not\s+feel|feels|felt)\s+(.+)$/iu.exec(source);
  if (!match) return null;
  const { body: targetBody, time } = splitOptionalTime(match[3]);
  const targetMarker = targetBody.toLocaleLowerCase('en').lastIndexOf(' toward ');
  const emotion = (targetMarker < 0 ? targetBody : targetBody.slice(0, targetMarker)).trim();
  const target = targetMarker < 0 ? null : targetBody.slice(targetMarker + 8).trim() || null;
  const experiencer = match[1].trim();
  if (!experiencer || !emotion) return null;
  const verb = normalizeFoundationTerm(match[2]);
  return {
    experiencer,
    experiencerKey: normalizeFoundationTerm(experiencer),
    emotion,
    emotionKey: normalizeFoundationTerm(emotion),
    polarity: verb.includes('not') ? 'denied' : 'affirmed',
    target,
    targetKey: target ? normalizeFoundationTerm(target) : 'unspecified',
    time,
    timeKey: time ? normalizeFoundationTerm(time) : 'unspecified',
    timeFrame: verb === 'felt' || verb.startsWith('did ') ? 'past' : 'present',
    world: 'world:source',
    grammar: 'literal-emotion-attribution@1'
  };
}

function typeAssertionFromState(state) {
  const predicate = state?.predicate?.replace(/^(?:a|an)\s+/iu, '').trim();
  const kind = normalizeFoundationTerm(predicate || '');
  if (!FOUNDATION_CLASSES.includes(kind)) return null;
  return {
    subject: state.subject,
    subjectKey: state.subjectKey,
    type: predicate,
    typeKey: kind,
    polarity: state.polarity,
    time: state.time,
    timeKey: state.timeKey,
    timeFrame: state.timeFrame,
    world: state.world,
    grammar: 'classified-kind@1'
  };
}

export {
  FOUNDATION_CLASSES,
  FOUNDATION_MEASURES,
  MEASURE_UNITS,
  normalizeFoundationTerm,
  parseArithmeticSentence,
  parseEmotionSentence,
  parseQuantitySentence,
  splitOptionalTime,
  stripFoundationSentenceEnd,
  typeAssertionFromState
};
