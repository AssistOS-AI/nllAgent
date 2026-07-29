---
id: DS018
title: Schema-bound Runtime Backends: Achilles LLMAgent and Coding Agents
status: implemented
owner: nllAgent maintainers
summary: Defines interchangeable extraction and optional CNL realization roles, Achilles Spark preference, role-specific Coding Agent skills, schemas, captures, budgets, and failure behavior.
---

# Introduction

The production CLI must support semantic extraction and optional CNL plan realization in two common local configurations. In the first, the sibling AchillesAgentLib package is configured and its `LLMAgent` serves schema-bound roles. In the second, AchillesAgentLib is absent or unconfigured while a compatible Coding Agent is available. The Coding Agent receives one narrow role-specific skill and the same structured request, response, capture, and budget contracts. Idea-to-CNL planning is not delegated to this backend; CircuitJS produces the plan.

This specification separates the semantic translation boundary from both orchestration and theory execution. LongTextJS extraction profiles ask for observations. A selected backend satisfies those requests. CircuitJS consumes the resulting observations without knowing whether `LLMAgent` or a Coding Agent produced them. Compatibility, coverage, witness verification, reporting, caching, and issue creation remain common.

The deterministic foundation materializer runs as a separate compiler stage and requires no translation backend. Model-assisted translation begins only for richer observation types demanded by the selected release; it neither replaces nor silently expands the foundation ontology.

# Core Content

## Role-specific runtime skills

The backend dispatch contract is shared, but a Coding Agent call receives exactly one skill. Extraction, evaluation, testing, and judgment use `nll-translate-longtext`. Optional realization and revision use `nll-realize-cnl`. Call-local `AGENTS.md` and skill links enforce this selection; production never exposes both roles inside one call workspace.

## Backend-neutral boundary

Runtime operators depend on a `TranslationGateway`, not on a concrete provider. The gateway contract is:

```text
invoke({
  prompt,
  taskRole,
  templateId,
  responseShape,
  outputSchema,
  model?,
  tier?,
  tags?
}) -> {
  result: plain JSON data,
  capture: TranslationCapture
}
```

`result` is validated against the complete caller-specific JSON Schema and semantic checks. Achilles, Coding Agent adapters, and replay construct the request digest through one canonical request function over prompt, role, template, response shape, schema, requested model or tier, tags, and semantic context. `capture` records the selected backend and adapter, request and response digests, task role, template, resolved model when applicable, tags, elapsed time, and the backend-owned call location when applicable. Captures provide reproducibility and diagnostics; they are not proof that the observation is true.

The standard registry binds this gateway to `model.structured-extractor@1` and `model.rubric-judge@1`. The operator identifiers remain stable across backend selection. Extraction profiles, circuits, benchmarks, and releases therefore contain no vendor-specific Coding Agent branch.

## Backend selection

The CLI option `--translator` accepts `auto`, `achilles`, `codex`, or `none`.

| Value | Behavior |
| --- | --- |
| `auto` | Use Achilles only when the installed module and selected provider are configured; otherwise create the configured Coding Agent translation adapter. |
| `achilles` | Require a usable AchillesAgentLib `LLMAgent`; configuration failure terminates the command with a diagnostic. |
| `codex` | Compatibility identifier for the currently shipped Coding Agent reference adapter, even when Achilles is configured. |
| `none` | Register no semantic translation operators. Deterministic circuits remain usable; a release requiring semantic observations reports a compatibility gap. |

`--no-llm` is retained as an alias for `--translator none`. The default is `auto`. The selector runs once per command context. A normal production run creates its Coding Agent adapter workspace under that run directory. Benchmark and publication commands create separate agent-local temporary processing directories. Selection does not alter the active release or its circuit definitions.

## Achilles configuration and Spark preference

Achilles resolution checks an explicit `ACHILLES_AGENT_LIB_PATH`, then the supported sibling development layout, then the installed package form. Module presence is not sufficient for `auto`. The selected model must resolve to a provider whose declared key environment is present, or to the generic `LLM_API_KEY`; controlled embedding tests may explicitly mark an injected configuration usable.

Translation, extraction, evaluation, testing, and judgment roles prefer Spark when the Achilles configuration exposes it. Selection order is:

1. `defaults.spark` in `LLMConfig.json`;
2. a model descriptor whose name contains `spark` or whose tags include `spark`;
3. the semantic alias `fast` when no Spark entry exists.

All Achilles calls are performed by an actual `LLMAgent` instance through `LLMAgent.executePrompt()`. The gateway passes the selected model, role tags including `spark` for translation-class work, response shape, and output schema. A direct provider call outside Achilles is not part of this contract.

`nllagent model inspect --json` reports module resolution, whether the selected provider is configured, preferred and resolved model identifiers, provider, required environment name, the reason for the decision, and which backend `auto` will select. It does not attempt an inference.

## Coding Agent translation workspace

The Coding Agent adapter creates one `translation/` subtree inside a production run. Each gateway invocation receives a child such as `call-0001/`. The call folder contains:

