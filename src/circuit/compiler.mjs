import { deepFreeze, digestJson, normalizeJson } from '../core/canonical.mjs';
import { NllError, invariant } from '../core/errors.mjs';
import {
  observationBindingFields, validateObservationBindingKeys
} from '../runtime/observation-bindings.mjs';
import { validateValueAgainstSchema } from '../runtime/value-schema.mjs';
import { lowerQueryFirstCircuit } from './query-first/compiler.mjs';

const PRIMITIVES = new Set([
  'select', 'filter', 'project', 'join', 'antiJoin', 'group', 'window', 'aggregate',
  'normalize', 'rewrite', 'compare', 'convert', 'align', 'derive', 'fixpoint',
  'maintain', 'retract', 'invalidate', 'guard', 'assert', 'require', 'choose',
  'fork', 'merge', 'fallback', 'search', 'assume', 'expand', 'prune', 'score',
  'backtrack', 'call', 'judge', 'ask', 'invoke', 'verify', 'certify', 'explain', 'emit'
]);
const CORE_PRIMITIVES = new Set([
  'guard', 'assert', 'require', 'choose', 'fork', 'merge', 'fallback', 'ask',
  'certify', 'explain', 'emit'
]);
const CARDINALITIES = new Set(['many', 'one', 'optional', 'at-least-one', 'one-or-more']);
const COVERAGE_POLICIES = new Set(['any', 'open-world', 'closed-world']);
const EPISTEMIC_STATUSES = new Set([
  'given', 'extracted', 'proposed', 'assumed', 'derived', 'certified',
  'refuted', 'human-confirmed', 'unknown'
]);
const GUARANTEE_LEVELS = new Set([
  'review-required', 'model-judgment', 'evidence-certified',
  'human-confirmed', 'mechanically-certified'
]);
const NOMINAL_TYPE_PATTERN = /^[A-Za-z][A-Za-z0-9._-]*@\d+(?:\.\d+){0,2}(?:-[0-9A-Za-z.-]+)?$/u;

function referencedNodes(value, output = new Set()) {
  if (Array.isArray(value)) for (const item of value) referencedNodes(item, output);
  else if (value && typeof value === 'object') {
    if (typeof value.$node === 'string') output.add(value.$node);
    for (const item of Object.values(value)) referencedNodes(item, output);
  }
  return output;
}

function referencedPorts(value, output = new Set()) {
  if (Array.isArray(value)) for (const item of value) referencedPorts(item, output);
  else if (value && typeof value === 'object') {
    if (typeof value.$port === 'string') output.add(value.$port);
    for (const item of Object.values(value)) referencedPorts(item, output);
  }
  return output;
}

