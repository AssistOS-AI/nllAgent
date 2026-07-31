# Term algebra and authority analysis

Read this reference while converting authority prose into `RuleAnalysis`. It defines the semantic boundary that later
ontology and circuit work must preserve.

## Authority is evidence, not executable meaning

An authority file is immutable source evidence. Index it by revision and half-open Unicode code-point spans before
interpreting it. A rule-analysis module may name and decompose a clause, but it must keep the authority span that
supports every premise, exception, priority, and outcome. If prose is genuinely ambiguous, preserve the alternatives;
do not silently choose the branch that is easiest to implement.

For every rule, identify:

- semantic scope and the conditions under which the rule applies;
- actor, action or state, object, modality, quantification, time, and place;
- positive premises, exceptions, priorities, and evidence requirements;
- what makes the result `SATISFIED`, `VIOLATED`, `NOT_APPLICABLE`, `ACCEPTED_EXCEPTION`, `UNKNOWN`, or `CONFLICT`;
- which absences matter and what exact source scope must be closed before that absence is usable;
- the observation concepts LongTextJS must materialize and the derived concepts CircuitJS may emit.

An undefined policy term remains explicit. If a retention rule says “documented legal obligation” without defining
“documented”, model that phrase as an observable qualification or a named open requirement. Do not invent a document
class, confidence threshold, or external-law test.

## One multi-sorted algebra

OntologyJS defines a signature of sorts, concepts, roles, relations, subtypes, and constraints. LongTextJS builds
ground terms in that signature. CircuitJS uses the same constructors with typed variables to build patterns and uses
the same constructors with ground values to derive outputs.

Public semantic values are opaque:

- `Term` is a ground ontological value with concept identity, typed roles, context, and provenance;
- `Pattern` is a term shape containing typed variables and predicates;
- `Claim` relates propositional content to source, speaker, context, and epistemic status;
- `Binding` maps variables to compatible terms without mutating either;
- `ValueRef` names one immutable value produced by an execution node;
- `Artifact` freezes an external tool or model result until a validator accepts it.

JavaScript arrays, maps, sets, and objects may organize local algorithms. They do not become semantic facts. A value
enters SemanticStore only through an ontology or runtime constructor accepted at the transaction boundary.

Collections also have semantic meaning. Use `sequence` when order and duplicates matter, `setOf` for semantic
deduplication, `allOf` for conjunction, `anyOf` for disjunction, and `alternatives` for mutually incompatible readings.
Do not substitute an ordinary array when the distinction crosses a semantic boundary.

## Ground identity and derived identity

Use explicit stable identity for source entities, mentions, claims, and anchored events. Keep separate mentions and
represent coreference as candidates until evidence resolves it. Structural canonicalization is appropriate for pure
values and derived terms only when the ontology declares that identity policy. Never merge two source individuals
because their labels are equal.

An edit creates a new source revision and semantic snapshot. Unchanged anchored observations may be reused by content
identity, but old terms are not mutated. This is what makes replay and invalidation auditable.

## Four-valued evidence

Predicates use `TRUE`, `FALSE`, `UNKNOWN`, and `CONFLICT`. Missing evidence is `UNKNOWN`, not `FALSE`. Supported and
refuted evidence in the same admitted context is `CONFLICT`. Negation preserves uncertainty:

- `NOT UNKNOWN` is `UNKNOWN`;
- `NOT CONFLICT` is `CONFLICT`;
- `FALSE AND UNKNOWN` is `FALSE`;
- `TRUE AND UNKNOWN` is `UNKNOWN`.

Rule statuses are a separate layer. `NOT_APPLICABLE` is not predicate false, and `BLOCKED_ONTOLOGY` is not unknown.
The decision circuit maps evidence truth, applicability, execution state, and accepted exceptions to an explicit
status.

## Business example: retention

Suppose authority prose prohibits retaining personal data for more than five years unless a documented legal
obligation requires longer retention. Its observation vocabulary includes `Retain`, `PersonalData`, `Duration`,
`LegalObligation`, authority evidence, and policy scope. `RetentionAssessment` and `RetentionViolation` are derived.

The rule analysis must distinguish:

- ten years plus closed exception coverage and no obligation: `VIOLATED`;
- ten years plus an applicable documented obligation: `ACCEPTED_EXCEPTION`;
- five years or less: `SATISFIED`;
- ten years plus open exception coverage: `UNKNOWN`;
- incompatible admissible readings of authority or duration: `CONFLICT`.

“For audit” is a purpose observation. It is not silently cast to a legal obligation. This separation is the test for
whether authority analysis has preserved the rule instead of merely imitating its expected result.
