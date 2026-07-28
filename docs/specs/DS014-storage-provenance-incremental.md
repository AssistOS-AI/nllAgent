---
id: DS014
title: Storage, Provenance, Incrementality, and Retention
status: accepted
owner: nllAgent maintainers
summary: Defines filesystem stores, atomicity, dependency graphs, caches, trace levels, checkpoints, retention, redaction, and concurrency.
---

# Introduction

The default deployment uses filesystem-backed stores inside each agent workspace. Store interfaces must remain separable so databases, object storage, or services can replace them without changing semantic artifacts.

# Core Content

## Planning transaction store

`planning-runs/<id>/` is a durable transaction store parallel to `runs/<id>/`. It binds one idea and release to canonical `CNLGenerationPlan`, including its rule-to-plan witness, compatibility report, circuit trace, and terminal status. Optional realization adds model captures, ordered candidates, nested validation artifacts, and a final document. Each candidate can reuse the normal artifact cache, but cache identity includes the candidate source digest and all ordinary semantic dependencies.

## Audit transaction store

`runs/<id>/cnl-audit.json` is the canonical `CNLAuditReport` for a direct validation transaction. It binds terminal state, compatibility, coverage, audit observations, findings, conflicts, limitations, and issue to the source and release. `report.md` is a deterministic view of this object. Nested realization validation directories use the same audit contract.

## Store boundaries

The implementation must expose source, materialization, circuit catalog, operator registry, verifier registry, release, run, trace, finding, benchmark, feedback, issue, and artifact store interfaces. The filesystem implementation may co-locate them physically but must preserve logical ownership and immutability rules.

## Atomicity and concurrency

Writes must be atomic through temporary sibling files and rename. Directories representing runs, releases, candidates, and learning jobs must use lock files with owner metadata and bounded expiry. A second process must not edit the same candidate or active pointer concurrently. Stale locks require an explicit recovery command or validated expiry policy.

The filesystem implementation uses exclusive-create locks carrying process, host, operation, acquisition, and expiry metadata. A production run holds its unique run lock until terminalization. Qualification and activation share an agent release lock, and a learning job holds an agent learning lock that serializes candidate authoring. Contention fails immediately with `workspace-locked`; it never waits indefinitely or silently breaks a stale lock.

Run creation fixes source digest, agent manifest, release manifest, operational context, model profile, operator registry, verifier registry, and task. Later publication cannot change the snapshot. Checkpoints must include their dependency digests so resume rejects stale state.

## Provenance graph

Every material object must have provenance edges to source anchors, producers, parent observations, circuit nodes, operators, model captures, verifier results, and feedback when applicable. The semantic trace records node inputs, outputs, decisions, worlds, errors, and dependency identifiers. The audit trace adds timing, cost, retries, process metadata, and diagnostics.

Explanation views expose only the minimal subgraph necessary for a finding. Audit access may expose more but remains subject to source permissions and retention.

## Caching and invalidation

Cache keys must include canonical input digest, schema and producer version, model profile, demand, view, operational context, and semantic configuration. Runtime node caches additionally bind the complete LongTextJS program, circuit and node, operator version, and resolved inputs. A dependency graph maps blocks to observations, observations to derived states, states to circuit outputs, and outputs to findings and reports. Source edits, rule changes, identity corrections, and context updates invalidate only dependent objects when the graph is complete; otherwise full recomputation is mandatory.

## Retention and redaction

Agent policy defines retention independently for source copies, model captures, observations, semantic traces, audit telemetry, findings, issues, benchmark cases, and release packages. Redaction and pseudonymization transformations must be versioned and tested to preserve the property they claim to preserve.

Deleting source text may make future certificate verification impossible. The retained artifact must state whether it remains independently verifiable, digest-verifiable only, or non-replayable. Reports must not imply stronger replay after required evidence has been removed.

## Scalability

Large documents must use streamed ingestion, materialized views, bounded in-memory collections, persistent indexes, and per-circuit partitioning. Indexes are rebuildable derived data. Global identity, temporal, definition, obligation, citation, and claim reducers must preserve deterministic order and provenance.

# Decisions & Questions

### Question #1: Why begin with filesystem stores for a complete system?

Response: The required interface is a local CLI with agent folders. Explicit store interfaces and canonical artifacts preserve the full architecture while making the system deployable without infrastructure dependencies. External stores can implement the same contracts.

### Question #2: Are run directories temporary?

Response: They contain processing intermediates but are durable audit records by default. Retention policy may archive or remove selected classes; run identity and terminal metadata remain.

### Question #3: How is stale cache reuse prevented?

Response: Cache keys include all semantic dependencies, and cached values retain dependency digests. Unknown dependency completeness forces recomputation.

### Question #4: Why does the current lock contain an expiry but not auto-break itself?

Response: Expiry makes ownership auditable, but automatically deleting a lock could corrupt a still-running slow operation or one paused by the operating system. Recovery requires a separately validated administrative action; normal commands fail closed.

### Question #5: Does a cache key based only on selected observations preserve verifier semantics?

Response: No. A verifier may inspect anchors, task policy, coverage, or an intervening event not present in the candidate rows. Runtime caching therefore binds the complete program and operational context; narrower caches are allowed only when their dependency slice is proven complete.

### Question #6: Why are planning runs separate from validation runs?

Response: A planning run has an input idea and a primary CNL specification even when no document is realized. Storing it under `planning-runs/<id>/` preserves that lineage without pretending the idea or plan is an audit source. Optional realization attempts retain nested `CNLAuditReport` artifacts so evidence remains comparable.

# Conclusion

Filesystem-backed persistence provides transactional local operation while content addressing, locks, provenance, retention status, and store interfaces preserve the requirements of larger deployments.
