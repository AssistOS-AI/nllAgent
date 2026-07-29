import { randomBytes } from 'node:crypto';
import { cp, lstat, readdir, readFile, rename, rm } from 'node:fs/promises';
import { relative } from 'node:path';
import { compileCircuit, NOMINAL_TYPE_PATTERN } from '../circuit/compiler.mjs';
import { loadCircuitSource } from '../circuit/module-loader.mjs';
import { digestJson, sha256Bytes } from '../core/canonical.mjs';
import { NllError, invariant } from '../core/errors.mjs';
import { atomicWrite, readJson, writeJson } from '../core/io.mjs';
import { assertRealPathContained, containedPath } from '../core/paths.mjs';
import { runBenchmark } from '../benchmark/runner.mjs';
import { validateCnlPlanBody, validateRuleApplications } from '../generation/cnl.mjs';
import { FOUNDATION_PRODUCER, FOUNDATION_TYPES } from '../foundation/core-ontology.mjs';
import { STATUS_CEILINGS, guaranteeSatisfies } from '../runtime/guarantees.mjs';
import { validateRuntimeExtensionLocks } from '../runtime/extensions.mjs';
import { loadRelease, pathExists } from '../storage/agent-store.mjs';
import { withLock } from '../storage/locks.mjs';

async function listFiles(root) {
  const files = [];
  async function visit(directory) {
    for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const path = containedPath(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile()) files.push(path);
      else throw new NllError('release-unsafe-file', `Release candidates may contain only regular files and directories: ${path}`);
    }
  }
  await visit(root);
  return files;
}

