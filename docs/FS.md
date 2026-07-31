# nllAgent Functional Specification

Document type: GAMP-oriented functional specification  
System: NaturalLanguageLinterAgent  
Version: 2.0  
Status: implemented experimental system  
Date: 31 July 2026

## 1. Purpose and intended use

nllAgent compiles one or more natural-language authority documents into an immutable semantic analyzer and applies one
selected analyzer to a later document. Codex performs repository authoring in isolated workspaces. Deterministic
OntologyJS, LongTextJS, CircuitJS, SemanticStore, and runtime components perform validation and business evaluation.

The system is intended for controlled research and qualification of auditable natural-language linting, compliance,
editorial continuity, scientific consistency, and bounded document repair. It is not a universal legal, medical, or
scientific authority. Results are relative to the selected theory build, materialized source, interpretation policy,
and evidence/coverage state.

## 2. System boundary

In scope:

- compiling Markdown theory into OntologyJS, RuleAnalysis, CircuitArchitecturePlan, MaterializationProfile, CircuitJS,
  tests, semantic benchmarks, and a RulePack;
- independently reviewing and atomically promoting an immutable agent build;
- compiling one source document into task-local LongTextJS under one exact selected build;
- deterministic semantic execution, evidence-bearing results, traces, reports, and bounded controlled generation;
- multiple isolated agents and tasks in one filesystem environment;
- native dependency-free authoring and verification tools.

Out of scope:

- training model weights;
- direct LLM verdicts or runtime circuit model calls;
- AchillesAgentLib or another custom LLM orchestration layer;
- JSON/TypeScript semantic artifacts;
- automatic modification of accepted authority or agent builds from a task;
- guarantees of truth beyond the supplied source and executable theory.

## 3. Actors and records

| Actor or record | Responsibility |
| --- | --- |
| Theory owner | Supplies one or more authority Markdown files and approves semantic intent. |
| Training Codex role | Uses `nll-train-agent` to author a complete candidate below its owned workspace. |
| Review Codex role | Uses `nll-review-and-repair` to compare authority, code, tests, benchmarks, and traces. |
| Analysis Codex role | Uses `nll-analyze-task` to materialize one untrusted source as ground LongTextJS. |
| Deterministic host | Compiles contexts, validates files/modules, manages builds/tasks, and starts isolated processes. |
| Semantic runtime | Builds SemanticStore, plans capabilities, executes circuits, and commits typed outputs. |
| Operator | Selects agent/task/input, reads reports, and records issues or feedback. |
| Agent build | Immutable accepted ontology, theory, circuits, profile, SDK pins, tests, and benchmarks. |
| Task | Immutable input/pin plus generated LongTextJS, result, trace, report, and status. |

## 4. Functional requirements

### 4.1 Environment and identity

#### FS-ENV-001 — Multiple trained agents

The system shall store named agents independently below `agents/<agent-id>`. Agent identifiers shall be validated and
shall namespace builds, contexts, training runs, issues, and feedback.

Verification: `tests/integration/persistence.test.mjs`, `tests/unit/context-sdk.test.mjs`.

#### FS-ENV-002 — Immutable builds

Each successful training operation shall create a new immutable build directory. The system shall not modify an older
accepted build during retraining.

Verification: `tests/integration/training.test.mjs`.

#### FS-ENV-003 — Atomic current selection

Promotion shall update an authoritative current-build pointer atomically only after final candidate validation. A
failed candidate shall remain diagnosable and shall not change current.

Verification: training success and failing-test cases in `tests/integration/training.test.mjs`.

#### FS-ENV-004 — Task pinning

Before task materialization, the system shall pin agent ID, build ID, build digest, context digest, source digest,
target, and task ID in executable `.mjs` artifacts. Later retraining shall not alter the task selection.

Verification: `tests/integration/coding-agent.test.mjs`, `tests/integration/persistence.test.mjs`.

### 4.2 Training

#### FS-TRN-001 — Ordered theory inputs

The training CLI shall accept one or more repeated `--theory` options and preserve their order and content identity.

Verification: `tests/integration/cli.test.mjs`.

#### FS-TRN-002 — Typed bootstrap context

