import { NllError } from '../core/errors.mjs';
import { verifiedGuarantee } from './guarantees.mjs';

function shortestPath({ edges = [], source, target, directed = true }) {
  const normalized = directed ? edges : edges.flatMap((edge) => [edge, { ...edge, from: edge.to, to: edge.from }]);
  const vertices = [...new Set(normalized.flatMap((edge) => [edge.from, edge.to]).concat([source, target]))];
  const distance = new Map(vertices.map((vertex) => [vertex, Number.POSITIVE_INFINITY]));
  const previous = new Map();
  distance.set(source, 0);
  for (let pass = 0; pass < vertices.length - 1; pass += 1) {
    let changed = false;
    for (const edge of normalized) {
      if (!Number.isFinite(edge.weight)) throw new NllError('invalid-graph', 'Every graph edge requires a finite numeric weight.');
      const candidate = distance.get(edge.from) + edge.weight;
      if (candidate < distance.get(edge.to)) {
        distance.set(edge.to, candidate);
        previous.set(edge.to, edge.from);
        changed = true;
      }
    }
    if (!changed) break;
  }
  for (const edge of normalized) {
    if (distance.get(edge.from) + edge.weight < distance.get(edge.to)) {
      throw new NllError('negative-cycle', 'The graph contains a reachable negative cycle.');
    }
  }
  if (!Number.isFinite(distance.get(target))) return { kind: 'PathCandidate', status: 'unreachable', source, target, path: [], cost: null };
  const path = [target];
  while (path[0] !== source) {
    const parent = previous.get(path[0]);
    if (parent === undefined) throw new NllError('invalid-path-state', 'Path reconstruction failed.');
    path.unshift(parent);
  }
  return { kind: 'PathCandidate', status: 'found', source, target, path, cost: distance.get(target), witness: { edges: normalized } };
}

function verifyShortestPath({ candidates, candidate, edges, directed = true }) {
  const values = candidates || (candidate ? [candidate] : []);
  const normalized = directed ? edges : edges.flatMap((edge) => [edge, { ...edge, from: edge.to, to: edge.from }]);
  return values.map((value) => {
    let cost = 0;
    let valid = value.status === 'found' && value.path[0] === value.source && value.path.at(-1) === value.target;
    for (let index = 0; valid && index < value.path.length - 1; index += 1) {
      const matches = normalized.filter((edge) => edge.from === value.path[index] && edge.to === value.path[index + 1]);
      if (!matches.length) valid = false;
      else cost += Math.min(...matches.map((edge) => edge.weight));
    }
    const optimum = shortestPath({ edges, source: value.source, target: value.target, directed });
    valid = valid && cost === value.cost && optimum.cost === value.cost;
    return {
      ...value,
      verifierResult: { status: valid ? 'accept' : 'reject', verifier: 'graph.shortest-path@1', checkedProperties: ['edge-membership', 'path-cost', 'optimality'], diagnostics: [] },
      guarantee: valid ? verifiedGuarantee(value) : 'rejected',
      certificate: valid ? { kind: 'ShortestPathCertificate', path: value.path, cost } : null
    };
  });
}

const UNIT_TABLE = {
  m: { dimension: 'length', scale: 1, offset: 0 }, cm: { dimension: 'length', scale: 0.01, offset: 0 },
  mm: { dimension: 'length', scale: 0.001, offset: 0 }, km: { dimension: 'length', scale: 1000, offset: 0 },
  Pa: { dimension: 'pressure', scale: 1, offset: 0 }, kPa: { dimension: 'pressure', scale: 1000, offset: 0 },
  bar: { dimension: 'pressure', scale: 100000, offset: 0 }, g: { dimension: 'mass', scale: 0.001, offset: 0 },
  kg: { dimension: 'mass', scale: 1, offset: 0 }, mg: { dimension: 'mass', scale: 0.000001, offset: 0 },
  K: { dimension: 'temperature', scale: 1, offset: 0 }, C: { dimension: 'temperature', scale: 1, offset: 273.15 }
};

