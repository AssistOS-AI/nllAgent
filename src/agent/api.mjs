import { SemanticValue } from '../ontology/model.mjs';
import { NllError } from '../core/errors.mjs';

class AgentPart extends SemanticValue {
  constructor(partKind, values) { super('AgentPart', { partKind, values: Object.freeze([...values]) }); }
  get partKind() { return this.detail('partKind'); }
  get values() { return this.detail('values'); }
}

class AgentProject extends SemanticValue {
  constructor(id, parts) {
    const values = (kind) => parts.filter((part) => part.partKind === kind).flatMap((part) => part.values);
    const ontologies = values('using');
    const builds = values('build');
    if (builds.length > 1) throw new NllError('duplicate-agent-build', `Agent ${id} declares more than one build.`);
    super('AgentProject', {
      id,
      ontologies: Object.freeze(ontologies),
      ontology: ontologies[0],
      materializers: Object.freeze(values('materializes')),
      circuits: Object.freeze(values('runs')),
      planningCircuits: Object.freeze(values('plans')),
      rulePacks: Object.freeze(values('rulePacks')),
      materializationProfiles: Object.freeze(values('materializationProfiles')),
      primitiveRegistries: Object.freeze(values('primitiveRegistries')),
      theorySources: Object.freeze(values('theorySources')),
      tests: Object.freeze(values('tests')),
      benchmarks: Object.freeze(values('benchmarks')),
      build: builds[0] ?? null,
      tools: new Map(values('tools').map((entry) => [entry.id, entry.operation])),
      dialects: Object.freeze(values('dialects')),
      description: values('description')[0] || ''
    });
  }
  get id() { return this.detail('id'); }
  get ontologies() { return this.detail('ontologies'); }
  get ontology() { return this.detail('ontology'); }
  get materializers() { return this.detail('materializers'); }
  get circuits() { return this.detail('circuits'); }
  get planningCircuits() { return this.detail('planningCircuits'); }
  get rulePacks() { return this.detail('rulePacks'); }
  get materializationProfiles() { return this.detail('materializationProfiles'); }
  get primitiveRegistries() { return this.detail('primitiveRegistries'); }
  get theorySources() { return this.detail('theorySources'); }
  get tests() { return this.detail('tests'); }
  get benchmarks() { return this.detail('benchmarks'); }
  get build() { return this.detail('build'); }
  get tools() { return new Map(this.detail('tools')); }
  get dialects() { return this.detail('dialects'); }
  get description() { return this.detail('description'); }
}

class NamedOperation extends SemanticValue {
  constructor(kind, id, operation) { super(kind, { id, operation }); }
  get id() { return this.detail('id'); }
  get operation() { return this.detail('operation'); }
}

const agent = (id, ...parts) => new AgentProject(id, parts);
const using = (...values) => new AgentPart('using', values);
const materializes = (...values) => new AgentPart('materializes', values);
const runs = (...values) => new AgentPart('runs', values);
const plans = (...values) => new AgentPart('plans', values);
const rulePacks = (...values) => new AgentPart('rulePacks', values);
const materializationProfiles = (...values) => new AgentPart('materializationProfiles', values);
const primitiveRegistries = (...values) => new AgentPart('primitiveRegistries', values);
const theorySources = (...values) => new AgentPart('theorySources', values);
const tests = (...values) => new AgentPart('tests', values);
const benchmarks = (...values) => new AgentPart('benchmarks', values);
const build = (value) => new AgentPart('build', [value]);
const tools = (...values) => new AgentPart('tools', values);
const dialects = (...values) => new AgentPart('dialects', values);
const description = (value) => new AgentPart('description', [value]);
const tool = (id, operation) => new NamedOperation('Tool', id, operation);

export {
  AgentPart, AgentProject, NamedOperation, agent, benchmarks, build, description, dialects,
  materializationProfiles, materializes, plans, primitiveRegistries, rulePacks, runs, tests, theorySources,
  tool, tools, using
};
