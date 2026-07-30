import { NllError } from '../core/errors.mjs';

const COMMAND_OPTIONS = new Map([
  ['run', ['agent', 'input', 'output', 'foundation', 'data-root', 'no-llm', 'translator', 'codex-bin']],
  ['plan', ['agent', 'input', 'output', 'realize-output', 'foundation', 'max-revisions', 'data-root', 'no-llm', 'translator', 'codex-bin']],
  ['benchmark', ['agent', 'foundation', 'data-root', 'no-llm', 'translator', 'codex-bin']],
  ['learn', ['agent', 'rules', 'data-root', 'codex-bin']],
  ['agent init', ['agent', 'description', 'language', 'data-root']],
  ['agent list', ['data-root']],
  ['agent inspect', ['agent', 'data-root']],
  ['issue list', ['agent', 'status', 'data-root']],
  ['feedback add', ['agent', 'run', 'type', 'message', 'finding', 'role', 'data-root']],
  ['model inspect', []]
]);

function parseArguments(argv) {
  const positionals = [];
  const options = Object.create(null);
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) { positionals.push(token); continue; }
    const name = token.slice(2);
    if (Object.hasOwn(options, name)) throw new NllError('invalid-arguments', `Duplicate option --${name}.`);
    if (['help', 'no-llm'].includes(name)) { options[name] = true; continue; }
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new NllError('invalid-arguments', `Option --${name} requires a value.`);
    options[name] = value;
    index += 1;
  }
  return Object.freeze({ positionals: Object.freeze(positionals), options });
}

function commandKey(positionals) {
  if (COMMAND_OPTIONS.has(positionals[0])) return positionals[0];
  return positionals.slice(0, 2).join(' ');
}

function validateCommandArguments(positionals, options) {
  const key = commandKey(positionals);
  const allowed = COMMAND_OPTIONS.get(key);
  if (!allowed) throw new NllError('invalid-arguments', `Unknown command: ${positionals.join(' ')}`);
  if (positionals.length !== key.split(' ').length) throw new NllError('invalid-arguments', `${key} accepts no extra positional arguments.`);
  const unknown = Object.keys(options).filter((name) => name !== 'help' && !allowed.includes(name));
  if (unknown.length) throw new NllError('invalid-arguments', `Unknown option for ${key}: --${unknown[0]}.`);
  if (options.foundation && !['core', 'off'].includes(options.foundation)) throw new NllError('invalid-arguments', '--foundation must be core or off.');
  if (options.translator && !['auto', 'achilles', 'codex', 'none'].includes(options.translator)) throw new NllError('invalid-arguments', 'Unknown translator.');
  if (options['max-revisions'] !== undefined && (!Number.isInteger(Number(options['max-revisions'])) || Number(options['max-revisions']) < 0)) {
    throw new NllError('invalid-arguments', '--max-revisions must be a non-negative integer.');
  }
}

function requireOption(options, name) {
  if (!options[name]) throw new NllError('invalid-arguments', `Missing required option --${name}.`);
  return options[name];
}

export { COMMAND_OPTIONS, commandKey, parseArguments, requireOption, validateCommandArguments };
