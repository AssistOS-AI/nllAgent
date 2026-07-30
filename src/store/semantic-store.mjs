import { digestSource } from '../core/canonical-source.mjs';
import { NllError } from '../core/errors.mjs';
import { Claim, Coverage, Gap, IdentityCandidate, LongTextProgram, Mention } from '../longtext/model.mjs';
import { Pattern, RoleValue, SemanticValue, Term, Variable, isSubtype } from '../ontology/model.mjs';
import { Binding } from './binding.mjs';
import { SemanticQuery, executeSemanticQuery } from './query.mjs';

class SemanticTransaction {
  #store;
  #producer;
  #terms = [];
  #outputs = [];
  #closed = false;

  constructor(store, producer) {
    this.#store = store;
    this.#producer = producer;
  }
  derive(term) {
    if (!(term instanceof Term)) throw new NllError('invalid-derivation', 'derive accepts only a ground term.');
    this.#terms.push(term);
    return term;
  }
  emit(output) {
    if (!(output instanceof SemanticValue)) throw new NllError('invalid-output', 'emit accepts only an opaque DSL value.');
    this.#outputs.push(output);
    return output;
  }
  commit() {
    if (this.#closed) throw new NllError('transaction-closed', 'Semantic transaction is already closed.');
    this.#closed = true;
    return this.#store.commit(this.#producer, this.#terms, this.#outputs);
  }
  rollback() { this.#closed = true; }
}

class SemanticStore {
  #terms = new Map();
  #claims = new Map();
  #byConcept = new Map();
  #byRole = new Map();
  #coverage = [];
  #gaps = [];
  #outputs = [];
  #mentions = new Map();
  #identityCandidates = new Map();
  #provenance = new Map();
  #snapshots = [];

  publish(program) {
    if (!(program instanceof LongTextProgram)) throw new NllError('invalid-program', 'SemanticStore publishes LongTextJS programs.');
    for (const value of program.values()) this.#publishValue(value, `longtext:${program.identity}`);
    this.#snapshots.push(program.identity);
    return this.snapshot();
  }

  #publishValue(value, producer) {
    if (value instanceof Claim) {
      this.#claims.set(value.identity, value);
      this.#addTerm(value.content, producer);
      this.#provenance.set(value.content.identity, Object.freeze({ producer, claim: value.identity }));
    } else if (value instanceof Term) {
      this.#addTerm(value, producer);
    } else if (value instanceof Coverage) {
      this.#coverage.push(value);
    } else if (value instanceof Gap) {
      this.#gaps.push(value);
    } else if (value instanceof Mention) {
      this.#mentions.set(value.identity, value);
    } else if (value instanceof IdentityCandidate) {
      this.#mentions.set(value.mention.identity, value.mention);
      this.#identityCandidates.set(value.identity, value);
    } else if (value?.values) {
      for (const nested of value.values) this.#publishValue(nested, producer);
    }
  }

  #addTerm(term, producer) {
    if (this.#terms.has(term.identity)) return false;
    this.#terms.set(term.identity, term);
    const conceptSet = this.#byConcept.get(term.concept.id) || new Set();
    conceptSet.add(term.identity);
    this.#byConcept.set(term.concept.id, conceptSet);
    for (const roleValue of term.roleValues) {
      const roleSet = this.#byRole.get(roleValue.role.id) || new Set();
      roleSet.add(term.identity);
      this.#byRole.set(roleValue.role.id, roleSet);
      for (const value of roleValue.values) if (value instanceof Term) this.#addTerm(value, producer);
    }
    this.#provenance.set(term.identity, Object.freeze({ producer }));
    return true;
  }

  instancesOf(conceptOrSort) {
    const definition = conceptOrSort.definition ?? conceptOrSort;
    return Object.freeze([...this.#terms.values()].filter((term) => term.concept === definition
      || isSubtype(term.concept, definition)
      || isSubtype(term.concept.resultSort, definition)));
  }

  match(pattern, initial = new Binding()) {
    if (!(pattern instanceof Pattern) && !(pattern instanceof Term)) {
      throw new NllError('invalid-pattern', 'Store matching requires an ontology pattern or ground term.');
    }
    const candidates = this.instancesOf(pattern.concept);
    const bindings = [];
    for (const candidate of candidates) {
      const binding = unify(pattern, candidate, initial);
      if (binding) bindings.push(binding.withMatch(candidate));
    }
    return Object.freeze(bindings);
  }

  query(queryValue) {
    if (queryValue instanceof SemanticQuery) return executeSemanticQuery(this, queryValue);
    return this.match(queryValue);
  }

  claimsAbout(term) {
    return Object.freeze([...this.#claims.values()].filter((claimValue) => claimValue.content.identity === term.identity));
  }
  evidenceFor(term) {
    return Object.freeze(this.claimsAbout(term).flatMap((claimValue) => claimValue.anchors));
  }
  provenanceOf(term) { return this.#provenance.get(term.identity); }
  identityCandidates(mention) {
    return Object.freeze([...this.#identityCandidates.values()].filter((candidate) => candidate.mention.identity === mention.identity));
  }
  get mentions() { return Object.freeze([...this.#mentions.values()]); }
  coverageFor(concept, scope) {
    const definition = concept.definition ?? concept;
    const found = this.#coverage.filter((item) => item.concept === definition && sameScope(item.scope, scope));
    if (!found.length) return 'unknown';
    if (found.some((item) => item.state === 'conflict')) return 'conflict';
    if (found.some((item) => item.state === 'closed')) return 'closed';
    return 'partial';
  }
  get gaps() { return Object.freeze([...this.#gaps]); }
  get outputs() { return Object.freeze([...this.#outputs]); }
  get terms() { return Object.freeze([...this.#terms.values()]); }
  get claims() { return Object.freeze([...this.#claims.values()]); }
  beginTransaction(producer) { return new SemanticTransaction(this, producer); }
  commit(producer, terms, outputs) {
    const added = [];
    for (const term of terms) if (this.#addTerm(term, producer)) added.push(term);
    for (const output of outputs) {
      if (output instanceof Term) this.#addTerm(output, producer);
      this.#outputs.push(output);
      if (output.identity) this.#provenance.set(output.identity, Object.freeze({ producer }));
    }
    return Object.freeze({ added: Object.freeze(added), outputs: Object.freeze([...outputs]) });
  }
  snapshot() {
    return Object.freeze({
      identity: `snapshot:${digestSource([...this.#terms.keys()].sort())}`,
      termCount: this.#terms.size,
      claimCount: this.#claims.size,
      outputCount: this.#outputs.length
    });
  }
}

function sameScope(left, right) {
  if (left === right) return true;
  if (left?.identity && right?.identity) return left.identity === right.identity;
  if (left?.id && right?.id) return left.id === right.id;
  return false;
}

function unify(pattern, candidate, binding) {
  if (pattern instanceof Variable) {
    if (binding.has(pattern)) return sameValue(binding.get(pattern), candidate) ? binding : null;
    return binding.extend(pattern, candidate);
  }
  if (pattern instanceof Term && !(pattern instanceof Pattern)) return sameValue(pattern, candidate) ? binding : null;
  if (pattern instanceof Pattern) {
    if (!(candidate instanceof Term) || !(candidate.concept === pattern.concept
      || isSubtype(candidate.concept, pattern.concept))) return null;
    let current = binding;
    for (const rolePattern of pattern.roleValues) {
      const candidateValues = candidate.roleValues
        .filter((roleValue) => roleValue.role === rolePattern.role)
        .flatMap((roleValue) => roleValue.values);
      if (!candidateValues.length) return null;
      for (let index = 0; index < rolePattern.values.length; index += 1) {
        current = unifyValue(rolePattern.values[index], candidateValues[index], current);
        if (!current) return null;
      }
    }
    return current;
  }
  return sameValue(pattern, candidate) ? binding : null;
}

function unifyValue(pattern, candidate, binding) {
  if (pattern instanceof Variable || pattern instanceof Pattern || pattern instanceof Term) {
    return unify(pattern, candidate, binding);
  }
  if (pattern instanceof RoleValue) return null;
  return sameValue(pattern, candidate) ? binding : null;
}

function sameValue(left, right) {
  if (left instanceof Term && right instanceof Term) return left.identity === right.identity;
  return Object.is(left, right);
}

export { SemanticStore, SemanticTransaction, sameScope, unify };
