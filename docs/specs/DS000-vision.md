---
id: DS000
title: System Vision and Boundaries
status: accepted
owner: nllAgent maintainers
summary: Defines the CNL audit and generation-specification modes, optional text realization, execution planes, user contracts, and epistemic boundaries.
---

# Introduction

NaturalLanguageLinterAgent is a framework for constructing persistent specialized agents that produce two CNL profiles under rules originally expressed in natural language. The repository, library, and CLI are called `nllAgent` where a short operational name is appropriate. Audit mode turns an existing long document into a verified `CNLAuditReport`. Specification mode turns a high-level idea into a verified `CNLGenerationPlan` for a future document. The system compiles authority texts, examples, reviewer evidence, and operational context into versioned executable releases; optional realization may turn the plan into text, which returns through audit mode.

# Core Content

## Two CNL production modes

The same published theory can inspect an existing document or specify a new one. Audit mode compiles a document through LongTextJS, executes validation circuits, verifies findings, and assembles them into `CNL/Audit-1`. Specification mode compiles an idea through LongTextJS, executes planning circuits, and emits `CNL/Plan-1`. The plan is a first-class output and does not require an LLM. A caller may optionally ask a bounded model role to realize it, after which the candidate enters the unchanged audit path. Any conformance claim comes from that audit, never from planning or realization itself.

## Specialized use cases

An editorial agent may validate style, focalization, dialogue exceptions, repetition, character knowledge, continuity, chronology, and contradiction. Given a synopsis or scene idea, its planning circuits may instead produce a CNL plan that fixes characters, setting, scene sequence, continuity-sensitive events, focalization, and realization guidance before prose is written. A normative agent may validate case evidence, obligations, deadlines, exceptions, authority, and record completeness against identified laws, regulations, contracts, or policies. Given an intent such as “prepare the notice for incident 17,” it may produce a CNL plan for the required sections, facts, deadlines, exceptions, evidence, and claims before any notice is drafted. Technical and scientific agents may do the same for specifications, procedures, manuals, protocols, and structured reports.

Each of these is a separate specialized agent with an explicit intended use, authority set, vocabulary, compatibility profile, benchmark, circuits, and guarantee limits. The framework must not advertise one universal agent that silently substitutes generic model knowledge for a missing domain package. Normative output establishes only the conformance supported by the selected release and evidence; it is not an unbounded claim of legal truth.

Every ordinary run also receives the versioned `foundation-core` overlay defined by DS021. It recognizes a deliberately small controlled-English set of state, type, temporal, exact-arithmetic, quantity, and literal-emotion assertions. Five circuits check only the published logical, strict-order, mathematical, elementary physical, and emotion/type invariants. This shared baseline avoids relearning elementary checks in every agent, but it is not a universal world model, psychological interpreter, or scientific reasoner. `--foundation off` selects an alternative-world run, and changing political, geographic, social, or economic facts require optional dated and sourced knowledge packs rather than timeless core axioms.

## Neuro-symbolic execution boundary

Neural models may interpret ambiguous source language, propose schema-bound observations, judge rubric-bound semantic candidates, and optionally realize or revise text from CNL. Persistent symbolic artifacts must retain anchors, identity, time, state, rule priority, alternatives, coverage, control flow, plans, witnesses, and verifier results. A model may not serve simultaneously as the source of a rule, the only observer, the planner, the final judge, and the verifier of its own conclusion.

A large context window is not a substitute for this structure. It does not by itself establish stable long-range identity, exhaustive coverage, rule-version selection, exception priority, or independent replay. The runtime must preserve distant dependencies in addressable observations and state, execute a frozen theory, and keep model-assisted premises below the corresponding guarantee ceiling.

## Product identity

The repository must provide both a reusable ESM library and a command-line application. The primary production interaction remains simple: the user selects an agent and supplies one Markdown input. `run` returns the Markdown view of a canonical CNL audit. `plan` returns the Markdown view of a canonical CNL specification. Optional realization additionally returns one Markdown candidate. The runtime persists both canonical JSON objects inside their transaction workspaces.

