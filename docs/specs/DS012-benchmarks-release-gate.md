---
id: DS012
title: Benchmarks, Counterexamples, and Release Qualification
status: accepted
owner: nllAgent maintainers
summary: Defines Markdown microcases, expected layers, holdout suites, semantic evaluation, metamorphic and mutation testing, metrics, semantic diff, and release qualification.
---

# Introduction

Benchmarks define the operational meaning of observations and rules. They must be strong enough to reject a plausible but incorrect circuit, not merely demonstrate examples that the circuit already handles.

# Core Content

## Planning qualification

The gate compiles every `planningCircuits` entry with the same restricted loader, registry linking, budget checks, dominance analysis, authority mapping, and producer alignment used for validation circuits. It requires a trusted CNL-plan construction and verification path, checks every claimed applied rule against the authority map, and requires every applied rule to have a declared plan-location witness. Repository acceptance tests prove idea grounding, plan structure, plan-only operation, optional bounded repair, canonical CNL audits, and final reuse of validation oracles. The current release gate does not yet discover and execute an agent-owned idea-to-plan or realization-quality benchmark, so its qualification report must not claim model realization or repair quality.

## Agent benchmark layout

Each executable case must live in an agent-owned regular directory and include regular `input.md`, `expected.md`, `expected.json`, and `case.json` files. Symbolic links and incomplete case directories are rejected. Its metadata kind is `NaturalLanguageLinterBenchmarkCase`. Case identifiers must be unique across suites. A case may also include approved observations, context-envelope metadata, transformation lineage, and fixture context. The expected Markdown is the human-readable contract. `expected.json` provides the required observation and circuit layers. `case.json` identifies the rule, family, validation state, comparison mode, and optional semantic rubric.

Cases are divided into public, development, holdout, scenarios, adversarial, metamorphic, and mutations groups. These are workflow categories inside the agent folder. A learning prompt can omit holdout cases when useful, but the repository does not claim that folder names provide secrecy or confidentiality. The runner discovers each group independently and the release policy may require named groups.

## Expected layers

Every qualified microcase must define the expected LongTextJS layer and expected CircuitJS or terminal behavior. The observation layer covers anchors, types, polarity, modality, identity, scope, status, and coverage. The circuit layer covers findings, exceptions, ambiguity, non-applicability, or refusal. End-to-end Markdown comparison is required but cannot replace layer diagnostics.

The local runner first checks structured terminal status, compatibility status, finding count, rule identifiers, verdict, severity, guarantee, main quote, observation type and payload fields, and coverage assertions. Report comparison can be `exact`, `structured`, or `semantic`. Exact mode normalizes line endings and trailing whitespace. Structured mode treats layer assertions as authoritative. Semantic mode asks an evaluator to compare status, observations, rules, scope, findings, coverage, evidence, and guarantees rather than score surface similarity. A missing expected layer fails qualification rather than silently reducing the case to a prose snapshot.

## Case families

Each rule must have positive, close-negative, boundary, scope, exception, ambiguous, and coverage cases where those categories apply. Distributed rules require long-range scenarios. Translation-sensitive producers require instruction-like source content, Unicode, negation, modality, reported speech, ambiguous identity, invalid quote, partial output, and resource-exhaustion cases.

Generated contrastive cases must declare the controlled transformation and expected metamorphic relation. Model-generated cases remain candidates until mechanically derived, model-agreed under a recorded protocol, or human-confirmed. Contested cases test ambiguity handling and do not count as binary oracles.

## Semantic evaluation and independence

Semantic comparison runs at least two perspectives: an equivalence evaluator that identifies material agreement and a counterexample evaluator that tries to demonstrate a meaningful mismatch. The evaluator uses the same backend-neutral request boundary as extraction. Configured Achilles uses `LLMAgent` with Spark preference; a Coding Agent adapter can produce the same evaluation schema when selected. Evaluator disagreement fails or routes the case to review according to case policy.

The benchmark service should measure lexical and structural duplication between suites and group semantically equivalent transformations into families. A superficial paraphrase of a public case is not strong independent evidence. Independence here is a test-design property: varied source wording, authors, structures, scopes, and failure paths matter more than a directory label.

## Qualification

The gate must apply checks lexicographically:

