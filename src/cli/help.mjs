const HELP = `NaturalLanguageLinterAgent

Usage:
  nllagent run --agent <name> --input <file.md> --output <report.md>
    [--foundation core|off] [--translator auto|achilles|codex|none]
    [--data-root <folder>]
  nllagent plan --agent <name> --input <idea.md> --output <plan.cnl.md>
    [--realize-output <draft.md>] [--max-revisions <count>]
    [--foundation core|off] [--translator auto|achilles|codex|none]
    [--data-root <folder>]
  nllagent benchmark --agent <name> [--foundation core|off] [--data-root <folder>]
  nllagent learn --agent <name> --rules <folder> [--data-root <folder>]
  nllagent agent init --agent <name> [--description <text>] [--data-root <folder>]
  nllagent agent list [--data-root <folder>]
  nllagent agent inspect --agent <name> [--data-root <folder>]
  nllagent issue list --agent <name> [--status <status>] [--data-root <folder>]
  nllagent feedback add --agent <name> --run <id> --type <type> --message <text>
    [--finding <id>] [--role <role>] [--data-root <folder>]
  nllagent model inspect

All semantic programs and structured run artifacts are ESM .mjs modules. Human-facing inputs and reports are Markdown.
Long options use --name value. The default foundation is core; use --foundation off for a deliberate alternate world.
`;

export { HELP };
