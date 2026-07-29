import { deepFreeze, normalizeJson } from '../core/canonical.mjs';
import { NllError, invariant } from '../core/errors.mjs';

const VALUE_TYPES = new Set([
  'any', 'null', 'boolean', 'string', 'number', 'integer', 'array', 'object'
]);
const SCHEMA_KEYS = new Set([
  'id', 'description', 'type', 'properties', 'required', 'additionalProperties',
  'items', 'enum', 'minimum', 'maximum', 'minItems', 'maxItems'
]);

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertSchemaObject(schema, path) {
  invariant(isPlainObject(schema), 'invalid-value-schema', `${path} must be a plain schema object.`);
  const unknown = Object.keys(schema).filter((key) => !SCHEMA_KEYS.has(key));
  invariant(unknown.length === 0, 'invalid-value-schema',
    `${path} contains unsupported schema property ${unknown[0]}.`, { path, unknown });
  invariant(VALUE_TYPES.has(schema.type), 'invalid-value-schema',
    `${path}.type must be one of ${[...VALUE_TYPES].join(', ')}.`, { path, type: schema.type });
}

function validateSchemaNode(schema, path = '$', depth = 0) {
  invariant(depth <= 64, 'invalid-value-schema', 'Value schema exceeds the maximum depth of 64.', { path });
  assertSchemaObject(schema, path);
  if (schema.id !== undefined) {
    invariant(typeof schema.id === 'string' && schema.id.length > 0,
      'invalid-value-schema', `${path}.id must be a non-empty string.`);
  }
  if (schema.description !== undefined) {
    invariant(typeof schema.description === 'string' && schema.description.length > 0,
      'invalid-value-schema', `${path}.description must be a non-empty string.`);
  }
  if (schema.enum !== undefined) {
    invariant(Array.isArray(schema.enum) && schema.enum.length > 0,
      'invalid-value-schema', `${path}.enum must be a non-empty array.`);
    normalizeJson(schema.enum);
  }
  for (const field of ['minimum', 'maximum']) {
    if (schema[field] !== undefined) {
      invariant(['number', 'integer'].includes(schema.type) && Number.isFinite(schema[field]),
        'invalid-value-schema', `${path}.${field} requires a finite numeric schema.`);
    }
  }
  for (const field of ['minItems', 'maxItems']) {
    if (schema[field] !== undefined) {
      invariant(schema.type === 'array' && Number.isInteger(schema[field]) && schema[field] >= 0,
        'invalid-value-schema', `${path}.${field} requires a non-negative integer array bound.`);
    }
  }
  if (schema.minimum !== undefined && schema.maximum !== undefined) {
    invariant(schema.minimum <= schema.maximum, 'invalid-value-schema',
      `${path}.minimum cannot exceed maximum.`);
  }
  if (schema.minItems !== undefined && schema.maxItems !== undefined) {
    invariant(schema.minItems <= schema.maxItems, 'invalid-value-schema',
      `${path}.minItems cannot exceed maxItems.`);
  }
  if (schema.type === 'array') {
    invariant(schema.items, 'invalid-value-schema', `${path}.items is required for an array schema.`);
    validateSchemaNode(schema.items, `${path}.items`, depth + 1);
  } else {
    invariant(schema.items === undefined && schema.minItems === undefined && schema.maxItems === undefined,
      'invalid-value-schema', `${path} uses array-only schema properties for ${schema.type}.`);
  }
  if (schema.type === 'object') {
    invariant(isPlainObject(schema.properties), 'invalid-value-schema',
      `${path}.properties must be a plain object.`);
    const required = schema.required || [];
    invariant(Array.isArray(required) && required.every((name) => typeof name === 'string'),
      'invalid-value-schema', `${path}.required must be a string array.`);
    invariant(new Set(required).size === required.length, 'invalid-value-schema',
      `${path}.required cannot contain duplicates.`);
    invariant(required.every((name) => Object.hasOwn(schema.properties, name)),
      'invalid-value-schema', `${path}.required must name declared properties.`);
    invariant(schema.additionalProperties === undefined || typeof schema.additionalProperties === 'boolean',
      'invalid-value-schema', `${path}.additionalProperties must be boolean.`);
    for (const [name, property] of Object.entries(schema.properties)) {
      validateSchemaNode(property, `${path}.properties.${name}`, depth + 1);
    }
  } else {
    invariant(schema.properties === undefined && schema.required === undefined
      && schema.additionalProperties === undefined, 'invalid-value-schema',
    `${path} uses object-only schema properties for ${schema.type}.`);
  }
}

