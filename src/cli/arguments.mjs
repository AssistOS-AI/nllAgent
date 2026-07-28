import { NllError } from '../core/errors.mjs';

const COMMAND_OPTIONS = new Map([
  ['run', ['agent', 'input', 'output', 'release', 'data-root', 'json', 'no-llm', 'translator', 'codex-bin']],
  ['plan', ['agent', 'input', 'output', 'realize-output', 'release', 'max-revisions', 'data-root', 'json', 'no-llm', 'translator', 'codex-bin']],
  ['learn', ['agent', 'rules', 'data-root', 'json', 'no-llm', 'translator', 'codex-bin']],
  ['benchmark', ['agent', 'release', 'data-root', 'json', 'no-llm', 'translator', 'codex-bin']],
  ['agent init', ['agent', 'description', 'language', 'data-root', 'json']],
  ['agent list', ['data-root', 'json']],
  ['agent inspect', ['agent', 'data-root', 'json']],
  ['issue list', ['agent', 'status', 'data-root', 'json']],
  ['feedback add', ['agent', 'run', 'type', 'message', 'finding', 'role', 'data-root', 'json']],
  ['release publish', ['agent', 'candidate', 'data-root', 'json', 'no-llm', 'translator', 'codex-bin']],
  ['model inspect', ['json']]
]);
const TRANSLATION_BACKENDS = new Set(['auto', 'achilles', 'codex', 'none']);

function parseArguments(argv) {
  const positionals = [];
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      positionals.push(token);
      continue;
    }
    const name = token.slice(2);
    if (['json', 'no-llm', 'help'].includes(name)) {
      options[name] = true;
      continue;
    }
    const value = argv[index + 1];
    if (value === undefined || value.startsWith('--')) throw new NllError('invalid-arguments', `Option --${name} requires a value.`);
    options[name] = value;
    index += 1;
  }
  return { positionals, options };
}

function validateCommandArguments(positionals, options) {
  const key = COMMAND_OPTIONS.has(positionals[0])
    ? positionals[0]
    : positionals.slice(0, 2).join(' ');
  const allowed = COMMAND_OPTIONS.get(key);
  if (!allowed) return;
  const expectedPositionals = key.split(' ').length;
  if (positionals.length !== expectedPositionals) {
    throw new NllError('invalid-arguments', `Command ${key} does not accept extra positional arguments.`);
  }
  const unknown = Object.keys(options).filter((name) => name !== 'help' && !allowed.includes(name));
  if (unknown.length) {
    throw new NllError('invalid-arguments', `Unknown option for ${key}: --${unknown[0]}.`, { command: key, unknown });
  }
  if (options.translator && !TRANSLATION_BACKENDS.has(options.translator)) {
    throw new NllError('invalid-arguments', `Unknown translation backend ${options.translator}.`);
  }
  if (options['no-llm'] && options.translator && options.translator !== 'none') {
    throw new NllError('invalid-arguments', '--no-llm conflicts with an enabled --translator value.');
  }
  if (key === 'plan' && options['max-revisions'] !== undefined) {
    const maximum = Number(options['max-revisions']);
    if (!Number.isInteger(maximum) || maximum < 0 || maximum > 10) {
      throw new NllError('invalid-arguments', '--max-revisions must be an integer between 0 and 10.');
    }
    if (!options['realize-output']) {
      throw new NllError('invalid-arguments', '--max-revisions is meaningful only with --realize-output.');
    }
  }
}

function requireOption(options, name) {
  if (!options[name]) throw new NllError('invalid-arguments', `Missing required option --${name}.`);
  return options[name];
}

export {
  COMMAND_OPTIONS,
  TRANSLATION_BACKENDS,
  parseArguments,
  requireOption,
  validateCommandArguments
};
