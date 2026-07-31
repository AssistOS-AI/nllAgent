# Circuit engineering and method selection

Read this reference when producing a `CircuitArchitecturePlan` and implementing CircuitJS. A circuit states one
semantic responsibility. Methods describe how its subproblems are solved; interpreters describe how the same circuit
model is evaluated.

## Decompose by typed responsibility

Start with the output capability, such as `RetentionAssessment`, `ContinuityFinding`, or
`ScientificClaimConsistency`. Split only at boundaries that have a reusable output, a different execution engine, an
independent test surface, a capability provider, or a distinct owner. A helper function does not need to become a
circuit.

For each plan step record:

- typed input and output ports;
- required concepts, roles, evidence policy, scope, and coverage;
- problem shape and chosen method;
- exact reused SDK primitive or circuit provider;
- effects and scheduling constraints;
- required concrete tests and optional assurance;
- the file and owner responsible for implementation.

The reuse order is normative: exact existing circuit, existing SDK primitive composition, new reusable primitive,
then typed JavaScript macro-node. A macro-node is a normal and valid choice for an irregular algorithm; it must not be
used to hide queryable semantics or to bypass an existing verified engine.

## Method selection

| Problem shape | Preferred implementation |
| --- | --- |
| Typed selection, filtering, finite joins | SemanticStore query/dataflow primitives |
| Finite premises, exceptions, priorities | Four-valued decision table |
| Quantity, equality, deadline, temporal bounds | ConstraintKernel primitives |
| Reachability, closure, recursive propagation | RelationEngine fixed-point group |
| Authorized canonicalization or equivalence | EGraphLite rewrite theory |
| Irregular global algorithm, I/O, model call | Typed JavaScript macro-node with declared effects |
| Minimal repair or controlled clause | Synthesis primitive plus concrete and CNL validation |

Abstract, symbolic, concolic, proof, and synthesis are not competing implementations of the rule. Add them only when
the assurance plan requires them. Method selection stays local to the subproblem.

## Dynamic hierarchical dataflow

The authoring module produces a `CircuitModel`, not a serialized node object. A runtime `CircuitInstance` binds the
model to concrete inputs and an interpretation context. Matching can create canonical subcircuit instances lazily, so
the execution graph grows with relevant facts rather than being handwritten as one flat graph.

SSA applies at public dataflow boundaries. Every published `ValueRef` has one producer and is immutable. Local
variables inside a JavaScript stage may be assigned normally. A procedural stage publishes one validated result or a
transaction delta; the runtime does not pretend every local instruction is a graph node.

All semantic writes are transactional. `ctx.derive` and `ctx.emit` add candidate values to the current buffer. Commit
validates types, destination layer, provenance, duplicate identity, and invariants. An exception abandons the buffer;
partial findings cannot leak into SemanticStore.

## Query and absence discipline

Circuits read only through `ExecutionContext` and SemanticStore query algebra. They must not traverse physical arrays,
indexes, or private node fields. Queries preserve interpretation context and evidence policy.

`notExists` is non-monotone. It can be final only with coverage for the exact queried concept and scope. An open or
partially materialized scope yields `UNKNOWN`. Closing an entire document does not imply that every concept in every
interval was exhaustively materialized.

Alternatives are evaluated separately. Aggregate only through an explicit policy:

- robust when all admitted interpretations support the finding;
- conditional when named alternatives differ;
- conflict when admissible interpretations support incompatible outcomes.

## Decision and output discipline

Decision tables explicitly handle `TRUE`, `FALSE`, `UNKNOWN`, and `CONFLICT`; their result statuses remain distinct
from those predicate values. Check row reachability, overlap, priority, and exhaustiveness. Equal-priority incompatible
rows produce conflict rather than “first row wins”.

Every finding carries evidence and provenance back to the authority rule, circuit node, bindings, claims, and source
spans. Assurance labels describe how the result was obtained: mechanical, cross-checked, model-assisted, heuristic, or
unverified. A well-worded explanation without this trace is not evidence.

## Macro-node boundary

A custom stage declares `reads`, `writes`, `emits`, tool/model calls, and capabilities. Runtime instrumentation compares
actual effects with the declaration. Add a summary only when abstract planning or another assurance mode crosses that
node; add a symbolic encoder only when a declared branch-coverage goal needs it. Plain objects may be local, but outputs
must be registered semantic values or frozen artifacts.
