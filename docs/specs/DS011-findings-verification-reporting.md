---
id: DS011
title: Findings, Verification, Trace, and Reporting
status: implemented
owner: nllAgent maintainers
summary: Defines semantic statuses, assurance, evidence, verifier boundaries, trace fidelity, executable result modules, and Markdown reports.
---

# Introduction

A result is useful only when a reviewer can traverse it back to source, interpretation, computation, and verification.

# Core Content

Findings are ontology terms with type, message, severity, evidence, assurance, and provenance. Every source-dependent
finding requires exact anchors or a versioned external artifact. Derived facts retain producer and input dependencies.
Assurance values distinguish mechanical, cross-checked, model-assisted, heuristic, and unverified work.

Rule statuses include `SATISFIED`, `VIOLATED`, `NOT_APPLICABLE`, `ACCEPTED_EXCEPTION`, `UNKNOWN`, `CONFLICT`,
`BLOCKED_ONTOLOGY`, `BLOCKED_CAPABILITY`, `BLOCKED_RESOURCE`, and `ERROR_EXECUTION`. They are not interchangeable with
four-valued predicate logic or node lifecycle states.

Trace records node creation, queries, bindings, tasks, model artifacts, candidate production, validation, commit,
failure, and output. The compact Markdown report shows the result and evidence. `result.mjs`, `program.mjs`, and
`run.trace.mjs` preserve structured values through public constructors and can be reimported.

# Decisions & Questions

### Question #1: May a model write the explanation?

Response: It may verbalize a bounded explanation envelope. It cannot add premises, authority, or coverage absent from
the trace, and the underlying structured explanation remains authoritative.

### Question #2: What does mechanical assurance certify?

Response: Only the declared parse, algorithm, invariant, and verifier result. It does not certify that a source claim is
true in the external world.

### Question #3: Why persist both result source and Markdown?

Response: The module supports programmatic replay and typed inspection; Markdown is the user contract. Neither is a
lossy serialization of an unacknowledged hidden format.
