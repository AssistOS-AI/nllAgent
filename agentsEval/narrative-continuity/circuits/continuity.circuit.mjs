import {
  circuit, columns, decisionTable, include, instantiateEach, match, primaryRole, reads,
  result, row, stage, supports, usesMethod, usesPrimitives, values, writes
} from '../../../src/circuit/api.mjs';
import {
  relation, relationAtom, relationFact, relationRule, relationValue, relationVariable
} from '../../../src/engines/relation-engine.mjs';
import { variable } from '../../../src/ontology/api.mjs';
import {
  decisionEvaluatePrimitive, relationClosePrimitive, semanticAbsencePrimitive, semanticQueryPrimitive
} from '../../../src/sdk/index.mjs';
import { query } from '../../../src/store/query.mjs';
import {
  ContinuityAssessment, CoverageNotice, DirectBefore, Finding, Leave, NarrativeInterval, Retrieve, Use,
  actor, actorReferenceKey, assessedUse, assessmentObject, assessmentStatus, assurance, atPlace,
  earlier, eventAnchor, evidence, findingType, intervalEnd, intervalScope, later, message,
  narrativeOrder, object, referenceKey, severity
} from '../ontologies/index.mjs';

const PRECEDES = relation('NarrativePrecedes', 'Event', 'Event');
const leftEvent = relationVariable('left', 'Event');
const middleEvent = relationVariable('middle', 'Event');
const rightEvent = relationVariable('right', 'Event');
const transitivePrecedence = relationRule(
  'narrative-precedence-transitive',
  relationAtom(PRECEDES, leftEvent, rightEvent),
  relationAtom(PRECEDES, leftEvent, middleEvent),
  relationAtom(PRECEDES, middleEvent, rightEvent)
);

const coverageDecision = decisionTable(
  'continuity.coverage-decision',
  columns('coverage'),
  row(values('closed'), result('VIOLATED')),
  row(values('partial'), result('UNKNOWN')),
  row(values('unknown'), result('UNKNOWN')),
  row(values('conflict'), result('CONFLICT'))
);

function roleSort(concept, role) {
  return concept.definition.constraints.find((constraint) => constraint.role === role.definition).role.target.choices[0];
}

const anyEntity = roleSort(Leave, actor);
const anyPlace = roleSort(Leave, atPlace);
const anyValue = roleSort(Leave, narrativeOrder);
const leavePattern = Leave(
  actor(variable(anyEntity, 'leaveActor')), object(variable(anyEntity, 'leaveObject')),
  atPlace(variable(anyPlace, 'leavePlace')), narrativeOrder(variable(anyValue, 'leaveOrder')),
  eventAnchor(variable(anyValue, 'leaveAnchor'))
);
const retrievalPattern = Retrieve(
  actor(variable(anyEntity, 'retrieveActor')), object(variable(anyEntity, 'retrieveObject')),
  atPlace(variable(anyPlace, 'retrievePlace')), narrativeOrder(variable(anyValue, 'retrieveOrder')),
  eventAnchor(variable(anyValue, 'retrieveAnchor'))
);
const beforePattern = DirectBefore(
  earlier(variable(roleSort(DirectBefore, earlier), 'earlierEvent')),
  later(variable(roleSort(DirectBefore, later), 'laterEvent'))
);
const useSelector = match(Use(
  atPlace(variable(anyPlace, 'selectedPlace')),
  narrativeOrder(variable(anyValue, 'selectedOrder')),
  eventAnchor(variable(anyValue, 'selectedAnchor'))
));

function relationFacts(edges) {
  return edges.map((edge) => relationFact(
    PRECEDES,
    relationValue('Event', edge.value(earlier).identity),
    relationValue('Event', edge.value(later).identity)
  ));
}

function precedes(closure, first, second) {
  return closure.has(
    PRECEDES,
    relationValue('Event', first.identity),
    relationValue('Event', second.identity)
  );
}

