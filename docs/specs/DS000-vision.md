---
id: DS000
title: System Vision, Product Boundary, and Semantic Topology
status: implemented
owner: nllAgent maintainers
summary: Defines nllAgent as a Codex-authored, deterministically executed semantic-programming environment with persistent trained agents and isolated analysis tasks.
---

# Introduction

nllAgent is a research environment for compiling natural-language theories into executable semantic analyzers. It does
not ask a language model for a final judgment. A Coding Agent writes inspectable OntologyJS and CircuitJS programs from
authority documents, and later writes source-grounded LongTextJS for one task. The runtime then executes the frozen
circuits deterministically over that LongTextJS snapshot.

# Core Content

## The two product lifecycles

Training and analysis are different operations with different authorities.

During training, one or more Markdown theory files are copied into an isolated candidate workspace. Codex receives the
`nll-train-agent` skill, the nllAgent SDK catalog, reusable examples, and any previous accepted agent context. It must
produce RuleAnalysis, OntologyJS, a CircuitArchitecturePlan, MaterializationProfile, CircuitJS, tests, semantic
benchmarks, and an assembled agent build. The host validates the candidate and promotes it atomically only after the
configured checks pass. An accepted build is immutable.

During analysis, the user selects one accepted agent build and supplies one source document. The host creates a
separate task folder and a deterministic context containing only the selected agent's ontology, circuits, semantic
demand, materialization profile, allowed SDK imports, and validation commands. Codex receives the `nll-analyze-task`
skill and writes task-local LongTextJS. It cannot modify the agent. The host validates source spans and ontology types,
loads the program in an isolated process, and executes the already accepted circuits. Findings, trace, result modules,
and the human report belong to the task, never to the trained theory.

An environment may contain many agents and many tasks. A task pins exactly one agent build. Changing or retraining one
agent cannot silently alter an existing task or another agent.

## The language family

OntologyJS, LongTextJS, and CircuitJS are internal JavaScript DSLs expressed as ESM `.mjs` modules. They share one
multi-sorted term algebra and use opaque validated runtime values.

- OntologyJS defines semantic identities, sorts, concepts, roles, cardinalities, subtyping, incompatibilities, and
  bounded local behavior such as validation and normalization.
- LongTextJS is the ground program of a source revision: entities, events, states, claims, mentions, contexts,
  alternatives, coverage, gaps, and exact anchors.
- CircuitJS defines typed query, derivation, decision, verification, aggregation, controlled generation, and ordinary
  JavaScript macro-nodes over the same ontology identities.

Plain objects and arrays are allowed as local JavaScript values. They are not semantic artifacts and cannot be
published into SemanticStore. There is no configuration-object syntax that becomes the real DSL, no JSON AST, no JSON
manifest, and no TypeScript build layer. Durable structured artifacts are `.mjs`; human inputs and reports are
Markdown. Imported third-party skill metadata is outside the nllAgent semantic artifact contract.

## What a circuit means

A circuit has one primary semantic responsibility and may combine several methods. Its source module produces a
`CircuitModel`: typed requirements and provisions, rules, decision tables, stages, subcircuits, schedules, effects,
dynamic instantiation declarations, and assurance hooks. A `CircuitInstance` binds that model to one snapshot,
interpretation context, and concrete bindings. The runtime execution graph records the nodes actually created.

The graph is hierarchical dataflow. Values published between nodes have one producer and are immutable, which is the
SSA boundary nllAgent relies on. SSA does not prohibit normal local assignment, loops, recursion, classes, exceptions,
or `async/await` inside a procedural macro-node. Semantic writes are buffered in a transaction and become visible only
after validation and commit. A procedural node is therefore ordinary JavaScript inside an explicit typed and traced
boundary, not JavaScript disguised as a graph and not a graph disguised as JSON.

Most generated circuits should compose SDK primitives. The SDK supplies typed query, truth, coverage, decision,
constraint, relation, normalization, evidence, finding, proof, and synthesis operations backed by the runtime engines.
A custom macro-node is appropriate when the algorithm is irregular or domain-specific; it must declare effects and,
when assurance crosses that boundary, an abstract summary or symbolic encoder.

## One store and bounded semantic honesty

SemanticStore is the only logical model shared by LongTextJS and CircuitJS. It is a typed attributed term graph with
claims, contexts, evidence, coverage, and provenance. Physical indexes remain private. Circuits use typed query and
transaction APIs rather than arrays or storage layouts.

