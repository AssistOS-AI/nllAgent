---
name: nll-review-and-repair
description: Independently inspect an nllAgent project for ontology, materialization, circuit, runtime, CNL, benchmark, and provenance errors, then repair the authoritative layer.
---

# Review and repair an nllAgent project

## Goal

Find category mistakes and semantic shortcuts that passing happy-path examples can conceal, then repair the layer that
owns the broken contract.

## Workflow

1. Read authority, DS contracts, serious issues, agent assembly, and benchmark expectations independently.
2. Inspect ontology identities, hidden contextual behaviors, role types, and derived-versus-observed boundaries.
3. Inspect anchors, scope, negation, identity merging, alternatives, and coverage claims in LongTextJS.
4. Inspect unbound variables, absence without closure, evidence-free outputs, status collapse, and direct index access in
   circuits.
5. Trace every output backward to rules, bindings, terms, and source spans.
6. Run close negatives and semantic mutations.
7. Repair ontology, materialization, circuit, runtime, CNL, or benchmark according to ownership; never patch a
   downstream symptom with string matching.
8. Rerun repository checks and document the cause and changed guarantee.

## Completion gate

All findings are resolved or recorded as explicit blockers with reproducible evidence, and the full test, benchmark,
documentation, and repository-format checks pass.

