---
id: DS000
title: System Vision and Boundaries
status: implemented
owner: nllAgent maintainers
summary: Defines nllAgent as an executable semantic-programming experiment built from OntologyJS, LongTextJS, CircuitJS, and one SemanticStore.
---

# Introduction

nllAgent turns natural-language authority and long documents into inspectable programs. It does not claim universal
understanding. It promises that declared interpretation, derivation, findings, and controlled generation remain typed,
source-grounded, replayable, and explicit about unknown or conflicting evidence.

# Core Content

## One family of real internal languages

OntologyJS, LongTextJS, and CircuitJS are executable ESM `.mjs` languages over one multi-sorted term algebra.
OntologyJS defines constructor identities and local constraints. LongTextJS creates ground terms, claims, contexts,
alternatives, coverage, gaps, and exact source anchors. CircuitJS uses the same constructors as patterns and outputs and
adds queries, rules, decision tables, stages, subcircuits, tools, models, verification, and text generation.

DSL values are opaque class instances such as `Term`, `Pattern`, `Claim`, `Rule`, and `CNLFrame`. Arbitrary records do
not become semantic by being passed to a decorative builder. Structured persistence is executable `.mjs`; human input,
reports, experiment notes, and authority remain Markdown.

## Dynamic semantic circuits

A CircuitJS template is a hierarchical dataflow program. Declarative rules expose fine-grained match, decision,
derivation, and publication boundaries. Ordinary JavaScript stages remain instrumented macro-nodes. SSA applies to
values published between nodes: each has one producer and is immutable after commit. Local variables inside a stage
remain normal JavaScript and may use loops, classes, recursion, and `async` operations.

Planning works backward from requested capabilities; concrete facts activate work forward. A snapshot uses atomic
semantic transactions, explicit scope closure for absence, a trace, and fail-closed terminal states. A model may propose
an artifact, but only an accepted typed artifact enters semantic computation.

## Product boundary

The library and CLI preserve the audit, planning, benchmark, workspace, feedback, and Coding Agent authoring use cases.
This research version has no legacy loader, migration layer, publication lineage, active pointer, or compatibility
promise for earlier data-shaped formats. Agent roots are executable multi-file projects headed by `agent.mjs`.

# Decisions & Questions

### Question #1: Why use three languages instead of one unrestricted program?

Response: They share one term algebra but own different authority: ontology defines vocabulary, LongText describes the
source world, and circuits judge or transform it. Keeping those roles distinct prevents a finding from masquerading as
an observation while retaining ordinary JavaScript expressiveness.

### Question #2: What does success mean for the experiment?

Response: A Coding Agent must be able to build a multi-file project whose constructors, anchors, queries, traces,
benchmarks, and controlled generation are executable and reviewable. Unsupported meaning must become `UNKNOWN`,
`CONFLICT`, `BLOCKED_ONTOLOGY`, or `BLOCKED_CAPABILITY`, not an invented verdict.

### Question #3: Is an LLM an authority over meaning?

Response: No. It may translate or realize under a role contract. Its accepted output remains an attributed artifact or
proposed claim, and deterministic downstream code cannot inflate the guarantee of that premise.
