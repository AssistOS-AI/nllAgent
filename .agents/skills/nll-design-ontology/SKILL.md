---
name: nll-design-ontology
description: Design or extend executable OntologyJS modules, constructor tests, examples, lexicalizations, and rationale for an nllAgent domain.
---

# Design OntologyJS

## Goal

Turn authority rules and calibration examples into the smallest executable multi-file OntologyJS vocabulary needed by
LongTextJS and CircuitJS.

## Required inputs

- Authority Markdown and exact relevant spans.
- Existing ontology modules and their introspection output.
- Intended observations, circuit outputs, and benchmark cases.

## Required outputs

- One or more `.ontology.mjs` modules and an ESM index.
- Valid and invalid constructor examples.
- `node:test` coverage for types, roles, cardinalities, subtypes, disjointness, and identity.
- `ontology-notes.md` explaining authority, observability, and usage for each domain concept.

## Workflow

1. Read DS005 and inspect existing concept and role identities.
2. Build a concept matrix separating source-observable concepts from circuit-derived concepts.
3. Reuse existing identities; add only necessary concepts, roles, value types, and lexicalizations.
4. Keep behavior local, unary, deterministic, and independent of store, context, evidence, priority, and exceptions.
5. Write positive and negative constructor examples, then run focused tests.
6. Inspect every public symbol and confirm it is used by materialization, circuits, or controlled generation.

## Completion gate

The ontology seals without conflicts; invalid examples fail precisely; no contextual rule is hidden in a behavior; and
every concept has an authority and consumer.

