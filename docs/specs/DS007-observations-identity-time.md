---
id: DS007
title: Observation Extraction, Identity, and Time
status: accepted
owner: nllAgent maintainers
summary: Defines extraction planning, producer contracts, semantic neutrality, identity candidates, temporal records, state materialization, and dynamic observation requests.
---

# Introduction

Observation materialization connects document structure to circuit inputs. It must maximize useful coverage without allowing the target verdict to contaminate extraction.

# Core Content

## Observation planning

The planner must derive observation demands from selected circuits, merge compatible demands, deduplicate shared types and scopes, and order producers by cost, determinism, and narrowing value. Deterministic structural and lexical producers run before statistical or model-assisted producers when their output can reduce semantic search.

The LongTextJS upper ontology standardizes the containers and epistemic qualifiers shared by every domain: anchored mentions, scoped entity hypotheses, identity candidates, typed observations, scopes, worlds, time, status, provenance, coverage, alternatives, and gaps. DS021 adds a small default vocabulary for controlled state, type, temporal, exact-arithmetic, quantity, and literal-emotion assertions. Domain schemas extend this boundary with exact payloads for richer events, actions, relations, emotions, obligations, measurements, or other concepts; those remain demand-driven.

Each producer contract must declare its identifier, version, accepted source and view types, output schemas, maximum epistemic status, deterministic or nondeterministic nature, effects, language and domain support, coverage semantics, cost model, resource budgets, and checker. A producer must not emit a type or status above its contract.

## Neutrality and evidence

Extraction prompts and rules must describe the requested observation independently of the finding condition. A continuity extractor searches for abandonment, transfer, recovery, replacement, use, negated events, hypothetical events, and reported events in the demanded scope; it must not search only for evidence supporting a discontinuity.

Every model-assisted observation must include exact supporting anchors, payload values tied to the evidence, operational confidence, alternatives considered, producer identity, model capture reference, and reasons supplied by the producer. Local semantic checks must confirm quote existence, polarity, modality, discourse attribution, enum values, and referential integrity.

The release may list JSON extraction profiles. The runtime selects only profiles whose output types are demanded by circuit ports or a dynamic request. Each block call uses the backend-neutral `model.structured-extractor@1` operator, requires an exact source quote, validates required payload fields and enums, requires bounded confidence, alternatives, and an evidence reason, and stores the result as `proposed`. Configured Achilles routes the request through `LLMAgent`; a Coding Agent adapter supplies the same response shape under DS018. Model producers receive open-world coverage and cannot establish exhaustive absence.

The current generic model materializer adds only typed entries to the `observations` relation. The deterministic Markdown baseline leaves `mentions`, `entities`, and `identityCandidates` empty. A release that needs resolved participants must therefore demand an approved identity-capable producer or represent its bounded participant fields inside a documented observation schema; it must not infer global entity identity from repeated strings. Future dedicated producers may populate the identity relations only under the same anchoring, status, alternative, provenance, and coverage rules.

The materializer distinguishes failure strength. Invalid candidates and isolated block failures are quality gaps; valid observations from the same producer may still support a `compatible-with-limits` result. A profile-level `minimumObservations` failure is `insufficient-materialization` and blocks a critical port. Exhausted call budget terminates the run rather than becoming a zero-observation result.

## Identity service

Identity resolution must distinguish mentions, entity candidates, aliases, same-identity evidence, distinct-identity evidence, and scoped decisions. It must support alternative worlds and avoid global merging solely from string equality. Legal identifiers, serial numbers, approved registries, and human decisions may provide stronger evidence than semantic similarity.

Identity links that influence a finding must appear in its premises or witness. Retracting or superseding a link must invalidate dependent states and findings without affecting other candidate worlds.

## Temporal service

Temporal records must distinguish instants, intervals, uncertain bounds, document order, narrative order, effective time, reported time, observation time, timezone, calendar, and precision. Calendar and unit operations must be versioned operators. The runtime must not equate a calendar day with 24 elapsed hours or compute a business day without the selected calendar.

Interval relations must support at least before, after, meets, overlaps, starts, during, finishes, equal, and their converses. Contradiction and obligation circuits must align temporal scope before comparing values.

## State materialization

Events may initiate, terminate, release, supersede, or revise state according to a circuit-owned transition theory. LongTextJS stores the observations and resulting state histories with provenance; it does not impose universal inertia. Each state entry must retain entity, property, value, world, scope, interval, support, status, and termination reason.

## Dynamic demands

A circuit may emit a typed `NeedObservation` containing schema, subject, scope, inclusion policy, required coverage, reason, priority, and remaining budget. The compiler may run only approved producers and adapters. Rounds are bounded. An unsatisfied demand becomes a gap and possibly a `LearningNeed`; it must not become evidence of absence.

The scheduler exposes `ask` as a plain-data `NeedObservation`. The analyzer reruns only approved extraction profiles for the requested types and then reexecutes the circuit, up to the configured dynamic-demand round budget. An unresolved critical demand terminates as `stopped-incomplete`, suppresses findings from the incomplete global task, writes an issue, and exits with code `4`.

# Decisions & Questions

### Question #1: Who owns transition semantics?

Response: CircuitJS owns domain transition rules. LongTextJS provides events, scopes, time, and a place to store derived histories while preserving the circuit and premises that produced them.

### Question #2: When may model outputs be treated as observations?

Response: After schema, anchor, and local semantic validation, they may be stored as `proposed`. Human confirmation or an independent checker may raise a precise property, but a model confidence score alone cannot.

### Question #3: How does the system avoid repeated extraction on long documents?

Response: Materializations are cached by source digest, view, demand, producer version, model profile, and operational context. Dependency invalidation reuses unaffected results.

### Question #4: Can a model-assisted observation become mechanically certified because a later comparator is deterministic?

Response: No. Exact anchor verification may certify the quoted span and a deterministic operator may certify its own calculation, but the finding guarantee retains the `evidence-certified` or `model-judgment` ceiling inherited from the proposed semantic premise.

### Question #5: How does a Coding Agent preserve the same extraction semantics as Achilles?

Response: Both receive the same neutral prompt, output JSON Schema, task role, source block, and profile. Both return `observations[]` with quote, payload, confidence, alternatives, and reason. The shared materializer, not either backend, owns validation, anchoring, capability, coverage, and gaps.

### Question #6: What semantic ontology is built in?

Response: The shared upper ontology covers identity, evidence, scope, time, uncertainty, and coverage. `foundation-core` additionally recognizes the six controlled assertion families defined by DS021 and feeds five default circuits. It does not resolve identity, infer arbitrary actions or emotions, diagnose people, understand figurative language, apply rich physical models, or supply current world facts. Domain packages provide those richer schemas and producers on demand.

### Question #7: Does a lexical marker such as “in fact” prove surprise or another emotional interpretation?

Response: No. Its exact occurrence and location are deterministic lexical facts. Its discourse function or emotional effect depends on context and a declared interpretive schema. An editorial rule may judge the phrase directly without asking for emotion observations; a discourse or affect circuit may separately request and review such observations. Neither reading is silently inserted into the other.

# Conclusion

Observation extraction is a planned, evidence-preserving compilation step. Identity, time, and state remain explicit and revisable so distant passages can be combined without creating hidden assumptions.
