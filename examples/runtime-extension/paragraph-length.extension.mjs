function words(text) {
  return String(text || '').trim().split(/\s+/u).filter(Boolean);
}

const OPEN_OBJECT = { type: 'object', properties: {}, additionalProperties: true };
const OBSERVATION = {
  type: 'object',
  required: ['id', 'payload', 'anchors'],
  properties: {
    id: { type: 'string' },
    payload: {
      type: 'object', required: ['text'], additionalProperties: true,
      properties: { text: { type: 'string' } }
    },
    anchors: { type: 'array', items: { type: 'string' } }
  },
  additionalProperties: true
};
const WITNESS = {
  type: 'object',
  required: ['observationId', 'count', 'maximumWords'],
  properties: {
    observationId: { type: 'string' },
    count: { type: 'integer', minimum: 0 },
    maximumWords: { type: 'integer', minimum: 0 }
  },
  additionalProperties: false
};
const CANDIDATE = {
  type: 'object',
  required: [
    'kind', 'rule', 'subject', 'mainAnchor', 'supportAnchors',
    'sourceRuleReferences', 'witness'
  ],
  properties: {
    kind: { type: 'string', enum: ['FindingCandidate'] },
    rule: { type: 'string' },
    subject: { type: 'string' },
    mainAnchor: OPEN_OBJECT,
    supportAnchors: { type: 'array', items: { type: 'string' } },
    sourceRuleReferences: { type: 'array', items: { type: 'string' } },
    witness: WITNESS
  },
  additionalProperties: true
};
const CANDIDATE_ARRAY = { type: 'array', items: CANDIDATE };
const VERIFIED_CANDIDATE = {
  type: 'object',
  required: ['kind', 'rule', 'subject', 'mainAnchor', 'witness', 'verifierResult'],
  properties: {
    ...CANDIDATE.properties,
    verifierResult: {
      type: 'object', required: ['status', 'verifier'], additionalProperties: true,
      properties: { status: { type: 'string' }, verifier: { type: 'string' } }
    }
  },
  additionalProperties: true
};

function paragraphCandidates({ paragraphs = [], maximumWords = 12 }, context) {
  return paragraphs.flatMap((paragraph) => {
    const count = words(paragraph.payload?.text).length;
    if (count <= maximumWords) return [];
    const anchor = context.program.anchors[paragraph.anchors?.[0]];
    return [{
      kind: 'FindingCandidate',
      rule: 'EXAMPLE-PARAGRAPH-LENGTH-001',
      verdict: 'paragraph-too-long',
      severity: 'warning',
      subject: paragraph.id,
      scope: paragraph.scope,
      mainAnchor: anchor,
      supportAnchors: [...(paragraph.anchors || [])],
      premises: [paragraph.id],
      witness: { observationId: paragraph.id, count, maximumWords },
      guarantee: 'candidate',
      explanation: `The paragraph contains ${count} words; the configured maximum is ${maximumWords}.`,
      remediation: 'Split the paragraph or raise the published threshold.',
      limitations: ['Words are separated by Unicode whitespace in this example operator.'],
      sourceRuleReferences: [...(context.circuit.sourceRuleReferences || [])]
    }];
  });
}

function verifyParagraphCandidates({ candidates = [] }, context) {
  const observations = new Map(context.program.observations.map((observation) => [observation.id, observation]));
  return candidates.map((candidate) => {
    const observation = observations.get(candidate.witness?.observationId);
    const count = words(observation?.payload?.text).length;
    const accepted = Boolean(
      observation
      && count === candidate.witness.count
      && count > candidate.witness.maximumWords
      && context.program.anchors[observation.anchors?.[0]]?.id === candidate.mainAnchor?.id
    );
    return {
      ...candidate,
      guarantee: accepted ? 'mechanically-certified' : 'rejected',
      verifierResult: {
        status: accepted ? 'accept' : 'reject',
        verifier: 'example.paragraph-length@1',
        checkedProperties: ['observation-identity', 'word-count', 'threshold', 'source-anchor'],
        diagnostics: accepted ? [] : ['The paragraph-length witness could not be replayed.']
      },
      certificate: accepted ? {
        kind: 'ParagraphLengthCertificate',
        count,
        maximumWords: candidate.witness.maximumWords,
        sourceDigest: context.program.source.revision
      } : null
    };
  });
}

export default {
  kind: 'NllRuntimeExtension',
  id: 'example.paragraph-metrics@1.0.0',
  description: 'A self-contained example of real JavaScript processing behind CircuitJS nodes.',
  operators: [{
    id: 'example.paragraph-length@1',
    description: 'Count whitespace-delimited words and construct over-limit candidates.',
    primitives: ['call'],
    inputSchema: {
      id: 'example.paragraph-length-input@1', type: 'object',
      required: ['paragraphs', 'maximumWords'], additionalProperties: false,
      properties: {
        paragraphs: { type: 'array', items: OBSERVATION },
        maximumWords: { type: 'integer', minimum: 0 }
      }
    },
    outputSchema: { id: 'finding-candidate-array@1', ...CANDIDATE_ARRAY },
    deterministic: true,
    effects: [],
    capabilities: [],
    cost: 'linear-in-paragraph-text',
    limits: { maximumParagraphs: 10000, maximumTextCodePoints: 10000000 },
    failureCodes: ['runtime-extension-failed'],
    ordering: 'input-order',
    coverageBehavior: 'preserve-structural-coverage',
    guaranteeCeiling: 'mechanically-certified',
    witnessSchema: 'example.paragraph-length-witness@1',
    execute: paragraphCandidates
  }],
  verifiers: [{
    id: 'example.paragraph-length@1',
    description: 'Recount the canonical paragraph and compare the threshold witness.',
    candidateSchema: 'finding-candidate-array@1',
    witnessSchema: 'example.paragraph-length-witness@1',
    inputSchema: {
      id: 'example.paragraph-length-verifier-input@1', type: 'object',
      required: ['candidates'], additionalProperties: false,
      properties: { candidates: CANDIDATE_ARRAY }
    },
    outputSchema: {
      id: 'verified-finding-candidate-array@1', type: 'array', items: VERIFIED_CANDIDATE
    },
    checkedProperties: ['observation-identity', 'word-count', 'threshold', 'source-anchor'],
    outcomes: ['accept', 'reject'],
    guaranteeContribution: 'mechanically-certified',
    limits: { maximumCandidates: 10000 },
    execute: verifyParagraphCandidates
  }]
};
