---
id: DS008
title: CircuitJS Language Contract
status: accepted
owner: nllAgent maintainers
summary: Defines validation and planning circuit purposes, observation bindings, graph nodes, effects, applicability, verification dominance, and canonical CircuitJS data.
---

# Introduction

CircuitJS represents a review theory as an executable declarative graph. It coordinates specialized operators while keeping inputs, dependencies, effects, alternatives, budgets, verification, and publication statically inspectable.

# Core Content

## Circuit purpose

Absent `purpose` means `validation`. Such circuits publish verified findings, which the runtime assembles into `CNLAuditReport`. A `purpose: planning` circuit consumes LongTextJS observations of one idea and must publish a `plan` output from `emit`; the emit path must be dominated by the CNL plan verifier. Its construction node must identify every applied authority rule and map it to at least one concrete plan location. Validation circuits cannot include generation metadata or CNL constraint projections. A purpose change or change to plan construction is semantic.

## Package and circuit identity

A package must declare namespace, semantic version, imports, exported circuits, schema requirements, operator requirements, verifier requirements, explanation policies, and source authority mappings. Imports must be exact after release locking.

A circuit must declare identifier, version, description, applicability contract, input bindings and output ports, nodes, edges, budgets, error routes, finding contract, and source rule references. Observation bindings are nominally typed and declare cardinality, accepted epistemic statuses, coverage, criticality, guarantee requirements, and optional safe local matchers. Relational ordering, joins, grouping, deduplication, and completeness-sensitive conditions belong in a query or exact operator contract rather than being implied by the graph boundary.

## Observation bindings and graph references

`inputs.<name>` is an observation-binding declaration. The scheduler scans the immutable LongTextJS observation
relation, selects exact nominal types and statuses, applies optional `where` matchers, preserves source order, and then
enforces cardinality. Matchers are an AND-only local projection over safe static paths with `eq`, `neq`, `gt`, `gte`,
`lt`, `lte`, `includes`, `in`, `startsWith`, and `exists`. They do not establish identity, join relations, infer
absence, or turn open-world data into a complete domain. Equality and membership are strict. Ordered comparisons accept
only finite numbers, and text operations require strings; JavaScript coercion is forbidden.

The recommended author reference is `binding(name)`. It creates the canonical `{ "$port": name }` graph reference,
which resolves to the already selected immutable array; it performs no further matching. `port(name)` remains an exact
compatibility alias. `observationBinding(definition)` is authoring sugar for the plain selector definition. Joins,
reusable expressions, aggregates, ordered patterns, and coverage-aware absence use Query-First or a registered operator.

## Canonical graph

The production form is a JSON-compatible directed graph. Nodes receive immutable named inputs and produce immutable named outputs. Edges refer only to declared node and port identifiers. Cycles are invalid unless enclosed in a `fixpoint`, `maintain`, or `search` construct with explicit termination and revision semantics.

The author form may be JSON or a `.circuit.mjs` file containing one direct `export default circuit({...})` expression. The experimental DS020 form uses one direct `export default queryFirstCircuit({...})` expression. `circuit()` and `queryFirstCircuit()` return their definitions; `observationBinding()` names a selector definition; `binding()` and its compatibility alias `port()` create graph input references; and `node()` creates a prior-node reference. The loader rejects wrappers, indirection, functions, classes, control flow, all imports—including an import of the helpers, because they are injected—plus `require`, async/await, template literals, dynamic code generation, runtime globals, external I/O, prototype access, `Proxy`, and `Reflect`. It evaluates the expression in a restricted VM with a short timeout and performs lossless conversion to plain data before invoking the CircuitJS compiler.

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

Primitive names describe orchestration semantics; they are not permission to attach an unrelated algorithm. Except for the small core implemented by the scheduler, a primitive resolves an exact registered operator whose contract supplies the concrete input and output schemas, algorithm, determinism, effects, limits, and witness. The canonical meanings are:

