# NaturalLanguageLinterAgent Learning Workspace

## Scope

This directory is the complete workspace for one NaturalLanguageLinterAgent learning project.
Use only the skills linked under `.agents/skills/`. Do not invoke repository bootstrap,
documentation-rebuild, Ploinky-management, or unrelated imported skills from parent directories.

## Rules

- Treat `learning-runs/<id>/input-rules/` as the authority snapshot for the current job.
- Write theory code only under `circuits/`, `schemas/`, `extraction/`, and `candidates/`.
- Write natural benchmark cases under `benchmark/` and issue analyses under `proposals/`.
- Never edit `releases/` or `active-release.json`.
- Circuit authoring should use restricted `.circuit.mjs` modules and the documented CircuitJS DSL.
- Prepare candidates and run public checks, but leave publication to the explicit manual CLI command.
