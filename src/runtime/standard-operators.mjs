import { OperatorRegistry, VerifierRegistry } from './registries.mjs';
import { NllError } from '../core/errors.mjs';
import { registerLogicOperators, registerLogicVerifiers } from './logic-operators.mjs';
import { registerReasoningOperators, registerReasoningVerifiers } from './reasoning-operators.mjs';
import { registerNarrativeOperators, registerNarrativeVerifiers } from './narrative-operators.mjs';
import { verifiedGuarantee } from './guarantees.mjs';
import {
  interpolatePlanTemplate, validateCnlPlanBody, validateCnlPlanCandidate
} from '../generation/cnl.mjs';

function compareValues(left, operator, right) {
  if (operator === 'eq') return left === right;
  if (operator === 'neq') return left !== right;
  if (operator === 'gt') return left > right;
  if (operator === 'gte') return left >= right;
  if (operator === 'lt') return left < right;
  if (operator === 'lte') return left <= right;
  if (operator === 'includes') return Array.isArray(left) ? left.includes(right) : String(left).includes(String(right));
  throw new NllError('unsupported-comparison', `Unsupported comparison ${operator}.`);
}

function valueAt(object, path) {
  return String(path).split('.').reduce((value, segment) => value?.[segment], object);
}

function invokeModelGateway(gateway, request) {
  return gateway.invoke(Object.fromEntries(
    Object.entries(request).filter(([, value]) => value !== undefined)
  ));
}

function occurrenceRanges(text, parentStart, policy) {
  const source = policy.caseSensitive ? text : text.toLocaleLowerCase(policy.locale || 'und');
  const term = policy.caseSensitive ? policy.term : policy.term.toLocaleLowerCase(policy.locale || 'und');
  const ranges = [];
  let cursor = 0;
  while (term && cursor <= source.length - term.length) {
    const offset = source.indexOf(term, cursor);
    if (offset < 0) break;
    cursor = offset + Math.max(term.length, 1);
    const before = source[offset - 1];
    const after = source[offset + term.length];
    if (policy.wholeWord
      && ((before && /[\p{L}\p{N}_]/u.test(before)) || (after && /[\p{L}\p{N}_]/u.test(after)))) continue;
    ranges.push({
      start: parentStart + Array.from(text.slice(0, offset)).length,
      end: parentStart + Array.from(text.slice(0, offset + term.length)).length
    });
  }
  return ranges;
}

function relationalOperators(registry) {
  registry.register({
    id: 'relational.filter@1', description: 'Filter records by declarative comparisons.',
    execute: ({ records = [], predicates = [] }) => records.filter((record) =>
      predicates.every((predicate) => compareValues(valueAt(record, predicate.path), predicate.operator || 'eq', predicate.value)))
  });
  registry.register({
    id: 'relational.project@1', description: 'Project named paths from records.',
    execute: ({ records = [], fields = {} }) => records.map((record) =>
      Object.fromEntries(Object.entries(fields).map(([name, path]) => [name, valueAt(record, path)])))
  });
  registry.register({
    id: 'relational.join@1', description: 'Deterministic inner join.',
    execute: ({ left = [], right = [], leftKey, rightKey }) => {
      const index = new Map();
      for (const record of right) {
        const key = valueAt(record, rightKey);
        if (!index.has(key)) index.set(key, []);
        index.get(key).push(record);
      }
      return left.flatMap((record) => (index.get(valueAt(record, leftKey)) || []).map((match) => ({ left: record, right: match })));
    }
  });
  registry.register({
    id: 'relational.aggregate@1', description: 'Count or collect records by key.',
    execute: ({ records = [], groupBy, operation = 'count' }) => {
      const groups = new Map();
      for (const record of records) {
        const key = groupBy ? valueAt(record, groupBy) : '__all__';
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(record);
      }
      return [...groups.entries()].map(([key, values]) => ({ key, value: operation === 'count' ? values.length : values }));
    }
  });
  return registry;
}