For a new agent the host shall generate a TRAIN AgentAuthoringContext containing the core ontology, SDK method/provider
catalog, copied theory identities, expected validation resources, and commands. Missing or wrong-purpose context shall
block authoring.

Verification: `tests/unit/context-sdk.test.mjs`, `tests/integration/training.test.mjs`, skill context checkers.

#### FS-TRN-003 — Complete theory candidate

The training role shall produce an AgentProject and RulePack that assemble at least one sealed ontology, one
MaterializationProfile, one executable circuit, theory resources, tests, and semantic benchmarks. Candidate modules
shall use only `.mjs` and Markdown.

Verification: `src/training/validate-candidate.mjs`, `tests/integration/training.test.mjs`.

#### FS-TRN-004 — SDK-first circuit implementation

The authoring context shall enumerate the MethodCatalog, authorized SDK imports, and an executable provider for every
default method. A circuit may declare and apply those primitives through ExecutionContext. Custom stages shall declare
their semantic effects.

Verification: `tests/unit/context-sdk.test.mjs`, `tests/unit/primitives.test.mjs`, `tests/unit/runtime.test.mjs`.

#### FS-TRN-005 — Candidate tests and semantic benchmarks

The host shall run candidate Node tests and benchmark cases in a child process. A test or semantic expectation failure
shall block promotion.

Verification: both training integration cases and `tests/integration/semantic-use-cases.test.mjs`.

#### FS-TRN-006 — Independent review

After initial validation, the host shall compile a REVIEW context and invoke the review role separately. Final
validation shall run after review output is merged. Empty review output or invalid repaired code shall block promotion.

Verification: `tests/integration/training.test.mjs`.

#### FS-TRN-007 — Analysis context on promotion

The promoted build shall contain an ANALYZE AgentAuthoringContext compiled from its actual ontology, recursively
collected circuits, exact SemanticDemand, profile, SDK imports, providers, and build identity.

Verification: `tests/integration/training.test.mjs`, `tests/unit/context-sdk.test.mjs`.

### 4.3 Task analysis and LongTextJS

#### FS-ANL-001 — One selected build

The analyze command shall resolve exactly one accepted agent build before creating a task. Missing agent/build or a
reused task identifier shall fail without invoking Codex.

Verification: CLI and coding-agent integration tests.

#### FS-ANL-002 — Role-limited generation

The host shall expose only `nll-analyze-task`, request, input, and selected AgentAuthoringContext to the task generation
workspace. The generated program shall be writable only below `generated/`.

Verification: `tests/integration/coding-agent.test.mjs`.

#### FS-ANL-003 — Dependency-free materializer

`generated/program.mjs` shall default-export one materializer function using host-injected source, LongText API,
ontology, and vocabulary. Generated imports shall be rejected before execution.

Verification: the import-rejection case in `tests/integration/coding-agent.test.mjs`.

#### FS-ANL-004 — Exact source spans

Explicit or verified source claims shall use half-open Unicode code-point spans that refer to the pinned source
revision. Invalid offsets or source mismatch shall fail validation.

Verification: `tests/unit/longtext-store.test.mjs`, native source tool integration tests.

#### FS-ANL-005 — Observation/result separation

Task LongTextJS shall publish only accepted ground observations, claims, contexts, alternatives, coverage, and gaps.
It shall not publish a Finding, rule status, derived theory result, or new ontology definition.

Verification: isolated materializer validator and semantic use cases.

#### FS-ANL-006 — Coverage and alternatives

The system shall preserve alternatives as separate contexts. Absence shall remain unknown until coverage for the exact
concept and scope is closed. A materializer may return an accepted gap instead of fabricating missing information.

Verification: `tests/unit/longtext-store.test.mjs`, `tests/unit/query-circuit.test.mjs`,
`tests/unit/interpretation-aggregation.test.mjs`.

#### FS-ANL-007 — Task-local persistence

A completed task shall persist copied input, pin modules, canonical LongTextJS, typed result, trace, Markdown report,
and state. No artifact shall be written into the selected agent build.

Verification: `tests/integration/coding-agent.test.mjs`, `tests/integration/persistence.test.mjs`.

### 4.4 OntologyJS and SemanticStore

#### FS-ONT-001 — Opaque typed constructors

