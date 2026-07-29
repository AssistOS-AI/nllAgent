import { digestJson } from '../core/canonical.mjs';
import { verifiedGuarantee } from '../runtime/guarantees.mjs';
import { MEASURE_UNITS } from './domain-ontology.mjs';
import { compareExactDecimals, evaluateArithmeticPayload } from './exact-arithmetic.mjs';

const FOUNDATION_PACK = 'foundation-core@1.1.0';
const INANIMATE_DISJOINT = new Set(['person', 'animal', 'sentient agent']);
const NON_NEGATIVE_MEASURES = new Set(['mass', 'duration', 'distance', 'length', 'speed']);
const EMOTION_RULE_REFERENCES = Object.freeze({
  'FOUNDATION-EMOTION-001': 'emotion-polarity-consistency',
  'FOUNDATION-ONTOLOGY-001': 'disjoint-foundation-types',
  'FOUNDATION-PSYCHOLOGY-001': 'inanimate-emotion-attribution'
});

function anchorFor(program, observation) {
  return program.anchors[observation?.anchors?.[0]];
}

function exactAnchor(program, anchor) {
  if (!anchor || anchor.revision !== program.source.revision) return false;
  return Array.from(program.source.content).slice(anchor.range?.start, anchor.range?.end).join('') === anchor.quote;
}

function candidateBase(program, observations, fields) {
  const anchors = observations.map((item) => anchorFor(program, item)).filter(Boolean);
  const mainAnchor = [...anchors].sort((left, right) => left.range.start - right.range.start).at(-1);
  return {
    kind: 'FindingCandidate',
    severity: 'warning',
    guarantee: 'candidate',
    scope: observations[0]?.scope,
    mainAnchor,
    supportAnchors: anchors.map((item) => item.id),
    ...fields
  };
}

function arithmeticCandidates({ assertions = [] }, context) {
  return assertions.flatMap((assertion) => {
    const result = evaluateArithmeticPayload(assertion.payload);
    if (result.valid) return [];
    const expression = `${assertion.payload.left} ${assertion.payload.operator} ${assertion.payload.right}`;
    return [candidateBase(context.program, [assertion], {
      rule: 'FOUNDATION-MATH-001',
      verdict: 'potential-arithmetic-inconsistency',
      subject: assertion.id,
      witness: {
        kind: 'FoundationArithmeticReplay', pack: FOUNDATION_PACK,
        observationIds: [assertion.id], reason: result.reason, computed: result.computed
      },
      explanation: result.reason === 'division-by-zero'
        ? `The exact arithmetic assertion “${expression}” divides by zero.`
        : `The exact arithmetic assertion gives ${assertion.payload.result}; replay gives ${result.computed}.`,
      remediation: 'Correct the operands, operation, result, or use explicit approximate language outside this grammar.',
      limitations: ['Only finite decimal operands and the documented exact operations were evaluated.'],
      sourceRuleReferences: ['builtin:foundation-core@1#exact-arithmetic']
    })];
  });
}

function unitCompatible(quantity) {
  const allowed = MEASURE_UNITS[quantity.payload?.measureKey];
  return Array.isArray(allowed) && allowed.includes(quantity.payload?.unitKey || '');
}

function quantityBoundViolation(quantity) {
  const { measureKey, unitKey, value } = quantity.payload || {};
  if (NON_NEGATIVE_MEASURES.has(measureKey) && compareExactDecimals(value, '0') < 0) {
    return { violationKind: 'below-zero', lower: '0' };
  }
  if (measureKey === 'probability'
    && (compareExactDecimals(value, '0') < 0 || compareExactDecimals(value, '1') > 0)) {
    return { violationKind: 'probability-range', lower: '0', upper: '1' };
  }
  if (measureKey === 'percentage'
    && (compareExactDecimals(value, '0') < 0 || compareExactDecimals(value, '100') > 0)) {
    return { violationKind: 'percentage-range', lower: '0', upper: '100' };
  }
  if (measureKey === 'temperature') {
    const lower = ['k', 'kelvin'].includes(unitKey) ? '0'
      : ['c', '°c', 'celsius'].includes(unitKey) ? '-273.15'
        : ['f', '°f', 'fahrenheit'].includes(unitKey) ? '-459.67' : null;
    if (lower !== null && compareExactDecimals(value, lower) < 0) {
      return { violationKind: 'below-absolute-zero', lower };
    }
  }
  return null;
}

function sameQuantityContext(left, right) {
  return left.payload?.subjectKey === right.payload?.subjectKey
    && left.payload?.measureKey === right.payload?.measureKey
    && left.payload?.unitKey === right.payload?.unitKey
    && left.payload?.timeKey === right.payload?.timeKey
    && left.payload?.timeFrame === right.payload?.timeFrame
    && left.payload?.world === right.payload?.world;
}

