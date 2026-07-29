import { performance } from 'node:perf_hooks';
import { digestJson } from '../core/canonical.mjs';
import { NllError } from '../core/errors.mjs';
import { guaranteeCeilingFromValue, guaranteeMeet } from './guarantees.mjs';
import { matchesObservationBinding } from './observation-bindings.mjs';

function resolveValue(value, ports, results) {
  if (Array.isArray(value)) return value.map((item) => resolveValue(item, ports, results));
  if (!value || typeof value !== 'object') return value;
  if (typeof value.$port === 'string') return ports[value.$port];
  if (typeof value.$node === 'string') return results.get(value.$node);
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveValue(item, ports, results)]));
}

function bindPorts(program, circuit) {
  const ports = {};
  for (const [name, definition] of Object.entries(circuit.inputs)) {
    const records = program.observations.filter((observation) =>
      matchesObservationBinding(observation, definition));
    const cardinality = definition.cardinality || 'many';
    if ((cardinality === 'one' && records.length !== 1)
      || (cardinality === 'optional' && records.length > 1)
      || (['at-least-one', 'one-or-more'].includes(cardinality) && records.length === 0)) {
      throw new NllError('port-cardinality-failed', `Input port ${name} does not satisfy cardinality ${cardinality}.`, {
        port: name, cardinality, actual: records.length
      });
    }
    ports[name] = records;
  }
  return ports;
}

async function executeCircuit(compiled, program, registries, options = {}) {
  const started = performance.now();
  const maximumNodes = options.maximumNodes ?? compiled.circuit.budgets?.nodes ?? 10_000;
  const wallTimeMs = options.wallTimeMs ?? compiled.circuit.budgets?.wallTimeMs ?? 60_000;
  if (compiled.order.length > maximumNodes) throw new NllError('budget-exhausted', 'Circuit node budget exceeded.');
  const ports = bindPorts(program, compiled.circuit);
  const programDigest = digestJson(program);
  const nodes = new Map(compiled.circuit.nodes.map((node) => [node.id, node]));
  const results = new Map();
  const trace = [];
  for (const nodeId of compiled.order) {
    if (performance.now() - started > wallTimeMs) throw new NllError('budget-exhausted', 'Circuit wall-time budget exceeded.', { wallTimeMs });
    const node = nodes.get(nodeId);
    const inputs = resolveValue(node.inputs || {}, ports, results);
    const inputDigest = digestJson(inputs);
    let inputCeiling = guaranteeCeilingFromValue(inputs);
    if (node.primitive === 'judge') inputCeiling = guaranteeMeet(inputCeiling, 'model-judgment');
    const nodeStarted = performance.now();
    let output;
    const implementation = node.operator
      ? registries.operators.get(node.operator)
      : node.verifier ? registries.verifiers.get(node.verifier) : null;
    const cacheMaterial = {
      kind: 'CircuitNodeCacheKey', circuit: compiled.digest, node: node.id,
      implementation: implementation ? {
        id: node.operator || node.verifier,
        digest: implementation.implementationDigest || null
      } : `core.${node.primitive}@1`,
      programDigest, operationalContextDigest: digestJson(options.operationalContext || null), inputDigest
    };
    const cached = implementation?.deterministic !== false && options.cache
      ? await options.cache.get(cacheMaterial) : null;
    if (cached !== null) {
      output = cached;
    } else if (node.primitive === 'verify') {
      output = await registries.verifiers.get(node.verifier).execute(inputs, { program, circuit: compiled.circuit, node, options });
    } else if (node.primitive === 'emit') {
      output = emitVerified(inputs, compiled.circuit, program);
    } else if (['explain', 'certify', 'guard', 'assert', 'require', 'choose', 'fork', 'merge', 'fallback', 'ask'].includes(node.primitive) && !node.operator) {
      output = defaultControl(node, inputs);
    } else {
      if (!node.operator) throw new NllError('missing-operator', `Node ${node.id} requires a registered operator.`, { primitive: node.primitive });
      output = await registries.operators.get(node.operator).execute(inputs, { program, circuit: compiled.circuit, node, options });
    }
    if (inputCeiling) output = applyGuaranteeCeiling(output, inputCeiling);
    if (cached === null && implementation?.deterministic !== false && options.cache) {
      await options.cache.set(cacheMaterial, output);
    }
    results.set(node.id, output);
    trace.push({
      node: node.id, primitive: node.primitive,
      ...(node.operator ? { operator: node.operator } : {}),
      ...(node.verifier ? { verifier: node.verifier } : {}),
      ...(node.logical ? { logical: node.logical } : {}),
      inputDigest, outputDigest: digestJson(output), cacheHit: cached !== null,
      durationMs: Math.round((performance.now() - nodeStarted) * 1000) / 1000
    });
  }
  const outputs = Object.fromEntries(Object.entries(compiled.circuit.outputs || {}).map(([name, value]) => [name, resolveValue(value, ports, results)]));
  return {
    circuit: compiled.circuit.id, outputs,
    nodeOutputs: Object.fromEntries(results.entries()), trace,
    durationMs: Math.round((performance.now() - started) * 1000) / 1000
  };
}

