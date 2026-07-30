---
id: DS020
title: Native Semantic Query Algebra
status: implemented
owner: nllAgent maintainers
summary: Defines typed patterns and queries as native CircuitJS over SemanticStore, including evidence, order, absence, grouping, and algorithm escape.
---

# Introduction

Semantic query is a native API over the term graph, not a separate authoring profile, serialized query tree, or second
execution engine.

# Core Content

Ontology constructors create typed patterns with `variable`. `query(pattern)` creates an opaque `SemanticQuery` that can
add `where`, `within`, evidence policy, and deterministic order. Circuit rules use `match`, joins through shared
variables, and coverage-aware `notExists`. Procedures use `ctx.query` and may run arbitrary JavaScript algorithms over
immutable `Binding` results.

The logical algebra includes match, bind, filter, exists, absence, same/different identity, scope/context, source
grounding, temporal relations, path, grouping, aggregation, and derivation. The current reference implementation covers
typed match, binding, filters, evidence policies, source ordering, exists, and coverage-aware absence. More advanced
operations remain direct JavaScript stages until their reusable semantics are implemented.

Physical indexes are hidden. A planner may choose concept, role, anchor, identity, temporal, or coverage indexes but
must preserve result identity, ordering, contexts, dependencies, and four-valued behavior. Empty open-world query
results are `UNKNOWN` when used as absence.

# Decisions & Questions

### Question #1: Why remove the query-first label?

Response: Query is simply one native CircuitJS form. Treating it as a separately normalized dialect recreated the same
fake-language problem and made ordinary algorithms look like exceptions.

### Question #2: When should an author use a stage instead?

Response: When a graph algorithm, simulation, parser, recursive closure, solver, or complex aggregation is clearer as
JavaScript. The stage still declares and traces its semantic boundary.

### Question #3: Can query callbacks mutate the store?

Response: No. Queries receive immutable terms and bindings. Semantic writes occur only through a transaction-owned
`derive` or `emit` boundary.
