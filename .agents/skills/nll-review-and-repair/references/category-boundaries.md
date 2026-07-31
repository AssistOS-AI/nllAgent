# Semantic category boundaries

Use this reference to decide which layer owns a defect. A local patch in the wrong layer can make tests pass while
destroying the direction of semantic authority.

## Authority and rule analysis

Authority Markdown is immutable evidence. `RuleAnalysis` names its clauses, scope, modality, premises, exceptions,
priorities, evidence requirements, and possible outcomes. A missing or misread clause is repaired in rule analysis,
then all downstream artifacts are rebuilt. Never alter authority text or benchmark expectations to fit an
implementation.

## OntologyJS

OntologyJS owns observable concepts, sorts, roles, relations, cardinalities, subtypes, disjointness, controlled values,
identity policies, lexicalization, and local context-independent validation or normalization. It does not own a
defeasible conclusion, policy exception, priority, finding, or document-specific fact.

Repair OntologyJS when the selected vocabulary cannot express a source-relevant notion, or when a constructor permits
or rejects the wrong typed structure. Do not repair a missing source observation by broadening a role until an invalid
term passes.

## MaterializationProfile and LongTextJS

The profile is derived from circuit demand and owns what documents must observe: concepts, roles, identity/time/
quantity operations, evidence policies, alternatives, and exact coverage scopes. Task LongTextJS owns source-grounded
terms, claims, contexts, identity candidates, alternatives, coverage, and gaps for one document.

Repair task LongTextJS for a wrong span, lost scope, fabricated identity, collapsed alternative, unjustified coverage,
or omitted representable observation. It may not introduce a new constructor, finding, status, or rule-specific
shortcut. Repair the profile when every task generator is being asked for the wrong semantic inputs.

## CircuitArchitecturePlan and CircuitJS

The plan owns decomposition, typed responsibilities, methods, provider reuse, coverage demands, effects, assurance,
benchmark goals, and ownership. CircuitJS owns executable query, dataflow, decision, derivation, verification, and
generation behavior.

Repair the plan for an unmapped authority clause, wrong method, missing capability, incorrect circuit boundary, or
unclassified cycle. Repair CircuitJS for an unbound variable, wrong query, truth/status error, absence without closure,
missing evidence, effect drift, schedule error, or divergence from an otherwise correct plan.

## Primitives, engines, and assurance

An SDK primitive owns one reusable typed semantic operation. Engines implement shared constraints, recursive
relations, rewrites, proof checks, or synthesis. Abstract transfers, symbolic encoders, summaries, and proof steps are
assurance for selected boundaries, not alternate rule authorities.

Repair a primitive when its concrete operation is wrong for all consumers. Repair assurance when concrete behavior is
correct but preflight is unsound or too imprecise, a symbolic branch cannot be represented, a proof step is invalid,
or a rewrite changes protected semantics. Do not duplicate a shared engine inside a rule circuit.

## Benchmark and integration

Benchmarks own independent examples and expected semantic outcomes grounded in authority. Integration owns exact
imports, unique IDs, provider pins, build identity, context generation, and atomic promotion.

An expected result changes only after a documented independent authority re-analysis. A provider ambiguity, stale
context digest, or task/build mismatch is an integration defect. Green unit tests cannot waive either issue.

## Task versus trained theory

A task review may repair only its generated LongTextJS and task-local notes. Even when review discovers a genuine
ontology or circuit limitation, it records a blocker or proposed training issue. It never mutates the selected trained
agent. Training review may repair the candidate under `generated/`, but never an already promoted build.
