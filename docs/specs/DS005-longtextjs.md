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

A LongTextJS program must declare its dialect version, program identity, source packages, views, schemas, observations, mentions, entities, identity candidates, scopes, worlds, task, capabilities, coverage records, gaps, and diagnostics. The canonical representation is plain data validated before execution.

The default audit task requests `CNLAuditReport@1`; the planning task requests `CNLGenerationPlan@1`. These names identify the canonical CNL products directly instead of introducing a second branded report alias.

The source package is the lexical authority. It preserves input bytes or their immutable digest, canonical text, encoding, media type, language declaration, source revision, block tree, channel map, and source maps. A finding must cite only text that can be verified against the source revision.

The current Markdown compiler emits `LongTextJS` dialect `1.0` with one source, a `view:whole` view, document and structural scopes, a primary world, task metadata, an anchor table, ordered blocks, observations, capabilities, coverage, gaps, and diagnostics. Structural observations include document, paragraph, sentence, and physical-line forms, plus line-channel candidates such as dash-prefixed dialogue. Fenced code, block quotes, lists, headings, and ordinary narrative paragraphs retain distinct channel and structure metadata.

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

# Conclusion

LongTextJS is a persistent, addressable, ambiguity-preserving document world whose most important output is not only observations, but also a precise account of what was not established.
