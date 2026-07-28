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

A release profile must declare supported formats, adapter versions, languages, genres, structural patterns, schema versions, producer profiles, maximum source sizes, operational-context dependencies, calendars, registries, unit systems, model profiles, circuit-specific limits, and qualification evidence.

## Alignment levels

Structural alignment verifies media type, channels, block structure, schema shape, cardinality, fields, units, and enum values. Semantic alignment verifies definitions, positive and negative examples, invariants, discriminating probes, scope meanings, world policy, and approved adapter losses. Operational alignment verifies producer availability, language support, external context, access rights, resource budget, and achievable coverage.

The release builder must construct and persist a producer-consumer matrix from every circuit's backward-derived observation contract. Each critical port must resolve to an exact structural producer, extraction profile, or approved adapter whose statuses, coverage mode, and attainable guarantee satisfy the port. Human confirmation and mechanical certification are not interchangeable producer capabilities. Benchmark evidence remains a separate qualification obligation and must not be inferred merely from nominal producer linkage.

## Preflight

Preflight begins after structural ingestion, but its final producer-consumer decision uses the capabilities, gaps, and coverage obtained after demanded materialization. It inspects the document profile, compares it with release requirements, and may materialize bounded probes for critical observation types. For each circuit and obligation, it reports `satisfied`, `satisfied-with-limits`, `partially-satisfied`, `missing`, or `semantically-uncertain`, with evidence.

The current circuit status is `ready` or `blocked`; per-port obligations explain any limits on a ready circuit. The aggregate report is `compatible`, `compatible-with-limits`, or `incompatible`. Materialization checks the exact number of accepted observations, port cardinality, accepted epistemic statuses, attainable guarantee, required channels and structures, and matching gaps. Producer lookup is one-to-many: every structural producer, extraction profile, or approved adapter for a nominal type participates in the obligation instead of an order-dependent last producer winning. A global compliance or complete-review promise must stop when any required circuit is blocked or materially unknown.

A produced critical type is not automatically blocked by every imperfect model call. `model-output` and isolated `extractor-failure` records are quality gaps when a declared producer/capability exists and no profile minimum was violated; the port is `satisfied-with-limits`. A critical gap, missing producer, operational failure, closed-world mismatch, unacceptable epistemic status, or `insufficient-materialization` blocks the port. This distinction permits useful partial semantic work without turning failure into absence.

## Coverage

Coverage records are scoped tokens, not percentages. They identify source, revision, channels, block or temporal scope, observation type, producer, method, exclusions, failures, completeness mode, and verification. A circuit using absence must consume an actual compatible, verified closed-world coverage token from the LongTextJS program. A capability label or producer declaration is not a substitute. Retrieval top-k output and probabilistic semantic search cannot independently certify exhaustive absence.

## Stopping and partial reporting

Structural, ontological, semantic, coverage, and operational incompatibility must block dependent circuits. Partial reporting is allowed only when the task and report name the active circuits, blocked circuits, verified scopes, and limitations. The renderer must not show a global compliant state when required coverage is absent.

## Learning needs

A blocked or repeatedly unknown requirement must create a `LearningNeed` containing the unmet contract, source and authorized representative fragments, producer attempts, gaps, affected rules and circuits, severity, frequency, suspected remediation class, and reproduction command. Remediation classes include alias, operational context, adapter, extractor, schema type, view profile, circuit, verifier, or accepted limitation.

An LLM may propose remediation during learning. It must not install an adapter or reinterpret a type during the blocked production run.

# Decisions & Questions

### Question #1: Why is preflight allowed to use sampling if compatibility is contractual?

Response: Sampling is evidence for detecting unknown structure and deciding whether a bounded probe is needed. Critical obligations are still evaluated individually; an overall similarity score cannot override a missing critical contract.

### Question #2: When is `ready-with-limits` acceptable?

Response: Only when each limit is outside the declared scope of the requested result or when the finding contract explicitly supports a narrower report. Limits are carried into the report and certificate.

### Question #3: Does every issue become a learning job?

Response: No. Policy prioritizes issues by severity, recurrence, blocked-document value, generalizability, and qualification cost. All remain available for later analysis.

### Question #4: What happens when semantic translation is disabled?

Response: Deterministic structural capabilities remain available. A circuit whose critical port requires a model-produced type is blocked with the missing producer in the compatibility matrix. The run may still report results for independent circuits when its task allows partial reporting.

### Question #5: Why are release alignment and run compatibility separate checks?

Response: Release alignment proves that every demanded type has a declared implementation path in the package. Run compatibility proves that the concrete source, accepted observations, channels, context, guarantee, and coverage satisfy that path now. Passing the static matrix cannot manufacture evidence in a document run.

### Question #6: Is planning compatibility distinct from optional realization validation compatibility?

Response: Yes. The idea must first satisfy the selected planning-circuit ports, formats, languages, and coverage. If the CNL plan is realized, that candidate undergoes the full validation compatibility gate independently. A compatible idea and verified plan do not imply a compatible or conformant realization, and a stopped validation state cannot be repaired into compliance by assertion.

# Conclusion

Compatibility and coverage are executable preconditions. When they fail, the system stops precisely and converts the boundary into structured learning input rather than an approximate verdict.
