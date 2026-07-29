---
id: DS020
title: Query-First Circuit Authoring and LongText Query Semantics
status: experimental
owner: nllAgent maintainers
summary: Defines and implements an experimental typed query and evidence-aware decision subset over LongTextJS that lowers to ordinary CircuitJS without creating a second runtime authority.
---

# Introduction

LongTextJS already contains the finite source-side world for one immutable input revision, while CircuitJS already provides the reusable graph, registered algorithms, verification dominance, budgets, and publication boundary. Routine rules nevertheless become harder to review when their relational intent is spread across incidental graph wiring. This specification defines an experimental query-first authoring profile for those rules. Its first bounded subset is implemented; the extended algebra and native optimizer remain explicit future work.

The profile does not replace CircuitJS, add SQL, or turn LongTextJS into a database service. It standardizes plain-data queries and evidence-aware decision tables that a compiler can validate and lower to ordinary CircuitJS. Direct graphs and exact registered operators remain the correct representation for state machines, recursion, search, solvers, argumentation, complex temporal reasoning, and any algorithm whose reviewed implementation is clearer than a generic query plan.

The implemented query-first subset does not accept arbitrary operator calls inside expressions or rows. A typed query
may prepare the relation for an algorithm, but custom JavaScript processing currently enters through a direct
CircuitJS node backed by a trusted runtime extension. A future `operatorRule` form may reduce that wrapper only after it
preserves the same registry, witness, verifier, budget, source-map, and digest-lock contracts.

# Core Content

## Architectural decision

The query-first profile is additive. Its semantic layers are deliberately limited:

1. the restricted author source, which uses one direct `queryFirstCircuit({...})` constructor and plain-data query and table values;
2. one canonical CircuitJS graph containing normalized `LongTextQuery@1` and `DecisionTable@1` values or nodes produced from them;
3. an optional runtime execution plan, which is operational data and never a second semantic release artifact.

The normalized query and table values are the logical plan. A separate mandatory `circuit.logical.json` would duplicate the same meaning and is therefore rejected for the first profile. A source map may relate one normalized query, table, row, or authority identity to one or more generated graph nodes. The graph continues through the existing compiler and scheduler and remains subject to exact registry linking, budgets, reachability, and verification dominance.

An implementation must not claim `circuitjs-query-first@1` support merely because a circuit stores an object named `query`. The current compiler recognizes the exact top-level kind and dialect, lowers it, and prevents a direct graph from spoofing the profile label.

## LongTextJS as a finite instance world

One canonical `LongTextProgram` denotes an immutable, addressable instance world. Array and object-map layouts are serialization choices. A query adapter exposes deterministic logical relations over the canonical value and may build discardable indexes, but it cannot add observations, upgrade statuses, create coverage, or change provenance.

The initial relation vocabulary follows the actual LongTextJS contract rather than inventing database-only entities:

| Relation | Canonical source | Row identity and order |
| --- | --- | --- |
| `source` | the singular `program.source` record | one row, identified by source id and revision |
| `blocks` | `program.blocks[]` | block id; source order is explicit in `order` and anchors |
| `anchors` | values of `program.anchors` | anchor id; map enumeration order is not semantic |
| `schemas` | `program.schemas[]` | exact schema/version identifier in canonical program order |
| `ontologyPacks` | `program.ontologyPacks[]` | immutable pack identity, mode, digest, principles, and limitations |
| `views` | `program.views[]` | view id; view selection declares member order |
| `scopes` | `program.scopes[]` | scope id; containment or precedence must be explicit |
| `observations` | `program.observations[]` | observation id; nominal type and status are mandatory query dimensions |
| `mentions` | `program.mentions[]` | mention id when materialized |
| `entities` | `program.entities[]` | entity id when materialized |
| `identityCandidates` | `program.identityCandidates[]` | candidate identity and world |
| `worlds` | `program.worlds[]` | world id; mutually exclusive worlds remain separate |
| `capabilities` | `program.capabilities[]` | deterministic composite of type and producer |
| `coverage` | `program.coverage[]` | coverage id and exact covered domain |
| `gaps` | `program.gaps[]` | gap id when present, otherwise a deterministic derived row id |
| `diagnostics` | `program.diagnostics[]` | diagnostic id when present, otherwise a deterministic derived row id |
| `task` | the singular `program.task` record | one row bound to the program digest |

Relations are read-only views. Query results are derived values, not LongTextJS observations. Every result row must retain the canonical identities that influenced it. A physical index is keyed by the complete program digest and query-engine version, is safe to discard, and has no evidentiary authority.

## Canonical query value

`LongTextQuery@1` is finite, acyclic, JSON-compatible plain data. It contains a stable `id`, one `from` relation and binding, optional typed joins, a three-valued `where` expression, a named projection, a mandatory total order, and explicit budgets. Observation scans name one exact nominal type and accepted statuses. Their coverage, criticality, and optional scope relation are lowered to the generated observation port; scope, channel, world, producer, or payload restrictions that affect selection are explicit field expressions over relations supported by the initial adapter.

