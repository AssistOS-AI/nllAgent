import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { dirname, extname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { NllError } from './errors.mjs';

async function ensureDirectory(path) {
  await mkdir(path, { recursive: true });
  return path;
}

async function readUtf8(path) {
  return readFile(path, 'utf8');
}

async function atomicWrite(path, text) {
  await ensureDirectory(dirname(path));
  const temporary = `${path}.pending-${process.pid}-${Date.now()}`;
  await writeFile(temporary, text, 'utf8');
  await rename(temporary, path);
  return path;
}

async function loadModule(path) {
  if (extname(path) !== '.mjs') throw new NllError('module-extension-required', `Executable module must use .mjs: ${path}`);
  const info = await stat(path).catch(() => null);
  if (!info?.isFile()) throw new NllError('module-not-found', `Module not found: ${path}`);
  return import(`${pathToFileURL(path).href}?revision=${info.mtimeNs ?? info.mtimeMs}`);
}

function resolvePath(base, path) {
  return resolve(base, path);
}

export { atomicWrite, ensureDirectory, loadModule, readUtf8, resolvePath };