async function queryTerms(ctx, pattern) {
  const bindings = await ctx.applyPrimitive(semanticQueryPrimitive, query(pattern));
  return bindings.map((binding) => binding.matched.at(-1));
}

async function precedenceClosure(ctx) {
  const edges = await queryTerms(ctx, beforePattern);
  return ctx.applyPrimitive(relationClosePrimitive, relationFacts(edges), [transitivePrecedence]);
}

function anchorsFor(store, ...terms) {
  return terms.filter(Boolean).flatMap((term) => store.evidenceFor(term));
}

function emitAssessment(ctx, useEvent, statusValue, messageValue, objectValue, anchors) {
  const roles = [
    assessedUse(useEvent), assessmentStatus(statusValue), message(messageValue),
    ...anchors.map((anchor) => evidence(anchor))
  ];
  if (objectValue) roles.push(assessmentObject(objectValue));
  ctx.emit(ContinuityAssessment(...roles));
}

function resolveParticipant(ctx, event, directRole, referenceRole) {
  const direct = event.value(directRole);
  if (direct) return Object.freeze({ state: 'resolved', value: direct, anchors: [] });
  const key = event.value(referenceRole);
  const mentionValue = ctx.store.mentions.find((candidate) => candidate.identity === key);
  if (!mentionValue) return Object.freeze({ state: 'unknown', value: null, anchors: [], candidateCount: 0 });
  const candidates = ctx.store.identityCandidates(mentionValue);
  if (candidates.length !== 1) {
    return Object.freeze({
      state: 'unknown', value: null, anchors: [mentionValue.anchor], candidateCount: candidates.length
    });
  }
  return Object.freeze({ state: 'resolved', value: candidates[0].entity, anchors: [mentionValue.anchor] });
}

function intervalForUse(store, useEvent) {
  return store.instancesOf(NarrativeInterval)
    .find((interval) => interval.value(intervalEnd).identity === useEvent.identity);
}

function noticeForInterval(store, interval) {
  return interval && store.instancesOf(CoverageNotice)
    .find((notice) => notice.value(intervalScope).identity === interval.identity);
}

