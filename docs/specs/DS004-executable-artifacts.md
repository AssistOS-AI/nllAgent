---
id: DS004
title: Executable Project and Artifact Model
status: implemented
owner: nllAgent maintainers
summary: Replaces release manifests with executable project modules, content identities, run artifacts, and experiment reports.
---

# Introduction

The research architecture treats source modules as the authoritative structured artifacts. It does not retain the old
candidate, publication, release, or active-pointer lifecycle.

# Core Content

`agent.mjs` is the compositional root. It imports a sealed ontology, materializers, validation circuits, planning
circuits, CNL dialects, tools, and model roles. Each imported module has ordinary ESM identity and can be reviewed with
standard code tools. Content digests identify snapshots, cache entries, model requests, terms, circuits, and outputs;
they do not certify semantic truth.

A completed run persists an executable LongTextJS program, trace program, and result program. These modules reconstruct
opaque DSL values through the same public constructors used by authors. Markdown reports are deterministic human views.
Cache and indexes are discardable and never become semantic authority.

Coding Agents edit multi-file projects and benchmark cases in isolated workspaces. Integration produces an experiment
report. Freezing, distribution, signing, or deployment can be added by a host later, but this repository does not
simulate maturity with version lineages that the experiment does not need.

# Decisions & Questions

### Question #1: Why retain content identities without releases?

Response: Transactions, replay, dependency invalidation, and model artifacts still require exact identity. A digest is
useful technical provenance without introducing a publication state machine.

### Question #2: Can a generated module merely export a generic record?

Response: No. It must call the owning DSL constructors so import-time validation and type identity remain active. A file
with an ESM extension whose real authority is an arbitrary record violates this contract.

### Question #3: Is deployment out of scope forever?

Response: No. It is outside this experiment. A future deployment contract must preserve executable module identity and
semantic boundaries rather than reintroduce a parallel data-shaped source of truth.
