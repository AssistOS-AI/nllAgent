# Privacy Retention Evaluation Authority

## Purpose and controlled scope

This document is the sole policy authority for the privacy-retention evaluation. It is intentionally self-contained and
uses a fictional organization, Northstar Services, so that the experiment tests semantic execution rather than current
law. No sentence in this document should be read as legal advice or as a claim about a real jurisdiction. The policy
governs written retention declarations for personal-data categories in the Northstar policy register. A declaration is
in scope when it identifies a record, a personal-data category, a retention duration measured in whole years, and a
named assessment scope. Descriptive background, operational aspirations, and examples are not independent authority
unless a normative paragraph below says that they are.

The evaluation treats the register as evidence about what the document states, not as proof of what Northstar actually
does. Exact source text matters. Each relevant declaration, exception statement, and coverage statement must remain
linked to its own source span. A circuit may compare, classify, and report those observations, but it may not silently
invent a missing duration, exception, authority, scope, or closure statement. The terms “must,” “may,” “documented,”
“closed,” “open,” “unknown,” and “conflict” have the controlled meanings defined here.

## Normative retention rule

### RET-001 — Maximum duration

Northstar MUST NOT declare retention of an in-scope personal-data category for more than five years. A duration of
exactly five years satisfies the maximum-duration rule. A duration below five years also satisfies it. A duration above
five years violates the rule unless RET-002 supplies an accepted exception. The comparison uses the explicit whole-year
number attached to the same record identity. Numbers attached to a different record or assessment scope are not
substitutable evidence.

When two explicit duration declarations for the same record and scope give different numbers, the assessment is
CONFLICT. The evaluator must not select the lower number, the higher number, the later line, or a preferred reading.
When the duration is absent, malformed, or not representable by the active ontology, the assessment is UNKNOWN or
BLOCKED_ONTOLOGY as appropriate; it is never presumed compliant. A descriptive phrase such as “for the foreseeable
future” is not a whole-year duration and does not authorize the evaluator to choose a number.

### RET-002 — Documented legal-obligation exception

A declaration above five years MAY be accepted only when the same record has explicit evidence of a documented legal
obligation that requires the longer period. The exception evidence must identify the retention record, state that its
status is documented, name the legal authority, and state an end date or review date. All of these elements must be
grounded in the input document. A general reference to compliance, a business preference, anticipated litigation, an
undocumented instruction, or a legal obligation attached to another record does not satisfy this exception.

An explicit “undocumented” exception statement is evidence that the documented-exception premise is false for that
statement. If the same record contains both a documented and an undocumented exception statement and the source offers
no priority rule that reconciles them, the exception premise is CONFLICT. The evaluator must surface that conflict
rather than choose one statement. If a documented exception exists and there is no incompatible statement, the result
for an above-limit duration is ACCEPTED_EXCEPTION. Acceptance means only that this policy's exception conditions were
represented; it does not certify the external validity of the cited authority.

### RET-003 — Coverage and absence

The absence of an exception may be treated as final only within an explicitly closed exception-evidence scope. A
coverage statement with state “closed” asserts that the named assessment scope was exhaustively inspected for exception
evidence relevant to its retention record set. In that closed scope, no matching exception evidence is sufficient to
treat the exception premise as false. A coverage statement with state “open” or “partial” does not support that negative
conclusion. If an above-limit declaration has no exception evidence and exception coverage is open, partial, or missing,
the assessment is UNKNOWN rather than VIOLATED.

Coverage is scoped. Closure for one assessment scope does not close another scope, even if their names are similar.
A closure statement is not a claim that every fact in the world is known; it closes only the document's bounded set of
exception-evidence statements for the named scope. Conflicting coverage statements for the same scope prevent a final
absence conclusion and therefore produce UNKNOWN unless another explicit premise independently decides the exception.

### RET-004 — Evidence and reporting

Every emitted assessment MUST cite the exact source anchor for the duration declaration that activated the rule. An
accepted exception must additionally cite the exception statement. A violation based on absent exception evidence must
additionally cite the closed-coverage statement. An unknown result caused by open coverage must cite the open-coverage
statement. A conflict result must cite every incompatible duration or exception statement that materially caused the
conflict. Reports may summarize these spans, but the executable terms and trace remain authoritative for replay.

The permitted statuses are SATISFIED, VIOLATED, ACCEPTED_EXCEPTION, UNKNOWN, CONFLICT, NOT_APPLICABLE,
BLOCKED_ONTOLOGY, BLOCKED_CAPABILITY, BLOCKED_RESOURCE, and ERROR_EXECUTION. For the deterministic declarations used in
this evaluation, a well-typed in-scope record should normally reach one of the first five. NOT_APPLICABLE is reserved
for a declaration explicitly identified as outside the personal-data scope. Operational blockers must not be disguised
as an empty successful result.

## Interpretation rules

Record identity is explicit. Two declarations share a record only when their controlled record identifiers are equal.
Similar data-category names do not merge records. Scope identity is also explicit; a scope label is not inferred from
nearby prose. The same category may appear in several records because different purposes or systems may impose distinct
retention declarations. The evaluation may deduplicate immutable category values, but it must preserve source record
identity and every relevant anchor.