async function validateCandidate(agent, version, registries) {
  const root = containedPath(agent.root, 'candidates', version);
  const metadata = await lstat(root).catch(() => null);
  if (!metadata?.isDirectory() || metadata.isSymbolicLink()) throw new NllError('candidate-not-found', `Candidate ${version} does not exist as a regular directory.`, { root });
  await assertRealPathContained(agent.root, root);
  const manifest = await readJson(containedPath(root, 'release.json'));
  invariant(manifest.kind === 'NaturalLanguageLinterRelease', 'invalid-release', 'Candidate manifest kind is invalid.');
  invariant(manifest.version === version, 'invalid-release', 'Candidate version does not match its directory.');
  invariant(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u.test(manifest.version), 'invalid-release', 'Candidate version must use semantic versioning.');
  invariant(typeof manifest.intendedUse === 'string' && manifest.intendedUse.trim(), 'invalid-release', 'Candidate requires an intendedUse statement.');
  invariant(Array.isArray(manifest.circuits) && manifest.circuits.length > 0, 'invalid-release', 'Candidate requires at least one circuit.');
  invariant(new Set(manifest.circuits).size === manifest.circuits.length, 'invalid-release', 'Candidate circuit paths must be unique.');
  invariant(manifest.planningCircuits === undefined || Array.isArray(manifest.planningCircuits),
    'invalid-release', 'planningCircuits must be an array.');
  const capabilityGapReport = manifest.capabilityGapReport
    ? await loadCapabilityGapReport(root, manifest.capabilityGapReport) : null;
  const allCircuitPaths = [...manifest.circuits, ...(manifest.planningCircuits || [])];
  invariant(new Set(allCircuitPaths).size === allCircuitPaths.length,
    'invalid-release', 'Validation and planning circuit paths must be unique.');
  const compiledCircuits = [];
  for (const circuitPath of manifest.circuits) {
    const path = containedPath(root, circuitPath);
    const file = await lstat(path).catch(() => null);
    invariant(file?.isFile() && !file.isSymbolicLink(), 'invalid-release', `Circuit ${circuitPath} must be a regular file.`);
    await assertRealPathContained(root, path);
    const compiled = compileCircuit(await loadCircuitSource(path), registries);
    invariant((compiled.circuit.purpose || 'validation') === 'validation', 'invalid-release', `Validation circuit ${compiled.circuit.id} has the wrong purpose.`);
    invariant(typeof compiled.circuit.description === 'string' && compiled.circuit.description.trim(), 'invalid-release', `Circuit ${compiled.circuit.id} requires a description.`);
    invariant(compiled.circuit.sourceRuleReferences?.length > 0, 'invalid-release', `Circuit ${compiled.circuit.id} requires source rule references.`);
    compiledCircuits.push(compiled);
  }
  const compiledPlanningCircuits = [];
  for (const circuitPath of manifest.planningCircuits || []) {
    const path = containedPath(root, circuitPath);
    const file = await lstat(path).catch(() => null);
    invariant(file?.isFile() && !file.isSymbolicLink(), 'invalid-release', `Generation circuit ${circuitPath} must be a regular file.`);
    await assertRealPathContained(root, path);
    const compiled = compileCircuit(await loadCircuitSource(path), registries);
    invariant(compiled.circuit.purpose === 'planning', 'invalid-release',
      `Planning circuit ${compiled.circuit.id} requires purpose planning.`);
    invariant(typeof compiled.circuit.description === 'string' && compiled.circuit.description.trim(),
      'invalid-release', `Planning circuit ${compiled.circuit.id} requires a description.`);
    invariant(compiled.circuit.sourceRuleReferences?.length > 0,
      'invalid-release', `Planning circuit ${compiled.circuit.id} requires source rule references.`);
    compiledPlanningCircuits.push(compiled);
  }
  const extractionProfiles = [];
  for (const profilePath of manifest.extractionProfiles || []) {
    const path = containedPath(root, profilePath);
    await assertRealPathContained(root, path);
    const profile = await readJson(path);
    invariant(typeof profile.id === 'string' && typeof profile.outputType === 'string', 'invalid-release', 'Extraction profiles require id and outputType.', { profilePath });
    invariant(NOMINAL_TYPE_PATTERN.test(profile.outputType), 'invalid-release', 'Extraction outputType must be nominal and versioned.', { profilePath });
    extractionProfiles.push(profile);
  }
  const compatibility = manifest.compatibilityProfile
    ? await readJson(containedPath(root, manifest.compatibilityProfile)) : {};
  if (manifest.compatibilityProfile) {
    invariant(typeof compatibility.id === 'string' && Array.isArray(compatibility.formats) && Array.isArray(compatibility.languages), 'invalid-release', 'Compatibility profile requires id, formats, and languages.');
  }
  const authority = manifest.authorityMap || await pathExists(containedPath(root, 'authority-map.json'))
    ? await readJson(containedPath(root, manifest.authorityMap || 'authority-map.json')) : null;
  const authoritySources = new Set((authority?.rules || []).map((rule) => rule.source));
  const allCompiledCircuits = [...compiledCircuits, ...compiledPlanningCircuits];
  const runtimeExtensions = validateRuntimeExtensionLocks(
    manifest, allCompiledCircuits, registries, { requireExact: true }
  );
  invariant(new Set(allCompiledCircuits.map((compiled) => compiled.circuit.id)).size === allCompiledCircuits.length,
    'invalid-release', 'Validation and planning circuit ids must be unique.');
  for (const compiled of allCompiledCircuits) {
    for (const source of compiled.circuit.sourceRuleReferences) {
      invariant(authoritySources.has(source), 'invalid-release', `Circuit ${compiled.circuit.id} references authority ${source} absent from the authority map.`);
    }
  }
  validateCnlPlanningAuthority(compiledPlanningCircuits, authority);
  const alignment = validateObservationAlignment(allCompiledCircuits, extractionProfiles, manifest.adapters || []);
  invariant(alignment.status === 'aligned', 'invalid-release', 'Candidate has critical CircuitJS ports without compatible LongTextJS producers.', alignment);
  const snapshot = await candidateSnapshot(root);
  return {
    root, manifest, manifestDigest: digestJson(manifest), compiledCircuits, compiledPlanningCircuits,
    extractionProfiles, compatibility, authority, alignment, snapshot, runtimeExtensions,
    capabilityGapReport
  };
}

async function loadCapabilityGapReport(root, relativePath) {
  invariant(typeof relativePath === 'string' && relativePath.length > 0,
    'invalid-release', 'capabilityGapReport must be a repository-relative file path.');
  const path = containedPath(root, relativePath);
  const file = await lstat(path).catch(() => null);
  invariant(file?.isFile() && !file.isSymbolicLink(), 'invalid-release',
    'capabilityGapReport must name a regular file.');
  await assertRealPathContained(root, path);
  return validateCapabilityGapReport(await readJson(path));
}