function normalizeValueSchema(schema) {
  validateSchemaNode(schema);
  return deepFreeze(normalizeJson(schema));
}

function valueType(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (isPlainObject(value)) return 'object';
  if (typeof value === 'number' && Number.isInteger(value)) return 'integer';
  return typeof value;
}

function compatibleSchema(actual, expected) {
  if (!actual || expected.type === 'any' || actual.type === 'any') return true;
  if (expected.type === 'number' && actual.type === 'integer') return true;
  if (actual.type !== expected.type) return false;
  if (expected.type === 'array') return compatibleSchema(actual.items, expected.items);
  if (expected.type !== 'object') return true;
  for (const name of expected.required || []) {
    if (!actual.properties?.[name]) {
      if (actual.additionalProperties === true) continue;
      return false;
    }
    if (!compatibleSchema(actual.properties[name], expected.properties[name])) return false;
  }
  return true;
}

function schemaFailure(code, label, path, expected, actual, detail) {
  throw new NllError(code, `${label} does not satisfy its value schema at ${path}: ${detail}.`, {
    path, expected: expected?.type || expected, actual
  });
}

function validateValueNode(value, schema, options, path = '$', depth = 0) {
  const { code = 'value-schema-mismatch', label = 'Value', resolveReference } = options;
  if (depth > 128) schemaFailure(code, label, path, schema, 'deep-value', 'value exceeds maximum depth');
  if (resolveReference && isPlainObject(value)
    && (typeof value.$node === 'string' || typeof value.$port === 'string')) {
    const actualSchema = resolveReference?.(value);
    if (actualSchema && !compatibleSchema(actualSchema, schema)) {
      schemaFailure(code, label, path, schema, actualSchema.type, 'referenced result type is incompatible');
    }
    return;
  }
  const actualType = valueType(value);
  const typeMatches = schema.type === 'any' || actualType === schema.type
    || (schema.type === 'number' && actualType === 'integer');
  if (!typeMatches) schemaFailure(code, label, path, schema, actualType, 'type differs');
  if (schema.enum && !schema.enum.some((item) => JSON.stringify(item) === JSON.stringify(value))) {
    schemaFailure(code, label, path, schema, actualType, 'value is outside enum');
  }
  if (['integer', 'number'].includes(schema.type)) {
    if (schema.minimum !== undefined && value < schema.minimum) {
      schemaFailure(code, label, path, schema, value, `value is below ${schema.minimum}`);
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      schemaFailure(code, label, path, schema, value, `value exceeds ${schema.maximum}`);
    }
  }
  if (schema.type === 'array') {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      schemaFailure(code, label, path, schema, value.length, `array has fewer than ${schema.minItems} items`);
    }
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      schemaFailure(code, label, path, schema, value.length, `array has more than ${schema.maxItems} items`);
    }
    value.forEach((item, index) => validateValueNode(item, schema.items, options, `${path}[${index}]`, depth + 1));
  }
  if (schema.type === 'object') {
    for (const name of schema.required || []) {
      if (!Object.hasOwn(value, name)) schemaFailure(code, label, `${path}.${name}`, schema.properties[name],
        'missing', 'required property is absent');
    }
    if (schema.additionalProperties === false) {
      const unknown = Object.keys(value).find((name) => !Object.hasOwn(schema.properties, name));
      if (unknown) schemaFailure(code, label, `${path}.${unknown}`, 'declared property',
        valueType(value[unknown]), 'property is not declared');
    }
    for (const [name, item] of Object.entries(value)) {
      if (schema.properties[name]) {
        validateValueNode(item, schema.properties[name], options, `${path}.${name}`, depth + 1);
      }
    }
  }
}

function validateValueAgainstSchema(value, schema, options = {}) {
  validateValueNode(value, schema, options);
  return value;
}

export {
  compatibleSchema,
  normalizeValueSchema,
  validateValueAgainstSchema,
  validateSchemaNode
};
