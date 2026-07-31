# LongTextJS ground semantics

Read this reference before compiling a task document. LongTextJS is the ground, source-facing fragment of the selected
agent's ontology. It records what the document expresses; it does not anticipate what the circuits want to conclude.

## Compile against one selected build

The host-generated `AgentAuthoringContext` is the complete language boundary for the task. Use its exact agent build,
sealed ontology, MaterializationProfile, SemanticDemand, and SDK imports. Do not scan other agents, import candidate
theories, or invent a constructor that is absent from the selected vocabulary.

The MaterializationProfile says what the trained theory knows how to observe. SemanticDemand narrows that vocabulary
to concepts, roles, operations, evidence policies, and coverage scopes used by the requested target. Demand guides
attention; it does not authorize omission of obvious source facts whose meaning is needed to preserve a claim.

## Content, claim, mention, and identity

Build an event or state term for propositional content. Wrap content in a claim when the document, narrator, or quoted
speaker asserts, denies, permits, requires, predicts, or questions it. Preserve epistemic origin (`explicit`,
`inferred`, `proposed`, or `verified`) independently from truth.

A textual mention is not an entity. Anchor the mention, then relate it to an entity through a resolved link or an
identity candidate. Repeated names do not justify identity by themselves. Keep unresolved references explicit.

Use ontology roles rather than positional prose payloads. A retention event, for example, connects an actor, retained
data, duration, purpose, authority, time, and scope using the roles actually declared by the active ontology. A plain
object with fields that look like those roles is not a semantic term.

## What is allowed in a task program

The dependency-free materializer may use normal JavaScript functions, local arrays, maps, sets, loops, and conditionals
to organize construction. It receives all semantic capabilities from the host-injected argument. It returns only
accepted LongTextJS values or their DSL collections.

It must not:

- import modules or discover filesystem paths;
- access environment variables, network, subprocesses, clocks, or random state;
- modify the ontology, materialization profile, circuits, SDK, or source text;
- emit a finding, rule status, recommendation, repair, or derived analysis concept;
- encode semantic facts as anonymous records that bypass constructors.

## Gaps are first-class output

When a relevant source notion cannot be represented, emit an ontology gap anchored to the phrase. When identity,
temporal order, or coverage cannot be established, emit the corresponding gap or alternatives. A valid incomplete
program is preferable to a fabricated complete one.

The deterministic compatibility pass decides whether a gap blocks a circuit. The materializer must not convert “the
ontology cannot express this authority” into a convenient nearby concept.

## Compactness

Use local helpers for repeated construction, but keep the resulting source readable as a semantic program. Prefer a
small number of meaningful terms to token-by-token annotation. Materialize enough discourse, identity, time, and scope
structure to support the selected circuits without recreating the entire document as strings.