- `AGENTS.md`, limited to the translation task;
- exactly one role skill link: `.agents/skills/nll-translate-longtext` or `.agents/skills/nll-realize-cnl`;
- `prompt.md`, the effective translation request;
- `output-schema.json`, the response contract;
- `result.json`, the final schema-constrained result;
- `events.jsonl`, the adapter event stream when available;
- `stderr.log`, process diagnostics.

This is logical per-run organization. Its purpose is to keep a call reproducible, prevent unrelated repository skills from entering the translation context, and collect temporary processing artifacts in the owning agent run. The adapter must declare its identity, executable protocol, capability restrictions, timeout behavior, and capture mapping.

The current reference implementation uses OpenAI Codex as one example of a Coding Agent. Its adapter invokes `codex exec` with a workspace-write sandbox, no interactive approval, an ephemeral session, JSON event output, an explicit output schema, an explicit final-output path, and the call folder as its working directory. The compatibility option `--codex-bin` and `NLL_CODEX_BIN` select that reference executable. Another Coding Agent may use a different process protocol while preserving the same workspace, schema, capture, and capability contracts.

The production adapter does not give the Coding Agent a repository-editing task. Observation calls use `nll-translate-longtext`; optional realization and revision calls use `nll-realize-cnl`. Both treat supplied content as untrusted and return only schema-valid JSON. Observations still pass through the LongTextJS materializer, while realized documents still pass through full LongTextJS and validation execution.

## Runtime skills

`.agents/skills/nll-translate-longtext/SKILL.md` is a self-contained production translation skill. It instructs the selected Coding Agent to:

- distinguish caller instructions from untrusted source content;
- extract observations rather than decide a linter violation;
- copy exact source quotes;
- preserve negation, modality, reported speech, discourse mode, time, and ambiguity;
- return an empty observation set when a phenomenon is absent;
- express competing interpretations in `alternatives`;
- perform layer-by-layer semantic equivalence only when invoked as a benchmark evaluator;
- return only the supplied JSON shape and avoid project edits.

The skill does not import code from `src/`, modify circuits, or change rules. Its contract is deliberately smaller than the learning skills described by DS013.

`.agents/skills/nll-realize-cnl/SKILL.md` is the equally narrow optional realization role. It follows the complete circuit-produced `CNLGenerationPlan`, preserves its source idea and ordered content steps, treats the plan and previous candidate as untrusted call content, returns the whole document through the requested schema, and never changes the plan, declares conformity, or edits release artifacts.

## Extraction pipeline

The common model-assisted materializer performs the following algorithm for every demanded extraction profile:

1. Select source blocks matching `scopeTypes`.
2. Build a neutral prompt containing observation type, extraction instruction, required fields, exact-quote requirements, and the source block.
3. Build a JSON Schema for `{ observations: [...] }`, including required payload fields and declared enum values.
4. Call the selected translation gateway under the profile and command budgets.
5. Validate nested response objects, arrays, required and additional properties, scalar types, enumerations, bounds, and each payload.
6. Locate each quote exactly inside the current source block, assign repeated quotes to successive occurrences, and compute a Unicode code-point anchor.
7. Add a `proposed` observation with confidence, alternatives, reason, and capture provenance.
8. Record invalid candidates as `model-output` gaps instead of silently correcting them.
9. Record open-world coverage for the semantic type and enforce `minimumObservations` when declared.

The output of steps 5–9 is identical for Achilles and every conforming Coding Agent adapter. The backend cannot directly add an observation to LongTextJS.

## Benchmark evaluation

Semantic benchmark cases may set `evaluation.mode` to `llm`. The runner invokes the same backend-neutral rubric operator from at least the configured perspectives, normally `equivalence` and `counterexample`. The evaluator compares expected structured layers, expected Markdown, and actual Markdown. Its schema includes pass, score, observation agreement, rule agreement, coverage agreement, material differences, and explanation.

When Achilles is configured, these evaluation calls use `LLMAgent` and prefer Spark. In `auto` mode without Achilles configuration, they may use the Coding Agent adapter in a command-specific temporary workspace. Deterministic structured assertions remain mandatory; semantic evaluation complements them and cannot hide a layer mismatch.

## Budgets, caches, and terminal behavior

Translation calls count against `modelCalls`. Exceeding the call budget produces `budget-exhausted`; the production run ends as `stopped-budget` and records an issue. A failed backend call produces an `extractor-failure` gap for the affected block. If the corresponding critical observation contract cannot be satisfied, the run stops or reports limits according to compatibility and coverage policy.

Deterministic cache keys include source revision, block digest, extraction profile, prompt template, and canonical request fields. Cached results pass through the same complete schema validation and anchoring path. Replay indexes captures by that same semantic request digest. Coding Agent event logs and Achilles captures do not enter the semantic circuit hash.

The report must state when requested work cannot be completed under the assigned budget. It must not convert missing extraction into compliance, and it must not speculate about unreachable theoretical guarantees.

