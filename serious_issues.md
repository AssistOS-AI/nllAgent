# Current Serious Issues

This file lists concrete limits of the current implementation. It does not reopen the five architectural decisions
covered by executable experiments and does not list removed legacy workflows.

## 1. Scheduler incrementality is bounded

The runtime has canonical circuit-instance identity, immutable single-producer values, transactional stages,
content-addressed reuse for pure stage deltas, and dynamic `instantiateEach`. It does not yet provide a complete
epoch-separated positive/non-monotone scheduler, general runtime `requestCapability` graph growth, deterministic
parallel execution, or dependency-minimal invalidation across arbitrary edited snapshots.

Documentation may claim the tested mechanisms individually, but not general self-adjusting or parallel execution.
Closure requires epoch tests, capability-expansion tests, descendant invalidation metrics, and explicit resource-budget
behavior on realistic recursive circuits.

## 2. Interpretation support is not yet integrated through every circuit path

LongTextJS stores alternatives in separate contexts and the runtime can aggregate supplied per-interpretation outcomes
as robust, conditional, or conflicting. Not every query, dynamic instance, procedural stage, and root-output path is
automatically evaluated across a factorized interpretation set.

An agent may claim interpretation-aware results only when its circuit and benchmark exercise the explicit context path.
General closure requires lazy shared-base scheduling, context-preserving cache keys, and combinatorial stress cases.

## 3. Compatibility remains conservative for opaque procedural behavior

Recursive SemanticDemand includes typed concepts, roles, capability contracts, evidence policies, operations, nested
circuits, dynamic instantiations, and exact coverage scopes. An opaque macro-node can still read a semantically relevant
dimension not expressible by its declared effect/summary, and global aggregation of independently blocked rule paths is
not a fully general planner feature.

Critical macro-nodes must declare and test an adequate summary or fail closed. Closure requires observed-versus-declared
demand checking for every stage and a general partial/global result aggregation contract.

## 4. Query planning and temporal indexing are minimal

SemanticStore hides its physical indexes and typed query behavior is correct for the implemented finite snapshot
fragment. The planner does not yet cost alternative join orders, maintain a full reverse-role/interval index suite, or
incrementally update every index across source revisions.

No performance claim should imply database-grade optimization. Closure requires query-plan inspection, equivalent-plan
tests, interval workloads, and before/after metrics on the medium-size `agentsEval` corpus.

## 5. Controlled generation is deliberately narrow

The implemented CNL path checks critical-slot round-trip and bounded typed synthesis. It does not provide unrestricted
long-form generation, universal multilingual parsing, or verified stylistic rewriting. Deterministic circuits have no
direct model-call capability.

Long-form prose created by a coding role remains a draft source until re-materialized and checked. Closure of any wider
claim requires a paired grammar/parser, unauthorized-claim detection, concrete replay, and language-specific benchmark
evidence.

## 6. Mutation support is scenario-specific

The benchmark API and evaluations contain meaningful targeted mutants, but the repository does not yet offer a general
typed source-mutator that enumerates comparator, exception, coverage, identity, evidence, rewrite, and status mutants
for arbitrary CircuitJS.

Global mutation-adequacy claims remain unsupported. Closure requires preserved `.mjs` mutant artifacts, independent
unchanged expected modules, per-rule scores, and minimization of surviving counterexamples.