const assessUse = stage(
  'continuity.assess-use',
  async (ctx) => {
    const useEvent = ctx.binding?.matched[0];
    const useAnchors = anchorsFor(ctx.store, useEvent);
    const actorIdentity = resolveParticipant(ctx, useEvent, actor, actorReferenceKey);
    const objectIdentity = resolveParticipant(ctx, useEvent, object, referenceKey);
    if (actorIdentity.state !== 'resolved' || objectIdentity.state !== 'resolved') {
      emitAssessment(
        ctx, useEvent, 'UNKNOWN',
        `Actor/object identity remains unresolved (${actorIdentity.candidateCount ?? 1}/${objectIdentity.candidateCount ?? 1} candidates).`,
        objectIdentity.value, [...useAnchors, ...actorIdentity.anchors, ...objectIdentity.anchors]
      );
      return;
    }

    const actorValue = actorIdentity.value;
    const objectValue = objectIdentity.value;
    const usePlace = useEvent.value(atPlace);
    const [leaves, retrievals, closure] = await Promise.all([
      queryTerms(ctx, leavePattern), queryTerms(ctx, retrievalPattern), precedenceClosure(ctx)
    ]);
    const matchingLeaves = leaves.filter((leave) =>
      leave.value(actor).identity === actorValue.identity && leave.value(object).identity === objectValue.identity);
    const conflictingLeaves = matchingLeaves.filter((leave) =>
      precedes(closure, leave, useEvent) && precedes(closure, useEvent, leave));
    if (conflictingLeaves.length) {
      emitAssessment(ctx, useEvent, 'CONFLICT', 'Temporal support orders the leave both before and after the use.',
        objectValue, [...anchorsFor(ctx.store, conflictingLeaves[0]), ...useAnchors]);
      return;
    }
    const priorLeaves = matchingLeaves.filter((leave) => precedes(closure, leave, useEvent));
    if (!priorLeaves.length) {
      const statusValue = matchingLeaves.length ? 'UNKNOWN' : 'NOT_APPLICABLE';
      emitAssessment(ctx, useEvent, statusValue,
        matchingLeaves.length
          ? 'A matching leave exists, but leave-before-use is not established.'
          : 'No leave by this character for the resolved object is supported.',
        objectValue, useAnchors);
      return;
    }

    const leaveEvent = [...priorLeaves].sort((left, right) =>
      right.value(narrativeOrder) - left.value(narrativeOrder))[0];
    if (leaveEvent.value(atPlace).identity === usePlace.identity) {
      emitAssessment(ctx, useEvent, 'NOT_APPLICABLE', 'The leave and use occur at the same location.', objectValue,
        [...anchorsFor(ctx.store, leaveEvent), ...useAnchors]);
      return;
    }

    const intervening = retrievals.filter((candidate) =>
      candidate.value(actor).identity === actorValue.identity
      && candidate.value(object).identity === objectValue.identity
      && precedes(closure, leaveEvent, candidate)
      && precedes(closure, candidate, useEvent));
    if (intervening.length) {
      emitAssessment(ctx, useEvent, 'SATISFIED', 'A supported retrieval occurs between the leave and use.', objectValue,
        [...anchorsFor(ctx.store, leaveEvent, intervening[0]), ...useAnchors]);
      return;
    }

    const interval = intervalForUse(ctx.store, useEvent);
    const coverageValue = interval ? ctx.store.coverageFor(Retrieve, interval) : 'unknown';
    await ctx.applyPrimitive(semanticAbsencePrimitive, intervening, coverageValue);
    const decision = await ctx.applyPrimitive(decisionEvaluatePrimitive, coverageDecision, [coverageValue]);
    const statusValue = decision.result ?? 'UNKNOWN';
    const notice = noticeForInterval(ctx.store, interval);
    const assessmentAnchors = [
      ...anchorsFor(ctx.store, leaveEvent), ...useAnchors, ...anchorsFor(ctx.store, notice)
    ];
    if (statusValue !== 'VIOLATED') {
      emitAssessment(ctx, useEvent, statusValue,
        statusValue === 'CONFLICT'
          ? 'The retrieval interval has incompatible coverage support.'
          : 'No retrieval is found, but the retrieval interval is not closed.',
        objectValue, assessmentAnchors);
      return;
    }

    emitAssessment(ctx, useEvent, 'VIOLATED',
      'The character uses an object at a different place after leaving it, with closed retrieval coverage and no retrieval.',
      objectValue, assessmentAnchors);
    ctx.emit(Finding(
      findingType('object-used-without-retrieval'),
      message(`The ${objectValue.value('named')} is used after being left elsewhere, with no retrieval in the closed interval.`),
      severity('warning'), ...assessmentAnchors.map((anchor) => evidence(anchor)), assurance('mechanical')
    ));
  },
  reads(
    'SemanticStore', Use, Leave, Retrieve, DirectBefore, NarrativeInterval, CoverageNotice,
    'Mention', 'IdentityCandidate'
  ),
  usesPrimitives(
    semanticQueryPrimitive, relationClosePrimitive, semanticAbsencePrimitive, decisionEvaluatePrimitive
  ),
  writes(ContinuityAssessment, Finding)
);

export const useAssessmentCircuit = circuit(
  'narrative.continuity.use-assessment@1',
  primaryRole('ContinuityAssessment'),
  usesMethod('query-dataflow', 'finite-decision-table', 'relation-engine', 'javascript-macro-node'),
  supports('CONCRETE', 'ABSTRACT', 'SYMBOLIC'), include(coverageDecision, assessUse)
);

export default circuit(
  'narrative.continuity.root@1',
  primaryRole('ContinuityAssessment'),
  usesMethod('query-dataflow'),
  supports('CONCRETE', 'ABSTRACT', 'SYMBOLIC'),
  instantiateEach(useSelector, useAssessmentCircuit)
);

export { PRECEDES, coverageDecision, precedes, relationFacts, transitivePrecedence };
