import { digestJson } from '../core/canonical.mjs';
import { verifiedGuarantee } from '../runtime/guarantees.mjs';

const EXCLUSIVE_STATE_PAIRS = Object.freeze([
  ['alive', 'dead'],
  ['open', 'closed'],
  ['present', 'absent'],
  ['on', 'off']
]);

function sameStateContext(left, right) {
  return left.payload?.subjectKey === right.payload?.subjectKey
    && left.payload?.timeFrame === right.payload?.timeFrame
    && left.payload?.timeKey === right.payload?.timeKey
    && left.payload?.world === right.payload?.world;
}

function exclusivePredicates(left, right) {
  const values = new Set([left, right]);
  return EXCLUSIVE_STATE_PAIRS.some((pair) => pair.every((item) => values.has(item)));
}

function stateConflictKind(left, right) {
  if (!sameStateContext(left, right)) return null;
  if (left.payload?.predicateKey === right.payload?.predicateKey
    && left.payload?.polarity !== right.payload?.polarity) return 'opposite-polarity';
  if (left.payload?.polarity === 'affirmed' && right.payload?.polarity === 'affirmed'
    && exclusivePredicates(left.payload?.predicateKey, right.payload?.predicateKey)) {
    return 'mutually-exclusive-states';
  }
  return null;
}

function stateConflictRecords(assertions) {
  const ordered = [...assertions].sort((left, right) => left.id.localeCompare(right.id));
  const conflicts = [];
  for (let leftIndex = 0; leftIndex < ordered.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < ordered.length; rightIndex += 1) {
      const left = ordered[leftIndex];
      const right = ordered[rightIndex];
      const conflictKind = stateConflictKind(left, right);
      if (conflictKind) conflicts.push({ conflictKind, assertions: [left, right] });
    }
  }
  return conflicts;
}

function findPath(adjacency, start, target, excludedId) {
  const pending = [{ node: start, path: [] }];
  const visited = new Set();
  while (pending.length) {
    const current = pending.shift();
    if (current.node === target && current.path.length) return current.path;
    if (visited.has(current.node)) continue;
    visited.add(current.node);
    for (const edge of adjacency.get(current.node) || []) {
      if (edge.id !== excludedId) pending.push({ node: edge.payload.laterKey, path: [...current.path, edge] });
    }
  }
  return null;
}

function temporalCycleRecords(relations) {
  const ordered = [...relations].sort((left, right) => left.id.localeCompare(right.id));
  const adjacency = new Map();
  for (const relation of ordered) {
    const key = relation.payload?.earlierKey;
    if (!adjacency.has(key)) adjacency.set(key, []);
    adjacency.get(key).push(relation);
  }
  const cycles = new Map();
  for (const relation of ordered) {
    const path = relation.payload?.earlierKey === relation.payload?.laterKey
      ? []
      : findPath(adjacency, relation.payload?.laterKey, relation.payload?.earlierKey, relation.id);
    if (path === null) continue;
    const relationsInCycle = [relation, ...path];
    const key = relationsInCycle.map((item) => item.id).sort().join('|');
    if (!cycles.has(key)) cycles.set(key, { relations: relationsInCycle });
  }
  return [...cycles.values()];
}

function anchorFor(program, observation) {
  return program.anchors[observation.anchors?.[0]];
}

function stateConflictCandidates({ assertions = [] }, context) {
  return stateConflictRecords(assertions).map(({ conflictKind, assertions: pair }) => {
    const anchors = pair.map((item) => anchorFor(context.program, item)).filter(Boolean);
    const mainAnchor = [...anchors].sort((left, right) => left.range.start - right.range.start).at(-1);
    const contextLabel = pair[0].payload.timeKey === 'unspecified'
      ? 'with no explicit shared time' : `at ${pair[0].payload.time}`;
    return {
      kind: 'FindingCandidate',
      rule: 'FOUNDATION-LOGIC-001',
      verdict: 'potential-logical-inconsistency',
      severity: 'warning',
      guarantee: 'candidate',
      subject: pair[0].payload.subject,
      scope: pair[0].scope,
      mainAnchor,
      supportAnchors: anchors.map((item) => item.id),
      witness: {
        kind: 'FoundationStateConflict',
        pack: 'foundation-core@1.1.0',
        conflictKind,
        observationIds: pair.map((item) => item.id),
        unspecifiedTime: pair[0].payload.timeKey === 'unspecified'
      },
      explanation: `${pair[0].payload.subject} has incompatible state assertions ${contextLabel}.`,
      remediation: 'Clarify the time, world, subject identity, or intended state.',
      limitations: [
        'Only the documented controlled-English state form was evaluated.',
        ...(pair[0].payload.timeKey === 'unspecified'
          ? ['The source does not establish that both assertions refer to the same real-world moment.'] : [])
      ],
      sourceRuleReferences: ['builtin:foundation-core@1#bounded-non-contradiction']
    };
  });
}

