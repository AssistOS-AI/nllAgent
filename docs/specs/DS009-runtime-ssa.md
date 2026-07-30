---
id: DS009
title: Dynamic Execution, SSA, and Transactions
status: implemented
owner: nllAgent maintainers
summary: Defines planning, node lifecycle, SSA boundaries, epochs, transactions, dynamic expansion, caching, and resource failure.
---

# Introduction

The runtime turns circuit templates into a dynamic hierarchical execution graph over one immutable source snapshot.

# Core Content

Backward capability planning selects the minimal provider chain for a requested output. Forward activation then creates
rule bindings, stage nodes, and subcircuit instances from concrete terms. Instance identity includes template, binding,
and interpretation context; duplicate canonical instances are rejected.

SSA applies to values visible between nodes. A published value has one producer and cannot be changed. A stage may
change local variables internally but publishes one immutable delta or output at its boundary. Authors expose finer
trace with subcircuits, tasks, or checkpoints when semantically useful.

Every node runs in a semantic transaction. Reads see the current stable snapshot. `derive` and `emit` buffer candidates;
validation checks type, layer, provenance, duplicates, and invariants before commit. Failure rolls back the complete
buffer. Independent nodes may run in parallel once deterministic merge and write-set checks apply.

The lifecycle is `CREATED → READY → RUNNING → PRODUCED → VALIDATED → COMMITTED`, with `CACHED`, `BLOCKED`, `FAILED`,
and `CANCELLED` branches. Semantic statuses such as `UNKNOWN` are distinct from technical node states. Resource limits
produce `BLOCKED_RESOURCE`, never an empty successful result.

# Decisions & Questions

### Question #1: Why not lower every JavaScript statement into SSA nodes?

Response: That would create decorative graphs that obscure the algorithm. The meaningful SSA boundary is the typed
input/output contract of a semantic operation; local implementation details remain normal JavaScript.

### Question #2: How are non-monotone rules scheduled?

Response: Positive derivation and closure run before absence, exceptions, or other non-monotone decisions. Those
decisions remain `UNKNOWN` until their declared scope is closed.

### Question #3: What is implemented now?

Response: Sequential hierarchical execution, rule binding, async macro-stages, atomic commit/rollback, subcircuit calls,
and lifecycle trace are implemented. True parallel scheduling, epochs, canonical dynamic expansion, and persistent node
caching remain explicit runtime work.
