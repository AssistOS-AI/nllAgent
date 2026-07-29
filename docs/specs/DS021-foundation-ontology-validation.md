---
id: DS021
title: Foundation Ontology and Default Validation
status: implemented
owner: nllAgent maintainers
summary: Defines the versioned default foundation pack, its bounded ontology and circuits, opt-out behavior, and the boundary between invariants and changing world knowledge.
---

# Introduction

Every agent should detect a few elementary inconsistencies without relearning them from each rulebook. This specification defines `foundation-core@1.1.0`, a small platform pack enabled by default for audit and realization validation. It materializes explicitly worded entities, types, states, temporal order, arithmetic equalities, physical quantities, and emotions. Five verifier-dominated circuits check only the bounded invariants defined here.

This is not a claim that nllAgent has unrestricted human common sense. The implemented pack recognizes a documented controlled-English subset and reports potential inconsistencies with its limitations attached. This document governs that common baseline, its release identity, and how a caller disables it. Agent-specific rules, rich semantic extraction, and changing knowledge about the world remain outside its scope.

# Core Content

## The boundary: invariants, source claims, and world knowledge

The platform may safely ship principles whose meaning does not depend on a current office holder, market price, jurisdiction, or disputed social interpretation. The pack contains a compact baseline:

- one bounded assertion cannot be both affirmed and denied;
- the pairs `alive/dead`, `open/closed`, `present/absent`, and `on/off` are incompatible when they apply affirmatively to the same subject, world, time frame, and explicit time;
- a strict `before` relation cannot contain a directed cycle;
- an exact arithmetic equality must replay, and division by zero is undefined;
- exact quantities for one subject, measure, unit, world, frame, and time cannot have different values;
- ordinary mass, duration, distance, length, and speed are non-negative, probability is in `[0,1]`, percentage is in `[0,100]`, and absolute temperature cannot be below zero kelvin or its exact Celsius/Fahrenheit equivalent;
- a quantity unit must belong to the declared measure's small unit vocabulary;
- the declared classes `person`, `animal`, and `sentient agent` are disjoint from `inanimate object`; an explicitly inanimate subject cannot literally affirm an emotion under the same source-world reading;
- one experiencer cannot both affirm and deny the same emotion toward the same target in the same bounded context.

The materializer records what the source asserts; it does not certify that the source assertion is true. A sentence such as “The north door is open at noon” becomes a typed state assertion anchored to that sentence. The circuit may then compare it with another source assertion. This separation is essential: ontology gives terms and invariants, LongTextJS records source claims, and CircuitJS judges only the bounded relationship declared by the invariant.

Political, social, economic, legal, and geographic facts must not be compiled into this core as timeless truth. They change, depend on date and jurisdiction, or admit contested classifications. Such material belongs in an optional `KnowledgePack` with source digest, effective interval, jurisdiction, world, status, update policy, guarantee ceiling, and benchmarks. Knowledge-pack loading is a future extension; until it exists, documentation and reports must not imply that current-world facts are checked automatically.

## Default pack and selection

`run`, `benchmark`, and realization validation select `core` when `--foundation` is omitted. `--foundation off` disables both foundation materialization and its circuits. Planning ideas retain the selected ontology metadata, while only a realized document enters validation. The selection is explicit in the run record, `foundation.json`, canonical CNL audit, Markdown report, and reproduction command.

Disabling the pack is appropriate for a deliberately different logic or world model, including some speculative fiction, games, simulations, or tests. It is not a way to make an ordinary document pass agent-specific rules: release circuits continue unchanged. A future named replacement pack must use the same explicit selection and provenance boundary; silently shadowing core concepts is forbidden.

The platform pack is an immutable execution input beside the agent release. Its descriptor carries `id`, semantic version, dialect, digest, language profile, observation types, vocabularies, principles, and limitations. The nested vocabulary collections are immutable in process. A release circuit may not reuse a foundation circuit identifier. Updating an axiom, parser meaning, observation schema, circuit, or verifier requires a new version and regression evidence.

