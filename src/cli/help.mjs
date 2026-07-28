const HELP = `NaturalLanguageLinterAgent

Usage:
  nllagent run --agent <name> --input <file.md> --output <audit.md> [--release <version>] [--translator auto|achilles|codex|none]
  nllagent plan --agent <name> --input <idea.md> --output <specification.cnl.md> [--release <version>] [--realize-output <draft.md>] [--max-revisions <0..10>]
  nllagent learn --agent <name> --rules <folder> [--codex-bin <path>]
  nllagent benchmark --agent <name> [--release <version>]
  nllagent agent init --agent <name> [--description <text>] [--language <tag>]
  nllagent agent list
  nllagent agent inspect --agent <name>
  nllagent issue list --agent <name> [--status <status>]
  nllagent feedback add --agent <name> --run <id> --type <type> --message <text>
  nllagent release publish --agent <name> --candidate <version>
  nllagent model inspect

Global options:
  --data-root <folder>   Override the default ./data workspace.
  --json                 Print a machine-readable command result.
  --no-llm               Disable all semantic translation (alias for --translator none).
  --translator <backend> Select auto, achilles, codex, or none. Auto prefers configured Achilles and falls back to the Coding Agent adapter.
  --codex-bin <path>     Override the OpenAI Codex executable used by the current reference Coding Agent adapter.
  --help                 Show this help.
`;

export { HELP };
