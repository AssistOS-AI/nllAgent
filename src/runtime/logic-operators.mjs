import { NllError } from '../core/errors.mjs';
import { verifiedGuarantee } from './guarantees.mjs';

function unify(pattern, value, bindings) {
  if (typeof pattern === 'string' && pattern.startsWith('?')) {
    if (bindings.has(pattern)) return bindings.get(pattern) === value;
    bindings.set(pattern, value);
    return true;
  }
  return pattern === value;
}

function matchFact(pattern, fact, initial = new Map()) {
  if (pattern.predicate !== fact.predicate || pattern.args.length !== fact.args.length) return null;
  const bindings = new Map(initial);
  return pattern.args.every((value, index) => unify(value, fact.args[index], bindings)) ? bindings : null;
}

function instantiate(template, bindings) {
  return { predicate: template.predicate, args: template.args.map((value) => typeof value === 'string' && value.startsWith('?') ? bindings.get(value) : value) };
}

function factKey(fact) { return `${fact.predicate}:${JSON.stringify(fact.args)}`; }

function fixedPoint({ facts = [], rules = [], maxIterations = 100 }) {
  const known = new Map(facts.map((fact) => [factKey(fact), { ...fact, support: fact.support || [] }]));
  const derivations = [];
  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    let changed = false;
    for (const rule of rules) {
      let bindingsSet = [new Map()];
      for (const premise of rule.when || []) {
        const next = [];
        for (const bindings of bindingsSet) {
          for (const fact of known.values()) {
            const matched = matchFact(premise, fact, bindings);
            if (matched) next.push(matched);
          }
        }
        bindingsSet = next;
      }
      for (const bindings of bindingsSet) {
        const conclusion = instantiate(rule.then, bindings);
        const key = factKey(conclusion);
        if (!known.has(key)) {
          const fact = { ...conclusion, status: 'derived', support: (rule.when || []).map((item) => instantiate(item, bindings)), rule: rule.id };
          known.set(key, fact);
          derivations.push(fact);
          changed = true;
        }
      }
    }
    if (!changed) return {
      facts: [...known.values()], derivations, iterations: iteration + 1, reachedFixedPoint: true,
      witness: { inputFacts: facts, rules, maxIterations }
    };
  }
  throw new NllError('budget-exhausted', 'Fixpoint iteration budget was exhausted.', { maxIterations });
}

function verifyFixedPoint({ candidates = [], candidate }) {
  const values = candidates.length ? candidates : candidate ? [candidate] : [];
  return values.map((value) => {
    const witness = value.witness || {};
    const recomputed = fixedPoint({ facts: witness.inputFacts || [], rules: witness.rules || [], maxIterations: witness.maxIterations });
    const expectedKeys = new Set(recomputed.facts.map(factKey));
    const actualKeys = new Set((value.facts || []).map(factKey));
    const accepted = expectedKeys.size === actualKeys.size && [...expectedKeys].every((key) => actualKeys.has(key));
    return {
      ...value,
      verifierResult: { status: accepted ? 'accept' : 'reject', verifier: 'logic.fixpoint@1', checkedProperties: ['closure', 'rule-instantiation'], diagnostics: [] },
      guarantee: accepted ? verifiedGuarantee(value) : 'rejected',
      certificate: accepted ? { kind: 'FixedPointCertificate', factKeys: [...expectedKeys].sort() } : null
    };
  });
}

function groundedArguments({ arguments: values = [], attacks = [] }) {
  const ids = new Set(values.map((argument) => argument.id));
  const attackers = new Map([...ids].map((id) => [id, []]));
  for (const attack of attacks) {
    if (!ids.has(attack.from) || !ids.has(attack.to)) throw new NllError('invalid-argument-graph', 'Attack references an unknown argument.', attack);
    attackers.get(attack.to).push(attack.from);
  }
  let accepted = new Set();
  while (true) {
    const next = new Set();
    for (const id of ids) {
      const defended = attackers.get(id).every((attacker) => attacks.some((attack) => attack.to === attacker && accepted.has(attack.from)));
      if (defended) next.add(id);
    }
    if (next.size === accepted.size && [...next].every((id) => accepted.has(id))) break;
    accepted = next;
  }
  return {
    accepted: [...accepted].sort(),
    rejected: [...ids].filter((id) => !accepted.has(id)).sort(),
    witness: { semantics: 'grounded', attacks }
  };
}

function verifyGroundedArguments({ candidates = [], candidate }) {
  const values = candidates.length ? candidates : candidate ? [candidate] : [];
  return values.map((value) => {
    const ids = [...new Set([...(value.accepted || []), ...(value.rejected || [])])];
    const recomputed = groundedArguments({ arguments: ids.map((id) => ({ id })), attacks: value.witness?.attacks || [] });
    const accepted = JSON.stringify(recomputed.accepted) === JSON.stringify(value.accepted)
      && JSON.stringify(recomputed.rejected) === JSON.stringify(value.rejected);
    return {
      ...value,
      verifierResult: { status: accepted ? 'accept' : 'reject', verifier: 'argumentation.grounded@1', checkedProperties: ['attack-graph', 'grounded-extension'], diagnostics: [] },
      guarantee: accepted ? verifiedGuarantee(value) : 'rejected',
      certificate: accepted ? { kind: 'GroundedArgumentCertificate', accepted: value.accepted, attacks: value.witness.attacks } : null
    };
  });
}

function registerLogicOperators(registry) {
  registry.register({
    id: 'logic.fixpoint@1', primitives: ['fixpoint', 'derive', 'call'],
    description: 'Finite positive Datalog-style fixed point.', execute: fixedPoint
  });
  registry.register({
    id: 'argumentation.grounded@1', primitives: ['call'],
    description: 'Grounded extension of a finite Dung argument graph.', execute: groundedArguments
  });
  return registry;
}

function registerLogicVerifiers(registry) {
  registry.register({ id: 'logic.fixpoint@1', description: 'Recompute finite positive closure.', execute: verifyFixedPoint });
  registry.register({ id: 'argumentation.grounded@1', description: 'Recompute a grounded argument extension.', execute: verifyGroundedArguments });
  return registry;
}

export {
  factKey, fixedPoint, groundedArguments, instantiate, matchFact, registerLogicOperators,
  registerLogicVerifiers, verifyFixedPoint, verifyGroundedArguments
};
