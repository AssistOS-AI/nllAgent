---
id: DS007
title: SemanticStore, Query Algebra, Identity, Time, and Alternatives
status: partial
owner: nllAgent maintainers
summary: Defines the single logical term graph, private indexes, typed matching, evidence/context policies, transactions, identity, temporal operations, and current interpretation limits.
---

# Introduction

SemanticStore is the only logical model read by circuits. LongTextJS publishes observations into it; CircuitJS queries
and derives over it. Abstract domains, symbolic terms, solver atoms, and e-classes are temporary analysis structures,
not competing document databases.

# Core Content

## Logical layers and physical indexes

The logical graph contains source revisions and anchors, observation terms and claims, hypotheses and alternatives,
derived terms, outputs, evidence, coverage, and provenance. Layer and context remain visible in public metadata.
Observation terms are immutable after snapshot publication; circuits append validated derivations and outputs through
transactions.

Indexes by concept, role, reverse role, anchor, claim, context, identity, time, coverage, and dependency are physical
implementation details. A circuit cannot receive or mutate these maps. Optimizing an index cannot change the query
contract or semantic identity.

## Typed query and binding

`instancesOf` selects a concept and admitted subtypes under an optional context/evidence policy. `match` unifies a typed
Term or Pattern and returns immutable bindings. A variable binds once within its lexical query scope. Roles, nested
terms, identity, and context participate in unification. Unsupported implicit casts fail.

The query algebra includes typed match, filters, same/different identity, context and scope restriction, claim/evidence
selection, source ordering, existence and coverage-aware absence, temporal relations, paths, grouping, and aggregation
where implemented by registered primitives. A procedural stage may iterate query results with normal JavaScript but
must use `ExecutionContext` so reads enter trace and effect validation.

The store never exposes a “facts array” contract. Query results are terms or bindings with stable identities. A query
plan may use indexes and reorder conjunctive operations only when the result and provenance are equivalent.

## Claims, evidence, and context

Claims about one structural proposition can differ by producer, anchor, epistemic status, and interpretation context.
`evidenceFor` returns source anchors; provenance follows source and derivation edges. Evidence policy is a query input,
not a post-filter hidden in report rendering.

Alternative readings share base terms and keep their differing facts in named contexts. Context-aware matching is
implemented for direct term selection. Aggregation can classify evaluator results across contexts as robust,
conditional, or conflictual. Full lazy factorization through every scheduler node remains partial and must not be
claimed for circuits that query context-insensitively.

## Identity and time

Term identity follows DS005. The store keeps identity candidates without automatic merge. A resolution circuit may
derive an accepted relation in a context; it cannot mutate the original mention or entity. Queries requiring robust
identity must distinguish accepted, possible, and conflicting candidates.

Temporal terms include instants, intervals, durations, and typed relations. Explicit relations can be queried directly;
entailed closure uses the registered temporal or relation engine. A compatible-but-not-entailed order remains unknown.
Quantities and units follow the same pattern: canonical values are ontology terms and comparisons use SDK/constraint
primitives.

## Coverage and transaction boundary

Coverage lookup requires concept and exact scope. No matching declaration returns unknown; incompatible declarations
return conflict; a justified closed declaration enables absence. `notExists` combines query result and coverage through
four-valued semantics.

Every rule binding or stage uses a transaction. `derive` accepts ground terms. `emit` accepts registered opaque outputs
and enforces finding evidence. Commit validates types, invariants, layer, duplicates, and provenance before publishing.
Failure or effect drift rolls back the complete delta.

## Snapshots and limitations

A snapshot identity covers immutable observation state and accepted derivations at the relevant epoch. Content cache
keys include that identity. Persistent cross-snapshot dependency invalidation, full temporal indexing, generalized
query optimization, and scalable lazy interpretation branching remain partial. Unsupported operations must use an
explicit macro-node or return a blocker; generated code cannot assume them from method names alone.

# Decisions & Questions

### Question #1: Why not use a triple store?

Response: Recursive terms, event roles, scope operators, claims, alternatives, semantic collections, and algorithmic
JavaScript are primary here. The typed term graph preserves them directly without forcing a triple-shaped authoring
language.

### Question #2: Can a procedural stage read `store.terms`?

Response: It may use the public instrumented view where explicitly supported, but generated circuits should prefer
typed queries and SDK primitives. Private indexes and mutable collections are never exposed.

### Question #3: Does one true interpretation make a finding robust?

Response: No. Robustness requires the finding or status across every admitted relevant interpretation. One true and one
unknown reading is conditional; true and false or incompatible results are conflictual.

### Question #4: Why keep claims separate from terms?

Response: The same proposition may be asserted, denied, proposed, quoted, or supported by different evidence. A bare
term cannot carry those discourse and provenance distinctions without conflating content and assertion.

### Question #5: What does partial status mean for this DS?

Response: The core term, matching, context, coverage, and transaction APIs are executable. General query planning,
incremental invalidation, temporal indexing, and fully factorized interpretation-aware scheduling are bounded current
limitations recorded in tests and `serious_issues.md`.
