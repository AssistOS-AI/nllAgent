'use strict';

const AUDIT_SOURCE = 'Alice entered the room. In fact, the window was open.';
const DIALOGUE_SOURCE = '— In fact, the window was open, said Alice.';
const PLAN_SOURCE = [
  'Write two English narrative paragraphs about Alice returning to an empty railway station at dusk.',
  'End with a station employee saying that the final train departed.'
].join('\n');

const state = { scenario: 'audit', steps: [], index: 0 };

function points(value) {
  return Array.from(value);
}

function pointOffset(value, utf16Offset) {
  return points(value.slice(0, utf16Offset)).length;
}

function lexicalRanges(text, term) {
  const source = text.toLocaleLowerCase('en');
  const expected = term.toLocaleLowerCase('en');
  const ranges = [];
  let cursor = 0;
  while (cursor <= source.length - expected.length) {
    const offset = source.indexOf(expected, cursor);
    if (offset < 0) break;
    cursor = offset + expected.length;
    const before = source[offset - 1];
    const after = source[offset + expected.length];
    const wordCharacter = /[\p{L}\p{N}_]/u;
    if ((before && wordCharacter.test(before)) || (after && wordCharacter.test(after))) continue;
    ranges.push({
      start: pointOffset(text, offset),
      end: pointOffset(text, offset + expected.length)
    });
  }
  return ranges;
}

