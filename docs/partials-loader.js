const PRIMARY_NAVIGATION = `<nav class="sidebar" aria-label="Primary documentation">
  <h2>nllAgent Documentation</h2>
  <p class="sidebar__section">Start</p>
  <a href="index.html">System overview</a>
  <a href="dsl.html">Why two DSLs</a>
  <a href="architecture.html">Architecture map</a>

  <p class="sidebar__section">LongTextJS · document side</p>
  <a href="longtextjs.html">The document program</a>
  <a href="translation.html">Compilation and translation</a>
  <a href="artifacts.html">Runs, evidence, and statuses</a>

  <p class="sidebar__section">CircuitJS · theory side</p>
  <a href="circuitjs.html">The theory program</a>
  <a href="operators.html">Operators and verification</a>
  <a href="benchmark.html">Benchmarks and qualification</a>

  <p class="sidebar__section">How they connect</p>
  <a href="connection.html">The observation contract</a>
  <a href="verification.html">Architecture of one verification</a>
  <a href="generation.html">CNL-constrained generation</a>
  <a href="learning-architecture.html">Architecture of learning</a>

  <p class="sidebar__section">Operate and extend</p>
  <a href="cli.html">CLI and workspaces</a>
  <a href="learning.html">Learning workflow</a>
  <a href="domains.html">Domain packages</a>
  <a href="security.html">Runtime boundaries</a>
  <a href="specsLoader.html?spec=matrix.md">DS specifications</a>
</nav>`;

function navigationFallback(source) {
  if (source === 'partials/nav.html') return PRIMARY_NAVIGATION;
  throw new Error(`No local fallback exists for documentation partial: ${source}`);
}

async function readPartial(source) {
  if (window.location.protocol === 'file:') return navigationFallback(source);
  const response = await fetch(source);
  if (!response.ok) throw new Error(`Unable to load documentation partial: ${source}`);
  return response.text();
}

function markCurrentPage() {
  const current = window.location.pathname.split('/').pop() || 'index.html';
  for (const link of document.querySelectorAll('.sidebar a')) {
    const target = new URL(link.getAttribute('href'), window.location.href);
    const targetName = target.pathname.split('/').pop();
    const samePage = targetName === current;
    const sameSpecViewer = current === 'specsLoader.html' && targetName === 'specsLoader.html';
    if (samePage || sameSpecViewer) link.setAttribute('aria-current', 'page');
  }
  const navigation = document.querySelector('.sidebar');
  if (navigation) navigation.scrollTop = 0;
}

async function loadPartials() {
  const targets = document.querySelectorAll('[data-include]');
  await Promise.all(Array.from(targets, async (target) => {
    const source = target.getAttribute('data-include');
    target.outerHTML = await readPartial(source);
  }));
  markCurrentPage();
}

loadPartials().catch((error) => {
  console.error(error);
});
