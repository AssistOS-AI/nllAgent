---
id: DS018
title: CLI Operations, Functional Traceability, and Known Limits
status: implemented
owner: nllAgent maintainers
summary: Defines the public train/analyze operations, native authoring tools, deterministic output contract, functional traceability, and the boundary of current guarantees.
---

# Introduction

The public product has two principal operations: compile an agent from theory and analyze a document with one accepted
agent. Supporting inspection, benchmark, issue, and feedback commands do not blur this boundary. Functional behavior is
traced from this DS and `docs/FS.md` to automated tests and business evaluations.

# Core Content

## Public commands

Training is invoked through `bin/nllagent-train.mjs` or `nllagent train`. Required options identify an agent and one or
more theory Markdown files. Options select data root, Codex executable/profile, run identifier, and bounded resources.
Success prints the immutable build and report locations. Semantic or validation failure retains the training run and
returns a nonzero exit without changing current.

Analysis is invoked through `bin/nllagent-analyze.mjs` or `nllagent analyze`. Required options identify one accepted
agent, task identifier, and input document. The host resolves current once or accepts an exact build, writes a task pin,
invokes Codex solely to produce LongTextJS, validates it, runs the circuits, and writes output. A retry with the same task
cannot silently select a different build.

Inspection commands list and inspect agents or tasks. Benchmark runs the selected accepted build. Issue and feedback
record Markdown evidence without mutating a build. There is no public `learn`, translator selector, Achilles provider,
or direct model-analysis command.

## Native authoring toolchain

`node tools/nll.mjs` exposes deterministic operations for source outline/span, rule checks, ontology check/inspect,
context check/inspect, method suggestion, plan validation, primitive validation, circuit check/preflight, LongText check,
engine experiments, benchmark execution, and RulePack checks. Reports are Markdown or `.mjs` where reimport is needed.

Tools verify artifacts and produce diagnostics; they do not choose business semantics. Skills specify when to call a
tool and require the coding role to inspect the report, not only its exit status.

## Analysis output contract

A completed task contains copied input, exact pin, generated LongTextJS, a reimportable result module, trace module,
human Markdown report, and execution metadata. The report identifies source, agent/build, circuit results, evidence
excerpts, assurance, blockers, and limitations. Empty finding lists do not imply compliance unless an assessment circuit
emits that conclusion.

CLI exit categories distinguish invalid invocation, missing artifact, generation/validation failure, deterministic
execution failure, semantic blockers, benchmark failure, and success. Stable machine-readable meaning is provided by
the `.mjs` result rather than a JSON stdout protocol.

## Functional traceability

`docs/FS.md` is the GAMP-style functional specification. Every function has an identifier, business intent,
preconditions, inputs, processing, outputs, failure behavior, security boundary, and verification reference. DS files
define architectural contracts; FS enumerates observable behavior; tests and `agentsEval` provide evidence.

Behavior changes require all affected layers in the same change: implementation, DS, FS, HTML technical narrative,
automated tests, and relevant evaluation evidence. Documentation cannot claim an assurance or optimization absent from
code and tests.

## Operational diagnostics

Diagnostics use stable families for CLI, storage, context, ontology, LongText, circuit, planning, runtime, assurance,
benchmark, and generation. They name the owning layer. Human messages include the next safe action and a bounded source
or authority reference where useful.

`serious_issues.md` contains only concrete remaining implementation or guarantee gaps. It is not a roadmap of already
implemented architecture. A limitation remains there until an executable test demonstrates closure and documentation is
updated.

## Current guarantee boundary

Implemented guarantees cover finite immutable LongText snapshots, typed terms/patterns, exact spans, four-valued
absence, deterministic plan/provider selection, hierarchical SSA publication, atomic semantic transactions, bounded
native engines, typed contexts, isolated training/task workspaces, and immutable promotion.

The runtime does not claim a complete JavaScript static analyzer, universal ontology, full first-order theorem prover,
general SMT solver, unrestricted natural-language parser, or proof that Codex faithfully understood authority/source.
Abstract and symbolic precision is bounded by registered primitives and summaries. Parallel scheduling, advanced query
optimization, and cross-snapshot invalidation must be described only to the extent implemented and measured.

# Decisions & Questions

### Question #1: Why keep one convenience `nllagent` binary in addition to separate binaries?

Response: Existing use cases can use one entry point, while automation can grant distinct train and analyze commands.
Both dispatch to the same contracts and do not reintroduce a combined learning runtime.

### Question #2: Where is the machine-readable output if JSON is prohibited?

Response: In reimportable opaque-value `.mjs` modules. Stdout and Markdown are human/operator views.

### Question #3: Does `benchmark` retrain an agent?

Response: No. It runs frozen benchmark artifacts against a selected accepted build. A new training run is explicit.

### Question #4: How does an operator know which build produced a result?

Response: The task pin, result, trace, and report all include agent/build/context/source identities. Analysis resolves the
selection before Codex materialization begins.

### Question #5: What is the acceptance criterion for an architecture claim?

Response: It must have executable implementation, a focused test, and—when business-facing—a realistic evaluation or
documented bounded counterexample. Prose alone is not implementation.