function validateCapabilityGapReport(report) {
  invariant(report?.kind === 'CapabilityGapReport' && report.schemaVersion === 1,
    'invalid-release', 'Capability-gap report requires kind CapabilityGapReport and schemaVersion 1.');
  invariant(Array.isArray(report.gaps) && report.gaps.length > 0,
    'invalid-release', 'Capability-gap report requires at least one applicable gap.');
  const identities = new Set();
  for (const [index, gap] of report.gaps.entries()) {
    const label = `Capability gap ${index}`;
    invariant(gap && typeof gap === 'object' && !Array.isArray(gap),
      'invalid-release', `${label} must be an object.`);
    invariant(/^serious-issue:[1-9]\d*$/u.test(gap.issue || '') && !identities.has(gap.issue),
      'invalid-release', `${label} requires a unique serious-issue:<number> identity.`);
    identities.add(gap.issue);
    invariant(['resolved', 'mitigated', 'blocked'].includes(gap.status),
      'invalid-release', `${label} has invalid status ${gap.status}.`);
    for (const field of ['summary', 'reproducer', 'guaranteeCeiling']) {
      invariant(typeof gap[field] === 'string' && gap[field].trim(),
        'invalid-release', `${label} requires ${field}.`);
    }
    invariant(Array.isArray(gap.evidence) && gap.evidence.length > 0
      && gap.evidence.every((item) => typeof item === 'string' && item.length > 0),
    'invalid-release', `${label} requires non-empty evidence references.`);
  }
  return report;
}

function validateCnlPlanningAuthority(planningCircuits, authority) {
  const authorityRules = new Map((authority?.rules || []).map((rule) => [rule.id, rule]));
  const authoritySources = new Set((authority?.rules || []).map((rule) => rule.source));
  const applications = [];
  for (const compiled of planningCircuits) {
    const planNodes = compiled.circuit.nodes.filter((node) => node.operator === 'planning.cnl-plan@1');
    invariant(planNodes.length > 0, 'invalid-release',
      `Planning circuit ${compiled.circuit.id} must construct its published CNL plan through planning.cnl-plan@1.`);
    for (const node of planNodes) {
      invariant(Array.isArray(node.inputs?.appliedRules) && node.inputs.appliedRules.length > 0,
        'invalid-release', `Planning node ${node.id} must declare the authority rules it applies.`);
      invariant(Array.isArray(node.inputs?.sourceRuleReferences) && node.inputs.sourceRuleReferences.length > 0,
        'invalid-release', `Planning node ${node.id} must declare authority references for its applied rules.`);
      invariant(node.inputs.sourceRuleReferences.every((source) => authoritySources.has(source)),
        'invalid-release', `Planning node ${node.id} declares an authority reference absent from the authority map.`);
      invariant(Array.isArray(node.inputs?.ruleApplications) && node.inputs.ruleApplications.length > 0,
        'invalid-release', `Planning node ${node.id} must map applied rules to concrete plan locations.`);
      const witnessedRules = new Set(node.inputs.ruleApplications.map((application) => application?.rule));
      invariant(node.inputs.ruleApplications.every((application) => application
        && typeof application.rule === 'string'
        && Array.isArray(application.planLocations) && application.planLocations.length > 0),
      'invalid-release', `Planning node ${node.id} has an invalid rule-to-plan witness.`);
      invariant(node.inputs.appliedRules.every((rule) => witnessedRules.has(rule))
        && [...witnessedRules].every((rule) => node.inputs.appliedRules.includes(rule)),
      'invalid-release', `Planning node ${node.id} must witness exactly its applied rules.`);
      const validationPlan = validateCnlPlanBody({
        ...node.inputs.plan,
        sourceIdea: 'Publication probe for rule-to-plan location validation.'
      }, { circuit: compiled.circuit.id, node: node.id });
      validateRuleApplications(
        node.inputs.ruleApplications, validationPlan, node.inputs.appliedRules,
        { circuit: compiled.circuit.id, node: node.id }
      );
      for (const rule of node.inputs.appliedRules) {
        invariant(authorityRules.has(rule), 'invalid-release',
          `Planning circuit ${compiled.circuit.id} applies unknown authority rule ${rule}.`);
        invariant(node.inputs.sourceRuleReferences.includes(authorityRules.get(rule).source),
          'invalid-release', `Planning circuit ${compiled.circuit.id} does not cite the authority source for ${rule}.`);
        applications.push({ circuit: compiled.circuit.id, node: node.id, rule });
      }
    }
  }
  return applications;
}

