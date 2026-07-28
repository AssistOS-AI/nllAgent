import { createHash } from 'node:crypto';

function normalizeJson(value, seen = new Set()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('Canonical JSON cannot contain non-finite numbers.');
    return Object.is(value, -0) ? 0 : value;
  }
  if (typeof value !== 'object') throw new TypeError(`Canonical JSON cannot contain ${typeof value}.`);
  if (seen.has(value)) throw new TypeError('Canonical JSON cannot contain cycles.');
  seen.add(value);
  if (Array.isArray(value)) {
    if (Object.getOwnPropertySymbols(value).length
      || Object.keys(value).some((key) => !/^(?:0|[1-9]\d*)$/u.test(key) || Number(key) >= value.length)) {
      throw new TypeError('Canonical JSON arrays cannot contain extra properties.');
    }
    const normalized = [];
    for (let index = 0; index < value.length; index += 1) {
      if (!Object.hasOwn(value, index)) throw new TypeError('Canonical JSON cannot contain sparse arrays.');
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor || !Object.hasOwn(descriptor, 'value')) {
        throw new TypeError('Canonical JSON cannot contain accessors.');
      }
      normalized.push(normalizeJson(descriptor.value, seen));
    }
    seen.delete(value);
    return normalized;
  }
  if (Object.getPrototypeOf(value) !== Object.prototype) {
    throw new TypeError('Canonical JSON accepts only plain objects.');
  }
  if (Object.getOwnPropertySymbols(value).length) {
    throw new TypeError('Canonical JSON cannot contain symbol keys.');
  }
  const normalized = {};
  for (const key of Object.keys(value).sort()) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError('Canonical JSON cannot contain accessors.');
    }
    normalized[key] = normalizeJson(descriptor.value, seen);
  }
  seen.delete(value);
  return normalized;
}

function canonicalStringify(value) {
  return `${JSON.stringify(normalizeJson(value), null, 2)}\n`;
}

function sha256Bytes(value) {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function digestJson(value) {
  return sha256Bytes(canonicalStringify(value));
}

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const item of Object.values(value)) deepFreeze(item);
  }
  return value;
}

export { canonicalStringify, deepFreeze, digestJson, normalizeJson, sha256Bytes };