| Primitive | Required semantic transformation and result |
| --- | --- |
| `select` | address a declared typed relation or subset and return ordered rows with source dependencies |
| `filter` | retain rows whose restricted predicate is true; false is removed and unknown follows an explicit policy |
| `project` | construct a declared row schema from fields or pure expressions without erasing hidden dependencies |
| `join` | combine compatible left and right rows using declared keys, direction, scope, and multiplicity |
| `antiJoin` | return left rows with no right match only under an exact verified closed-world token; otherwise return unknown or blocked |
| `group` | partition rows by typed equality keys and retain deterministic member identity and order |
| `window` | compute a bounded ordered neighborhood over a named document, temporal, or numeric order |
| `aggregate` | compute a named deterministic measure and preserve contributing members or a verifier-approved commitment |
| `normalize` | convert equivalent representations to one declared canonical value without changing domain meaning |
| `rewrite` | apply a finite versioned rewrite policy and return both rewritten value and applied rule identities |
| `compare` | evaluate a typed relation between values and return the comparison plus operand dependencies |
| `convert` | transform units, encodings, calendars, or nominal forms through an exact conversion contract and witness |
| `align` | establish a declared correspondence among scopes, identities, times, units, languages, or views and retain ambiguity |
| `derive` | instantiate finite rule consequences with rule identity and positive premises; negative premises require explicit support |
| `fixpoint` | iterate a declared finite monotone or truth-maintained derivation until stable or budget exhaustion |
| `maintain` | replay an ordered event stream under a versioned transition theory and return history plus current state |
| `retract` | remove or supersede a derived value through explicit dependency and revision semantics, never by mutation of source |
| `invalidate` | mark dependency-affected cached or derived objects stale and return the invalidation set |
| `guard` | pass its value only when the condition is true; false returns the declared empty/not-applicable branch |
| `assert` | require a runtime invariant and raise a typed assertion failure when false or materially unknown |
| `require` | require evidence or capability before continuing and route failure through the declared terminal policy |
| `choose` | select among explicit alternatives using a deterministic condition or policy; it does not infer hidden priority |
| `fork` | duplicate immutable inputs into named explicit branches without merging worlds or changing identity |
| `merge` | combine declared branch results under an exact ordering, duplicate, conflict, and world policy |
| `fallback` | select the first semantically available alternative under explicit priority; empty and failure remain distinct |
| `search` | execute one registered bounded search over canonical states, successor relation, goal, strategy, and limits |
| `assume` | add a branch-local typed assumption with world identity and guarantee ceiling; base observations remain unchanged |
| `expand` | generate bounded successor states through an exact registered successor function |
| `prune` | remove search states under a declared sound or heuristic policy and record the pruning reason |
| `score` | assign a deterministic or model-bounded ranking value without turning rank into truth |
| `backtrack` | restore a prior branch state and preserve the failed branch and reason in the search trace |
| `call` | invoke one exact registered operator over named plain-data inputs and return its declared output schema |
| `judge` | invoke a schema-bound model judgment; its output cannot exceed the model-judgment guarantee ceiling |
| `ask` | construct a finite typed `NeedObservation` request with scope, reason, criticality, and remaining budget |
| `invoke` | execute one exact published subcircuit through declared port and output mappings |
| `verify` | pass candidate, premises, witness, source, and policy to one exact verifier and return accept, reject, or inconclusive records |
| `certify` | attach only the property and guarantee established by an accepted verifier record |
| `explain` | build a structured explanation envelope from recorded rule, evidence, decision, coverage, and verifier facts |
| `emit` | publish only accepted verification or an explicitly allowed review record into the declared output contract |

The current scheduler supplies direct defaults for `guard`, `assert`, `require`, `choose`, `merge`, `fallback`, `ask`, and `emit`. `fork`, `certify`, and `explain` are currently pass-through scaffolds unless a registered operator provides their full semantics. All other computational primitives require a registered operator. Operator registry entries declare their permitted primitive names, and compilation rejects a mismatched pairing. The standard registry supplies relational query/table execution, lexical and frequency rules, the five DS021 foundation circuits, positive fixpoint, grounded argumentation, unit conversion, interval conflict, deadline, state timeline, shortest path, narrative continuity, model adapters when configured, and CNL plan construction. Rich input/output schemas remain incomplete outside the experimental query and foundation operators.

## Programmer-defined processing nodes

A programmer adds explicit computation by implementing a trusted JavaScript operator, not by placing a callback in the
graph. The host loads and installs a versioned `NllRuntimeExtension`; a normal node combines an existing primitive with
the extension's exact operator id. The function receives the node's resolved named inputs and a read-only snapshot of
the LongTextJS program, circuit, node, and operational context, and it must return finite plain data. A publication path
uses a separately registered verifier whose witness and checked properties are explicit.