const STRUCTURAL_PRODUCERS = Object.freeze([
  'document.block@1', 'document.paragraph@1', 'document.heading@1', 'document.sentence@1',
  'document.line@1', 'document.list-item@1', 'document.quote@1',
  'document.code-block@1', 'document.thematic-break@1'
]);

function validateObservationAlignment(compiledCircuits, extractionProfiles, adapters = []) {
  const producers = new Map();
  const addProducer = (producer) => {
    if (!producers.has(producer.type)) producers.set(producer.type, []);
    producers.get(producer.type).push(producer);
  };
  for (const type of STRUCTURAL_PRODUCERS) addProducer({
    id: 'markdown-structural@1', type, statuses: ['extracted'], coverage: 'closed-world'
  });
  for (const type of FOUNDATION_TYPES) addProducer({
    id: FOUNDATION_PRODUCER, type, statuses: ['extracted'], coverage: 'open-world'
  });
  for (const profile of extractionProfiles) addProducer({
    id: profile.id, type: profile.outputType, statuses: ['proposed'],
    coverage: profile.coverage === 'closed' ? 'closed-world' : 'open-world'
  });
  for (const adapter of adapters) if (adapter?.to) addProducer({
    id: adapter.id || 'declared-adapter', type: adapter.to,
    statuses: adapter.statuses || ['derived'], coverage: adapter.coverage || 'open-world'
  });
  const ports = compiledCircuits.flatMap((compiled) => compiled.observationContract.ports.map((port) => {
    const matches = port.types.flatMap((type) => producers.get(type) || []);
    const statusCompatible = !port.statuses.length || matches.some((producer) =>
      producer.statuses.some((status) => port.statuses.includes(status)));
    const coverageCompatible = port.coverage !== 'closed-world'
      || matches.some((producer) => producer.coverage === 'closed-world');
    const guaranteeCompatible = !port.guarantee || matches.some((producer) =>
      producer.statuses.some((status) => guaranteeSatisfies(STATUS_CEILINGS[status] || 'review-required', port.guarantee)));
    const status = matches.length && statusCompatible && coverageCompatible && guaranteeCompatible ? 'satisfied'
      : port.critical ? 'missing' : 'optional-missing';
    return { circuit: compiled.circuit.id, ...port, status, producers: matches, guaranteeCompatible };
  }));
  return {
    kind: 'OntologyAlignmentReport', schemaVersion: 1,
    status: ports.some((port) => port.status === 'missing') ? 'misaligned' : 'aligned',
    producers: [...producers.values()].flat(), ports
  };
}

async function candidateSnapshot(root) {
  const entries = [];
  for (const path of await listFiles(root)) {
    entries.push({ path: relative(root, path).replaceAll('\\', '/'), digest: sha256Bytes(await readFile(path)) });
  }
  return entries;
}

async function benchmarkSnapshot(agent) {
  return candidateSnapshot(containedPath(agent.root, 'benchmark'));
}

