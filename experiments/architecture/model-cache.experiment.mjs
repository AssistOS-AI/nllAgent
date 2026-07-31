import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const hash = (parts) => createHash('sha256').update(parts.join('\u001f')).digest('hex');
const unsafeKey = ({ role, source }) => hash([role, source]);
const exactKey = (request) => hash([
  request.role,
  request.source,
  request.prompt,
  request.model,
  request.adapter,
  request.ontology,
  request.evidencePolicy,
  request.context
]);

const first = {
  role: 'materialize', source: 'The term is five years.', prompt: 'extract duration',
  model: 'codex-a', adapter: 'codex', ontology: 'retention@1',
  evidencePolicy: 'explicit-only', context: 'document-1@r1'
};
const changed = { ...first, ontology: 'retention@2' };

assert.equal(unsafeKey(first), unsafeKey(changed));
assert.notEqual(exactKey(first), exactKey(changed));

export default Object.freeze({
  experiment: 'model-artifact-reuse',
  unsafeCollisions: 1,
  exactCollisions: 0,
  decision: 'Replay and reuse require an exact semantic request key and an accepted frozen artifact; cross-document reuse is forbidden unless every dependency is identical.'
});
