import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeText } from '../../src/runtime/analyzer.mjs';
import { loadAndInstallRuntimeExtension } from '../../src/runtime/extensions.mjs';
import { createStandardRegistries } from '../../src/runtime/standard-operators.mjs';

const root = fileURLToPath(new URL('./', import.meta.url));

async function runAdvancedScenario() {
  const registries = createStandardRegistries();
  const extension = await loadAndInstallRuntimeExtension(
    registries,
    resolve(root, '../runtime-extension/paragraph-length.extension.mjs')
  );
  const text = await readFile(resolve(root, 'input.md'), 'utf8');
  return analyzeText({
    agentName: 'advanced-circuit-example',
    text,
    registries,
    release: {
      root,
      manifest: {
        version: '1.0.0-example',
        circuits: ['advanced-review.circuit.mjs'],
        runtimeExtensions: [{ id: extension.id, digest: extension.digest }]
      }
    }
  });
}

export { runAdvancedScenario };