## Implemented LongTextJS observations

The deterministic compiler scans every `document.sentence@1` observation and may add:

| Type | Meaning | Recognized form |
| --- | --- | --- |
| `foundation.entity-mention@1` | A subject, event, or target label mentioned by a recognized source assertion. | Derived from the forms below; it is a mention, not resolved identity. |
| `foundation.state-assertion@1` | Subject, affirmed/denied predicate, present/past frame, optional explicit `at …` time, and source world. | `SUBJECT is/are/was/were [not] PREDICATE [at TIME].` |
| `foundation.type-assertion@1` | A positive or negative assignment to one small built-in class vocabulary. | `SUBJECT is/are/was/were [not] a/an KIND [at TIME].` where `KIND` is documented below. |
| `foundation.temporal-relation@1` | An explicit strict order between two event labels. | `EVENT happened/occurred/happens/occurs/took place/takes place before EVENT.` |
| `foundation.arithmetic-assertion@1` | Two finite decimal operands, one exact operation, and the stated result. | `NUMBER plus/minus/times/divided by NUMBER equals NUMBER.` |
| `foundation.quantity-assertion@1` | Subject, measure, exact decimal value, unit, optional time, frame, and source world. | `SUBJECT has MEASURE NUMBER [UNIT] [at TIME].` |
| `foundation.emotion-assertion@1` | Experiencer, emotion label, polarity, optional target and time, and source world. | `SUBJECT feels/felt EMOTION [toward TARGET] [at TIME].` or `SUBJECT does/did not feel …`. |

The initial class vocabulary is `person`, `animal`, `sentient agent`, `inanimate object`, `physical object`, `event`, and `place`. The quantity vocabulary is `mass`, `duration`, `distance`, `length`, `speed`, `temperature`, `probability`, and `percentage`, with the unit sets published in the pack descriptor and documentation. Words outside these finite vocabularies remain ordinary state text or unmaterialized semantics; the parser must not guess a new class, measure, or unit.

Every observation has `status: extracted`, the exact sentence anchor, its source sentence as provenance, grammar identity, and `world:source`. Normalization is Unicode NFKC, case-insensitive, whitespace-collapsed comparison. It does not resolve pronouns, aliases, modality, reported speech, or implicit time. The producer declares verified `open-world` coverage: the complete controlled-pattern scan ran, but the resulting semantic domain is not claimed complete.

The compiler must not reinterpret arbitrary clauses as known facts merely because they match the grammar. For example, “The city is prosperous” is an anchored source state assertion, not a platform certificate about that city. An emotion record says that the source explicitly attributes an emotion; it neither diagnoses a person nor infers an internal state from behavior. Richer entities, actions, relations, implicit quantities, figurative language, and interpretations remain neutral observations produced by a release extraction profile or a future versioned materializer.

## Default circuits and findings

`foundation.logical-consistency@1.0.0` groups state assertions by normalized subject, source world, time frame, and explicit time. It constructs a candidate for opposite polarity on the same predicate or for two affirmative predicates in the small exclusive-pair registry. With no explicit time, it may still report a potential inconsistency, but the finding must state that the source did not prove a shared real-world moment.

`foundation.temporal-consistency@1.0.0` builds a directed graph from explicit `before` relations and constructs one bounded candidate for each detected cycle. It does not infer event identity beyond the normalized labels and does not infer missing relations.

`foundation.arithmetic-consistency@1.0.0` evaluates decimal expressions as exact rational numbers rather than floating-point approximations. Each whole and fractional component is limited to 128 digits before materialization. The circuit reports a stated equality that does not hold or a division by zero. It does not evaluate algebra, variables, powers, significant figures, tolerances, or approximate notation.

`foundation.physical-consistency@1.0.0` checks unit compatibility, the documented physical bounds, and conflicting exact quantity assertions. Celsius and Fahrenheit lower bounds are exact decimal representations of absolute zero; no other unit conversion or physical law is inferred.

