import { basename } from 'node:path';
import { digestJson } from '../core/canonical.mjs';
import { asNllError, NllError, invariant } from '../core/errors.mjs';
import { assertMarkdownFile, atomicWrite, ensureDirectory, readUtf8Strict, writeJson } from '../core/io.mjs';
import { containedPath } from '../core/paths.mjs';
import { compileCircuit } from '../circuit/compiler.mjs';
import { loadCircuitSource } from '../circuit/module-loader.mjs';
import { compileMarkdown } from '../longtext/compiler.mjs';
import { materializeModelProfiles } from '../longtext/model-materializer.mjs';
import { resolveTranslationBackend } from '../model/translation-backends.mjs';
import { analyzeText, loadCompatibilityProfile, loadExtractionProfiles } from '../runtime/analyzer.mjs';
import { evaluateCompatibility } from '../runtime/compatibility.mjs';
import { persistAnalysis } from '../runtime/production-run.mjs';
import { executeCircuit } from '../runtime/scheduler.mjs';
import { createStandardRegistries } from '../runtime/standard-operators.mjs';
import { validateRuntimeExtensionLocks } from '../runtime/extensions.mjs';
import {
  createIssue, createPlanningRun, loadActiveRelease, loadAgent, loadRelease, updatePlanningRun
} from '../storage/agent-store.mjs';
import { FileArtifactCache } from '../storage/artifact-cache.mjs';
import { foundationPackDescriptor } from '../foundation/core-ontology.mjs';
import { finalizeCnlPlan, renderCnlPlan } from './cnl.mjs';

const REALIZATION_OUTPUT_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: { document: { type: 'string', minLength: 1 } }, required: ['document']
});

const PLANNING_EXIT = Object.freeze({
  planned: 0,
  'planned-with-limits': 0,
  realized: 0,
  'realized-with-limits': 0,
  'realization-with-findings': 2,
  'stopped-incompatible': 3,
  'stopped-incomplete': 4,
  'stopped-budget': 5,
  'review-required-conflict': 6
});

async function loadPlanningCircuits(release, registries) {
  const circuits = [];
  for (const relativePath of release.manifest.planningCircuits || []) {
    const source = await loadCircuitSource(containedPath(release.root, relativePath));
    const compiled = compileCircuit(source, registries);
    invariant(compiled.circuit.purpose === 'planning', 'invalid-release',
      `Circuit ${compiled.circuit.id} is not a planning circuit.`);
    circuits.push(compiled);
  }
  validateRuntimeExtensionLocks(release.manifest, circuits, registries);
  return circuits;
}

async function compileCnlGenerationPlan({
  agentName, idea, language, release, registries, budgets = {}, cache, foundation = 'core'
}) {
  const program = compileMarkdown(idea, {
    language, programId: `longtext:${agentName}:planning-idea`,
    task: {
      goal: 'compile-idea-to-cnl-generation-plan', scope: 'view:whole',
      absencePolicy: 'declared-coverage-only', desiredGuarantee: 'evidence-certified-or-better',
      budgets: { modelCalls: budgets.modelCalls ?? 0, dynamicRounds: 0 },
      reviewPolicy: { conflicts: 'stop' }, expectedOutput: 'CNLGenerationPlan@1'
    },
    foundation
  });
  const planningCircuits = await loadPlanningCircuits(release, registries);
  invariant(planningCircuits.length === 1, 'planning-circuit-cardinality',
    'A generation-capable release currently requires exactly one primary planning circuit.', {
      actual: planningCircuits.length
    });
  const demandedTypes = new Set(planningCircuits.flatMap((compiled) =>
    Object.values(compiled.circuit.inputs)
      .flatMap((portDefinition) => portDefinition.types || [portDefinition.type]).filter(Boolean)));
  const extractionProfiles = await loadExtractionProfiles(release);
  const materialization = await materializeModelProfiles(
    program, extractionProfiles, demandedTypes, registries, { ...budgets, cache }
  );
  const profile = await loadCompatibilityProfile(release);
  const compatibility = evaluateCompatibility(program, planningCircuits, profile);
  if (compatibility.status === 'incompatible') {
    throw new NllError('planning-idea-incompatible',
      'The input idea cannot satisfy the planning circuit observation contract.', compatibility);
  }
  const circuit = planningCircuits[0];
  const circuitResult = await executeCircuit(circuit, program, registries, { ...budgets, cache });
  const candidates = Array.isArray(circuitResult.outputs.plan) ? circuitResult.outputs.plan : [];
  invariant(candidates.length === 1, 'cnl-plan-cardinality',
    'The primary planning circuit must emit exactly one verified CNL plan.', { actual: candidates.length });
  const limitations = compatibility.status === 'compatible-with-limits'
    ? ['The planning idea was compatible only within the limits recorded by the release profile.'] : [];
  const plan = finalizeCnlPlan(candidates[0], {
    release: release.manifest.version,
    planningCircuit: `${circuit.circuit.id}@${circuit.circuit.version}`,
    limitations
  });
  return {
    plan, rendered: renderCnlPlan(plan), program, compatibility, circuitResult,
    modelCaptures: materialization.captures
  };
}

