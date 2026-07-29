---
id: DS010
title: Compatibility, Coverage, and Learning Needs
status: accepted
owner: nllAgent maintainers
summary: Defines preflight levels, producer-consumer alignment, coverage tokens, dynamic probes, stopping rules, and LearningNeed creation.
---

# Introduction

Compatibility determines whether a release has the language, producers, resources, and evidence completeness required to judge a concrete document. It is a contract decision, not a similarity score.

# Core Content

## Compatibility profile

A release profile must declare supported formats, adapter versions, languages, genres, structural patterns, schema versions, producer profiles, maximum source sizes, operational-context dependencies, calendars, registries, unit systems, model profiles, circuit-specific limits, and publication evidence.

## Alignment levels

Structural alignment verifies media type, channels, block structure, schema shape, cardinality, fields, units, and enum values. Semantic alignment verifies definitions, positive and negative examples, invariants, discriminating probes, scope meanings, world policy, and approved adapter losses. Operational alignment verifies producer availability, language support, external context, access rights, resource budget, and achievable coverage.

The release builder must construct and persist a producer-consumer matrix from every circuit's backward-derived observation contract. Each critical port must resolve to an exact structural producer, extraction profile, or approved adapter whose statuses, coverage mode, and attainable guarantee satisfy the port. Human confirmation and mechanical certification are not interchangeable producer capabilities. Benchmark evidence remains a separate publication obligation and must not be inferred merely from nominal producer linkage.

## Preflight

Preflight begins after structural ingestion, but its final producer-consumer decision uses the capabilities, gaps, and coverage obtained after demanded materialization. It inspects the document profile, compares it with release requirements, and may materialize bounded probes for critical observation types. For each circuit and obligation, it reports `satisfied`, `satisfied-with-limits`, `partially-satisfied`, `missing`, or `semantically-uncertain`, with evidence.

The current circuit status is `ready` or `blocked`; per-port obligations explain any limits on a ready circuit. The aggregate report is `compatible`, `compatible-with-limits`, or `incompatible`. Materialization checks the exact number of accepted observations, port cardinality, accepted epistemic statuses, attainable guarantee, required channels and structures, and matching gaps. Producer lookup is one-to-many: every structural producer, extraction profile, or approved adapter for a nominal type participates in the obligation instead of an order-dependent last producer winning. A global compliance or complete-review promise must stop when any required circuit is blocked or materially unknown.

A produced critical type is not automatically blocked by every imperfect model call. `model-output` and isolated `extractor-failure` records are quality gaps when a declared producer/capability exists and no profile minimum was violated; the port is `satisfied-with-limits`. A critical gap, missing producer, operational failure, closed-world mismatch, unacceptable epistemic status, or `insufficient-materialization` blocks the port. This distinction permits useful partial semantic work without turning failure into absence.

## Coverage

Coverage records are scoped tokens, not percentages. They identify source, revision, channels, block or temporal scope, observation type, producer, method, exclusions, failures, completeness mode, and verification. A circuit using absence must consume an actual compatible, verified closed-world coverage token from the LongTextJS program. A capability label or producer declaration is not a substitute. Retrieval top-k output and probabilistic semantic search cannot independently certify exhaustive absence.

An absence-sensitive operation derives a canonical coverage-domain signature before execution. The signature includes source id and revision, view or scope, channels, nominal types and versions, statuses when they determine membership, producer or producer class, method, exclusions, failures, world policy, completeness mode, and verification requirement. A token satisfies the signature only by exact match or a versioned conservative subsumption rule. Matching only the nominal type is insufficient. Empty data, successful execution, and complete coverage are three separate facts.

The experimental query anti-join implements the conservative exact subset: it checks the current source id and revision, observation type, declared scope, channels, producer, method, exclusions, closed-world mode, verified state, an empty coverage-failure set, and producer capability for every accepted status. A failure-bearing token cannot justify absence. An unmatched row without that support is omitted and the `QueryResult` becomes `UNKNOWN`. General subsumption, correlated negation, domain-specific failure matching, and world-aware signatures remain unimplemented rather than inferred.

