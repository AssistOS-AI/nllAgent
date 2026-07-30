import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const specificationsDirectory = resolve(repositoryRoot, 'docs/specs');

function parseFrontmatter(source) {
  const match = source.match(/^---\n([\s\S]*?)\n---\n/u);
  if (!match) return { metadata: new Map(), body: source };
  const metadata = new Map();
  for (const line of match[1].split('\n')) {
    const separator = line.indexOf(':');
    if (separator > 0) metadata.set(line.slice(0, separator).trim(), line.slice(separator + 1).trim());
  }
  return { metadata, body: source.slice(match[0].length) };
}

function titleFrom(body, fallback) {
  return body.match(/^#\s+(.+)$/mu)?.[1]?.trim() ?? fallback;
}

async function loadSpecifications() {
  const entries = await readdir(specificationsDirectory, { withFileTypes: true });
  const names = entries
    .filter((entry) => entry.isFile() && /^DS\d{3}-.*\.md$/u.test(entry.name))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
  const specifications = [];
  for (const fileName of names) {
    const source = await readFile(resolve(specificationsDirectory, fileName), 'utf8');
    const { metadata, body } = parseFrontmatter(source);
    const id = metadata.get('id');
    if (!/^DS\d{3}$/u.test(id ?? '')) throw new Error(`${fileName} has no valid id.`);
    specifications.push(Object.freeze({
      id,
      fileName,
      title: metadata.get('title') ?? titleFrom(body, fileName),
      status: metadata.get('status') ?? 'unknown',
      owner: metadata.get('owner') ?? 'repository',
      summary: metadata.get('summary') ?? ''
    }));
  }
  specifications.forEach((specification, index) => {
    const expected = `DS${String(index).padStart(3, '0')}`;
    if (specification.id !== expected) {
      throw new Error(`Specification order is not contiguous: expected ${expected}, received ${specification.id}.`);
    }
  });
  return specifications;
}

function render(specifications) {
  const rows = specifications.map((specification) =>
    `| [${specification.id}](${specification.fileName}) | ${specification.title} | ${specification.status} | ${specification.owner} | ${specification.summary.replaceAll('|', '\\|')} |`
  ).join('\n');
  return `# Specification Matrix

Generated from DS frontmatter by \`scripts/generate_specs_matrix.mjs\`. Edit the specifications, then rerun the
generator.

| Specification | Title | Status | Owner | Summary |
| --- | --- | --- | --- | --- |
${rows}
`;
}

const specifications = await loadSpecifications();
await writeFile(resolve(specificationsDirectory, 'matrix.md'), render(specifications));
process.stdout.write(`Updated the matrix for ${specifications.length} specifications.\n`);
