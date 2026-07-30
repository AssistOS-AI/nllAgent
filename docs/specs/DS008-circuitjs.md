---
id: DS008
title: CircuitJS Language Contract
status: implemented
owner: nllAgent maintainers
summary: Defines real JavaScript circuit templates, typed rules, decision tables, procedural stages, composition, and semantic outputs.
---

# Introduction

CircuitJS is a real internal JavaScript DSL for judgment, derivation, algorithms, verification, and controlled
generation. Its source is not the materialized execution graph and is not normalized into a data AST.

# Core Content

`circuit` composes `rule`, `decisionTable`, `stage`, subcircuits, `requires`, `provides`, `include`, and `schedule`.
Ontology constructors create typed match patterns. Rules expose `when`, `match`, `where`, coverage-aware `notExists`,
`then`, `derive`, and `emit`. Decision tables use explicit `TRUE`, `FALSE`, `UNKNOWN`, and `CONFLICT` inputs and report
overlapping incompatible results rather than choosing by incidental order.

Stages are ordinary functions and may use local mutation, loops, recursion, classes, promises, tools, models, and
subcircuits. They interact with semantics only through `ExecutionContext`. A stage is therefore an instrumented
macro-node with declared read, write, effect, capability, and assurance boundaries.

Circuit source, circuit model, and execution graph are distinct. Source is what authors edit. The circuit model contains
templates, rules, stages, contracts, and schedule. The execution graph contains concrete instances, bindings, nodes,
values, transactions, and expansion requests for one snapshot.

# Decisions & Questions

### Question #1: In what sense is CircuitJS a circuit?

Response: Values flow immutably between typed producers and consumers, declarative portions expose dataflow at fine
granularity, templates create canonical instances, and runtime expansion adds nodes without mutating published values.
Procedural stages preserve this circuit boundary without pretending every local statement is a graph node.

### Question #2: Where is arbitrary JavaScript allowed?

Response: Inside reviewed stage, tool, model-adapter, verifier, and helper modules. Semantic reads and writes remain
instrumented through context and atomic transactions. Sandboxing is a module-execution concern, not a reason to amputate
the language.

### Question #3: Is there a separate query-first dialect?

Response: No. Query algebra is native CircuitJS and SemanticStore API. Direct rules, tables, queries, stages, and
subcircuits are peers in one language; authors choose the smallest clear form.