async function publishRelease(agent, version, registries, options = {}) {
  return withLock(containedPath(agent.root, 'locks', 'release.lock'), { operation: `publish:${version}` }, async () => {
  const candidate = await validateCandidate(agent, version, registries);
  const initialBenchmarkSnapshot = await benchmarkSnapshot(agent);
  const benchmark = await runBenchmark(agent, candidate, registries, options);
  if (!benchmark.passed) throw new NllError('publication-failed', `Candidate ${version} failed its pre-publication benchmark.`, benchmark);
  const finalBenchmarkSnapshot = await benchmarkSnapshot(agent);
  if (digestJson(finalBenchmarkSnapshot) !== digestJson(initialBenchmarkSnapshot)) {
    throw new NllError('benchmark-changed-during-publication', 'Agent benchmark files changed while publication checks were running.');
  }
  const finalSnapshot = await candidateSnapshot(candidate.root);
  if (digestJson(finalSnapshot) !== digestJson(candidate.snapshot)) {
    throw new NllError('candidate-changed-during-publication', `Candidate ${version} changed while publication checks were running.`);
  }
  const releaseRoot = containedPath(agent.root, 'releases', version);
  if (await pathExists(releaseRoot)) throw new NllError('release-exists', `Release ${version} already exists.`);
  const stagingRoot = containedPath(
    agent.root, 'releases', `.publishing-${version}-${process.pid}-${randomBytes(6).toString('hex')}`
  );
  try {
    await cp(candidate.root, stagingRoot, { recursive: true, errorOnExist: true, force: false });
    const copiedSnapshot = await candidateSnapshot(stagingRoot);
    if (digestJson(copiedSnapshot) !== digestJson(finalSnapshot)) {
      throw new NllError('candidate-changed-during-copy', `Candidate ${version} changed while its release snapshot was copied.`);
    }
    const benchmarkRoot = containedPath(agent.root, 'benchmark');
    const releasedBenchmarkRoot = containedPath(stagingRoot, 'benchmark-snapshot');
    if (await pathExists(releasedBenchmarkRoot)) {
      throw new NllError('invalid-release', 'Candidate reserves the trusted benchmark-snapshot path.');
    }
    await cp(benchmarkRoot, releasedBenchmarkRoot, { recursive: true, errorOnExist: true, force: false });
    const copiedBenchmarkSnapshot = await candidateSnapshot(releasedBenchmarkRoot);
    if (digestJson(copiedBenchmarkSnapshot) !== digestJson(finalBenchmarkSnapshot)) {
      throw new NllError('benchmark-changed-during-copy', 'Agent benchmark files changed while their release snapshot was copied.');
    }
    await writeJson(containedPath(stagingRoot, 'benchmark-results.json'), benchmark);
    const semantic = await computeSemanticDiff(agent, { ...candidate, root: stagingRoot });
    await writeJson(containedPath(stagingRoot, 'semantic-diff.json'), semantic.diff);
    await writeJson(containedPath(stagingRoot, 'impact-map.json'), semantic.impactMap);
    await writeJson(containedPath(stagingRoot, 'observation-contracts.json'), {
      kind: 'ObservationContractBundle', schemaVersion: 1,
      contracts: [...candidate.compiledCircuits, ...candidate.compiledPlanningCircuits]
        .map((compiled) => compiled.observationContract)
    });
    const queryFirstArtifacts = [...candidate.compiledCircuits, ...candidate.compiledPlanningCircuits]
      .filter((compiled) => compiled.queryContract)
      .map((compiled) => ({
        circuit: `${compiled.circuit.id}@${compiled.circuit.version}`,
        author: compiled.author,
        authorDigest: compiled.authorDigest,
        generatedGraph: compiled.circuit,
        generatedGraphDigest: compiled.generatedGraphDigest,
        queryContract: compiled.queryContract,
        sourceMap: compiled.sourceMap,
        analysis: { status: 'passed', diagnostics: [] }
      }));
    if (queryFirstArtifacts.length) {
      await writeJson(containedPath(stagingRoot, 'query-first-artifacts.json'), {
        kind: 'QueryFirstArtifactBundle', schemaVersion: 1, circuits: queryFirstArtifacts
      });
    }
    await writeJson(containedPath(stagingRoot, 'alignment-report.json'), candidate.alignment);
    const files = [];
    for (const path of await listFiles(stagingRoot)) {
      const relativePath = relative(stagingRoot, path).replaceAll('\\', '/');
      if (relativePath === 'release.json' || relativePath === 'publication.json') continue;
      files.push({ path: relativePath, digest: sha256Bytes(await readFile(path)) });
    }
    const manifest = {
      ...candidate.manifest, status: 'published', files,
      benchmarkSnapshot: 'benchmark-snapshot', publishedBy: 'manual-release@1'
    };
    await writeJson(containedPath(stagingRoot, 'release.json'), manifest);
    const result = {
      kind: 'ReleasePublicationResult', schemaVersion: 1, status: 'published', release: version,
      manifestDigest: digestJson(manifest), benchmark: benchmark.summary,
      alignment: { status: candidate.alignment.status, ports: candidate.alignment.ports.length },
      checks: [
        'manifest', 'circuit-static-analysis', 'operator-linking', 'verification-dominance',
        ...(candidate.runtimeExtensions.length ? ['runtime-extension-digest-locking'] : []),
        ...(candidate.capabilityGapReport ? ['capability-gap-report'] : []),
        'compatibility-profile', 'observation-contract-producer-alignment',
        'planning-circuit-and-cnl-authority-linking',
        ...(queryFirstArtifacts.length ? ['query-first-normalization-and-source-map'] : []),
        'available-agent-benchmarks', 'benchmark-snapshot-stability',
        'candidate-snapshot-stability', 'copied-snapshot-integrity',
        'semantic-diff-and-impact-map', 'release-file-digests'
      ]
    };
    await writeJson(containedPath(stagingRoot, 'publication.json'), result);
    await rename(stagingRoot, releaseRoot);
    const release = await loadRelease(agent, version);
    const pointer = {
      kind: 'ActiveReleasePointer', schemaVersion: 1,
      release: version, manifestDigest: release.manifestDigest
    };
    await writeJson(containedPath(agent.root, 'active-release.json'), pointer);
    return { release, result, pointer };
  } catch (error) {
    await rm(stagingRoot, { recursive: true, force: true });
    throw error;
  }
  });
}

