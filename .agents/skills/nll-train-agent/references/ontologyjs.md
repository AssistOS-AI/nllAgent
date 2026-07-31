# OntologyJS design

Read this reference before changing vocabulary. OntologyJS is an executable, versioned signature shared by document
materialization and circuits; it is not a label registry or a configuration object.

## Design sequence

1. Start from the `RuleAnalysis` observation demands, calibration texts, and active ontology listed in the generated
   agent context.
2. Search the active ontology by qualified identity and role semantics. Reuse an exact concept even when the source
   uses another lexical form.
3. Classify each required notion as source-observable, a controlled value, a local definitional view, or a circuit
   result.
4. Add the smallest missing concept, role, relation, or value type. Define sort, domain, range, cardinality, subtype,
   disjointness, identity policy, and lexicalization where relevant.
5. Seal the ontology, run valid and invalid constructor examples, and inspect downstream usages before authoring
   circuits.

The active theory can contain multiple ontology modules. Extend them by imports and qualified identities. Do not rely
on a process-global mutable registry, and do not copy a concept into the new namespace merely to shorten an import.

## Constructor boundary

`O.entity`, `O.event`, `O.state`, `O.relation`, `O.role`, and `O.valueType` return callable constructors or role
constructors. Their results are opaque typed values. When arguments are ground, a concept constructor creates a term;
when a typed CircuitJS variable appears, it creates a pattern. This dual use guarantees that LongTextJS produces the
same identities that CircuitJS queries.

Use roles to express semantic participation. Events usually carry roles such as actor, theme, source, target, time,
place, instrument, authority, or scope. Cardinality is semantic: `exactlyOne` means the event is structurally invalid
without exactly one compatible value; `zeroOrMany` is not permission to accept an arbitrary array.

## What belongs in the ontology

Legitimate ontology behavior is local and context-independent:

- validate a controlled value;
- normalize a unit or canonical lexical form;
- compute a definitional view;
- contribute an index key or pretty-print form;
- enforce role cardinality, subtype, and disjointness.

Contextual policy belongs in CircuitJS. Do not place exception priority, legal applicability, absence reasoning,
confidence thresholds, or a finding decision in a constructor or behavior. `LegalObligation` may be observable;
`AcceptedRetentionException` is a decision unless authority defines it as an explicit statement type.

Derived output concepts should be declared as derived and never accepted as LongTextJS source observations. This
protects the direction of evidence: documents support premises, circuits produce findings.

## Identity, mentions, and claims

An entity and a textual mention are different things. OntologyJS defines their types; LongTextJS anchors each mention
and relates it to an entity using `resolvesTo` or an identity candidate. The ontology must not equate entities merely
because a normalizer produces the same name.

Likewise, an event term is propositional content, while a claim records who or what asserted it, in which context and
with what epistemic status. Model reported speech, denial, modality, and alternatives above the content term rather
than adding booleans such as `negated: true`.

## Extension quality checks

Reject an ontology change when any of these holds:

- a qualified identity duplicates an existing concept with incompatible meaning;
- domain or range is broader only to make invalid generated code pass;
- a required role has no defensible cardinality;
- a mutable object or string payload bypasses an available controlled type;
- a behavior reads document context or decides a defeasible rule;
- a finding is introduced as though it were a source observation;
- lexical aliases have been mistaken for distinct concepts;
- the new concept has no traced authority, materialization, circuit, or CNL use.

Run ontology impact checks after every signature change. There is no compatibility obligation, but all dependent
materialization profiles, circuits, tests, and benchmarks must be rebuilt against the exact sealed version.
