# Multi-semantics assurance

Read only the sections required by the `CircuitArchitecturePlan`. Concrete execution is mandatory; all other modes are
bounded assurance mechanisms attached to selected steps or targets.

## Concrete authority

Concrete execution evaluates the accepted LongTextJS snapshot with pinned circuit and primitive providers. It is the
operational source of findings. Any witness, certificate, abstract result, or synthesized repair must link back to a
concrete trace or state explicitly that concrete validation was unavailable.

## Abstract interpretation

Use abstract preflight to over-approximate executions compatible with incomplete materialization. Core domains cover
four-valued evidence, finite choices, ontology type sets, aliases, numeric intervals, temporal relations, collection
shape, coverage, scope, and interpretation alternatives.

An absent transfer function returns conservative top. That is sound but may be too imprecise. Implement a custom
transfer or macro-node summary only when top lies on the critical path to a required preflight conclusion. Recursive
components use a worklist and widening only where the selected domain admits an ascending chain; narrowing may recover
precision after stabilization.

Preflight may report must/may/cannot, unreachable decision rows, possible blockers, or required refinements. It does
not emit a final finding by itself.

## Symbolic and concolic execution

Symbolize only discriminants named in the assurance plan: for example duration, exception presence, coverage state,
identity, or temporal order. Primitive encoders contribute exact constraints. An opaque macro-node becomes an
uninterpreted boundary or an explicit unsupported node; do not fabricate a symbolic model of arbitrary JavaScript.

Concolic execution starts from a concrete benchmark, records branch predicates, negates an uncovered semantic branch,
asks ConstraintKernel for a model, materializes that model as a valid LongTextJS case, and replays it concretely. A
finding is `witnessed` only after the generated model reproduces it in concrete execution.

## Constraint and relation engines

Use the repository's ConstraintKernel for equality, finite domains, rational intervals, difference constraints, and
Allen temporal relations. Its result is satisfiable with model, unsatisfiable with conflict trace, or unknown with
unsupported atoms. Do not implement a private rule-specific solver.

Use RelationEngine for typed monotone closure and reachability. A positive recursive capability cycle may become a
fixed-point group. Stratified negation is allowed only after the positive stratum closes. An unclassified capability
cycle is an architecture error.

## Rewrites and equivalence

EGraphLite applies only rewrite theories authorized and pinned by the RulePack. A rewrite must preserve ontology type,
scope, modality, quantification, and evidence-relevant identity. Equality saturation is not permission to normalize
away differences such as relative versus absolute improvement.

## CEGAR and refinement

When abstract execution produces a possible finding that lacks a concrete witness, emit a typed `RefinementDemand` for
the missing discriminant: ontology representation, source materialization, identity, time, coverage, or node summary.
Route it to the layer with authority. Deduplicate demands and require a measurable precision change. If refinement
does not add information, stop with `UNKNOWN` or a blocker instead of looping.

## Local proof

ProofKernel checks small proof objects; it does not discover universal truth. Appropriate obligations include decision
row disjointness and exhaustiveness, arithmetic or temporal implications, evidence-before-emit, summary soundness, and
CNL-frame equivalence. Failure to establish an optional certificate lowers achieved assurance; it does not silently
invert a concrete finding.

## Synthesis and CNL

SynthesisEngine searches a typed grammar with explicit holes and cost. Prefer preservation of source meaning, minimal
change, and canonical lexicalization. Execute each candidate through the concrete rule circuit. For controlled text,
render the semantic frame, parse the text back, and compare modality, actor, action, object, negation, time, conditions,
and exceptions. Plausible prose that fails round-trip remains an unverified draft.