function physicalViolationRecords(assertions) {
  const ordered = [...assertions].sort((left, right) => left.id.localeCompare(right.id));
  const violations = [];
  const firstByContext = new Map();
  for (const assertion of ordered) {
    if (!unitCompatible(assertion)) {
      violations.push({
        rule: 'FOUNDATION-PHYSICS-001', violationKind: 'unit-incompatible',
        assertions: [assertion], expectedUnits: MEASURE_UNITS[assertion.payload?.measureKey] || []
      });
      continue;
    }
    const bound = quantityBoundViolation(assertion);
    if (bound) violations.push({
      rule: 'FOUNDATION-PHYSICS-001', assertions: [assertion], ...bound
    });
    const contextKey = JSON.stringify([
      assertion.payload?.subjectKey, assertion.payload?.measureKey, assertion.payload?.unitKey,
      assertion.payload?.timeKey, assertion.payload?.timeFrame, assertion.payload?.world
    ]);
    const first = firstByContext.get(contextKey);
    if (!first) firstByContext.set(contextKey, assertion);
    else if (sameQuantityContext(first, assertion)
      && compareExactDecimals(first.payload?.value, assertion.payload?.value) !== 0) {
      violations.push({
        rule: 'FOUNDATION-QUANTITY-001', violationKind: 'conflicting-exact-values',
        assertions: [first, assertion]
      });
    }
  }
  return violations;
}

function physicalCandidates({ assertions = [] }, context) {
  return physicalViolationRecords(assertions).map((record) => {
    const first = record.assertions[0];
    const description = record.violationKind === 'unit-incompatible'
      ? `${first.payload.unit || '<none>'} is not a documented unit for ${first.payload.measure}.`
      : record.violationKind === 'conflicting-exact-values'
        ? `The same bounded ${first.payload.measure} has different exact values.`
        : `${first.payload.measure} ${first.payload.value} ${first.payload.unit || ''} is outside the documented elementary range.`;
    return candidateBase(context.program, record.assertions, {
      rule: record.rule,
      verdict: record.rule === 'FOUNDATION-QUANTITY-001'
        ? 'potential-quantity-inconsistency' : 'potential-physical-inconsistency',
      subject: first.payload.subject,
      witness: {
        kind: 'FoundationPhysicalReplay', pack: FOUNDATION_PACK,
        observationIds: record.assertions.map((item) => item.id),
        violationKind: record.violationKind,
        ...(record.expectedUnits ? { expectedUnits: record.expectedUnits } : {}),
        ...(record.lower !== undefined ? { lower: record.lower } : {}),
        ...(record.upper !== undefined ? { upper: record.upper } : {})
      },
      explanation: description,
      remediation: 'Correct the value, unit, time, measure, or intended physical model.',
      limitations: [
        'Only exact quantities, documented units, elementary bounds, and equal-unit disagreement were evaluated.'
      ],
      sourceRuleReferences: [`builtin:foundation-core@1#${record.rule === 'FOUNDATION-QUANTITY-001'
        ? 'exact-quantity-consistency' : 'bounded-physical-quantities'}`]
    });
  });
}

function sameEmotionContext(left, right) {
  return left.payload?.experiencerKey === right.payload?.experiencerKey
    && left.payload?.emotionKey === right.payload?.emotionKey
    && left.payload?.targetKey === right.payload?.targetKey
    && left.payload?.timeKey === right.payload?.timeKey
    && left.payload?.timeFrame === right.payload?.timeFrame
    && left.payload?.world === right.payload?.world;
}