Absence is never silently interpreted as negation. A negative conclusion requires closure for the exact concept and
scope. The four predicate values are `TRUE`, `FALSE`, `UNKNOWN`, and `CONFLICT`; rule results additionally distinguish
`NOT_APPLICABLE`, accepted exceptions, ontology/capability/resource blockers, and execution error. Alternative readings
remain separate until an explicit aggregator classifies a result as robust, conditional, or conflicting.

The system promises reproducibility relative to the accepted ontology, materialization, circuits, evidence policy, and
snapshot. It does not promise that the source is true, that Codex interpreted every sentence correctly, or that an
ontology is universal. Missing representational power and insufficient coverage must remain visible blockers or gaps.

## Multi-semantic engineering

Concrete execution is operational authority. Abstract interpretation, symbolic or concolic execution, constraint
solving, relation fixed points, equality saturation, local proof checking, refinement, and typed synthesis are methods
selected for specific subproblems in the CircuitArchitecturePlan. They are not competing whole-system semantics and
are not enabled indiscriminately.

Abstract preflight over-approximates possible execution for the supported primitive graph. Symbolic results gain
witness assurance only after concrete replay. ProofKernel checks small declared proof objects; it does not prove
arbitrary JavaScript. Synthesis candidates are accepted only after concrete validation, and controlled text also needs
semantic round-trip. Unsupported analysis across a macro-node produces conservative top or an explicit blocker.

## Trust and change boundary

Authority Markdown is trusted policy input for training. Task documents are untrusted data. Generated code is
untrusted until it passes contained-path, extension, import, process-isolation, ontology, span, effect, and semantic
checks. Codex is the only model-facing mechanism in the product: it authors code in isolated workspaces. Circuit
execution does not call a model or Coding Agent and cannot mutate an accepted agent.

The experiment succeeds when an independent reviewer can trace a business result from report to finding, circuit
node, binding, LongText term, exact source span, rule analysis, and authority clause; when meaningful semantic mutants
are rejected; and when another accepted agent in the same environment remains unaffected.

# Decisions & Questions

### Question #1: Why use Codex instead of a custom direct-LLM integration?

Response: The difficult operation is repository-scale semantic programming, not one schema-shaped completion. Codex
already provides file editing, code inspection, test execution, and iterative repair. nllAgent supplies narrow skills,
deterministic context, an SDK, and acceptance gates instead of maintaining a second agent framework or an Achilles
runtime dependency.

### Question #2: Why are training and analysis separate?

Response: They have different authority. Training may change the theory after validation. Analysis may describe only
one source through the selected ontology. Separating folders, skills, and processes prevents a task from teaching the
agent a convenient new rule or embedding a verdict in its observations.

### Question #3: Why is CircuitJS not assigned one method?

Response: A business responsibility normally contains several problem shapes. Retention assessment may use query,
quantity comparison, coverage-aware absence, a decision table, and optional synthesis. The plan chooses methods per
step; the root circuit preserves the business identity.

### Question #4: What precisely is SSA here?

Response: It is single assignment of published dataflow values and semantic commits. It is not an attempted SSA
translation of every local JavaScript variable. This boundary is small enough to enforce and large enough to support
normal algorithms.

### Question #5: Is every `.mjs` file trusted because it is JavaScript?

Response: No. Reviewed accepted builds are trusted runtime modules. Codex output remains untrusted until isolated
validation succeeds. The file extension defines the language and persistence form, not the trust level.

### Question #6: May analysis produce a verdict directly in LongTextJS?

Response: No. LongTextJS may contain observations, explicit epistemic qualifiers, alternatives, coverage, and gaps.
Findings, compliance statuses, repairs, and derived concepts belong to circuits. This category boundary is an
acceptance invariant.

### Question #7: Why retain JavaScript macro-nodes if the SDK is preferred?

Response: Some graph algorithms, parsers, simulations, and I/O adapters are clearer as ordinary JavaScript. The SDK is
the default because it is reusable and multi-semantically described; the macro-node remains the explicit escape hatch,
with effects and assurance limits visible.

### Question #8: What is intentionally not promised?

Response: Universal language understanding, complete legal or scientific truth, proof of arbitrary JavaScript,
automatic authority changes, and positive compliance from missing data are outside the contract.
