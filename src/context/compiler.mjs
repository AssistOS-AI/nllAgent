import { AgentProject } from '../agent/api.mjs';
import { DEFAULT_METHOD_CATALOG } from '../architecture/default-methods.mjs';
import { MaterializationProfile } from '../architecture/materialization.mjs';
import { MethodCatalog } from '../architecture/methods.mjs';
import { canonicalSource, digestSource } from '../core/canonical-source.mjs';
import { NllError, invariant } from '../core/errors.mjs';
import { CircuitTemplate } from '../circuit/model.mjs';
import { Ontology } from '../ontology/api.mjs';
import { deriveSemanticDemand } from '../runtime/compatibility.mjs';
import { DEFAULT_SDK_CATALOG } from '../sdk/default-primitives.mjs';
import { SdkCatalog } from '../sdk/model.mjs';
import {
  AgentBuildIdentity, ContextResource, agentAuthoringContext, agentBuild, contextField, contextRecord
} from './model.mjs';

function compileAgentAuthoringContext(project, options = {}) {
  invariant(project instanceof AgentProject, 'invalid-agent-project', 'Context compilation requires one AgentProject.');
  const purpose = normalizePurpose(options.purpose ?? 'ANALYZE');
  const build = normalizeBuild(project, options.build ?? project.build);
  const ontologies = options.ontologies ?? project.ontologies;
  invariant(ontologies.length > 0 && ontologies.every((value) => value instanceof Ontology),
    'agent-context-ontology', `Agent ${project.id} must expose sealed Ontology values.`);
  const circuits = collectCircuits(options.circuits ?? [...project.circuits, ...project.planningCircuits]);
  const profile = chooseProfile(options.materializationProfile, project.materializationProfiles);
  const sdk = options.sdk ?? DEFAULT_SDK_CATALOG;
  invariant(sdk instanceof SdkCatalog, 'invalid-sdk-catalog', 'Agent context requires an SdkCatalog.');
  const methodCatalog = options.methodCatalog ?? sdk.methodCatalog ?? DEFAULT_METHOD_CATALOG;
  invariant(methodCatalog instanceof MethodCatalog, 'invalid-method-catalog', 'Agent context requires a MethodCatalog.');
  const theorySources = normalizeResources(options.theorySources ?? project.theorySources, 'theory');
  const tests = normalizeResources(options.tests ?? project.tests, 'test');
  const benchmarks = normalizeResources(options.benchmarks ?? project.benchmarks, 'benchmark');
  const ontologyRecords = ontologies.map(summarizeOntology).sort(byId);
  const circuitRecords = circuits.map(summarizeCircuit).sort(byId);
  const profileRecord = summarizeProfile(profile);
  const demand = deriveSemanticDemand(circuits);
  validateContextInputs(ontologies, circuits, profile, demand, methodCatalog);
  const methodRecord = summarizeMethodCatalog(methodCatalog);
  const providers = summarizeProviders(project, sdk).sort(byId);
  const commands = Object.freeze([...(options.commands ?? ['node --test'])]);
  const agentRecord = contextRecord('agent', project.id,
    contextField('build', build), contextField('description', project.description || ''),
    contextField('rulePacks', ...project.rulePacks.map((value) => value.id).sort()));
  const id = options.id ?? `${project.id}.${purpose.toLowerCase()}.context@1`;
  const digest = digestSource([
    purpose, agentRecord, ...ontologyRecords, ...circuitRecords, profileRecord, demand,
    ...sdk.imports, ...theorySources, methodRecord, ...providers, ...tests, ...benchmarks, ...commands
  ]);
  return agentAuthoringContext(id).digest(digest).purpose(purpose).agent(agentRecord)
    .ontology(...ontologyRecords).circuits(...circuitRecords).materializationProfile(profileRecord)
    .semanticDemand(demand).sdkImports(...sdk.imports).commands(...commands)
    .theorySources(...theorySources).methodCatalog(methodRecord).providers(...providers)
    .tests(...tests).benchmarks(...benchmarks).seal();
}

function normalizeBuild(project, value) {
  if (value instanceof AgentBuildIdentity) {
    invariant(value.agentId === project.id, 'agent-build-mismatch',
      `Build ${value.id} belongs to ${value.agentId}, not ${project.id}.`);
    return value;
  }
  invariant(value && typeof value.id === 'string', 'missing-agent-build',
    `Agent ${project.id} must pin one build identity before context compilation.`);
  return agentBuild(project.id, value.id, value.digest ?? digestSource(value));
}

