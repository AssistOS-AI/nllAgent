---
name: nll-learn-from-issues
description: Triage NaturalLanguageLinterAgent runtime issues and reviewer feedback, distill minimal authorized reproducers, locate the failing layer, and propose non-regressive candidate repairs. Use only inside a controlled learning job with selected issue records.
---

# Learn from Agent Issues

Turn failures into localized, testable changes without allowing production documents or repeated feedback to rewrite rule authority.

## Required reading

Read selected issues, their run artifacts when authorized, the active release, `docs/specs/DS010-compatibility-coverage.md`, `DS013-learning-coding-agent-skills.md`, `DS014-storage-provenance-incremental.md`, and `DS015-security-governance.md`.

## Workflow

1. Validate issue provenance, affected release, source digest, anchors, reviewer role, and reproduction command.
2. Classify the failure as ingestion, anchor, observation, identity, time, coverage, compatibility, circuit, operator, verifier, explanation, benchmark, or operational context.
3. Compare the failure with `serious_issues.md`. Link an existing issue only when that documented limitation causes the
   reproducer. State whether repair is agent-owned, requires an installed host extension, or needs a protected platform
   or knowledge-pack proposal.
4. Reproduce it with the immutable release before proposing a repair. If it cannot be reproduced, record the missing evidence.
5. Distill the smallest authorized natural Markdown case that retains the failure. Redact only through a declared transformation that preserves the tested property.
6. State one repair hypothesis per candidate change. Prefer the lowest correct layer; do not add circuit exceptions for parser defects. Preserve the selected circuit form unless the issue demonstrates that another supported form is materially simpler or safer; record that form change and its semantic diff explicitly.
7. If the correct layer is protected or unavailable, propose the missing contract, typed inputs and outputs, witness,
   verifier, budgets, expected CNL, and acceptance tests. Keep the candidate blocked or explicitly limited. Never
   simulate identity with name equality, closed-world absence with an empty array, current facts with an unsourced
   constant, or an unavailable algorithm with a callback hidden in CircuitJS.
8. Add the reproducer as a public regression case only when its expected behavior is authorized.
9. Implement the repair in agent authoring or candidate artifacts, then run affected public cases and prior regressions.
10. Analyze impact on compatibility, coverage, guarantees, cost, and other rule families. For binding changes inspect
    types, statuses, matchers, cardinality, and coverage; for query/table changes also inspect joins, unknown flow,
    coverage signature, hit policy, priority, witness, and verifier. Preserve rejected and contested feedback as separate evidence.

## Authority controls

Reviewer authority is scoped. A content reviewer may correct an observation without changing legal or organizational policy. Model feedback is an external suggestion. Changes to precedence, coverage meaning, or a rule outcome require the appropriate rule owner and may require a major release.

## Completion check

Finish with a triage record, linked serious issue when applicable, minimal reproducer or evidence-gap explanation,
explicit repair hypothesis, affected-artifact list, capability-gap status, test results, and remaining risk. Never activate the candidate.
