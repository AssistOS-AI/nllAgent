---
id: DS013
title: Coding Agent Learning Workflow and Agent-Local Skills
status: accepted
owner: nllAgent maintainers
summary: Defines learning jobs, Coding Agent adapters, skill boundaries, candidate changes, issue distillation, validation, and promotion restrictions.
---

# Introduction

Learning compiles Markdown rules, examples, reviewer feedback, and accumulated issues into candidate agent artifacts. It is a repository-editing workflow executed by a configured Coding Agent under explicit skills, not an online mutation of production logic.

# Core Content

## Learning input and job

`nllagent learn --agent <name> --rules <folder>` must validate the agent and rule folder, snapshot Markdown rules, selected open issues, requested benchmark suites, the active release manifest, relevant DS contracts, serious-issue register, and operator/verifier catalogs into a learning-run record. The original rule folder is always copied into the run before the Coding Agent starts.

The learning job progresses through triage, authority mapping, scope confirmation, rule cards, vocabulary, observation contracts, semantic-form selection, restricted MJS CircuitJS synthesis, witness design, benchmark construction, candidate build, local validation, and summary. Form selection chooses the smallest correct representation: an existing operator wrapper, a supported query and decision table, an aggregate or ordered-pattern operator, or a direct graph for recursive, stateful, search, solver, or argumentation behavior. Intermediate artifacts remain in `learning-runs/<id>/` and candidate outputs in `candidates/<version>/`.

## Coding Agent adapter

The runner builds `learning-runs/<id>/workspace/` as a per-run staging agent and delegates the job through a Coding Agent adapter. The adapter contract fixes the working directory, task text, linked skill catalog, output JSON Schema, timeout, environment policy, event and diagnostic capture, and non-interactive execution mode. Vendor-specific command-line flags must remain inside the adapter and must not leak into candidate, benchmark, release, or CircuitJS semantics.

The staging workspace copies agent-owned circuits, schemas, extraction profiles, candidates, benchmarks, and proposals; copies authority, operational context, feedback, issues, DS contracts, serious issues, the active release, and trusted registry descriptions as context; and links only the five learning skills. The task identifies the staged rule snapshot and explicitly forbids treating context as a writable production surface.

The current reference adapter is OpenAI Codex. It invokes `codex exec` with `shell: false`, a workspace-write sandbox, no interactive approvals, an ephemeral session, an explicit output schema, and the staging workspace as its working directory. This is an implementation example of the generic Coding Agent boundary, not an architectural requirement that releases or learning skills depend on Codex.

The staging folder contains its own `AGENTS.md` and symbolic links only to the five learning skills. Ordinary GAMP and unrelated repository skills are absent from that working catalog. The runner captures the final schema-bound message, event stream or stderr, exit code, changed-file inventory, and post-run validation. A successful process exit is insufficient: the final result must be present, readable, and schema-valid before any staged authoring file is promoted. Invalid final output creates an issue and leaves the real agent authoring surface unchanged.

The default Coding Agent timeout is thirty minutes and is explicitly overrideable by the embedding library. Input trees are rejected if they contain symbolic links or non-regular entries before they are copied into staging. The post-run inventory rejects any changed path outside staged authoring roots and the current staged learning-run folder. Deletions are rejected. Only changed regular files in `circuits`, `schemas`, `extraction`, `candidates`, `benchmark`, and `proposals` are promoted to the real agent; run-local outputs are copied under the real learning record. A forbidden staging edit never reaches a release or active pointer.

## Skill catalog

Learning skills are self-contained Anthropic-style skill folders. The minimum set is:

- `nll-scope-project` for authority and intended-use scoping;
- `nll-compile-theory` for rule cards, vocabulary, observation contracts, patterns, circuits, and witnesses;
- `nll-build-benchmark` for microcase mining, contrastive cases, mutation proposals, and coverage;
- `nll-learn-from-issues` for issue triage, failure localization, regression cases, and candidate repair;
- `nll-prepare-release` for checking candidate readiness without invoking publication or changing trusted checks.

Each skill must use imperative instructions, concise progressive disclosure, `agents/openai.yaml` with implicit invocation disabled, local references where needed, and no imports from the host `src/`. Skills may call documented CLI commands, which are stable host interfaces.

The compile, benchmark, issue-repair, and release-preparation skills must understand stable query, table, row, authority, witness, coverage, and verifier identities when a supported query-first profile is present. They may use only the experimental subset advertised by the host compiler and must fall back to direct CircuitJS for unsupported joins, aggregates, patterns, recursion, state, search, solvers, or argumentation. Compact syntax is never a reason to bypass neutral observation demand, closed-world coverage, differential evidence, or an exact verifier.

## Permitted changes