Ontology definitions shall produce qualified sorts, roles, and callable concept constructors. Ground arguments shall
produce Terms and variables shall produce Patterns. Arbitrary semantic object fields shall not bypass validation.

Verification: `tests/unit/ontology.test.mjs`.

#### FS-ONT-002 — Role and cardinality enforcement

Construction shall reject invalid source/target sorts, missing required roles, excess cardinality, duplicate semantic
identity, and disjoint-type misuse.

Verification: ontology unit tests.

#### FS-ONT-003 — Hybrid identity

Source entities/events may use explicit identity. Suitable derived values may use qualified structural identity.
Structural identity shall include concept and role identities and shall not merge independent source mentions.

Verification: ontology tests and `experiments/architecture/identity.experiment.mjs`.

#### FS-STO-001 — Single logical store

LongText observations and circuit derivations shall share one SemanticStore with logical source, observation, derived,
hypothesis, and output boundaries. Public consumers shall use query and transaction APIs rather than physical indexes.

Verification: `tests/unit/longtext-store.test.mjs`, `tests/unit/runtime.test.mjs`.

#### FS-STO-002 — Transactional publication

A semantic delta shall be validated before commit. A failing stage, invalid type, missing evidence, or undeclared
effect shall publish no partial derivation or finding.

Verification: runtime unit tests for rollback and effect drift.

### 4.5 CircuitJS and deterministic execution

#### FS-CIR-001 — Hierarchical CircuitModel

A CircuitJS module shall construct a CircuitTemplate with primary responsibility, contracts, rules, decision tables,
stages, subcircuits, methods, schedules, and dynamic instantiation declarations. The source module is not the concrete
execution graph.

Verification: architecture and runtime tests.

#### FS-CIR-002 — Public SSA values

Every published runtime ValueRef shall have one producer and be immutable. Canonical template-binding-context identity
shall prevent duplicate circuit instances. Local JavaScript variables are outside the public SSA contract.

Verification: `tests/unit/execution-graph.test.mjs`.

#### FS-CIR-003 — Four-valued rules

Predicates and decision tables shall preserve `TRUE`, `FALSE`, `UNKNOWN`, and `CONFLICT`. An undecidable rule path shall
not execute its `then` actions. Rule status shall remain distinct from predicate truth.

Verification: `tests/unit/query-circuit.test.mjs`.

#### FS-CIR-004 — Coverage-sensitive absence

`notExists` shall return unknown in an open scope and true only after the exact required coverage is closed. Its trace
shall record the match and closure evidence.

Verification: query/circuit tests.

#### FS-CIR-005 — SDK primitive boundary

Stages shall be able to apply a registered primitive through an instrumented ExecutionContext boundary. Primitive
effects shall participate in stage effect validation and trace.

Verification: runtime primitive-application test.

#### FS-CIR-006 — Procedural macro-nodes

Circuit stages may use ordinary synchronous or asynchronous JavaScript, loops, classes, recursion, and local
structures. Semantic query and publication shall use ExecutionContext. A thrown exception shall roll back the node.

Verification: runtime procedural and rollback tests.

### 4.6 Multi-semantic assurance

#### FS-MUL-001 — Conservative abstract preflight

Abstract interpretation shall over-approximate registered primitive behavior. An unsupported operation shall report
precision loss and return declared top. Abstract results shall not replace concrete findings.

Verification: `tests/unit/interpreters-abstract.test.mjs`, multi-semantic runtime integration test.

#### FS-MUL-002 — Symbolic witness replay

Symbolic/concolic evaluation shall operate on declared discriminants and supported encoders. Witness assurance shall be
granted only after a model replays through concrete execution.

Verification: `tests/unit/interpreters-symbolic.test.mjs`.

#### FS-MUL-003 — Native bounded engines

The system shall provide dependency-free ConstraintKernel, RelationEngine, EGraphLite, ProofKernel, and SynthesisEngine
with explicit unsupported/budget results and opaque outputs.

Verification: `tests/unit/engines-*.test.mjs`.

#### FS-MUL-004 — Refinement progress

Equivalent RefinementDemands shall deduplicate. Refinement shall continue only when abstract state becomes more
precise; otherwise it shall stop explicitly.

