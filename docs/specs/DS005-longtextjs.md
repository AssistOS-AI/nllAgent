---
id: DS005
title: LongTextJS Semantic and Data Contract
status: accepted
owner: nllAgent maintainers
summary: Defines the data-only document world, source authority, observations, ambiguity, status, scopes, tasks, coverage, and gaps.
---

# Introduction

LongTextJS is the declarative instance language consumed by CircuitJS. It represents what is available in a document run and the limits of that materialization. It does not decide whether the rules were satisfied.

# Core Content

## Canonical program

A LongTextJS program must declare its dialect version, program identity, source packages, views, schemas, ontology-pack selection, observations, mentions, entities, identity candidates, scopes, worlds, task, capabilities, coverage records, gaps, and diagnostics. The canonical representation is plain data validated before execution.

`LongTextJS` names a declarative data language, not an arbitrary JavaScript module. The current canonical dialect is `longtextjs-json@1`: JavaScript implementation code compiles a source revision into a JSON-compatible `LongTextProgram`, and the runtime interprets that value through relation adapters, compatibility checks, circuits, and verifiers. The persisted artifact contains no callbacks, imports, control flow, ambient capabilities, or executable source. A future authoring shorthand may construct the same data, but it must normalize losslessly to the canonical program and cannot become a second runtime authority.

The default audit task requests `CNLAuditReport@1`; the planning task requests `CNLGenerationPlan@1`. These names identify the canonical CNL products directly instead of introducing a second branded report alias.

The source package is the lexical authority. It preserves input bytes or their immutable digest, canonical text, encoding, media type, language declaration, source revision, block tree, channel map, and source maps. A finding must cite only text that can be verified against the source revision.

The current Markdown compiler emits dialect `longtextjs-json@1` with one source, a `view:whole` view, document and structural scopes, a primary world, task metadata, an anchor table, ordered blocks, observations, capabilities, coverage, gaps, and diagnostics. Structural observations include headings, paragraphs, heuristic sentences, physical lines, list items, quotations, code blocks, and thematic breaks, plus paragraph roles such as dash-prefixed dialogue candidates. Fenced code, block quotes, lists, headings, and ordinary narrative paragraphs retain distinct channel and structure metadata.

The platform vocabulary is an extensible upper ontology for document computation: source objects, blocks, anchors, scopes, views, mentions, entity hypotheses, identity links, typed observations, worlds, time-bearing payloads, provenance, status, coverage, and gaps. It standardizes how a domain assertion is addressed and qualified; it does not assert a universal inventory of people, actions, relations, emotions, legal duties, measurements, or narrative roles. Exact domain schemas and their producers belong to versioned release packages.

The default Markdown pass materializes deterministic source and structural objects and, unless disabled, applies the versioned foundation defined by DS021. That bounded pass recognizes controlled-English entity, state, type, explicit `before`, exact-arithmetic, quantity, and literal-emotion assertions under verified open-world coverage. These remain anchored source claims. The pass does not populate resolved identity relations or infer unrestricted actions, intentions, emotions from behavior, discourse roles, figurative meaning, or outside-world truth. After CircuitJS compilation derives a neutral demand, an approved extraction profile may add domain observations such as `narrative.object-event@1` as `proposed`, with exact anchors, alternatives, and producer provenance.

## Queryable instance semantics

The canonical program is also the finite immutable instance world for its source revision. `source` and `task` are singular records; `anchors` is an id-keyed map; `ontologyPacks` records the selected semantic baseline; and `blocks`, `views`, `scopes`, `worlds`, `mentions`, `entities`, `identityCandidates`, `observations`, `capabilities`, `coverage`, `gaps`, and `diagnostics` are finite relations in the semantic sense. Their JSON container shape does not grant or remove evidentiary authority.

A query adapter may expose these components as read-only logical relations and may build deterministic type, status, anchor, scope, order, or coverage indexes. Every result remains derived data with dependencies on canonical identities. An index is discardable, is keyed by the complete program digest and adapter version, and cannot create an observation, close an open world, alter a status, upgrade a guarantee, or enter a source digest as if it were evidence.

`observations` is the typed descriptive relation most circuits consume. `anchors`, `blocks`, `views`, and `scopes` locate it. `coverage`, `capabilities`, `gaps`, and `diagnostics` state what materialization could or could not establish. `worlds`, identity records, and time-bearing payloads prevent incompatible interpretations from being flattened. `task` fixes the permitted purpose and operational boundary. DS020 implements an experimental normalized scan algebra over these existing structures; it does not change the canonical LongTextJS kind or make a database mandatory.

## Anchors and views

An anchor must include a source identifier, revision, start and end offsets, exact quote, quote digest, block identifier, structural path, and optional surrounding context. Offset ranges are half-open Unicode code-point ranges in canonical text. Adapters must declare when original byte offsets differ from canonical code-point offsets.

A view is a declarative selection of source blocks and observations with stable order and a coverage claim. It must not introduce synthetic text as if it were source. Summaries, translations, OCR, and derived tables are separate derived artifacts with provenance and alignment.

Anchors are checked twice on the model-assisted path: the backend must return an exact quote, and the materializer locates that quote inside the specific block before converting its local position to a global Unicode code-point range. Repeated identical quotes are assigned to successive exact occurrences in stable response order instead of all being attached to the first occurrence. A candidate whose quote does not occur becomes a `model-output` gap and is never admitted as an observation.

## Observations

Every observation must include an identifier, nominal versioned type, payload, scope references, anchor or explicit external provenance, status, producer, support, alternatives, and confidence metadata where available. Core status values are `given`, `extracted`, `proposed`, `assumed`, `derived`, `certified`, `refuted`, `human-confirmed`, and `unknown`.

