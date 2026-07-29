---
id: DS017
title: Testing, Documentation, and Operational Readiness
status: accepted
owner: nllAgent maintainers
summary: Defines the evidence required for implementation, CLI, documentation, foundation, query-first, and release-readiness claims.
---

# Introduction

A capability is ready only when its contract, implementation, tests, command-line behavior, artifacts, and explanation agree. This specification defines that evidence and the minimum documentation path a human reviewer must be able to follow. It does not make live model quality, domain correctness, or research prototypes part of the default offline guarantee.

# Core Content

## Readiness is a chain of evidence

Tests are organized by the claim they protect rather than by repository folder:

| Layer | Required evidence |
| --- | --- |
| Contract | Canonical data, status transitions, release digests, path containment, observation-binding and query contracts, structured registry schemas, verification dominance, CNL schemas, and issue shapes. |
| Primitive | Every LongTextJS construction algorithm, CircuitJS primitive, standard operator, and replay verifier has focused positive, negative, boundary, and forged-input tests. |
| Integration | CLI commands execute against temporary agent roots and persist the documented artifacts and terminal status. |
| Semantic | Natural Markdown cases distinguish materialization errors from circuit, verifier, coverage, and reporting errors. |
| Adversarial | Untrusted source instructions, traversal, restricted-MJS escape attempts, forged coverage or witnesses, protected learning writes, and resource amplification fail safely. |
| Operational | Cancellation, budgets, cache identity, replay, release immutability, rollback, and documentation checks behave deterministically. |

Mutation and differential tests must alter meaning, not merely lines. Relevant mutations include status, field, exception, boundary, join, priority, coverage, witness, and verifier changes. Performance fixtures use long synthetic Markdown and enforce explicit time and memory budgets.

Network, live language-model, live solver, and live Coding Agent evaluations are opt-in because credentials, cost, availability, and provider output vary. Offline tests still exercise the real adapter contracts with controlled `LLMAgent.executePrompt()` and Coding Agent doubles, including workspace, skill, response-schema, capture, and timeout behavior.

## End-to-end acceptance

The audit path must prove that one Markdown source and one immutable release produce anchored verified findings, canonical `cnl-audit.json`, its Markdown view, and a reproducible run directory. Separate cases must cover an incompatible stopped run, independent agent roots, structured benchmark mismatch with exit code `9`, and translation selection through `auto`, explicit Achilles, the configured Coding Agent adapter, and `none`.

The planning path must compile one idea into a verified `CNLGenerationPlan`, preserve a rule-to-plan witness for every applied rule, and prove that plan-only execution requires no model backend. A controlled realization case must produce a failing first draft, audit it with the unchanged validation path, revise within budget, and preserve every attempt and audit. Missing realization backend, stopped validation, and revision exhaustion are distinct terminal states.

Learning acceptance uses a fake Coding Agent adapter or process runner. It verifies the staged working directory, limited skill catalog, schema-bound final result, changed-path audit, whitelist promotion, protected-write rejection, and the prohibition on implicit publication.

## Foundation and query-first evidence

The default foundation suite covers every controlled-English family and close negatives; pack identity, vocabularies, provenance, and open-world coverage; decimal segmentation and exact rational arithmetic; division by zero; all documented quantity units and boundaries; conflicting exact values; state, temporal, emotion-polarity, disjoint-type, and inanimate-emotion cases; valid mixed emotions and separate times; forged witnesses; Query-First schema access; release producer alignment; default CLI activation; persisted selection; and `--foundation off`. These tests prove the documented bounded parser and five circuits, not unrestricted common-sense reasoning, diagnosis, or a rich physical model.

The experimental query-first suite covers restricted loading, canonical relations including `ontologyPacks`, field and binding errors, every implemented expression, inner/semi/coverage-aware anti joins, row budgets, deterministic order, the `unique`, `priority`, and `collect` policies, source maps, candidate replay, reference-to-lowered comparison, and release artifacts. Stable promotion still requires registry-owned semantic schemas, executable semantic mutations, an independent optimized engine, index corruption and rebuild tests, broader resource bounds, author line maps, and physical-plan fallback.

The trusted runtime-extension suite loads an executable example, compiles its direct CircuitJS graph, exercises its
operator and independent verifier, and checks deterministic order and emitted output. Negative cases cover imports,
missing contract metadata, input mutation, non-plain output, duplicate registry identities, missing or mismatched release
locks, cache identity without the implementation digest, missing and unknown node inputs, wrong literal types, and
runtime schema failures. The advanced example combines a local observation matcher, custom operator, foundation
circuits, independent verification, and final CNL rendering; its test asserts support anchors and rule basis rather than
only candidate count. These tests establish the host API and trust boundary; they do not make arbitrary third-party
JavaScript safe or complete the older standard registry contracts.

## Documentation is layered by reader task

DS files are normative contracts. Each begins with the problem, governed boundary, and non-scope; keeps stable semantics in `Core Content`; and uses numbered `Decisions & Questions` for concise rationale. A DS is not a tutorial, changelog, marketing page, or implementation diary.

