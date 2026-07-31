---
id: DS011
title: Statuses, Findings, Assurance, Trace, and Reporting
status: implemented
owner: nllAgent maintainers
summary: Defines multivalued predicates, rule and technical statuses, finding evidence, assurance ceilings, trace fidelity, partial results, and human reports.
---

# Introduction

A credible natural-language analyzer must distinguish a demonstrated violation from missing information, conflicting
interpretations, an accepted exception, a representational blocker, and a technical failure. These distinctions are
semantic output, not report decoration.

# Core Content

## Predicate and rule values

Predicates use `TRUE`, `FALSE`, `UNKNOWN`, and `CONFLICT`. Unknown means information or coverage is insufficient;
conflict means admitted support is incompatible. Negation preserves unknown and conflict. Conjunction short-circuits
on false; disjunction succeeds on true under the registered four-valued algebra.

Rule outcomes include `SATISFIED`, `VIOLATED`, `NOT_APPLICABLE`, `ACCEPTED_EXCEPTION`, `UNKNOWN`, and `CONFLICT`.
Operational statuses include `BLOCKED_ONTOLOGY`, `BLOCKED_CAPABILITY`, `BLOCKED_RESOURCE`, and `ERROR_EXECUTION`.
`NOT_APPLICABLE` is not general compliance, and a technical failure is not a semantic false result.

Decision tables map predicate values and execution preconditions to these outcomes explicitly. Unhandled input and
incompatible rows remain diagnostics or rule conflict. A report cannot coerce them to the closest user-friendly label.

## Findings and evidence

A finding is a typed ontology output with rule/finding identity, severity, message/frame, status where applicable,
evidence, provenance, interpretation context, and assurance. Every finding has at least one exact source span or one
versioned external evidence artifact. A violation based on absence additionally records the closed coverage evidence.
Conflict retains all materially incompatible anchors. An accepted exception retains both triggering and exception
evidence.

SemanticStore rejects an evidence-free Finding at commit. Circuits may emit nonfinding gaps or technical diagnostics
under their own typed contracts. Presentation severity does not replace semantic status.

## Assurance

`mechanical` means a deterministic implemented check produced the result. `crossChecked` means an independent replay or
implementation agreed. `modelAssisted` identifies unverified Codex-authored or other probabilistic content before
acceptance; accepted LongText observations still preserve Codex provenance. `heuristic` names a bounded documented
heuristic, and `unverified` marks exploratory output.

Runtime assurance flags add specific evidence: analyzed preflight, concretely replayed symbolic witness, local proof
certificate, or validated synthesis/CNL round-trip. An unavailable requested assurance produces a blocker or lower
achieved profile; it never silently applies the label. Concrete execution remains present for ordinary findings.

## Trace

Trace records loaded artifacts, snapshot and context, provider choices, circuit/instance/node lifecycle, query and
match, bindings, predicate evaluation, coverage, primitive and decision use, stage effects, tool artifacts, transaction
validation/commit/rollback, derived terms, outputs, verifier witnesses, blockers, and assurance results. Events use a
monotonic sequence within the run and stable node/value identities.

Compact explanation names rule, outcome, critical reason, and evidence. Structural explanation can reconstruct the
complete path to authority and source. A formatter or Codex-authored prose view cannot add an untraced premise or hide
a blocker.

## Partial and global results

The result separates completed findings, conditional findings, conflicts, blocked rules, and final assessment. An
independent rule may complete when another is blocked. A global summary requiring both is blocked, not successful with
a footnote. Empty findings mean only that no finding was emitted; they do not imply satisfaction unless the requested
assessment circuit explicitly produced that status with adequate coverage.

Durable output is a result `.mjs`, trace `.mjs`, canonical LongTextJS, and Markdown report. The report includes selected
agent/build, task/source revision, status, findings with excerpts, assurance achieved, blockers, and limitations.

# Decisions & Questions

### Question #1: Why emit satisfied and unknown assessments as findings in some agents?

Response: A domain may model every per-record Assessment as an operational output. It should use a typed assessment
concept or clearly typed finding category. The evidence/status contract remains the same; absence of output is never a
substitute.

### Question #2: Can an explanation be generated from a prompt?

Response: A prose renderer may restate an existing trace, but the authoritative explanation is the trace projection.
Any generated sentence is checked against the same premises and cannot receive stronger assurance.

### Question #3: What happens when proof assurance fails for a concrete finding?

Response: The concrete finding remains at its concrete assurance if valid, while the requested certification is
blocked and reported. Proof failure does not automatically refute the business result.

### Question #4: Why distinguish conflict from unknown?

Response: Repair differs. Unknown calls for additional ontology, evidence, or coverage. Conflict calls for preserving
and resolving incompatible admitted support. Collapsing both loses actionable provenance.

### Question #5: May a rule report violation from no matching exception?

Response: Only when the exact exception concept and scope are closed. The trace must show the zero match and closure
evidence. Otherwise the exception predicate is unknown.
