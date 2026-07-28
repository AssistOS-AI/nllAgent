---
id: DS003
title: CLI and Agent Workspace Contract
status: accepted
owner: nllAgent maintainers
summary: Defines CNL audit and specification commands, optional realization, exit codes, agent naming, workspace layout, run isolation, and issue persistence.
---

# Introduction

The CLI is the primary user interface. It must keep ordinary use simple while preserving all audit material in a predictable agent workspace.

# Core Content

## CNL planning command

`plan` accepts a Markdown idea and writes a rendered CNL generation plan. It selects one immutable release at transaction start and executes its primary `planningCircuits` graph. Plan-only execution does not require a model backend. `--realize-output` optionally asks a schema-bound backend to realize the plan and enables bounded revisions. Planning runs have their own durable directory because the CNL plan is a first-class artifact and one transaction may additionally contain several validated candidates.

## Commands

The canonical ordinary command is:

```text
nllagent run --agent <name> --input <file.md> --output <report.md>
```

The canonical learning and qualification commands are:

```text
nllagent learn --agent <name> --rules <folder>
nllagent benchmark --agent <name>
nllagent agent init --agent <name>
nllagent agent list
nllagent agent inspect --agent <name>
nllagent issue list --agent <name> [--status <status>]
nllagent feedback add --agent <name> --run <id> --type <type> --message <text>
nllagent release qualify --agent <name> --candidate <version>
nllagent release activate --agent <name> --release <version>
nllagent model inspect
```

`--data-root` may override `data/`. `--release` may select a qualified immutable release instead of the active pointer. `--json` may print a machine-readable command result. In audit mode, the requested Markdown report is rendered from canonical `cnl-audit.json`; in specification mode, the requested plan is rendered from canonical `cnl-plan.json`. `--translator auto|achilles|codex|none` controls semantic translation; `auto` prefers configured Achilles and otherwise uses the installed Coding Agent adapter. The parser validates the exact positional shape and option allowlist of each command; unknown options and surplus positionals are usage errors.

## Agent names and roots

An agent name must match `^[a-z][a-z0-9-]{0,62}$`. It is a durable identifier, not an arbitrary path. The resolved workspace must remain a descendant of the configured data root after real-path validation.

The required workspace layout is:

```text
data/<agent>/
  agent.json
  authority/
  operational-context/
  circuits/
  schemas/
  extraction/
  releases/
  active-release.json
  runs/<run-id>/
  learning-runs/<learning-id>/
  issues/
  feedback/
  .agents/skills/ -> selected repository learning skills
  benchmark/public/
  benchmark/development/
  benchmark/holdout/
  benchmark/scenarios/
  benchmark/adversarial/
  benchmark/metamorphic/
  benchmark/mutations/
  candidates/
  locks/
  proposals/
```

`agent.json` uses kind `NaturalLanguageLinterProject`. New audit transactions use `NaturalLanguageLinterRun`, and new planning transactions use `NaturalLanguageLinterPlanningRun`. The CLI and prose use `nllAgent` when the full product name would add noise.

The top-level circuit, schema, and extraction folders are authoring inputs. Production must load the immutable snapshot under the selected release. Benchmark suite names communicate their role in synthesis and qualification; they do not imply confidentiality. Each agent has independent authoring artifacts, benchmarks, candidates, qualified releases, runs, feedback, and activation pointer. `agent list` enumerates valid workspaces under the selected data root without crossing symlinks. Agent-local skill links expose only the learning skills, while each Coding Agent learning invocation runs in a per-run staging workspace governed by DS013.

## Run isolation

Every audit run must receive a collision-resistant identifier and a dedicated directory. The directory must contain the copied input, input digest, source package, LongTextJS program, compatibility report, coverage records, circuit plan, semantic trace, findings, verifier results, canonical `cnl-audit.json`, command metadata, issue references, model captures, and rendered `report.md` when those artifacts exist. Certified conflicts are persisted in `conflicts.json`. A Coding Agent translation adapter creates `translation/call-NNNN/` with its prompt, response schema, final result, event stream, diagnostics, and adapter identity.

