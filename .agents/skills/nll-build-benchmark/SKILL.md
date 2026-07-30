---
name: nll-build-benchmark
description: Build executable semantic benchmark cases and mutations for OntologyJS, LongTextJS, CircuitJS, planning, and controlled generation.
---

# Build an nllAgent benchmark

## Goal

Create small, independent cases that distinguish correct semantic behavior from plausible but wrong shortcuts.

## Required outputs

Each case contains `input.md`, `case.mjs`, and optional `notes.md`. A fixed materialization may be supplied as
`input.longtext.mjs` when the circuit must be tested independently from translation.

## Workflow

1. Derive cases from authority and known failure modes, never from current implementation output.
2. Cover satisfied, violated, accepted exception, not applicable, unknown in open scope, closed-scope absence, conflict,
   ambiguity, and ontology or capability blockage where relevant.
3. Assert typed expected terms, excluded terms, status, evidence spans, and assurance.
4. Add long-range cases when a rule crosses sections or identities.
5. Mutate comparators, exceptions, coverage, identities, evidence, status, and modality without editing expected terms.
6. Run both focused cases and the complete agent benchmark.

## Completion gate

The valid implementation passes; each relevant semantic mutant is rejected; failures identify the semantic layer and
source evidence; and expected values contain no implementation-only identifiers.