The authority distinguishes observation from judgment. Input materialization may state that a retention declaration,
exception-evidence statement, or coverage statement appears at a span. It may also record a gap when a controlled line
cannot be represented. It must not materialize a RetentionViolation, RetentionSatisfied, or other expected conclusion.
Only the circuit applies RET-001 through RET-004. Likewise, the ontology defines the vocabulary and local type rules;
it does not decide whether an exception is valid in context.

An explicit exception statement and a coverage declaration may coexist. Presence is evaluated before absence. Closed
coverage does not erase an exception that is present, and open coverage does not weaken a fully documented exception
that is explicit. For a duration at or below five years, RET-001 is satisfied without needing an exception search;
nevertheless, incompatible duration declarations still yield conflict because the comparison premise itself is not
stable.

## Calibration examples

A record retaining customer profile data for five years satisfies RET-001. A record retaining support transcripts for
seven years, with closed exception coverage and no exception statement, violates RET-001. A record retaining tax
invoices for eight years may receive ACCEPTED_EXCEPTION when a documented tax-records obligation, authority name, and
review date are explicitly tied to that record. The same eight-year record remains UNKNOWN if it has no exception and
its exception scope is open.

A nine-year record with both “documented” and “undocumented” statements for the same exception premise is CONFLICT.
Two duration statements of three and seven years for one record are also CONFLICT. These are not confidence contests;
all explicit incompatible support is preserved. A directive with an unrecognized personal-data category illustrates an
ontology or materialization gap and must not be assigned a compliant result merely because no typed retention term was
created.

The examples are explanatory fixtures for the normative paragraphs, not additional permission to broaden the parser.
The evaluation's deterministic controlled lines are a bounded interface. Prose outside that interface remains source
context and is not automatically converted into policy facts. This limitation is deliberate: it allows exact replay of
the tested semantic distinctions without claiming unrestricted natural-language understanding.

## Assurance boundary

Concrete circuit execution is the operational authority for emitted findings. Abstract preflight may establish that a
range of durations can lead to several possible statuses, but it does not emit the final finding. Symbolic and concolic
checks may generate the five-year boundary and replay a witness, but witnessed assurance is earned only after concrete
replay. A local proof certificate may establish a small implication used by the decision policy; it does not prove that
the source is truthful or that the fictional legal obligation is externally valid.

This experiment requires deterministic offline execution with Node.js and repository modules only. It requires no
network, credentials, external package, model, or hidden database. Measurements in the experiment report are
observations from the recorded machine and runs, not performance guarantees. Known runtime gaps, including incomplete
interpretation-context aggregation, generalized mutation generation, and hardened untrusted-module isolation, must be
reported at the claim site rather than concealed.

## Cross-section and review-cycle requirements

The register may spread one record across several sections. A duration declaration in a schedule and an exception
statement in an appendix may be joined only through the same explicit record identifier. Likewise, a coverage line in
a review log applies through its exact scope identifier, not through document proximity. Section boundaries neither
break valid explicit identity nor create identity where none was stated. This requirement is deliberately long-range:
an implementation that reads one paragraph at a time without reconciling controlled identities is incomplete.

A newer paragraph does not supersede an older controlled declaration merely because it appears later. Supersession
must itself be explicit authority or an observed withdrawal statement admitted by the ontology. This evaluation does
not define withdrawal syntax, so two incompatible active declarations remain a conflict. The circuit must not use
source order as an undocumented priority rule. Similarly, a review date in documented exception evidence proves only
that the controlled documentary slot is present. It is not a duration, deletion deadline, or automatic precedence
marker.

An exception linked to a record in another scope can be positive evidence for that record only when the retention
declaration uses the same stable record identity and the assessment explicitly permits that cross-section join. A
coverage line still closes only its named scope. This means positive exception evidence may be found away from the
retention line while negative exception evidence remains locally bounded by coverage. The different treatment is
intentional: presence can be demonstrated by one admitted observation; absence requires a completed search boundary.

## Review independence and mutation expectations

Training validation must include an independent semantic oracle for every main status. The reviewer compares the
authority, RuleAnalysis, ontology, plan, profile, circuits, test LongTextJS, expected outputs, and actual trace. A green
exit code is insufficient when evidence is missing or the status arose from the wrong record. The reviewer must reject
an expected output that was weakened solely to match an implementation defect.

At minimum, mutation evidence must demonstrate rejection of three credible defects: treating five years as a
violation, ignoring a documented exception, and treating open exception coverage as closed. Additional useful mutants
include merging record identifiers, taking the first conflicting duration, discarding an undocumented statement, or
using closure from a neighboring scope. The experiment may implement the first three as direct, bounded mutation
probes; it must state that this is not a general source-to-source mutation engine.

## Operational reproducibility

The trained theory and every task analysis are separate immutable artifacts. Training may change ontology, circuits,
profile, tests, and benchmarks inside a candidate build. Analysis may create only a task-local LongTextJS program and
reports pinned to the selected build. The deterministic execution phase must not invoke a coding agent, edit theory,
or discover an unpinned provider. A second run with the same accepted LongTextJS, ontology, circuit, SDK version, and
source revision should reproduce the same semantic outputs and trace ordering.

Performance reports separate authoring or materialization time from deterministic semantic execution. Coding-agent
latency is expected to dominate and is not conflated with circuit cost. The evaluation records document size, number
of accepted terms and gaps, finding count, trace event count, and deterministic elapsed time. These measurements are
diagnostic observations on the current machine, not service guarantees or evidence that unrestricted prose can be
processed at the same rate.
