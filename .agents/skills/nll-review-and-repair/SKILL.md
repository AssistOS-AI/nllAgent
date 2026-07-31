---
name: nll-review-and-repair
description: Independently review and repair a trained nllAgent candidate or one task-local LongTextJS program by tracing authority, ontology, materialization profile, circuits, evidence, coverage, assurance, tests, benchmarks, and runtime outputs. Use after training, after task materialization, on semantic diagnostics, or when a benchmark/oracle conflict is suspected. Repair only the layer with semantic authority and never weaken expected results to hide a defect.
---

# Review and repair semantic programs

Act as an independent reviewer. Reconstruct the contract from authority and executable artifacts; do not trust the
author's handoff or a green exit code.

## Required inputs

Read `request.md`, the selected `context/agent-context.*` with purpose `REVIEW`, and the complete candidate or task
slice. Then read:

- [category-boundaries.md](references/category-boundaries.md) for authority ownership;
- [trace-assurance-and-mutations.md](references/trace-assurance-and-mutations.md) for review evidence;
- [diagnostic-routing.md](references/diagnostic-routing.md) before applying a repair.

Run `node .agents/skills/nll-review-and-repair/scripts/check-context.mjs context/agent-context.mjs` first.

## Review procedure

1. Map every authority clause to RuleAnalysis, architecture-plan step, materialization requirement, circuit path, and
   benchmark intention. Flag unmapped or invented meaning.
2. Inspect OntologyJS for duplicate identities, invalid role/cardinality boundaries, contextual rules hidden as
   behaviors, and findings modeled as source observations.
3. Inspect LongTextJS for invalid spans, flattened negation, premature identity merge, collapsed alternatives,
   fabricated coverage, rule conclusions in observation code, and missing gaps.
4. Inspect CircuitJS for unbound patterns, unknown treated as false, absence without exact closed scope, missing
   evidence, effect drift, hidden physical-store access, uncontrolled custom algorithms, and plan drift.
5. Check that SDK primitives and existing providers were reused where exact. A custom macro-node is acceptable only
   when its typed boundary, effects, trace, and any required summary are explicit.
6. Replay concrete results. Check abstract precision only where planned, symbolic witnesses by concrete replay, proof
   objects through ProofKernel, and synthesized text by concrete validation and CNL round-trip.
7. Run positive, negative, exception, unknown, conflict, ambiguity, boundary, and semantic-mutation cases. Compare
   evidence and trace properties, not only final status.

## Repair authority

For a training candidate, write repaired files only under `generated/`. For a task review, change only task-local
LongTextJS and review notes. Never edit the active trained theory during a task review. Never modify authority source.
Never change an expected result without a separately documented authority re-analysis.

Route repairs by layer: ontology; materialization/profile; architecture plan; primitive/assurance; circuit; benchmark;
integration. If a repair changes an upstream contract, rerun every downstream check and regenerate the agent context.

## Completion gate

Stop only when every reported diagnostic is fixed or retained as an explicit blocker, downstream gates pass, concrete
trace supports each output, semantic mutants are rejected, and `generated/handoff.md` records the inspected evidence,
repairs, commands, timings, and residual limitations.
