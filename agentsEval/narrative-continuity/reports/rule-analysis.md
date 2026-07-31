# NC-001 rule analysis

The full authority file is the checked source span because identity, time, coverage, evidence, and the controlled source
boundary all constrain the same testable rule. Eleven obligations separate per-use instantiation, each decision branch,
identity, temporal closure, coverage, evidence, and language ownership.

The positive oracle is a same-person, same-object, different-location leave/use pair with a typed temporal path, closed
retrieval coverage, and no intervening retrieval. The closest counterexample adds a retrieval. Open coverage, multiple
identity candidates, or missing temporal reachability are `UNKNOWN`; incompatible coverage or time is `CONFLICT`.
Neither is a finding. `NOT_APPLICABLE` is reserved for a use with no qualifying leave premise or the same location.

Benchmark intentions include violation, intervening retrieval, open coverage, ambiguous identity, reverse or absent
temporal order, absent leave, different actor, conflicting coverage, exact evidence, and one dynamic instance per use.
