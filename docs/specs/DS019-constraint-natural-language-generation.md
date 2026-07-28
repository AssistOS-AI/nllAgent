---
id: DS019
title: CNL Generation Specifications and Optional Text Realization
status: implemented
owner: nllAgent maintainers
summary: Defines CNL/Plan-1, idea-to-specification circuits, rule-to-plan verification, optional realization, audit reuse, CLI behavior, provenance, and publication checks.
---

# Introduction

NaturalLanguageLinterAgent has two complementary CNL production modes. Audit mode compiles an existing document into `CNLAuditReport` as defined by DS011. Specification mode compiles a high-level idea into a precise `CNLGenerationPlan` for creating a new document. The second mode does not begin by asking a model to draft freely. It first produces an intermediate CNL artifact under the published release:

```text
high-level idea -> LongTextJS -> CircuitJS planning -> CNL generation plan
                                                        |
                                                        +-> optional LLM realization -> ordinary validation
```

The CNL generation plan is the primary output. A caller can inspect it, edit its input and re-plan, archive it, or pass it to any compatible language model later. nllAgent may also perform that last realization step, but realization is optional and never defines what CNL means.

Despite the historical expansion “Constraint Natural Language,” CNL is not a natural-language list of the rulebook constraints. Rules, exceptions, authority, verification algorithms, and priorities remain in CircuitJS and its release package. CNL is constrained because a planning circuit produced it under those rules. Its content is an idea-specific specification of the document to be written: document design, ordered content steps, required concrete content, dependencies, and realization guidance.

# Core Content

## Two production paths

Validation starts with a document that already exists:

```text
document -> LongTextJS observations -> validation circuits -> CNLAuditReport
```

Planning starts with an idea that does not yet have a final document:

```text
idea -> LongTextJS observations -> planning circuits -> CNLGenerationPlan
```

The paths share source ingestion, observations, schemas, authority mappings, registered operators, compatibility, coverage, provenance, publication checks, and rule identities. Their outputs differ. Validation findings are assembled into a CNL audit about a fixed source. A planning circuit emits a verified CNL specification derived from the source idea.

If final realization is requested, the path continues:

```text
CNLGenerationPlan -> LLM realization -> Markdown candidate
Markdown candidate -> LongTextJS -> unchanged validation circuits -> findings
```

Validation remains the final oracle. A valid CNL plan proves that the intended document was planned through the published theory, not that any model realization is automatically conformant.

## CNL/Plan-1 artifact

The canonical artifact is `CNLGenerationPlan` schema version 1. It contains:

- `sourceIdea`: the complete idea reconstructed from its LongTextJS observations;
- `document`: the intended type, language, audience, purpose, and optional design fields;
- `contentPlan`: an ordered list of idea-specific steps, each with a stable identifier, a natural-language instruction, optional required content, and optional dependencies;
- `realizationGuidance`: natural instructions for carrying out the whole plan;
- `provenance`: the release, planning circuit, LongTextJS source observations, applied rule identities, and authority references;
- `verification.ruleApplications`: a witness mapping every applied rule to one or more concrete `contentPlan:<id>`, `realizationGuidance:<n>`, or `document:<field>` locations;
- `limitations`: compatibility or release limits that must remain visible.

The object deliberately has no `CNLConstraint`, modality, priority, or embedded copy of the rulebook. Rule identifiers appear in provenance and in the verification witness, whose locations prove coverage but do not redefine rule semantics. This keeps one authority for rules and prevents CNL from becoming a second rule DSL that can drift from CircuitJS.

The rendered `plan.cnl.md` is a deterministic human- and model-readable view of the canonical JSON. It contains the source idea, document design, ordered content sequence, realization guidance, and provenance. It states explicitly that it is an intermediate specification rather than a final document or compliance certificate.

## What planning circuits do

A `purpose: planning` CircuitJS program consumes typed LongTextJS observations of the idea and emits one `plan` output. The path to `emit` must pass through the trusted `planning.cnl-plan@1` verifier. The current runtime permits exactly one primary planning circuit per release so plan ownership and ordering remain unambiguous.

Planning circuits perform the generative counterpart of rule application. They can:

- select the appropriate document type and structure for the idea;
- turn facts, requested events, actors, sections, claims, or obligations into ordered plan steps;
- add dependencies between sections or events;
- choose content needed to avoid contradictions or satisfy legal and stylistic requirements;
- carry rule-sensitive realization guidance without copying the rule implementation;
- record exactly which released rules and authority sources shaped the plan.

The standard planning operator reconstructs the source idea only from the observations supplied through its input port, interpolates approved idea fields into the circuit-authored plan template, validates the complete CNL structure, and emits a candidate. The verifier independently checks the source digest, observation identities, exact reconstructed idea, plan structure, authority provenance, and rule-to-plan coverage. Unknown locations, unknown rules, or an applied rule without a location reject the candidate before `emit`.

