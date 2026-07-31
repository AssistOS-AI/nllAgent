---
id: DS013
title: Theory Compilation, Agent Builds, and RulePack Authoring
status: implemented
owner: nllAgent maintainers
summary: Defines how natural-language theory becomes an immutable trained agent containing rule analysis, ontologies, plans, materialization demand, SDK-based circuits, tests, and benchmarks.
---

# Introduction

Training is repository compilation performed by Codex, not parameter fitting and not a direct model completion. One or
more authority documents define a named agent. The result is a self-contained executable build whose decisions can be
reviewed against exact authority spans.

# Core Content

## Training inputs and immutable outputs

`nllagent-train train --agent <id> --theory <file> [--theory <file> ...]` copies the ordered theory sources into a new
candidate workspace. It never gives Codex writable access to the accepted build. Each source receives a digest and
remains part of the promoted build.

A complete candidate contains:

- `sources/`: copied authority Markdown;
- `rules/`: RuleAnalysis modules and a human cross-reference;
- `ontologies/`: executable OntologyJS and exported constructors;
- `plans/`: CircuitArchitecturePlan and ownership declarations;
- `materialization/`: the profile LongTextJS must satisfy;
- `primitives/` only for genuinely new atomic operations;
- `circuits/`: leaf and root CircuitJS modules;
- `assurance/`: only the analyses required by the plan;
- `tests/` and `benchmarks/`: executable semantic acceptance cases;
- `context/`: generated typed Codex context and its Markdown view;
- `pack.mjs` and `agent.mjs`: explicit composition roots.

Promotion creates an immutable build identifier and atomically advances the agent's current pointer. Failed candidates
remain under the training run for diagnosis but cannot be selected for analysis.

## Rule analysis before implementation

Every authority clause receives a stable ID and exact source span. RuleAnalysis records scope, subject, modality,
premises, quantification, temporal conditions, exceptions, priorities, possible outcomes, required evidence, unknown
conditions, conflicts, and benchmark intentions. It describes business semantics, not algorithms.

Ambiguous policy is not repaired silently. The analysis can preserve alternative readings or record an unresolved
requirement. `SATISFIED`, `VIOLATED`, `ACCEPTED_EXCEPTION`, `NOT_APPLICABLE`, `UNKNOWN`, and `CONFLICT` are considered
where relevant. A rule relying on absence must identify the exact concept and scope requiring closure.

## Ontology and derived-result boundary

The author searches the current agent ontology and shared core before adding a concept. Ground concepts are things the
source can express: parties, documents, events, states, quantities, claims, authority, time, and relations. Contextual
conclusions such as `RetentionViolation` or `ContinuityGap` are derived output concepts owned by CircuitJS.

The ontology records roles and cardinality precisely enough that an incorrect LongText program fails at construction.
It does not contain exception priority or policy verdict logic. Each new concept is justified by a rule or
materialization need and exercised by a positive and negative test.

## Architecture planning and method choice

CircuitArchitecturePlan is required before implementation. It maps every RuleAnalysis obligation to one or more typed
steps. Each step states its ProblemShape, input/output, chosen MethodCatalog method, reused SDK provider or new owner,
effects, coverage demand, assurance goal, and benchmark goal. Root composition and all provider pins are explicit.

The selection order is normative: reuse an exact accepted circuit; compose registered SDK primitives; author a new
atomic primitive only when reusable semantics are missing; otherwise use a typed JavaScript macro-node. A query is not
converted into a general graph merely to appear formal, and a custom algorithm is not decomposed into decorative
nodes. Public edges remain immutable SSA values.

## Materialization profile

The profile is derived from the circuits rather than invented independently. It enumerates observable concepts and
roles, exact source-grounding requirements, identity and temporal resolution, evidence policy, allowed alternatives,
and closure demands. It is the compact contract passed to the analysis Codex role.

This direction matters: a task author should not read all implementation files and guess what the circuits need. The
host compiler calculates recursive SemanticDemand from the selected build and includes the profile and available
constructor/SDK surface in AgentAuthoringContext.

## Circuit implementation

Leaf circuits are tested before root composition. Finite rule branches use four-valued decision tables; query
selection uses typed patterns; quantities and temporal conditions use SDK constraints; recursive closure uses the
relation service; normalization uses approved rewrite or value primitives. Procedural stages declare effects and use
ExecutionContext for query, primitive application, derivation, emission, verification, tools, and subcircuits.

Every output carries evidence and provenance. `notExists` requires closure. A helper may return local plain JavaScript
values, but SemanticStore accepts only registered opaque semantic values.

## Tests, benchmarks, and independent review

Training tests cover constructor failures, circuit contracts, branch behavior, evidence, and trace. Semantic benchmarks
include normal, violation, valid exception, incomplete exception, open and closed coverage, ambiguity, conflict, and
ontology blocker where applicable. Boundary cases are generated from the plan, not improvised after implementation.

Review is a separate Codex invocation using a read-only accepted-context view and a writable candidate copy. It compares
authority, RuleAnalysis, plan, ontology, profile, circuits, tests, and benchmark oracle. It must route a problem to the
owning layer rather than changing expected results to make the build green.

# Decisions & Questions

### Question #1: Is a trained agent a prompt?

Response: No. Its authority starts as natural language, but its accepted operational form is versioned executable code,
tests, benchmarks, and traceable design artifacts.

### Question #2: May one agent contain several theory files?

Response: Yes. Their order and digests are part of build identity. Cross-file priorities and conflicts must be explicit
in RuleAnalysis and CircuitJS.

### Question #3: Why require a plan when Codex can write code directly?

Response: The plan exposes obligation coverage, method choice, reuse, ownership, and materialization demand before
implementation details can obscure a semantic omission.

### Question #4: Can benchmark expected outputs be changed during repair?

Response: Only after independent authority review proves the oracle wrong. A circuit failure alone never authorizes the
benchmark author to weaken the expectation.

### Question #5: Does retraining edit the current build?

Response: No. It creates a new candidate and promotes a new immutable build. Existing tasks retain their pinned build.
