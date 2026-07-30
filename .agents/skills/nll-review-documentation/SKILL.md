---
name: nll-review-documentation
description: Review and rewrite nllAgent DS specifications, HTML technical pages, tutorials, references, and examples for correct scope, reader value, narrative continuity, compactness, implementation accuracy, and appropriate detail. Use when documentation is repetitive, overlong, implementation-shaped, difficult to follow, or being changed alongside architecture or behavior.
---

# Review nllAgent documentation

Make every document answer one reader question at the right level of zoom. Preserve important ideas, not their current
wording or placement.

## Workflow

1. Read repository guidance, the affected implementation, and `serious_issues.md` before editing claims.
2. Inventory each document with four fields: intended reader, question answered, implementation impact, and explicit
   non-scope. If two documents answer the same question, select one authority and make the other link to it.
3. Build a private idea ledger before restructuring. For every nontrivial idea, record its canonical destination. Do
   not delete an idea until it is preserved, intentionally rejected, or recorded as unresolved.
4. Choose the document class and apply its placement rules below.
5. Rewrite from reader intent to mechanism to consequence. Introduce detail only when the reader needs it to make the
   next decision or understand the next layer.
6. Verify every behavioral statement against code, tests, or a normative DS. Label proposed, experimental, partial,
   and unimplemented behavior at the point where it appears.
7. Re-read the complete reading path, not only modified paragraphs. Remove duplicated explanations, orphan headings,
   unexplained terminology, decorative lists, and conclusions that merely repeat the introduction.
8. Run specification generation, link/static-site checks, focused tests, and `git diff --check`.

## Placement rules

### DS specification

Use a DS for stable contracts: ownership, invariants, inputs and outputs, failure semantics, security boundaries,
compatibility, versioning, and resolved architectural decisions. Start with why the contract exists and what it
governs. Keep `Core Content` normative and cohesive. Put concise rationale in consecutively numbered
`Decisions & Questions`; use `Response:` only for settled decisions and `Options:` for genuinely unresolved choices.

Do not use a DS as a tutorial, changelog, implementation diary, marketing page, exhaustive code listing, or catalogue
of imagined future features. Move operational reference material to a dedicated reference page and walkthroughs to a
tutorial. A DS may include one small example when it removes semantic ambiguity.

### Tutorial

Teach one complete task through author-visible concepts. State what the reader will accomplish, why the example was
chosen, prerequisites, and what the tutorial deliberately does not teach. Prefer real author DSL, source text, CLI
commands, and observable results. Reveal runtime plans, traces, or persistent ESM modules only when the reader is
learning to inspect or debug that layer; label each value as author source, generated program, result module, or trace.

Do not invent a parallel data representation for explanatory convenience. Never abbreviate a canonical value in a way
that resembles exact output. Link to a reference page for complete constructor and method contracts.

### Concept or architecture page

Explain why a subsystem exists, its boundary, its effect on the rest of the system, and the smallest useful mental
model. Use one representative example and link deeper contracts. Avoid restating every primitive, CLI option, or DS
decision.

### Reference or man page

Optimize for lookup. Exact enumerations, parameter tables, schemas, defaults, conflicts, exit codes, and artifact
locations belong here. Group entries by user decision rather than implementation module. Reference completeness is not
permission to repeat the same explanation across tutorial and architecture pages.

## Readability gates

- Give each page one primary reader promise and each section one job.
- Put the motivating problem before the mechanism and the consequence after it.
- Prefer a short causal paragraph over fragmented lists. Use a list only for genuine choices or independent items, a
  table for repeated exact mappings, and a diagram only when relationships are harder to understand linearly.
- Avoid four parallel taxonomies when one sequence or distinction is enough. Name the canonical distinction once and
  reuse it.
- Introduce terms before abbreviations. Keep examples near the concept they explain.
- Remove filler, self-congratulation, repeated caveats, generic transitions, and sentences that add no new constraint
  or understanding.
- Keep one authoritative explanation for each idea. Other pages summarize only what their reader needs and link back.
- Preserve uncertainty. Do not turn a proposal, aspiration, benchmark fixture, model output, or derived index into a
  production guarantee.
- End with the result, limitation, and next useful document; do not summarize the whole page again by default.

## Review output

Finish with a concise account of changed reading paths, moved or consolidated ideas, rejected overclaims, unresolved
issues, and validation run. Do not report word-count reduction as quality unless reader purpose and contract coverage
were also preserved.