function emotionalViolationRecords(emotions, types) {
  const records = [];
  const orderedEmotions = [...emotions].sort((left, right) => left.id.localeCompare(right.id));
  const orderedTypes = [...types].sort((left, right) => left.id.localeCompare(right.id));
  const emotionContexts = new Map();
  for (const emotion of orderedEmotions) {
    const key = JSON.stringify([
      emotion.payload?.experiencerKey, emotion.payload?.emotionKey, emotion.payload?.targetKey,
      emotion.payload?.timeKey, emotion.payload?.timeFrame, emotion.payload?.world
    ]);
    if (!emotionContexts.has(key)) emotionContexts.set(key, new Map());
    const polarities = emotionContexts.get(key);
    const opposite = emotion.payload?.polarity === 'affirmed' ? 'denied' : 'affirmed';
    if (polarities.has(opposite) && sameEmotionContext(polarities.get(opposite), emotion)) {
      records.push({
        rule: 'FOUNDATION-EMOTION-001', violationKind: 'opposite-emotion-polarity',
        observations: [polarities.get(opposite), emotion]
      });
    }
    if (!polarities.has(emotion.payload?.polarity)) polarities.set(emotion.payload?.polarity, emotion);
  }
  const typeContexts = new Map();
  const inanimateBySubjectWorldTime = new Map();
  for (const type of orderedTypes.filter((item) => item.payload?.polarity === 'affirmed')) {
    const key = JSON.stringify([
      type.payload?.subjectKey, type.payload?.timeKey, type.payload?.timeFrame, type.payload?.world
    ]);
    if (!typeContexts.has(key)) typeContexts.set(key, new Map());
    const classes = typeContexts.get(key);
    if (type.payload?.typeKey === 'inanimate object') {
      for (const disjoint of INANIMATE_DISJOINT) if (classes.has(disjoint)) records.push({
        rule: 'FOUNDATION-ONTOLOGY-001', violationKind: 'disjoint-types',
        observations: [classes.get(disjoint), type]
      });
    } else if (INANIMATE_DISJOINT.has(type.payload?.typeKey) && classes.has('inanimate object')) {
      records.push({
        rule: 'FOUNDATION-ONTOLOGY-001', violationKind: 'disjoint-types',
        observations: [classes.get('inanimate object'), type]
      });
    }
    if (!classes.has(type.payload?.typeKey)) classes.set(type.payload?.typeKey, type);
    if (type.payload?.typeKey === 'inanimate object') {
      const timeKey = JSON.stringify([
        type.payload?.subjectKey, type.payload?.world, type.payload?.timeFrame, type.payload?.timeKey
      ]);
      if (!inanimateBySubjectWorldTime.has(timeKey)) inanimateBySubjectWorldTime.set(timeKey, type);
    }
  }
  for (const emotion of orderedEmotions.filter((item) => item.payload?.polarity === 'affirmed')) {
    const keys = [emotion.payload?.timeKey, 'unspecified'].map((timeKey) => JSON.stringify([
      emotion.payload?.experiencerKey, emotion.payload?.world, emotion.payload?.timeFrame, timeKey
    ]));
    const matches = [...new Set(keys)].map((key) => inanimateBySubjectWorldTime.get(key)).filter(Boolean);
    for (const type of matches) {
      records.push({
        rule: 'FOUNDATION-PSYCHOLOGY-001', violationKind: 'inanimate-emotion-attribution',
        observations: [type, emotion]
      });
    }
  }
  return records;
}

function emotionalCandidates({ emotions = [], types = [] }, context) {
  return emotionalViolationRecords(emotions, types).map((record) => {
    const subject = record.observations[0].payload.subject || record.observations[0].payload.experiencer;
    const explanation = record.violationKind === 'opposite-emotion-polarity'
      ? 'The source both affirms and denies the same emotion attribution in one bounded context.'
      : record.violationKind === 'disjoint-types'
        ? 'The source assigns two explicitly disjoint foundation types in one bounded context.'
        : 'The source literally attributes an emotion to a subject explicitly typed as inanimate.';
    return candidateBase(context.program, record.observations, {
      rule: record.rule,
      verdict: record.rule === 'FOUNDATION-EMOTION-001'
        ? 'potential-emotional-inconsistency' : 'potential-ontology-inconsistency',
      subject,
      witness: {
        kind: 'FoundationEmotionOntologyReplay', pack: FOUNDATION_PACK,
        observationIds: record.observations.map((item) => item.id),
        violationKind: record.violationKind
      },
      explanation,
      remediation: 'Clarify polarity, time, type, literal versus figurative language, or the intended fictional world.',
      limitations: [
        'Only explicit literal emotion and built-in type assertions were evaluated; no diagnosis was inferred.'
      ],
      sourceRuleReferences: [`builtin:foundation-core@1#${EMOTION_RULE_REFERENCES[record.rule]}`]
    });
  });
}

function recordMatchesCandidate(record, candidate) {
  const ids = (record.assertions || record.observations || []).map((item) => item.id);
  return record.rule === candidate.rule
    && record.violationKind === candidate.witness?.violationKind
    && JSON.stringify(ids) === JSON.stringify(candidate.witness?.observationIds || []);
}

function verificationResult(candidate, context, accepted, verifier, properties, certificateKind) {
  return {
    ...candidate,
    guarantee: accepted ? verifiedGuarantee(candidate) : 'rejected',
    verifierResult: {
      status: accepted ? 'accept' : 'reject', verifier,
      checkedProperties: properties,
      diagnostics: accepted ? [] : ['The foundation witness could not be replayed from canonical observations.']
    },
    certificate: accepted ? {
      kind: certificateKind,
      sourceDigest: context.program.source.revision,
      pack: FOUNDATION_PACK,
      witnessDigest: digestJson(candidate.witness)
    } : null
  };
}

