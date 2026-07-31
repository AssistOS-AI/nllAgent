import { SOURCE_FORM, quote } from '../core/canonical-source.mjs';
import { NllError, invariant } from '../core/errors.mjs';
import { SemanticValue } from '../ontology/model.mjs';
import { SemanticDemand } from '../runtime/compatibility.mjs';
import { SdkImport } from '../sdk/model.mjs';

class ContextField extends SemanticValue {
  constructor(name, values) {
    invariant(typeof name === 'string' && name.length > 0, 'invalid-context-field', 'Context field requires a name.');
    super('ContextField', { name, values: Object.freeze([...values]) });
  }
  get name() { return this.detail('name'); }
  get values() { return this.detail('values'); }
  [SOURCE_FORM]() { return `contextField(${quote(this.name)}${sourceTail(this.values)})`; }
}

class ContextRecord extends SemanticValue {
  constructor(recordKind, id, fields) {
    invariant(typeof recordKind === 'string' && recordKind.length > 0,
      'invalid-context-record', 'Context record requires a kind.');
    invariant(typeof id === 'string' && id.length > 0, 'invalid-context-record', 'Context record requires an id.');
    const names = fields.map((field) => field.name);
    invariant(new Set(names).size === names.length, 'duplicate-context-field', `Context record ${id} repeats a field.`);
    super('ContextRecord', { recordKind, id, fields: Object.freeze([...fields]) });
  }
  get recordKind() { return this.detail('recordKind'); }
  get id() { return this.detail('id'); }
  get fields() { return this.detail('fields'); }
  values(name) { return this.fields.find((field) => field.name === name)?.values ?? Object.freeze([]); }
  value(name) { return this.values(name)[0]; }
  [SOURCE_FORM]() {
    return `contextRecord(${quote(this.recordKind)},${quote(this.id)}${sourceTail(this.fields)})`;
  }
}

class ContextResource extends SemanticValue {
  constructor(resourceKind, id, digest) {
    invariant(['theory', 'test', 'benchmark'].includes(resourceKind),
      'invalid-context-resource-kind', `Unsupported context resource kind: ${String(resourceKind)}.`);
    invariant(typeof id === 'string' && id.length > 0 && typeof digest === 'string' && digest.length > 0,
      'invalid-context-resource', 'Context resource requires an id and digest.');
    super('ContextResource', { resourceKind, id, digest });
  }
  get resourceKind() { return this.detail('resourceKind'); }
  get id() { return this.detail('id'); }
  get digest() { return this.detail('digest'); }
  [SOURCE_FORM]() { return `contextResource(${quote(this.resourceKind)},${quote(this.id)},${quote(this.digest)})`; }
}

class AgentBuildIdentity extends SemanticValue {
  constructor(agentId, id, digest) {
    invariant([agentId, id, digest].every((value) => typeof value === 'string' && value.length > 0),
      'invalid-agent-build', 'Agent build requires agent id, build id, and digest.');
    super('AgentBuildIdentity', { agentId, id, digest });
  }
  get agentId() { return this.detail('agentId'); }
  get id() { return this.detail('id'); }
  get digest() { return this.detail('digest'); }
  [SOURCE_FORM]() { return `agentBuild(${quote(this.agentId)},${quote(this.id)},${quote(this.digest)})`; }
}

class AgentAuthoringContext extends SemanticValue {
  constructor(fields) {
    super('AgentAuthoringContext', {
      ...fields,
      ontology: Object.freeze([...fields.ontology]), circuits: Object.freeze([...fields.circuits]),
      sdkImports: Object.freeze([...fields.sdkImports]), commands: Object.freeze([...fields.commands]),
      theorySources: Object.freeze([...fields.theorySources]), providers: Object.freeze([...fields.providers]),
      tests: Object.freeze([...fields.tests]), benchmarks: Object.freeze([...fields.benchmarks])
    });
  }
  get id() { return this.detail('id'); }
  get digest() { return this.detail('digest'); }
  get purpose() { return this.detail('purpose'); }
  get agent() { return this.detail('agent'); }
  get ontology() { return this.detail('ontology'); }
  get ontologies() { return this.ontology; }
  get circuits() { return this.detail('circuits'); }
  get materializationProfile() { return this.detail('materializationProfile'); }
  get semanticDemand() { return this.detail('semanticDemand'); }
  get sdkImports() { return this.detail('sdkImports'); }
  get commands() { return this.detail('commands'); }
  get theorySources() { return this.detail('theorySources'); }
  get methodCatalog() { return this.detail('methodCatalog'); }
  get providers() { return this.detail('providers'); }
  get tests() { return this.detail('tests'); }
  get benchmarks() { return this.detail('benchmarks'); }
  [SOURCE_FORM]() {
    let source = `agentAuthoringContext(${quote(this.id)}).digest(${quote(this.digest)})`
      + `.purpose(${quote(this.purpose)}).agent(${sourceOf(this.agent)})`
      + `.ontology(${this.ontology.map(sourceOf).join(',')})`
      + `.circuits(${this.circuits.map(sourceOf).join(',')})`
      + `.materializationProfile(${sourceOf(this.materializationProfile)})`
      + `.semanticDemand(${sourceOf(this.semanticDemand)})`
      + `.sdkImports(${this.sdkImports.map(sourceOf).join(',')})`
      + `.commands(${this.commands.map(quote).join(',')})`;
    if (this.theorySources.length) source += `.theorySources(${this.theorySources.map(sourceOf).join(',')})`;
    if (this.methodCatalog) source += `.methodCatalog(${sourceOf(this.methodCatalog)})`;
    if (this.providers.length) source += `.providers(${this.providers.map(sourceOf).join(',')})`;
    if (this.tests.length) source += `.tests(${this.tests.map(sourceOf).join(',')})`;
    if (this.benchmarks.length) source += `.benchmarks(${this.benchmarks.map(sourceOf).join(',')})`;
    return `${source}.seal()`;
  }
}