Confidence values are ranking signals and must not replace status. `proposed` remains proposed at any numeric score. A `derived` observation must name the circuit and premises that produced it. A `certified` observation must identify the checker and exact property checked.

## Identity and worlds

Mentions are anchored local occurrences. Entities are scoped identity hypotheses over mentions. Same-identity and distinct-identity links require evidence and scope. Unresolved alternatives must remain in candidate sets rather than being collapsed for convenience.

A world contains a coherent set of assumptions and observations. Mutually exclusive worlds must not be unioned. Circuits may execute across several worlds. If all produce the same verified finding, the ambiguity is immaterial for that finding. Divergent verified results must produce an ambiguous or conflict outcome with the discriminating premise.

## Time and scope

Scopes may represent document structure, narrative scenes, calendar intervals, jurisdictions, versions, experimental regimes, or hypothetical worlds. Scope relationships include containment, precedence, overlap, validity, and derivation. Time values must retain timezone, calendar, precision, and whether time is observed, effective, reported, or narrative.

## Task and demand

The task must declare its goal, source and view scope, selected or selectable release circuits, absence policy, budgets, desired guarantee, expected finding contract, and review policy. Observation demands must describe neutral observable requirements, not the condition that would make a violation true.

## Coverage, capability, and gap

Coverage must identify source revisions, channels, scopes, observation types, method, completeness mode, exclusions, failures, and producer version. Completeness is multidimensional; one global percentage is not sufficient. Closed-world conclusions require a matching certified coverage record.

Capabilities describe what the compiler can materialize. Gaps describe a missing type, producer, structure, context, identity, language, source, resource, or coverage property. Gaps are inputs to compatibility and learning, not equivalent to negative observations.

## Invariants

Interpretation must not replace source. Every observation must have source or external provenance. Derived objects must declare their support. Incompatible alternatives must remain distinct. Negative findings must not exceed proven coverage. A task must fix a release or a deterministic release-selection policy.

# Decisions & Questions

### Question #1: Why are offsets defined over canonical Unicode code points?

Response: JavaScript string indexes use UTF-16 units, while byte offsets depend on encoding. The implementation stores both internal UTF-16 offsets for slicing and canonical code-point offsets for portable artifacts, with explicit conversion metadata.

### Question #2: Is LongTextJS expected to formalize every sentence?

Response: No. It materializes the observations demanded by applicable circuits and records gaps. Selective, declared materialization is a core design property.

### Question #3: Can CircuitJS-derived observations return to LongTextJS?

Response: They may appear in execution memory or be published through a typed derived-observation port. They retain `derived` status and cannot be rewritten as source observations.

### Question #4: Does a translation backend construct the complete LongTextJS object?

Response: No. The deterministic compiler owns source identity, blocks, anchors, views, task, capability, coverage, and gaps. Achilles or a Coding Agent translation adapter receives one source block and one demanded schema at a time and returns only candidate observations. The shared materializer validates and inserts them, so changing backends cannot bypass LongTextJS invariants.

### Question #5: How are two observations with the same quoted text anchored?

Response: Within a block, the materializer consumes exact occurrences in order. This keeps two repeated mentions distinct and prevents a valid-looking observation list from collapsing all provenance onto the first lexical match.

### Question #6: What role does LongTextJS play during generation planning?

Response: The high-level idea is compiled as an ordinary untrusted LongTextJS source with anchors, structural or semantic observations, coverage, and a planning task. Planning circuits consume those observations to build an idea-specific CNL plan. If realization is requested, each candidate becomes a new LongTextJS program for validation. CNL neither replaces LongTextJS nor turns user instructions into rule authority.

### Question #7: Why does the default task request CNLAuditReport rather than a product-branded report type?

Response: `CNLAuditReport@1` is the canonical schema that the runtime actually assembles and persists. Naming it directly keeps the task contract aligned with DS011 and avoids a redundant alias whose spelling could drift from the artifact it denotes.

### Question #8: Does calling LongTextJS queryable make query results source facts?

Response: No. A query selects or derives values from canonical program objects and must retain their dependencies. Only approved ingestion and materialization paths create source-side observations, coverage, and gaps. Query rows and indexes remain derived execution data.

### Question #9: Is LongTextJS JavaScript or JSON, and in what sense is it executable?

Response: Its canonical runtime and persistence form is JSON-compatible plain data under `longtextjs-json@1`. The compiler and runtime are implemented in JavaScript, but a LongTextJS program itself contains no executable JavaScript. It is executable in the declarative sense: the runtime can mount its finite relations, answer typed queries, bind CircuitJS ports, check coverage, and replay evidence. CircuitJS has a restricted `.mjs` author convenience because maintainers author reusable theories; that source is also normalized to plain data before compilation. Document instances are compiler outputs, so admitting arbitrary JavaScript into them would add authority and nondeterminism without adding evidence.

### Question #10: Why does the default compiler extract only a small foundation rather than every entity, action, relation, or emotion?

Response: The foundation admits only versioned, conservative forms that can be tested and replayed without a model. Richer categories vary by domain, identity and polarity may be ambiguous, and exhaustive semantic extraction cannot generally establish closed-world coverage. The selected release therefore demands only the additional observations its output-reachable circuits need. A continuity release may request object events and identities; an affect release may request a separately defined emotional-interpretation schema. Such results normally remain `proposed` until stronger review or checking occurs.

# Conclusion

LongTextJS is a persistent, addressable, ambiguity-preserving document world whose most important output is not only observations, but also a precise account of what was not established.
