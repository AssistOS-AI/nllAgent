---
name: nll-build-benchmark
description: Build and strengthen NaturalLanguageLinterAgent Markdown microcases, structured expected layers, contrastive cases, coverage maps, and mutation proposals for a candidate theory. Use during controlled learning and qualification preparation, not during production linting.
---

# Build the Natural Linter Benchmark

Construct tests capable of rejecting a plausible but incorrect theory. Do not rewrite expected outcomes merely to make a candidate pass.

## Required reading

Read `docs/specs/DS006` and `DS007` if present, plus `docs/specs/DS012-benchmarks-release-gate.md`, `DS013-learning-coding-agent-skills.md`, the approved scope, rule cards, circuits, existing benchmark suites, and selected issues.

## Workflow

1. Mine natural Markdown fragments for positive, negative, exception, boundary, ambiguous, coverage, incompatible, and adversarial cases.
2. Minimize each case while retaining all context that determines the observation and finding.
3. Add contrastive variants for negation, modality, reported speech, identity, time, scope, thresholds, and authority where relevant.
4. Store cases under the agent-local `benchmark/public`, `development`, `holdout`, `scenarios`, or `adversarial` suite as appropriate. Each case contains `input.md`, `expected.md`, and `case.json`.
5. Add `expected.json` with structured observation and circuit layers. Keep source observations separate from expected findings. Use `reportComparison: structured` for stable behavior tests and `evaluation.mode: llm` when semantic report comparison is material.
6. Produce a coverage matrix over rules, exceptions, observation types, document profiles, guarantees, and terminal states.
7. Propose CircuitJS and LongTextJS mutations: lost negation, merged identities, false closed-world coverage, removed exceptions, inverted comparisons, changed scope, bypassed verification, and unbounded search.
8. Run available local checks and request qualification for candidates under `candidates/`; qualification runs all agent-local suites through the same runtime.

## Independence and authority

Do not rewrite an expected result merely to make the current circuit pass. Generated cases begin as candidates; label rule, family, validation status, source, and evaluation mode. A production excerpt is calibration evidence, not a new policy. A contested rule should expect ambiguity or review rather than a fabricated binary answer.

## Completion check

Every executable rule must have a positive and close negative case, every exception and coverage-dependent absence must be tested, relevant long-range and adversarial compositions must be present, and the coverage matrix must expose remaining gaps. Use the backend-neutral semantic evaluator through `LLMAgent` with Spark preference when configured; the Coding Agent adapter may satisfy the same evaluation contract in fallback mode.
