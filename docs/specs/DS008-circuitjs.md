---
id: DS008
title: CircuitJS Language Contract
status: accepted
owner: nllAgent maintainers
summary: Defines validation and planning circuit purposes, typed ports, graph nodes, effects, applicability, verification dominance, and canonical CircuitJS data.
---

# Introduction

CircuitJS represents a review theory as an executable declarative graph. It coordinates specialized operators while keeping inputs, dependencies, effects, alternatives, budgets, verification, and publication statically inspectable.

# Core Content

## Circuit purpose

Absent `purpose` means `validation`. Such circuits publish verified findings, which the runtime assembles into `CNLAuditReport`. A `purpose: planning` circuit consumes LongTextJS observations of one idea and must publish a `plan` output from `emit`; the emit path must be dominated by the CNL plan verifier. Its construction node must identify every applied authority rule and map it to at least one concrete plan location. Validation circuits cannot include generation metadata or CNL constraint projections. A purpose change or change to plan construction is semantic.

## Package and circuit identity

A package must declare namespace, semantic version, imports, exported circuits, schema requirements, operator requirements, verifier requirements, explanation policies, and source authority mappings. Imports must be exact after release locking.

A circuit must declare identifier, version, description, applicability contract, input and output ports, nodes, edges, budgets, error routes, finding contract, and source rule references. Ports must be nominally typed and must declare version, cardinality, scope relation, accepted epistemic statuses, coverage requirements, ordering, deduplication, and guarantee requirements.

## Canonical graph

The production form is a JSON-compatible directed graph. Nodes receive immutable named inputs and produce immutable named outputs. Edges refer only to declared node and port identifiers. Cycles are invalid unless enclosed in a `fixpoint`, `maintain`, or `search` construct with explicit termination and revision semantics.

The author form may be JSON or a `.circuit.mjs` file containing one direct `export default circuit({...})` expression. `circuit()` returns the definition, while `port(name)` and `node(name)` create data references. The loader rejects wrappers, indirection, functions, classes, control flow, all imports—including an import of the helpers, because they are injected—plus `require`, async/await, template literals, dynamic code generation, runtime globals, external I/O, prototype access, `Proxy`, and `Reflect`. It evaluates the expression in a restricted VM with a short timeout and performs lossless conversion to plain data before invoking the CircuitJS compiler.

## Primitive families

The runtime must recognize these primitive families:

- relational: `select`, `filter`, `project`, `join`, `antiJoin`, `group`, `window`, and `aggregate`;
- normalization: `normalize`, `rewrite`, `compare`, `convert`, and `align`;
- inference and state: `derive`, `fixpoint`, `maintain`, `retract`, and `invalidate`;
- control and alternatives: `guard`, `assert`, `require`, `choose`, `fork`, `merge`, and `fallback`;
- search: `search`, `assume`, `expand`, `prune`, `score`, and `backtrack`;
- services: `call`, `judge`, `ask`, and `invoke`;
- publication: `verify`, `certify`, `explain`, and `emit`.

Predicates and projections must use a restricted expression AST over constants, field paths, comparisons, boolean combinations, membership, arithmetic approved by type, and registered pure predicates. They must not contain source code strings.

## Semantic requirements

`join` must declare keys, scope compatibility, and multiplicity. Cardinality violations produce typed ambiguity instead of selecting the first row. `antiJoin` must require exact domain and closed-world coverage. `fixpoint` must declare monotonicity or a truth-maintenance model. `maintain` must preserve state history and retraction support. `search` must declare canonical state, strategy, successor operator, goal, state hash, witness, and limits.

`call` invokes a registered operator. `judge` invokes a model profile and cannot produce a mechanically certified output. `ask` creates an explicit request rather than reading interactive state silently. `invoke` calls an exact subcircuit version through typed port mapping.

`verify` checks a candidate with a named registered verifier. `certify` attaches the accepted property and guarantee. `explain` builds an `ExplanationEnvelope`. `emit` may consume only a verified or explicitly review-routed object allowed by the finding contract.

## Static analysis

