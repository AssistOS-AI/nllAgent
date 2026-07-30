import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const digest = (text) => createHash('sha256').update(text).digest('hex').slice(0, 12);
const structuralId = (kind, name) => `${kind}:${digest(name.toLowerCase())}`;
const explicitId = (namespace, id) => `${namespace}:${id}`;

const firstAna = { kind: 'Person', name: 'Ana', source: 'chapter-1', start: 10 };
const secondAna = { kind: 'Person', name: 'Ana', source: 'chapter-9', start: 804 };

assert.equal(structuralId(firstAna.kind, firstAna.name), structuralId(secondAna.kind, secondAna.name));
assert.notEqual(explicitId('novel', 'ana-popescu'), explicitId('novel', 'ana-ionescu'));

const derivedA = structuralId('NormalizedDuration', '5 years');
const derivedB = structuralId('NormalizedDuration', '5 years');
assert.equal(derivedA, derivedB);

export default Object.freeze({
  experiment: 'canonical-term-identity',
  observedStructuralEntityMerges: 1,
  observedExplicitEntityMerges: 0,
  reusableDerivedValues: derivedA === derivedB ? 1 : 0,
  decision: 'Explicit identities for source entities and events; structural identity for immutable values and derived terms.'
});