function lexicalOccurrences({ observations = [], rules = [] }, context) {
  const findings = [];
  for (const observation of observations) {
    const text = observation.payload?.text;
    if (typeof text !== 'string') continue;
    const parentAnchor = context.program.anchors[observation.anchors?.[0]];
    if (!parentAnchor) continue;
    for (const rule of rules) {
      if (rule.scopeKinds && !rule.scopeKinds.includes(observation.type)) continue;
      if ((rule.excludedPrefixes || []).some((prefix) => text.trimStart().startsWith(prefix))) continue;
      const ranges = occurrenceRanges(text, parentAnchor.range.start, rule);
      let count = 0;
      for (const range of ranges) {
        count += 1;
        findings.push({
          kind: 'FindingCandidate', rule: rule.id, verdict: rule.verdict || 'violation',
          severity: rule.severity || 'warning', guarantee: 'candidate',
          ...(observation.status === 'proposed' ? { guaranteeCeiling: 'evidence-certified' } : {}),
          subject: observation.id, scope: observation.scope,
          mainAnchor: { ...parentAnchor, id: `${parentAnchor.id}:match:${rule.id}:${count}`,
            range: { unit: 'unicode-code-point', ...range },
            quote: Array.from(context.program.source.content).slice(range.start, range.end).join('') },
          supportAnchors: observation.anchors,
          witness: {
            kind: 'ExactTextMatch', observationId: observation.id, term: rule.term,
            caseSensitive: Boolean(rule.caseSensitive), wholeWord: Boolean(rule.wholeWord),
            locale: rule.locale || 'und', scopeKinds: rule.scopeKinds || [],
            excludedPrefixes: rule.excludedPrefixes || []
          },
          explanation: rule.explanation || `The text contains “${rule.term}”.`,
          remediation: rule.remediation || 'Review or remove the matched wording.',
          limitations: rule.limitations || [],
          sourceRuleReferences: rule.sourceRuleReferences || []
        });
      }
    }
  }
  return findings;
}

function frequencyThreshold({ observations = [], rules = [] }, context) {
  const findings = [];
  for (const observation of observations) {
    const text = observation.payload?.text;
    const parentAnchor = context.program.anchors[observation.anchors?.[0]];
    if (typeof text !== 'string' || !parentAnchor) continue;
    for (const rule of rules) {
      if (rule.scopeKinds && !rule.scopeKinds.includes(observation.type)) continue;
      if ((rule.excludedPrefixes || []).some((prefix) => text.trimStart().startsWith(prefix))) continue;
      const offsets = occurrenceRanges(text, parentAnchor.range.start, rule);
      if (offsets.length <= rule.maximum) continue;
      const firstExcess = offsets[rule.maximum];
      findings.push({
        kind: 'FindingCandidate',
        rule: rule.id,
        verdict: rule.verdict || 'violation',
        severity: rule.severity || 'warning',
        guarantee: 'candidate',
        ...(observation.status === 'proposed' ? { guaranteeCeiling: 'evidence-certified' } : {}),
        subject: observation.id,
        scope: observation.scope,
        mainAnchor: {
          ...parentAnchor,
          id: `${parentAnchor.id}:frequency:${rule.id}`,
          range: firstExcess,
          quote: Array.from(context.program.source.content).slice(firstExcess.start, firstExcess.end).join('')
        },
        supportAnchors: observation.anchors,
        witness: {
          kind: 'FrequencyThreshold',
          observationId: observation.id, term: rule.term,
          maximum: rule.maximum,
          caseSensitive: Boolean(rule.caseSensitive),
          wholeWord: Boolean(rule.wholeWord), locale: rule.locale || 'und',
          scopeKinds: rule.scopeKinds || [], excludedPrefixes: rule.excludedPrefixes || [],
          occurrences: offsets
        },
        explanation: rule.explanation || `“${rule.term}” appears ${offsets.length} times; the maximum is ${rule.maximum}.`,
        remediation: rule.remediation || 'Remove or vary occurrences above the configured limit.',
        limitations: rule.limitations || [],
        sourceRuleReferences: rule.sourceRuleReferences || []
      });
    }
  }
  return findings;
}

