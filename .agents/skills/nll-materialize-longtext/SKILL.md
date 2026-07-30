---
name: nll-materialize-longtext
description: Materialize source documents as anchored, ground, multi-file LongTextJS programs without introducing rule verdicts.
---

# Materialize LongTextJS

## Goal

Describe what a source expresses as ground ontology terms, claims, contexts, alternatives, identity candidates,
coverage, and explicit gaps.

## Required inputs

- Unmodified Markdown sources and revision identity.
- Active sealed ontology.
- Circuit-derived `SemanticDemand`.
- Existing identity and cross-section modules.

## Required outputs

- `source.mjs`, `identities.mjs`, optional context modules, section `.longtext.mjs` files, cross-section relation
  modules, coverage declarations, and `program.mjs`.
- Focused anchor, identity, alternative, and query tests.

## Workflow

1. Outline the source and preserve code-point offsets.
2. Centralize recurring identities while keeping mentions distinct from entities.
3. Materialize local source claims section by section with exact spans.
4. Mark epistemic origin and keep competing interpretations in distinct contexts.
5. Declare coverage only when the relevant scope has been exhaustively inspected.
6. Emit a gap when the active ontology cannot express a demanded notion.
7. Compile the program, inspect the store, and run every demand query.

## Completion gate

All accepted observations are typed and anchored; unresolved identities and alternatives remain explicit; critical
demand is satisfied or blocked by a named gap; and no finding or desired verdict appears in the materialization.

