---
id: DS021
title: Foundation Ontology and Default Validation
status: implemented
owner: nllAgent maintainers
summary: Defines the small default source ontology, literal state materializer, verifier-dominated conflict circuit, opt-out, and extension gate.
---

# Introduction

The default foundation provides shared source, semantic, epistemic, temporal, and operational vocabulary plus a bounded
literal state-conflict check. It is not unrestricted common sense.

# Core Content

`nll.core@1` defines source documents, paragraphs, sentences, situations, claims/evidence boundaries, term roles, and
operational findings. The deterministic foundation materializer recognizes the controlled form `SUBJECT is/are/was/were
[not] PREDICATE [at TIME]` and creates anchored `StateAssertion` claims. It does not resolve identity, modality, reported
speech, metaphor, or current-world truth.

`foundation-core@1` compares assertions with the same normalized subject, predicate, and explicit time and emits a
mechanically replayed potential conflict when polarity differs. `--foundation off` disables both materialization and the
circuit for deliberate alternative worlds. Agent circuits remain unchanged.

Core contains no changing political, legal, geographic, economic, or social facts. Such knowledge requires a sourced,
dated, scoped domain module and benchmarks. A foundation expansion needs conservative syntax, exact anchors, a typed
ontology addition, verifier, close negatives, ambiguity/time cases, budgets, and a reason every ordinary agent needs it.

# Decisions & Questions

### Question #1: Why is the new foundation smaller than the previous demonstration?

Response: The rewrite retains the invariant architecture without preserving implementation breadth tied to the deleted
data formats. Only behavior implemented and tested on the new term algebra is claimed now; arithmetic, quantity,
temporal cycles, and emotion may return as ordinary ontology/circuit modules.

### Question #2: Does a conflict finding prove external falsehood?

Response: No. It proves that the source contains two controlled assertions whose normalized bounded contexts and
polarities conflict. The report states that limitation.

### Question #3: Why enable core by default?

Response: Source structure and one literal contradiction invariant are stable and useful across projects. Explicit
opt-out preserves fictional or alternative-world experiments.