function frequencyVerifier({ candidates = [] }, context) {
  const sourcePoints = Array.from(context.program.source.content);
  const observations = new Map(context.program.observations.map((item) => [item.id, item]));
  return candidates.map((candidate) => {
    const witness = candidate.witness || {};
    const observation = observations.get(witness.observationId);
    const parentAnchor = context.program.anchors[observation?.anchors?.[0]];
    const occurrences = candidate.witness?.occurrences || [];
    const text = observation?.payload?.text;
    const scopeAllowed = !witness.scopeKinds?.length || witness.scopeKinds.includes(observation?.type);
    const prefixAllowed = typeof text === 'string'
      && !(witness.excludedPrefixes || []).some((prefix) => text.trimStart().startsWith(prefix));
    const recomputed = typeof text === 'string' && parentAnchor
      ? occurrenceRanges(text, parentAnchor.range.start, witness) : [];
    const sameSpans = JSON.stringify(recomputed) === JSON.stringify(occurrences);
    const firstExcess = recomputed[witness.maximum];
    const mainMatches = firstExcess
      && candidate.mainAnchor?.range?.start === firstExcess.start
      && candidate.mainAnchor?.range?.end === firstExcess.end
      && candidate.mainAnchor?.quote === sourcePoints.slice(firstExcess.start, firstExcess.end).join('');
    const accepted = Boolean(
      observation && observation.id === candidate.subject && scopeAllowed && prefixAllowed
      && Number.isInteger(witness.maximum) && witness.maximum >= 0
      && sameSpans && recomputed.length > witness.maximum && mainMatches
    );
    return {
      ...candidate,
      guarantee: accepted ? verifiedGuarantee(candidate) : 'rejected',
      verifierResult: {
        status: accepted ? 'accept' : 'reject',
        verifier: 'text.frequency-threshold@1',
        checkedProperties: ['observation-scope', 'excluded-prefixes', 'whole-word-policy', 'occurrence-completeness', 'configured-maximum', 'case-policy'],
        diagnostics: accepted ? [] : ['Frequency witness does not match the canonical source.']
      },
      certificate: accepted ? {
        kind: 'FrequencyThresholdCertificate',
        sourceDigest: context.program.source.revision,
        count: occurrences.length,
        maximum: candidate.witness.maximum,
        occurrences
      } : null
    };
  });
}

function exactMatchVerifier({ candidates = [] }, context) {
  const sourcePoints = Array.from(context.program.source.content);
  const observations = new Map(context.program.observations.map((item) => [item.id, item]));
  return candidates.map((candidate) => {
    const witness = candidate.witness || {};
    const observation = observations.get(witness.observationId);
    const parentAnchor = context.program.anchors[observation?.anchors?.[0]];
    const text = observation?.payload?.text;
    const { start, end } = candidate.mainAnchor.range;
    const actual = sourcePoints.slice(start, end).join('');
    const scopeAllowed = !witness.scopeKinds?.length || witness.scopeKinds.includes(observation?.type);
    const prefixAllowed = typeof text === 'string'
      && !(witness.excludedPrefixes || []).some((prefix) => text.trimStart().startsWith(prefix));
    const ranges = typeof text === 'string' && parentAnchor
      ? occurrenceRanges(text, parentAnchor.range.start, witness) : [];
    const rangeAllowed = ranges.some((range) => range.start === start && range.end === end);
    const accepted = Boolean(
      observation && observation.id === candidate.subject && scopeAllowed && prefixAllowed && rangeAllowed
      && candidate.mainAnchor.quote === actual
    );
    return {
      ...candidate,
      guarantee: accepted ? verifiedGuarantee(candidate) : 'rejected',
      verifierResult: {
        status: accepted ? 'accept' : 'reject', verifier: 'text.exact-match@1',
        checkedProperties: ['observation-scope', 'excluded-prefixes', 'anchor-range', 'exact-source-text', 'configured-case-policy', 'whole-word-policy'],
        diagnostics: accepted ? [] : [`The exact-match witness for ${witness.term || '<missing>'} is not independently reproducible.`]
      },
      certificate: accepted ? { kind: 'ExactTextCertificate', sourceDigest: context.program.source.revision, start, end, text: actual } : null
    };
  });
}

function buildCnlGenerationPlan({
  idea = [], plan = {}, appliedRules = [], sourceRuleReferences = [], ruleApplications = []
}, context) {
  const groundedIdea = idea.filter((observation) => typeof observation.payload?.text === 'string'
    && observation.payload.text.trim());
  const sourceIdea = groundedIdea.map((observation) => observation.payload.text.trim()).join('\n').trim();
  const plannedContent = interpolatePlanTemplate(plan, { idea: sourceIdea });
  return [{
    kind: 'CNLGenerationPlanCandidate', schemaVersion: 1,
    sourceObservationIds: groundedIdea.map((observation) => observation.id),
    sourceDigest: context.program.source.revision,
    appliedRules: [...appliedRules], sourceRuleReferences: [...sourceRuleReferences],
    ruleApplications: [...ruleApplications],
    plan: validateCnlPlanBody({ ...plannedContent, sourceIdea })
  }];
}

