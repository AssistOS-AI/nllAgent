const HELP = `NaturalLanguageLinterAgent

Training:
  nllagent train --agent <name> --theory <rules.md> [--theory <more-rules.md> ...]
    [--codex-bin <path>] [--data-root <folder>]

Analysis:
  nllagent analyze --agent <name> --task <task-id> --input <document.md>
    [--output <report.md>] [--target findings|plan] [--foundation core|off]
    [--codex-bin <path>] [--data-root <folder>]

Inspection and deterministic validation:
  nllagent benchmark --agent <name> [--foundation core|off] [--data-root <folder>]
  nllagent agent list [--data-root <folder>]
  nllagent agent inspect --agent <name> [--build <build-id>] [--data-root <folder>]
  nllagent task list [--data-root <folder>]
  nllagent task inspect --task <task-id> [--data-root <folder>]
  nllagent issue list --agent <name> [--status <status>] [--data-root <folder>]
  nllagent feedback add --agent <name> --run <id> --type <type> --message <text>
    [--finding <id>] [--role <role>] [--data-root <folder>]

The training command uses Codex with nll-train-agent and an independent nll-review-and-repair pass, then promotes only
a candidate whose ESM modules, tests, and semantic benchmarks pass. Analysis always uses nll-analyze-task to create
task-local LongTextJS, followed by deterministic execution of the exact pinned agent build. There is no translator or
direct-model selection mode.
`;

export { HELP };
