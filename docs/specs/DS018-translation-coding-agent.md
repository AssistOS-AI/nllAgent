---
id: DS018
title: Translation and Coding Agent Boundaries
status: partial
owner: nllAgent maintainers
summary: Defines schema-bound observation production, optional Achilles routing, Coding Agent workspaces, runtime skills, and acceptance.
---

# Introduction

Translation bridges unrestricted language and executable terms. Repository authoring bridges natural-language rules and
multi-file code. They share model infrastructure but not authority.

# Core Content

A runtime translator receives source, exact ontology constructors, SemanticDemand, evidence policy, and a dedicated
workspace. Its output is executable LongTextJS source or a typed candidate artifact validated in isolation. It cannot
edit the active agent project during a run. `nll-translate-longtext` is the only runtime materialization skill;
`nll-realize-cnl` is the only optional realization skill.

AchillesAgentLib may provide an injected `LLMAgent` route and Spark-preferred translation profile. A Coding Agent may
provide the same semantic role in a contained workspace. Backend-specific commands, model names, and credentials do not
enter circuit semantics. Every accepted model request obeys DS002 identity and replay.

The authoring `learn` workflow receives authority Markdown and agent-owned project files, uses the DS013 skill catalog,
and returns changed `.mjs` and Markdown files plus diagnostics. Runtime and authoring workspaces are separate.

# Decisions & Questions

### Question #1: May a translator return arbitrary host records?

Response: No. The accepted result must execute through the LongTextJS constructors or be an opaque artifact consumed by
a validator. A response format cannot become the hidden semantic language.

### Question #2: What is implemented now?

Response: Named model operations, exact semantic artifact identity, and a non-interactive Coding Agent learning
workspace exist. Full Achilles routing, generated-source import sandbox, durable replay, and changed-path promotion
audit are partial and tracked.

### Question #3: Why preserve `--translator` flags?

Response: They preserve the user role-selection surface and future backend neutrality. An agent without the requested
model capability must stop explicitly rather than fall back to an untracked interpretation.