function emitVerified(inputs, circuit, program) {
  if ((circuit.purpose || 'validation') !== 'planning') return emitFindings(inputs, circuit, program);
  const records = inputs.verified || inputs.records || inputs.candidates || Object.values(inputs).find(Array.isArray) || [];
  return records.filter((record) => record.verifierResult?.status === 'accept').map((record) => ({
    ...record,
    circuit: `${circuit.id}@${circuit.version}`,
    sourceDigest: program.source.revision
  }));
}

function applyGuaranteeCeiling(value, ceiling) {
  if (Array.isArray(value)) return value.map((item) => applyGuaranteeCeiling(item, ceiling));
  if (value && typeof value === 'object') {
    const nested = Object.fromEntries(Object.entries(value).map(([key, item]) => [key, applyGuaranteeCeiling(item, ceiling)]));
    const carriesGuarantee = String(value.kind || '').endsWith('Candidate')
      || value.guarantee === 'candidate' || Boolean(value.guaranteeCeiling)
      || value.verifierResult?.status === 'accept';
    if (!carriesGuarantee) return nested;
    const guaranteeCeiling = guaranteeMeet(value.guaranteeCeiling, ceiling) || ceiling;
    const guarantee = value.verifierResult?.status === 'accept' && value.guarantee
      ? guaranteeMeet(value.guarantee, guaranteeCeiling) : value.guarantee;
    return { ...nested, guaranteeCeiling, ...(guarantee ? { guarantee } : {}) };
  }
  return value;
}

function defaultControl(node, inputs) {
  const values = Object.values(inputs);
  if (node.primitive === 'ask') {
    return { kind: 'NeedObservation', critical: true, ...inputs, requestedBy: node.id };
  }
  if (node.primitive === 'require' || node.primitive === 'assert' || node.primitive === 'guard') {
    if (!inputs.condition) {
      if (node.primitive === 'guard') return [];
      throw new NllError('circuit-assertion-failed', node.message || `Node ${node.id} condition failed.`);
    }
    return inputs.value ?? inputs.records ?? inputs.condition;
  }
  if (node.primitive === 'choose') return inputs.condition ? inputs.whenTrue : inputs.whenFalse;
  if (node.primitive === 'fallback') return values.find((value) => value !== undefined && value !== null && (!Array.isArray(value) || value.length));
  if (node.primitive === 'merge') return values.flatMap((value) => Array.isArray(value) ? value : [value]);
  return inputs.records ?? inputs.candidates ?? inputs.value ?? values[0] ?? inputs;
}

function emitFindings(inputs, circuit, program) {
  const records = inputs.verified || inputs.records || inputs.candidates || Object.values(inputs).find(Array.isArray) || [];
  return records.filter((record) => record.verifierResult?.status === 'accept').map((record) => {
    const stable = {
      circuit: `${circuit.id}@${circuit.version}`, rule: record.rule,
      source: program.source.revision, anchor: record.mainAnchor.range, verdict: record.verdict
    };
    return {
      ...record, kind: 'Finding', schemaVersion: 1, id: `finding:${digestJson(stable).slice(7, 31)}`,
      circuit: `${circuit.id}@${circuit.version}`, sourceDigest: program.source.revision,
      premises: record.premises || [], derivationPath: record.derivationPath || [],
      reviewState: 'unreviewed'
    };
  });
}

export { applyGuaranteeCeiling, bindPorts, emitVerified, executeCircuit, resolveValue };
