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
          quote: 'Alice knew', payload: { experiencer: 'Alice', modality: 'asserted' },
          confidence: 0.91, alternatives: [{ modality: 'reported' }], reason: 'The clause directly attributes knowledge.'
        }] },
        capture: { gateway: 'stub-achilles@1', model: 'stub' }
      };
    }
  };
  const registries = createStandardRegistries({ modelGateway });
  const program = compileMarkdown('Alice knew the answer.\n', { language: 'en' });
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
  assert.equal(program.anchors[observation.anchors[0]].quote, 'Alice knew');
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
            quote: 'had not left the phone',
            payload: { actor: 'Alice', action: 'leave', polarity: 'negated', modality: 'asserted' },
            confidence: 0.82,
            alternatives: [{ actor: 'Bob', reason: 'Pronoun resolution remains possible in wider context.' }],
            reason: 'The source explicitly negates the leave event.'
          },
          {
            quote: 'Alice retrieved her phone',
            payload: { actor: 'Alice', action: 'retrieve', polarity: 'positive', modality: 'asserted' },
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
  const program = compileMarkdown('Alice said that she had not left the phone in the car.\n', { language: 'en' });
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
  assert.equal(program.anchors[observation.anchors[0]].quote, 'had not left the phone');
  assert.equal(program.gaps.length, 1);
  assert.equal(program.gaps[0].kind, 'model-output');
  assert.match(program.gaps[0].failures.join(' '), /absent from the source block/u);
});

test('semantic profiles do not run until a circuit demands their exact output type', async () => {
  let calls = 0;
  const registries = createStandardRegistries({
    modelGateway: {
      async invoke() {
        calls += 1;
        return { result: { observations: [] }, capture: { gateway: 'unexpected@1' } };
      }
    }
  });
  const program = compileMarkdown('Alice entered the room.\n', { language: 'en' });
  const result = await materializeModelProfiles(program, [{
    id: 'narrative-events@1',
    outputType: 'narrative.motion-event@1',
    instruction: 'Extract grounded motion events.',
    schema: { required: ['actorText', 'action'] }
  }], new Set(['document.paragraph@1']), registries);

  assert.equal(result.materialized, 0);
  assert.equal(calls, 0);
  assert.equal(program.observations.some((item) => item.type === 'narrative.motion-event@1'), false);
  assert.equal(program.capabilities.some((item) => item.type === 'narrative.motion-event@1'), false);
  assert.equal(program.coverage.some((item) => item.types?.includes('narrative.motion-event@1')), false);
});
