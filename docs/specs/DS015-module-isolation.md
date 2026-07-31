---
id: DS015
title: Semantic Benchmarks, Agent Evaluation, and Performance Qualification
status: implemented
owner: nllAgent maintainers
summary: Defines executable business benchmarks, independent Codex forward tests, mutation requirements, agentsEval evidence, and performance reporting.
---

# Introduction

Unit tests establish implementation mechanics; they do not establish that a coding role can build and use a meaningful
agent. Qualification therefore combines kernel tests, semantic benchmarks, mutation tests, and forward evaluations in
which fresh Codex roles use the published skills and SDK on medium-size business material.

# Core Content

## Benchmark artifact

A benchmark case is executable `.mjs` plus source Markdown. It names the selected input, expected typed outcomes,
required or forbidden findings, evidence spans, interpretation status, assurance, and trace properties. Expected output
is never JSON and never only a prose string. The runner constructs LongTextJS or imports the fixed program, executes the
same circuit runtime as analysis, and compares semantic identities.

Circuit benchmarks fix materialization when isolating a rule implementation. Full-agent benchmarks start with source
Markdown and require the analysis role to create LongTextJS. Both types are necessary: otherwise a correct circuit can
be blamed for a bad materialization or the real source-to-result workflow can remain untested.

## Mandatory case matrix

Every applicable rule family covers a normal nonfinding case, a clear finding, valid exception, incomplete exception,
missing information, exact-boundary values, open and closed coverage, negation scope, ambiguity, conflict, and ontology
or capability blocker. Evidence assertions verify that the right passages—not merely the right status—caused the result.

Four-valued decisions need row coverage. Recursive relations need base, multi-hop, cycle, and duplicate cases.
Normalization needs equivalent and deceptively similar non-equivalent terms. Generation needs successful and rejected
round trips. Procedural stages need effect-drift and atomic rollback tests.

## Mutation testing

Meaningful mutants invert a comparator, delete an exception, promote a proposed claim, fabricate closure, merge two
identities, flatten negation, change a role, remove evidence, alter a provider, or weaken a CNL critical slot. A mutation
score counts only mutations that change the intended theory. Surviving relevant mutants block an accepted critical
RulePack or are recorded with a justified noncritical limitation.

The benchmark oracle is not automatically rewritten after a mutant or implementation failure. An independent review
must trace any proposed oracle change back to the authority span.

## `agentsEval` forward evaluations

The repository contains four or five business scenarios under `agentsEval/`. Each has authority material and analysis
input of roughly four to five rendered pages, a generated trained build, task-local LongTextJS, benchmark/test evidence,
runtime output, trace, and a Markdown evaluation report. Scenarios exercise different method compositions rather than
copying one toy rule with renamed nouns.

Fresh subagents are used as Codex forward tests. A training subagent must read the actual `nll-train-agent` skill and
produce code from theory. An analysis subagent must use `nll-analyze-task` and the exact compiled context. A reviewer
uses `nll-review-and-repair`. The root integrator runs host validation and deterministic execution. Failed attempts and
repairs are valuable evidence and remain summarized in the evaluation report.

`agentsEval` is qualification evidence, not a second runtime data root. Production-like CLI integration tests create a
temporary environment with the same `agents/` and `tasks/` contract.

## Metrics and performance

Reports record source size, term/claim count, circuit instances, execution nodes, query matches, cache hits, abstract
iterations, constraint or relation work where used, Codex wall time when measured, deterministic runtime wall time, and
peak process memory where available. Performance comparisons pin Node version, build, source, and assurance profile.

The key separation is generation cost versus execution cost. Codex may take materially longer to author or materialize;
replaying accepted LongTextJS through frozen circuits should be deterministic and comparatively cheap. A performance
claim must state which phase it measures.

Incremental tests modify one source passage and compare invalidated values with the actual dependency descendants.
Order-independence tests permute fact publication. Resource-budget exhaustion produces an explicit blocker and is not
counted as a semantic pass.

## Test layers and gates

Kernel unit tests cover opaque values, ontology, query, truth, engines, execution graph, transactions, and context.
Integration tests cover CLI, workspace isolation, training promotion, task pinning, generated module loading, reports,
and native tools. Semantic use cases cover business meaning. `agentsEval` proves the skills can be used by fresh coding
roles on nontrivial inputs.

An accepted repository change runs syntax checks, `node --test`, native module checks, documentation/link checks,
selected `agentsEval` replays, and diff whitespace checks. A failed forward generation need not make deterministic unit
tests flaky; frozen accepted evaluation artifacts provide regression replay, while explicit reruns measure Codex
reproducibility.

# Decisions & Questions

### Question #1: Why are medium-size documents required?

Response: Tiny fixtures do not exercise chunking, cross-section identity, temporal links, exact offsets, or the context
discipline that motivates LongTextJS.

### Question #2: Is a passing final status enough?

Response: No. Evidence, trace, interpretation, coverage, and assurance must match. Correct output for the wrong premise
is a failed benchmark.

### Question #3: Must every test call Codex live?

Response: No. Deterministic CI replays frozen generated artifacts. Explicit forward-evaluation runs call fresh coding
roles and record their versions and timing.

### Question #4: How are performance regressions judged?

Response: Against pinned scenario phase metrics and budgets, with generation and deterministic execution reported
separately. A single wall-clock number is not meaningful.

### Question #5: May `agentsEval` contain hand-authored corrections?

Response: Yes, only when the repair was performed through the review skill and the report records the diagnostic and
changed layer. Unrecorded polishing defeats the forward test.