Future domain operators may build more dynamic plans from semantic observations. For example, a legal planning circuit may derive sections for jurisdiction, applicable duties, exceptions, evidence, deadlines, and conclusion. Those operators remain registered and versioned CircuitJS capabilities; they do not move rule translation into CNL.

## Reuse and separation of circuit knowledge

Most expensive knowledge should be reused. A rule should keep one stable identity and authority mapping. Observation schemas, terminology, compatibility policies, calendars, units, deterministic operators, and validation verifiers are shared between both paths.

The validation graph itself should normally stay separate from the planning graph because the algorithms have different directions:

- validation asks whether an existing source supplies a violating witness;
- planning asks what ordered document design should be produced from an idea so the eventual realization has the required structure and avoids known failure modes.

A release therefore lists validation `circuits` and optional `planningCircuits`. It does not embed generation metadata in validation circuits, and there are no `separate`, `embedded`, or `hybrid` runtime modes. A coding agent may derive both circuit families from the same rule cards and benchmark evidence during learning, but manual publication compiles and tests each declared graph explicitly.

This separation prevents validation from acquiring model effects or content-search behavior. It also permits specialized planning without duplicating the validation oracle. If a domain has a genuinely bidirectional primitive, both circuit families may call the same registered operator under separate typed nodes.

## Concrete literary example

Input idea:

```markdown
Write two English narrative paragraphs about Alice returning to an empty railway
station at dusk. End with a station employee saying that the final train departed.
```

LongTextJS preserves the exact lines and source digest. The editorial planning circuit applies ED-001 and ED-002 and emits a CNL plan with this shape:

```text
Document: short English literary scene for adult readers

1. establish-scene
   Establish Alice, the empty station, dusk, and the restrained atmosphere.
2. develop-action
   Develop the central action through concrete perception and movement.
3. close-scene
   End with the employee's dialogue line about the final train.

Realization guidance:
- preserve every explicit fact from the idea;
- avoid “in fact” in narrative paragraphs;
- use “perhaps” no more than twice in one narrative paragraph;
- treat dash-prefixed paragraphs as dialogue for these rules.

Plan verification:
- ED-001 -> realizationGuidance:3, realizationGuidance:5
- ED-002 -> realizationGuidance:4, realizationGuidance:5
```

This is not ED-001 and ED-002 rewritten as CNL constraints. It is a plan for this scene, with the applicable consequences of those rules incorporated in the realization guidance. Another idea produces another plan while the circuits and rules stay fixed.

## Concrete normative example

Suppose a published release represents the approved law and organizational procedure for incident notices. The input idea is “prepare the authority notification for incident 17.” LongTextJS materializes the requested incident, intended audience, known dates, jurisdiction, and available evidence. A planning circuit can produce:

```text
Document: formal incident notification to the competent authority

1. identify-case
   State the controller, incident identifier, jurisdiction, and confirmation time.
2. describe-material-facts
   Describe scope, affected systems, and verified impact without unsupported claims.
3. establish-timing
   Present the applicable deadline and any applicable outage interval.
4. enumerate-actions
   List containment, recovery, notification, and evidence-preservation actions.
5. close-with-evidence
   Identify attached records and explicitly mark evidence that is unavailable.
```

The law is not copied into CNL. CircuitJS used the compiled legal theory to decide what this document must contain and in what order, and the plan witness identifies the sections or guidance shaped by each applicable legal rule. Optional realization can draft the notice, after which the normal normative validation circuits produce a CNL audit of identities, dates, exception scope, completeness, and unsupported conclusions.

## CLI and terminal states

The primary command is:

```text
nllagent plan --agent <name> --input <idea.md> --output <plan.cnl.md>
  [--release <version>] [--translator auto|achilles|codex|none]
```

Plan-only execution does not require an LLM when the planning circuit consumes deterministic LongTextJS observations. `planned` and `planned-with-limits` exit 0. Missing critical compatibility exits 3, incomplete required coverage exits 4, exhausted budgets exit 5, and unresolved certified conflict exits 6.

Optional final realization is enabled explicitly:

```text
nllagent plan --agent <name> --input <idea.md> --output <plan.cnl.md>
  --realize-output <draft.md> [--max-revisions <0..10>]
  [--translator auto|achilles|codex]
```

`--max-revisions` is invalid without `--realize-output`. A successful realization exits 0 as `realized` or `realized-with-limits`. Exhausting the repair budget with findings produces `realization-with-findings` and exits 2. Validation stopped states retain exits 3–6. A disabled or unavailable backend affects only optional realization; it does not prevent plan creation.

## Optional realization and repair

The realization backend receives the entire rendered CNL plan and the schema `{ document: string }` under task role `realization`. The reference Coding Agent adapter exposes only `nll-realize-cnl`. That skill follows the plan, returns complete Markdown, cannot edit the release, and cannot declare conformity.

