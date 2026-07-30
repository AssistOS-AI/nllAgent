---
name: nll-integrate-experiment
description: Assemble ontology, LongTextJS, CircuitJS, CNL, tools, models, and benchmarks into an executable agent.mjs and verify the complete CLI flow.
---

# Integrate an nllAgent experiment

## Goal

Connect independently authored modules into one executable agent without adding a second manifest or semantic
representation.

## Workflow

1. Inspect and seal every ontology imported by the agent.
2. Assemble `agent.mjs` with materializers, circuits, planning circuits, dialects, and injected capabilities.
3. Validate concept identity and import paths across all modules.
4. Run unit tests and the agent benchmark.
5. Run `run` and `plan` on representative inputs.
6. Reimport the persisted LongText, result, and trace modules.
7. Record implemented guarantees, blocked capabilities, and remaining issues in `experiment-report.md`.

## Completion gate

The CLI use cases execute end to end; persisted modules reimport; results reach source spans through trace; no
capability is implied merely by being named; and the report matches executable evidence.

