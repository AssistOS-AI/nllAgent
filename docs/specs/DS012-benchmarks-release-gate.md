---
id: DS012
title: Benchmarks, Counterexamples, and Manual Publication Checks
status: accepted
owner: nllAgent maintainers
summary: Defines Markdown microcases, expected layers, semantic evaluation, development test families, semantic diff, and the checks run by manual publication.
---

# Introduction

Benchmarks define the operational meaning of observations and rules. They must be strong enough to reject a plausible but incorrect circuit, not merely demonstrate examples that the circuit already handles.

# Core Content

## Planning checks

Manual publication compiles every `planningCircuits` entry with the same restricted loader, registry linking, budget checks, dominance analysis, authority mapping, and producer alignment used for validation circuits. It requires a trusted CNL-plan construction and verification path, checks every claimed applied rule against the authority map, and requires every applied rule to have a declared plan-location witness. Repository acceptance tests cover idea grounding, plan structure, plan-only operation, optional bounded repair, canonical CNL audits, and final reuse of validation oracles. The current command does not discover an agent-owned idea-to-plan or realization-quality benchmark, so its publication record must not claim model realization or repair quality.

## Agent benchmark layout

Each executable case must live in an agent-owned regular directory and include regular `input.md`, `expected.md`, `expected.json`, and `case.json` files. Symbolic links and incomplete case directories are rejected. Its metadata kind is `NaturalLanguageLinterBenchmarkCase`. Case identifiers must be unique across suites. A case may also include approved observations, context-envelope metadata, transformation lineage, and fixture context. The expected Markdown is the human-readable contract. `expected.json` provides the required observation and circuit layers. `case.json` identifies the rule, family, validation state, comparison mode, and optional semantic rubric.

Cases are divided into public, development, holdout, scenarios, adversarial, metamorphic, and mutations groups. These are workflow categories inside the agent folder. A learning prompt can omit holdout cases when useful, but the repository does not claim that folder names provide secrecy or confidentiality. The runner discovers each group independently and the release policy may require named groups.

## Expected layers

Every executable microcase must define the expected LongTextJS layer and expected CircuitJS or terminal behavior. The observation layer covers anchors, types, polarity, modality, identity, scope, status, and coverage. The circuit layer covers findings, exceptions, ambiguity, non-applicability, or refusal. End-to-end Markdown comparison is required but cannot replace layer diagnostics.

The local runner first checks structured terminal status, compatibility status, finding count, rule identifiers, verdict, severity, guarantee, main quote, observation type and payload fields, and coverage assertions. Report comparison can be `exact`, `structured`, or `semantic`. Exact mode normalizes line endings and trailing whitespace. Structured mode treats layer assertions as authoritative. Semantic mode asks an evaluator to compare status, observations, rules, scope, findings, coverage, evidence, and guarantees rather than score surface similarity. A missing expected layer fails the benchmark rather than silently reducing the case to a prose snapshot.

## Case families

Each rule must have positive, close-negative, boundary, scope, exception, ambiguous, and coverage cases where those categories apply. Distributed rules require long-range scenarios. Translation-sensitive producers require instruction-like source content, Unicode, negation, modality, reported speech, ambiguous identity, invalid quote, partial output, and resource-exhaustion cases.

Generated contrastive cases must declare the controlled transformation and expected metamorphic relation. Model-generated cases remain candidates until mechanically derived, model-agreed under a recorded protocol, or human-confirmed. Contested cases test ambiguity handling and do not count as binary oracles.

## Semantic evaluation and independence

Semantic comparison runs at least two perspectives: an equivalence evaluator that identifies material agreement and a counterexample evaluator that tries to demonstrate a meaningful mismatch. The evaluator uses the same backend-neutral request boundary as extraction. Configured Achilles uses `LLMAgent` with Spark preference; a Coding Agent adapter can produce the same evaluation schema when selected. Evaluator disagreement fails or routes the case to review according to case policy.

The benchmark service should measure lexical and structural duplication between suites and group semantically equivalent transformations into families. A superficial paraphrase of a public case is not strong independent evidence. Independence here is a test-design property: varied source wording, authors, structures, scopes, and failure paths matter more than a directory label.

## Manual publication

`nllagent release publish --agent <name> --candidate <version>` is the only MVP publication action. It is started by a maintainer, not by learning. It performs the checks implemented by the repository:

1. candidate manifest and artifact completeness;
2. restricted CircuitJS loading and static verification-dominance checks;
3. authority references and observation producer-consumer alignment;
4. discovery and execution of the agent-owned natural benchmark suites available to the runner;
5. candidate and benchmark snapshot stability;
6. construction and reload of the closed release before the active pointer changes.

Any failed check aborts publication. Success produces `publication.json`, semantic diff, impact map, known limitations, derived observation contracts, producer-consumer alignment, benchmark results, the tested candidate, and the exact natural cases. The command then loads the immutable release and atomically updates the active pointer. No preparatory gate, separate activation phase, or automatic publication exists in the MVP. Candidate artifacts cannot alter the publication implementation or benchmark expectations.