function temporalCycleCandidates({ relations = [] }, context) {
  return temporalCycleRecords(relations).map(({ relations: cycle }) => {
    const anchors = cycle.map((item) => anchorFor(context.program, item)).filter(Boolean);
    const mainAnchor = [...anchors].sort((left, right) => left.range.start - right.range.start).at(-1);
    return {
      kind: 'FindingCandidate',
      rule: 'FOUNDATION-TIME-001',
      verdict: 'potential-temporal-inconsistency',
      severity: 'warning',
      guarantee: 'candidate',
      subject: cycle[0].payload.earlier,
      scope: cycle[0].scope,
      mainAnchor,
      supportAnchors: anchors.map((item) => item.id),
      witness: {
        kind: 'FoundationBeforeCycle',
        pack: 'foundation-core@1.1.0',
        observationIds: cycle.map((item) => item.id)
      },
      explanation: 'The explicit “before” relations form a directed cycle.',
      remediation: 'Correct an event label or ordering relation, or select a different world for an alternative chronology.',
      limitations: ['Only explicit controlled-English “before” relations were evaluated.'],
      sourceRuleReferences: ['builtin:foundation-core@1#strict-before-acyclicity']
    };
  });
}

function sourceAnchorIsExact(program, anchor) {
  if (!anchor || anchor.revision !== program.source.revision) return false;
  const points = Array.from(program.source.content);
  return points.slice(anchor.range?.start, anchor.range?.end).join('') === anchor.quote;
}

function replayStateCandidate(candidate, observations, program) {
  const ids = candidate.witness?.observationIds || [];
  const pair = ids.map((id) => observations.get(id));
  if (pair.length !== 2 || pair.some((item) => item?.type !== 'foundation.state-assertion@1')) return false;
  if (stateConflictKind(pair[0], pair[1]) !== candidate.witness.conflictKind) return false;
  const anchors = pair.map((item) => anchorFor(program, item));
  return anchors.every((anchor) => sourceAnchorIsExact(program, anchor))
    && anchors.some((anchor) => anchor.id === candidate.mainAnchor?.id);
}

function replayTemporalCandidate(candidate, observations, program) {
  const cycle = (candidate.witness?.observationIds || []).map((id) => observations.get(id));
  if (!cycle.length || cycle.some((item) => item?.type !== 'foundation.temporal-relation@1'
    || item.payload?.relation !== 'before')) return false;
  for (let index = 0; index < cycle.length; index += 1) {
    const current = cycle[index];
    const next = cycle[(index + 1) % cycle.length];
    if (current.payload.laterKey !== next.payload.earlierKey) return false;
  }
  const anchors = cycle.map((item) => anchorFor(program, item));
  return anchors.every((anchor) => sourceAnchorIsExact(program, anchor))
    && anchors.some((anchor) => anchor.id === candidate.mainAnchor?.id);
}

function verifyFoundationCandidates(candidates, context, kind) {
  const observations = new Map(context.program.observations.map((item) => [item.id, item]));
  return candidates.map((candidate) => {
    const accepted = kind === 'state'
      ? replayStateCandidate(candidate, observations, context.program)
      : replayTemporalCandidate(candidate, observations, context.program);
    const verifier = kind === 'state' ? 'foundation.state-conflicts@1' : 'foundation.temporal-cycles@1';
    return {
      ...candidate,
      guarantee: accepted ? verifiedGuarantee(candidate) : 'rejected',
      verifierResult: {
        status: accepted ? 'accept' : 'reject',
        verifier,
        checkedProperties: kind === 'state'
          ? ['source-revision', 'assertion-types', 'bounded-context', 'polarity-or-exclusivity', 'exact-anchors']
          : ['source-revision', 'relation-types', 'strict-before-cycle', 'exact-anchors'],
        diagnostics: accepted ? [] : ['The foundation witness could not be replayed from canonical observations.']
      },
      certificate: accepted ? {
        kind: kind === 'state' ? 'FoundationStateConflictCertificate' : 'FoundationTemporalCycleCertificate',
        sourceDigest: context.program.source.revision,
        pack: 'foundation-core@1.1.0',
        witnessDigest: digestJson(candidate.witness)
      } : null
    };
  });
}

function registerFoundationOperators(registry) {
  registry.register({
    id: 'foundation.state-conflicts@1',
    primitives: ['call'],
    description: 'Construct bounded candidates from explicit opposite or mutually-exclusive state assertions.',
    execute: stateConflictCandidates
  });
  registry.register({
    id: 'foundation.temporal-cycles@1',
    primitives: ['call'],
    description: 'Construct bounded candidates for cycles in explicit strict-before relations.',
    execute: temporalCycleCandidates
  });
  return registry;
}

function registerFoundationVerifiers(registry) {
  registry.register({
    id: 'foundation.state-conflicts@1',
    description: 'Replay a bounded state conflict against canonical observations and source anchors.',
    execute: ({ candidates = [] }, context) => verifyFoundationCandidates(candidates, context, 'state')
  });
  registry.register({
    id: 'foundation.temporal-cycles@1',
    description: 'Replay a strict-before cycle against canonical observations and source anchors.',
    execute: ({ candidates = [] }, context) => verifyFoundationCandidates(candidates, context, 'temporal')
  });
  return registry;
}

export {
  EXCLUSIVE_STATE_PAIRS,
  registerFoundationOperators,
  registerFoundationVerifiers,
  sameStateContext,
  stateConflictCandidates,
  stateConflictKind,
  stateConflictRecords,
  temporalCycleCandidates,
  temporalCycleRecords,
  verifyFoundationCandidates
};
