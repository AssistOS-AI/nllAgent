---
id: DS016
title: Domain Modules, Solvers, and Research Extensions
status: accepted
owner: nllAgent maintainers
summary: Defines extension packaging for editorial, normative, technical, scientific, multilingual, multimodal, solver, repair, and formal-verification capabilities.
---

# Introduction

The core system must support radically different document theories without embedding each domain in the runtime. Extensions enter through common contracts and remain independently evaluated.

# Core Content

## Extension package

Every extension must provide versioned LongTextJS schemas, neutral producers or adapters, CircuitJS operators or patterns, verifier contracts, compatibility probes, benchmark families, security effects, cost model, explanation policy, and migration rules. A new prompt without these artifacts is not a platform extension.

## Editorial modules

Editorial packages may cover lexical restrictions, sentence metrics, dialogue scope, focalization, mental-state access, repetition, chronology, object continuity, character knowledge, revelations, and rubric-based style suggestions. Exact rules may be mechanical. Semantic style judgments must remain evidence-certified, model-judgment, or human-confirmed.

## Normative modules

Normative packages must distinguish authority, effective version, trigger, bearer, action, object, deadline, evidence, exception, compensation, priority, permission, prohibition, and coverage. Outcomes include compliant, non-compliant, not-applicable, undetermined, and policy-conflict. Calendars and registries are versioned operational context.

## Technical and scientific modules

Technical packages may define quantities, units, tolerances, components, configurations, definitions, requirements, procedures, measurements, claims, evidence, datasets, and applicability conditions. Unit conversion, interval consistency, dependency impact, procedure state machines, claim-evidence alignment, and causal-language review use specialized operators and witnesses.

## Solver integration

SMT, CSP, MILP, symbolic algebra, graph algorithms, model checking, simulation, and theorem proving must remain external theories behind typed operators. Results must identify assumptions and return the appropriate model, unsat core, bound, path, trace, numerical tolerance, or proof term. The runtime must not call every result a proof.

## Multilingual and multimodal support

Multilingual materializations preserve original text, translation, alignment, concept identity, language-specific producer profile, and translation losses. Benchmarks include false friends, jurisdictional differences, and code-switching.

Multimodal adapters preserve page or region anchors, OCR text, table geometry, diagram relationships, formula structure, crop digests, and model identity. Vision observations start as proposed unless a deterministic checker establishes a precise property.

## Counterfactual remediation and active learning

Repair search operates in alternative worlds and proposes minimal changes. It must preserve protected text, re-run affected circuits, and label model-authored edits as proposals. Active learning may rank questions by expected impact, but the ranking does not change authority or auto-approve an answer.

## Formal assurance

Critical runtime properties such as verification dominance, fixpoint monotonicity, certificate composition, and selected witness checkers may be mirrored in a proof assistant. Formal kernels reduce the trusted base but do not prove unformalized semantic extraction.

# Decisions & Questions

### Question #1: When should a repeated circuit pattern become a primitive?

Response: Only after multiple evaluated circuits demonstrate stable semantics, a clear contract, measurable complexity reduction, verifier support, and mutation tests. The primitive proposal must preserve existing behavior.

### Question #2: Is multimodal support part of the default Markdown CLI?

Response: The extension contract is complete, but the default Markdown adapter does not infer image semantics. A document requiring unavailable multimodal evidence becomes incompatible for dependent circuits.

### Question #3: Can the system verify arbitrary scientific truth?

Response: No. It can verify declared relationships, computations, procedure conformance, evidence alignment, and solver-backed properties under explicit assumptions. Open scientific interpretation remains bounded and reviewable.

### Question #4: What must a domain provide for CNL generation planning?

Response: It must provide representative ideas, idea-observation schemas, one or more planning patterns, expected idea-specific CNL plans, and the authority and validation assets already required by the domain. Editorial, normative, technical, and scientific modules should reuse rule identities, schemas, calendars, units, operators, and validation oracles. Content selection, ordering, and dependencies belong in explicit planning circuits or registered planning operators rather than hidden prompts. Optional realization and repair require separate tests.

# Conclusion

Domain breadth comes from published modules and solver contracts, not from weakening the core into an opaque universal prompt. Unsupported extensions remain explicit gaps.
