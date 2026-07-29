# Current Serious Issues

This file contains only unresolved, concrete issues observed in the current repository or runtime environment. Research ambition, imperfect semantic deduction, local symbolic links, restricted CircuitJS `.mjs`, ordinary content digests, and the deliberate use of a constrained Coding Agent as compiler and translation fallback are not treated as contradictions.

## 1. Publication checks do not execute generated circuit mutations or independent optimized and shadow evaluations

The manual publication command discovers all agent-owned natural suites, including `metamorphic` and `mutations`, enforces declared suite and rule-family policy, performs static CircuitJS checks, derives observation contracts, rejects critical consumers without producers, snapshots candidate bytes around benchmark execution, records semantic diffs, and records only the checks it actually ran.

A natural case stored in `benchmark/mutations/` is not the same as mutating CircuitJS or LongTextJS artifacts and calculating a mutation score. Outside the bounded DS020 consistency comparison below, the current checks also do not execute independently implemented differential engines, shadow or canary traffic, or a complete precision, recall, latency, cost, review-time, and complexity evaluation program. Those capabilities must not be claimed until executable artifacts and results are present.

The experimental DS020 benchmark path now executes direct query/table evaluation and the lowered graph and compares query, decision, and verified-result layers. This catches lowering and wiring drift, but both paths intentionally share the same reference algebra implementation. It does not resolve the larger issue: executable semantic mutations, an independently implemented optimized path, statistical measures, and publication thresholds are still absent.

## 2. Live model profiles are not exercised by the default repository checks

`nllagent model inspect --json` currently resolves the parent AchillesAgentLib checkout and reports its selected provider as configured, with `auto` choosing Achilles. The default offline suite intentionally uses controlled `LLMAgent.executePrompt()` and Coding Agent process doubles so it remains deterministic and credential-independent. It validates routing, complete schemas, shared request digests, captures, replay, LongTextJS anchoring, semantic circuits, and the Coding Agent fallback contract, but it does not make a live provider inference.

Before a model profile is relied on for a high-impact agent release, an explicit opt-in live evaluation should record the resolved model, provider behavior, cost, stability, and representative agent-owned results. The Coding Agent adapter remains the automatic production fallback when Achilles is absent or unconfigured and the authoring mechanism for staged learning. OpenAI Codex is the current reference adapter, not a requirement of the release model.

## 3. CNL planning checks are structural but not yet agent-benchmark-driven

Manual publication compiles dedicated planning circuits, checks CNL plan construction and verification dominance, validates applied rule identities against authority, requires concrete rule-to-plan location witnesses, checks producer alignment, freezes the planning artifacts, and includes them in semantic diff. The offline suite proves source-grounded idea-to-plan compilation with no model backend and an optional failed-realization-to-successful-revision transaction using canonical CNL audits from the existing validation circuits as oracle.

The agent-owned benchmark service does not yet discover a distinct idea-to-CNL expected-layer suite, execute optional realization with evaluated model captures, or enforce planning- and realization-specific thresholds during `release publish`. The MVP release `0.1.0` therefore demonstrates only the implemented CNL planning mechanism and rule-to-plan coverage. Its publication record is not a statistical claim about plan quality, model prose quality, or repair success across ideas. High-impact planning still needs an external or future agent-owned evaluation program.

## 4. Primitive and registry contracts remain incompletely typed outside the experimental query subset

`src/runtime/registries.mjs` now normalizes permitted primitive metadata for operators, and `src/circuit/compiler.mjs` rejects a primitive/operator mismatch. The experimental query and table operators additionally declare schema, cost, coverage, ordering, candidate, witness, and checked-property metadata. Older standard entries still lack uniformly enforced versioned input, output, witness, coverage, cost, failure, ordering, guarantee, and test-vector contracts. Author-declared fields for a non-structural query type are therefore syntactically checked but are not yet linked to a trusted schema registry, and full scalar/nullability inference cannot be performed at compile time.

The existing published demonstration remains bounded by small exact operator/verifier pairs, focused tests, and natural cases. The implemented DS020 subset is limited to built-in structural field schemas or explicit field declarations, exact anti-join matching, one verifier per table, and reference-to-graph comparison. Stable support for arbitrary semantic query schemas, typed registered functions, aggregate or ordered-pattern lowering, compile-time conflict proofs, and native optimization remains blocked until the registry owns and enforces the complete contracts.

Trusted runtime extensions now require explicit schemas, effects, costs, limits, failure codes, witness properties, and
digest locks, but the ordinary compiler still does not validate all of those schemas against each node's concrete input
and output shape. The extension surface therefore improves code identity and review without resolving this registry-wide
typing issue.

## 5. The identity relations have no general production materializer

LongTextJS and the query relation adapter expose `mentions`, `entities`, and `identityCandidates`, and the specifications define their epistemic roles. The deterministic Markdown compiler currently initializes all three relations as empty, while the generic schema-bound model materializer can add only typed `observations`. Existing continuity examples therefore carry bounded participant or object identifiers inside observation payloads; they do not demonstrate a production identity service that creates anchored mentions, scoped entity hypotheses, competing same/distinct links, and invalidation across worlds.

This does not invalidate the current lexical release or the bounded semantic observation path. It does prevent the repository from claiming that the advertised identity layer is implemented end to end, and it matters before circuits correlate people or objects across distant passages. A complete solution needs versioned schemas and producer contracts for each identity relation, referential-integrity validation, alternative-world handling, demand planning, compatibility metadata, benchmark cases, and dependency invalidation. Making name equality a default identity rule would be unsafe, so this work requires an explicit design and publication gate rather than a heuristic patch in Markdown ingestion.

## 6. Sourced, dated world-knowledge packs are specified only as a boundary

`foundation-core@1.1.0` now provides deterministic controlled-English observations and bounded logical, temporal, exact-arithmetic, elementary-quantity, type, and literal-emotion checks. It intentionally contains no changing political, social, economic, legal, or geographic facts. DS021 defines the minimum `KnowledgePack` provenance boundary, but the repository has no loader, compatibility policy, update or expiry mechanism, conflict handling, or benchmark gate for such packs.

Until those mechanisms exist, nllAgent must not claim automatic verification against current-world common knowledge. Implementing the extension requires a dedicated DS, sourced and content-addressed pack artifacts, effective intervals and jurisdictions, explicit world selection, stale-data refusal, guarantees no stronger than the sources, conflict and fictional-world behavior, and natural benchmark cases. Hardcoding current claims into the core foundation would conceal authority and age rather than solve this issue.
