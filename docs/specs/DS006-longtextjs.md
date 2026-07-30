---
id: DS006
title: LongTextJS Source, Anchors, and Programs
status: implemented
owner: nllAgent maintainers
summary: Defines LongTextJS as an executable ground program with exact source anchors, claims, units, identities, coverage, and gaps.
---

# Introduction

LongTextJS describes what a document expresses. It does not decide whether the document is correct.

# Core Content

A document program is composed from `source`, `span`, `semanticUnit`, `claim`, `mention`, `identityCandidate`,
`alternatives`, `coverage`, `gap`, and ontology constructors. Spans are half-open Unicode code-point ranges checked
against the exact source revision. Claims carry explicit, inferred, proposed, verified, rejected, or ambiguous status
and one or more anchors where required.

Long documents use ESM imports: a source module, stable identities, contexts, section modules, cross-section relations,
coverage, and a root program. There is no parallel manifest. Helpers, loops, and functions may reduce repetition, but
the published semantic result consists only of recognized DSL values.

Markdown ingestion supplies conservative paragraphs and sentence spans. Agent materializers then add domain terms.
They preserve ambiguity and create gaps for relevant notions that the ontology cannot express. Findings and circuit
outputs never enter the observation layer.

# Decisions & Questions

### Question #1: Is generated LongTextJS a snapshot or a recipe?

Response: A persisted run module reconstructs the exact accepted terms and anchors through public constructors. It does
not rerun the translator or materializer and therefore remains an inspectable snapshot program.

### Question #2: Why distinguish mention from entity?

Response: A lexical occurrence has an exact anchor; an entity is a semantic hypothesis with an identity policy. Keeping
them distinct permits aliases, repeated names, competing candidates, and unresolved reference without forced merging.

### Question #3: What does structural Markdown materialization claim?

Response: Only addressable source structure. It does not infer unrestricted entities, actions, modality, identity, or
closed semantic coverage.
