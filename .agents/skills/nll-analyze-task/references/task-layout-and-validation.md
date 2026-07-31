# Task layout and validation

The host creates one isolated task workspace and pins it to one immutable trained-agent build. This skill owns only the
`generated/` authoring area within that workspace.

## Expected inputs

```text
request.md
context/
  agent-context.mjs
  agent-context.md
task/
  input.md
generated/
```

The context checker must pass before the untrusted input is read. The context identifies the selected build, active
ontology and circuits, MaterializationProfile, SemanticDemand, permitted SDK imports, validation commands, tests, and
benchmarks. If any required field is missing, stop; do not discover a replacement from the repository.

## Generated outputs

`generated/program.mjs` default-exports one materializer function. The host calls it with:

```js
({ source, program, api, ontology, vocabulary }) => semanticValues
```

Use only the injected values. The function must be deterministic for the same source revision and injected build. It
must not import, perform I/O, call Codex, or retain mutable state between evaluations.

`generated/notes.md` explains source organization, materialized semantic families, alternative readings, and gaps.
It may aid review but is not an executable contract. `generated/handoff.md` records exact commands and timings and
must not contain a verdict.

## Validation sequence

1. Load and validate the selected `AgentAuthoringContext`.
2. Use the context-listed source outline/span commands to verify all anchors.
3. Load `program.mjs` in the host validation capsule with network, imports, environment, and ambient filesystem denied.
4. Execute it against the exact source revision.
5. Validate returned values, ontology sorts, role cardinalities, identities, contexts, and source spans.
6. Build the observation layer in a fresh SemanticStore transaction.
7. Compare the snapshot with MaterializationProfile and SemanticDemand.
8. Inspect coverage declarations and alternatives; run task-local review if configured.

The deterministic host, not this skill, subsequently executes the selected circuits and writes task-local result,
trace, and report artifacts.

## Failure behavior

Return no partial semantic snapshot after a structural error. For an epistemic limitation, produce an accepted gap or
alternative and allow compatibility analysis to decide its effect. Distinguish these cases in handoff:

- invalid program, anchor, type, or cardinality: authoring failure to repair;
- relevant meaning not expressible: ontology gap, reported without changing the trained theory;
- source insufficient to decide identity, time, or coverage: epistemic gap;
- context missing or selected build inconsistent: host blocker;
- requested circuit capability absent: trained-agent blocker, not a LongText repair.

Never invoke a training workflow from inside a task. A proposed theory improvement belongs in review output for a
separate, explicitly authorized training build.