function convertQuantity({ value, from, to }) {
  const source = UNIT_TABLE[from];
  const target = UNIT_TABLE[to];
  if (!source || !target || source.dimension !== target.dimension) throw new NllError('incompatible-units', `Cannot convert ${from} to ${to}.`);
  const canonical = Number(value) * source.scale + source.offset;
  return { value: (canonical - target.offset) / target.scale, unit: to, dimension: source.dimension, witness: { input: { value, unit: from }, canonical } };
}

function verifiedRecord(value, accepted, verifier, checkedProperties, diagnostics = []) {
  return {
    ...value,
    verifierResult: { status: accepted ? 'accept' : 'reject', verifier, checkedProperties, diagnostics },
    guarantee: accepted ? verifiedGuarantee(value) : 'rejected',
    certificate: accepted ? { kind: 'DeterministicReasoningCertificate', verifier, checkedProperties } : null
  };
}

function verifyQuantity({ candidates = [], candidate }) {
  const values = candidates.length ? candidates : candidate ? [candidate] : [];
  return values.map((value) => {
    try {
      const recomputed = convertQuantity({
        value: value.witness?.input?.value,
        from: value.witness?.input?.unit,
        to: value.unit
      });
      const accepted = recomputed.value === value.value && recomputed.dimension === value.dimension;
      return verifiedRecord(value, accepted, 'units.convert@1', ['dimension', 'canonical-value', 'target-value']);
    } catch (error) {
      return verifiedRecord(value, false, 'units.convert@1', ['dimension', 'canonical-value', 'target-value'], [error.message]);
    }
  });
}

function intervalConflicts({ records = [], keys = ['subject', 'property'] }) {
  const conflicts = [];
  for (let leftIndex = 0; leftIndex < records.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < records.length; rightIndex += 1) {
      const left = records[leftIndex];
      const right = records[rightIndex];
      if (!keys.every((key) => left[key] === right[key])) continue;
      if (left.scope !== undefined && right.scope !== undefined && left.scope !== right.scope) continue;
      const disjoint = Number(left.max) < Number(right.min) || Number(right.max) < Number(left.min);
      if (disjoint) conflicts.push({ kind: 'ConflictCandidate', left, right, witness: { keys, relation: 'disjoint-intervals' } });
    }
  }
  return conflicts;
}

function verifyIntervalConflicts({ candidates = [] }) {
  return candidates.map((value) => {
    const keys = value.witness?.keys || [];
    const aligned = keys.every((key) => value.left?.[key] === value.right?.[key]);
    const sameScope = value.left?.scope === undefined || value.right?.scope === undefined
      || value.left.scope === value.right.scope;
    const disjoint = Number(value.left?.max) < Number(value.right?.min)
      || Number(value.right?.max) < Number(value.left?.min);
    return verifiedRecord(value, aligned && sameScope && disjoint, 'constraints.interval-conflicts@1', ['key-alignment', 'scope-alignment', 'interval-disjointness']);
  });
}

function deadlineEvaluation({ cases = [], policy }) {
  const durationMs = Number(policy.durationMs);
  if (!Number.isFinite(durationMs) || durationMs < 0) throw new NllError('invalid-temporal-policy', 'durationMs must be a non-negative number.');
  return cases.map((item) => {
    const trigger = Date.parse(item.triggerAt);
    let deadline = trigger + durationMs;
    const outages = [...(item.outages || [])].sort((a, b) => Date.parse(a.from) - Date.parse(b.from));
    if (policy.outageMode === 'restart-after-recovery' && outages.length) deadline = Date.parse(outages.at(-1).to) + durationMs;
    if (policy.outageMode === 'pause') {
      for (const outage of outages) {
        const start = Math.max(trigger, Date.parse(outage.from));
        const end = Math.min(deadline, Date.parse(outage.to));
        if (end > start) deadline += end - start;
      }
    }
    const action = item.actionAt ? Date.parse(item.actionAt) : null;
    const verdict = action === null
      ? item.coverage === 'closed-world' ? 'non-compliant' : 'undetermined'
      : action <= deadline ? 'compliant' : 'non-compliant';
    return { ...item, kind: 'TemporalCandidate', verdict, deadline: new Date(deadline).toISOString(), witness: { trigger, durationMs, outages, action, deadline, policy } };
  });
}

