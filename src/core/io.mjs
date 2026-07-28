import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { dirname, extname, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { canonicalStringify } from './canonical.mjs';
import { NllError } from './errors.mjs';

async function ensureDirectory(directory) {
  await mkdir(directory, { recursive: true });
  return directory;
}

async function readJson(path) {
  let text;
  try {
    text = await readFile(path, 'utf8');
  } catch (error) {
    throw new NllError('file-read-failed', `Unable to read ${path}.`, { path }, { cause: error });
  }
  try {
    const value = JSON.parse(text);
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new TypeError('Expected a JSON object.');
    }
    return value;
  } catch (error) {
    throw new NllError('invalid-json', `Invalid JSON object in ${path}.`, { path }, { cause: error });
  }
}

async function readUtf8(path) {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    throw new NllError('file-read-failed', `Unable to read ${path}.`, { path }, { cause: error });
  }
}

async function readUtf8Strict(path) {
  let bytes;
  try {
    bytes = await readFile(path);
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch (error) {
    if (error instanceof TypeError) {
      throw new NllError('invalid-utf8', `File is not valid UTF-8: ${path}.`, { path }, { cause: error });
    }
    throw new NllError('file-read-failed', `Unable to read ${path}.`, { path }, { cause: error });
  }
}

async function atomicWrite(path, content) {
  await ensureDirectory(dirname(path));
  const temporary = `${path}.tmp-${process.pid}-${randomBytes(6).toString('hex')}`;
  await writeFile(temporary, content, { encoding: 'utf8', mode: 0o600 });
  await rename(temporary, path);
}

async function writeJson(path, value) {
  await atomicWrite(path, canonicalStringify(value));
}

async function assertMarkdownFile(path) {
  if (extname(path).toLowerCase() !== '.md') {
    throw new NllError('unsupported-format', 'Input must use the .md extension.', { path });
  }
  const metadata = await stat(path).catch(() => null);
  if (!metadata?.isFile()) throw new NllError('input-not-found', 'Input Markdown file does not exist.', { path });
}

function resolvePath(base, candidate) {
  return resolve(base, candidate);
}

export { assertMarkdownFile, atomicWrite, ensureDirectory, readJson, readUtf8, readUtf8Strict, resolvePath, writeJson };