class AgentAuthoringContextBuilder {
  #fields;
  #sealed = false;
  constructor(id) {
    this.#fields = {
      id, digest: null, purpose: null, agent: null, ontology: [], circuits: [],
      materializationProfile: null, semanticDemand: null, sdkImports: [], commands: [],
      theorySources: [], methodCatalog: null, providers: [], tests: [], benchmarks: []
    };
  }
  #set(name, value) { this.#open(); this.#fields[name] = value; return this; }
  #add(name, values) { this.#open(); this.#fields[name].push(...values); return this; }
  #open() { if (this.#sealed) throw new NllError('agent-context-sealed', 'AgentAuthoringContext is sealed.'); }
  digest(value) { return this.#set('digest', value); }
  purpose(value) { return this.#set('purpose', value); }
  agent(value) { return this.#set('agent', value); }
  ontology(...values) { return this.#add('ontology', values); }
  circuits(...values) { return this.#add('circuits', values); }
  materializationProfile(value) { return this.#set('materializationProfile', value); }
  semanticDemand(value) { return this.#set('semanticDemand', value); }
  sdkImports(...values) { return this.#add('sdkImports', values); }
  commands(...values) { return this.#add('commands', values); }
  theorySources(...values) { return this.#add('theorySources', values); }
  methodCatalog(value) { return this.#set('methodCatalog', value); }
  providers(...values) { return this.#add('providers', values); }
  tests(...values) { return this.#add('tests', values); }
  benchmarks(...values) { return this.#add('benchmarks', values); }
  seal() {
    this.#open();
    const value = this.#fields;
    invariant(typeof value.id === 'string' && value.id.length > 0 && typeof value.digest === 'string'
      && value.digest.length > 0, 'incomplete-agent-context', 'Agent context requires id and digest.');
    invariant(['TRAIN', 'ANALYZE', 'REVIEW'].includes(value.purpose),
      'invalid-agent-context-purpose', `Unsupported agent context purpose: ${String(value.purpose)}.`);
    invariant(value.agent instanceof ContextRecord && value.agent.recordKind === 'agent',
      'incomplete-agent-context', 'Agent context requires exactly one agent identity.');
    invariant(value.ontology.length > 0 && value.ontology.every((entry) => entry.recordKind === 'ontology'),
      'incomplete-agent-context', 'Agent context requires at least one ontology signature.');
    invariant(value.circuits.every((entry) => entry.recordKind === 'circuit'),
      'invalid-agent-context-circuit', 'Agent context circuits must be context records.');
    invariant(value.materializationProfile?.recordKind === 'materialization-profile',
      'incomplete-agent-context', 'Agent context requires one materialization profile.');
    invariant(value.semanticDemand instanceof SemanticDemand,
      'incomplete-agent-context', 'Agent context requires SemanticDemand.');
    invariant(value.sdkImports.length > 0 && value.sdkImports.every((entry) => entry instanceof SdkImport),
      'incomplete-agent-context', 'Agent context requires executable SDK imports.');
    invariant(value.commands.length > 0 && value.commands.every((entry) => typeof entry === 'string'),
      'incomplete-agent-context', 'Agent context requires validation commands.');
    const extended = value.purpose === 'TRAIN' || value.purpose === 'REVIEW';
    if (extended) {
      invariant(value.theorySources.length > 0 && value.methodCatalog && value.providers.length > 0
        && value.tests.length > 0 && value.benchmarks.length > 0,
      'incomplete-training-context', 'Training and review contexts require theory, methods, providers, tests, and benchmarks.');
    }
    this.#sealed = true;
    return new AgentAuthoringContext(value);
  }
}

function sourceOf(value) { return value[SOURCE_FORM](); }
function sourceTail(values) { return values.length ? `,${values.map(sourceValue).join(',')}` : ''; }
function sourceValue(value) {
  if (value && typeof value[SOURCE_FORM] === 'function') return value[SOURCE_FORM]();
  if (typeof value === 'string') return quote(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  throw new NllError('invalid-context-value', `Unsupported context value: ${String(value)}.`);
}

const contextField = (name, ...values) => new ContextField(name, values);
const contextRecord = (kind, id, ...fields) => new ContextRecord(kind, id, fields);
const contextResource = (kind, id, digest) => new ContextResource(kind, id, digest);
const agentBuild = (agentId, id, digest) => new AgentBuildIdentity(agentId, id, digest);
const agentAuthoringContext = (id) => new AgentAuthoringContextBuilder(id);

export {
  AgentAuthoringContext, AgentAuthoringContextBuilder, AgentBuildIdentity, ContextField, ContextRecord,
  ContextResource, agentAuthoringContext, agentBuild, contextField, contextRecord, contextResource
};