function chooseProfile(explicit, profiles) {
  if (explicit) {
    invariant(explicit instanceof MaterializationProfile,
      'invalid-materialization-profile', 'Selected materialization profile is invalid.');
    return explicit;
  }
  invariant(profiles.length === 1, 'ambiguous-materialization-profile',
    `Agent context requires exactly one materialization profile; received ${profiles.length}.`);
  return profiles[0];
}

function normalizeResources(values, kind) {
  const resources = [...values];
  invariant(resources.every((value) => value instanceof ContextResource && value.resourceKind === kind),
    'invalid-context-resource', `${kind} resources must be typed ContextResource identities.`);
  const ids = resources.map((value) => value.id);
  invariant(new Set(ids).size === ids.length, 'duplicate-context-resource', `Duplicate ${kind} resource identity.`);
  return Object.freeze(resources.sort(byId));
}

function collectCircuits(roots) {
  const byIdentity = new Map();
  function visit(value) {
    invariant(value instanceof CircuitTemplate, 'invalid-circuit', 'Agent context accepts CircuitTemplate values.');
    if (byIdentity.has(value.identity)) return;
    byIdentity.set(value.identity, value);
    for (const nested of value.subcircuits) visit(nested);
    for (const instantiation of value.instantiations) visit(instantiation.template);
  }
  roots.forEach(visit);
  return Object.freeze([...byIdentity.values()].sort((left, right) => left.id.localeCompare(right.id)));
}

function summarizeOntology(ontology) {
  const view = ontology.inspect();
  const sorts = [...view.sorts].sort(byId).map((sort) => contextRecord('sort', sort.id,
    contextField('parents', ...sort.parents.map((parent) => parent.id).sort())));
  const roles = [...view.roles].sort(byId).map((role) => contextRecord('role', role.id,
    contextField('source', ...role.source.choices.map((choice) => choice.id).sort()),
    contextField('target', ...role.target.choices.map((choice) => choice.id).sort()),
    contextField('minimum', role.cardinality.minimum),
    contextField('maximum', role.cardinality.maximum === Infinity ? '*' : role.cardinality.maximum)));
  const concepts = [...view.concepts].sort(byId).map((concept) => {
    const constraints = concept.constraints.map((constraint) => contextRecord(
      'concept-role', constraint.role.id,
      contextField('minimum', constraint.minimum),
      contextField('maximum', constraint.maximum === Infinity ? '*' : constraint.maximum)
    )).sort(byId);
    return contextRecord('concept', concept.id,
      contextField('sort', concept.resultSort.id), contextField('derived', concept.derived),
      contextField('identity', concept.identityPolicy),
      contextField('roles', ...concept.constraints.map((constraint) => constraint.role.id).sort()),
      contextField('constraints', ...constraints),
      contextField('lexicalizations', ...ontology.lexicalizations(concept).sort()));
  });
  return contextRecord('ontology', ontology.id, contextField('sorts', ...sorts), contextField('roles', ...roles),
    contextField('concepts', ...concepts),
    contextField('behaviors', ...[...view.behaviors.keys()].sort()),
    contextField('subtypes', ...view.subtypes.map(([child, parent]) => `${child.id}<:${parent.id}`).sort()),
    contextField('disjoint', ...view.disjoint.map(([left, right]) => [left.id, right.id].sort().join('!')).sort()));
}

function summarizeCircuit(circuit) {
  const required = circuit.required.map((value) => value.id ?? String(value)).sort();
  const provided = circuit.provided.map((value) => value.id ?? String(value)).sort();
  const rules = circuit.rules.map((rule) => rule.id).sort();
  const stages = circuit.stages.map((stage) => stage.id).sort();
  const effects = circuit.stages.flatMap((stage) => stage.contracts.flatMap((contract) =>
    contract.values.map((value) => `${contract.contractKind}:${semanticId(value)}`))).sort();
  return contextRecord('circuit', circuit.id,
    contextField('identity', circuit.identity), contextField('primaryRole', semanticId(circuit.primaryRole)),
    contextField('required', ...required), contextField('provided', ...provided),
    contextField('methods', ...circuit.methods.map(semanticId).sort()),
    contextField('interpreters', ...circuit.supportedInterpreters.map(semanticId).sort()),
    contextField('rules', ...rules), contextField('stages', ...stages),
    contextField('decisionTables', ...((circuit.decisionTables ?? []).map((value) => value.id).sort())),
    contextField('subcircuits', ...circuit.subcircuits.map((value) => value.id).sort()),
    contextField('effects', ...effects));
}

