---
name: nll-author-cnl
description: Build deterministic CNL frames, lexicalization, parser, comparator, and round-trip tests over ontology terms.
---

# Author controlled natural language

## Goal

Render complete semantic frames into controlled text and accept the text only when parsing reconstructs every critical
semantic slot.

## Required inputs

- Ontology concepts and lexicalizations.
- Frame families and their required slots.
- Accepted and rejected language examples.

## Required outputs

- `.grammar.mjs` dialect modules with renderer, parser, normalizer, and comparator.
- Round-trip tests for modality, actor, action, object, quantification, negation, time, conditions, and exceptions.

## Workflow

1. Define critical slots before writing surface templates.
2. Reject incomplete frames rather than guessing missing semantics.
3. Render deterministically with canonical lexical forms.
4. Parse the result and compare normalized critical slots exactly.
5. Add close negative cases for each slot and every allowed lexical variation.
6. Keep model-assisted prose outside the verified CNL class until it is rematerialized and audited.

## Completion gate

Every accepted form round-trips exactly; every semantic mutation fails comparison; and no renderer silently fills,
drops, or weakens a critical slot.

