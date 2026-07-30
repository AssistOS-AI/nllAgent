---
id: DS007
title: SemanticStore, Identity, Time, and Alternatives
status: implemented
owner: nllAgent maintainers
summary: Defines one typed attributed term graph, hybrid identity, factorized alternatives, temporal relations, layers, and hidden indexes.
---

# Introduction

SemanticStore is the single logical model shared by LongTextJS and CircuitJS. Physical indexes are implementation
details and cannot be used as evidence.

# Core Content

The store contains ground terms, claims, mentions, identity candidates, contexts, evidence, coverage, gaps, derived
terms, outputs, and provenance. It indexes by concept and role internally and exposes typed methods such as
`instancesOf`, `query`, `claimsAbout`, `evidenceFor`, `identityCandidates`, `coverageFor`, transactions, and snapshots.

Identity is hybrid. Source entities and anchored events use explicit stable identifiers. Mentions use source revision
and span identity. Immutable values and derived terms use structural identity. Repeated names never imply entity
identity. A new document revision creates a new snapshot; safe alignment may preserve explicit identities.

Alternative readings share a base context and store only their deltas. Evaluation is lazy and demand-driven. Pruning is
allowed only for demonstrated incompatibility or an explicit resource stop, never merely because confidence is low.
Results are aggregated as robust, conditional, or conflicting.

Time distinguishes source order, event time, intervals, uncertainty, and context. Absence is not negation; negative
conclusions require exact closed scope or coverage.

# Decisions & Questions

### Question #1: Which identity strategy won the experiment?

Response: `experiments/architecture/identity.experiment.mjs` shows that structural identity merges two people named Ana,
while explicit entity identifiers keep them distinct and structural normalized values still deduplicate. The hybrid
strategy is normative.

### Question #2: How is alternative explosion controlled?

Response: `experiments/architecture/alternatives.experiment.mjs` reduces 262,144 eager combinations to 12 demanded,
compatible worlds by factorization and lazy evaluation. Confidence-based deletion is forbidden.

### Question #3: May circuits read index maps directly?

Response: No. They use query algebra. Index replacement, corruption recovery, or optimization must not change logical
results, dependencies, coverage, or ordering guarantees.
