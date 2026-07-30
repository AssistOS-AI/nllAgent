---
id: DS013
title: Coding Agent Authoring and Skills
status: experimental
owner: nllAgent maintainers
summary: Defines multi-file Coding Agent authoring, role skills, ownership, diagnostics, integration, and review.
---

# Introduction

Coding Agents are practical compilers from authority and source documents to executable semantic projects.

# Core Content

The repository-owned authoring skills are `nll-design-ontology`, `nll-materialize-longtext`, `nll-author-circuits`,
`nll-author-cnl`, `nll-build-benchmark`, `nll-integrate-experiment`, and `nll-review-and-repair`. Runtime-only roles use
`nll-translate-longtext` and `nll-realize-cnl`. Each skill names required inputs, files to inspect, allowed tools,
required outputs, diagnostics, workflow, and an executable completion gate.

Agents create as many `.mjs` modules as the ontology, document, or theory needs. Handoff is repository code, tests,
notes, traces, and commands—not an ungrounded prose summary. Ontology ownership controls shared identities; LongText
owners cannot emit findings; benchmark owners cannot weaken expectations; integrators verify imports and end-to-end
execution; independent review may repair any layer with an explanation.

The `learn` command creates a disposable workspace, copies authority and agent-owned authoring trees, invokes a Coding
Agent non-interactively, captures a Markdown execution record, and never changes a running analysis. Promotion and
fine-grained filesystem audit remain experimental.

# Decisions & Questions

### Question #1: Why not ask an agent for one large source block?

Response: Ontology, identities, section materialization, global relations, rule families, CNL, and benchmarks have
different ownership and feedback loops. Multi-file code makes dependencies and repairs reviewable.

### Question #2: Where should a failed check be repaired?

Response: At the lowest authoritative layer: vocabulary/type errors in OntologyJS, source interpretation in LongTextJS,
judgment and coverage in CircuitJS, execution invariants in runtime, language loss in CNL, and missed distinctions in
benchmarks.

### Question #3: Can an authoring agent rewrite runtime verifiers?

Response: Not through a runtime translation role. Repository development may deliberately change platform code under
normal review, but an input document or production call cannot expand that authority.
