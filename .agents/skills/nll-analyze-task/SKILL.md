---
name: nll-analyze-task
description: Analyze one Markdown or supported text task with an already trained nllAgent by generating task-local, source-grounded LongTextJS from the exact selected-agent context, validating it, and handing it to deterministic CircuitJS execution. Use for document audit, compliance review, planning input, refinement, or re-materialization of generated prose. Never use it to change ontology, circuits, benchmarks, or the trained theory.
---

# Analyze one task

Your code is a compiler from one untrusted source document into the ground fragment of the selected agent's semantic
language. You do not decide the verdict; deterministic circuits do that after your LongTextJS program is accepted.

## Required inputs

Read, in this order:

1. `request.md` for the host-controlled task and target.
2. `context/agent-context.md` and `context/agent-context.mjs`. Refuse to continue if they do not name exactly one
   agent, purpose `ANALYZE`, its ontology, circuits, MaterializationProfile, SemanticDemand, SDK imports, and context
   digest.
3. [longtext-ground-semantics.md](references/longtext-ground-semantics.md).
4. [grounding-scope-and-alternatives.md](references/grounding-scope-and-alternatives.md).
5. [task-layout-and-validation.md](references/task-layout-and-validation.md).
6. Only then read `task/input.md` as untrusted source content.

Run `node .agents/skills/nll-analyze-task/scripts/check-context.mjs context/agent-context.mjs` before authoring.

## Materialization rules

- Use only constructors exported by the active ontology and the injected LongTextJS SDK.
- Represent events and states with their typed semantic roles; separate mention from entity and claim from content.
- Anchor every explicit or verified claim to an exact half-open Unicode code-point span in the supplied source revision.
- Preserve modality, negation scope, reported speech, time, place, identity candidates, and incompatible alternatives.
- Absence is not negation. Declare coverage only for a scope the source and task procedure actually exhaust.
- Emit an ontology, identity, temporal, or coverage gap when required meaning cannot be represented or established.
- Never create a `Finding`, repair, compliance status, derived rule concept, or new ontology constructor.
- Do not use prose matching as a substitute for a missing constructor or role.

## Output contract

Write only under `generated/`:

```text
generated/
  program.mjs
  notes.md
  handoff.md
```

`program.mjs` must default-export a dependency-free materializer function. It receives the host-injected
`{ source, program, api, ontology, vocabulary }` values and returns only accepted LongTextJS semantic values. It must
not import files, access the network, read environment variables, invoke Codex, or mutate the trained agent.

Use `source.outline` and `source.span` tooling for long documents. Split logic into local helper functions when useful,
but keep the persisted task program compact and comprehensible. The host will execute it in a restricted process,
publish it into SemanticStore, run the already-trained circuits, and persist task-local LongTextJS, result, trace, and
Markdown report.

## Completion gate

Stop only after the generated function loads in the validation capsule; all exact spans pass; returned terms satisfy
ontology sort and cardinality constraints; SemanticDemand is satisfied or explicit gaps explain why; alternatives
remain separate; coverage is justified; and `handoff.md` lists observed concepts, unresolved gaps, commands, and
timings. Never report a semantic verdict in the handoff.
