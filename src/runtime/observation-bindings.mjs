import { invariant } from '../core/errors.mjs';

const BINDING_KEYS = new Set([
  'type', 'types', 'cardinality', 'statuses', 'coverage', 'critical',
  'scopeRelation', 'guarantee', 'where'
]);
const MATCH_KEYS = new Set(['path', 'operator', 'value']);
const MATCH_OPERATORS = new Set([
  'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'includes', 'in', 'startsWith', 'exists'
]);
const SAFE_PATH = /^[A-Za-z][A-Za-z0-9]*(?:\.[A-Za-z][A-Za-z0-9]*)*$/u;
const FORBIDDEN_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype']);

function isMatcherScalar(value) {
  return value === null || ['string', 'number', 'boolean'].includes(typeof value);
}

function valueAtPath(value, path) {
  return path.split('.').reduce((current, segment) => current?.[segment], value);
}

function validateObservationMatchers(where, label) {
  invariant(where === undefined || Array.isArray(where), 'invalid-circuit',
    `${label}.where must be an array of declarative matchers.`);
  for (const [index, matcher] of (where || []).entries()) {
    invariant(matcher && typeof matcher === 'object' && !Array.isArray(matcher),
      'invalid-circuit', `${label}.where[${index}] must be an object.`);
    const unknown = Object.keys(matcher).filter((key) => !MATCH_KEYS.has(key));
    invariant(unknown.length === 0, 'invalid-circuit',
      `${label}.where[${index}] contains unsupported property ${unknown[0]}.`);
    invariant(typeof matcher.path === 'string' && SAFE_PATH.test(matcher.path)
      && matcher.path.split('.').every((segment) => !FORBIDDEN_SEGMENTS.has(segment)),
    'invalid-circuit', `${label}.where[${index}] requires a safe static field path.`);
    invariant(MATCH_OPERATORS.has(matcher.operator), 'invalid-circuit',
      `${label}.where[${index}] has unsupported operator ${matcher.operator}.`);
    if (matcher.operator === 'in') {
      invariant(Array.isArray(matcher.value) && matcher.value.every(isMatcherScalar), 'invalid-circuit',
        `${label}.where[${index}] operator in requires an array of scalar values.`);
    } else if (['gt', 'gte', 'lt', 'lte'].includes(matcher.operator)) {
      invariant(typeof matcher.value === 'number' && Number.isFinite(matcher.value), 'invalid-circuit',
        `${label}.where[${index}] operator ${matcher.operator} requires a finite numeric value.`);
    } else if (matcher.operator === 'startsWith') {
      invariant(typeof matcher.value === 'string', 'invalid-circuit',
        `${label}.where[${index}] operator startsWith requires a string value.`);
    } else if (['eq', 'neq', 'includes'].includes(matcher.operator)) {
      invariant(isMatcherScalar(matcher.value), 'invalid-circuit',
        `${label}.where[${index}] operator ${matcher.operator} requires a scalar value.`);
    }
    if (matcher.operator === 'exists') {
      invariant(matcher.value === undefined || typeof matcher.value === 'boolean', 'invalid-circuit',
        `${label}.where[${index}] operator exists accepts only a boolean value.`);
    } else {
      invariant(Object.hasOwn(matcher, 'value'), 'invalid-circuit',
        `${label}.where[${index}] requires value.`);
    }
  }
}

function validateObservationBindingKeys(binding, label) {
  const unknown = Object.keys(binding).filter((key) => !BINDING_KEYS.has(key));
  invariant(unknown.length === 0, 'invalid-circuit',
    `${label} contains unsupported property ${unknown[0]}.`, { unknown });
  validateObservationMatchers(binding.where, label);
}

function matcherResult(actual, matcher) {
  const expected = matcher.value;
  if (matcher.operator === 'eq') return actual === expected;
  if (matcher.operator === 'neq') return actual !== expected;
  if (matcher.operator === 'gt') return typeof actual === 'number' && actual > expected;
  if (matcher.operator === 'gte') return typeof actual === 'number' && actual >= expected;
  if (matcher.operator === 'lt') return typeof actual === 'number' && actual < expected;
  if (matcher.operator === 'lte') return typeof actual === 'number' && actual <= expected;
  if (matcher.operator === 'includes') {
    return Array.isArray(actual) ? actual.includes(expected)
      : typeof actual === 'string' && typeof expected === 'string' && actual.includes(expected);
  }
  if (matcher.operator === 'in') return expected.includes(actual);
  if (matcher.operator === 'startsWith') {
    return typeof actual === 'string' && actual.startsWith(expected);
  }
  if (matcher.operator === 'exists') {
    const exists = actual !== undefined && actual !== null;
    return matcher.value === false ? !exists : exists;
  }
  return false;
}

function matchesObservationBinding(observation, binding) {
  const types = binding.types || [binding.type];
  if (!types.includes(observation.type)) return false;
  if (binding.statuses?.length && !binding.statuses.includes(observation.status)) return false;
  return (binding.where || []).every((matcher) =>
    matcherResult(valueAtPath(observation, matcher.path), matcher));
}

function observationBindingFields(binding) {
  return [...new Set((binding.where || []).map((matcher) => matcher.path))].sort();
}

export {
  BINDING_KEYS,
  MATCH_OPERATORS,
  matchesObservationBinding,
  observationBindingFields,
  validateObservationBindingKeys,
  validateObservationMatchers,
  valueAtPath
};
