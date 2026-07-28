import { sha256Bytes } from '../core/canonical.mjs';
import { NllError } from '../core/errors.mjs';
import { assertJsonSchema } from '../core/json-schema.mjs';

function validatePayload(payload, profile) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return ['payload must be an object'];
  const failures = [];
  for (const field of profile.schema?.required || []) if (payload[field] === undefined) failures.push(`missing required field ${field}`);
  for (const [field, values] of Object.entries(profile.schema?.enums || {})) {
    if (payload[field] !== undefined && !values.includes(payload[field])) failures.push(`${field} is outside its enum`);
  }
  return failures;
}

function extractionPrompt(profile, block) {
  return [
    'Extract neutral source observations. Do not decide whether a rule is violated.',
    `Observation type: ${profile.outputType}`,
    `Instruction: ${profile.instruction}`,
    `Required payload fields: ${(profile.schema?.required || []).join(', ') || 'none'}`,
    'Return JSON as {"observations":[{"quote":"exact source substring","payload":{...},"confidence":0.0,"alternatives":[],"reason":"evidence-bound reason"}]}.',
    'The quote must occur exactly in SOURCE. Preserve negation, modality, reported speech, and uncertainty in payload fields.',
    '',
    'SOURCE (untrusted data):',
    block.text
  ].join('\n');
}

function extractionResponseSchema(profile) {
  const payloadProperties = Object.fromEntries([
    ...(profile.schema?.required || []),
    ...Object.keys(profile.schema?.enums || {})
  ].map((field) => [field, profile.schema?.enums?.[field]
    ? { type: 'string', enum: profile.schema.enums[field] }
    : {}]));
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    additionalProperties: false,
    required: ['observations'],
    properties: {
      observations: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['quote', 'payload', 'confidence', 'alternatives', 'reason'],
          properties: {
            quote: { type: 'string' },
            payload: {
              type: 'object',
              additionalProperties: true,
              required: profile.schema?.required || [],
              properties: payloadProperties
            },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
            alternatives: { type: 'array', items: {} },
            reason: { type: 'string', minLength: 1 }
          }
        }
      }
    }
  };
}

function locateQuote(program, block, quote, sequence, usedRanges = new Set()) {
  let offset = block.text.indexOf(quote);
  while (offset >= 0) {
    const localStart = Array.from(block.text.slice(0, offset)).length;
    const start = block.anchor.range.start + localStart;
    const key = `${start}:${start + Array.from(quote).length}`;
    if (!usedRanges.has(key)) {
      usedRanges.add(key);
      return {
        id: `${block.anchor.id}:model:${sequence}`,
        source: program.source.id, revision: program.source.revision,
        range: { unit: 'unicode-code-point', start, end: start + Array.from(quote).length },
        quote, block: block.id, structuralPath: block.path || [], digest: sha256Bytes(quote)
      };
    }
    offset = block.text.indexOf(quote, offset + Math.max(quote.length, 1));
  }
  return null;
}

