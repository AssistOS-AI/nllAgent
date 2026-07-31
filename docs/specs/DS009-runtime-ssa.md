---
id: DS009
title: Runtime Planning, Dynamic Graph, SSA, Transactions, and Scheduling
status: partial
owner: nllAgent maintainers
summary: Defines capability planning, concrete node lifecycle, canonical instantiation, scheduling, transactions, cache, resources, and the boundary of current incremental behavior.
---

# Introduction

The runtime turns an accepted RulePack and LongText snapshot into a concrete hierarchical execution graph. Planning
selects authorized capabilities; scheduling evaluates immutable dataflow and transactional macro-nodes; trace records
the complete operational path.

# Core Content

## Planning and instantiation

Planning starts from a semantic target such as AllFindings, Assessment, WitnessedFinding, or CNLRepair. It resolves
`requires` backward through providers pinned by the RulePack and refuses ambiguous or unavailable providers. Concrete
facts then activate the selected templates forward. Provider identity and selection rationale enter the execution
plan and trace.

A canonical circuit-instance key contains template identity, binding identity, interpretation context, and snapshot
dependency. Repeating the same key returns the existing instance. `instantiateEach` obtains bindings from a typed query
or selector and creates only relevant children. An expansion request can ask for an authorized capability; it cannot
load arbitrary repository code.

## Node lifecycle and SSA

The technical lifecycle is `CREATED → READY → RUNNING → PRODUCED → VALIDATED → COMMITTED`. A pure cached result may use
`CACHED`; missing inputs/resources may use `BLOCKED`; exceptions use `FAILED` and discard the transaction. Technical
state is distinct from the semantic result: a committed decision node may produce `UNKNOWN`, while a failed node
produces no rule status.

A node binds each public output port once. ValueRef identity contains producer, port, and content. A stage can mutate
local JavaScript state while running, but only the final validated transaction delta becomes public. Source observations
and earlier public values are never rewritten.

## Scheduling

Explicit schedule constraints form a directed dependency graph. Independent components have deterministic canonical
ordering in the reference scheduler; parallel execution is permitted only when inputs are ready and semantic write
sets cannot race. A cycle must be classified as a monotone fixed point or controlled procedural loop. An accidental
schedule or capability cycle fails closed.

Rule paths use four-valued conjunction and existential aggregation across bindings. Rules and stages execute in their
declared composition order unless the schedule establishes another dependency. A subcircuit shares the store and trace
but has its own canonical instance identity.

## Transactions and effects

Each rule binding and stage owns a transaction buffer. `derive` accepts ground terms; `emit` accepts registered opaque
outputs. Validation checks ontology, destination layer, evidence, provenance, duplicate policy, and invariants before
commit. An exception, effect drift, invalid output, or failed verification rolls back the complete delta.

ExecutionContext instruments query reads, semantic writes, subcircuits, tools, primitive applications, decisions,
tasks, checkpoints, and verification. Observed effects must be covered by the stage or primitive contract. Codex is not
an ExecutionContext capability.

## Cache, epochs, and resources

Pure stages may use a content-addressed cache including stage implementation, snapshot, binding, ontology, context,
and policy. Cached deltas are validated on commit and publish new ValueRefs; cache storage is reconstructible. Stateful
or externally changing operations are not pure.

The target architecture separates positive derivation, closure, non-monotone absence, and output epochs. The current
reference scheduler implements deterministic component execution, canonical dynamic instantiation, transactions,
effect validation, and pure-stage caching. General dependency invalidation, parallel scheduling, capability-driven
runtime expansion, and epoch-separated incremental fixed points remain partial. Circuits requiring these mechanisms
must use the implemented engine boundary or return an explicit blocker.

Budgets cover nodes, iterations, elapsed time, memory/process limits, and external tool calls. Exceeding a budget yields
`BLOCKED_RESOURCE`, never an empty successful report. A fixed-point helper records iterations and stops on convergence
or budget.

# Decisions & Questions

### Question #1: Why distinguish component schedule from JavaScript control flow?

Response: The schedule expresses semantic dependencies between public values and reusable components. Local control
flow implements one node. Mixing the two would either hide composition or explode ordinary algorithms into noise.

### Question #2: Can cached results bypass validation?

Response: No. Cache avoids recomputation but the semantic delta still passes transaction validation against the target
store and policy before commit.

### Question #3: What does append-only mean when a document changes?

Response: A change creates a new source and store snapshot. Unchanged content-addressed values may be reused; the old
snapshot and trace remain immutable. The runtime does not delete old nodes to simulate history.

### Question #4: Why is this DS marked partial?

Response: Concrete transactions, lifecycle, cache, schedules, trace, and dynamic binding instantiation are executable.
General agenda expansion, parallel merge, epoch stratification, and cross-snapshot invalidation are not yet complete.

### Question #5: Does a must-result from abstract preflight skip concrete execution?

Response: No. Concrete execution remains operational authority unless a separately specified certificate protocol is
the target. Preflight guides planning and reports precision.
