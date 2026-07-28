---
id: DS009
title: Runtime Scheduler, Operators, and Reasoning Regimes
status: accepted
owner: nllAgent maintainers
summary: Defines graph scheduling, relational execution, fixpoints, truth maintenance, search, argumentation, operator isolation, caching, and budgets.
---

# Introduction

The CircuitJS runtime executes qualified graphs against LongTextJS materializations. Control must remain deterministic even when individual operators use nondeterministic models or external solvers.

# Core Content

## Scheduling

The scheduler must construct a plan from graph dependencies, materialized ports, effects, cost estimates, cache state, and budgets. Ready pure nodes may execute concurrently. The observed semantic result of a deterministic circuit must not depend on scheduling order. Node inputs and outputs are immutable and content-addressed. Before execution, external port materialization filters nominal types and accepted statuses, enforces cardinality, and bounds the resulting guarantee by all accepted premises.

Filters should be pushed before expensive joins when semantic equivalence is proven. Shared subgraphs and materializations may be memoized. A node cache key must include the complete LongTextJS semantic program and operational context in addition to circuit, node, operator, and resolved inputs, so two documents cannot collide merely because their selected observation arrays are equal. Optimization must not change provenance, error routing, limit behavior, or externally visible selection order.

## Operator registry

An operator record must declare name, version, role, input and output schemas, determinism, effects, capability requirements, resource limits, cost estimator, implementation reference, sandbox policy, and verifier or witness contract. The registry must reject unknown, unlocked, or under-specified operators.

Pure standard operators may execute in process. Model, network, solver, or untrusted native operators must run through controlled adapters and may be isolated in worker threads or child processes. A circuit receives only declared capabilities. Operator failures must be structured and must not leak secrets into traces.

The standard deterministic registry includes literal lexical matching, relational filter/project/join/aggregate, finite positive fixpoint, state timelines with explicit effects and retraction, elapsed-time deadlines with declared outage handling, typed unit conversion, aligned interval-conflict detection, shortest path with a separate optimality verifier, and grounded argumentation. These operators cover the runtime regimes without claiming domain-specific natural-language extraction. Missing domain producers or solver adapters remain compatibility failures.

## Relational regime

Relational nodes operate over ordered plain-data collections and propagate row-level provenance. Grouping and aggregation must preserve the contributing input identifiers. Window operations must declare document, temporal, or numeric ordering. Anti-joins require coverage tokens whose domain exactly matches the excluded collection.

## Derivation and truth maintenance

Positive finite-domain fixpoints must use deduplication and may use semi-naive evaluation. Nonmonotonic derivations must retain positive premises, negative premises, assumptions, and alternative justifications. When a premise changes, only dependent conclusions are retracted or recomputed.

Normative priorities must come from explicit `overrides`, specificity, authority, time, or a named comparator. File order must never resolve policy conflict.

## State and temporal execution

`maintain` must process an ordered event stream under a versioned transition policy. It must preserve prior states, active intervals, supersession, retraction, and termination reasons. Temporal comparisons must use named calendar or interval operators and include their witness.

## Search and alternatives

Search supports breadth-first, depth-first, best-first, A*, branch-and-bound, and registered strategies. Every state must be serializable and hashable. Budgets include expanded states, frontier size, elapsed time, memory, model calls, and operator cost. Exhaustion may return a best unverified candidate for diagnostics but must not publish it as a solution.

World assumptions remain local to a branch. Search must not change base observations. Successful outputs must include a replayable path, assumptions, actions, cost, and goal witness.

## Argumentation

Argument objects contain premises, rule, conclusion, authority, attacks, undercuts, and support. The standard runtime must preserve conflict and may compute grounded or other explicitly named semantics through a registered operator. Absence of an approved priority or argumentation policy yields `policy-conflict`.

## Budgets and checkpoints

Budgets are enforced per run, circuit, node, dynamic-demand round, search, model call, memory, and wall time. Budget exhaustion is a controlled terminal state. The scheduler may persist checkpoints after ingestion, materialization, and expensive circuit groups. Resume must reuse the same release snapshot and accepted captures.

## Trace interpretation

The runtime trace must be teachable as explicit dataflow. For each executed node it records node identity, primitive, exact operator or verifier when present, input and output digests, cache status, and duration. Full node values remain separately inspectable in the circuit result. Documentation must explain how `$port` references resolve to LongTextJS observations, how `$node` references resolve to immutable prior outputs, how guarantee ceilings propagate, and how static verification dominance combines with runtime acceptance filtering.

The current local executor follows the compiler's deterministic topological order. Parallel ready-node scheduling, checkpoints beyond the current run artifacts, and richer incremental planning remain contract directions unless implemented and tested. Tutorial material must not present those directions as current runtime behavior.

# Decisions & Questions

### Question #1: Why implement several reasoning regimes in one runtime?

Response: They share typed ports, immutable data, provenance, budgets, and publication rules. Specialized internal evaluators avoid forcing rules, state, and search into one misleading algorithm.

### Question #2: Must every operator have a separate verifier?

Response: Every operator that contributes an unverifiable candidate to a published finding must have a witness checked by a verifier or be explicitly bounded as model judgment. Pure structural transforms may rely on tested runtime invariants and propagated provenance.

### Question #3: Can external operators write files?

Response: Only if their declared capability and the release policy permit a specific controlled artifact output. Production circuits never receive general filesystem write access.

### Question #4: Does registering a generic reasoning operator qualify every use of it?

Response: No. The implementation contract and unit tests qualify the operator mechanism. Each agent release must still establish its input semantics, observation producer, witness use, benchmark cases, and intended guarantee.

### Question #5: Why does a deterministic node cache include the whole semantic program?

Response: Verifiers and operators may legitimately inspect anchors, coverage, task policy, or source structure beyond the selected input rows. Including the program and operational context prevents unsafe reuse across runs whose immediate values look equal but whose evidence domains differ.

### Question #6: Which planning work belongs in operators and which work belongs in the model?

Response: Registered operators build and verify an idea-specific CNL generation plan from source-grounded LongTextJS observations and released planning logic. They may select structure, content, order, dependencies, and guidance; they must also emit a witness mapping each applied rule to existing plan locations. They do not merely copy rule constraints into natural language. A model is needed only for optional text realization or semantic observation production. Bounded realize–validate–revise uses the existing validation circuits and canonical CNL audit as its stopping oracle.

### Question #7: Does an empty node output mean the circuit failed?

Response: No. An empty collection can be the correct result of a compatible, covered operator, such as a lexical rule excluded in dialogue. It differs from verifier rejection, incompatibility, incomplete coverage, budget exhaustion, and runtime fault. Reports and tutorials must preserve those distinctions.

# Conclusion

The runtime is a deterministic coordinator for relational, recursive, stateful, search, and argumentation methods. Resource limits and trusted boundaries remain visible at every step.
