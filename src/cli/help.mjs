const HELP = `NaturalLanguageLinterAgent

Usage:
  nllagent run --agent <name> --input <file.md> --output <audit.md>
    [--release <version>] [--translator auto|achilles|codex|none]
    [--foundation core|off] [--no-llm] [--codex-bin <path>]
    [--data-root <folder>] [--json]
  nllagent plan --agent <name> --input <idea.md> --output <specification.cnl.md>
    [--release <version>] [--translator auto|achilles|codex|none]
    [--foundation core|off] [--no-llm] [--codex-bin <path>]
    [--data-root <folder>] [--json]
  nllagent plan ... --realize-output <draft.md> [--max-revisions <0..10>]
    [--translator auto|achilles|codex] [--codex-bin <path>]
  nllagent benchmark --agent <name> [--release <version>]
    [--translator auto|achilles|codex|none] [--no-llm]
    [--foundation core|off] [--codex-bin <path>] [--data-root <folder>] [--json]
  nllagent learn --agent <name> --rules <folder>
    [--codex-bin <path>] [--data-root <folder>] [--json]
  nllagent agent init --agent <name> [--description <text>] [--language <tag>]
    [--data-root <folder>] [--json]
  nllagent agent list [--data-root <folder>] [--json]
  nllagent agent inspect --agent <name> [--data-root <folder>] [--json]
  nllagent issue list --agent <name> [--status <status>]
    [--data-root <folder>] [--json]
  nllagent feedback add --agent <name> --run <id> --type <type> --message <text>
    [--finding <id>] [--role <role>] [--data-root <folder>] [--json]
  nllagent release publish --agent <name> --candidate <version>
    [--translator auto|achilles|codex|none] [--no-llm]
    [--codex-bin <path>] [--data-root <folder>] [--json]
  nllagent model inspect [--json]

Argument rules:
  Long options use --name value; short flags and --name=value are unsupported.
  Options may appear once. Unknown options and surplus positional values are errors.
  File and data-root paths are resolved from the current working directory.
  --codex-bin is passed unchanged; bare commands use PATH. --help prints this text.

Shared options (only on commands that list them above):
  --data-root <folder>   Override the default ./data workspace for this command.
  --json                 Print the command result or error as JSON.
  --no-llm               Alias for --translator none; conflicts with an enabled backend.
  --translator <backend> auto prefers configured Achilles, then the Coding Agent adapter.
  --codex-bin <path>     Override the reference Codex executable when that adapter is used.
  --foundation <mode>    Use foundation-core (default) or disable it with off.

Planning restriction:
  --max-revisions defaults to 2 and is valid only with --realize-output.
  --realize-output conflicts with --no-llm and --translator none.

Full command, artifact, option, environment, and exit-code reference:
  docs/cli.html
`;

export { HELP };
