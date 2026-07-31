import { CONFLICT, FALSE, TRUE, UNKNOWN, logicalAnd, logicalOr } from '../circuit/logic.mjs';
import { EffectDescriptor, MatchClause, NotExistsClause, WhereClause, instantiate } from '../circuit/model.mjs';
import { NllError } from '../core/errors.mjs';
import { PrimitiveDescriptor } from '../primitives/model.mjs';
import { Binding } from '../store/binding.mjs';
import { ExecutionContext } from './execution-context.mjs';
import { ExecutionTrace } from './trace.mjs';
import {
  CACHED, COMMITTED, ContentCache, ExecutionGraph, PRODUCED, READY, RUNNING, VALIDATED
} from './execution-graph.mjs';

async function executeRule(rule, store, trace) {
  trace.record('CREATED', `rule:${rule.id}`);
  let paths = [{ binding: new Binding(), state: TRUE }];
  const terminalStates = [];
  for (const clause of rule.clauses) {
    if (clause instanceof MatchClause) {
      const next = [];
      for (const path of paths) {
        const matches = store.match(clause.pattern, path.binding);
        if (!matches.length) terminalStates.push(logicalAnd(path.state, FALSE));
        for (let matchBinding of matches) {
          if (clause.alias) matchBinding = matchBinding.extend({ name: clause.alias }, matchBinding.matched.at(-1));
          next.push({ binding: matchBinding, state: path.state });
        }
      }
      paths = next;
      trace.record('MATCHED', `rule:${rule.id}`, `${clause.pattern.concept.id}:${paths.length}`);
    } else if (clause instanceof WhereClause) {
      const next = [];
      for (const path of paths) {
        const observed = clause.predicate(path.binding, store);
        const value = observed === true ? TRUE : observed === false ? FALSE : observed;
        if (![TRUE, FALSE, UNKNOWN, CONFLICT].includes(value)) {
          throw new NllError('invalid-rule-predicate', `Where clause ${clause.label} returned an invalid truth value.`);
        }
        const state = logicalAnd(path.state, value);
        trace.record('EVALUATED', `rule:${rule.id}:${clause.label}`, value.name);
        if (state === FALSE) terminalStates.push(FALSE);
        else next.push({ binding: path.binding, state });
      }
      paths = next;
    } else if (clause instanceof NotExistsClause) {
      const next = [];
      for (const path of paths) {
        const matches = store.match(clause.match.pattern, path.binding);
        if (matches.length) { terminalStates.push(FALSE); continue; }
        const coverage = store.coverageFor(clause.coverage.concept, clause.scope);
        const absence = coverage === 'closed' ? TRUE : coverage === 'conflict' ? CONFLICT : UNKNOWN;
        trace.record('EVALUATED', `rule:${rule.id}:not-exists`, `${clause.coverage.concept.id}:${coverage}`);
        const state = logicalAnd(path.state, absence);
        if (state === FALSE) terminalStates.push(FALSE);
        else next.push({ binding: path.binding, state });
      }
      paths = next;
    }
    if (!paths.length) break;
  }
  const outputs = [];
  for (const { binding, state } of paths) {
    if (state !== TRUE) continue;
    const transaction = store.beginTransaction(`rule:${rule.id}`);
    try {
      for (const action of rule.actions) {
        const produced = typeof action.producer === 'function'
          ? await action.producer(binding, store)
          : instantiate(action.producer, binding);
        if (action.actionKind === 'derive') transaction.derive(produced);
        else transaction.emit(produced);
        trace.record(action.actionKind === 'derive' ? 'DERIVED' : 'EMITTED',
          `rule:${rule.id}`, produced.identity ?? produced.kind);
      }
      const committed = transaction.commit();
      outputs.push(...committed.outputs);
      trace.record('COMMITTED', `rule:${rule.id}`, `${committed.added.length + committed.outputs.length} value(s)`);
    } catch (error) {
      transaction.rollback();
      trace.record('FAILED', `rule:${rule.id}`, error.message);
      throw error;
    }
  }
  const states = [...terminalStates, ...paths.map((path) => path.state)];
  const ruleState = states.reduce(logicalOr, FALSE);
  return Object.freeze({ rule, state: ruleState, outputs: Object.freeze(outputs) });
}

function contractTarget(value) {
  return value?.definition?.id ?? value?.id ?? value?.concept?.id ?? value?.kind ?? String(value);
}

function allowedEffects(stage) {
  const allowed = new Set();
  for (const contract of stage.contracts) {
    if (contract instanceof EffectDescriptor) {
      allowed.add(`${contract.effectKind}:${contract.target}`);
      continue;
    }
    if (contract.contractKind === 'reads') {
      for (const value of contract.values) allowed.add(`read:${contractTarget(value)}`);
    } else if (contract.contractKind === 'writes') {
      for (const value of contract.values) allowed.add(`write:${contractTarget(value)}`);
    } else if (contract.contractKind === 'effects') {
      for (const value of contract.values) {
        if (value instanceof EffectDescriptor) allowed.add(`${value.effectKind}:${value.target}`);
      }
    } else if (contract.contractKind === 'primitives') {
      for (const descriptor of contract.values) {
        if (!(descriptor instanceof PrimitiveDescriptor)) {
          throw new NllError('invalid-primitive-descriptor', `Stage ${stage.id} declares an invalid primitive.`);
        }
        allowed.add(`primitive:${descriptor.id}`);
        for (const effect of descriptor.effects) {
          allowed.add(`${effect.effectKind}:${contractTarget(effect.target)}`);
        }
      }
    }
  }
  return allowed;
}