The canonical persistent kinds are `NaturalLanguageLinterProject`, `NaturalLanguageLinterRelease`, `NaturalLanguageLinterRun`, `NaturalLanguageLinterPlanningRun`, and `NaturalLanguageLinterBenchmarkCase`. An agent project is the durable workspace rooted at `data/<agent-name>/`. A release is an immutable, content-addressed set of schemas, extractors, circuits, policies, compatibility declarations, verifier references, and benchmark evidence. A run is a transactional application of one release to one immutable input snapshot. An issue is a persistent, typed description of a failure, incompatibility, disagreement, or learning opportunity.

## Plane separation

The system must maintain a hard architectural separation between the production plane and the learning plane.

The production plane may validate an existing document or compile an idea into CNL and, when explicitly requested, realize and validate a candidate. Semantic extraction, realization, and revision may use configured AchillesAgentLib or the role-specific Coding Agent adapter defined by DS018. Planning itself is CircuitJS execution and may be deterministic. No route may change circuit definitions, alter benchmark expectations, modify the active release, load learning skills, or reinterpret input content as an authority source.

The learning plane may invoke a configured Coding Agent with explicit learning skills, read the selected rule and example folders, inspect agent benchmark cases and issue artifacts, produce candidate schemas and circuits, add regression cases, and build a candidate package. It must stop at the candidate boundary. Only a maintainer may invoke the separate manual publication command, which reruns trusted checks, creates the immutable release, and updates the active pointer.

`Coding Agent` is an architectural role, not a product name. It means a tool-using agent that can inspect and edit a staged repository workspace under a declared process, filesystem, skill, and output contract. OpenAI Codex is the current reference adapter and a concrete example; other coding agents may implement the same boundary without changing LongTextJS, CircuitJS, benchmark, publication, or release semantics.

## Epistemic discipline

LongTextJS must represent the source world, including text, structure, anchors, observations, identities, alternatives, status, scopes, coverage, capabilities, gaps, and the requested task. CircuitJS must represent the theory of judgment, including typed ports, applicability, transformations, state, search, external operators, verification, explanation, and emission.

An observation must not be presented as a judgment. A candidate must not be presented as a verified finding. A local content digest identifies bytes and cache entries but says nothing about semantic correctness. A model judgment must not be upgraded to a mechanical guarantee merely because deterministic code consumes it later.

The runtime must support at least these terminal outcomes: `reported`, `reported-with-limits`, `stopped-incompatible`, `stopped-incomplete`, `stopped-budget`, `review-required-conflict`, and `runtime-fault`. Missing evidence must not be converted into compliance or non-compliance without the declared closed-world coverage needed for that conclusion.

## Ethical commitments

The system's ethical commitments follow from its operational boundaries. Source text must remain distinguishable from interpretation. Claims must remain bounded by the property actually verified and by the weakest material premise. Reviewers must be able to contest anchors, observations, identity, scope, coverage, authority, rules, witnesses, and rendering independently. Abstention and stopped states are valid outcomes, not failures to be hidden. A new release must not rewrite historical results, and disputed policies may remain separate lineages instead of being collapsed into an apparent consensus.

People and organizations remain responsible for intended use, legitimate authority, consequential decisions, privacy, and access. A fluent explanation, a model consensus, or a mechanically replayed downstream calculation must not disguise an uncertain or policy-dependent premise. Learning and production must use least privilege and retain only the source and model artifacts permitted by project policy. Scientific references in tutorial documentation explain design lineage; they do not substitute for implementation, benchmark, publication checks, or run evidence.

## Complete capability surface

The architecture must accommodate deterministic lexical rules, structural checks, semantic model-assisted observations, long-range identity, temporal reasoning, state continuity, recursive derivation, defeasible rules, normative obligations and exceptions, argument graphs, alternative worlds, bounded search, external solvers, counterfactual remediation, multilingual aligned observations, and multimodal adapters. Each capability must enter through a versioned schema, operator contract, verifier contract, benchmark evidence, and compatibility declaration.

