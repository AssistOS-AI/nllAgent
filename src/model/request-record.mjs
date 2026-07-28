import { digestJson } from '../core/canonical.mjs';

function canonicalTranslationRequest(request = {}) {
  return {
    prompt: request.prompt,
    taskRole: request.taskRole || null,
    templateId: request.templateId || null,
    responseShape: request.responseShape || 'json',
    outputSchema: request.outputSchema || null,
    model: request.model || null,
    tier: request.tier || null,
    tags: [...new Set(request.tags || [])].sort()
  };
}

function translationRequestDigest(request) {
  return digestJson(canonicalTranslationRequest(request));
}

export { canonicalTranslationRequest, translationRequestDigest };
