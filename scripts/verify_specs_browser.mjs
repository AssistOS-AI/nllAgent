import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { access, readdir, stat } from 'node:fs/promises';
import http from 'node:http';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'docs');
const chromeCandidates = ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'];

async function executable() {
  for (const candidate of chromeCandidates) {
    if (await access(candidate).then(() => true, () => false)) return candidate;
  }
  throw new Error('A Chromium-compatible browser is required for the specification viewer test.');
}

function browserDump(chrome, url) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(chrome, [
      '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
      '--allow-file-access-from-files', '--virtual-time-budget=5000', '--dump-dom', url
    ], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => code === 0
      ? resolvePromise(stdout)
      : reject(new Error(`Browser exited with ${code}: ${stderr.slice(-2000)}`)));
  });
}

function contentType(path) {
  return ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.md': 'text/markdown' })[extname(path)] || 'application/octet-stream';
}

async function server() {
  const instance = http.createServer(async (request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1');
    const relativePath = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname).replace(/^\/+/, '');
    const path = resolve(root, relativePath);
    if (!path.startsWith(`${root}/`) || !(await stat(path).catch(() => null))?.isFile()) {
      response.writeHead(404).end('Not found');
      return;
    }
    response.writeHead(200, { 'content-type': `${contentType(path)}; charset=utf-8` });
    createReadStream(path).pipe(response);
  });
  await new Promise((resolvePromise, reject) => {
    instance.once('error', reject);
    instance.listen(0, '127.0.0.1', resolvePromise);
  });
  return instance;
}

function requireText(html, values, label) {
  for (const value of values) {
    if (!html.includes(value)) throw new Error(`${label} does not contain ${JSON.stringify(value)}.`);
  }
}

async function main() {
  const chrome = await executable();
  const instance = await server();
  try {
    const address = instance.address();
    const base = `http://127.0.0.1:${address.port}`;
    const matrix = await browserDump(chrome, `${base}/specsLoader.html?spec=matrix.md`);
    requireText(matrix, ['id="content" class="content" data-rendered="true"'], 'Rendered HTTP matrix');
    requireText(matrix, [
      'Specification Matrix', 'DS000', 'DS017', 'DS018', 'DS019', 'DS020', 'DS021', '<nav class="sidebar"',
      'specsLoader.html?spec=DS000-vision.md',
      'specsLoader.html?spec=DS018-translation-backends-achilles-coding-agent.md',
      'specsLoader.html?spec=DS019-constraint-natural-language-generation.md',
      'specsLoader.html?spec=DS020-query-first-circuit-authoring.md',
      'specsLoader.html?spec=DS021-foundation-ontology-validation.md'
    ], 'HTTP matrix');
    const catalogLinks = matrix.match(/id="spec-catalog"[\s\S]*?<\/nav>/u)?.[0]
      .match(/specsLoader\.html\?spec=DS\d{3}-/gu) || [];
    const specCount = (await readdir(resolve(root, 'specs')))
      .filter((name) => /^DS\d{3}-.*\.md$/u.test(name)).length;
    if (catalogLinks.length !== specCount) {
      throw new Error(`HTTP matrix catalog exposes ${catalogLinks.length} DS links instead of ${specCount}.`);
    }
    const circuit = await browserDump(chrome, `${base}/specsLoader.html?spec=DS008-circuitjs.md`);
    requireText(circuit, ['id="content" class="content" data-rendered="true"'], 'Rendered HTTP DS viewer');
    requireText(circuit, ['CircuitJS', 'DS008', 'DS000'], 'HTTP DS viewer');
    const local = new URL(pathToFileURL(resolve(root, 'specsLoader.html')));
    local.searchParams.set('spec', 'DS008-circuitjs.md');
    const fileView = await browserDump(chrome, local.href);
    requireText(fileView, ['id="content" class="content" data-rendered="true"'], 'Rendered file DS viewer');
    requireText(fileView, ['CircuitJS', 'DS008', 'DS017', 'DS018', '<nav class="sidebar"'], 'file DS viewer');
    const tutorial = await browserDump(chrome, pathToFileURL(resolve(root, 'verification.html')).href);
    requireText(tutorial, [
      '<nav class="sidebar"', 'aria-current="page"', 'data-processed="true"',
      'LongTextJS · document side', 'CircuitJS · theory side',
      'A production run, in the order it actually happens'
    ], 'file tutorial page');
    console.log('Verified documentation and specification rendering through HTTP and file URLs.');
  } finally {
    await new Promise((resolvePromise) => instance.close(resolvePromise));
  }
}

main().catch((error) => {
  console.error(error.message || String(error));
  process.exit(1);
});
