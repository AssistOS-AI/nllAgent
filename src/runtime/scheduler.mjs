import { FALSE, TRUE, UNKNOWN } from '../circuit/logic.mjs';
import { MatchClause, NotExistsClause, WhereClause, instantiate } from '../circuit/model.mjs';
import { Binding } from '../store/binding.mjs';
import { ExecutionContext } from './execution-context.mjs';
import { ExecutionTrace } from './trace.mjs';

async function executeRule(rule, store, trace) {
  trace.record('CREATED', `rule:${rule.id}`);
  let bindings = [new Binding()];
  let ruleState = TRUE;
  for (const clause of rule.clauses) {
    if (clause instanceof MatchClause) {
      const next = [];
      for (const binding of bindings) {
        for (let matchBinding of store.match(clause.pattern, binding)) {
          if (clause.alias) matchBinding = matchBinding.extend({ name: clause.alias }, matchBinding.matched.at(-1));
          next.push(matchBinding);
        }
      }
      bindings = next;
      if (!bindings.length) return Object.freeze({ rule, state: FALSE, outputs: Object.freeze([]) });
    } else if (clause instanceof WhereClause) {
      bindings = bindings.filter((binding) => clause.predicate(binding, store));
      if (!bindings.length) return Object.freeze({ rule, state: FALSE, outputs: Object.freeze([]) });
    } else if (clause instanceof NotExistsClause) {
      const next = [];
      for (const binding of bindings) {
        const matches = store.match(clause.match.pattern, binding);
        if (matches.length) continue;
        const coverage = store.coverageFor(clause.coverage.concept, clause.scope);
        if (coverage === 'closed') next.push(binding);
        else ruleState = UNKNOWN;
      }
      bindings = next;
      if (!bindings.length) return Object.freeze({ rule, state: ruleState, outputs: Object.freeze([]) });
    }
  }
  const outputs = [];
  for (const binding of bindings) {
    const transaction = store.beginTransaction(`rule:${rule.id}`);
    try {
      for (const action of rule.actions) {
        const produced = typeof action.producer === 'function'
          ? await action.producer(binding, store)
          : instantiate(action.producer, binding);
        if (action.actionKind === 'derive') transaction.derive(produced);
        else transaction.emit(produced);
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
  return Object.freeze({ rule, state: ruleState, outputs: Object.freeze(outputs) });
}

async function executeStage(stage, store, trace, options, execute) {
  trace.record('CREATED', `stage:${stage.id}`);
  const transaction = store.beginTransaction(`stage:${stage.id}`);
  const context = new ExecutionContext({
    store,
    trace,
    transaction,
    tools: options.tools,
    models: options.models,
    runtime: execute
  });
  try {
    trace.record('RUNNING', `stage:${stage.id}`);
    await stage.operation(context);
    trace.record('PRODUCED', `stage:${stage.id}`);
    const committed = transaction.commit();
    trace.record('COMMITTED', `stage:${stage.id}`);
    return committed;
  } catch (error) {
    transaction.rollback();
    trace.record('FAILED', `stage:${stage.id}`, error.message);
    throw error;
  }
}

async function executeCircuit(template, store, options = {}) {
  const trace = options.trace || new ExecutionTrace(template.id);
  const execute = async (child, childStore) => executeCircuit(child, childStore, { ...options, trace });
  trace.record('CREATED', `circuit:${template.id}`);
  const ruleResults = [];
  for (const rule of template.rules) ruleResults.push(await executeRule(rule, store, trace));
  for (const stage of template.stages) await executeStage(stage, store, trace, options, execute);
  for (const child of template.subcircuits) await execute(child, store);
  trace.record('COMMITTED', `circuit:${template.id}`);
  return Object.freeze({ template, store, trace, ruleResults: Object.freeze(ruleResults), outputs: store.outputs });
}

export { executeCircuit, executeRule, executeStage };