function validateEffects(stage, context) {
  const allowed = allowedEffects(stage);
  const undeclared = [...context.observedEffects].filter((effect) => !allowed.has(effect));
  if (undeclared.length) {
    throw new NllError('effect-drift', `Stage ${stage.id} used undeclared effects: ${undeclared.join(', ')}.`);
  }
}

async function executeStage(stage, store, trace, options, execute) {
  trace.record('CREATED', `stage:${stage.id}`);
  const bindingId = options.binding?.identity || 'ground';
  const node = options.graph?.node(options.template, stage, bindingId, options.contextId || 'main');
  if (node && node.state === COMMITTED) return Object.freeze({ added: [], outputs: [] });
  node?.transition(READY);
  const cacheable = stage.contracts.some((contract) => contract.contractKind === 'property' && contract.values.includes('pure'));
  const cacheKey = cacheable ? options.cache.key(stage, store.snapshot(), bindingId) : null;
  if (cacheKey && options.cache.has(cacheKey)) {
    const cached = options.cache.get(cacheKey);
    const committed = store.commit(`cache:${stage.id}`, cached.terms, cached.outputs);
    node?.transition(CACHED);
    node?.bind('result', committed);
    trace.record('CACHED', `stage:${stage.id}`);
    return committed;
  }
  const transaction = store.beginTransaction(`stage:${stage.id}`);
  const context = new ExecutionContext({
    store,
    trace,
    transaction,
    tools: options.tools,
    runtime: execute,
    binding: options.binding
  });
  try {
    trace.record('RUNNING', `stage:${stage.id}`);
    node?.transition(RUNNING);
    await stage.operation(context);
    validateEffects(stage, context);
    trace.record('PRODUCED', `stage:${stage.id}`);
    node?.transition(PRODUCED);
    const delta = transaction.delta();
    node?.transition(VALIDATED);
    const committed = transaction.commit();
    if (cacheKey) options.cache.put(cacheKey, delta);
    node?.bind('result', committed);
    node?.transition(COMMITTED);
    trace.record('COMMITTED', `stage:${stage.id}`);
    return committed;
  } catch (error) {
    transaction.rollback();
    node?.fail(error);
    trace.record('FAILED', `stage:${stage.id}`, error.message);
    throw error;
  }
}

async function executeCircuit(template, store, options = {}) {
  const trace = options.trace || new ExecutionTrace(template.id);
  const graph = options.graph || new ExecutionGraph();
  const cache = options.cache || new ContentCache();
  const runtimeOptions = { ...options, trace, graph, cache, template };
  graph.instantiate(template, options.binding?.identity || 'ground', options.contextId || 'main');
  const execute = async (child, childStore) => executeCircuit(child, childStore, { ...runtimeOptions, trace });
  trace.record('CREATED', `circuit:${template.id}`);
  const ruleResults = [];
  for (const component of scheduledComponents(template)) {
    if (template.rules.includes(component)) ruleResults.push(await executeRule(component, store, trace));
    else if (template.stages.includes(component)) await executeStage(component, store, trace, runtimeOptions, execute);
    else await execute(component, store);
  }
  for (const request of template.instantiations) {
    const bindings = selectorBindings(request.selector, store);
    for (const binding of bindings) {
      const instance = `${request.template.identity}:${binding.identity}`;
      trace.record('INSTANTIATED', `circuit:${request.template.id}`, instance);
      await executeCircuit(request.template, store, { ...runtimeOptions, trace, binding });
    }
  }
  trace.record('COMMITTED', `circuit:${template.id}`);
  return Object.freeze({ template, store, trace, graph, cache, ruleResults: Object.freeze(ruleResults), outputs: store.outputs });
}

function selectorBindings(selector, store) {
  if (selector instanceof MatchClause) return store.match(selector.pattern);
  if (selector?.pattern) return store.query(selector);
  if (typeof selector === 'function') return selector(store);
  if (selector && Symbol.iterator in Object(selector)) return [...selector];
  throw new NllError('invalid-instantiation-selector', 'instantiateEach requires a query, match, iterable, or selector function.');
}

function componentId(component) { return component.id; }

function scheduledComponents(template) {
  const components = [...template.rules, ...template.stages, ...template.subcircuits];
  if (!template.schedules.length) return components;
  const byId = new Map(components.map((component) => [componentId(component), component]));
  const incoming = new Map(components.map((component) => [componentId(component), new Set()]));
  for (const schedulePart of template.schedules) collectScheduleEdges(schedulePart, incoming, byId);
  const ordered = [];
  const pending = new Set(components.map(componentId));
  while (pending.size) {
    const ready = [...pending].filter((id) => [...incoming.get(id)].every((dependency) => !pending.has(dependency))).sort();
    if (!ready.length) throw new NllError('unclassified-schedule-cycle', `Circuit ${template.id} contains a schedule cycle.`);
    for (const id of ready) { ordered.push(byId.get(id)); pending.delete(id); }
  }
  return ordered;
}

function collectScheduleEdges(part, incoming, byId) {
  for (const value of part.values) {
    if (value?.values && value.constructor?.name === 'SchedulePart') { collectScheduleEdges(value, incoming, byId); continue; }
    if (!Array.isArray(value) || value.length < 2) continue;
    for (let index = 1; index < value.length; index += 1) {
      const dependency = componentId(value[index - 1]);
      const dependent = componentId(value[index]);
      if (!byId.has(dependency) || !byId.has(dependent)) {
        throw new NllError('unknown-schedule-component', `Schedule references ${dependency} or ${dependent} outside the circuit.`);
      }
      incoming.get(dependent).add(dependency);
    }
  }
}

export { executeCircuit, executeRule, executeStage, scheduledComponents, selectorBindings };
