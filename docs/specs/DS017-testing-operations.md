---
id: DS017
title: Testing, Documentation, and Operational Readiness
status: accepted
owner: nllAgent maintainers
summary: Defines automated test layers, CLI acceptance, documentation verification, observability, clean builds, and completion criteria.
---

# Introduction

The repository is complete only when its library, CLI, agent workspace, learning runner, benchmarks, documentation, and failure behavior are executable and mutually consistent.

# Core Content

## Test layers

Contract tests validate canonical data, CNL audit and plan schemas, path containment, status transitions, release digests, port types, operator linking, verification dominance, rule-to-plan witnesses, and issue shapes. Unit tests cover pure transformations and each standard operator or replay verifier. Integration tests execute CLI commands against temporary agents. End-to-end tests create an agent, manually publish a deterministic release, audit Markdown, compare canonical and rendered reports, create an incompatible issue, run benchmarks, and execute long-range continuity from model-produced observations.

Boundary tests cover traversal, generated MJS capability rejection including IIFEs and nested function values, instruction-like content isolation, immutable release modification, unknown operators, forged closed-world coverage, forged lexical and state witnesses, replay-request identity, cache isolation, partial semantic materialization, protected learning-context edits, and resource budgets. Mutation tests target circuit and LongTextJS semantics. Performance tests use long synthetic Markdown and enforce bounded memory and time budgets appropriate to the fixture.

Network, external LLM, external solver, and live Coding Agent calls are opt-in. Default tests use stubs and remain reproducible offline, but they must exercise the actual integration shapes: an injected `LLMAgent.executePrompt()` object with Spark selection, and a fake Coding Agent adapter receiving its invocation contract, call workspace, skill link, response schema, and output path. Reference-adapter tests may additionally assert vendor-specific arguments.

## CLI acceptance

The primary audit acceptance scenario must demonstrate that one Markdown input produces one canonical `CNLAuditReport` and one Markdown view using the current release of a named agent. The audit must contain anchored verified observations and the run directory must contain `cnl-audit.json`. A second scenario must stop as incompatible and create an issue. A multi-agent scenario must discover two agent workspaces and prove independent circuits and benchmark roots. A benchmark scenario must compare structured layers and report semantics and fail with code `9` on mismatch. Translation acceptance must cover `auto`, explicit Achilles, an explicit Coding Agent adapter, and `none` selection behavior.

## Learning acceptance

The learning command must be tested with an injected fake Coding Agent adapter or process runner. The test verifies declared capability restrictions, explicit skill names, staging working directory, schema-bound output capture, whitelist promotion, rejection of protected staging writes, and refusal to publish a release implicitly.

## Documentation

DS specifications are authoritative. `docs/index.html` and companion technical pages must describe only implemented behavior, include the standard Mermaid module, use one sidebar navigation system, and link to `specsLoader.html?spec=matrix.md`. `docs/quick-tutorial.html` must give a new reader one small source, one real released rule, the minimal LongTextJS observation, the three-node candidate–verify–emit circuit, the resulting CNL audit, and the dialogue counterexample in a visual five-minute path. `docs/concepts.html` must provide an accessible concept and abbreviation index, state the epistemic and ethical commitments, explain guarantee boundaries, distinguish implemented mechanisms from research lineage, and connect important design ideas to primary scientific or standards sources. Introductory encyclopedia links must be labeled as orientation rather than authority. `docs/circuit-tutorial.html` must provide the detailed step-by-step interactive model of an actual LongTextJS-to-CircuitJS path, clearly label simulation versus production execution, and expose the structured value at every stage. Its local JavaScript asset must be syntax checked and served by the static-site verification. `docs/specs/matrix.md` must be generated from frontmatter. Documentation link and static-site checks are mandatory after changes.

## Observability

Runtime metrics include phase latency, materialization counts, cache hits, coverage, active and blocked circuits, verifier acceptance, issue categories, model calls, retries, cost metadata, findings by rule, review decisions, compatibility drift, and benchmark regression. Telemetry must not enter semantic hashes or expose unauthorized source text.

## Clean build and release readiness