function verifyCnlGenerationPlan({ candidates = [] }, context) {
  const observations = new Map(context.program.observations.map((observation) => [observation.id, observation]));
  return candidates.map((candidate) => {
    let diagnostics = [];
    try {
      const validated = validateCnlPlanCandidate(candidate);
      if (validated.sourceDigest !== context.program.source.revision) {
        diagnostics.push('Plan source digest does not match the input idea.');
      }
      const grounded = validated.sourceObservationIds.map((id) => observations.get(id));
      if (grounded.some((observation) => !observation)) diagnostics.push('Plan references an unknown idea observation.');
      const sourceIdea = grounded.filter(Boolean)
        .map((observation) => observation.payload?.text?.trim()).filter(Boolean).join('\n').trim();
      if (sourceIdea !== validated.plan.sourceIdea) {
        diagnostics.push('Plan source idea is not reproduced from its grounded LongTextJS observations.');
      }
    } catch (error) {
      diagnostics = [error.message];
    }
    const accepted = diagnostics.length === 0;
    return {
      ...candidate,
      guarantee: accepted ? 'mechanically-certified' : 'rejected',
      verifierResult: {
        status: accepted ? 'accept' : 'reject', verifier: 'planning.cnl-plan@1',
        checkedProperties: [
          'plan-schema', 'idea-observation-provenance', 'source-digest',
          'document-design', 'ordered-content-plan', 'realization-guidance',
          'rule-provenance', 'rule-to-plan-coverage'
        ],
        diagnostics
      }
    };
  });
}

function createStandardRegistries(options = {}) {
  const operators = relationalOperators(new OperatorRegistry());
  registerLogicOperators(operators);
  registerReasoningOperators(operators);
  registerNarrativeOperators(operators);
  operators.register({ id: 'text.lexical-occurrences@1', description: 'Find literal text under explicit lexical rules.', execute: lexicalOccurrences });
  operators.register({
    id: 'text.frequency-threshold@1',
    description: 'Find scoped literal frequency above a configured maximum.',
    execute: frequencyThreshold
  });
  operators.register({ id: 'core.identity@1', description: 'Return records unchanged.', execute: ({ records = [] }) => records });
  operators.register({
    id: 'planning.cnl-plan@1',
    description: 'Build an idea-specific CNL generation plan from LongTextJS observations and released planning logic.',
    execute: buildCnlGenerationPlan
  });
  if (options.modelGateway) {
    operators.register({
      id: 'model.rubric-judge@1', description: 'Run a bounded rubric judgment through the selected translation backend.',
      deterministic: false, effects: ['model'],
      execute: async ({ prompt, model, tier, tags, taskRole = 'judgment', templateId, responseShape = 'json', outputSchema }) =>
        invokeModelGateway(options.modelGateway, {
          prompt, model, tier, tags, taskRole, templateId, responseShape, outputSchema
        })
    });
    operators.register({
      id: 'model.structured-extractor@1', description: 'Produce schema-bounded neutral observations through the selected translation backend.',
      deterministic: false, effects: ['model'],
      execute: async ({ prompt, model, tier, tags, taskRole = 'extraction', templateId, responseShape = 'json', outputSchema }) =>
        invokeModelGateway(options.modelGateway, {
          prompt, model, tier, tags, taskRole, templateId, responseShape, outputSchema
        })
    });
  }
  const verifiers = new VerifierRegistry();
  registerLogicVerifiers(verifiers);
  registerReasoningVerifiers(verifiers);
  registerNarrativeVerifiers(verifiers);
  verifiers.register({ id: 'text.exact-match@1', description: 'Re-read exact source spans for literal matches.', execute: exactMatchVerifier });
  verifiers.register({
    id: 'text.frequency-threshold@1',
    description: 'Recount exact source spans and check a frequency threshold witness.',
    execute: frequencyVerifier
  });
  verifiers.register({
    id: 'planning.cnl-plan@1',
    description: 'Validate CNL plan structure, source-idea binding, released rule provenance, and rule-to-plan coverage.',
    execute: verifyCnlGenerationPlan
  });
  return { operators, verifiers };
}

export {
  buildCnlGenerationPlan,
  compareValues,
  createStandardRegistries,
  exactMatchVerifier,
  frequencyThreshold,
  frequencyVerifier,
  invokeModelGateway,
  lexicalOccurrences,
  occurrenceRanges,
  verifyCnlGenerationPlan,
  valueAt
};
