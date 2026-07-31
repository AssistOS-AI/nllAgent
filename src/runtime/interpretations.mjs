import { CONFLICT, FALSE, TRUE, UNKNOWN } from '../circuit/logic.mjs';
import { SemanticValue } from '../ontology/model.mjs';

class InterpretationAggregate extends SemanticValue {
  constructor(classification, results) {
    super('InterpretationAggregate', { classification, results: new Map(results) });
  }
  get classification() { return this.detail('classification'); }
  get results() { return new Map(this.detail('results')); }
}

async function aggregateInterpretations(store, evaluator) {
  const contexts = store.interpretationContexts();
  const selected = contexts.length ? contexts : ['main'];
  const results = new Map();
  for (const context of selected) results.set(context, await evaluator(context, store));
  const values = new Set(results.values());
  let classification;
  if (values.size === 1 && values.has(TRUE)) classification = 'ROBUST_TRUE';
  else if (values.size === 1 && values.has(FALSE)) classification = 'ROBUST_FALSE';
  else if (values.has(CONFLICT) || (values.has(TRUE) && values.has(FALSE))) classification = 'CONFLICTUAL';
  else if (values.has(UNKNOWN)) classification = 'CONDITIONAL';
  else classification = 'CONDITIONAL';
  return new InterpretationAggregate(classification, results);
}

export { InterpretationAggregate, aggregateInterpretations };
