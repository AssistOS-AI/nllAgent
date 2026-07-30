import { SemanticValue } from '../ontology/model.mjs';

class AgentPart extends SemanticValue {
  constructor(partKind, values) { super('AgentPart', { partKind, values: Object.freeze([...values]) }); }
  get partKind() { return this.detail('partKind'); }
  get values() { return this.detail('values'); }
}

class AgentProject extends SemanticValue {
  constructor(id, parts) {
    const values = (kind) => parts.filter((part) => part.partKind === kind).flatMap((part) => part.values);
    super('AgentProject', {
      id,
      ontology: values('using')[0],
      materializers: Object.freeze(values('materializes')),
      circuits: Object.freeze(values('runs')),
      planningCircuits: Object.freeze(values('plans')),
      tools: new Map(values('tools').map((entry) => [entry.id, entry.operation])),
      models: new Map(values('models').map((entry) => [entry.id, entry.operation])),
      dialects: Object.freeze(values('dialects')),
      description: values('description')[0] || ''
    });
  }
  get id() { return this.detail('id'); }
  get ontology() { return this.detail('ontology'); }
  get materializers() { return this.detail('materializers'); }
  get circuits() { return this.detail('circuits'); }
  get planningCircuits() { return this.detail('planningCircuits'); }
  get tools() { return new Map(this.detail('tools')); }
  get models() { return new Map(this.detail('models')); }
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
const tools = (...values) => new AgentPart('tools', values);
const models = (...values) => new AgentPart('models', values);
const dialects = (...values) => new AgentPart('dialects', values);
const description = (value) => new AgentPart('description', [value]);
const tool = (id, operation) => new NamedOperation('Tool', id, operation);
const model = (id, operation) => new NamedOperation('Model', id, operation);

export {
  AgentPart, AgentProject, NamedOperation, agent, description, dialects, materializes, model, models,
  plans, runs, tool, tools, using
};