async function computeSemanticDiff(agent, candidate) {
  const previous = candidate.manifest.lineage ? await loadRelease(agent, candidate.manifest.lineage) : null;
  const readCircuits = async (release) => {
    const values = new Map();
    for (const path of [...(release?.manifest.circuits || []), ...(release?.manifest.planningCircuits || [])]) {
      const circuit = await loadCircuitSource(containedPath(release.root, path));
      values.set(circuit.id, { digest: digestJson(circuit), circuit });
    }
    return values;
  };
  const [before, after] = await Promise.all([readCircuits(previous), readCircuits(candidate)]);
  const ids = [...new Set([...before.keys(), ...after.keys()])].sort();
  const circuits = ids.map((id) => ({
    id,
    change: !before.has(id) ? 'added' : !after.has(id) ? 'removed'
      : before.get(id).digest === after.get(id).digest ? 'unchanged' : 'changed',
    beforeDigest: before.get(id)?.digest || null,
    afterDigest: after.get(id)?.digest || null
  }));
  const changed = circuits.filter((item) => item.change !== 'unchanged');
  const affectedRules = [...new Set(changed.flatMap((item) =>
    (after.get(item.id)?.circuit || before.get(item.id)?.circuit)?.sourceRuleReferences || []))].sort();
  const profileDigest = async (release) => release?.manifest.compatibilityProfile
    ? digestJson(await readJson(containedPath(release.root, release.manifest.compatibilityProfile))) : null;
  const [beforeProfile, afterProfile] = await Promise.all([profileDigest(previous), profileDigest(candidate)]);
  return {
    diff: {
      kind: 'SemanticDiff', schemaVersion: 1, from: previous?.manifest.version || null,
      to: candidate.manifest.version, circuits,
      compatibilityChanged: beforeProfile !== afterProfile,
      knownLimitations: candidate.manifest.knownLimitations || []
    },
    impactMap: {
      kind: 'ImpactMap', schemaVersion: 1, release: candidate.manifest.version,
      affectedCircuits: changed.map((item) => item.id), affectedRules,
      reanalysisRequired: changed.length > 0
    }
  };
}

export {
  benchmarkSnapshot,
  candidateSnapshot,
  computeSemanticDiff,
  listFiles,
  publishRelease,
  validateCapabilityGapReport,
  validateCnlPlanningAuthority,
  validateCandidate,
  validateObservationAlignment
};