```json
{
  "kind": "LongTextQuery",
  "schemaVersion": 1,
  "id": "q:published-paragraphs",
  "from": {
    "relation": "observations",
    "as": "p",
    "type": "document.paragraph@1",
    "statuses": ["extracted"]
  },
  "where": {
    "op": "eq",
    "left": { "field": "p.payload.structuralRole" },
    "right": { "literal": "paragraph" }
  },
  "select": {
    "paragraph": { "ref": "p" },
    "text": { "field": "p.payload.text" },
    "order": { "field": "p.payload.order" }
  },
  "orderBy": [
    { "expr": { "field": "p.payload.order" }, "direction": "asc" },
    { "expr": { "field": "p.id" }, "direction": "asc" }
  ]
}
```

The implemented subset contains relation scan, three-valued `where`, projection, `innerJoin`, `semiJoin`, coverage-aware `antiJoin`, and deterministic `orderBy` with a canonical row-id fallback. Observation scans require one exact nominal type, accepted statuses, and either a built-in structural or foundation payload schema or explicit field paths for a schema not yet present in a registry. `leftJoin`, correlated `exists` and `notExists`, grouping, deterministic aggregates, `distinct`, `union`, `limit`, structural interval predicates, and ordered patterns are not implemented.

The query language rejects unknown construction keys as well as callbacks, code strings, regular-expression source, dynamic property access, implicit JavaScript coercion, imports, asynchronous work, recursion, mutation, clock access, random values, filesystem access, network access, or ambient process state. Complex text, temporal, solver, model, and domain functions are exact registered functions or operators with versioned contracts.

## Expression and value semantics

Field references resolve against lexical bindings and the implemented structural and foundation field catalog or explicit non-structural field declarations. Normalized literals retain their JSON scalar or plain-data type. Equality is strict; ordered comparison accepts two finite numbers or two strings; collection and text operators validate their runtime operand shapes instead of applying JavaScript coercion. Full compile-time scalar, nominal, nullability, and collection-element inference remains a promotion gate because arbitrary semantic schemas are not registry-owned yet.

