---
id: DS005
title: OntologyJS Language Contract
status: implemented
owner: nllAgent maintainers
summary: Defines executable ontology namespaces, sorts, concepts, roles, constraints, constructors, behaviors, and introspection.
---

# Introduction

OntologyJS is the executable vocabulary shared by materialization and circuits. It defines identity and local validity,
not contextual judgment.

# Core Content

`ontology(id, ...extensions)` creates a versioned namespace. Builders define sorts, entities, events, states,
relations, value types, roles, cardinalities, derived concepts, lexicalization, and local behaviors. `O.seal()` checks
and freezes the ontology and enables introspection.

Concept definitions return callable constructors. Ground arguments produce `Term`; any typed variable or nested pattern
produces `Pattern`. Role constructors return `RoleValue`. These are opaque class instances, not extensible records.
Constructor application validates role target types and cardinality before a value can reach the store.

Behaviors are limited to unary local validation, normalization, indexing, and definitional views. They receive no store,
world, evidence, authority, priority, exception, or model context. Anything needing such context is CircuitJS.

The base ontology defines source structure, semantic situations, claims/evidence boundaries, and operational findings.
Domain ontologies extend it by import. Derived concepts are produced by circuits and must not be materialized as source
observations.

# Decisions & Questions

### Question #1: Where is the behavior boundary fixed?

Response: `experiments/architecture/behavior-boundary.experiment.mjs` demonstrates that a local normalizer works while a
store-dependent exception rule cannot run through the behavior interface. The public API accepts only `validate`,
`normalize`, `index`, and `view` behavior kinds.

### Question #2: How can one constructor serve LongTextJS and CircuitJS?

Response: Constructor dispatch is based on its opaque arguments. All-ground arguments produce a ground term; a
`Variable` or nested `Pattern` produces a typed pattern over the same concept and role identities.

### Question #3: Are contextual rules allowed as derived concepts?

Response: A derived concept names an output type only. Its production conditions, exceptions, priorities, and evidence
remain visible in a rule, table, stage, or subcircuit.
