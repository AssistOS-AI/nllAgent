# Trace, assurance, and mutation review

A semantic review follows executable evidence from source to output. Do not accept a plausible explanation, expected
status, or green exit code without the trace path that produced it.

## Trace fidelity

For every emitted output, reconstruct:

1. source revision and exact supporting spans;
2. LongTextJS module, claim, context, and evidence status;
3. query pattern and bindings that selected the premise;
4. identity, temporal, quantity, rewrite, or coverage operation used;
5. circuit instance, node or stage, provider version, and inputs;
6. decision row, exception search, and status mapping;
7. semantic transaction validation and commit;
8. verifier, witness, certificate, or synthesis check when claimed.

Evidence must be sufficient for the semantic conclusion, not merely textually nearby. Each derived fact needs
provenance, and each finding needs source or versioned external evidence. A generated explanation may paraphrase the
trace but may not add a premise.

## Runtime integrity

Check the execution graph rather than only author modules:

- published `ValueRef`s have one producer and remain immutable;
- canonical template-binding-context keys prevent duplicate instantiation;
- task and interpretation contexts are preserved across edges;
- semantic writes appear only after transaction validation;
- failed stages publish no partial delta;
- effect logs match macro-node declarations;
- provider choices are pinned and included in trace;
- resource failure remains a blocker rather than an empty result.

## Assurance claims

Concrete execution is operational authority. Review additional assurance by its own acceptance rule:

- abstract: transfers over-approximate concrete behavior; top is reported when precision is absent;
- symbolic: encoded path conditions match the circuit and a witness is replayed concretely;
- concolic: generated cases are valid LongTextJS and cover semantic branches, not merely source lines;
- proof: ProofKernel rechecks every small proof step against pinned rules;
- rewrite: theory is authorized and preserves type, scope, modality, and evidence identity;
- synthesis: each candidate executes concretely and controlled text survives semantic round-trip.

A concrete finding can remain valid when optional assurance fails, but its assurance label must be lowered and the
failure reported. An abstract must-result alone is not a final finding unless the pack defines and validates an
explicit certification protocol.

## Semantic benchmark review

Cases should cover applicable and non-applicable inputs, conformity, violation, valid and incomplete exceptions,
`UNKNOWN`, `CONFLICT`, open and closed coverage, ambiguity, ontology/capability blockers, exact boundaries, and
cross-section dependencies. Assert semantic subject, evidence spans, interpretation classification, provider, and
critical trace events in addition to status.

## Mutation tests

Apply mutations that mimic high-risk category errors:

- invert a numeric or temporal comparator;
- delete or broaden an exception;
- treat `UNKNOWN` as `FALSE`;
- close an open scope or remove a coverage requirement;
- merge identity candidates;
- move a claim from an alternative into the main world;
- promote proposed/model evidence to verified;
- remove evidence-before-emit;
- choose an unpinned provider;
- make a rewrite erase modality or scope.

Relevant mutants must fail a benchmark, invariant, proof obligation, or review check. If they survive, strengthen the
independent oracle or trace assertion; do not declare the mutation irrelevant without authority evidence.
