---
id: DS004
title: Executable Artifacts, Identity, Persistence, and Provenance
status: implemented
owner: nllAgent maintainers
summary: Defines canonical ESM artifacts, source digests, build and task identities, atomic persistence, traces, replay, and cache limits.
---

# Introduction

nllAgent persists semantic structure as executable ESM and human communication as Markdown. Persistence must retain
the identities needed to reproduce a training decision or task result without introducing a parallel data schema.

# Core Content

## Canonical artifacts

Authoritative structured artifacts include ontology modules, RuleAnalysis, CircuitArchitecturePlan,
MaterializationProfile, primitive descriptors, circuits, RulePack, build state, agent context, task descriptor,
LongTextJS, expected benchmark terms, CNL grammars, result modules, compatibility reports, and traces. Each is a sealed
opaque DSL value or a module that constructs such values. Markdown holds theory, source documents, handoff, diagnostics,
timings, and reports.

Runtime caches and temporary process files are reconstructible and non-authoritative. They may use private in-memory
representation, but nllAgent does not persist them as a semantic interchange format. Source printers must round-trip
through public constructors rather than expose private fields.

## Identity hierarchy

Source identity combines logical source ID, revision, Unicode-code-point content digest, and exact text. Authority
spans and task anchors use half-open ranges against that revision. Ontology definitions use qualified versioned IDs.
Source entities and anchored events normally have explicit identities; immutable values and derived terms may use
structural identity. Mentions remain distinct even when they are candidates for the same entity.

An agent build identity includes theory digests, ontology identities, plan/profile/circuit/primitive/provider
identities, tests and benchmark identities, SDK catalog identity, and validation policy. A task identity includes input
revision, pinned build, target, interpretation policy, and context digest. An execution-node identity includes circuit
template, binding, interpretation context, and component. A published ValueRef includes its producer, port, and content
digest and can be bound only once.

## Provenance and trace

Every source observation points to its LongText module, claim status, context, and anchors. Every derived term points to
the circuit/node and inputs that produced it. Every finding has evidence. Every tool or external artifact is versioned
and traced. Decision-table trace records the selected rows or conflict. Absence trace records the exact concept, scope,
and coverage state. Assurance trace distinguishes concrete, abstract, symbolic replay, proof, and synthesis.

The Markdown explanation is a view over this structure. It may simplify wording but cannot introduce a premise absent
from trace. A replay loads the exact build, accepted LongTextJS, and runtime modules and must reproduce all non-Codex
semantic outputs.

## Atomic writes and retention

Files are written to a contained sibling temporary path and renamed. Candidate promotion updates current only after the
new immutable build is complete. Semantic transactions buffer derived terms and outputs; failure discards the entire
buffer. Task artifacts are written under their task root, and an incomplete run retains diagnostics without presenting
a final success result.

Accepted builds and task revisions are append-only. Explicit administrative retention may archive them, but caches can
be discarded at any time. Deleting or replacing evidence requires a new revision, not mutation of a historical result.

## Cache and incremental limits

Pure node caching keys the operation identity, code/version, immutable inputs, snapshot, binding, interpretation
context, ontology, and evidence policy. Stateful operations and Codex authoring are not pure nodes. An accepted Codex
artifact may be replayed exactly but is not recomputed through the node cache.

Incremental execution may reuse unchanged content-addressed values between snapshots. Any claim of reuse must expose
cache hits and invalidated descendants. Until dependency invalidation and epoch behavior are implemented for a circuit,
the runtime performs full concrete reevaluation and documentation must not claim self-adjusting performance.

# Decisions & Questions

### Question #1: Why persist source code instead of a neutral serialized graph?

Response: The project intentionally makes the internal JavaScript DSL the semantic language. Public constructor source
is inspectable, modular, executable, and avoids a second representation becoming the real authority.

### Question #2: Are traces executable programs?

Response: Reimportable authoritative traces are `.trace.mjs`. A Markdown trace report is an explanatory projection. A
large run may split trace modules while preserving one sequence and root identity.

### Question #3: What may be cached across documents?

Response: Only values whose complete semantic dependency key is identical. Similar text, the same agent name, or the
same rule ID is insufficient.

### Question #4: Does structural term equality imply entity coreference?

Response: No. Structural identity is suitable for immutable values and derived canonical forms. Source entities,
events, mentions, and hypotheses use explicit or contextual identity and require an explicit resolution relation.

### Question #5: May failed training output be inspected?

Response: Yes. It remains a candidate artifact with diagnostics and Codex provenance, but it is not an agent build and
cannot be selected by analysis.