function realizationPrompt(renderedPlan, previous = null, analysis = null) {
  const lines = [
    'Realize the circuit-produced CNL plan below as one complete Markdown document.',
    'The CNL artifact is the authoritative instance plan for this drafting call.',
    'Return only the schema object with the complete document in the document field.', '',
    'CNL GENERATION PLAN', renderedPlan
  ];
  if (previous !== null) {
    lines.push('', 'PREVIOUS REALIZATION', previous, '', 'VALIDATION FEEDBACK', JSON.stringify({
      status: analysis.status,
      findings: analysis.findings.map((finding) => ({
        rule: finding.rule, verdict: finding.verdict, quote: finding.mainAnchor?.quote,
        remediation: finding.remediation, explanation: finding.explanation
      })),
      verifierRejections: analysis.verifierRejections.map((candidate) => candidate.verifierResult),
      limitations: analysis.model.limitations || []
    }, null, 2), '', 'Revise the complete realization while preserving the CNL content plan.');
  }
  return lines.join('\n');
}

function acceptedAnalysis(analysis) {
  return analysis.status.startsWith('reported')
    && analysis.findings.length === 0
    && analysis.verifierRejections.length === 0;
}

async function realizeCnlPlan({ plan, rendered, gateway, agent, release, registries, run, options, cache }) {
  if (!gateway) {
    throw new NllError('realization-backend-required',
      'Optional CNL realization requires Achilles or a configured Coding Agent backend.');
  }
  const captures = [];
  let candidate = null;
  let analysis = null;
  let attempts = 0;
  const maximumRevisions = options.maximumRevisions ?? 2;
  invariant(Number.isInteger(maximumRevisions) && maximumRevisions >= 0 && maximumRevisions <= 10,
    'invalid-arguments', 'maximumRevisions must be an integer between 0 and 10.');
  for (let revision = 0; revision <= maximumRevisions; revision += 1) {
    const response = await gateway.invoke({
      prompt: realizationPrompt(rendered, candidate, analysis),
      taskRole: revision === 0 ? 'realization' : 'revision',
      templateId: revision === 0 ? 'cnl.realize@1' : 'cnl.revise-realization@1',
      responseShape: 'json', outputSchema: REALIZATION_OUTPUT_SCHEMA,
      tags: ['cnl', revision === 0 ? 'realization' : 'repair']
    });
    candidate = response.result.document;
    captures.push(response.capture);
    attempts += 1;
    const attemptRoot = containedPath(run.root, 'realization', 'attempts',
      `attempt-${String(attempts).padStart(2, '0')}`);
    await ensureDirectory(attemptRoot);
    await atomicWrite(containedPath(attemptRoot, 'candidate.md'), candidate);
    analysis = await analyzeText({
      agentName: agent.manifest.name, text: candidate, release, registries,
      language: agent.manifest.defaultLanguage || 'und', budgets: options.budgets, cache,
      foundation: options.foundation || 'core'
    });
    await persistAnalysis({ root: containedPath(attemptRoot, 'validation') }, analysis);
    await atomicWrite(containedPath(attemptRoot, 'validation', 'report.md'), analysis.report);
    if (acceptedAnalysis(analysis) || !analysis.status.startsWith('reported')) break;
  }
  await writeJson(containedPath(run.root, 'realization', 'model-captures.json'), { captures });
  await atomicWrite(containedPath(run.root, 'realization', 'document.md'), candidate);
  await atomicWrite(options.realizeOutputPath, candidate);
  const status = acceptedAnalysis(analysis)
    ? analysis.status === 'reported-with-limits' ? 'realized-with-limits' : 'realized'
    : analysis.status.startsWith('reported') ? 'realization-with-findings' : analysis.status;
  return { status, attempts, analysis, candidate, plan };
}

