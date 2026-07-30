---
id: DS012
title: Benchmarks, Mutations, and Architecture Experiments
status: implemented
owner: nllAgent maintainers
summary: Defines executable benchmark cases, expected semantic terms, mutation requirements, metrics, and experiment decisions.
---

# Introduction

Benchmarks define the operational meaning of an agent and protect both verdict and reasoning structure.

# Core Content

Each case contains `input.md`, `case.mjs`, optional `expected.mjs`, and explanatory Markdown. Expectations use opaque
benchmark constructors such as `findingCount`, `containsFinding`, and `excludesFinding`. Circuit-focused cases may
provide fixed LongTextJS. Coding Agent cases may require generating the full ontology/materialization/circuit project.

Every material rule family needs conforming, violating, exception, insufficient, open/closed scope, ambiguity,
conflict, and ontology-blocked cases where applicable. Measurements separate decision accuracy, evidence quality,
ontology coverage, ambiguity preservation, trace fidelity, deterministic replay, incremental reuse, controlled-language
round-trip, blocked-case correctness, and mutation score.

Semantic mutation changes comparators, exceptions, polarity, coverage, identity, status, priority, evidence, or
verification routes and runs the unchanged expected programs. An expected result cannot be edited to let a mutant pass.

The five architecture experiments under `experiments/architecture/` are permanent executable regressions for hybrid
identity, behavior boundary, lazy alternatives, exact model reuse, and controlled-language equivalence.

# Decisions & Questions

### Question #1: Why are architecture experiments part of validation?

Response: The selected decisions were empirical responses to concrete counterexamples. Retaining those programs
prevents a later refactor from reopening the problem accidentally while prose still claims it is settled.

### Question #2: Does a passing demonstration imply statistical quality?

Response: No. Repository tests establish implemented mechanics and named fixtures only. Accuracy or model-quality claims
require a declared corpus, adjudication process, confidence interval, and recorded result.

### Question #3: What replaced the publication gate?

Response: Direct project checks, benchmarks, mutation runs, documentation verification, and an experiment report. The
repository does not create a release artifact merely to record those checks.
