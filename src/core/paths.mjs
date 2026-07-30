import { relative, resolve, sep } from 'node:path';
import { NllError } from './errors.mjs';

const AGENT_NAME_PATTERN = /^[a-z][a-z0-9-]{0,62}$/u;

function validateAgentName(name) {
  if (!AGENT_NAME_PATTERN.test(name)) throw new NllError('invalid-agent-name', `Invalid agent name: ${name}`);
  return name;
}

function containedPath(root, ...parts) {
  const base = resolve(root);
  const candidate = resolve(base, ...parts);
  const rel = relative(base, candidate);
  if (rel === '..' || rel.startsWith(`..${sep}`) || rel === '') {
    if (rel !== '') throw new NllError('path-escape', `Path escapes workspace: ${candidate}`);
  }
  return candidate;
}

export { AGENT_NAME_PATTERN, containedPath, validateAgentName };
