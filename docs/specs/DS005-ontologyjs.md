---
id: DS005
title: OntologyJS Executable Vocabulary Contract
status: implemented
owner: nllAgent maintainers
summary: Defines sealed ontology namespaces, term constructors, roles, cardinalities, identity, behavior limits, extension, introspection, and use by LongTextJS and CircuitJS.
---

# Introduction

OntologyJS defines the semantic signature shared by document materialization and circuit execution. It is executable
JavaScript that creates opaque constructors and definitions, not a taxonomy-shaped data record.

# Core Content

## Signature and definitions

`ontology(id, ...extensions)` creates a versioned namespace. It exposes built-in sorts for entity, situation, event,
state, proposition, value, time, place, context, and evidence as supplied by the imported core. Domain modules add
entities, events, states, relations, value types, roles, derived concepts, subtyping, disjointness, lexicalizations,
and local behaviors. `seal()` validates the complete signature and makes it immutable and introspectable.

Every definition has a qualified identity. Reusing a lexical name does not create semantic equality. Extensions import
the exact identities of their parents; they do not copy or merge definitions through a global registry. Duplicate
qualified identities, incompatible subtyping, invalid role endpoints, and contradictory constraints fail at seal.

## Roles and constructors

A role declares its source sort/concept, target sort/concept or union, and cardinality: exactly one, zero or one, one or
more, or zero or more. Concepts declare required and allowed roles. A constructor rejects missing required roles,
unknown roles, duplicate single-valued roles, and incompatible values before producing a term.

The same constructor participates in two language fragments. When all supplied role values are ground, it returns an
opaque `Term`. When an argument contains a CircuitJS variable or pattern, it returns a typed `Pattern`. Thus a circuit
matches exactly the concept identities LongTextJS constructs; there is no generated query schema between the two.

Role values are opaque and preserve semantic collection meaning. Ordered sequences, sets, conjunctions, disjunctions,
and incompatible alternatives are distinct. JavaScript arrays may help construct them locally but cannot stand in for
those semantic collection types at publication.

## Identity policy

Source entities and anchored events should carry explicit identities so that equal labels in different contexts do not
merge. Mentions are separate LongText values and never become entity identity by spelling alone. Canonical immutable
values, normalized quantities, and derived terms may use structural identity when the concept policy permits it.
JavaScript binding names and module paths do not determine semantic identity.

Subtyping is explicit and transitive. Matching a parent may select child terms. Casting between unrelated concepts is
forbidden. Disjoint definitions allow validation and alternative pruning; they do not automatically create a business
finding unless a circuit declares that consequence.

## Observable and derived concepts

An observable concept describes meaning a source can express: a retention act, duration, person, notification,
measurement, claim, or exception evidence. A derived concept describes a circuit result such as RetentionAssessment,
ContinuityGap, UnsupportedClaim, or SuggestedPatch. The ontology may declare a derived constructor so outputs remain
typed, but LongTextJS cannot materialize it as a source observation.

Training review must classify every new concept. If a circuit cannot express a needed source notion, the repair is an
ontology extension and a new agent build. If the notion is a contextual conclusion, it belongs in CircuitJS even when
it has a derived ontology constructor.

## Behavior boundary

Ontology behavior is local, deterministic, and definition-oriented: validate one value, normalize one unit, calculate
a canonical local representation, provide an index key, or pretty-print a term. A behavior cannot query SemanticStore,
inspect document coverage, apply priorities or exceptions, call a tool, or emit a finding. Such access would hide a
rule in the vocabulary layer and is rejected by review and behavior-boundary checks.

## Introspection and generated context

The public ontology view lists ID, extensions, sorts, concepts, result sorts, roles, endpoints, cardinalities, required
and allowed roles, subtype/disjoint closure, behaviors, and lexicalizations. The context compiler includes this exact
view and generated import examples for the selected agent. The analysis skill may use only those exported constructors
and must emit a gap instead of inventing an unlisted concept or encoding meaning in a string.

# Decisions & Questions

### Question #1: Why make concept constructors callable?

Response: A constructor-oriented internal DSL is compact in ordinary JavaScript and lets ground materialization and
typed patterns share one definition. Validation happens at the semantic boundary rather than in a parallel schema.

### Question #2: Can an ontology contain a RetentionViolation constructor?

Response: It may declare it as a derived concept so circuit output is typed. The violation rule, exceptions, and
evidence remain in CircuitJS, and LongTextJS cannot claim the source directly observed that violation.

### Question #3: Where does unit conversion belong?

Response: Local deterministic conversion and canonical representation may be an ontology behavior or SDK primitive.
Comparison against a policy limit and treatment of missing units belong to a circuit and ConstraintKernel.

### Question #4: May two agent builds share an ontology module?

Response: Yes, by importing the same versioned module and including its digest in both build identities. One build
cannot observe an in-place mutation of that ontology; a changed module creates new build identities.

### Question #5: How is an insufficient ontology reported?

Response: LongTextJS emits a grounded ontology gap when source meaning cannot be represented. Compatibility may also
produce `BLOCKED_ONTOLOGY` when a circuit demand names absent concepts or roles. Neither path fabricates compliance.