function verifyDeadlines({ candidates = [] }) {
  return candidates.map((value) => {
    try {
      const { kind: _kind, verdict: _verdict, deadline: _deadline, witness: _witness, ...sourceCase } = value;
      const recomputed = deadlineEvaluation({ cases: [sourceCase], policy: value.witness?.policy })[0];
      const accepted = recomputed.verdict === value.verdict && recomputed.deadline === value.deadline;
      return verifiedRecord(value, accepted, 'temporal.deadline@1', ['trigger', 'duration', 'outage-policy', 'action-time', 'coverage-world']);
    } catch (error) {
      return verifiedRecord(value, false, 'temporal.deadline@1', ['trigger', 'duration', 'outage-policy', 'action-time', 'coverage-world'], [error.message]);
    }
  });
}

function timeline({ initial = [], events = [] }) {
  const state = new Map(initial.map((item) => [`${item.subject}\u0000${item.property}`, item.value]));
  const history = [];
  for (const event of [...events].sort((a, b) => Number(a.order ?? Date.parse(a.time)) - Number(b.order ?? Date.parse(b.time)))) {
    for (const effect of event.effects || []) {
      const key = `${effect.subject || event.subject}\u0000${effect.property}`;
      const previous = state.get(key);
      if (effect.retract) state.delete(key);
      else state.set(key, effect.value);
      history.push({
        event: event.id, subject: effect.subject || event.subject, property: effect.property,
        previous: previous ?? null, value: effect.retract ? null : effect.value
      });
    }
  }
  return { state: [...state.entries()].map(([key, value]) => { const [subject, property] = key.split('\u0000'); return { subject, property, value }; }), history };
}

function verifyTimeline({ candidates = [], initial = [], events = [] }) {
  const expected = timeline({ initial, events });
  return candidates.map((value) => verifiedRecord(
    value,
    JSON.stringify(value.state) === JSON.stringify(expected.state)
      && JSON.stringify(value.history) === JSON.stringify(expected.history),
    'state.timeline@1',
    ['event-order', 'effects', 'retractions', 'final-state']
  ));
}

function registerReasoningOperators(registry) {
  registry.register({ id: 'graph.shortest-path@1', description: 'Bellman-Ford shortest path with negative-cycle detection.', execute: shortestPath });
  registry.register({ id: 'units.convert@1', description: 'Convert supported typed quantities through canonical SI units.', execute: convertQuantity });
  registry.register({ id: 'constraints.interval-conflicts@1', description: 'Find disjoint constraints in aligned scopes.', execute: intervalConflicts });
  registry.register({ id: 'temporal.deadline@1', description: 'Evaluate exact elapsed-time deadlines and outage policies.', execute: deadlineEvaluation });
  registry.register({ id: 'state.timeline@1', description: 'Apply ordered explicit effects with inertia and retraction.', execute: timeline });
  return registry;
}

function registerReasoningVerifiers(registry) {
  registry.register({ id: 'graph.shortest-path@1', description: 'Verify graph path membership, cost, and optimality.', execute: verifyShortestPath });
  registry.register({ id: 'units.convert@1', description: 'Recompute a typed unit conversion.', execute: verifyQuantity });
  registry.register({ id: 'constraints.interval-conflicts@1', description: 'Verify aligned disjoint numeric intervals.', execute: verifyIntervalConflicts });
  registry.register({ id: 'temporal.deadline@1', description: 'Recompute a deadline, exception policy, and verdict.', execute: verifyDeadlines });
  registry.register({ id: 'state.timeline@1', description: 'Replay ordered effects and compare the final state.', execute: verifyTimeline });
  return registry;
}

export {
  UNIT_TABLE, convertQuantity, deadlineEvaluation, intervalConflicts, registerReasoningOperators,
  registerReasoningVerifiers, shortestPath, timeline, verifiedRecord, verifyDeadlines,
  verifyIntervalConflicts, verifyQuantity, verifyShortestPath, verifyTimeline
};
