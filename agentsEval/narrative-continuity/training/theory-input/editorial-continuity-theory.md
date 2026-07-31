# Editorial Narrative Object Continuity Theory

## Purpose and status

This authority defines a narrow, mechanically testable rule for continuity of portable objects in an English prose
manuscript. It is intended for an executable research evaluation, not as a complete theory of narrative meaning. The
rule asks whether a character uses an object after leaving it somewhere else without a supported retrieval in between.
It deliberately separates what the manuscript says from what a circuit may conclude. The manuscript materializer may
record people, objects, places, events, mentions, temporal links, identity candidates, coverage statements, and exact
anchors. Only the continuity circuit may create an assessment or a finding.

The terms MUST, MUST NOT, MAY, and UNKNOWN are normative in this document. Examples and implementation notes explain
the rule but do not add premises. A Coding Agent may recognize many forms of leave, retrieval, and use while compiling
one manuscript into LongTextJS, yet recognition alone never proves a continuity error. The accepted circuit must
retain evidence and apply every condition below. The trained agent therefore contains reusable semantic vocabulary
and decisions, while each manuscript task contains its own source-grounded observation program.

## Normative rule NC-001

For each materialized use event, the evaluator MUST create exactly one continuity assessment. A use event is assessed
independently so that a document with several uses can produce several canonical circuit instances and several distinct
outcomes. The assessment status MUST be one of `VIOLATED`, `SATISFIED`, `NOT_APPLICABLE`, `UNKNOWN`, or `CONFLICT`.

A use event is `VIOLATED` only when all of the following are established in the admitted interpretation: the used
object has exactly one resolved identity; the same character previously left that same object; the leave event is
temporally before the use event; the relevant interval between that leave and use is closed for retrieval events; no
retrieval of that object by that character occurs temporally after the leave and before the use; and the leave location
differs from the use location. When these conditions hold, the evaluator MUST emit one `object-used-without-retrieval`
finding for that use. It MUST cite the exact leave anchor, the exact use anchor, and the exact source anchor that
justifies closed retrieval coverage. It MUST NOT cite a nearby paragraph merely because it is convenient.

If a retrieval of the same object by the same character is established after the leave and before the use, the use is
`SATISFIED` and MUST NOT produce an `object-used-without-retrieval` finding. A retrieval by another character is not a
retrieval by the assessed character unless the manuscript also materializes a supported transfer. A retrieval of a
different object, even one with a similar name, is irrelevant. A retrieval before the leave or after the use does not
repair the interval.

If no temporally prior leave of the resolved object by the using character is supported, the use is
`NOT_APPLICABLE`. This status is not evidence that the manuscript is globally consistent; it means NC-001 has no
qualifying leave premise for that use. If the leave and use occur at the same place, the use is also
`NOT_APPLICABLE`, because this narrow rule concerns an object left at a different location. Other editorial concerns
may still exist, but this evaluation does not invent them.

The assessment MUST remain `UNKNOWN` when a result-changing premise is unresolved. Unknown conditions include an open
or merely partial retrieval scope, absent support for temporal order, one use mention with zero identity candidates,
one use mention with more than one admissible identity candidate, or a relevant semantic gap. An empty search over an
open interval MUST NOT be treated as proof that no retrieval occurred. Confidence alone MUST NOT select one identity
candidate. Unknown is a completed semantic result, not a technical execution failure, and it MUST NOT be rendered as a
finding.

The assessment MUST be `CONFLICT` when the same interval has incompatible admitted coverage support, or when the
temporal relation both supports leave-before-use and use-before-leave. A conflict MUST NOT be resolved through source
order, last-write order, provider order, or arbitrary priority. No continuity finding may be emitted for a conflicted
use. The exact incompatible support should remain inspectable even when the compact user report shows only that review
is required.

## Identity policy

People, portable objects, places, and anchored events use explicit stable identities. Repeated spelling does not by
itself merge entities. A definite controlled phrase such as “the brass key” may resolve to the explicitly identified
brass-key entity when the materializer has an exact, source-grounded event sentence. A quoted or otherwise marked
ambiguous phrase remains a mention. The materializer MUST preserve each plausible candidate with an identity-candidate
value and MUST NOT manufacture a resolved event object merely to enable the circuit.

The circuit may treat a use as resolved only when its event already has an explicit object or when its linked mention
has exactly one admissible candidate. With two candidates, both remain available for review and the assessment is
`UNKNOWN`. The runtime currently does not aggregate full circuit results across interpretation contexts, so this
evaluation makes no claim of robustness across all possible readings. It tests preservation and conservative handling
of alternatives, not automatic world branching.

## Temporal policy

Narrative source order and event time are different notions. The LongTextJS author records typed direct-before
relations only when the prose, section sequence, or editorial scene ledger supports that order. The circuit MUST
compute transitive reachability over those relations. It MUST NOT assume that numeric source offset alone supplies all
temporal meaning. A leave in one section and a use in a later section therefore qualify only when the typed relation
path connects them. A flashback, retrospective summary, or parallel plot may appear later in the file while denoting
an earlier event, so the author must preserve that distinction rather than sorting all events by anchor.

An intervening retrieval exists only when both leave-before-retrieve and retrieve-before-use are established through
the temporal relation. This requirement prevents a late retrospective mention or an out-of-order scene from silently
repairing the continuity path. A relation cycle that proves both directions is conflicting support. Lack of a path is
unknown temporal order, not false temporal order, unless a closed temporal policy explicitly says otherwise; this
evaluation declares no such global closure.

## Coverage policy