The implemented scalar operators are `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `in`, `includes`, `startsWith`, `endsWith`, and Unicode-aware literal `wholeWord`. Logical operators are `and`, `or`, `not`, and `isPresent`. Expressions use `TRUE`, `FALSE`, and `UNKNOWN`:

- `and` is false when any operand is false, true when all are true, and unknown otherwise;
- `or` is true when any operand is true, false when all are false, and unknown otherwise;
- `not` preserves unknown;
- a comparison is unknown when a required value is unavailable, not merely absent from an optional field;
- presence is expressed by semi-join in the implemented subset;
- justified absence is expressed by anti-join, which retains an unmatched left row only when an exact current-source, failure-free, closed-world token and producer capability satisfy the declared domain.

The normal filter policy retains only `TRUE`. A decision boundary must record material `UNKNOWN`; it may not silently coerce it to false. Defaults and `coalesce` remain explicit dependencies and may reduce the guarantee ceiling.

## Query result and dependency envelope

A query result contains the program digest, query id and digest, row schema, deterministic rows, coverage evaluation, diagnostics, and budget counters. Each row contains a deterministic row id, named values or canonical references, and the identities of source objects, observations, coverage tokens, registered functions, and assumptions that influenced it.

Projection may hide dependency fields from the displayed row but cannot erase them from the envelope. Aggregates retain all contributing member identities or an exact verifier-approved commitment and replay procedure. A projected text string without its source or observation reference is convenience data, not evidence.

## QueryContract

The existing `ObservationContract` remains the executable producer-consumer boundary. Query-first compilation extends it with a `QueryContract` section rather than replacing it. The implemented section contains relations and bindings, exact observation types and versions, accepted statuses, explicit schema fields, fields actually read, generated-port coverage/criticality/scope relation, exact anti-join domains, order requirements, and conservative row budgets. Other scope, channel, producer, and world dependencies remain visible as field paths and predicates until richer contract dimensions are implemented.

The contract is derived only from output-reachable queries and decisions. It requests neutral descriptive material. It must not ask a LongTextJS producer for a rule-dependent verdict such as `missing-required-notification@1` when the circuit is responsible for deriving that conclusion.

Compatibility checks must match coverage structurally. At minimum, an absence-sensitive domain fixes source id and revision, view or scope, channel set, observation type and version, accepted membership statuses, producer or producer class, method, completeness mode, exclusions, failures, and verification state. The initial exact matcher accepts only a token with no recorded failures; it does not infer that a partial failure is irrelevant. Subsumption is conservative and versioned. An empty open-world or limited query remains `UNKNOWN`.

## Evidence-aware decision tables

`DecisionTable@1` is the recommended rule form when several authority rows share one typed query and differ mainly in conditions, exceptions, priority, or candidate values. It is data, not a second execution engine. Every implemented row declares stable id, immutable authority reference, condition, plain-data candidate template, and verifier route. One table currently uses one exact verifier shared by all rows. The compiler-generated `QueryDecisionWitness` carries the normalized query, table, selected query-row and decision-row identities, dependencies, source revision, and candidate replay digest.

The initial profile supports three hit policies:

| Policy | Meaning |
| --- | --- |
| `unique` | exactly zero or one row may match one input; overlap is an error |
| `priority` | the unique highest explicit priority or override relation wins; ties are errors |
| `collect` | every matching row constructs a candidate in query-input order, then descending optional priority and stable row id |

`any`, implicit file-order selection, and generic `all` composition are excluded from the initial profile. `any` can hide output differences, file order is not authority, and `all` requires a separately registered composition algebra. A future profile may add one only after defining semantic equality or composition and its conflict tests.

A row evaluates to `MATCH`, `NO_MATCH`, or `UNKNOWN` in the implemented table evaluator. `block-circuit` turns a material unknown into a typed runtime refusal; compatibility and budget failures remain separately blocked outside the row result. `MATCH` constructs a candidate and witness but does not verify or emit it. Verifier rejection remains distinct.

## Choosing the simplest correct form

Authors and learning agents must choose by semantic shape, not by line count:

| Rule shape | Preferred representation |
| --- | --- |
| one reviewed algorithm with a stable policy object | current `call -> verify -> emit` operator wrapper |
| typed selection plus local alternatives or exceptions | named query plus decision table |
| threshold over a complete member set | query plus registered aggregate rule and replay witness |
| bounded ordered sequence | named ordered query plus registered pattern or state operator |
| recursion, truth maintenance, argumentation, search, solver, or complex state | direct CircuitJS graph and exact registered operators |

The existing editorial lexical circuits are already minimal operator wrappers. Replacing their three nodes with a query compiler, a generic table evaluator, and generated nodes would increase the trusted and reviewed surface without reducing domain complexity. They should remain direct until a query-first representation demonstrably improves static analysis or combines a real family of rules.

## Compilation and explanation

The implemented compiler normalizes query and table data, rejects unknown construction keys, validates bindings and the supported field schemas, derives the QueryContract, validates deterministic ordering, exact anti-join coverage declarations, priority data, unknown policy, shared verifier identity, and row budgets, then lowers to ordinary CircuitJS. Every generated candidate path passes through an exact registered verifier before `emit`. The graph compiler independently rechecks linking, effects, reachability, budgets, dead declarations, and verification dominance.

Stable query, table, row, authority, candidate, evidence, and verifier identities survive lowering. The implemented source map relates logical identities to generated nodes, and each scheduler trace entry carries its logical identity. Line-and-column author locations and a separate CNL explanation renderer remain future work. Decision and query node outputs already preserve selected rows, condition evaluations, unknowns, dependencies, coverage state, verifier result, hit policy, and publication decision for inspection.

The normalized author value, author digest, generated canonical graph and digest, QueryContract, logical-to-physical source map, and successful static-analysis record are persisted in `query-first-artifacts.json` when a release contains the profile. Benchmark execution compares reference query/table execution with the lowered graph at query, decision, and verified-result layers and fails on drift. Index selection, timing, cache records, and physical node fusion remain operational and do not change semantic release identity.

## Security, budgets, and optimization

The restricted loader remains the direct CircuitJS loader and therefore rejects callbacks, imports, control flow, prototypes, ambient capabilities, and lossy values. The implemented query evaluator enforces `rowsRead` and `intermediateRows`; the lowered graph additionally enforces circuit node and wall-time budgets. Stable promotion still requires dedicated AST-depth, literal-byte, binding, memory, and trace-byte limits. Budget exhaustion is blocked, never no-match.

A future optimized evaluator may push filters, reuse identical queries, select hash or merge joins, build source-order and type/status indexes, cache pure functions, or replace a logical fragment with an exact compound operator. It must preserve row values, deterministic order, dependency envelopes, coverage states, unknown and blocked states, verifier inputs, guarantees, and high-level identities. The implemented reference scan and lowered graph are the current conformance paths.

## Implementation and adoption boundary

The repository implements the experimental QF-A/QF-C subset in `src/circuit/query-first/`. It includes the restricted constructor, canonical relation adapters, supported expression and relational validation, reference scan evaluator, exact coverage-aware anti-join, QueryResult dependencies, QueryContract derivation, three table hit policies, runtime overlap and priority diagnostics, candidate templates, query-decision replay verification, graph lowering, logical trace metadata, release artifact persistence, and benchmark differential comparison. Existing direct releases continue unchanged.

The experimental label remains because several broader goals are not implemented: registry-owned schemas for arbitrary semantic payloads; compile-time proof of table overlap, shadowing, and cardinality; correlated subqueries; aggregates and ordered patterns; typed registered scalar functions; memory and trace-specific query budgets; line-and-column author source maps; semantic mutation generation during publication; an independently implemented query engine; and native discardable indexes with drift fallback. Author-declared field paths for non-structural types constrain syntax but are not equivalent to a trusted schema registry.

The next adoption steps are:

1. move arbitrary observation field schemas and exact operator/verifier contracts into enforced registries;
2. add aggregate and ordered-pattern forms only with replay witnesses and completeness semantics;
3. add compile-time overlap proofs for the decidable expression subset and mutation execution per table row;
4. add an independent optimized executor and discardable indexes only after fuzz, resource, corruption, and fallback gates pass;
5. promote the DS status only after the remaining gates chosen for the stable profile are complete.

A release may publish only the implemented subset that passes the current compiler and benchmark differential gate. It must not claim the unimplemented extended algebra or native QF-R execution.

# Decisions & Questions

### Question #1: Why not adopt the proposal's mandatory author, logical, and physical artifacts unchanged?

Response: The normalized query and table ASTs already are the logical plan, and ordinary CircuitJS is already the canonical execution graph. The implementation persists their digests, QueryContract, generated graph digest, and source map without adding another semantic authority.

### Question #2: Is the LongText instance world a database?

Response: No. It is a semantic view of one canonical finite `LongTextProgram`. The implemented reference path scans the JSON value directly. Maps, sorted vectors, interval indexes, or a database adapter remain optional future physical optimizations and never evidence.

### Question #3: Why not embed SQL, JSONPath, or JavaScript callbacks?

Response: SQL and JSONPath do not carry nllAgent status, coverage, provenance, witness, guarantee, and verification semantics. JavaScript callbacks hide field dependencies, effects, cost, and canonical meaning. A small typed plain-data algebra is easier to validate, source-map, budget, compare, and lower.

### Question #4: Why are only three decision-table hit policies in the first profile?

Response: `unique`, explicit `priority`, and `collect` cover the common linter choices without relying on source order or an undefined output equality/composition rule. Additional policies are justified only when their semantics and conflict tests are explicit.

### Question #5: Does query-first authoring weaken the mathematical power of CircuitJS?

Response: No. It is a preferred notation for relational rule families, not the only notation. Fixpoints, temporal state, argumentation, graph algorithms, solvers, search, and specialized computations remain exact operators or direct graphs.

### Question #6: Can a table row publish a finding directly?

Response: No. It can construct only a candidate, witness, or undetermined record. Lowering inserts the verifier route, and the existing graph compiler independently proves verification dominance before publication.

### Question #7: When is absence true?

Response: Only when the bounded query returns no qualifying row and a verified closed-world coverage token exactly matches or conservatively subsumes the complete excluded domain. Empty open-world, top-k, partial, failed, or budget-limited materialization is unknown or blocked.

### Question #8: Why not migrate the current editorial demonstration immediately?

Response: Its published direct circuits already use the simplest safe form: one exact lexical operator, one independent verifier, and one emit node. The experimental query-first example is intentionally separate and demonstrates shared relational decisions; replacing the release merely to use new syntax would still increase complexity.

### Question #9: What must be compared in differential execution?

Response: Canonical candidates, witness contents, dependency envelopes, coverage evaluation, unknown and blocked records, verifier inputs and outcomes, guarantees, findings, conflicts, and deterministic output order must agree. Physical node ids, timing, cache hits, and index choices are nonsemantic.

### Question #10: Why is the DS experimental after the first implementation exists?

Response: The implemented subset is real and publishable through the existing release gate, but it deliberately omits aggregates, ordered patterns, registry-owned arbitrary schemas, compile-time overlap proofs, per-row mutation execution, author line maps, and an independent optimized executor. Experimental status prevents the bounded subset from being mistaken for the full design surface.

### Question #11: Can a query row run custom JavaScript?

Response: No. Query expressions remain inspectable plain data. When a rule needs an algorithm beyond the implemented
algebra, the author uses an ordinary CircuitJS node and exact registered operator, which may come from a trusted runtime
extension. This keeps data selection analyzable and algorithm code explicit instead of hiding both inside a callback.

# Conclusion

The experimental subset makes common relational rules more explicit without creating another runtime or weakening CircuitJS. LongTextJS is executable as a documented immutable query world; normalized queries and evidence-aware tables express routine intent; ordinary CircuitJS, registered operators, coverage, independent verifiers, budgets, benchmark differential execution, and immutable publication remain authoritative. The remaining advanced forms stay explicit future work.