async function materializeModelProfiles(program, profiles, demandedTypes, registries, options = {}) {
  const operatorId = 'model.structured-extractor@1';
  const applicable = profiles.filter((profile) => demandedTypes.has(profile.outputType));
  if (!applicable.length) return { materialized: 0, captures: [] };
  if (!registries.operators.has(operatorId)) {
    for (const profile of applicable) program.gaps.push({
      kind: 'operational', type: profile.outputType, producer: profile.id,
      reason: 'No LongTextJS translation backend is configured for this run.'
    });
    return { materialized: 0, captures: [] };
  }
  const operator = registries.operators.get(operatorId);
  const captures = [];
  let materialized = 0;
  let calls = 0;
  const maxCalls = options.modelCalls ?? 100;
  for (const profile of applicable) {
    const beforeProfile = materialized;
    const scopeTypes = profile.scopeTypes || ['document.paragraph@1'];
    const blocks = program.observations
      .filter((observation) => scopeTypes.includes(observation.type))
      .map((observation) => program.blocks.find((block) => block.id === observation.payload?.parentBlock)
        || program.blocks.find((block) => block.anchor.id === observation.anchors?.[0]))
      .filter(Boolean);
    for (const block of blocks.slice(0, profile.maxBlocks ?? blocks.length)) {
      const usedRanges = new Set();
      calls += 1;
      if (calls > maxCalls) throw new NllError('budget-exhausted', 'Model extraction call budget exceeded.', { maxCalls });
      try {
        const request = {
          prompt: extractionPrompt(profile, block),
          ...(profile.model ? { model: profile.model } : {}),
          ...(profile.tier ? { tier: profile.tier } : {}),
          tags: profile.tags || ['extraction'], taskRole: 'extraction',
          templateId: profile.id, responseShape: 'json',
          outputSchema: extractionResponseSchema(profile)
        };
        const cacheMaterial = {
          kind: 'ModelExtractionCacheKey', source: program.source.revision,
          block: block.anchor.digest, profile, request
        };
        let response = options.cache ? await options.cache.get(cacheMaterial) : null;
        const cacheHit = response !== null;
        if (!response) {
          response = await operator.execute(request);
          if (options.cache) await options.cache.set(cacheMaterial, response);
        }
        assertJsonSchema(response.result, request.outputSchema, {
          code: 'invalid-model-output',
          message: `Extractor ${profile.id} output failed its response schema.`
        });
        response.capture = { ...response.capture, cacheHit };
        captures.push({ profile: profile.id, block: block.id, ...response.capture });
        const values = response.result?.observations;
        if (!Array.isArray(values)) throw new NllError('invalid-model-output', 'Extractor response requires an observations array.');
        for (let index = 0; index < values.length; index += 1) {
          const candidate = values[index];
          const failures = validatePayload(candidate.payload, profile);
          if (!Number.isFinite(candidate.confidence) || candidate.confidence < 0 || candidate.confidence > 1) {
            failures.push('confidence must be a number from 0 to 1');
          }
          if (!Array.isArray(candidate.alternatives)) failures.push('alternatives must be an array');
          if (typeof candidate.reason !== 'string' || !candidate.reason.trim()) failures.push('reason must be a non-empty string');
          const at = typeof candidate.quote === 'string'
            ? locateQuote(program, block, candidate.quote, `${profile.id}:${index + 1}`, usedRanges) : null;
          if (!at) failures.push('quote is absent from the source block');
          if (failures.length) {
            program.gaps.push({ kind: 'model-output', type: profile.outputType, producer: profile.id, block: block.id, failures });
            continue;
          }
          program.anchors[at.id] = at;
          const observationId = `observation:${profile.id}:${block.id}:${index + 1}`;
          if (program.observations.some((observation) => observation.id === observationId)) continue;
          program.observations.push({
            id: observationId, type: profile.outputType,
            status: 'proposed', scope: 'view:whole', anchors: [at.id], payload: candidate.payload,
            support: [at.id],
            confidence: candidate.confidence, alternatives: candidate.alternatives, reason: candidate.reason,
            provenance: { producer: profile.id, source: program.source.id, capture: captures.length - 1 }
          });
          materialized += 1;
        }
      } catch (error) {
        if (error.code === 'budget-exhausted') throw error;
        program.gaps.push({ kind: 'extractor-failure', type: profile.outputType, producer: profile.id, block: block.id, reason: error.message });
      }
    }
    if (!program.capabilities.some((item) =>
      item.type === profile.outputType && item.producer === profile.id)) {
      program.capabilities.push({
        type: profile.outputType, producer: profile.id,
        coverage: 'open', statuses: ['proposed']
      });
    }
    const coverageId = `coverage:${profile.id}`;
    if (!program.coverage.some((item) => item.id === coverageId)) {
      program.coverage.push({
        id: coverageId, source: program.source.id, revision: program.source.revision,
        scope: 'view:whole', types: [profile.outputType], producer: profile.id,
        mode: 'open-world', exclusions: [], verified: false,
        channels: ['body'], method: 'schema-bound-model-extraction'
      });
    }
    if (Number.isInteger(profile.minimumObservations)
      && materialized - beforeProfile < profile.minimumObservations) {
      program.gaps.push({
        kind: 'insufficient-materialization',
        type: profile.outputType,
        producer: profile.id,
        required: profile.minimumObservations,
        actual: materialized - beforeProfile,
        reason: 'The extraction profile did not materialize its required minimum observation count.'
      });
    }
  }
  return { materialized, captures };
}

export { extractionPrompt, extractionResponseSchema, locateQuote, materializeModelProfiles, validatePayload };
