---
id: DS012
title: Multi-Semantic Engines, Assurance, and Architecture Experiments
status: implemented
owner: nllAgent maintainers
summary: Defines the bounded abstract, symbolic, constraint, relation, rewrite, proof, refinement, and synthesis services and records the five experiments that fixed their architectural boundaries.
---

# Introduction

CircuitJS describes a business computation; an engine is one reusable way to solve a subproblem inside that computation;
an interpreter is one way to evaluate a CircuitModel. Keeping these concepts distinct prevents a retention circuit, for
example, from being mislabeled an “abstract circuit” merely because abstract preflight is available for one of its
decision paths.

# Core Content

## Selection and support boundary

The MethodCatalog recognizes ten problem families: query/dataflow, finite decision, constraints, recursive relations,
equivalence rewriting, abstract preflight, symbolic witness, refinement, local proof, and typed synthesis. A plan step
states its ProblemShape and required assurance. The catalog recommends registered SDK providers; it does not generate
an algorithm or decide the business meaning of a rule. Reusing an exact circuit is preferred, followed by composing SDK
primitives, followed by a new reusable primitive. A custom JavaScript macro-node is the normal escape hatch for an
irregular domain algorithm.

Every primitive has concrete semantics. An abstract transfer, symbolic encoder, proof step, or synthesis production is
present only when the plan requires it. Missing abstract support yields conservative top. Missing symbolic support
blocks that witness path. Neither condition changes a valid concrete result; it limits achieved assurance.

## Abstract interpretation

Abstract preflight over-approximates all concrete executions admitted by the selected snapshot and interpretation
policy. Built-in domains cover four-valued evidence, finite choices, numeric intervals, coverage state, type sets, and
bounded interpretation state. The product reducer may use type and coverage facts to remove impossible values, but it
must not manufacture closure or identity.

The worklist is deterministic. Recursive components use widening only when their domain can form an ascending chain;
narrowing is an optional bounded recovery step. Preflight may report must/may/cannot status, unreachable decision rows,
precision loss, or a SemanticDemand. It never publishes a final business finding without the concrete circuit.

## Symbolic and concolic execution

Symbolic execution is deliberately selective. A plan identifies discriminants such as duration, exception presence,
coverage, identity, or temporal order. Primitive encoders produce supported constraint atoms. An opaque macro-node is
treated as uninterpreted or unsupported unless it publishes a reviewed summary or encoder.

Concolic generation begins with an executable benchmark. It records concrete branch choices and symbolic predicates,
negates an uncovered predicate, asks ConstraintKernel for a model, materializes the model as LongTextJS, and replays it
through the concrete circuit. Coverage means decision rows, statuses, exception branches, closure branches, and
interpretation outcomes—not JavaScript line coverage. A witness earns `WITNESSED` only after replay.

## Native engines

ConstraintKernel combines a bounded Boolean solver, equality and disequality, finite domains, rational intervals,
difference constraints, and a bounded temporal relation fragment. It returns `SAT` with a model, `UNSAT` with a replayable
conflict, or `UNKNOWN` with unsupported atoms. It does not silently approximate unsupported arithmetic as false.

RelationEngine evaluates typed positive recursive relations to a semi-naive least fixed point. Negation is permitted
only when stratified and coverage-safe. An unclassified capability cycle is not automatically a relation program; it is
an integration error.

EGraphLite implements typed hash-consing, union, congruence rebuild, guarded rewriting, bounded saturation, and
cost-directed extraction. Rewrite theories are explicit modules pinned by the RulePack. A rewrite cannot change type,
scope, modality, or interpretation context.

ProofKernel checks small proof objects produced by code or tools. Supported obligations include finite decision-table
coverage/disjointness, bounded Boolean or arithmetic implications, evidence-before-emit, and CNL critical-slot
equivalence. The kernel reports established, refuted, or undetermined; it does not prove arbitrary JavaScript.

SynthesisEngine enumerates a typed finite grammar under a declared cost model. Candidates must pass concrete validation.
For textual repair, acceptance additionally requires the paired CNL parser to reconstruct the same critical semantic
frame.

## Refinement

A possible finding that lacks a discriminating fact may create a typed RefinementDemand. Demands route to LongTextJS
materialization, ontology design, a missing provider, or a macro-node summary according to ownership. The manager
deduplicates demand signatures and compares abstract state before and after fulfillment. No progress produces
`REFINEMENT_STALLED`; the business result remains unknown or blocked.

## The five architecture experiments

Executable experiments in `experiments/architecture/` fixed five initially open decisions.

1. Hybrid identity won: source entities/events use explicit stable identifiers while suitable derived values use
   qualified structural identity. Pure structural identity incorrectly merged distinct mentions.
2. Ontology behavior stays local: validation, normalization, indexing hints, and definitional views are permitted;
   contextual exceptions and defeasible conclusions belong to CircuitJS.
3. Interpretations use factorized contexts and lazy circuit instantiation. Eager Cartesian expansion was rejected;
   aggregation preserves robust, conditional, and conflicting outcomes.
4. Model artifacts are keyed by complete request identity and frozen for replay. Cross-document reuse is allowed only
   when source, prompt, model/tool version, context, and evidence-policy digests are identical.
5. CNL equivalence is exact for critical slots—actor, modality, action, object, quantification, negation, time,
   conditions, and exceptions—while surface lexical variation is permitted through the paired dialect.

The experiments are regression tests, not optional historical notes. A future alternative must add a counterexample,
benchmark the change, and update the relevant DS before changing the default.

## Assurance profiles

`EXECUTE_ONLY` runs compatibility and concrete execution. `ANALYZED` adds abstract preflight. `WITNESSED` adds selective
symbolic/concolic evidence and replay. `LOCALLY_CERTIFIED` checks declared local proofs. `GENERATIVE` enables typed
synthesis and CNL round-trip. Flags compose, and a RulePack pins its accepted default. The runtime activates only what
the target requests and the plan supports.

# Decisions & Questions

### Question #1: Can a must-result from abstract interpretation replace concrete execution?

Response: No. It guides planning and review. Concrete execution remains the operational authority unless a separately
specified certified-output protocol is introduced.

### Question #2: Must every macro-node have abstract and symbolic semantics?

Response: No. It needs them only when required assurance crosses that boundary. Otherwise conservative top or an
explicit unsupported diagnostic is correct.

### Question #3: Why implement bounded native engines instead of importing solvers?

Response: The experiment requires dependency-free, replayable `.mjs` artifacts and small inspectable kernels. Unsupported
fragments remain explicit rather than being hidden behind a larger external semantic surface.

### Question #4: Does an undischarged proof refute a finding?

Response: No. It withholds certification. Refutation requires a valid counterexample or proof result with concrete
replay where applicable.

### Question #5: When is refinement allowed to call Codex?

Response: Only through a new, isolated analysis materialization step owned by the host. Runtime circuit execution never
calls Codex directly and never edits the accepted build.