The user-specified output path receives the final report only after the run reaches a terminal state. Stopped states must still produce a Markdown report explaining the stop. A failure to write the user output must not erase the internal run report.

Run metadata and semantic artifacts become immutable after terminalization. Telemetry may be appended separately, but semantic objects must be superseded by a new run rather than edited.

## Issues

The runtime must create issues for blocked compatibility, insufficient critical coverage, budget exhaustion, verifier rejection, operator failure, certified conflict, benchmark mismatch, stale or broken anchors, and uncaught runtime faults. An issue must contain its type, severity, agent, release, run, source digest, affected circuits or rules, relevant anchors, a minimal authorized excerpt where policy permits, reproduction command, diagnostics, lifecycle status, and provenance.

Issues are immutable events with status transitions represented as revisions. The learning runner may read open and selected resolved issues. Production input does not become authority merely because it appears in an issue.

Reviewer feedback is stored separately from runtime issues. `feedback add` records the run, correction type, message, optional finding, and reviewer role as scoped review evidence. It does not edit the run, finding, circuit, benchmark oracle, or release.

## Exit codes

Exit code `0` means `reported` or an explicitly permitted `reported-with-limits`. Code `2` means findings crossed a configured blocking threshold. Code `3` means incompatible. Code `4` means incomplete coverage. Code `5` means budget exhausted. Code `6` means review-required conflict. The CLI reserves `64` for usage/configuration failure and `70` for runtime failure. Benchmark and learning commands return nonzero structured results on mismatch or orchestration failure.

# Decisions & Questions

### Question #1: Why keep temporary processing files permanently by default?

Response: The user explicitly requires per-run processing subfolders, and reproducibility requires the intermediate artifacts. Retention policies may archive or redact them later, but deletion must be explicit and policy-driven.

### Question #2: Can a stopped run omit the requested output file?

Response: No. If the output destination is writable, the CLI writes a Markdown stop report. This lets shell users distinguish “no findings” from “could not verify” without inspecting internal JSON.

### Question #3: Where are circuits edited?

Response: Learning edits agent-owned candidate and authoring folders. Production reads a qualified release snapshot. Activation changes only the active release pointer after qualification.

### Question #4: Why are issue and feedback records separate?

Response: An issue describes an observed runtime or qualification failure, while feedback is a reviewer claim about a run. Keeping them separate preserves authority, disagreement, and triage state; learning may later connect them through explicit provenance.

### Question #5: What happens when AchillesAgentLib exists but lacks provider configuration?

Response: `model inspect` reports the selected model, provider, and missing environment. `--translator auto` immediately selects the configured Coding Agent adapter, while explicit `--translator achilles` reports a configuration error. The run therefore remains usable without weakening the LongTextJS contract.

### Question #6: How does the simple CLI represent several specialized linters?

Response: The `--agent` selector chooses an isolated workspace and release lineage. Users keep the same `run`, `benchmark`, `learn`, and `release` verbs for every linter, while `agent list` makes the available independent agents discoverable. Circuits and benchmark outcomes never leak between agent roots.

### Question #7: How are CNL planning and optional realization invoked and stored?

Response: `nllagent plan --agent <name> --input <idea.md> --output <plan.cnl.md>` accepts `--release` and the standard backend options and creates `planning-runs/<id>/` with the idea, LongTextJS program, canonical and rendered CNL plan, compatibility, trace, and terminal record. `--realize-output <draft.md>` opts into realization, and `--max-revisions 0..10` is valid only with it. Exit 0 means planning or realization succeeded, 2 means optional realization ended with findings, 3–6 retain stopped-state meanings, 64 is invalid usage, and 70 is an unexpected fault.

### Question #8: Why do persistent kinds spell out NaturalLanguageLinter while commands use nllAgent?

Response: Persistent kinds are durable schema identifiers and therefore use the unambiguous full `NaturalLanguageLinter…` family. `nllAgent` is the deliberately compact product and command name used in paths, examples, package surfaces, and ordinary prose.

# Conclusion

The CLI exposes a small stable surface while each agent workspace preserves the complete lifecycle needed for audit, regression testing, and controlled learning.
