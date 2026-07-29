import { verifiedGuarantee } from './guarantees.mjs';

function eventOrder(observation, program) {
  if (Number.isFinite(observation.payload?.order)) return observation.payload.order;
  return program.anchors[observation.anchors?.[0]]?.range?.start ?? Number.MAX_SAFE_INTEGER;
}

function continuityCandidates({ events = [], rules = [] }, context) {
  const findings = [];
  const sorted = [...events].sort((left, right) =>
    eventOrder(left, context.program) - eventOrder(right, context.program));
  for (const rule of rules) {
    const byObject = new Map();
    for (const event of sorted) {
      const objectId = event.payload?.objectId;
      if (!objectId) continue;
      if (!byObject.has(objectId)) byObject.set(objectId, []);
      byObject.get(objectId).push(event);
    }
    for (const [objectId, objectEvents] of byObject) {
      let inaccessible = null;
      for (const event of objectEvents) {
        const action = event.payload?.action;
        if (action === 'leave') inaccessible = event;
        else if (['retrieve', 'transfer', 'replace'].includes(action)) inaccessible = null;
        else if (action === 'use' && inaccessible) {
          const mainAnchor = context.program.anchors[event.anchors?.[0]];
          const leaveAnchor = context.program.anchors[inaccessible.anchors?.[0]];
          if (!mainAnchor || !leaveAnchor) continue;
          findings.push({
            kind: 'FindingCandidate',
            rule: rule.id,
            verdict: rule.verdict || 'continuity-gap',
            severity: rule.severity || 'warning',
            guarantee: 'candidate',
            guaranteeCeiling: objectEvents.some((item) => item.status === 'proposed')
              ? 'evidence-certified' : 'mechanically-certified',
            subject: objectId,
            scope: event.scope,
            mainAnchor,
            supportAnchors: [leaveAnchor.id, mainAnchor.id],
            premises: [inaccessible.id, event.id],
            witness: {
              kind: 'ObjectContinuityGap',
              objectId,
              leaveEvent: inaccessible.id,
              useEvent: event.id,
              requiresClosedWorld: Boolean(rule.requiresClosedWorld),
              interveningEvents: objectEvents
                .filter((item) => eventOrder(item, context.program) > eventOrder(inaccessible, context.program)
                  && eventOrder(item, context.program) < eventOrder(event, context.program))
                .map((item) => item.id)
            },
            explanation: rule.explanation
              || `The object ${objectId} is used after being left elsewhere without a materialized recovery or transfer.`,
            remediation: rule.remediation || 'Add or clarify the missing recovery, transfer, or replacement event.',
            limitations: rule.limitations || ['The conclusion depends on event extraction and identity linking.'],
            sourceRuleReferences: rule.sourceRuleReferences || []
          });
        }
      }
    }
  }
  return findings;
}

function continuityVerifier({ candidates = [] }, context) {
  const observations = new Map(context.program.observations.map((item) => [item.id, item]));
  return candidates.map((candidate) => {
    const witness = candidate.witness || {};
    const leave = observations.get(witness.leaveEvent);
    const use = observations.get(witness.useEvent);
    const sameObject = leave?.payload?.objectId === witness.objectId
      && use?.payload?.objectId === witness.objectId;
    const ordered = leave && use
      && eventOrder(leave, context.program) < eventOrder(use, context.program);
    const actualIntervening = context.program.observations.filter((event) =>
      event.type === 'narrative.object-event@1'
      && event.payload?.objectId === witness.objectId
      && (!candidate.scope || event.scope === candidate.scope)
      && leave && use
      && eventOrder(event, context.program) > eventOrder(leave, context.program)
      && eventOrder(event, context.program) < eventOrder(use, context.program));
    const declaredIds = [...new Set(witness.interveningEvents || [])].sort();
    const actualIds = actualIntervening.map((event) => event.id).sort();
    const completeWitness = JSON.stringify(declaredIds) === JSON.stringify(actualIds);
    const transitionAbsent = !actualIntervening.some((event) =>
      ['retrieve', 'transfer', 'replace'].includes(event.payload?.action));
    const closedCoverage = !witness.requiresClosedWorld || context.program.coverage.some((coverage) =>
      coverage.source === context.program.source.id
      && coverage.revision === context.program.source.revision
      && coverage.scope === candidate.scope
      && coverage.mode === 'closed-world'
      && coverage.verified === true
      && coverage.types?.includes('narrative.object-event@1'));
    const accepted = Boolean(
      sameObject
      && ordered
      && leave.payload?.action === 'leave'
      && use.payload?.action === 'use'
      && completeWitness
      && transitionAbsent
      && closedCoverage
    );
    return {
      ...candidate,
      guarantee: accepted ? verifiedGuarantee(candidate) : 'rejected',
      verifierResult: {
        status: accepted ? 'accept' : 'reject',
        verifier: 'narrative.object-continuity@1',
        checkedProperties: [
          'stable-object-identity', 'event-order', 'complete-intervening-event-set',
          'transition-gap', 'coverage-source-revision', 'required-coverage'
        ],
        diagnostics: accepted ? [] : ['Object continuity witness is inconsistent with materialized events.']
      },
      certificate: accepted ? {
        kind: 'ObjectContinuityCertificate',
        sourceDigest: context.program.source.revision,
        witness
      } : null
    };
  });
}

function registerNarrativeOperators(registry) {
  registry.register({
    id: 'narrative.object-continuity@1',
    primitives: ['maintain', 'call'],
    description: 'Detect use after leave without a materialized recovery transition.',
    execute: continuityCandidates
  });
  return registry;
}

function registerNarrativeVerifiers(registry) {
  registry.register({
    id: 'narrative.object-continuity@1',
    description: 'Replay an object event sequence and verify a continuity gap.',
    execute: continuityVerifier
  });
  return registry;
}

export {
  continuityCandidates,
  continuityVerifier,
  eventOrder,
  registerNarrativeOperators,
  registerNarrativeVerifiers
};