async function executeCnlPlanningRun(options) {
  await assertMarkdownFile(options.inputPath);
  const [agent, idea] = await Promise.all([
    loadAgent(options.dataRoot, options.agentName), readUtf8Strict(options.inputPath)
  ]);
  const release = options.releaseVersion
    ? await loadRelease(agent, options.releaseVersion) : await loadActiveRelease(agent);
  const foundation = options.foundation || 'core';
  const command = `nllagent plan --agent ${agent.manifest.name} --input ${basename(options.inputPath)} --output ${basename(options.outputPath)} --foundation ${foundation}`;
  const run = await createPlanningRun(agent, options.inputPath, idea, release, command, {
    node: process.version, package: 'natural-language-linter-agent@0.1.0',
    realizationRequested: Boolean(options.realizeOutputPath),
    foundation: foundationPackDescriptor(foundation)
  });
  const cache = options.cache || new FileArtifactCache(containedPath(agent.root, 'cache'));
  try {
    let backend = options.modelGateway ? { kind: 'injected', gateway: options.modelGateway } : null;
    if (!backend) {
      backend = await resolveTranslationBackend({
        ...(options.translation || {}), workspaceRoot: containedPath(run.root, 'model-calls'),
        repoRoot: options.translation?.repoRoot || process.cwd()
      });
    }
    const registries = options.registries || createStandardRegistries({ modelGateway: backend.gateway });
    await updatePlanningRun(run, {
      runtime: {
        ...run.record.runtime, modelBackend: backend.kind, modelGateway: backend.gateway?.id || null,
        operators: registries.operators.describe().map((entry) => entry.id),
        verifiers: registries.verifiers.describe().map((entry) => entry.id),
        extensions: registries.extensions || []
      }
    });
    const compiled = await compileCnlGenerationPlan({
      agentName: agent.manifest.name, idea, release, registries,
      language: agent.manifest.defaultLanguage || 'und', budgets: options.budgets, cache,
      foundation
    });
    await Promise.all([
      writeJson(containedPath(run.root, 'idea.longtext.json'), compiled.program),
      writeJson(containedPath(run.root, 'cnl-plan.json'), compiled.plan),
      atomicWrite(containedPath(run.root, 'plan.cnl.md'), compiled.rendered),
      writeJson(containedPath(run.root, 'planning-compatibility.json'), compiled.compatibility),
      writeJson(containedPath(run.root, 'planning-trace.json'), {
        circuit: compiled.circuitResult.circuit,
        trace: compiled.circuitResult.trace,
        outputs: compiled.circuitResult.outputs
      }),
      writeJson(containedPath(run.root, 'planning-model-captures.json'), {
        captures: compiled.modelCaptures
      })
    ]);
    await atomicWrite(options.outputPath, compiled.rendered);

    if (!options.realizeOutputPath) {
      const status = compiled.compatibility.status === 'compatible-with-limits'
        ? 'planned-with-limits' : 'planned';
      await updatePlanningRun(run, {
        state: status, plan: compiled.plan.id, planDigest: digestJson(compiled.plan),
        realization: { requested: false }
      });
      return {
        exitCode: PLANNING_EXIT[status], status, planningRun: run.id,
        outputPath: options.outputPath, plan: compiled.plan.id, realization: null
      };
    }

    const realization = await realizeCnlPlan({
      plan: compiled.plan, rendered: compiled.rendered, gateway: backend.gateway,
      agent, release, registries, run, options, cache
    });
    let issue = null;
    if (!acceptedAnalysis(realization.analysis)) {
      issue = await createIssue(agent, {
        type: 'cnl-realization-validation-failed', severity: 'error', release: release.manifest.version,
        planningRun: run.id, sourceDigest: realization.analysis.program.source.revision,
        affectedCircuits: realization.analysis.compatibility.blockedCircuits,
        message: realization.status === 'realization-with-findings'
          ? 'The optional realization exhausted its revision budget with validation findings.'
          : `Optional realization validation ended in ${realization.analysis.status}.`,
        diagnostics: {
          status: realization.analysis.status,
          findings: realization.analysis.findings,
          limitations: realization.analysis.model.limitations || []
        },
        reproductionCommand: command
      });
    }
    await updatePlanningRun(run, {
      state: realization.status, plan: compiled.plan.id,
      realization: {
        requested: true, attempts: realization.attempts,
        validationStatus: realization.analysis.status,
        findingCount: realization.analysis.findings.length,
        outputDigest: realization.analysis.program.source.revision
      },
      issueIds: issue ? [issue.id] : []
    });
    return {
      exitCode: PLANNING_EXIT[realization.status] ?? 70,
      status: realization.status, planningRun: run.id, outputPath: options.outputPath,
      realizationOutputPath: options.realizeOutputPath, attempts: realization.attempts,
      findings: realization.analysis.findings.length, plan: compiled.plan.id,
      ...(issue ? { issue: issue.id } : {})
    };
  } catch (caught) {
    const error = asNllError(caught);
    const status = error.code === 'budget-exhausted' ? 'stopped-budget'
      : error.code === 'planning-idea-incompatible' ? 'stopped-incompatible' : 'planning-fault';
    const issue = await createIssue(agent, {
      type: error.code, severity: 'error', release: release.manifest.version,
      planningRun: run.id, sourceDigest: run.record.source.digest,
      affectedCircuits: [], message: error.message, diagnostics: error.details || {},
      reproductionCommand: command
    });
    await updatePlanningRun(run, { state: status, issueIds: [issue.id], error: error.toJSON() });
    if (PLANNING_EXIT[status] !== undefined) {
      return { exitCode: PLANNING_EXIT[status], status, planningRun: run.id, issue: issue.id };
    }
    throw new NllError(error.code, error.message,
      { ...error.details, issue: issue.id, planningRun: run.id }, { cause: error });
  } finally {
    await run.lock.release();
  }
}

export {
  PLANNING_EXIT,
  REALIZATION_OUTPUT_SCHEMA,
  acceptedAnalysis,
  compileCnlGenerationPlan,
  executeCnlPlanningRun,
  loadPlanningCircuits,
  realizationPrompt,
  realizeCnlPlan
};