The compiler must validate schemas and references, link every computational primitive to a registered operator, link every verifier, type-check ports and expressions, enforce cardinality and status constraints, analyze effects, calculate capabilities, identify undeclared cycles, verify budgets, ensure all terminal paths are explicit, derive the observation contract through backward slicing, and prove that every emitted finding is dominated by verification or an allowed review gate. Nodes and input ports that cannot affect a declared output are rejected rather than executed as hidden side paths. The current compiler implements nominal versioned input checks, status, guarantee, and cardinality constraints, finite budgets, registry effect matching, reference validation, dead-declaration rejection, verification dominance, and a persisted derived observation contract. Rich expression typing, declared cycles, and every advanced primitive family remain contract requirements for later operators rather than silently claimed capabilities.

## Errors

Circuit errors are values with stable codes, including `no-match`, `not-applicable`, `insufficient-evidence`, `ambiguous`, `unsupported`, `budget-exceeded`, `operator-failed`, `verification-failed`, `source-changed`, `policy-conflict`, and `runtime-fault`. Circuit authors must route expected errors or accept the finding contract's default terminal mapping.

## Educational execution model

The technical documentation must include a beginner-oriented, interactive execution tutorial grounded in a published repository circuit. The tutorial must distinguish compilation from production execution and show the concrete values at source snapshot, LongTextJS observation, derived observation contract, compatibility and port binding, operator candidate, verifier result, `emit`, and final CNL assembly. It must cover at least one accepted finding, one legitimate empty result caused by an exception, and one planning circuit that emits `CNL/Plan-1`.

The browser walkthrough is an explicitly labeled educational simulator. It may mirror deterministic released behavior for exploration, but it must not claim to load the active release or replace the production compiler, scheduler, verifier, or run trace. Explanations must distinguish empty match, rejected witness, incompatible input, incomplete coverage, and budget exhaustion.

# Decisions & Questions

### Question #1: Is CircuitJS a general-purpose programming language?

Response: No. Its expressiveness comes from declarative composition and registered operators. Arbitrary JavaScript, dynamic imports, closures, filesystem access, network access, and undeclared effects are forbidden.

### Question #2: How are sophisticated solvers integrated?

Response: A typed operator contract converts plain-data inputs to the solver interface and returns a witness. A separate verifier validates the witness and the circuit preserves the solver identity, assumptions, and effects.

### Question #3: May a review-only suggestion bypass `verify`?

Response: It may pass through an explicit review gate that verifies process integrity and labels the output `model-judgment` or `review-required`. It may not be emitted as a verified violation.

### Question #4: Does accepting `.mjs` mean circuits may contain arbitrary logic?

Response: No. MJS is the surface notation for building the same declarative graph. All domain computation still occurs in registered operators, and the loader/compiler reject hidden executable capabilities and unknown implementations.

### Question #5: What is the executable output of observation-contract derivation?

Response: Compilation emits an `ObservationContract` for the external LongTextJS input ports actually consumed by the graph, including nominal types, versions, cardinality, accepted statuses, coverage, and guarantee requirements. Manual publication then links each critical demand to a declared producer.

### Question #6: Can validation and planning share CircuitJS?

Response: Yes. Both use the same typed graph language, registries, budgets, LongTextJS ports, authority mapping, and verification-dominance rules. A validation circuit emits findings that become the CNL audit and is listed in `circuits`; a planning circuit declares `purpose: planning`, emits an idea-specific CNL specification, and is listed in `planningCircuits`. Their graphs remain distinct because audit and document planning have different control flow. There are no embedded or hybrid CNL modes.

### Question #7: Why is the interactive tutorial not itself a CircuitJS interpreter?

Response: A documentation widget should form intuition without becoming a second runtime whose behavior can drift into authority. It mirrors selected released values and decisions and labels that limitation. Normative execution remains the restricted loader, compiler, observation contract, compatibility gate, scheduler, registries, verifier records, and immutable release.

# Conclusion

CircuitJS is a restricted graph language for composing heterogeneous reasoning while preserving static analysis, provenance, budget control, and an unavoidable publication gate.
