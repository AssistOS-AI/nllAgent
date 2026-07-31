---
id: DS003
title: CLI, Environment, Agent Build, and Task Workspace Contract
status: implemented
owner: nllAgent maintainers
summary: Defines separate training and analysis commands, multi-agent storage, immutable builds, task pinning, promotion, reports, and exits.
---

# Introduction

The CLI exposes two primary workflows: compile a persistent agent from theory and analyze a task with one accepted
agent build. Benchmark and inspection commands support those workflows without merging their authority boundaries.

# Core Content

## Commands

The dedicated training entry point accepts an environment root, agent identifier, one or more Markdown theory files,
and the Codex executable. It creates an isolated candidate, invokes `nll-train-agent`, validates the full candidate,
invokes independent review when configured, and promotes the build only on success.

The dedicated analysis entry point accepts an environment root, agent identifier, task identifier, input document,
target, and output report. It resolves and pins the current accepted build, generates the task context, invokes
`nll-analyze-task`, validates LongTextJS in a child process, executes circuits deterministically, and writes the result.
There is no translator selector and no no-Codex analysis fallback. A caller that already owns accepted LongTextJS uses
the lower-level runtime API or replay command, not the document-analysis CLI.

The unified entry point may expose the same `train` and `analyze` operations. `benchmark` evaluates an accepted agent's
own cases. Agent list and inspect commands are read-only. No `learn`, provider-model, release-publication, structured
data output, or compatibility alias is part of the contract.

## Environment layout

The environment root contains independent namespaces:

```text
environment/
  agents/<agent-id>/
    theory/
    builds/<build-id>/
    current/
    training-runs/<training-id>/
  tasks/<task-id>/
    task.mjs
    input/
    context/
    codex/
    longtext/
    trace/
    result.mjs
    report.md
```

An immutable build contains `agent.mjs`, `build.mjs`, accepted theory copies, ontologies, plans, materialization
profiles, circuits, optional primitives and assurance, tests, benchmarks, and the generated agent context. `current/`
is replaced atomically and identifies one complete build. A failed candidate remains under its training run with a
diagnostic report and cannot become current.

`task.mjs` identifies the task, input revision, selected agent, selected build, context digest, target, status, and
artifact references as opaque DSL values. Tasks are never children of an agent directory. Re-running the same task
with a newer agent creates a new task revision or a new task; it does not rewrite the historical pin.

## Training transaction

The host validates agent identifiers and theory paths, copies the sources, builds a deterministic authoring context,
and starts Codex in a workspace that cannot write the active build. Codex produces `generated/`. Host validation runs
module loading, ontology checks, plan checks, primitive/effect checks, circuit composition, tests, benchmarks, mutation
requirements, and pack checks. Promotion copies or renames the validated candidate into a new immutable build and then
atomically updates current. Interruption before the last step leaves the old build active.

## Analysis transaction

The host reads the current pointer once and records its build ID before Codex starts. Context generation fails closed
if the build lacks ontology, circuits, profile, semantic demand, SDK imports, or unambiguous providers. The task input
is copied and never treated as instructions. Only generated `program.mjs` crosses into the validation runner.

The isolated runner constructs a source revision, injects the selected ontology and LongTextJS API, executes the
materializer, publishes the program, evaluates compatibility, and runs the selected circuits. It writes canonical
LongTextJS, result, trace, and Markdown report. Analysis never writes beneath `agents/` and never exposes a Coding Agent
handle to `ExecutionContext`.

## Exit and status behavior

Invalid CLI syntax, path escape, missing agent/build/task, missing Codex output, rejected generated code, failed
training gate, benchmark mismatch, semantic blocker, and runtime error have distinct stable diagnostics. A report may
contain partial completed findings while a required rule is blocked, but a global assessment cannot be successful.
CLI output is short and points to the durable Markdown report; structured durable output remains `.mjs`.

# Decisions & Questions

### Question #1: Why provide separate binaries if a unified CLI can have subcommands?

Response: The dedicated names make permissions, automation, and operator intent unambiguous. They may share parser and
implementation code; the authority boundary is behavioral, not duplication for its own sake.

### Question #2: Why does analysis always invoke Codex?

Response: The public input is natural-language source and the required output is LongTextJS. A hand-written deterministic
materializer is a benchmark fixture or SDK consumer, not the general document-analysis use case requested here.

### Question #3: Why pin at task creation rather than execution completion?

Response: Concurrent retraining must not change the meaning of a running task. The context, generated program,
circuits, and result must all name the same build.

### Question #4: Can training modify the current build in place?

Response: No. It creates and validates a candidate, publishes a new immutable build, and updates current atomically.
This supports audit and avoids partial theory states.

### Question #5: Where do feedback and repair belong?

Response: Task review may repair task-local LongTextJS. A requested theory correction becomes a new training run with
the relevant task evidence attached; it cannot edit an accepted build directly.
