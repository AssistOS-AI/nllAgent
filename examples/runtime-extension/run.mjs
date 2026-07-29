import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileCircuit } from '../../src/circuit/compiler.mjs';
import { loadCircuitSource } from '../../src/circuit/module-loader.mjs';
import { compileMarkdown } from '../../src/longtext/compiler.mjs';
import { executeCircuit } from '../../src/runtime/scheduler.mjs';
import { createStandardRegistries } from '../../src/runtime/standard-operators.mjs';
import { loadAndInstallRuntimeExtension } from '../../src/runtime/extensions.mjs';

const root = fileURLToPath(new URL('./', import.meta.url));
const registries = createStandardRegistries();
await loadAndInstallRuntimeExtension(registries, resolve(root, 'paragraph-length.extension.mjs'));
const circuit = compileCircuit(
  await loadCircuitSource(resolve(root, 'paragraph-length.circuit.mjs')),
  registries
);
const program = compileMarkdown(await readFile(resolve(root, 'input.md'), 'utf8'));
const result = await executeCircuit(circuit, program, registries);
process.stdout.write(`${JSON.stringify({
  extension: registries.extensions[0],
  order: circuit.order,
  findings: result.outputs.findings,
  trace: result.trace
}, null, 2)}\n`);