Tutorials teach one complete author-visible task. The Quick Tutorial starts with source text, names the exact built-in verbal rules, shows real CircuitJS DSL, runs the CLI, and explains the observable result. It explains LongTextJS as the compiled instance world without leading with canonical JSON. The query-first tutorial likewise shows restricted DSL source; generated graphs, query envelopes, and canonical artifacts are linked as debugging references rather than presented as the user interface. The detailed circuit tutorial may inspect values and traces because execution internals are its explicit subject.

Concept and architecture pages provide the smallest useful mental model and link deeper contracts. Reference pages may enumerate complete schemas or primitive semantics because lookup is their purpose. `docs/cli.html` is the current man page and must list every implemented command, option, default, conflict, path rule, side effect, artifact, result form, and exit code. Proposed behavior is always labeled at the point of use.

All HTML pages use the shared navigation and Mermaid module, link to the DS browser, and describe only supported or explicitly status-labeled behavior. Documentation verification checks internal links, static serving, scripts, generated DS navigation, and examples that claim exact syntax. Canonical JSON may be shortened only as an explicitly labeled projection with exact displayed values; ellipses inside quoted payloads and invented canonical fields are forbidden.

## Observability and release readiness

Runtime records phase latency, materialization, coverage, active and blocked circuits, verifier results, issues, model calls, retries, cost metadata, findings, review decisions, compatibility drift, and benchmark regression. Telemetry is operational metadata: it neither enters semantic hashes nor reveals unauthorized source text.

A clean checkout must pass the offline suite, documentation checks, file-size rules, package exports, and demonstration benchmark without generated run, lock, issue, or learning state committed under `data/`. The source-controlled demonstration agent is an executable fixture. Completion requires no silent mandatory skip, undocumented primary-path placeholder, unrecorded serious contradiction, or documentation claim contradicted by code. Optional research extensions remain honest compatibility gaps until their own evidence exists.

# Decisions & Questions

### Question #1: Does the demonstration benchmark prove general semantic correctness?

Response: No. It proves only that the implementation and that release satisfy their declared cases. Each real agent needs representative authority, coverage, ambiguity, and failure cases.

### Question #2: Why are external integrations opt-in?

Response: Provider output, credentials, cost, and availability are nondeterministic. Offline doubles prove the integration contract; explicit live evaluations assess a resolved profile and preserve attributable evidence.

### Question #3: What does a functional extension point mean without an installed solver?

Response: Its registry, types, scheduler, witness route, and fail-closed behavior work. A circuit requiring the absent capability is blocked rather than given an invented result.

### Question #4: Why is `data/editorial-demo` committed?

Response: It is the canonical acceptance fixture with authority, candidate lineage, a digest-bound release, and natural microcases. Mutable run, issue, learning, and lock subtrees remain ignored, and tests copy the fixture before mutation.

### Question #5: What does the offline suite deliberately not claim?

Response: It does not establish current live-provider quality, broad common-sense understanding, human policy correctness, or a generated mutation score. Such claims require explicit executed evidence in the relevant publication or evaluation record.

### Question #6: Why keep a Quick Tutorial and a detailed execution tutorial?

Response: The Quick Tutorial teaches the author-visible causal chain through source, verbal rule, DSL, command, and result. The execution tutorial deliberately zooms into ports, values, guarantees, verifiers, traces, and persisted artifacts for readers debugging or extending the runtime.

### Question #7: May a tutorial show canonical LongTextJS JSON?

Response: Only when inspecting that artifact is the lesson. Ordinary authoring tutorials use source text and DSL. A projection must be labeled, preserve every displayed value exactly, and link the complete schema or stored artifact.

### Question #8: May a tutorial demonstrate query-first syntax?

Response: Yes, if it names DS020's experimental status and uses only the tested subset. Unsupported aggregates, patterns, native indexes, and optimizers remain explicitly outside the example.

### Question #9: What authority do scientific and tutorial references have?

Response: Standards and papers explain lineage and support bounded claims; encyclopedia sources provide orientation. Neither overrides DS contracts nor proves implementation. Code, tests, release evidence, and limitations establish repository claims.

### Question #10: Does a generated source map or test scaffold satisfy differential or mutation testing?

Response: No. Differential evidence executes distinct paths on the same LongTextJS program and compares semantic layers. Mutation evidence executes changed semantics and reports which cases reject them.

### Question #11: What documentation must accompany custom algorithm code?

Response: The programmer path must show the executable extension, the graph that calls it, one concrete input and
output, the values crossing each node, the verifier replay, the release digest lock, and the trust boundary. A registry
catalogue without runnable dataflow is insufficient; a tutorial callback inside CircuitJS would teach an invalid model.

### Question #12: How are repository-wide serious issues tested in an agent-specific repair?

Response: Only issues that affect the scoped use case enter its capability-gap report. Each receives a minimal natural
reproducer and an asserted safe behavior. Platform tests protect generic mechanisms; agent benchmarks protect the
meaning and fallback chosen for that agent. This avoids both hiding a real limit and forcing every agent to copy every
unrelated platform test.

# Conclusion

Operational readiness is a traceable agreement among contract, behavior, evidence, and explanation. When one layer is missing, the capability remains experimental, limited, or blocked rather than being promoted by documentation alone.