## Library API and implementation map

The implementation is deliberately layered:

| Module | Responsibility |
| --- | --- |
| `src/model/achilles-gateway.mjs` | Achilles resolution, configuration inspection, Spark selection, `LLMAgent` construction, and capture. |
| `src/model/codex-translation-backend.mjs` | Current reference Coding Agent adapter: per-call workspace, skill link, constrained invocation, result loading, and capture. |
| `src/model/translation-backends.mjs` | `auto` and explicit backend selection. |
| `src/longtext/model-materializer.mjs` | Neutral extraction prompt, output schema, exact anchoring, observation validation, gaps, and coverage. |
| `src/runtime/standard-operators.mjs` | Backend-neutral model operator registration. |
| `src/benchmark/llm-evaluator.mjs` | Multi-perspective semantic benchmark evaluation. |
| `src/runtime/production-run.mjs` | Run-local backend creation and persistence in `run.json`. |

Embedders may inject a gateway directly into `createStandardRegistries`, which is the supported path for offline tests and specialized hosting. Tests inject an object that behaves like `LLMAgent`, then wrap it with `gatewayForAgent`; this exercises routing and tagging without network calls.

## Test contract

Default tests are offline but behavioral. They prove:

- Spark wins when Achilles configuration exposes it;
- translation-class calls reach `LLMAgent.executePrompt()` with the selected model and tags;
- the reference Coding Agent adapter creates a call-local skill link, schema, prompt, event log, and result;
- realization and revision calls link only `nll-realize-cnl`, while observation calls link only `nll-translate-longtext`;
- a complete CLI `run --translator auto` selects the reference adapter with Achilles unconfigured, materializes two semantic event observations, executes a released continuity circuit, and persists LongTextJS plus backend identity;
- exact quotes and Unicode anchors are preserved;
- repeated equal quotes receive distinct successive anchors;
- a semantic continuity circuit consumes observations produced through the `LLMAgent` route;
- an Achilles capture is found by the backend-neutral replay gateway for the same semantic request;
- semantic benchmark evaluation uses multiple perspectives;
- unavailable translation and exhausted budgets produce explicit gaps or terminal states.

Live model tests are optional because they require credentials and consume external capacity. An agent may separately evaluate a live profile with agent-owned data.

# Decisions & Questions

### Question #1: Does using a Coding Agent during ordinary linting break the frozen-theory boundary?

Response: No. The Coding Agent is used only through a schema-bound role that produces proposed observations or a document candidate. It cannot edit or synthesize the active CircuitJS release during the run. Circuit execution, verification, and publication remain the frozen path.

### Question #2: Why not generate a complete LongTextJS program directly in one Coding Agent call?

Response: The layered materializer keeps canonical Markdown parsing, source maps, quote validation, observation profiles, coverage, compatibility, and circuit routing common. The Coding Agent supplies semantic candidates where requested. This makes backend outputs comparable and permits incremental or per-type retries.

### Question #3: What exactly means “Achilles is not configured”?

Response: The module can be loaded, but the selected model cannot be linked to a provider with usable runtime configuration. `model inspect` reports the provider and required environment. `auto` then chooses the configured Coding Agent adapter rather than waiting for the first model call to fail.

### Question #4: Is Spark mandatory?

Response: Spark is preferred when Achilles exposes it. If the configuration contains no Spark model, the gateway uses the `fast` semantic alias. The capture records the actual choice so benchmark results are attributable.

### Question #5: May a project disable all semantic translation?

Response: Yes, with `--translator none` or `--no-llm`. Deterministic circuits continue to run. A release that requires semantic observations cannot pretend those observations are absent facts; it reports incompatibility or incomplete coverage.

### Question #6: Why are symbolic links used for the Coding Agent skill?

Response: They provide one maintained skill definition in `.agents/skills` while each call sees a minimal local skill catalog. The isolation goal is operational clarity and context control, not secrecy.

### Question #7: Why must all backends share one request canonicalizer and schema validator?

Response: Otherwise backend selection could change replay identity or validation strength even though the extraction contract is unchanged. A single canonical boundary makes a Coding Agent a genuine fallback for the same LongTextJS demand rather than a parallel, weaker pipeline.

### Question #8: Does the Coding Agent translation skill also generate documents?

Response: No. The backend is schema-bound but selects a role-specific skill per call. Observation, evaluation, and judgment calls link only `nll-translate-longtext`; realization and revision calls link only `nll-realize-cnl`. The CNL plan has already been produced by CircuitJS before either realization role runs. Both skills are production-safe roles over a frozen release, but their instructions and authority boundaries are deliberately separate.

# Conclusion

Semantic extraction and optional CNL realization are pluggable, schema-bound services. Configured AchillesAgentLib with `LLMAgent` and Spark preference is the primary route. A conforming Coding Agent plus one narrow role skill is the fallback route. CNL planning remains frozen CircuitJS execution; model backends feed only the declared observation or realization boundary.
