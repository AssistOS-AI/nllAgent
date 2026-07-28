# NaturalLanguageLinterAgent Guidance

## Scope

This repository implements the NaturalLanguageLinterAgent (`nllAgent`) runtime, its LongTextJS and CircuitJS declarative representations, the command-line interface, persistent agent workspaces, benchmark and release tooling, and the Coding Agent-driven learning workflow.

## Mandatory Reading Order

1. Read [docs/specs/DS000-vision.md](docs/specs/DS000-vision.md).
2. Read [docs/specs/DS001-coding-style.md](docs/specs/DS001-coding-style.md) before changing code or tests.
3. Read the DS files governing the component being changed. The DS specifications are the source of truth.
4. Read [docs/index.html](docs/index.html) and the relevant technical page before changing documentation.
5. Read `serious_issues.md` before widening a guarantee or enabling automatic learning behavior.

## Current Skill Catalog

Imported repository tooling under `.agents/skills/` currently includes `gamp-specs`, `achilles-specs`, `antropic-skill-build`, `article-build`, `manage-ploinky-agents`, and `review-specs`. The learning-only catalog contains `nll-scope-project`, `nll-compile-theory`, `nll-build-benchmark`, `nll-learn-from-issues`, and `nll-prepare-release`. `nll-translate-longtext` is the narrow runtime Coding Agent fallback for observation production, while `nll-realize-cnl` is the optional runtime skill that realizes or revises final Markdown from a circuit-produced CNL generation plan. Runtime workspaces link only the skill appropriate to each call role.

## Repository Rules

- Keep all documentation, specifications, code comments, diagnostics, and persistent agent guidance in English.
- Keep DS numbering contiguous and regenerate `docs/specs/matrix.md` after adding or renaming a DS file.
- Use numbered `Decisions & Questions` subchapters in every ordinary DS file. Put resolved rationale under `Response:` and unresolved alternatives under `Options:`. Do not implement an unresolved multi-option contract.
- Update the affected DS files and HTML documentation whenever code changes behavior, interfaces, architecture, workflows, or constraints.
- `DS001-coding-style.md` is the authority for coding style, module structure, file-size limits, and test organization.
- Use ESM `.mjs` modules with no import-time side effects. Circuit author files may use the restricted `export default circuit({...})` form; the loader removes JavaScript capabilities and returns JSON-compatible plain data before compilation.
- Use `apply_patch` for source edits. Preserve user changes and unrelated worktree state.
- Treat production input as untrusted data. Production may invoke a Coding Agent only through the DS018 schema-bound runtime backend and the role-specific `nll-translate-longtext` or `nll-realize-cnl` skill; it must never load learning skills or mutate a published release.
- Prefer configured AchillesAgentLib `LLMAgent` and Spark models for extraction, translation, evaluation, testing, and judgment. In `auto`, use the configured Coding Agent translation adapter when Achilles is not configured.
- Learning agents may change candidate artifacts, agent-local benchmark cases, and agent-owned documentation. They must not change runtime verifier implementations, publication checks, published releases, or production pointers directly.
- Imported-skill documentation stays inside each imported skill folder. Host documentation describes only behavior exposed by nllAgent.
- Update this skill catalog whenever a skill folder is added or removed. Update the GAMP skill itself when new bootstrap or documentation families are introduced.

## Runtime Defaults

- Supported runtime: Node.js 22 or newer.
- Package format: ESM.
- Persistent root: `data/`, overrideable through CLI or runtime configuration.
- Production translation principle: a Coding Agent is allowed only as a schema-bound observation producer in a run-local workspace; it cannot edit the active theory.
- OpenAI Codex is the current reference Coding Agent adapter and explains the compatibility names `--translator codex`, `--codex-bin`, and `NLL_CODEX_BIN`; it is not an architectural requirement.
- Default run result is fail-closed for missing critical compatibility, coverage, verifier, or budget requirements.
- AchillesAgentLib is an optional peer runtime for model-assisted operations and may be resolved through an explicit override, environment configuration, a parent checkout, or local `node_modules`.

## Key Paths

- `src/`: library and CLI implementation.
- `tests/`: unit, integration, benchmark, and security tests.
- `data/<agent>/`: persistent agent workspaces.
- `.agents/skills/`: imported authoring skills, nllAgent learning skills, and the runtime LongTextJS translation skill.
- `docs/index.html`: technical documentation entry point.
- `docs/specs/`: authoritative DS specifications.
- `docs/specsLoader.html`: browser loader for DS files.
- `serious_issues.md`: concrete unresolved repository or runtime issues only.