Verification: `tests/unit/interpreters-refinement-assurance.test.mjs`.

### 4.7 Findings, trace, and controlled generation

#### FS-OUT-001 — Evidence-bearing findings

Every finding shall carry semantic identity, source or versioned evidence, circuit provenance, interpretation context,
and achieved assurance. Evidence-free findings shall fail commit.

Verification: semantic use cases and runtime tests.

#### FS-OUT-002 — Reimportable trace and result

Result and trace shall be durable `.mjs` modules and shall identify the selected build/source. The Markdown report is a
human projection and shall not add untraced premises.

Verification: coding-agent persistence integration test.

#### FS-CNL-001 — Critical-slot round-trip

A controlled sentence shall be accepted only when the paired parser reconstructs equivalent actor, modality, action,
object, quantification, negation, time, conditions, and exceptions.

Verification: `tests/integration/semantic-use-cases.test.mjs` and architecture CNL experiment.

#### FS-CNL-002 — Bounded validated synthesis

Synthesis shall search a typed finite grammar by declared cost and accept only candidates that pass concrete validation.
Budget exhaustion shall return an explicit bounded result.

Verification: `tests/unit/engines-proof-synthesis.test.mjs`.

### 4.8 Tools, inspection, and qualification

#### FS-TOL-001 — Native tools

`node tools/nll.mjs` shall validate and inspect source, ontology, context, plan, primitive, circuit, LongText, engine,
benchmark, and RulePack artifacts without external packages.

Verification: `tests/integration/native-tools.test.mjs`.

#### FS-TOL-002 — Context inspection

Context inspection shall report exact purpose, agent/build/digest, ontology/circuit counts, semantic demand, SDK imports,
providers, tests, and benchmarks from an actual AgentAuthoringContext.

Verification: native context tool integration test.

#### FS-VAL-001 — Full repository checks

The repository check shall run Node tests, five architecture experiments, realistic evaluation replay, DS matrix
generation, documentation link validation, repository format audit, and syntax checks.

Verification: `scripts/check.mjs` and its successful recorded execution.

#### FS-VAL-002 — Realistic forward evaluation

At least four business-diverse examples shall preserve medium-size authority/input, generated agent/task programs,
independent review, deterministic outputs, mutation evidence, and phase-separated performance data under `agentsEval/`.

Verification: `agentsEval/index.md` and scenario evaluation reports.

## 5. Data integrity and audit trail

All source and executable identities are content-derived or explicit and versioned. Generated files are accepted only
after path, extension, import, semantic type, and source-span validation. Task state changes are appendable/atomic where
specified. Cache data is reconstructible and is not semantic authority.

The minimum business trace is:

```text
authority span → RuleAnalysis obligation → architecture-plan step → circuit node/provider
task source span → LongText claim/context → query binding → decision/effect → finding/result
```

Reviewers shall be able to traverse both paths without relying on a model explanation.

## 6. Failure and recovery

Invalid CLI usage returns a usage-category failure. Candidate generation, review, or validation failure retains a
training run and current remains unchanged. Invalid LongText generation retains a failed task and publishes no semantic
snapshot. Circuit error rolls back the current transaction. Missing ontology/capability/coverage/resource remains a
typed blocker or unknown outcome. Recovery is a new explicit training run or a task-local materialization retry; neither
mutates prior accepted evidence.

## 7. Performance and capacity

The system reports coding/materialization generation separately from deterministic execution. Resource bounds apply to
generated file count/size, process time, query matches, circuit instances, engine iterations, and synthesis search.
No fixed production capacity is claimed. Qualification uses scenario source size, semantic term count, node count,
runtime wall time, and memory observations under a pinned Node version.

## 8. Traceability and release acceptance

A behavior change is acceptable only when:

1. its governing DS is updated;
2. this FS is updated if observable behavior changes;
3. implementation and focused tests agree;
4. realistic evaluation is updated when the business workflow changes;
5. HTML documentation demonstrates the actual workflow and code;
6. `serious_issues.md` does not contradict the claim;
7. the full repository check succeeds.

This document specifies experimental behavior, not regulatory validation of a deployed installation. A regulated use
would additionally require organization-specific risk assessment, installation/operational qualification, access
control, backup/retention procedures, and approved operating procedures.