function digestLabel(value) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `tutorial:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function auditSteps(rawSource) {
  const source = rawSource.trim() || AUDIT_SOURCE;
  const sourceDigest = digestLabel(source);
  const paragraph = {
    id: 'observation:block:1',
    type: 'document.paragraph@1',
    status: 'extracted',
    scope: 'view:whole',
    anchors: ['anchor:block:1'],
    payload: {
      text: source,
      order: 1,
      structuralRole: /^[—–]\s*/u.test(source.trimStart())
        ? 'dialogue-line-candidate'
        : 'paragraph'
    },
    provenance: { producer: 'markdown-structural@1', source: 'source:input' }
  };
  const longText = {
    kind: 'LongTextProgram',
    source: { id: 'source:input', revision: sourceDigest, content: source },
    anchors: {
      'anchor:block:1': {
        source: 'source:input',
        range: { unit: 'unicode-code-point', start: 0, end: points(source).length },
        quote: source
      }
    },
    observations: [paragraph],
    coverage: [{
      scope: 'view:whole',
      types: ['document.paragraph@1'],
      mode: 'closed-world',
      verified: true
    }]
  };
  const circuit = {
    id: 'editorial.weak-phrase@0.1.0',
    input: {
      name: 'paragraphs',
      type: 'document.paragraph@1',
      cardinality: 'many',
      statuses: ['extracted'],
      coverage: 'closed-world'
    },
    graph: [
      'matches: call text.lexical-occurrences@1',
      'verified: verify text.exact-match@1',
      'findings: emit verified'
    ],
    rule: {
      id: 'ED-001', term: 'in fact', wholeWord: true, caseSensitive: false,
      excludedPrefixes: ['—', '–']
    }
  };
  const contract = {
    kind: 'ObservationContract',
    circuit: circuit.id,
    ports: [{ ...circuit.input, critical: true }]
  };
  const boundPort = [paragraph];
  const excluded = circuit.rule.excludedPrefixes.some((prefix) =>
    source.trimStart().startsWith(prefix));
  const ranges = excluded ? [] : lexicalRanges(source, circuit.rule.term);
  const candidates = ranges.map((range, index) => ({
    kind: 'FindingCandidate',
    rule: 'ED-001',
    verdict: 'editorial-warning',
    guarantee: 'candidate',
    subject: paragraph.id,
    mainAnchor: {
      range: { unit: 'unicode-code-point', ...range },
      quote: points(source).slice(range.start, range.end).join('')
    },
    witness: {
      kind: 'ExactTextMatch',
      observationId: paragraph.id,
      term: 'in fact',
      caseSensitive: false,
      wholeWord: true,
      excludedPrefixes: ['—', '–']
    }
  }));
  const verified = candidates.map((candidate) => ({
    ...candidate,
    guarantee: 'mechanically-certified',
    verifierResult: {
      status: 'accept',
      verifier: 'text.exact-match@1',
      checkedProperties: [
        'observation-scope', 'excluded-prefixes', 'anchor-range',
        'exact-source-text', 'configured-case-policy', 'whole-word-policy'
      ]
    },
    certificate: {
      kind: 'ExactTextCertificate',
      sourceDigest,
      ...candidate.mainAnchor.range,
      text: candidate.mainAnchor.quote
    }
  }));
  const findings = verified.map((record, index) => ({
    ...record,
    kind: 'Finding',
    id: `finding:tutorial-${index + 1}`,
    circuit: circuit.id,
    sourceDigest,
    reviewState: 'unreviewed'
  }));
  const audit = {
    kind: 'CNLAuditReport',
    dialect: 'CNL/Audit-1',
    profile: 'audit',
    sourceDigest,
    status: 'reported',
    auditObservations: findings.map((finding) => ({
      kind: 'CNLAuditObservation',
      rule: finding.rule,
      verdict: finding.verdict,
      statement: 'The narrative paragraph contains the weak phrase “in fact”.',
      evidence: [finding.mainAnchor],
      guarantee: finding.guarantee,
      verifier: finding.verifierResult.verifier
    }))
  };

  return [
    {
      label: '1. Input snapshot', actor: 'Production run', primitive: 'source',
      explanation: 'The run fixes the exact source and release before interpretation. The document is untrusted data.',
      question: 'What text is being judged?', data: { source, sourceDigest }
    },
    {
      label: '2. LongTextJS compilation', actor: 'Markdown compiler', primitive: 'compile',
      explanation: 'The compiler creates a Unicode-addressed paragraph observation. It does not decide whether ED-001 is violated.',
      question: 'What did the source say, and where?', data: longText
    },
    {
      label: '3. Circuit compilation', actor: 'CircuitJS compiler', primitive: 'static analysis',
      explanation: 'The restricted author form becomes a plain-data graph. Operators and verifiers are linked, nodes are topologically ordered, dead paths are rejected, and emit must depend only on verified data.',
      question: 'Is the theory executable and safe to schedule?', data: circuit
    },
    {
      label: '4. Observation contract', actor: 'Backward slice + compatibility gate',
      primitive: 'contract',
      explanation: 'The graph asks for extracted paragraph observations with closed-world coverage. Compatibility checks that this source can satisfy that demand before any verdict is attempted.',
      question: 'Can this LongTextJS program supply what the circuit means by input?',
      data: { contract, capability: longText.coverage[0], status: 'compatible' }
    },
    {
      label: '5. Port binding', actor: 'Runtime scheduler', primitive: 'bindPorts',
      explanation: 'The scheduler filters observations by nominal type and accepted epistemic status, then checks cardinality. The port contains immutable observation records, not raw prompt text.',
      question: 'Which concrete observations cross into the theory?',
      data: { paragraphs: boundPort }
    },
    {
      label: '6. Candidate operator', actor: 'text.lexical-occurrences@1', primitive: 'call',
      explanation: excluded
        ? 'The released operator sees an excluded dialogue prefix and returns no candidates. No verifier or emitter invents one.'
        : 'The operator applies ED-001, calculates Unicode ranges, and emits candidates plus witnesses. Candidates are not findings yet.',
      question: 'What possible result did the domain operator propose?',
      data: { excludedByPrefix: excluded, candidates }
    },
    {
      label: '7. Independent replay', actor: 'text.exact-match@1', primitive: 'verify',
      explanation: candidates.length
        ? 'The verifier re-reads the canonical source, checks the observation, prefix, range, case policy, and whole-word boundary, then attaches a certificate.'
        : 'There is no candidate to verify. An empty verified collection is a legitimate result, not a hidden error.',
      question: 'Which bounded property can be accepted independently?',
      data: { verified }
    },
    {
      label: '8. Publication gate', actor: 'Core runtime', primitive: 'emit',
      explanation: 'Emit filters for verifierResult.status = accept and adds stable circuit and source identity. Static verification dominance prevents a direct candidate-to-emit path.',
      question: 'What is allowed to become an official finding?',
      data: { findings }
    },
    {
      label: '9. CNL audit', actor: 'Audit assembler', primitive: 'assemble',
      explanation: findings.length
        ? 'The canonical audit expresses the verified finding in controlled natural language while retaining its structured evidence.'
        : 'The audit is still produced, but it contains no ED-001 observation for this paragraph. That means no finding under this released rule and scope—not universal literary quality.',
      question: 'What does the user receive, with what limits?', data: audit
    }
  ];
}

function planningSteps(rawSource) {
  const source = rawSource.trim() || PLAN_SOURCE;
  const sourceDigest = digestLabel(source);
  const nonEmptyLines = source.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
  const observations = nonEmptyLines.map((text, index) => ({
    id: `observation:line:${index + 1}`,
    type: 'document.line@1',
    status: 'extracted',
    scope: 'view:whole',
    payload: { text, line: index + 1 },
    provenance: { producer: 'markdown-structural@1', source: 'source:idea' }
  }));
  const sourceIdea = nonEmptyLines.join('\n');
  const circuit = {
    id: 'editorial.scene-cnl-plan@0.1.0', purpose: 'planning',
    input: {
      name: 'idea', type: 'document.line@1', cardinality: 'at-least-one',
      statuses: ['extracted'], coverage: 'closed-world'
    },
    graph: [
      'candidate-plan: call planning.cnl-plan@1',
      'verified-plan: verify planning.cnl-plan@1',
      'published-plan: emit verified-plan'
    ]
  };
  const planBody = {
    title: 'Plan for a controlled English literary scene',
    sourceIdea,
    document: {
      type: 'short literary scene in Markdown', language: 'English',
      audience: 'adult literary readers',
      purpose: 'Realize the supplied idea as a coherent scene with concrete narrative prose.'
    },
    contentPlan: [
      { id: 'establish-scene', instruction: 'Establish people, place, time, and atmosphere.', requiredContent: [sourceIdea] },
      { id: 'develop-action', dependsOn: ['establish-scene'], instruction: 'Develop concrete, causal action.' },
      { id: 'close-scene', dependsOn: ['develop-action'], instruction: 'Close while preserving the supplied intent.' }
    ],
    realizationGuidance: [
      'Preserve every explicit fact from the idea.',
      'Use restrained, concrete narrative prose.',
      'Do not use “in fact” in narrative paragraphs.',
      'Use “perhaps” no more than twice in one narrative paragraph.',
      'Treat dash-prefixed Markdown paragraphs as dialogue.'
    ]
  };
  const candidate = {
    kind: 'CNLGenerationPlanCandidate', schemaVersion: 1,
    sourceObservationIds: observations.map((item) => item.id), sourceDigest,
    appliedRules: ['ED-001', 'ED-002'],
    ruleApplications: [
      { rule: 'ED-001', planLocations: ['realizationGuidance:3', 'realizationGuidance:5'] },
      { rule: 'ED-002', planLocations: ['realizationGuidance:4', 'realizationGuidance:5'] }
    ],
    plan: planBody
  };
  const verified = {
    ...candidate,
    guarantee: 'mechanically-certified',
    verifierResult: {
      status: 'accept', verifier: 'planning.cnl-plan@1',
      checkedProperties: [
        'plan-schema', 'idea-observation-provenance', 'source-digest',
        'document-design', 'ordered-content-plan', 'realization-guidance',
        'rule-provenance', 'rule-to-plan-coverage'
      ]
    }
  };
  const finalPlan = {
    kind: 'CNLGenerationPlan', schemaVersion: 1, dialect: 'CNL/Plan-1',
    profile: 'specification', sourceDigest, sourceIdea,
    plan: planBody,
    verification: {
      status: 'mechanically-certified', ruleApplications: candidate.ruleApplications
    }
  };
  return [
    {
      label: '1. Idea snapshot', actor: 'Planning run', primitive: 'source',
      explanation: 'The high-level idea is the source being compiled. It is not itself a rulebook and cannot modify the release.',
      question: 'What future document does the user want?', data: { source, sourceDigest }
    },
    {
      label: '2. LongTextJS compilation', actor: 'Markdown compiler', primitive: 'compile',
      explanation: 'The idea becomes exact line observations with source identity and complete structural coverage. The planning circuit will receive these observations, not an ungrounded summary.',
      question: 'How is the idea made addressable?',
      data: { kind: 'LongTextProgram', sourceDigest, observations }
    },
    {
      label: '3. Planning graph', actor: 'CircuitJS compiler', primitive: 'static analysis',
      explanation: 'Purpose planning changes the required output from findings to one plan. The graph still uses typed ports, linked operators, budgets, verification dominance, and immutable release identity.',
      question: 'Which executable theory will construct the specification?', data: circuit
    },
    {
      label: '4. Contract and binding', actor: 'Compatibility gate + scheduler', primitive: 'bindPorts',
      explanation: 'At least one extracted line and closed-world idea coverage are required. All non-empty source lines bind to the idea port in source order.',
      question: 'Which idea observations enter planning?',
      data: { contract: circuit.input, boundPort: { idea: observations }, status: 'compatible' }
    },
    {
      label: '5. Plan construction', actor: 'planning.cnl-plan@1', primitive: 'call',
      explanation: 'The operator reconstructs the idea from bound observations, applies the released plan template, and records where ED-001 and ED-002 shaped this specific plan. It does not translate the rulebook into CNL constraints.',
      question: 'What idea-specific document specification is proposed?', data: candidate
    },
    {
      label: '6. Plan verification', actor: 'planning.cnl-plan@1 verifier', primitive: 'verify',
      explanation: 'The verifier independently checks source binding, plan structure, ordering, guidance, authority provenance, and that every applied rule points to a real plan location.',
      question: 'Does the plan actually correspond to the idea and released theory?', data: verified
    },
    {
      label: '7. CNL plan publication', actor: 'Core runtime', primitive: 'emit',
      explanation: 'Only the accepted plan is finalized as CNL/Plan-1. This is the primary result. No language model was needed to create it.',
      question: 'What can be handed to a writer or realization model?', data: finalPlan
    },
    {
      label: '8. Optional closed loop', actor: 'Human or LLM + audit mode', primitive: 'realize → validate',
      explanation: 'A writer or model may turn the plan into prose. That prose is untrusted input and returns through LongTextJS, validation circuits, verifiers, and CNL/Audit-1. The plan never certifies its own realization.',
      question: 'Where does final-document conformance come from?',
      data: {
        optionalFlow: ['CNL/Plan-1', 'candidate Markdown', 'LongTextJS', 'validation CircuitJS', 'CNL/Audit-1'],
        claim: 'Conformance is established only by the final audit path.'
      }
    }
  ];
}

function pretty(value) {
  return JSON.stringify(value, null, 2);
}

function render() {
  const step = state.steps[state.index];
  const list = document.querySelector('#tutorial-steps');
  list.replaceChildren(...state.steps.map((item, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = item.label;
    button.dataset.state = index < state.index ? 'complete' : index === state.index ? 'current' : 'pending';
    button.setAttribute('aria-current', index === state.index ? 'step' : 'false');
    button.addEventListener('click', () => { state.index = index; render(); });
    return button;
  }));
  document.querySelector('#tutorial-progress').textContent =
    `Step ${state.index + 1} of ${state.steps.length}`;
  document.querySelector('#tutorial-label').textContent = step.label;
  document.querySelector('#tutorial-actor').textContent = step.actor;
  document.querySelector('#tutorial-primitive').textContent = step.primitive;
  document.querySelector('#tutorial-question').textContent = step.question;
  document.querySelector('#tutorial-explanation').textContent = step.explanation;
  document.querySelector('#tutorial-data').textContent = pretty(step.data);
  document.querySelector('#tutorial-previous').disabled = state.index === 0;
  document.querySelector('#tutorial-next').disabled = state.index === state.steps.length - 1;
}

function rebuild(resetInput = false) {
  const scenario = document.querySelector('#tutorial-scenario').value;
  const source = document.querySelector('#tutorial-source');
  if (resetInput) {
    source.value = scenario === 'planning'
      ? PLAN_SOURCE
      : scenario === 'dialogue' ? DIALOGUE_SOURCE : AUDIT_SOURCE;
  }
  state.scenario = scenario;
  state.steps = scenario === 'planning' ? planningSteps(source.value) : auditSteps(source.value);
  state.index = 0;
  render();
}

window.addEventListener('DOMContentLoaded', () => {
  document.querySelector('#tutorial-scenario').addEventListener('change', () => rebuild(true));
  document.querySelector('#tutorial-run').addEventListener('click', () => rebuild(false));
  document.querySelector('#tutorial-previous').addEventListener('click', () => {
    state.index = Math.max(0, state.index - 1);
    render();
  });
  document.querySelector('#tutorial-next').addEventListener('click', () => {
    state.index = Math.min(state.steps.length - 1, state.index + 1);
    render();
  });
  rebuild(true);
});