function summarizeProfile(profile) {
  const observations = profile.observations.map((value) => contextRecord('observation', value.concept.id,
    contextField('roles', ...value.roles.map((role) => role.id).sort()))).sort(byId);
  const coverage = profile.coverageRequirements.map((value) => contextRecord(
    'coverage', `${value.concept.id}@${value.scope.id}`,
    contextField('mode', value.mode.id), contextField('concept', value.concept.id),
    contextField('scope', value.scope.id)
  )).sort(byId);
  return contextRecord('materialization-profile', profile.id,
    contextField('observations', ...observations),
    contextField('resolutions', ...profile.resolutions.map((value) => value.id).sort()),
    contextField('coverage', ...coverage),
    contextField('grounding', ...profile.groundingRequirements.map((value) => value.id).sort()),
    contextField('alternatives', ...profile.alternatives.map((value) => value.id).sort()));
}

function summarizeMethodCatalog(catalog) {
  const methods = catalog.descriptors.map((method) => contextRecord('method', method.id,
    contextField('problemShapes', ...method.problemShapes.map((value) => value.id).sort()),
    contextField('requirements', ...method.requirements.map((value) => value.id).sort()),
    contextField('outputs', ...method.outputs.map((value) => value.id).sort()),
    contextField('interpreters', ...method.interpreters.map((value) => value.id).sort()),
    contextField('engine', method.engineId ?? ''), contextField('diagnostics', ...method.diagnosticCodes)
  )).sort(byId);
  return contextRecord('method-catalog', catalog.id, contextField('methods', ...methods));
}

function summarizeProviders(project, sdk) {
  const primitive = sdk.primitiveRegistry.providers().map((provider) => contextRecord('provider', provider.id,
    contextField('providerKind', 'primitive'), contextField('method', provider.methodId),
    contextField('primitive', provider.descriptor.id), contextField('module', provider.modulePath),
    contextField('export', provider.exportName),
    contextField('modes', ...['concrete', 'abstract', 'symbolic', 'proof']
      .filter((mode) => provider.descriptor.supports(mode)))));
  const circuit = project.rulePacks.flatMap((pack) => pack.providerPins.map((pin) => {
    const provider = pin.selected;
    return contextRecord('provider', provider.id,
      contextField('providerKind', 'circuit'), contextField('component', provider.component.id),
      contextField('capabilities', ...provider.capabilities.map((value) => value.id).sort()),
      contextField('guarantees', ...provider.guarantees.map((value) => value.id).sort()));
  }));
  const byProvider = new Map([...primitive, ...circuit].map((value) => [value.id, value]));
  return [...byProvider.values()];
}

function semanticId(value) {
  if (value === null || value === undefined) return '';
  return value?.definition?.id ?? value?.id ?? value?.name ?? value?.kind ?? String(value);
}
function validateContextInputs(ontologies, circuits, profile, demand, methodCatalog) {
  const concepts = new Set(ontologies.flatMap((ontology) => [...ontology.concepts.keys()]));
  const roles = new Set(ontologies.flatMap((ontology) => [...ontology.roles.keys()]));
  const requiredConcepts = new Set([
    ...demand.concepts, ...profile.observations.map((value) => value.concept.id),
    ...profile.coverageRequirements.map((value) => value.concept.id)
  ]);
  const requiredRoles = new Set([
    ...demand.roles, ...profile.observations.flatMap((value) => value.roles.map((role) => role.id))
  ]);
  const missingConcepts = [...requiredConcepts].filter((id) => !concepts.has(id)).sort();
  const missingRoles = [...requiredRoles].filter((id) => !roles.has(id)).sort();
  if (missingConcepts.length || missingRoles.length) {
    throw new NllError('agent-context-ontology-gap',
      `Selected agent omits demanded ontology identities: ${[...missingConcepts, ...missingRoles].join(', ')}.`);
  }
  const knownMethods = new Set(methodCatalog.descriptors.map((value) => value.id));
  const unknownMethods = circuits.flatMap((circuit) => circuit.methods.map(semanticId))
    .filter((id) => id && !knownMethods.has(id));
  if (unknownMethods.length) {
    throw new NllError('agent-context-method-gap',
      `Selected MethodCatalog omits circuit methods: ${[...new Set(unknownMethods)].sort().join(', ')}.`);
  }
}
function normalizePurpose(value) {
  const normalized = String(value).toUpperCase();
  if (normalized === 'TRAINING') return 'TRAIN';
  if (normalized === 'ANALYSIS' || normalized === 'TASK') return 'ANALYZE';
  if (normalized === 'PROMOTION') return 'ANALYZE';
  return normalized;
}
function byId(left, right) { return left.id.localeCompare(right.id); }

export { collectCircuits, compileAgentAuthoringContext, summarizeCircuit, summarizeOntology, summarizeProfile };