The learning process may write only staged agent authoring artifacts, benchmark cases, candidate packages, proposals, and current learning-run artifacts. It may propose new operators or verifiers in a proposal folder, but cannot register them. Context copies, active release pointers, published release contents, platform verifier code, release thresholds, CLI policy, and repository DS contracts are non-promotable even if the Coding Agent alters their staging copies.

`foundation-core` is platform-owned and follows the same protected boundary. Learning may consume its documented observations with their exact open-world semantics and may propose an extension with counterexamples and tests, but it cannot edit the pack, copy its circuit identifiers, or change its verifiers through an agent candidate. Scope, compilation, benchmark, and release-preparation skills must identify an agent circuit's dependency on the selected foundation and test any claimed foundation-off behavior explicitly. Contingent knowledge belongs in a separately governed `KnowledgePack`; repeating a claim in documents or feedback does not promote it to common sense.

## Issue learning

Issue triage must classify failure at ingestion, anchor, observation, identity, time, coverage, compatibility, circuit, operator, verifier, explanation, benchmark, or operational context. The smallest authorized reproducer becomes a public regression case only after validation. A document excerpt remains calibration evidence and cannot become rule authority by repetition.

Candidate repair must state a falsifiable hypothesis, affected artifacts, impact slice, new tests, and residual limitations. Several competing candidates may be retained. The first plausible patch is not automatically selected.

## Candidate completion and manual publication

The learning command always stops after promoting audited authoring changes and preserving the adapter's schema-bound terminal state as `completed`, `needs-review`, or `blocked`. A blocked job returns the learning-failure exit class rather than being mislabeled as completed. Learning cannot create `publication.json`, write under `releases/`, or edit `active-release.json`. After reviewing the candidate and its benchmark evidence, a maintainer may separately run `nllagent release publish --agent <name> --candidate <version>`. That command reruns trusted checks; a request emitted by the Coding Agent cannot trigger it.

# Decisions & Questions

### Question #1: How are learning skills isolated per agent?

Response: The learning runner starts the configured Coding Agent in a disposable staging copy beneath the learning run and links only the learning skills there. Each named agent supplies its own circuits, benchmarks, candidates, feedback, and release context, while forbidden edits remain confined to the staging tree and prevent promotion.

### Question #2: Why use several focused skills instead of one “improve agent” skill?

Response: Separate outputs localize failure, reduce confirmation bias, allow different access policies, and keep the transition from authority to circuit reviewable.

### Question #3: May the learning runner publish a release automatically?

Response: No. Learning ends with a candidate and readiness evidence. Publication is a distinct manual maintainer command so production behavior cannot drift silently.

### Question #4: Why audit changed paths after the Coding Agent already ran?

Response: The audit is the promotion policy. A Coding Agent may explore within a disposable writable copy, but only whitelisted regular files are copied back after a clean inventory. This makes the boundary effective even if a prompt or coding action targets a protected path inside staging.

### Question #5: Why use a Coding Agent instead of only fixed generators?

Response: Rulebooks, counterexamples, schemas, circuits, and benchmark repairs require repository-scale coding judgment. The Coding Agent performs that open-ended compilation, while staging, focused skills, static contracts, benchmarks, and manual trusted publication constrain what becomes executable production theory. The adapter boundary allows the implementation to change without changing the learned artifact contract.

### Question #6: What must another Coding Agent implement?

Response: It must accept an explicit staged workspace, task, skill catalog, timeout, and result schema; run without interactive decisions; return a schema-valid terminal result and attributable event or diagnostic capture; and tolerate the same post-run changed-path audit. It receives no authority to publish releases or edit the active pointer.

### Question #7: How do learning agents add planning support?

Response: They may propose dedicated planning circuits, idea-specific plan examples, rule-to-plan witnesses, observation profiles, planning operators, and idea-to-CNL benchmark cases in a candidate. They should derive planning and validation graphs from the same approved rule cards and reuse authority identities, schemas, and operators where their semantics coincide. They must not turn the rulebook into a CNL constraint list. They cannot edit the production realization skill, trusted CNL verifier, published releases, or active pointer.

### Question #8: Why must a learning agent justify the selected circuit form?

Response: The shortest serialization is not always the simplest semantics. A three-node exact operator wrapper may be clearer than a generic query, while a shared table may remove repeated wiring across dozens of local alternatives. Recording the rule shape and rejected forms lets maintainers review complexity before reviewing syntax.

### Question #9: Can learning add a new universal fact to the default foundation?

Response: No. It may create a repository-level proposal with authority, scope, counterexamples, and benchmark evidence. Platform maintainers decide whether the claim is a stable invariant, an optional dated knowledge item, or agent-specific theory.

# Conclusion

Learning is a software and knowledge compilation workflow. A Coding Agent accelerates artifact generation and repair, while focused skills, agent-local writes, natural benchmarks, changed-path audit, and separate manual publication prevent a candidate from becoming silent production policy.
