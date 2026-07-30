import { FALSE, TRUE, UNKNOWN } from '../circuit/logic.mjs';
import { NllError } from '../core/errors.mjs';
import { Pattern, SemanticValue, Term } from '../ontology/model.mjs';

class SemanticQuery extends SemanticValue {
  constructor(pattern, clauses = []) { super('SemanticQuery', { pattern, clauses: Object.freeze([...clauses]) }); }
  get pattern() { return this.detail('pattern'); }
  get clauses() { return this.detail('clauses'); }
  where(predicate) { return new SemanticQuery(this.pattern, [...this.clauses, Object.freeze({ kind: 'where', predicate })]); }
  within(scope) { return new SemanticQuery(this.pattern, [...this.clauses, Object.freeze({ kind: 'scope', scope })]); }
  under(policy) { return new SemanticQuery(this.pattern, [...this.clauses, Object.freeze({ kind: 'evidence', policy })]); }
  orderedBy(order) { return new SemanticQuery(this.pattern, [...this.clauses, Object.freeze({ kind: 'order', order })]); }
}

function executeSemanticQuery(store, queryValue) {
  if (!(queryValue instanceof SemanticQuery)) throw new NllError('invalid-query', 'Expected a SemanticQuery.');
  let bindings = [...store.match(queryValue.pattern)];
  for (const clause of queryValue.clauses) {
    if (clause.kind === 'where') bindings = bindings.filter((binding) => clause.predicate(binding, store));
    else if (clause.kind === 'evidence') {
      bindings = bindings.filter((binding) => binding.matched.every((term) => {
        const claims = store.claimsAbout(term);
        return claims.some((claim) => clause.policy.accepts(claim.status.name));
      }));
    } else if (clause.kind === 'order') bindings.sort((left, right) => clause.order(left, store) - clause.order(right, store));
  }
  return Object.freeze(bindings);
}

class EvidencePolicy extends SemanticValue {
  constructor(statuses) { super('EvidencePolicy', { statuses: new Set(statuses) }); }
  accepts(status) { return this.detail('statuses').has(status); }
}

const query = (pattern) => new SemanticQuery(pattern);
const evidencePolicy = (...statuses) => new EvidencePolicy(statuses);
const verifiedOrExplicit = () => evidencePolicy('verified', 'explicit');
const sourceOrder = () => (binding, store) => {
  const term = binding.matched.at(-1);
  return store.evidenceFor(term)[0]?.start ?? Number.MAX_SAFE_INTEGER;
};
const exists = (bindings) => bindings.length ? TRUE : FALSE;
const absence = (bindings, coverageState) => bindings.length ? FALSE : coverageState === 'closed' ? TRUE : UNKNOWN;

export { EvidencePolicy, SemanticQuery, absence, evidencePolicy, executeSemanticQuery, exists, query, sourceOrder, verifiedOrExplicit };
