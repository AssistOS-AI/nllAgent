import { relative, resolve, sep } from 'node:path';
import { realpath } from 'node:fs/promises';
import { NllError } from './errors.mjs';

const AGENT_NAME_PATTERN = /^[a-z][a-z0-9-]{0,62}$/;

function validateAgentName(name) {
  if (!AGENT_NAME_PATTERN.test(name || '')) {
    throw new NllError('invalid-agent-name', 'Agent name must match ^[a-z][a-z0-9-]{0,62}$.', { name });
  }
  return name;
}

function isContained(root, candidate) {
  const relation = relative(root, candidate);
  return relation === '' || (!relation.startsWith(`..${sep}`) && relation !== '..' && !relation.startsWith(sep));
}

function containedPath(root, ...segments) {
  const absoluteRoot = resolve(root);
  const candidate = resolve(absoluteRoot, ...segments);
  if (!isContained(absoluteRoot, candidate)) {
    throw new NllError('path-escape', 'Resolved path escapes its configured root.', { root: absoluteRoot, candidate });
  }
  return candidate;
}

async function assertRealPathContained(root, candidate) {
  const [realRoot, realCandidate] = await Promise.all([realpath(root), realpath(candidate)]);
  if (!isContained(realRoot, realCandidate)) {
    throw new NllError('symlink-escape', 'Real path escapes its configured root.', { root: realRoot, candidate: realCandidate });
  }
  return realCandidate;
}

export { AGENT_NAME_PATTERN, assertRealPathContained, containedPath, isContained, validateAgentName };
