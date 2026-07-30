---
id: DS003
title: CLI and Agent Workspace Contract
status: implemented
owner: nllAgent maintainers
summary: Defines stable CLI use cases, executable agent roots, run isolation, Markdown outputs, and exit behavior.
---

# Introduction

The CLI preserves the familiar file-oriented workflow while selecting executable agent projects rather than data
manifests.

# Core Content

The primary commands are `run`, `plan`, `benchmark`, `learn`, `agent init`, `agent list`, `agent inspect`, `issue list`,
`feedback add`, and `model inspect`. `run` and `plan` accept Markdown and write Markdown. `--data-root` changes the
workspace. `--foundation core|off` defaults to `core`. Translation flags remain role-selection inputs where a configured
agent supports a model.

Legacy structured-output switches, release selectors, publication commands, candidates, and active pointers are not
accepted. This is intentional, not a deprecation period.

An agent name matches `^[a-z][a-z0-9-]{0,62}$`. Its root contains `agent.mjs`, ontologies, LongText materializers,
circuits, CNL dialects, benchmark cases, optional tools/models, durable runs, issues, feedback, and learning workspaces.
One run writes copied input Markdown, `longtext/program.mjs`, `trace/run.trace.mjs`, `result.mjs`, and a Markdown report.
Planning writes the analogous artifacts under `planning-runs/`.

Exit `0` means a completed report or plan. `2` is reserved for configured blocking findings, `3` for semantic
incompatibility, `4` for incomplete coverage, `5` for resource exhaustion, `6` for review-required conflict, `9` for a
benchmark mismatch, `10` for authoring failure, `64` for usage/configuration, and `70` for unexpected runtime failure.

# Decisions & Questions

### Question #1: What was preserved from the previous CLI?

Response: The user-facing audit, planning, benchmark, agent selection, feedback, and learning use cases and their main
long-option invocation style. Storage lineage mechanics tied to the discarded architecture were not preserved.

### Question #2: Why are stopped reports still Markdown?

Response: Shell users must distinguish “no finding” from “analysis could not finish” without importing an internal
module. The structured `.mjs` artifact remains available for programmatic inspection.

### Question #3: May the CLI load an arbitrary module path?

Response: No. It loads the contained `agent.mjs` of the selected workspace. Host applications may compose projects
programmatically, but untrusted document text cannot choose executable code.
