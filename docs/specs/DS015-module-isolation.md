---
id: DS015
title: Module Isolation, Effects, and Change Control
status: partial
owner: nllAgent maintainers
summary: Defines source/instruction separation, executable-module trust, process isolation, effect mediation, path safety, budgets, and model acceptance.
---

# Introduction

Real JavaScript DSLs require an honest security boundary. Safety cannot be obtained by renaming a constrained data
expression as a module.

# Core Content

Document Markdown is always untrusted content. It cannot select imports, tools, models, ontology behaviors, circuits,
skills, or policies. Agent modules are executable code and therefore require a trusted project root or a sandboxed
authoring/execution process with an import allowlist, contained working directory, resource limits, and injected
capabilities.

Semantic mutation is protected independently of JavaScript authority. Stages receive public store queries and a
transaction buffer, not mutable indexes or source terms. External effects use `ctx.callTool` and `ctx.callModel`, which
record artifacts and trace. Failed semantic work rolls back atomically.

CLI agent names and paths are contained. Processes use argument arrays and `shell: false`. Secrets are never persisted
in semantic artifacts. Time, node, expansion, model, tool, and memory budgets end in explicit blocked or failed states.

# Decisions & Questions

### Question #1: Is `node:vm` the security model?

Response: No. The language is ordinary ESM. Isolation belongs at worker/process/container and filesystem boundaries,
with explicit imports and capabilities. Semantic transactions provide a second boundary inside the runtime.

### Question #2: What is the current limitation?

Response: The CLI validates contained agent entry modules but imports trusted repository projects in-process. A hardened
untrusted-agent worker with import policy and budgets is not yet implemented and is recorded in `serious_issues.md`.

### Question #3: Can generated model output execute automatically?

Response: No. It is captured as an artifact and requires validation or review. Generated project code belongs in an
authoring workspace and enters execution only after the project trust boundary is deliberately crossed.
