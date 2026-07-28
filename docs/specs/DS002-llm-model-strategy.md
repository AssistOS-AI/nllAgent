---
id: DS002
title: LLM Model Strategy
status: accepted
owner: nllAgent maintainers
summary: Defines backend-neutral extraction and optional CNL realization roles, Achilles LLMAgent and Spark preference, Coding Agent fallback, capture, replay, and guarantee propagation.
---

# Introduction

Language models support semantic extraction, rubric-based judgment, benchmark critique, counterexample generation, and explanation wording. Their output is evidence or a bounded judgment, not an implicit source of rule authority.

# Core Content

## Optional realization and revision roles

Realization requests receive a circuit-produced CNL generation plan and return a schema-bound document candidate. Revision requests additionally receive one prior candidate and structured validation feedback. Both roles are optional and remain below the validation boundary: their text is proposed source, not a plan, finding, certificate, or release change. Idea-to-CNL planning belongs to CircuitJS and is not an LLM role.

## Gateway contract

All semantic runtime operations pass through one backend-neutral `TranslationGateway`. The primary implementation is backed by AchillesAgentLib `LLMAgent`; DS018 defines a Coding Agent translation adapter used when Achilles is not configured. The gateway accepts a task role, semantic model selection, prompt template identifier, output schema, and trace context. It returns parsed plain data plus a capture record containing backend, resolved model when applicable, tags, request and response digests, latency, and call metadata.

The Achilles and Coding Agent gateways build the same canonical semantic request before dispatch. The request digest includes the role, template, model tier, routing tags, prompt, output schema, and semantic context, but excludes backend routing details that do not change the requested meaning. Both backends record this digest and the response digest. Captures are stored in `model-captures.json`, outside the LongTextJS semantic object. A replay gateway indexes accepted captures by the same digest and refuses a request without an exact semantic capture.

Manual runtime overrides must take precedence over environment settings. Supported semantic tiers are `fast`, `standard`, `premium`, and `verifier-independent`. Provider-specific model names belong in runtime configuration, never in CircuitJS semantics. A release must record the profile identifier and digest used during its publication checks.

## Role separation

Extraction prompts must ask for neutral observations and alternatives, not the final rule verdict. Judgment prompts may receive an approved rubric and bounded evidence, but their outputs must remain `model-judgment` or `proposed`. Explanation prompts may only verbalize an `ExplanationEnvelope`; they must not inspect unrelated source text or add claims.

The model that synthesized a candidate circuit must not be the sole evaluator of that circuit. Automatic benchmark adjudication should use multiple perspectives, ordering changes, counterarguments, or a distinct model profile. Human policy decisions remain authoritative where the rule expresses organizational judgment.

## Structured output and replay

Model-assisted operators must request structured output, validate the complete response schema before use, and preserve the raw capture outside semantic hashes. Validation covers nested objects and arrays, required and additional properties, scalar types, enumerations, constants, item schemas, and declared size or numeric bounds. A replay mode must allow a run to consume a prior accepted capture without invoking a provider. A fresh inference against the same source and release is a distinct run because nondeterministic observations may differ.

When output validation fails, the scheduler may perform only the bounded retries declared by the release. Retry prompts, responses, and reasons must be recorded. Exhaustion must produce `operator-failed`, `stopped-budget`, or an issue; it must not silently substitute an unvalidated response.

## Guarantee propagation

A model-generated observation cannot carry `mechanically-certified` status. A deterministic comparison over that observation may certify the comparison procedure while the final finding remains bounded by the semantic premise. The final guarantee is the meet of all premise and verifier guarantees.

## Runtime translation versus learning orchestration

A Coding Agent runtime adapter is allowed under DS018 because it returns schema-bound observations or document candidates into a frozen theory. Each call runs with only its role-specific production skill and cannot edit the active release. Coding Agent learning remains a separate repository-editing process governed by DS013.

## Learning use

Coding Agent learning is separate from the runtime model gateway because it can inspect and edit a staged repository workspace. The selected adapter must run non-interactively, with an explicit working directory, bounded write capability, no interactive approval dependency, an ephemeral session where supported, and an explicit task naming the nllAgent learning skills. The learning runner must capture the adapter identity, events or stdout, diagnostics or stderr, exit status, and schema-bound final summary into the learning run directory.

# Decisions & Questions

### Question #1: Why avoid a default concrete model name?

Response: Concrete model availability and routing change independently of theory semantics. Semantic tiers keep releases portable while the captured resolved identity keeps each run auditable.

### Question #2: Can an LLM be a verifier?

Response: It may be an evaluator producing evidence, disagreement, or a bounded rubric judgment. It cannot confer a mechanical guarantee on its own output. Mechanical verification must reduce to independently checkable properties; otherwise the result retains model or human-review status.

### Question #3: When is a Coding Agent used during ordinary linting?

Response: It is used only through the DS018 schema-bound runtime adapter, normally when Achilles is not configured. Observation output is proposed LongTextJS data; optional realization output is an untrusted document candidate. The CNL plan itself is produced by the frozen CircuitJS theory.

### Question #4: How is AchillesAgentLib resolved without making deterministic agents depend on it?

Response: Programmatic injection has priority, followed by `ACHILLES_AGENT_LIB_PATH`, the sibling development checkout, and the installed package. `auto` checks whether the selected provider is configured, prefers Spark when exposed, and otherwise selects the configured Coding Agent adapter. No enable flag is required.

### Question #5: Why does replay identity omit the selected backend?

Response: Replay answers the same schema-bound semantic request without dispatching it again. Backend identity remains capture provenance, while including it in the request digest would make an Achilles capture unusable by the backend-neutral replay gateway even when every semantic input is identical.

### Question #6: What authority does a realization or revision model have?

Response: It may realize a circuit-produced CNL plan as a document candidate and use structured validation feedback for bounded revision. It cannot modify the plan, circuits, authority mapping, revision budget, or final status. Its output is untrusted source text until the validation pipeline completes.

# Conclusion

Models contribute interpretation and optional realization through captured, versioned, bounded interfaces. They do not own planning, authority, verification, release promotion, or guarantee inflation.
