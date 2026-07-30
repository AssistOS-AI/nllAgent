---
id: DS017
title: Testing and Repository Operations
status: implemented
owner: nllAgent maintainers
summary: Defines offline tests, executable module checks, CLI coverage, documentation verification, file limits, and operational diagnostics.
---

# Introduction

The repository must prove its implemented contracts without credentials, external services, or a package-manager build.

# Core Content

The main test command is `node --test tests/unit/*.test.mjs tests/integration/*.test.mjs`. Unit tests cover ontology
construction, LongText spans, identity, query, coverage, logic, transactions, planning, CNL, persistence, foundation,
and all five architecture experiments. Integration tests cover CLI use cases, reimportable run artifacts, learning
workspace setup, and representative editorial, normative, continuity, and scientific behavior.

Checks also load every source module, validate generated run modules, verify documentation links, regenerate the DS
matrix, enforce source size limits, run the demo benchmark, and audit forbidden legacy artifacts and vocabulary.
Default tests inject model and process doubles.

Diagnostics identify layer, file, concept, role, expected/received type, evidence, and repair hint where available.
Examples must execute the same public APIs as users; browser visualizations are explanatory only.

# Decisions & Questions

### Question #1: Why keep fewer tests after the rewrite?

Response: Test count is not a quality metric. The new suite targets the new architecture and its invariants instead of
preserving hundreds of assertions about deleted formats and release machinery.

### Question #2: How are accidental legacy dependencies detected?

Response: Repository checks search first-party runtime, tests, data, and docs for forbidden extensions and terminology,
and load persisted example modules. The audit is part of the completion gate.

### Question #3: May default tests call live models?

Response: No. Live evaluation is explicit and produces a separate experiment record. Offline correctness must not depend
on credentials or nondeterministic provider behavior.