Expression and decision evaluation preserve `UNKNOWN` when a required value or completeness fact is unavailable. Compatibility failure or a critical budget/integrity failure is `BLOCKED`, not unknown and not a rule outcome. `notExists`, anti-join, universal constraints, and completeness-sensitive aggregates must expose the required signature and satisfying token in their contract and trace.

## Stopping and partial reporting

Structural, ontological, semantic, coverage, and operational incompatibility must block dependent circuits. Partial reporting is allowed only when the task and report name the active circuits, blocked circuits, verified scopes, and limitations. The renderer must not show a global compliant state when required coverage is absent.

## Foundation selection

The runtime evaluates the selected foundation as a versioned platform input beside the agent release. In `core` mode, its deterministic producer, open-world coverage, two circuits, operators, and verifiers participate in ordinary compatibility and reporting. In `off` mode they are absent by explicit choice, not represented as missing evidence. Foundation coverage proves that the controlled grammar was scanned; it does not provide closed-world support for unexpressed states, events, or current-world facts.

## Learning needs

A blocked or repeatedly unknown requirement must create a `LearningNeed` containing the unmet contract, source and authorized representative fragments, producer attempts, gaps, affected rules and circuits, severity, frequency, suspected remediation class, and reproduction command. Remediation classes include alias, operational context, adapter, extractor, schema type, view profile, circuit, verifier, or accepted limitation.

An LLM may propose remediation during learning. It must not install an adapter or reinterpret a type during the blocked production run.

# Decisions & Questions

### Question #1: Why is preflight allowed to use sampling if compatibility is contractual?

Response: Sampling is evidence for detecting unknown structure and deciding whether a bounded probe is needed. Critical obligations are still evaluated individually; an overall similarity score cannot override a missing critical contract.

### Question #2: When is `ready-with-limits` acceptable?

Response: Only when each limit is outside the declared scope of the requested result or when the finding contract explicitly supports a narrower report. Limits are carried into the report and certificate.

### Question #3: Does every issue become a learning job?

Response: No. Policy prioritizes issues by severity, recurrence, blocked-document value, generalizability, and evaluation cost. All remain available for later analysis.

### Question #4: What happens when semantic translation is disabled?

Response: Deterministic structural capabilities remain available. A circuit whose critical port requires a model-produced type is blocked with the missing producer in the compatibility matrix. The run may still report results for independent circuits when its task allows partial reporting.

### Question #5: Why are release alignment and run compatibility separate checks?

Response: Release alignment proves that every demanded type has a declared implementation path in the package. Run compatibility proves that the concrete source, accepted observations, channels, context, guarantee, and coverage satisfy that path now. Passing the static matrix cannot manufacture evidence in a document run.

### Question #6: Is planning compatibility distinct from optional realization validation compatibility?

Response: Yes. The idea must first satisfy the selected planning-circuit ports, formats, languages, and coverage. If the CNL plan is realized, that candidate undergoes the full validation compatibility gate independently. A compatible idea and verified plan do not imply a compatible or conformant realization, and a stopped validation state cannot be repaired into compliance by assertion.

### Question #7: Can one broad coverage token satisfy a narrower query?

Response: Only through a declared conservative subsumption rule. For example, complete structural parsing of one exact view may cover a type-and-status subset derived deterministically from that parse. A token for selected records, another source revision, another channel, an open-world producer, or top-k retrieval cannot be widened by inference.

### Question #8: Is an empty query result false, unknown, or blocked?

Response: The collection is simply empty. A positive existence condition is false after successful bounded evaluation. A negative conclusion is true only with matching closed-world coverage, unknown without that completeness, and blocked when execution was not permitted to complete.

### Question #9: Is `--foundation off` a compatibility failure?

Response: No. It is a recorded platform selection that removes the foundation producer and circuits before compatibility is computed. Agent-release circuits remain subject to their own contracts and may still require similar domain observations explicitly.

# Conclusion

Compatibility and coverage are executable preconditions. When they fail, the system stops precisely and converts the boundary into structured learning input rather than an approximate verdict.