## Mutation and differential testing

Development testing may include removed exceptions, inverted comparisons, changed constants, weakened scope, lost negation, forced identity merge, false closed-world coverage, bypassed verify, changed priority, and unbounded search. Differential tests may compare candidate versions, alternative circuits, independent deterministic oracles, model profiles, and solver/verifier pairs. A natural case placed in `benchmark/mutations/` does not by itself prove that generated program mutations were executed or killed.

A query-first implementation additionally needs row-addressed structural fixtures and executable differential tests. Every decision row should link positive, close-negative, boundary, exception, overlap, ambiguity, and open/closed coverage cases where applicable. The current benchmark path automatically compares reference query/table results with lowered graph query, decision, and verified records and fails on drift. Per-release semantic mutation execution and an independent native engine are not yet present. Any future native query execution must pass randomized comparison against both the reference scan evaluator and the lowered graph.

The platform foundation has its own repository suite for parser boundaries, opposite and exclusive state conflicts, temporal cycles, context separation, verifier forgery, pack identity, and opt-out behavior. Agent benchmarks do not copy those cases merely to prove that the shared pack exists. They add cases only when an agent relies on foundation observations, changes their interpretation through domain rules, or needs an alternative-world policy. A future knowledge pack requires dated positive, stale, boundary, conflicting-source, jurisdiction, fictional-world, and unavailable-pack cases before publication.

## Metrics

When metrics are available, they should be reported per rule, observation type, document profile, guarantee, and terminal state. Abstention and compatibility must remain separate from accuracy so a candidate cannot appear better merely by refusing more documents. The MVP publication command does not claim metrics it did not calculate.

# Decisions & Questions

### Question #1: Why require `expected.md` when structured expected data is easier to compare?

Response: The user requires natural Markdown input and expected result examples. Human-readable expected reports preserve the real user contract. Structured assertions provide diagnostic precision without replacing that contract.

### Question #2: What does holdout mean in a local agent folder?

Response: It means a particular synthesis prompt or comparison run intentionally does not use those cases. It is an experimental split for testing generalization, not a claim about privacy. The benchmark or publication record names every suite it actually executed.

### Question #3: May learning update a failing expected result?

Response: Only when an authorized policy decision changes the oracle. That produces benchmark versioning and semantic diff. A candidate may not edit expectations merely to pass.

### Question #4: What do the local publication checks honestly establish?

Response: They record static CircuitJS linking and verification dominance, compatibility-profile validation, structured outcomes for every suite executed, benchmark-policy coverage, replay-verifier results, local file digests, and the semantic diff. They do not claim mutation, live-model, statistical, or human-adjudication checks when those checks were not run.

### Question #5: May an LLM decide whether a semantic benchmark passed?

Response: Yes. Some expected reports cannot be compared usefully as exact text. The evaluator must follow a versioned rubric, return structured reasons and material differences, run multiple perspectives, and preserve the model/backend capture. The result is an evaluation decision, not a mechanical proof.

### Question #6: Is a natural case stored under `benchmark/mutations` equivalent to generated circuit mutation testing?

Response: No. The directory lets agents preserve natural cases aimed at known mutant classes and lets policy require that suite. True mutation testing must generate or load mutated CircuitJS or LongTextJS artifacts, execute them, and calculate which material mutants the suite kills. Until that execution exists, the publication record must not claim a mutation score.

### Question #7: How are planning capabilities checked before publication?

Response: Publication compiles planning circuits, checks producer alignment and dominance, validates applied rule identities and authority references, requires complete rule-to-plan location witnesses, and freezes the graphs. The offline suite covers idea-to-plan grounding, the absence of a CNL constraint ledger, invalid plan-location rejection, plan-only execution with no backend, optional realization failure and repair, and final CNL audit reuse. An agent-owned planning benchmark with expected CNL layers and a separate realization benchmark with evaluated captures remain necessary before empirical plan-quality or realization-success claims; the current command makes neither claim.

### Question #8: Is the benchmark kind merely presentation text?

Response: No. `NaturalLanguageLinterBenchmarkCase` is validated before execution and is part of the snapshotted publication evidence. A misspelled authoring kind fails instead of being silently normalized.

### Question #9: Does a source map or generated test scaffold satisfy query-first differential testing?

Response: No. A source map establishes traceability and a scaffold states intended cases. Differential evidence requires executing independent paths over the same LongTextJS programs and comparing the semantic result layers. Mutation evidence requires executing material mutants and reporting which cases killed them.

### Question #10: Must every agent relearn and retest the foundation pack?

Response: No. Platform tests establish the shared semantics once. An agent tests only its reliance on, extension of, or deliberate departure from those semantics; its publication record still captures the exact selected pack identity.

# Conclusion

Benchmarks protect meaning and prior behavior, while manual publication freezes only the candidate and evidence that were actually checked. Markdown benchmark cases are both executable tests and the operational definition of each agent's theory.