`foundation.emotional-consistency@1.0.0` checks opposite polarity for the same explicit emotion attribution, disjoint positive type assertions, and a positive literal emotion attributed to a subject explicitly typed as inanimate in the same bounded context. It deliberately does not declare emotions such as joy and sadness mutually exclusive: mixed, rapidly changing, reported, metaphorical, and fictional emotions are legitimate possibilities.

All five circuits are ordinary direct CircuitJS graphs: typed ports, an exact registered operator, an independent replay verifier, and `emit`. Findings use warning severity and a domain-specific `potential-*-inconsistency` verdict. Each verifier rereads canonical observation types, operands or bounded context, source revision, and exact anchors. Mechanical certification means the documented parse, calculation, invariant, and witness were replayed exactly; it does not certify the source assertion as outside-world truth or make a psychological diagnosis.

## Failure, security, and explanation

The pack is deterministic, offline, finite, and uses no model, callback, ambient I/O, current date, or external database. Its circuits use ordinary node and wall-time budgets. An invalid mode is a CLI usage error. A missing registered foundation operator, circuit collision, invalid witness, or pack digest mismatch is an execution or publication failure, never “no inconsistency.”

Every finding names the built-in rule reference, all support anchors, pack version, verifier, certificate, remediation, and limitations. Reports must identify whether foundation processing was `foundation-core@1.1.0` or `off`. Documentation examples must distinguish a source assertion from an ontology axiom and must not describe open-world pattern coverage as semantic completeness.

## Tests and extension gate

Tests cover parser positives and close negatives, every materialized type, exact decimal arithmetic, division by zero, quantity disagreement, unit mismatch, every lower/range bound, explicit emotion polarity, disjoint types, inanimate emotion attribution, mixed-emotion non-conflict, time separation, open-world coverage, forged-witness rejection, default CLI activation, persisted pack identity, and opt-out behavior. The complete offline suite also proves that existing release circuits remain independent.

A future core expansion requires a stable neutral observation schema, conservative interpretation, independent verifier, positive and close-negative examples, ambiguity and time cases, mutation tests, runtime bounds, semantic-version impact, and a demonstrated reason it belongs in every ordinary agent. A changing or disputed fact fails that gate and belongs in a knowledge pack instead.

# Decisions & Questions

### Question #1: Why is the foundation enabled by the runtime instead of copied into every agent release?

Response: Repetition would make identical elementary semantics drift across agents. The runtime applies one versioned overlay and records its digest beside the selected agent release, preserving both reuse and reproducibility.

### Question #2: Why are the first findings warnings rather than blocking errors?

Response: Exact replay proves the controlled parse and relation, but omitted time, identity, modality, and narrative perspective can still explain an apparent conflict. The finding is useful by default without pretending that the first parser version settled those questions.

### Question #3: Why are current geographic or political facts excluded from core?

Response: They are not universal invariants. Treating them as hardcoded truth would make results stale, jurisdiction-blind, difficult to reproduce, and unsafe for historical or fictional worlds. A dated and sourced optional knowledge-pack contract is the correct extension point.

### Question #4: How does an alternative-world document opt out?

Response: Pass `--foundation off` to `run`, `benchmark`, or `plan`. The choice is persisted and shown in reports; it never disables the agent release's own circuits.

### Question #5: Why does the psychology baseline check explicit contradiction but not infer emotional truth?

Response: Emotion recognition from unrestricted prose depends on context, behavior, culture, narrative voice, and interpretation. The core parser accepts only literal attribution syntax. It can safely compare the resulting source claims and an explicit inanimate classification, while diagnosis, causal inference, valence, intensity, and behavioral interpretation remain domain work.

### Question #6: Why are the physics rules limited to units and elementary bounds?

Response: Rich physical judgments require object identity, frames of reference, measurement uncertainty, conditions, equations, and domain-specific constants. The implemented bounds are useful, stable, and independently replayable. More ambitious mechanics or thermodynamics belongs in versioned scientific operators and benchmarks rather than hidden heuristics in ingestion.