1. artifact completeness, schemas, source anchors, module restrictions, and replay-verifier tests;
2. static CircuitJS analysis and ontology producer-consumer alignment;
3. zero-tolerance critical-rule regressions and required per-rule families;
4. mutation score, metamorphic properties, and long-document scenarios;
5. compatibility, coverage, abstention, and conflict behavior;
6. precision, recall, false-positive rate, false-negative rate, review time, cost, latency, and circuit complexity.

A later score cannot compensate for an earlier failure. Qualification produces a local report, semantic diff, impact map, known limitations, derived observation contracts, producer-consumer alignment, and activation eligibility. Candidate files and benchmark cases are snapshotted before and after execution; the release contains the tested candidate, the exact natural cases, and their structured results. File digests also detect changes between qualification and activation; no package-signing mechanism is required. Candidate artifacts cannot alter the gate implementation or thresholds.

## Mutation and differential testing

Mutations include removed exceptions, inverted comparisons, changed constants, weakened scope, lost negation, forced identity merge, false closed-world coverage, bypassed verify, changed priority, and unbounded search. The suite must kill material mutants. Differential tests compare release versions, alternative circuits, independent deterministic oracles, model profiles, and solver/verifier pairs.

## Metrics

Metrics must be per rule, observation type, document profile, guarantee, and terminal state. The gate must measure abstention and compatibility separately so a candidate cannot improve apparent accuracy by refusing more documents. Circuit complexity, number of local exceptions, model calls, and formalization effort are first-class measures.

# Decisions & Questions

### Question #1: Why require `expected.md` when structured expected data is easier to compare?

Response: The user requires natural Markdown input and expected result examples. Human-readable expected reports preserve the real user contract. Structured assertions provide diagnostic precision without replacing that contract.

### Question #2: What does holdout mean in a local agent folder?

Response: It means a particular synthesis prompt or comparison run intentionally does not use those cases. It is an experimental split for testing generalization, not a claim about privacy. The qualification report names every suite it actually executed.

### Question #3: May learning update a failing expected result?

Response: Only when an authorized policy decision changes the oracle. That produces benchmark versioning and semantic diff. A candidate may not edit expectations merely to pass.

### Question #4: What does the local release gate honestly certify?

Response: It records static CircuitJS linking and verification dominance, compatibility-profile validation, structured outcomes for every suite executed, benchmark-policy coverage, replay-verifier results, local file digests, and the semantic diff. It does not claim mutation, live-model, or human-adjudication checks when those checks were not run.

### Question #5: May an LLM decide whether a semantic benchmark passed?

Response: Yes. Some expected reports cannot be compared usefully as exact text. The evaluator must follow a versioned rubric, return structured reasons and material differences, run multiple perspectives, and preserve the model/backend capture. The result is an evaluation decision, not a mechanical proof.

### Question #6: Is a natural case stored under `benchmark/mutations` equivalent to generated circuit mutation testing?

Response: No. The directory lets agents preserve natural cases aimed at known mutant classes and lets policy require that suite. True mutation qualification must generate or load mutated CircuitJS/LongTextJS artifacts, execute them, and calculate which material mutants the suite kills. Until that execution exists, the qualification report must not claim a mutation score.

### Question #7: How are planning capabilities qualified?

Response: Qualification compiles planning circuits, checks producer alignment and dominance, validates applied rule identities and authority references, requires complete rule-to-plan location witnesses, and freezes the graphs. The offline suite covers idea-to-plan grounding, the absence of a CNL constraint ledger, invalid plan-location rejection, plan-only execution with no backend, optional realization failure and repair, and final CNL audit reuse. An agent-owned planning benchmark with expected CNL layers and a separate realization benchmark with qualified captures remain required before empirical plan-quality or realization-success claims; the current gate makes neither claim.

### Question #8: Is the benchmark kind merely presentation text?

Response: No. `NaturalLanguageLinterBenchmarkCase` is validated before execution and is part of the snapshotted qualification evidence. A misspelled or historical authoring kind fails the current gate instead of being silently normalized.

# Conclusion

Qualification is an adversarial, layered program that protects meaning and prior behavior. Markdown benchmark cases are both executable tests and the operational definition of each agent's theory.