The returned document is untrusted input. nllAgent runs the ordinary release validation over it. If findings remain and the revision budget permits, task role `revision` receives the same CNL plan, the previous document, and structured findings. The skill is instructed to preserve unaffected content and make the smallest supported repair. The final status comes only from validation.

An external system may skip this facility and send `plan.cnl.md` to another LLM or human writer. The CNL plan remains useful and complete without an in-process realization.

## Artifacts and provenance

Each transaction creates `planning-runs/<id>/planning.json` and stores:

- `idea.md` and `idea.longtext.json`;
- `cnl-plan.json` and `plan.cnl.md`;
- `planning-compatibility.json`, `planning-trace.json`, and any `planning-model-captures.json` produced while materializing semantic idea observations;
- release, circuit, source, runtime, plan digest, status, and issue identifiers.

Optional realization adds `realization/model-captures.json`, `realization/document.md`, and one `realization/attempts/attempt-NN/` directory per candidate. Each attempt contains the candidate plus a complete ordinary validation artifact set. The externally requested files are delivery copies; the planning-run directory is the durable lineage.

## Publication checks and tests

Manual publication compiles every `planningCircuits` entry with the restricted loader, type checks its LongTextJS ports, checks verification dominance, requires the `planning.cnl-plan@1` construction path, validates all claimed rule identities against the authority map, checks producer alignment, and freezes the graph in the immutable release.

Current acceptance tests prove:

- CNL has document design, ordered content, dependencies, guidance, and provenance but no constraint ledger;
- an idea is reconstructed from LongTextJS observations and appears concretely in the plan;
- each applied rule is backed by an existing concrete plan location, and unknown locations are rejected;
- a planning circuit emits exactly one verified plan;
- plan-only execution works with `--translator none` and makes no realization call;
- optional realization and revision use role-specific model calls;
- each realized candidate is revalidated by unchanged validation circuits;
- finding exhaustion, incompatible output, missing backend, artifacts, and CLI exit codes remain explicit.

The publication command currently checks plan structure, provenance, linking, deterministic behavior, and the ordinary validation benchmark. It does not claim that a model will realize every published plan well. A future planning benchmark should use idea-to-CNL expected layers and separate optional realization quality tests.

# Decisions & Questions

### Question #1: Is CNL a natural-language syntax for expressing the rulebook constraints?

Response: No. Rulebooks are compiled into CircuitJS through the learning workflow. CNL is generated after those circuits are applied to one concrete idea. It specifies the intended document, content sequence, and realization guidance. Reintroducing rules as `CNLConstraint` objects would duplicate authority and recreate the misunderstanding this specification removes.

### Question #2: Why retain the name Constraint Natural Language?

Response: The artifact is natural language constrained by a released schema and planning theory. “Constraint” describes how the plan was produced, not a requirement that each line encode a logical constraint. The canonical kind `CNLGenerationPlan` makes the runtime meaning explicit.

### Question #3: Can validation circuits be reused for planning?

Response: Their rule identities, observations, authority, operators, and verifiers should be reused, but the graph direction normally differs. Validation detects witnesses in fixed text; planning constructs an ordered document specification from an idea. Separate `planningCircuits` preserve both purposes without duplicating the underlying theory.

### Question #4: Why is final text realization optional?

Response: The valuable deterministic boundary is the CNL plan. It can be reviewed, stored, compared, or realized by different models and humans. Making model drafting mandatory would hide that artifact and prevent useful plan-only workflows.

### Question #5: What does the CNL verifier certify?

Response: It certifies the plan schema, source digest, LongTextJS observation provenance, exact source-idea reconstruction, document design, ordered steps, realization guidance, released rule provenance, and complete rule-to-plan location coverage. It does not certify the quality or conformance of a later document.

### Question #6: May the optional realization omit final validation?

Response: No when nllAgent performs realization. Every candidate is re-ingested and evaluated by the release's validation circuits. An external consumer may use the plan without reporting back, but nllAgent makes no conformance claim about that external output.

### Question #7: How are audit and specification complementary?

Response: Specification mode uses the theory prospectively to produce a plan designed around its rules. Audit mode uses the theory retrospectively to state what an existing document satisfies, violates, or leaves unverifiable. The plan verifier first checks that the theory is represented in the plan through rule-to-location witnesses; after realization, the ordinary audit verifies the actual text. Passing the first gate reduces avoidable errors but never replaces the second.

# Conclusion

`CNL/Plan-1` is the bridge from a high-level idea to controlled document creation. LongTextJS gives the idea a grounded, addressable representation. Planning circuits apply compiled domain knowledge and produce an idea-specific specification with verified rule coverage. A model may then realize that plan, but the plan remains the primary artifact and `CNL/Audit-1` remains the final account of the realized source. Rules stay in CircuitJS; the two CNL profiles say what to build and what was established.