The framework must distinguish implemented operators from declared extension points. Unsupported domain semantics must result in a gap or issue rather than a fabricated result.

## Operational guarantees

Every reported finding must retain the agent, release, circuit, rule, source revision, main anchor, support anchors, premises, witness, verifier result, guarantee level, severity, remediation, and limitations required by its finding contract. Every `CNLAuditReport` must state release and effective coverage. Every `CNLGenerationPlan` must bind the complete source idea and map each applied rule to concrete locations in the plan. Every run must be reproducible from captured deterministic artifacts; a new model inference is a new run unless captured model output is replayed.

# Decisions & Questions

### Question #1: Why is the public interface file-oriented rather than service-first?

Response: The required product interaction is a local CLI over Markdown. A file-oriented contract is portable, scriptable, easy to audit, and does not prevent a later HTTP adapter. The library API remains the internal reusable boundary.

### Question #2: Does “complete system” mean every research problem is solved universally?

Response: No. It means the architecture, lifecycle, extension contracts, failure states, and implemented generic machinery cover the complete described system. Domain extractors and solvers remain separately evaluated modules. The runtime must expose unsupported areas honestly rather than claim universal natural-language understanding.

### Question #3: Can production improve itself automatically?

Response: Production may create issues and learning needs automatically. Only the isolated learning workflow may propose changes. Publication is a separate manual maintainer action and is never a continuation of the production or learning command. This preserves release identity and prevents input text from rewriting its judge.

### Question #4: Why may production use a Coding Agent without collapsing the two planes?

Response: Each model-assisted production call receives one schema and one narrow role skill: `nll-translate-longtext` for observation or evaluation work, or `nll-realize-cnl` for optional realization and revision. Planning circuits require neither skill when their LongTextJS inputs are deterministic. A runtime skill cannot edit the active theory. The learning adapter receives a staged authoring workspace and different skills.

### Question #5: Is nllAgent only a validator?

Response: No. A published release may compile a high-level idea into a CNL generation plan through LongTextJS and planning circuits. The plan is the primary authoring artifact. A model may optionally realize or revise a document from it; that document is then compiled through LongTextJS and judged by the same frozen validation circuits. Planning never bypasses validation or promotes model output to compliance by assertion.

### Question #6: Why not put the document, rules, and request into one long-context LLM call?

Response: A single call can produce a useful proposal, but it does not freeze rule identity, demonstrate exhaustive evidence coverage, preserve long-range state as an addressable artifact, or provide an independent verifier. It also correlates interpretation, judgment, and explanation errors inside one model execution. nllAgent uses neural models where language interpretation and realization are needed, while LongTextJS, CircuitJS, registered operators, release identity, and verifier replay preserve the parts that must remain stable and contestable.

### Question #7: Do scientific references prove that nllAgent is correct?

Response: No. Standards and research papers explain the origin and expected value of mechanisms such as provenance, constrained decoding, truth maintenance, argumentation, synthesis, and producer-verifier separation. The repository may claim an implemented capability only when code, tests, applicable release evidence, and run artifacts support it. Introductory sources such as Wikipedia are orientation material, not normative authority.

### Question #8: Which product name is canonical?

Response: `NaturalLanguageLinterAgent` is the full product name and `nllAgent` is the short repository, library, CLI, and operational name. Persistent kinds use the `NaturalLanguageLinter…` prefix. The MVP starts with one real published baseline, `0.1.0`; documentation and fixtures must not invent predecessor releases merely to imply history.

### Question #9: Why is a foundation pack compatible with specialized agents?

Response: It contributes versioned platform invariants and observations before the agent release runs; it does not supply missing domain authority or current facts. The run records both identities, and a caller can select `off` for a different world model.

# Conclusion

nllAgent is a release-driven producer of verified CNL audits and generation specifications, with optional text realization. Its defining property is not that it always returns a verdict or fluent draft, but that every audit observation and every plan instruction has an inspectable basis and every unsupported case becomes a precise learning artifact.