Retrieval absence is final only for the exact interval associated with one use. A controlled completeness sentence may
declare that the account between a named leave and use is complete; the LongTextJS program then records closed
coverage for `Retrieve` in that interval and preserves the sentence as a coverage notice with an exact anchor. An
incomplete or omitted statement leaves coverage partial or unknown. The materializer MAY report a coverage gap, and
the circuit MUST carry the corresponding use as `UNKNOWN`.

Closure is local. Closed coverage for the brass key interval says nothing about the compass interval or the whole
manuscript. Two incompatible completeness statements for the same interval produce conflicting coverage. A circuit
must never enlarge a local coverage claim to a chapter, document, character, or object class that the source did not
name.

## Evidence and output policy

Every source-dependent assessment must retain the assessed use anchor. A violated assessment and its finding require
the leave, use, and closure anchors. A satisfied assessment should additionally retain the intervening retrieval
anchor. An unknown identity assessment retains the use anchor and mention anchor; an unknown coverage assessment
retains the use anchor and any partial-coverage notice. Exact evidence means half-open Unicode code-point spans over
the unchanged manuscript revision. Reconstructed snippets, regular-expression captures without source coordinates,
and physical store indexes are not evidence.

Findings are mechanically assured only relative to this authority, the reviewed Coding Agent materialization, the
accepted LongTextJS snapshot, the concrete circuit, and its validation assertions. They do not certify that the
fictional events are true outside the manuscript or that every possible paraphrase was represented. The compact CLI report may omit
non-finding assessments, so the executable validation MUST inspect typed outputs directly when checking UNKNOWN,
CONFLICT, dynamic instance counts, temporal closure, alternatives, and evidence identity.

## Task materialization contract

Every manuscript is a separate analysis task. The task Coding Agent receives only the selected trained-agent context,
the materialization profile, and the manuscript. It MUST create a dependency-free LongTextJS materializer that uses
the ontology constructors named by that context. It MUST NOT import another agent, edit the trained ontology, or place
an assessment in the observation layer. The materializer may use ordinary JavaScript helpers, but the returned values
must be typed terms, claims, mentions, identity candidates, alternatives, coverage declarations, or explicit gaps.

An event need not use a controlled sentence. “Mara left the key on the shelf and walked uphill” may support a `Leave`
event when the actor, object, location, and event scope are clear. “She found it in her coat” may support a retrieval
only when the actor and object references can be resolved without choosing between live alternatives. The Coding
Agent records the smallest exact source span that supports each explicit claim and separately records the typed
temporal links required by the manuscript structure. The circuit never parses prose and never receives a bag of
captured strings.

Pronouns are first-class mentions. When “she” can denote Mara or Nora, or “it” can denote the map case or cigarette
case, the LongTextJS program preserves candidate links and incompatible readings. A high-confidence candidate is not a
resolved entity. If a use has no unique actor or object, the circuit produces `UNKNOWN` and cites the pronoun anchors.
If later source evidence resolves one mention but not the other, the program may resolve them independently.

Coverage must come from an editorially meaningful boundary. A scene ledger that explicitly declares all narrated
movements for a named object between two events may close retrieval coverage for that interval. Reading every page is
not by itself closure, because an author can intentionally omit an off-stage movement. A ledger marked incomplete,
an ellipsis, an external appendix, or an unobserved time jump leaves the interval partial. The Coding Agent records the
exact ledger statement and does not generalize it to other objects or scenes.

Section boundaries do not terminate identity or time. An explicitly identified character and object may persist
across chapters, and typed temporal edges may connect scenes. Conversely, repeated labels such as “black umbrella” do
not prove identity when the prose distinguishes owners or leaves custody unresolved. This task contract is part of the
evaluation: a generated program fails review if it relies on regular-expression capture as the semantic authority,
uses source order as universal event time, fabricates closed coverage, or resolves a pronoun for the convenience of a
finding.

## Editorial workflow and review obligations

The editor provides the manuscript and any scene ledger as one frozen Markdown source. Codex compiles that source in
an isolated task folder and records unresolved representational limits as gaps. The deterministic host validates every
span, ontology role, identity reference, coverage scope, and source revision before executing NC-001. A second Coding
Agent reviews the task program independently, comparing its claims with the manuscript rather than trusting the first
agent's handoff.

Review MUST reject category errors even when the final count looks correct. Examples include modeling a
`ContinuityAssessment` as an observation, using a paragraph about rain as evidence for retrieval absence, merging two
silver cases by normalized label, or treating an incomplete scene ledger as closed. A review may repair task-local
LongTextJS, but it cannot change the trained circuit or authority. A genuine ontology limitation is reported for a
future training build and remains a blocker for the current task.

## Non-normative examples and falsification cases

Suppose Mara leaves a brass key in a boathouse, several scenes pass, and Mara uses the brass key in a hill tower. If a
source-grounded completeness notice closes the intervening retrieval interval and no retrieval appears, the expected
status is `VIOLATED`, with three exact anchors. Adding a supported retrieval between those events falsifies the finding
and changes the status to `SATISFIED`.

Suppose Ivo leaves a compass and later uses it, but the narrator explicitly says the intervening account is incomplete.
The absence of a retrieval match is not enough; the expected status is `UNKNOWN`. Closing a different interval does
not help. Suppose a quoted “silver case” may denote either a cigarette case or a map case. Choosing the more probable
candidate would violate the identity policy, so the expected status remains `UNKNOWN`.

The architectural hypothesis is falsified if any of these occur: one use creates duplicate dynamic instances; a
cross-section temporal path is missed; an open interval produces a finding; a retrieved object still produces a
finding; two identity candidates are collapsed; a finding lacks any of its three required anchors; a conflict is
reduced to source order; or a semantic unknown is reported as successful absence. Performance measurements are
observations on this manuscript and fixture set only, never complexity or throughput guarantees.