function compileCircuit(source, registries) {
  const normalizedSource = normalizeJson(source);
  const queryFirst = normalizedSource.kind === 'CircuitJSQueryFirst'
    ? lowerQueryFirstCircuit(normalizedSource, registries) : null;
  const circuit = queryFirst?.circuit || normalizedSource;
  invariant(queryFirst || circuit.authoringProfile !== 'circuitjs-query-first@1',
    'invalid-circuit', 'Direct CircuitJS cannot claim the query-first authoring profile.');
  invariant(circuit.kind === 'CircuitJS', 'invalid-circuit', 'Circuit kind must be CircuitJS.');
  invariant(typeof circuit.id === 'string' && circuit.id, 'invalid-circuit', 'Circuit requires an id.');
  invariant(typeof circuit.version === 'string' && circuit.version, 'invalid-circuit', 'Circuit requires a version.');
  invariant(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u.test(circuit.version), 'invalid-circuit', 'Circuit version must be semantic versioning compatible.');
  invariant(circuit.inputs && typeof circuit.inputs === 'object', 'invalid-circuit', 'Circuit requires input ports.');
  invariant(Array.isArray(circuit.nodes), 'invalid-circuit', 'Circuit nodes must be an array.');
  invariant(circuit.outputs && typeof circuit.outputs === 'object', 'invalid-circuit', 'Circuit requires output ports.');
  const purpose = circuit.purpose || 'validation';
  invariant(['validation', 'planning'].includes(purpose),
    'invalid-circuit', `Unsupported CircuitJS purpose ${purpose}.`);
  invariant(circuit.generation === undefined, 'invalid-circuit',
    'Validation circuits do not embed CNL constraints; use a purpose planning circuit to produce an instance plan.');
  validateInputPortDefinitions(circuit.inputs);
  validateBudgets(circuit.budgets || {});

  const nodes = new Map();
  for (const node of circuit.nodes) {
    invariant(typeof node.id === 'string' && node.id, 'invalid-circuit', 'Every node requires an id.');
    invariant(!nodes.has(node.id), 'invalid-circuit', `Duplicate node id ${node.id}.`);
    invariant(PRIMITIVES.has(node.primitive), 'invalid-circuit', `Unknown primitive ${node.primitive}.`, { node: node.id });
    if (node.primitive === 'verify') {
      invariant(typeof node.verifier === 'string', 'invalid-circuit', 'verify node requires a verifier.', { node: node.id });
      invariant(registries.verifiers.has(node.verifier), 'unknown-verifier', `Verifier ${node.verifier} is not registered.`, { node: node.id });
      invariant(!node.operator, 'invalid-circuit', 'verify nodes cannot also declare an operator.', { node: node.id });
    } else if (!CORE_PRIMITIVES.has(node.primitive)) {
      invariant(typeof node.operator === 'string', 'invalid-circuit', `${node.primitive} node requires an operator.`, { node: node.id });
      invariant(registries.operators.has(node.operator), 'unknown-operator', `Operator ${node.operator} is not registered.`, { node: node.id });
    } else if (node.operator) {
      invariant(registries.operators.has(node.operator), 'unknown-operator', `Operator ${node.operator} is not registered.`, { node: node.id });
    }
    const implementation = node.operator ? registries.operators.get(node.operator)
      : node.verifier ? registries.verifiers.get(node.verifier) : null;
    if (node.operator && implementation?.primitives) {
      invariant(implementation.primitives.includes(node.primitive), 'invalid-circuit',
        `Operator ${node.operator} is not permitted for primitive ${node.primitive}.`, { node: node.id });
    }
    if (node.effects) {
      invariant(Array.isArray(node.effects), 'invalid-circuit', `Node ${node.id} effects must be an array.`);
      const allowedEffects = new Set(implementation?.effects || []);
      invariant(node.effects.every((effect) => allowedEffects.has(effect)), 'invalid-circuit', `Node ${node.id} declares effects not authorized by its registry entry.`);
    }
    nodes.set(node.id, node);
  }

  const dependants = new Map([...nodes.keys()].map((id) => [id, []]));
  const indegree = new Map([...nodes.keys()].map((id) => [id, 0]));
  for (const node of nodes.values()) {
    for (const dependency of referencedNodes(node.inputs || {})) {
      invariant(nodes.has(dependency), 'invalid-circuit', `Node ${node.id} references missing node ${dependency}.`);
      dependants.get(dependency).push(node.id);
      indegree.set(node.id, indegree.get(node.id) + 1);
    }
    validatePorts(node.inputs || {}, circuit.inputs, node.id);
    validateNodeInputSchema(node, nodes, circuit.inputs, registries);
  }

  const ready = [...nodes.keys()].filter((id) => indegree.get(id) === 0).sort();
  const order = [];
  while (ready.length) {
    const id = ready.shift();
    order.push(id);
    for (const dependant of dependants.get(id).sort()) {
      indegree.set(dependant, indegree.get(dependant) - 1);
      if (indegree.get(dependant) === 0) ready.push(dependant);
    }
    ready.sort();
  }
  invariant(order.length === nodes.size, 'circuit-cycle', 'Circuit contains a dependency cycle. Use an explicit fixpoint or maintain node.');
  for (const dependency of referencedNodes(circuit.outputs)) {
    invariant(nodes.has(dependency), 'invalid-circuit', `Circuit output references missing node ${dependency}.`);
  }
  validatePorts(circuit.outputs, circuit.inputs, 'circuit-output');
  const reachableNodes = new Set();
  const pendingNodes = [...referencedNodes(circuit.outputs)];
  while (pendingNodes.length) {
    const nodeId = pendingNodes.pop();
    if (reachableNodes.has(nodeId)) continue;
    reachableNodes.add(nodeId);
    for (const dependency of referencedNodes(nodes.get(nodeId)?.inputs || {})) pendingNodes.push(dependency);
  }
  invariant(reachableNodes.size === nodes.size, 'invalid-circuit', 'Circuit contains nodes that cannot affect a declared output.', {
    unreachableNodes: [...nodes.keys()].filter((id) => !reachableNodes.has(id))
  });
  const usedPorts = referencedPorts(circuit.outputs);
  for (const nodeId of reachableNodes) {
    for (const port of referencedPorts(nodes.get(nodeId).inputs || {})) usedPorts.add(port);
  }
  invariant(usedPorts.size === Object.keys(circuit.inputs).length, 'invalid-circuit', 'Circuit declares unused input ports.', {
    unusedPorts: Object.keys(circuit.inputs).filter((name) => !usedPorts.has(name))
  });
  for (const [name, output] of Object.entries(circuit.outputs)) {
    if ((name === 'finding' || name === 'findings') && output?.$node) {
      invariant(nodes.get(output.$node)?.primitive === 'emit', 'unverified-emit', `Finding output ${name} must reference an emit node.`);
    }
  }
  if (purpose === 'planning') {
    invariant(circuit.outputs.plan?.$node, 'invalid-circuit', 'Planning circuits require a plan output.');
    invariant(nodes.get(circuit.outputs.plan.$node)?.primitive === 'emit',
      'unverified-emit', 'Planning circuit plan output must reference an emit node.');
  }
  validateVerificationDominance(order.map((id) => nodes.get(id)));

  return deepFreeze({
    circuit,
    order,
    digest: digestJson(circuit),
    observationContract: deriveObservationContract(circuit),
    ...(queryFirst ? {
      author: queryFirst.author,
      authorDigest: queryFirst.authorDigest,
      queryContract: queryFirst.queryContract,
      sourceMap: queryFirst.sourceMap,
      generatedGraphDigest: queryFirst.generatedGraphDigest
    } : {})
  });
}

