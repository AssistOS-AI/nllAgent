import { pathToFileURL } from 'node:url';
import { readFile } from 'node:fs/promises';
import { SemanticValue } from '../ontology/model.mjs';

const path = process.argv[2];
const expectedKind = process.argv[3] || 'semantic';
if (!path?.endsWith('.mjs')) throw new Error('Generated module must use .mjs.');
const source = await readFile(path, 'utf8');
if (expectedKind === 'materializer'
  && /(^|\n)\s*(?:import\b|export\b[^;\n]*\bfrom\s*['"])|\bimport\s*\(/u.test(source)) {
  throw new Error('Task materializer must be dependency-free and cannot import modules.');
}
const loaded = await import(pathToFileURL(path).href);
if (expectedKind === 'materializer' && typeof loaded.default !== 'function') {
  throw new Error('Task materializer must default-export a function.');
}
if (!(loaded.default instanceof SemanticValue) && typeof loaded.default !== 'function') {
  throw new Error('Generated module must export an opaque DSL value or a materializer function.');
}
process.stdout.write('accepted\n');
