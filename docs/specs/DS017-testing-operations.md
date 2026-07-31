---
id: DS017
title: Isolation, Security, Effects, and Change Control
status: implemented
owner: nllAgent maintainers
summary: Defines trust zones for authority, Codex-generated modules, accepted builds, task sources, runtime effects, paths, budgets, and immutable promotion.
---

# Introduction

Internal JavaScript DSLs are intentionally expressive, so safety comes from process and capability boundaries rather
than pretending generated JavaScript is harmless data. Training, analysis generation, accepted execution, and human
reporting occupy different trust zones.

# Core Content

## Trust zones

Authority Markdown is intentional training input but can still contain mistakes. Task Markdown is untrusted source
data. Codex instructions come only from the role skill and compiled context; text inside authority or task documents is
quoted source, never host instruction. Generated modules are untrusted until validation. A promoted immutable build is
trusted only within its pinned Node/runtime/SDK contract.

The deterministic runtime never loads a training or review skill and has no Coding Agent capability. It receives one
accepted AgentProject, one validated LongTextProgram, explicit tools where allowed, and resource budgets.

## Filesystem and module loading

Every candidate and task has an explicit root. Resolved reads/writes must remain beneath that root or an enumerated
read-only SDK root. Symlinks and path traversal are rejected. Semantic source files use `.mjs`; human inputs/reports use
Markdown. Candidate validation rejects JSON/TypeScript semantic artifacts and unexpected executables.

Training modules may import pinned SDK paths and candidate-local modules. Analysis LongTextJS is stricter: generated
task modules may not import arbitrary packages or agent internals. The isolated loader supplies the approved ontology
constructor environment and validates the exported LongTextProgram. Import-time side effects are prohibited for
accepted project modules.

## Runtime effects and transactions

Declarative nodes have known read/write effects. Procedural macro-nodes declare concepts read, terms written, outputs
emitted, tools called, and subcircuits requested. ExecutionContext observes actual access. Undeclared effects fail the
node and discard its semantic buffer.

Each node follows `CREATED → READY → RUNNING → PRODUCED → VALIDATED → COMMITTED`, with cached, blocked, failed, or
cancelled terminal alternatives. Derived terms and outputs are buffered until type, provenance, layer, evidence, and
duplicate checks pass. A thrown error publishes no partial semantic state.

Independent nodes may run concurrently only when their dependency and effect sets allow it. Publication order is
canonical; last-writer-wins is forbidden. Incompatible derivations remain conflict or activate an explicit resolution
circuit.

## Budgets and external capabilities

Limits cover process time, output bytes, generated files, source spans, circuit nodes, dynamic instances, iterations,
query results, constraint work, rewrite saturation, synthesis candidates, and report size. Hitting a semantic execution
budget yields `BLOCKED_RESOURCE`. Hitting a Codex workspace limit fails the training or materialization run; it never
becomes “no finding.”

Accepted circuits may use explicitly injected deterministic tools. Tool identifier, version, inputs, output artifact,
effect classification, and replay policy are traced. This architecture contains no AchillesAgentLib and no direct LLM
adapter. Codex is invoked only by the host training or analysis workflow.

## Promotion and change control

A candidate passes structural checks, unit tests, semantic benchmarks, skill context validation, independent review,
and final pack validation before promotion. Promotion copies or renames a fully validated immutable tree and atomically
updates `current/agent.mjs`. It never edits the prior build.

Changes to authority, ontology, circuit, SDK dependency, provider pins, materialization profile, or benchmark oracle
create a new build identity and invalidate downstream gates. Existing tasks retain the old pin. Deletion or retention
of old builds is a separate administrator action and cannot occur as a side effect of analysis.

## Secrets and diagnostics

Subprocess environments are allowlisted. Reports and trace avoid dumping environment variables, tokens, or arbitrary
binary output. Diagnostics quote only bounded relevant excerpts. Codex command paths and versions may be recorded; API
credentials never are.

# Decisions & Questions

### Question #1: Why allow full JavaScript at all?

Response: Real semantic algorithms need ordinary control flow. Process isolation, opaque store values, explicit
effects, atomic transactions, and acceptance tests create the enforceable boundary.

### Question #2: Is an accepted build universally safe?

Response: No. It is accepted for the pinned runtime and validated capability set. It still runs with least privilege and
budgets.

### Question #3: Can task text instruct Codex to edit a circuit?

Response: No. Task text is mounted as source data, the analysis skill owns only LongText outputs, and the host rejects
cross-root writes.

### Question #4: Why is an execution error separate from unknown?

Response: Unknown is a semantic information state. Execution error is a software or tool failure and must be repaired,
not interpreted as evidence about the document.

### Question #5: Are cache files authoritative artifacts?

Response: No. They are reconstructible optimizations and may use an internal encoding. All durable semantic authority
remains in `.mjs` and Markdown.