function validateNodeInputSchema(node, nodes, ports, registries) {
  const implementation = node.operator ? registries.operators.get(node.operator)
    : node.verifier ? registries.verifiers.get(node.verifier) : null;
  if (!implementation?.inputSchema || typeof implementation.inputSchema !== 'object') return;
  validateValueAgainstSchema(node.inputs || {}, implementation.inputSchema, {
    code: 'circuit-schema-mismatch',
    label: `Node ${node.id} input`,
    resolveReference(reference) {
      if (reference.$port) {
        const portDefinition = ports[reference.$port];
        return portDefinition ? {
          type: 'array', items: { type: 'object', properties: {}, additionalProperties: true }
        } : null;
      }
      const dependency = nodes.get(reference.$node);
      const dependencyImplementation = dependency?.operator
        ? registries.operators.get(dependency.operator)
        : dependency?.verifier ? registries.verifiers.get(dependency.verifier) : null;
      return typeof dependencyImplementation?.outputSchema === 'object'
        ? dependencyImplementation.outputSchema : null;
    }
  });
}

function deriveObservationContract(circuit) {
  const nodes = new Map(circuit.nodes.map((node) => [node.id, node]));
  const pending = [...referencedNodes(circuit.outputs)];
  const reachable = new Set();
  const demandedPorts = referencedPorts(circuit.outputs);
  while (pending.length) {
    const nodeId = pending.pop();
    if (reachable.has(nodeId)) continue;
    reachable.add(nodeId);
    const inputs = nodes.get(nodeId)?.inputs || {};
    for (const port of referencedPorts(inputs)) demandedPorts.add(port);
    for (const dependency of referencedNodes(inputs)) pending.push(dependency);
  }
  return {
    kind: 'ObservationContract',
    schemaVersion: 1,
    circuit: `${circuit.id}@${circuit.version}`,
    ports: Object.entries(circuit.inputs).filter(([name]) => demandedPorts.has(name)).map(([name, port]) => ({
      name,
      types: [...(port.types || [port.type])],
      cardinality: port.cardinality || 'many',
      statuses: [...(port.statuses || [])],
      coverage: port.coverage || 'any',
      critical: port.critical !== false,
      scopeRelation: port.scopeRelation || null,
      guarantee: port.guarantee || null,
      fields: observationBindingFields(port),
      where: [...(port.where || [])]
    }))
  };
}