A clean checkout must install or run without generated run, issue, lock, or learning state committed under `data/`. A source-controlled published demonstration agent is permitted because it is an executable fixture, not generated local state. The test suite, documentation checks, file-size checks, example agent benchmark, and package export checks must pass. Optional Achilles and Coding Agent integrations must have explicit diagnostics when absent.

Completion requires no undocumented placeholder behavior on the primary CLI path, no silently skipped mandatory gate, no untracked serious contradiction, and no docs claim contradicted by the implementation. Research extensions may remain uninstalled only when the corresponding compatibility gap is explicit and tested.

# Decisions & Questions

### Question #1: Does passing the example benchmark prove general semantic correctness?

Response: No. It proves the implementation and the example release satisfy their declared cases. Each real agent requires its own representative evaluation and compatibility profile.

### Question #2: Why are external LLM tests opt-in?

Response: Provider output, credentials, cost, and availability are nondeterministic. Default correctness tests exercise the integration contract through an `LLMAgent`-compatible stub; separate evaluations assess live profiles.

### Question #3: What does “functional” mean for extension points without installed solvers?

Response: The registries, type contracts, scheduler, witness path, and fail-closed behavior are functional. A circuit requiring a missing solver is blocked during compatibility and produces a learning or configuration issue rather than an invented result.

### Question #4: Why commit `data/editorial-demo` when mutable data is normally ignored?

Response: It is the canonical acceptance fixture containing authority, candidate lineage, a digest-bound published release, and natural microcases. Its run, issue, learning, and lock subtrees remain ignored and tests copy the fixture to temporary roots before mutation.

### Question #5: Which realistic semantic paths are mandatory offline?

Response: At minimum, exact Unicode anchoring, a translator-produced leave/use/retrieve event sequence across distant paragraphs, recovery of a continuity gap, semantic benchmark equivalence plus counterexample perspectives, quality-gap versus blocking-gap compatibility, and replay verification for temporal, state, unit, interval, fixpoint, and argumentation operators.

### Question #6: What does the offline suite deliberately not evaluate?

Response: It does not evaluate current live-provider behavior, calculate a generated circuit mutation score, or perform human policy adjudication. Those require explicit opt-in artifacts and must appear as executed checks in the publication record before being claimed.

### Question #7: What is the minimum end-to-end planning acceptance test?

Response: The offline suite must compile one idea through LongTextJS and a planning circuit into an idea-specific CNL plan, prove that every applied rule maps to an existing plan location, prove that plan-only execution uses no model backend, and persist schema, provenance, compatibility, and trace artifacts. Optional-realization coverage must use a controlled backend double to produce a nonconforming first candidate, detect findings through existing validation circuits, revise within budget, and persist both canonical CNL audits and traces. It must also cover missing backend only for realization, stopped validation, and revision exhaustion. This proves orchestration, not live-model plan or prose quality.

### Question #8: What authority do tutorial references have?

Response: Primary standards and papers explain design lineage and support bounded technical statements. Wikipedia and similar pages are clearly labeled orientation material. Neither category overrides DS contracts or proves that a cited mechanism is implemented; documentation must link claimed behavior to code, tests, release evidence, and known limitations.

### Question #9: How is the interactive circuit tutorial tested?

Response: Documentation verification must serve both the tutorial page and its JavaScript asset, validate internal links, and syntax-check the asset. The tutorial scenarios are explanatory mirrors of repository fixtures; production unit and integration tests remain the authority for compiler, port binding, operator, verifier, planning, and CNL behavior.

### Question #10: Why keep both a Quick Tutorial and the detailed interactive tutorial?

Response: They have different teaching jobs. The Quick Tutorial establishes the complete causal chain with one concrete lexical rule and almost no terminology. The detailed tutorial then exposes compilation, ports, values, guarantee propagation, semantic extraction, planning, and trace inspection without forcing a beginner to absorb them before understanding the basic mechanism.

# Conclusion

Operational readiness is demonstrated through layered offline tests, a real CLI path, fail-closed scenarios, synchronized specifications, and transparent optional integrations.
