---
id: DS014
title: Persistence, Provenance, Cache, and Incrementality
status: partial
owner: nllAgent maintainers
summary: Defines executable filesystem artifacts, atomicity, dependency identity, cache safety, snapshots, retention, and incremental recomputation.
---

# Introduction

The default store is filesystem-backed, but semantic identity and query contracts must not depend on a physical layout.

# Core Content

Agent projects and run artifacts are `.mjs`; human source and reports are Markdown. Writes use a temporary sibling and
rename. A run fixes its source revision, agent module identities, ontology, circuits, foundation selection, tools,
models, dialects, and operational options at transaction start.

Cache keys include operation code identity, input value identities, ontology, interpretation context, evidence policy,
tool/model version, and all declared dependencies. Unknown dependency completeness forces recomputation. Model cache
obeys DS002. Indexes are rebuildable and cannot strengthen evidence or coverage.

Source editing creates a new snapshot. Explicit semantic identities and unchanged structural terms may be shared.
Changed observations invalidate dependent derivations and outputs. The old graph remains immutable and auditable.

Retention distinguishes source, model artifacts, semantic trace, telemetry, reports, issues, and caches. Removing
evidence must downgrade replay claims explicitly.

# Decisions & Questions

### Question #1: Are run directories temporary?

Response: No. They are durable experiment records by default. A configured retention policy may remove classes of
artifacts, but it must record the resulting replay limitation.

### Question #2: Is incrementality fully implemented?

Response: Term and snapshot identities, atomic transactions, and executable run persistence are implemented. Persistent
dependency graphs, cross-snapshot cache reuse, span relocation, and fine-grained invalidation remain partial.

### Question #3: May cache output be cited as evidence?

Response: Only through the canonical dependencies it represents. Deleting a cache must not change semantics; retaining
it cannot create coverage or authority.
