---
id: DS010
title: Semantic Demand, Materialization Profile, Agent Context, and Compatibility
status: implemented
owner: nllAgent maintainers
summary: Defines recursive demand extraction, exact coverage requirements, selected-agent context compilation, compatibility dimensions, diagnostics, and local blocking.
---

# Introduction

Codex can materialize a task correctly only when it sees the actual vocabulary and demands of the selected trained
agent. The context compiler derives this information from executable artifacts rather than a generic prose prompt.

# Core Content

## SemanticDemand

Demand is extracted recursively from root circuits, rules, decision tables, stages, included subcircuits, primitive
descriptors, contracts, summaries, and target assurance. It names required concept identities, role identities,
capabilities, query and normalization operations, evidence policy, interpretation policy, and every absence-sensitive
concept plus its exact scope requirement.

A stage that performs custom store access must declare reads or a CircuitSummary so demand remains conservative. An
opaque stage on a decision path may add a broad requirement or an assurance blocker; it may not disappear from demand.
Demand is versioned with the circuit graph.

## MaterializationProfile

The architecture plan converts demand into an authoring contract: concepts and roles to observe, identities and
temporal/quantity relations to resolve, admissible epistemic levels, alternatives to preserve, source grounding policy,
and concept/scope pairs for which complete coverage may be required. The profile distinguishes required, optional, and
refinement-only observations.

The profile is not a schema for a serialized payload. It is an opaque `.profile.mjs` artifact used by context, checker,
and compatibility code. A changed circuit demand that is not covered by the profile is plan drift and blocks training.

## AgentAuthoringContext

The deterministic context pins exactly one agent ID and build. Its public contract contains ID/digest, agent identity,
all active ontology views, recursive circuits, MaterializationProfile, SemanticDemand, SDK imports, native commands,
theory-source identities, MethodCatalog, provider catalog, tests, and benchmarks. A Markdown rendering explains the
same facts to Codex; the `.mjs` value is authoritative.

The digest includes all fields and selected artifacts. Unrelated agents and tasks are absent, so adding another agent
to the environment does not change this context. Missing ontology, circuits, profile, provider pin, or executable SDK
import causes context construction to fail closed.

## Compatibility dimensions

Signature compatibility checks exact ontology concept and role identities plus accepted versions. Operational
compatibility checks required query, identity, temporal, quantity, renderer, engine, tool, and assurance capabilities.
Evidence compatibility checks allowed claim statuses and source grounding. Coverage compatibility evaluates exact
concept/scope requirements against the task snapshot. Interpretation compatibility checks required context policy.

Static compatibility may pass while a concrete task has unknown coverage. Conversely, one rule may be blocked while an
independent rule completes. Compatibility reports name the requesting circuit/step and the missing item. A global
assessment is blocked when any required rule is not final, even though completed local findings remain usable.

## Context usage in Codex workspaces

Training context exposes existing accepted theory and reusable SDK/provider choices so Codex does not reinvent them.
Analysis context is narrower: selected ontology, circuits viewed as demand, profile, SDK imports needed to build ground
terms, validation commands, and limitations. Context is read before untrusted source. Host scripts verify the context
shape and digest before authoring and again before accepting output.

# Decisions & Questions

### Question #1: Why derive context from circuits rather than document a generic ontology catalog?

Response: An environment may hold many unrelated agents. Only the selected build's actual concepts, roles, coverage,
and operations constrain one task. Generic catalogs increase hallucinated constructors and hide compatibility gaps.

### Question #2: Can Codex add a concept during task analysis?

Response: No. That would change the trained language and invalidate circuit/provider assumptions. It emits an ontology
gap, and a later training run may extend the agent.

### Question #3: What scope belongs in an absence requirement?

Response: The semantic scope term or scope descriptor used by the rule, not a snapshot object or a string label chosen
by the materializer. Compatibility and runtime compare the same scoped identity.

### Question #4: Why include tests and benchmarks in training context?

Response: They define accepted behavior and prevent a repair from optimizing only the authority prose. Analysis context
does not need their full source unless an explicit task validator uses them.

### Question #5: Can context compilation partially succeed?

Response: It may report noncritical optional gaps, but it cannot produce an analysis-authoring context without exactly
one agent/build, ontology, circuits, profile, demand, SDK imports, and validation commands.