function verifyArithmeticCandidates(candidates, context) {
  const observations = new Map(context.program.observations.map((item) => [item.id, item]));
  return candidates.map((candidate) => {
    const assertion = observations.get(candidate.witness?.observationIds?.[0]);
    const result = assertion?.type === 'foundation.arithmetic-assertion@1'
      ? evaluateArithmeticPayload(assertion.payload) : null;
    const anchor = anchorFor(context.program, assertion);
    const accepted = Boolean(result && !result.valid && result.reason === candidate.witness.reason
      && result.computed === candidate.witness.computed && exactAnchor(context.program, anchor)
      && anchor.id === candidate.mainAnchor?.id);
    return verificationResult(candidate, context, accepted, 'foundation.arithmetic-conflicts@1',
      ['source-revision', 'exact-decimal-operands', 'operation', 'stated-result', 'exact-anchor'],
      'FoundationArithmeticCertificate');
  });
}

function verifyPhysicalCandidates(candidates, context) {
  const assertions = context.program.observations.filter((item) => item.type === 'foundation.quantity-assertion@1');
  const records = physicalViolationRecords(assertions);
  return candidates.map((candidate) => {
    const record = records.find((item) => recordMatchesCandidate(item, candidate));
    const anchors = (record?.assertions || []).map((item) => anchorFor(context.program, item));
    const accepted = Boolean(record && anchors.every((anchor) => exactAnchor(context.program, anchor))
      && anchors.some((anchor) => anchor.id === candidate.mainAnchor?.id));
    return verificationResult(candidate, context, accepted, 'foundation.physical-conflicts@1',
      ['source-revision', 'quantity-context', 'exact-values', 'unit-policy', 'elementary-bounds', 'exact-anchors'],
      'FoundationPhysicalCertificate');
  });
}

function verifyEmotionalCandidates(candidates, context) {
  const emotions = context.program.observations.filter((item) => item.type === 'foundation.emotion-assertion@1');
  const types = context.program.observations.filter((item) => item.type === 'foundation.type-assertion@1');
  const records = emotionalViolationRecords(emotions, types);
  return candidates.map((candidate) => {
    const record = records.find((item) => recordMatchesCandidate(item, candidate));
    const anchors = (record?.observations || []).map((item) => anchorFor(context.program, item));
    const accepted = Boolean(record && anchors.every((anchor) => exactAnchor(context.program, anchor))
      && anchors.some((anchor) => anchor.id === candidate.mainAnchor?.id));
    return verificationResult(candidate, context, accepted, 'foundation.emotional-conflicts@1',
      ['source-revision', 'emotion-context', 'polarity', 'type-disjointness', 'literal-attribution', 'exact-anchors'],
      'FoundationEmotionOntologyCertificate');
  });
}

function registerExtendedFoundationOperators(registry) {
  registry.register({
    id: 'foundation.arithmetic-conflicts@1', primitives: ['call'],
    description: 'Construct candidates for false exact decimal equalities and division by zero.',
    execute: arithmeticCandidates
  });
  registry.register({
    id: 'foundation.physical-conflicts@1', primitives: ['call'],
    description: 'Construct candidates for elementary quantity, unit, and physical-bound inconsistencies.',
    execute: physicalCandidates
  });
  registry.register({
    id: 'foundation.emotional-conflicts@1', primitives: ['call'],
    description: 'Construct candidates for explicit emotion polarity and bounded ontology inconsistencies.',
    execute: emotionalCandidates
  });
  return registry;
}

function registerExtendedFoundationVerifiers(registry) {
  registry.register({
    id: 'foundation.arithmetic-conflicts@1',
    description: 'Replay exact decimal arithmetic against the canonical assertion and source anchor.',
    execute: ({ candidates = [] }, context) => verifyArithmeticCandidates(candidates, context)
  });
  registry.register({
    id: 'foundation.physical-conflicts@1',
    description: 'Replay unit, bound, and exact quantity conflicts against canonical observations.',
    execute: ({ candidates = [] }, context) => verifyPhysicalCandidates(candidates, context)
  });
  registry.register({
    id: 'foundation.emotional-conflicts@1',
    description: 'Replay explicit emotion and type ontology conflicts against canonical observations.',
    execute: ({ candidates = [] }, context) => verifyEmotionalCandidates(candidates, context)
  });
  return registry;
}

export {
  arithmeticCandidates,
  emotionalCandidates,
  emotionalViolationRecords,
  physicalCandidates,
  physicalViolationRecords,
  quantityBoundViolation,
  registerExtendedFoundationOperators,
  registerExtendedFoundationVerifiers,
  sameEmotionContext,
  sameQuantityContext,
  unitCompatible,
  verifyArithmeticCandidates,
  verifyEmotionalCandidates,
  verifyPhysicalCandidates
};
