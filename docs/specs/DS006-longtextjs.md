---
id: DS006
title: LongTextJS Source, Ground Semantics, and Task Materialization
status: implemented
owner: nllAgent maintainers
summary: Defines source revisions, exact anchors, ground terms, claims, contexts, alternatives, coverage, gaps, multi-file composition, and the task-local Codex contract.
---

# Introduction

LongTextJS is the executable semantic program of one source revision. It describes what the document expresses and the
limits of that description. It never implements the rules that judge the document.

# Core Content

## Source and anchors

A source has a logical ID, revision, exact text, and digest. `span(source, start, end)` uses a half-open range measured
in Unicode code points. The host verifies bounds and excerpt against the frozen source. Every explicit or verified
claim that can support a finding has at least one exact anchor. Multiple spans may support one claim, and one span may
support incompatible interpretations.

Source text remains unmodified. LongTextJS may keep excerpts for diagnostics but does not duplicate the complete
document as semantic payload. Source revision is part of every anchor identity, so editing text creates a new revision
rather than shifting old evidence silently.

## Ground program

`longTextProgram(id, source, ...units)` composes semantic units, shared identities, contexts, cross-section relations,
coverage declarations, alternatives, and gaps. Ontology constructors must be ground: a persisted LongText program
cannot contain CircuitJS variables. Terms include entities, events, states, values, propositions, and typed relations.

A `Claim` states that a source or actor presents some proposition. Qualifiers distinguish explicit, inferred, proposed,
verified, rejected, and ambiguous origin; these are not truth values. A circuit can demand only explicit or verified
claims without deleting other materialization. Modality, negation, reported speech, conditionals, quantification,
speaker, world, and scope remain structural rather than flattened tags.

Mention and entity are separate. A mention points to a span and lexical form. `resolvesTo` represents accepted identity;
`identityCandidate` represents a bounded hypothesis with provenance and confidence. Similar spelling does not merge
entities. Time, quantity, and place use ontology values and relations instead of unvalidated strings when the active
ontology supports them.

## Alternatives and scope

`alternatives` creates incompatible interpretation contexts over a shared base. Coreference, attachment, modality,
classification, or scope may differ between readings. Materialization keeps all materially relevant readings and may
prune only an incompatibility established by ontology or source constraints. A confidence number does not collapse the
set to one reading.

Negation preserves its operator scope. “The operator did not confirm that Ana opened the gate” negates confirmation,
not opening. Absence of an `Open` term proves neither form. Circuit matching selects context explicitly, and outputs do
not become robust until an aggregator compares admitted readings.

## Coverage and gaps

Coverage is an evidenced assertion that materialization exhaustively inspected a bounded concept/relation in an exact
scope. States are closed, partial, unknown, or conflicting. Closure for LegalException in policy section A says nothing
about section B or about another concept. Codex may declare closure only when the task procedure and source boundary
justify it; the context's MaterializationProfile explains required scopes.

Gaps are valid semantic outputs: ontology gap, unresolved identity, unresolved temporal relation, malformed controlled
form, or incomplete coverage. A structurally valid LongText program can be incomplete. The runtime distinguishes that
from a module/type/span error, which rejects the program.

## Task-local Codex output

The analysis workspace gives Codex one selected-agent context and the untrusted task. `generated/program.mjs`
default-exports a dependency-free materializer function receiving host-injected `source`, `program`, `api`, `ontology`,
and `vocabulary`. It may use helpers, loops, classes, and normal local JavaScript. It cannot import modules, inspect the
environment, call Codex, use the network, read other agents, or write semantic findings.

For long documents the author may organize source code into helpers or, in a trusted accepted build, multiple section
modules with shared identity and relation modules. A task capsule persists a canonical assembled LongText module after
validation so replay does not depend on the original Codex workspace.

## Validation

Acceptance verifies the context digest, function/module shape, ground-only outputs, source ownership, exact spans,
ontology identities, sort and cardinality rules, reference targets, alternatives, justified coverage, and explicit
gaps for unmet critical demand. The child process publishes the program to SemanticStore before any trained circuit
runs. A loadable module with wrong semantic roles is rejected even if JavaScript execution succeeds.

# Decisions & Questions

### Question #1: Why let Codex write code instead of directly returning extracted terms?

Response: Code preserves abstraction, multi-file organization, exact constructor use, tests, inspection, and replay. A
term payload would reintroduce the hidden serialized language the architecture rejects.

### Question #2: May LongTextJS infer an unstated event?

Response: It may record a source-supported inference with an explicit epistemic qualifier and provenance. A rule can
exclude it by evidence policy. It cannot invent an inference merely because a circuit needs the premise.

### Question #3: When is closed coverage valid?

Response: Only for a named concept/relation and bounded scope whose relevant source region was exhaustively processed
under a stated materialization procedure. Global “document understood” closure is invalid.

### Question #4: What happens when a MaterializationProfile requirement cannot be met?

Response: The program records the relevant gap or open coverage. Compatibility and circuits then produce `UNKNOWN` or
a blocker. The analysis skill must not add an ad hoc constructor or a convenient negative fact.

### Question #5: Can task review change the selected ontology?

Response: No. It can repair only source mapping using the selected build. An ontology limitation becomes evidence for a
new training request and does not alter the current task's historical result.
