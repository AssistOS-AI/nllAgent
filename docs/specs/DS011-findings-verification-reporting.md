---
id: DS011
title: CNL Audits, Findings, Verification, and Reports
status: accepted
owner: nllAgent maintainers
summary: Defines CNLAuditReport, audit observations, finding shape, verifier kernel, guarantees, Markdown rendering, conflicts, and review feedback.
---

# Introduction

Audit is one of the two primary CNL modes. Validation circuits inspect an existing source and publish verified findings; the runtime assembles those findings and the run boundary into canonical `CNLAuditReport`. Its prose must remain inside the claims established by the source, circuit, witness, and verifier.

# Core Content

## Finding contract

A finding must include identifier, verdict, rule, source authority references, subject, scope, main anchor, support anchors, premises, derivation path, witness, verifier result, certificate, guarantee level, severity, remediation, limitations, circuit, release, source digest, and review state. Rule-specific finding schemas may extend but not remove these audit fields.

Verdicts include violation, compliant, not-applicable, undetermined, ambiguous, unsupported, policy-conflict, and informational suggestion. A compliant finding requires explicit positive satisfaction or sufficient coverage for the relevant negative premises; an empty finding list is not automatically a compliance certificate.

## CNL/Audit-1 contract

`CNLAuditReport` schema version 1 is the canonical output of audit mode. It must contain `dialect: CNL/Audit-1`, `profile: audit`, agent, release, selected foundation descriptor, source digest, terminal status, compatibility, coverage, `auditObservations`, original findings, conflicts, limitations, and an issue when one exists. Each `CNLAuditObservation` projects one verified finding into an explicit natural-language audit statement plus rule, circuit, verdict, severity, subject, scope, evidence anchors, rule basis, guarantee, verifier result, certificate, remediation, and limitations.

The audit object may express correctness, compliance, quality, ambiguity, missing evidence, or inability to complete the audit, according to the released circuits. It is not restricted to violations. A stopped `CNLAuditReport` is a valid audit artifact but never means compliance.

## Verifier kernel

Platform verifiers must be small, deterministic where possible, independently tested, and registered outside agent-editable circuit packages. A verifier receives canonical source, typed premises, witness, and policy. It returns `accept`, `reject`, or `inconclusive` with checked properties and diagnostics. It must not repair the witness or generate a replacement finding. When completeness is material, it independently enumerates the relevant evidence from the canonical LongTextJS program rather than trusting the witness to list every occurrence or intervening transition.

Standard verifier families include exact lexical anchor, structural relation, numeric conversion, interval relation, state trace replay, obligation timeline, closed-world coverage, solver witness replay, composite certificate, and explanation-claim containment.

## Guarantees

Supported public levels are `mechanically-certified`, `evidence-certified`, `model-judgment`, `human-confirmed`, and `review-required`. Composition preserves the weakest material premise. `human-confirmed` records the reviewer and exact accepted object; it does not retroactively make the extraction mechanical, and a mechanical result cannot substitute for a policy contract that explicitly requires human confirmation.

## Explanation envelope

The envelope must contain only the finding statement, rule summary, authority anchor, main evidence, support evidence, reasoning edges, evaluated exceptions, guarantee explanation, limitation, and approved remediation options. A deterministic renderer is preferred. If a model verbalizes the envelope, a claims checker must establish that every material statement maps to envelope content.

When a candidate originates from a normalized query or decision table, the envelope and trace also retain stable query, table, row, hit-policy, coverage-domain, coverage-token, and dependency-envelope identities. The experimental implementation records these facts in `QueryResult`, `DecisionTableResult`, `QueryDecisionWitness`, verifier certificate, generated source map, and logical scheduler trace. A dedicated high-level CNL renderer for those records remains future work. Physical node fusion, indexing, or renaming must not remove the route from a rendered result to its authority row, selected domain, evidence, verifier, and benchmark family.

## Markdown rendering

`report.md` is a deterministic human-readable view of `cnl-audit.json`. It must include agent, release, foundation selection, source digest, terminal status, compatibility summary, coverage summary, active and blocked circuits, findings grouped by severity and rule, and each finding's identifier, circuit, subject, scope, verifier, certificate, support anchors, exact quote and location, rule basis, explanation, guarantee, limitation, and remediation. Coverage rendering must identify its verification method. Stopped and limited reports must enumerate unmet obligations and related issue identifiers. Reports must avoid absolute local paths and secrets.

The report must be stable enough for benchmark comparison. Volatile run identifiers and timestamps belong in an audit subsection that benchmark normalization may remove. The default report should remain useful without opening JSON artifacts.

## Review and conflict

Review feedback must target an anchor, observation, identity, scope, rule, exception, severity, remediation, explanation, or entire finding. It records actor, role, authority, decision, reason, and run. Duplicate findings are normalized before publication. Conflicting verified results for the same rule, subject, and scope must remain visible, be persisted in `conflicts.json`, produce `review-required-conflict`, and create a learning issue; the renderer must not select one silently.

# Decisions & Questions

### Question #1: Can a model-written explanation be the only report artifact?

Response: No. The structured finding and explanation envelope are authoritative. Model prose is optional rendering and must pass claim containment.

### Question #2: What should a report say when no rules find a violation?

Response: It states that no findings were produced by the named active circuits over the stated coverage. It says “compliant” only when the release contains an explicit compliance circuit and its verifier accepts the corresponding witness.

### Question #3: Are reports immutable?

Response: The report inside a terminal run is immutable. A review creates feedback and possibly a superseding report revision or a new run; it does not rewrite the original evidence.

### Question #4: Why may a verifier inspect more than the supplied witness?

Response: A witness is produced by the candidate-generating path and may omit inconvenient evidence. Lexical and state verifiers therefore reconstruct the complete relevant occurrence or transition set from the canonical program before accepting completeness-dependent claims.

### Question #5: When may a realized text be called conformant?

Response: Only after the optional realization is ingested as untrusted source, every required validation circuit completes, trusted verifiers accept the relevant witnesses, and no finding or conflict remains. The CNL plan and planning-circuit verifier certify plan structure, source binding, and provenance, not the quality or conformance of a later realization.

### Question #6: Why call the linter result CNL?

Response: The audit is a controlled natural-language artifact produced from verified circuit outputs. It is the audit profile of the same output family whose specification profile is `CNLGenerationPlan`. This naming does not move rules into CNL: CircuitJS remains the authority and executable method, while `CNLAuditReport` states what that method established about one source.

### Question #7: Should a report explain a decision table by printing its physical graph?

Response: Not by default. The stable explanation names the query domain, authority row, evaluated condition, unknowns, evidence, coverage, verifier, and publication decision. The source map exposes physical nodes for debugging without making generated node topology the user-level meaning.

# Conclusion

Findings are proof-carrying audit inputs, `CNLAuditReport` is the canonical audit product, and Markdown is its faithful rendering. Verification and guarantee levels remain explicit instead of being hidden by fluent prose.
