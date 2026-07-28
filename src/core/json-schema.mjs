import { NllError } from './errors.mjs';

function validateJsonValue(value, path = '$', failures = [], seen = new Set()) {
  if (value === null || ['string', 'boolean'].includes(typeof value)) return failures;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) failures.push(`${path} must be a finite JSON number`);
    return failures;
  }
  if (typeof value !== 'object') {
    failures.push(`${path} contains unsupported JSON type ${typeof value}`);
    return failures;
  }
  if (seen.has(value)) {
    failures.push(`${path} creates a cycle`);
    return failures;
  }
  seen.add(value);
  if (Array.isArray(value)) {
    if (Object.getOwnPropertySymbols(value).length
      || Object.keys(value).some((key) => !/^(?:0|[1-9]\d*)$/u.test(key) || Number(key) >= value.length)) {
      failures.push(`${path} contains non-JSON array properties`);
    }
    for (let index = 0; index < value.length; index += 1) {
      if (!Object.hasOwn(value, index)) failures.push(`${path}[${index}] is a sparse array entry`);
      else {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        if (!descriptor || !Object.hasOwn(descriptor, 'value')) failures.push(`${path}[${index}] is an accessor`);
        else validateJsonValue(descriptor.value, `${path}[${index}]`, failures, seen);
      }
    }
    seen.delete(value);
    return failures;
  }
  if (Object.getPrototypeOf(value) !== Object.prototype) failures.push(`${path} must be a plain JSON object`);
  if (Object.getOwnPropertySymbols(value).length) failures.push(`${path} contains symbol keys`);
  for (const key of Object.keys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) failures.push(`${path}.${key} is an accessor`);
    else validateJsonValue(descriptor.value, `${path}.${key}`, failures, seen);
  }
  seen.delete(value);
  return failures;
}

function valueType(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (Number.isInteger(value)) return 'integer';
  return typeof value;
}

function matchesType(value, expected) {
  if (expected === 'number') return typeof value === 'number' && Number.isFinite(value);
  if (expected === 'integer') return Number.isInteger(value);
  if (expected === 'object') return value !== null && typeof value === 'object' && !Array.isArray(value);
  if (expected === 'array') return Array.isArray(value);
  if (expected === 'null') return value === null;
  return typeof value === expected;
}

function validateJsonSchema(value, schema = {}, path = '$', failures = []) {
  if (path === '$') {
    validateJsonValue(value, path, failures);
    if (failures.length) return failures;
  }
  if (schema === true || !schema || typeof schema !== 'object') return failures;
  if (schema === false) {
    failures.push(`${path} is forbidden by schema`);
    return failures;
  }
  const expectedTypes = Array.isArray(schema.type) ? schema.type : schema.type ? [schema.type] : [];
  if (expectedTypes.length && !expectedTypes.some((type) => matchesType(value, type))) {
    failures.push(`${path} must be ${expectedTypes.join(' or ')}, found ${valueType(value)}`);
    return failures;
  }
  if (schema.enum && !schema.enum.some((item) => Object.is(item, value))) failures.push(`${path} is outside its enum`);
  if (Object.hasOwn(schema, 'const') && !Object.is(schema.const, value)) failures.push(`${path} does not equal its const value`);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) failures.push(`${path} must be finite`);
    if (schema.minimum !== undefined && value < schema.minimum) failures.push(`${path} is below minimum ${schema.minimum}`);
    if (schema.maximum !== undefined && value > schema.maximum) failures.push(`${path} is above maximum ${schema.maximum}`);
  }
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && Array.from(value).length < schema.minLength) failures.push(`${path} is shorter than ${schema.minLength}`);
    if (schema.maxLength !== undefined && Array.from(value).length > schema.maxLength) failures.push(`${path} is longer than ${schema.maxLength}`);
    if (schema.pattern && !(new RegExp(schema.pattern, 'u')).test(value)) failures.push(`${path} does not match ${schema.pattern}`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) failures.push(`${path} has fewer than ${schema.minItems} items`);
    if (schema.maxItems !== undefined && value.length > schema.maxItems) failures.push(`${path} has more than ${schema.maxItems} items`);
    if (schema.items) value.forEach((item, index) => validateJsonSchema(item, schema.items, `${path}[${index}]`, failures));
  }
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    for (const required of schema.required || []) {
      if (!Object.hasOwn(value, required)) failures.push(`${path}.${required} is required`);
    }
    const properties = schema.properties || {};
    for (const [key, item] of Object.entries(value)) {
      if (properties[key]) validateJsonSchema(item, properties[key], `${path}.${key}`, failures);
      else if (schema.additionalProperties === false) failures.push(`${path}.${key} is not allowed`);
      else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
        validateJsonSchema(item, schema.additionalProperties, `${path}.${key}`, failures);
      }
    }
  }
  return failures;
}

function assertJsonSchema(value, schema, options = {}) {
  const failures = validateJsonSchema(value, schema);
  if (failures.length) {
    throw new NllError(
      options.code || 'invalid-schema-value',
      options.message || 'JSON value does not satisfy its schema.',
      { failures }
    );
  }
  return value;
}

export { assertJsonSchema, matchesType, validateJsonSchema, validateJsonValue, valueType };
