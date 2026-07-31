---
id: DS016
title: Controlled Natural Language, Repair, and Generated Documents
status: implemented
owner: nllAgent maintainers
summary: Defines typed generation frames, deterministic dialect round-trip, bounded synthesis, and the boundary between verified repair and ordinary prose.
---

# Introduction

nllAgent can suggest a clause or document, but semantic intent is constructed before prose. A plausible model-written
paragraph is not treated as a verified repair. The controlled path uses ontology terms, typed frames, a paired renderer
and parser, and concrete re-execution.

# Core Content

## Frames and dialects

A CNLFrame is a typed semantic output. A normative frame contains actor, modality, action, object, scope, condition,
deadline, exception, and authority as required by its concept. Finding, definition, instruction, and scientific claim
frames have their own required slots. Missing critical slots cause a diagnostic or clarification request; the renderer
does not invent content.

A dialect is a `.grammar.mjs` module containing a deterministic renderer, parser, lexicalizations, agreement rules, and
comparison policy. Renderer and parser are paired and versioned. The parser reconstructs an ontology frame, not a plain
object. The comparator requires exact identity for critical slots while allowing approved lexical variants and
surface-order changes.

## Synthesis and repair

SynthesisEngine searches a finite typed grammar declared by the RulePack. Holes have types, finite candidates, or
supported constraints. Cost prioritizes retaining source meaning, changing fewer semantic slots, minimizing textual
change, and using canonical lexicalization. Search budgets are explicit.

Each candidate is applied to a cloned semantic input and executed through the rule circuit. A candidate that still
violates the rule, removes necessary evidence, changes a protected modality, or exceeds budget is rejected. Accepted
CNL text is parsed again and compared with the intended frame. The trace records grammar choice, cost, validation,
round-trip result, and source finding.

## Business example

For a policy saying customer records may be held ten years for convenience while authority limits retention to five
years except for a documented legal obligation, the repair circuit does not replace the number alone. It creates a
general maximum-retention frame and a separate conditional exception frame. The authority, actor, object, deadline
origin, and exception relation are preserved as terms and later lexicalized.

If the source never identifies the deadline origin, synthesis cannot guess “after collection.” It emits a clarification
gap or offers alternatives labeled by assumption. This is the same unknown-is-not-false principle applied to writing.

## Generated documents outside bounded CNL

Longer narrative reports may be assembled deterministically from trace projections and templates. Free-form model
generation is not a runtime circuit capability in this architecture. If a future workflow uses Codex to draft a report,
that draft is an external coding/workspace artifact: it must be reintroduced as source, materialized as LongTextJS, and
checked before acceptance. It cannot claim CNL assurance.

Markdown is the human output format. The authoritative structured generated artifact is an `.mjs` module containing
the frame, evidence, provenance, dialect, round-trip result, and achieved assurance.

## Multilingual use

Ontology identities are language-neutral within a RulePack; lexicalization belongs to a dialect. A Romanian and an
English renderer may target the same frame only if each has a paired parser and passes the same critical-slot
comparison. Translation quality alone is not semantic equivalence.

## Security and authority

Generated text never modifies the authority source or accepted agent automatically. A user can accept a patch into a
separate output or begin a new training operation with revised authority. File writes remain inside the task output.
External URLs, scripts, or instructions appearing in the input are inert source content.

# Decisions & Questions

### Question #1: Why is round-trip required after deterministic rendering?

Response: It tests the actual text and parser pair, catching lost negation, exception scope, actor, time, or modality
that a trusted renderer implementation could still mishandle.

### Question #2: Can CNL preserve stylistic variation?

Response: Only variation admitted by the dialect and proven to reconstruct the same critical frame. Unbounded style
generation has lower assurance.

### Question #3: What happens when no repair exists in budget?

Response: Synthesis reports bounded exhaustion with the original finding and constraints. It does not emit the
least-bad invalid candidate.

### Question #4: May a repair introduce an exception absent from authority?

Response: No. Grammar productions and candidate facts are constrained by the RulePack and evidence. New policy belongs
to retraining after authority review.

### Question #5: Is generated prose a source of semantic facts?

Response: Not until it is explicitly treated as a new source revision, materialized, and checked. Generation output is
not self-validating evidence.