function validatePorts(value, ports, nodeId) {
  if (Array.isArray(value)) return value.forEach((item) => validatePorts(item, ports, nodeId));
  if (!value || typeof value !== 'object') return;
  if (Object.hasOwn(value, '$port') || Object.hasOwn(value, '$node')) {
    if (Object.keys(value).length !== 1 || (Object.hasOwn(value, '$port') && Object.hasOwn(value, '$node'))) {
      throw new NllError('invalid-circuit', `Node ${nodeId} contains a malformed reference object.`);
    }
  }
  if (typeof value.$port === 'string' && !Object.hasOwn(ports, value.$port)) {
    throw new NllError('invalid-circuit', `Node ${nodeId} references missing port ${value.$port}.`);
  }
  for (const item of Object.values(value)) validatePorts(item, ports, nodeId);
}

function validateInputPortDefinitions(ports) {
  for (const [name, port] of Object.entries(ports)) {
    invariant(port && typeof port === 'object' && !Array.isArray(port), 'invalid-circuit', `Input port ${name} must be an object.`);
    validateObservationBindingKeys(port, `Input binding ${name}`);
    const types = port.types || (port.type ? [port.type] : []);
    invariant(Array.isArray(types) && types.length > 0 && types.every((type) => typeof type === 'string' && NOMINAL_TYPE_PATTERN.test(type)), 'invalid-circuit', `Input port ${name} requires versioned nominal types.`);
    invariant(!port.type || !port.types, 'invalid-circuit', `Input port ${name} cannot declare both type and types.`);
    invariant(!port.cardinality || CARDINALITIES.has(port.cardinality), 'invalid-circuit', `Input port ${name} has unsupported cardinality ${port.cardinality}.`);
    invariant(!port.coverage || COVERAGE_POLICIES.has(port.coverage), 'invalid-circuit', `Input port ${name} has unsupported coverage policy ${port.coverage}.`);
    invariant(!port.statuses || (Array.isArray(port.statuses) && port.statuses.every((status) => EPISTEMIC_STATUSES.has(status))), 'invalid-circuit', `Input port ${name} statuses must contain supported epistemic states.`);
    invariant(!port.guarantee || GUARANTEE_LEVELS.has(port.guarantee), 'invalid-circuit', `Input port ${name} has unsupported guarantee ${port.guarantee}.`);
  }
}

function validateBudgets(budgets) {
  for (const [name, value] of Object.entries(budgets)) {
    invariant(Number.isFinite(value) && value >= 0, 'invalid-circuit', `Circuit budget ${name} must be a finite non-negative number.`);
  }
}

function validateVerificationDominance(orderedNodes) {
  const verified = new Map();
  for (const node of orderedNodes) {
    const dependencies = [...referencedNodes(node.inputs || {})];
    if (node.primitive === 'verify') verified.set(node.id, true);
    else verified.set(node.id, dependencies.length > 0 && dependencies.every((id) => verified.get(id) === true));
    if (node.primitive === 'emit' && !verified.get(node.id)) {
      throw new NllError('unverified-emit', `Emit node ${node.id} is not dominated exclusively by verified data.`);
    }
  }
}

export {
  CARDINALITIES,
  CORE_PRIMITIVES,
  COVERAGE_POLICIES,
  EPISTEMIC_STATUSES,
  GUARANTEE_LEVELS,
  NOMINAL_TYPE_PATTERN,
  PRIMITIVES,
  compileCircuit,
  deriveObservationContract,
  referencedNodes,
  referencedPorts,
  validateBudgets,
  validateInputPortDefinitions,
  validateNodeInputSchema
};
