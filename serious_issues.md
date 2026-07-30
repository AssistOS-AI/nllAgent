# Current Serious Issues

This file lists concrete gaps in the current executable architecture. It does not reopen the five decisions already
settled by `experiments/architecture/`.

## 1. Dynamic scheduling is a correct minimal slice, not yet a complete incremental engine

The scheduler executes typed rules and asynchronous procedural macro-nodes transactionally, preserves immutable
published values, records trace events, and rolls back failed stages. It does not yet implement epoch-separated
positive closure, non-monotone closure, content-addressed node caching across snapshots, parallel scheduling, or
runtime graph expansion through `instantiateEach` and `requestCapability`.

Until those mechanisms exist, documentation must not claim self-adjusting recomputation or parallel execution.
Acceptance requires deterministic scheduling tests, canonical instance identity, dependency invalidation, cache reuse
measurements, and explicit `BLOCKED_RESOURCE` behavior.

## 2. Module isolation is specified more strongly than the current loader

Agent programs are normal ESM and semantic writes are protected by opaque values and transactions. The CLI currently
imports an agent module in the host process; it does not yet enforce the worker/process allowlist, filesystem boundary,
time budget, memory budget, and injected tool capability policy required by DS015.

Untrusted generated modules therefore require external process isolation today. The in-process loader is suitable only
for reviewed repository modules. Acceptance requires a child-process runner, explicit import roots, killed-process
diagnostics, and security fixtures for ambient filesystem, environment, network, and process access.

## 3. Interpretation contexts are represented but not fully evaluated

LongTextJS can preserve alternatives and identity candidates, and the experiment proves factorized lazy selection.
The scheduler does not yet branch a circuit run by interpretation context or aggregate outputs as robust, conditional,
or conflicting across admitted worlds.

No output may claim interpretation robustness until the runtime has context-aware matching, shared-base evaluation,
lazy branching, provenance-preserving aggregation, and combinatorial stress benchmarks.

## 4. Coverage and compatibility planning are intentionally conservative but incomplete

`SemanticDemand` detects concept-level incompatibility and coverage-aware absence distinguishes open from closed
scope. Role-level demand, operational capability demand, evidence-policy guarantees, temporal normalizer discovery,
and localized partial-result aggregation are not yet complete.

A circuit depending on those missing dimensions must declare or check them procedurally and return a blocked or unknown
result. Acceptance requires demand extraction from every rule and stage contract plus planner tests that localize
blocked subgraphs without promoting partial results to a global assessment.

## 5. Controlled generation covers deterministic critical-slot round-trip only

`CnlDialect` verifies that a rendered sentence parses back to the same normalized critical semantic slots. The
reference dialect is deliberately narrow. Model-assisted long-form realization, re-materialization, iterative repair,
and acceptance as a `GeneratedDocument` are architecture contracts but not complete production paths.

Until the loop is implemented, model-generated prose is a draft artifact, never verified controlled language.
Acceptance requires frozen model artifacts, reanalysis through LongTextJS, unauthorized-claim detection, repair
budgets, and benchmark cases for modality, negation, actor, time, quantification, and exceptions.

## 6. Mutation testing has fixtures but no general source mutator

The benchmark runner compares expected semantic findings and the architecture suite includes targeted counterexamples.
It does not yet generate circuit or LongText source mutations and calculate a per-rule mutation score.

Claims about mutation adequacy remain blocked. A complete runner must generate typed comparator, exception, coverage,
identity, evidence, and status mutations, preserve every mutant as an ESM artifact, and require expected modules to
remain unchanged.
