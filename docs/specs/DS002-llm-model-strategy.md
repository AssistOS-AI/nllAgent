---
id: DS002
title: Codex-Only Authoring, Artifact Identity, and Replay
status: implemented
owner: nllAgent maintainers
summary: Defines Codex as the only model-facing mechanism, with role-specific workspaces, accepted code artifacts, exact identity, and no direct LLM runtime.
---

# Introduction

nllAgent does not embed a generic model-provider layer. It invokes Codex as a Coding Agent for two bounded authoring
roles: compiling an agent theory and materializing one task. An independent Codex review role may inspect and repair a
candidate. Concrete circuit execution remains model-free.

# Core Content

## Allowed roles

`nll-train-agent` may create or repair a candidate agent theory from trusted authority Markdown. Its output may include
OntologyJS, CircuitJS, architecture plans, materialization profiles, tests, benchmarks, and CNL modules, but only under
the candidate workspace.

`nll-analyze-task` receives one host-generated selected-agent context followed by one untrusted task source. It may
write only task-local LongTextJS and handoff notes. It cannot add constructors, change circuits, change benchmarks, or
emit a finding.

`nll-review-and-repair` is independent of the authoring pass. For training it may repair the candidate in place and
must rerun downstream gates. For analysis it may repair only task-local LongTextJS. It never changes authority text or
weakens an oracle without a separately accepted rule re-analysis.

No circuit stage calls Codex. No AchillesAgentLib or direct model API is resolved by the runtime. Controlled prose is
rendered from CNL frames; any future non-controlled generation must be a new Codex-authored task with frozen input and
must return through LongTextJS before semantic acceptance.

## Workspace capsule

Each invocation receives exactly one role skill. Training receives copied theory files, selected existing agent
context when applicable, a read-only SDK capsule, examples, and deterministic commands. Analysis receives the task
request, the selected build's context, the task source, the analysis skill, and only the imports necessary to construct
LongTextJS. The untrusted task is read only after the host-controlled request and context.

The workspace has no symlinks. Generated files are restricted to `.mjs` and Markdown and must remain below
`generated/`. Candidate imports are checked against explicit roots. The validation process has explicit filesystem
read/write allowances and a time budget. A successful Codex exit is not acceptance; the host loads and validates the
produced semantic values independently.

## Artifact identity

A Codex invocation identity includes role, skill digest, request digest, every input file digest, selected agent build,
ontology identity, circuit identity, MaterializationProfile, SemanticDemand, SDK catalog identity, Codex executable
identity, and relevant validation policy. The raw transcript, stdout/stderr, generated file digests, validation report,
and accepted output identity are persisted in `.mjs` or Markdown.

Replay of an accepted task uses the frozen LongTextJS module and selected build; it does not call Codex again. Reuse
across task revisions is forbidden unless every identity component is equal. Training candidates are never merged by
textual similarity. A new theory source digest creates a new candidate build.

## Acceptance and guarantee ceiling

Training acceptance requires executable RuleAnalysis and plan coverage, ontology checks, circuit/effect checks, tests,
semantic benchmarks, required mutations, provider pinning, and independent review. Analysis acceptance requires exact
span validation, ground-only semantic output, ontology/cardinality checks, context digest agreement, demand coverage or
explicit gaps, and process-isolated execution.

Codex authorship is always visible provenance. Passing deterministic checks establishes only the guarantees those
checks cover. It does not prove that Codex captured every intended nuance. Authority-to-plan mapping and independent
business benchmarks are therefore part of the acceptance evidence.

# Decisions & Questions

### Question #1: Why remove a direct LLM abstraction rather than keep it optional?

Response: Maintaining a second agent runtime would duplicate repository inspection, tool selection, iteration, and
repair while encouraging circuits to outsource semantic decisions. Codex is used where its coding workflow is useful;
the semantic runtime stays smaller and deterministic.

### Question #2: Does Codex analyze the document?

Response: It analyzes source language only to write LongTextJS. The executable judgment is made by the accepted
circuits. This distinction is preserved in files, processes, provenance, and permissions.

### Question #3: Can the analysis role discover another agent in the same environment?

Response: No. The host copies one selected context and build capsule. Environment enumeration and sibling agent roots
are not readable from the task workspace.

### Question #4: Why preserve generated source instead of only the resulting store?

Response: The `.mjs` program is reviewable, repairable, re-executable, and exposes category errors that an opaque store
snapshot would hide. It is the canonical task materialization artifact.

### Question #5: What does deterministic replay mean when the original author was probabilistic?

Response: Replay starts after acceptance. It uses the frozen generated code, source revision, exact agent build, and
runtime version. Re-authoring is a new invocation and a new artifact, not replay.