This mechanism supports arbitrary reviewed algorithms inside the operator: parsers, dynamic programming, graph
algorithms, state machines, numerical routines, or solver adapters. It does not create arbitrary new primitive names.
A new primitive changes orchestration semantics and therefore still requires a compiler/runtime contract change. In
most extensions the special node is `call` plus a domain-specific operator; `maintain`, `search`, `aggregate`, or another
existing primitive may be used only when the operator declares that exact compatibility.

## Query-first authoring profile

DS020 implements an experimental `LongTextQuery@1` and `DecisionTable@1` subset as normalized plain-data authoring that lowers to this graph model. It adds no callbacks or parallel runtime. The compiler validates the supported bindings, fields, joins, expressions, coverage-aware anti-join, decision policies, shared verifier route, budgets, source map, and QueryContract before generating ordinary nodes. Benchmark execution differentially compares reference and lowered layers. Direct CircuitJS remains the canonical escape hatch for unsupported or algorithmic forms.

## Semantic requirements

`join` must declare keys, scope compatibility, and multiplicity. Cardinality violations produce typed ambiguity instead of selecting the first row. `antiJoin` must require exact domain and closed-world coverage. `fixpoint` must declare monotonicity or a truth-maintenance model. `maintain` must preserve state history and retraction support. `search` must declare canonical state, strategy, successor operator, goal, state hash, witness, and limits.

`call` invokes a registered operator. `judge` invokes a model profile and cannot produce a mechanically certified output. `ask` creates an explicit request rather than reading interactive state silently. `invoke` calls an exact subcircuit version through typed port mapping.

`verify` checks a candidate with a named registered verifier. `certify` attaches the accepted property and guarantee. `explain` builds an `ExplanationEnvelope`. `emit` may consume only a verified or explicitly review-routed object allowed by the finding contract.

## Static analysis

The compiler must validate schemas and references, link every computational primitive to a registered operator, link every verifier, type-check bindings and expressions, enforce cardinality and status constraints, analyze effects, calculate capabilities, identify undeclared cycles, verify budgets, ensure all terminal paths are explicit, derive the observation contract through backward slicing, and prove that every emitted finding is dominated by verification or an allowed review gate. Nodes and input bindings that cannot affect a declared output are rejected rather than executed as hidden side paths. The current compiler implements nominal versioned binding checks, safe local matcher validation, status, guarantee, and cardinality constraints, finite budgets, registry effect matching, reference validation, dead-declaration rejection, verification dominance, and a persisted derived observation contract. A trusted runtime extension also supplies structured value schemas: compilation checks required, unknown, and literal fields plus compatible referenced result types, while runtime checks resolved input and actual output. Rich typing remains incomplete for older registry entries, semantic nominal payloads, declared cycles, and advanced primitive families; those remain tracked limitations rather than silently claimed capabilities.

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

### Question #8: Why define every primitive when many use registered operators?

Response: The primitive fixes the orchestration obligation and result shape; the registry fixes the exact algorithm. Without both layers a maintainer could attach an arbitrary operator to a semantically misleading label, and neither static analysis nor human review could know which guarantees apply.

### Question #9: Does query-first authoring create a third executable language?

Response: No. Its normalized query and decision values are inspectable CircuitJS configuration and must lower to the same canonical graph and verification path. It is a safer authoring profile for suitable relational rules, not another publication authority.

### Question #10: Where does real JavaScript processing belong?

Response: In a trusted, explicitly installed runtime operator or verifier. CircuitJS remains the inspectable dataflow
that selects inputs, fixes dependencies and budgets, and controls publication. The extension owns the algorithm and is
tested as code; the release locks its id and digest. This division keeps hard algorithms possible without making every
circuit an opaque general-purpose program.

### Question #11: Why keep the canonical word `port` if the input declaration performs matching?

Response: The canonical `$port` object is a graph-boundary reference, and changing stored graphs would create needless
format churn. The matching object is now named an observation binding, while `binding(name)` is the recommended author
helper. Keeping `port()` as an alias preserves existing releases without continuing to teach that the reference itself
is a query or pattern matcher.

# Conclusion

CircuitJS is a restricted graph language for composing heterogeneous reasoning while preserving static analysis, provenance, budget control, and an unavoidable publication gate.
