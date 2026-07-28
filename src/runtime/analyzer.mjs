import { compileCircuit } from '../circuit/compiler.mjs';
import { loadCircuitSource } from '../circuit/module-loader.mjs';
import { readJson } from '../core/io.mjs';
import { containedPath } from '../core/paths.mjs';
import { compileMarkdown } from '../longtext/compiler.mjs';
import { materializeModelProfiles } from '../longtext/model-materializer.mjs';
import { renderReport } from '../report/markdown-renderer.mjs';
import { createCnlAuditReport } from '../report/cnl-audit.mjs';
import { evaluateCompatibility } from './compatibility.mjs';
import { executeCircuit } from './scheduler.mjs';

async function loadReleaseCircuits(release, registries) {
  const circuits = [];
  for (const relativePath of release.manifest.circuits || []) {
    const source = await loadCircuitSource(containedPath(release.root, relativePath));
    circuits.push(compileCircuit(source, registries));
  }
  return circuits;
}

async function loadCompatibilityProfile(release) {
  if (!release.manifest.compatibilityProfile) return {};
  return readJson(containedPath(release.root, release.manifest.compatibilityProfile));
}

async function loadExtractionProfiles(release) {
  const profiles = [];
  for (const relativePath of release.manifest.extractionProfiles || []) {
    profiles.push(await readJson(containedPath(release.root, relativePath)));
  }
  return profiles;
}

async function analyzeText({ agentName, text, release, registries, language = 'und', budgets = {}, cache = null }) {
  const program = compileMarkdown(text, { language, programId: `longtext:${agentName}:input` });
  const circuits = await loadReleaseCircuits(release, registries);
  const demandedTypes = new Set(circuits.flatMap((compiled) =>
    Object.values(compiled.circuit.inputs).flatMap((port) => port.types || [port.type]).filter(Boolean)));
  const extractionProfiles = await loadExtractionProfiles(release);
  const modelMaterialization = await materializeModelProfiles(program, extractionProfiles, demandedTypes, registries, { ...budgets, cache });
  const modelCaptures = [...modelMaterialization.captures];
  const profile = await loadCompatibilityProfile(release);
  const compatibility = evaluateCompatibility(program, circuits, profile);
  const circuitResults = [];
  const findings = [];
  const verifierRejections = [];
  const unresolvedDemands = [];
  if (compatibility.status !== 'incompatible') {
    const active = new Set(compatibility.activeCircuits);
    for (const circuit of circuits.filter((item) => active.has(item.circuit.id))) {
      let result;
      const maximumRounds = budgets.dynamicDemandRounds ?? 2;
      for (let round = 0; round <= maximumRounds; round += 1) {
        result = await executeCircuit(circuit, program, registries, { ...budgets, cache });
        const demands = Object.values(result.nodeOutputs).flatMap((value) => collectDemands(value));
        if (!demands.length) break;
        if (round === maximumRounds) {
          unresolvedDemands.push(...demands.map((demand) => ({ ...demand, reason: demand.reason || 'Dynamic demand round budget exhausted.' })));
          break;
        }
        const types = new Set(demands.map((demand) => demand.type).filter(Boolean));
        const extra = await materializeModelProfiles(program, extractionProfiles, types, registries, { ...budgets, cache });
        modelCaptures.push(...extra.captures);
        if (extra.materialized === 0) {
          unresolvedDemands.push(...demands);
          break;
        }
      }
      circuitResults.push(result);
      const values = Object.values(result.outputs);
      for (const value of values) if (Array.isArray(value) && value.every((item) => item?.kind === 'Finding')) findings.push(...value);
      for (const value of Object.values(result.nodeOutputs)) if (Array.isArray(value)) {
        verifierRejections.push(...value.filter((item) => item?.verifierResult?.status === 'reject'));
      }
    }
  }
  const criticalIncomplete = unresolvedDemands.some((demand) => demand.critical !== false);
  const uniqueFindings = [...new Map(findings.map((finding) => [finding.id, finding])).values()];
  findings.length = 0;
  findings.push(...uniqueFindings);
  const conflicts = findFindingConflicts(findings);
  const status = compatibility.status === 'incompatible'
    ? 'stopped-incompatible'
    : criticalIncomplete ? 'stopped-incomplete'
      : conflicts.length ? 'review-required-conflict'
      : compatibility.status === 'compatible-with-limits' || unresolvedDemands.length ? 'reported-with-limits' : 'reported';
  if (criticalIncomplete) findings.length = 0;
  const model = createCnlAuditReport({
    agent: agentName, release: release.manifest.version, sourceDigest: program.source.revision,
    status, compatibility, coverage: program.coverage, findings, conflicts,
    limitations: [
      ...(compatibility.status === 'compatible-with-limits' ? ['The compatibility contract contains non-critical partial obligations.'] : []),
      ...unresolvedDemands.map((demand) => `Unsatisfied observation demand ${demand.type || 'unknown'}: ${demand.reason || 'no approved producer returned an observation'}.`)
    ]
  });
  return {
    program, compatibility, circuitResults, findings, verifierRejections,
    modelCaptures, unresolvedDemands, conflicts, status, report: renderReport(model), model
  };
}

function findFindingConflicts(findings) {
  const conflicts = [];
  for (let leftIndex = 0; leftIndex < findings.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < findings.length; rightIndex += 1) {
      const left = findings[leftIndex];
      const right = findings[rightIndex];
      if (left.rule !== right.rule || left.subject !== right.subject || left.scope !== right.scope) continue;
      if (left.verdict === right.verdict) continue;
      conflicts.push({
        kind: 'FindingConflict', rule: left.rule, subject: left.subject, scope: left.scope,
        findings: [left.id, right.id], verdicts: [left.verdict, right.verdict]
      });
    }
  }
  return conflicts;
}

function collectDemands(value) {
  if (Array.isArray(value)) return value.flatMap(collectDemands);
  if (!value || typeof value !== 'object') return [];
  if (value.kind === 'NeedObservation') return [value];
  return [];
}

export { analyzeText, collectDemands, findFindingConflicts, loadCompatibilityProfile, loadExtractionProfiles, loadReleaseCircuits };
