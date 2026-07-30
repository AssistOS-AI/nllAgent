---
id: DS002
title: Model Roles, Artifacts, and Replay
status: experimental
owner: nllAgent maintainers
summary: Defines model roles, exact cache identity, artifact acceptance, replay, and guarantee ceilings.
---

# Introduction

Models support translation, bounded evaluation, explanation, and optional realization. They are not the ontology,
database, rule engine, verifier, or final authority.

# Core Content

Every call has a semantic role, source, prompt, ontology identity, evidence policy, interpretation context, model,
adapter, budgets, and accepted output type. `ctx.callModel` captures the complete request and raw output as a
`ModelArtifact`. Raw output does not enter the store. A validator, reviewer, or acceptance circuit must convert it into
a typed claim or generated document.

Replay consumes an accepted frozen artifact. It never silently invokes a model again. Cache reuse requires exact
identity of every semantic dependency; reuse across documents or revisions is forbidden unless the full key is equal.
A fresh inference creates a new artifact even when the request looks similar.

Model-derived premises retain `model-assisted` or lower assurance. A deterministic comparator may certify its own
calculation but cannot promote the premise to mechanical truth. Production translation and repository-editing Coding
Agent work remain separate roles with separate filesystem authority.

# Decisions & Questions

### Question #1: Which cache identity was selected experimentally?

Response: The experiment in `experiments/architecture/model-cache.experiment.mjs` demonstrates a collision when
ontology identity is omitted. The accepted key includes role, source, prompt, model, adapter, ontology, evidence policy,
and context. Only accepted frozen output is replayable.

### Question #2: Does the repository promise one provider?

Response: No. AchillesAgentLib remains an optional peer route and a Coding Agent may implement a bounded role adapter.
Agent circuits depend on the role and artifact contract, not a vendor name.

### Question #3: What is implemented now?

Response: Circuit stages can call named injected model operations and obtain content-addressed artifacts. Full durable
provider capture, replay across CLI runs, and live-profile evaluation remain tracked experimental work.
