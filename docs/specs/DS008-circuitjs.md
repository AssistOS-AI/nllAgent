---
id: DS008
title: CircuitJS, SDK Primitives, Methods, and Composition
status: implemented
owner: nllAgent maintainers
summary: Defines circuit responsibility, rules, decision tables, primitive-backed stages, procedural macro-nodes, contracts, dynamic composition, effects, and the exact SSA boundary.
---

# Introduction

CircuitJS is the executable language for rules, transformations, verification, aggregation, and controlled generation.
It combines inspectable DSL components with full JavaScript at explicit macro-node boundaries.

# Core Content

## Source, model, instance, and graph

A `.circuit.mjs` module constructs a `CircuitTemplate`/CircuitModel. It declares one primary semantic responsibility,
typed requirements and provisions, included rules, decision tables, stages, subcircuits, schedules, bindings, dynamic
instantiation, methods, supported assurance, and summaries. The source is not the execution graph.

A CircuitInstance binds the model to concrete inputs, one snapshot, a binding, and an interpretation context. The
runtime creates nodes only for components and matches actually required. The execution graph and ValueRefs are runtime
objects; agents do not hand-author a node/edge serialization.

## Rules and queries

A rule has `when` clauses and `then` actions. `match` uses ontology constructors as typed patterns. `where` returns one
of the four truth values. `notExists` names a pattern, exact scope, and coverage requirement. Actions derive typed terms
or emit outputs. Variables must be bound by prior clauses; unknown or conflict paths never emit as if true.

Rule evaluation keeps truth per binding. A later false conjunct can reject an earlier unknown; a remaining unknown or
conflict path is retained in the rule result but not executed. Trace records matches, predicate values, coverage, and
derived/emitted identities.

## Decision tables

A decision table declares columns, rows, results, priorities, and a hit policy. Cells may contain `TRUE`, `FALSE`,
`UNKNOWN`, `CONFLICT`, or a wildcard. Evaluation returns an opaque DecisionEvaluation with input values, matched rows,
status, and result. No match is unhandled, and incompatible unique results are `RULE_CONFLICT`; the first textual row
does not win accidentally. A table can be included in the CircuitModel for introspection and used through the
instrumented execution context for trace.

Training benchmarks cover every meaningful row, overlap, boundary, unknown, and exception path. Critical tables may
add local proof obligations for disjointness and exhaustiveness.

## SDK primitives

The SDK is the preferred authoring vocabulary. A PrimitiveDescriptor has typed input/output ports, concrete semantics,
effects, optional abstract transfer, symbolic encoder, proof step, and laws. The default catalog exposes executable
providers backed by SemanticStore and the existing constraint, relation, e-graph, proof, and synthesis engines.

A stage declares `usesPrimitives(...)` and calls `ctx.applyPrimitive`. The runtime traces the primitive and expands its
declared effects into the stage effect allowance. An unlisted primitive call or undeclared transitive read/write is
effect drift and rolls back the stage. Missing abstract semantics yields conservative top; missing symbolic or proof
semantics is explicit unsupported assurance, not invented behavior.

Generated code reuses an exact circuit provider first, then SDK primitive composition, then a new reusable primitive.
It uses a custom macro-node only when the operation is genuinely irregular or domain-specific.

## Procedural macro-nodes

A stage may use functions, classes, local mutation, loops, recursion, exceptions, asynchronous tools, and helper data
structures. It reads semantic state through `ctx.query`/the instrumented store and publishes only through `ctx.derive`
and `ctx.emit`. Declared reads, writes, tools, and primitive uses are compared with observed effects. The transaction
commits atomically.

Macro-node internals are not automatically converted to SSA or symbolically executed. The node receives immutable
public inputs and publishes one public result/delta. A CircuitSummary or encoder is required only when planned
assurance must reason across the boundary. Circuit execution never calls Codex or a direct model.

## Composition and methods

Subcircuits compose through typed requirements/provisions, includes, schedules, and ports. `instantiateEach` creates one
canonical instance per query binding and context. Provider selection is limited to RulePack-authorized pins. Positive
monotone cycles become fixed-point groups; procedural cycles require an explicit controller and stopping condition;
unclassified cycles fail integration.

Method names describe implementation of a plan step—query/dataflow, finite decision, constraint, relation, rewrite,
symbolic, proof, synthesis, or JavaScript macro. They do not define rival circuit types. One retention circuit can use
query, comparison, absence, decision, and repair while retaining one RetentionAssessment responsibility.

## SSA boundary

Each published ValueRef has one producing node and cannot be rebound. Observation snapshots and committed terms are
immutable. A stage transaction publishes at most one validated delta at completion. Local JavaScript variables may be
assigned normally. This hierarchical boundary preserves audit and caching without pretending every instruction is a
semantic node.

# Decisions & Questions

### Question #1: When should a rule be a declarative `rule` rather than a stage?

Response: Use a rule when typed matching, finite predicates, coverage-aware absence, and derive/emit actions express the
logic naturally. Use a stage for global algorithms, irregular aggregation, parsing, I/O, or reusable engine control.

### Question #2: Why include decision tables in the model if a stage supplies their inputs?

Response: Inclusion makes policy rows inspectable, benchmarkable, and available to proof/preflight. The instrumented
stage controls dataflow and records the exact table evaluation.

### Question #3: Does a primitive replace a circuit?

Response: No. A primitive is an atomic reusable operation with multi-semantic handlers. A circuit owns a business
responsibility and composes multiple primitives, rules, tables, or subcircuits.

### Question #4: Are custom algorithms discouraged?

Response: They are allowed and sometimes preferred. The requirement is an honest semantic boundary, declared effects,
trace, tests, and a conservative assurance ceiling—not artificial decomposition.

### Question #5: Can a circuit modify source observations?

Response: No. It appends derived terms and outputs in a transaction. A corrected observation requires a new LongTextJS
revision and a new execution snapshot.
