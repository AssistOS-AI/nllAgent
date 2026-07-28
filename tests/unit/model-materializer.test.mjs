import assert from 'node:assert/strict';
import test from 'node:test';
import { compileMarkdown } from '../../src/longtext/compiler.mjs';
import { materializeModelProfiles } from '../../src/longtext/model-materializer.mjs';
import { createStandardRegistries } from '../../src/runtime/standard-operators.mjs';

test('model profiles route through the injected Achilles-compatible gateway and preserve exact anchors', async () => {
  const calls = [];
  const modelGateway = {
    async invoke(request) {
      calls.push(request);
      return {
        result: { observations: [{
          quote: 'Mara știa', payload: { experiencer: 'Mara', modality: 'asserted' },
          confidence: 0.91, alternatives: [{ modality: 'reported' }], reason: 'The clause directly attributes knowledge.'
        }] },
        capture: { gateway: 'stub-achilles@1', model: 'stub' }
      };
    }
  };
  const registries = createStandardRegistries({ modelGateway });
  const program = compileMarkdown('Mara știa răspunsul.\n', { language: 'ro' });
  const result = await materializeModelProfiles(program, [{
    id: 'narrative-mind@1', outputType: 'narrative.mental-state@1',
    instruction: 'Identify direct mental-state attribution.',
    schema: { required: ['experiencer', 'modality'], enums: { modality: ['asserted', 'hypothetical'] } }
  }], new Set(['narrative.mental-state@1']), registries);
  assert.equal(result.materialized, 1);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].tags, ['extraction']);
  assert.equal(Object.hasOwn(calls[0], 'model'), false);
  assert.equal(Object.hasOwn(calls[0], 'tier'), false);
  const observation = program.observations.find((item) => item.type === 'narrative.mental-state@1');
  assert.equal(observation.status, 'proposed');
  assert.equal(program.anchors[observation.anchors[0]].quote, 'Mara știa');
  assert.equal(program.coverage.at(-1).mode, 'open-world');
  await materializeModelProfiles(program, [{
    id: 'narrative-mind@1', outputType: 'narrative.mental-state@1',
    instruction: 'Identify direct mental-state attribution.',
    schema: { required: ['experiencer', 'modality'], enums: { modality: ['asserted', 'hypothetical'] } }
  }], new Set(['narrative.mental-state@1']), registries);
  assert.equal(program.capabilities.filter((item) => item.producer === 'narrative-mind@1').length, 1);
  assert.equal(program.coverage.filter((item) => item.id === 'coverage:narrative-mind@1').length, 1);
});

test('materialization keeps ambiguity and negation but rejects a hallucinated source quote', async () => {
  const modelGateway = {
    async invoke() {
      return {
        result: { observations: [
          {
            quote: 'nu lăsase telefonul',
            payload: { actor: 'Mara', action: 'leave', polarity: 'negated', modality: 'asserted' },
            confidence: 0.82,
            alternatives: [{ actor: 'Ilie', reason: 'Pronoun resolution remains possible in wider context.' }],
            reason: 'The source explicitly negates the leave event.'
          },
          {
            quote: 'Mara își recuperă telefonul',
            payload: { actor: 'Mara', action: 'retrieve', polarity: 'positive', modality: 'asserted' },
            confidence: 0.99,
            alternatives: [],
            reason: 'This recovery wording was inferred but is absent from the supplied block.'
          }
        ] },
        capture: { gateway: 'stub-codex@1' }
      };
    }
  };
  const registries = createStandardRegistries({ modelGateway });
  const program = compileMarkdown('Mara spuse că nu lăsase telefonul în mașină.\n', { language: 'ro' });
  const result = await materializeModelProfiles(program, [{
    id: 'narrative-events@1', outputType: 'narrative.object-event@1',
    instruction: 'Extract object events while preserving polarity, modality, and alternatives.',
    schema: {
      required: ['actor', 'action', 'polarity', 'modality'],
      enums: {
        action: ['leave', 'retrieve'], polarity: ['positive', 'negated'],
        modality: ['asserted', 'hypothetical', 'reported']
      }
    }
  }], new Set(['narrative.object-event@1']), registries);

  assert.equal(result.materialized, 1);
  const observation = program.observations.find((item) => item.type === 'narrative.object-event@1');
  assert.equal(observation.payload.polarity, 'negated');
  assert.equal(observation.alternatives.length, 1);
  assert.equal(program.anchors[observation.anchors[0]].quote, 'nu lăsase telefonul');
  assert.equal(program.gaps.length, 1);
  assert.equal(program.gaps[0].kind, 'model-output');
  assert.match(program.gaps[0].failures.join(' '), /absent from the source block/u);
});
