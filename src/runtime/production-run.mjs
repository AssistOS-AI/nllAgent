import { basename } from 'node:path';
import { NllError, asNllError } from '../core/errors.mjs';
import { assertMarkdownFile, atomicWrite, readUtf8Strict, writeJson } from '../core/io.mjs';
import { containedPath } from '../core/paths.mjs';
import { renderReport } from '../report/markdown-renderer.mjs';
import { createCnlAuditReport } from '../report/cnl-audit.mjs';
import { createIssue, createRun, loadActiveRelease, loadAgent, loadRelease, updateRun } from '../storage/agent-store.mjs';
import { FileArtifactCache } from '../storage/artifact-cache.mjs';
import { resolveTranslationBackend } from '../model/translation-backends.mjs';
import { analyzeText } from './analyzer.mjs';
import { createStandardRegistries } from './standard-operators.mjs';

const TERMINAL_EXIT = {
  reported: 0,
  'reported-with-limits': 0,
  'stopped-incompatible': 3,
  'stopped-incomplete': 4,
  'stopped-budget': 5,
  'review-required-conflict': 6,
  'runtime-fault': 70
};

async function persistAnalysis(run, analysis) {
  await Promise.all([
    writeJson(containedPath(run.root, 'source-package.json'), {
      kind: 'SourcePackage', schemaVersion: 1, source: analysis.program.source,
      anchors: analysis.program.anchors, blocks: analysis.program.blocks
    }),
    writeJson(containedPath(run.root, 'longtext.json'), analysis.program),
    writeJson(containedPath(run.root, 'compatibility.json'), analysis.compatibility),
    writeJson(containedPath(run.root, 'coverage.json'), { coverage: analysis.program.coverage, gaps: analysis.program.gaps }),
    writeJson(containedPath(run.root, 'circuit-plan.json'), {
      circuits: analysis.circuitResults.map((result) => ({ id: result.circuit, durationMs: result.durationMs }))
    }),
    writeJson(containedPath(run.root, 'semantic-trace.json'), {
      circuits: analysis.circuitResults.map((result) => ({ id: result.circuit, trace: result.trace, outputs: result.nodeOutputs }))
    }),
    writeJson(containedPath(run.root, 'findings.json'), { findings: analysis.findings }),
    writeJson(containedPath(run.root, 'cnl-audit.json'), analysis.model),
    writeJson(containedPath(run.root, 'conflicts.json'), { conflicts: analysis.conflicts || [] }),
    writeJson(containedPath(run.root, 'verifier-results.json'), {
      results: [
        ...analysis.findings.map((finding) => ({ finding: finding.id, ...finding.verifierResult })),
        ...(analysis.verifierRejections || []).map((candidate) => ({ candidateRule: candidate.rule, ...candidate.verifierResult }))
      ]
    }),
    writeJson(containedPath(run.root, 'model-captures.json'), { captures: analysis.modelCaptures || [] })
  ]);
}

async function executeProductionRun(options) {
  await assertMarkdownFile(options.inputPath);
  const [agent, inputText] = await Promise.all([
    loadAgent(options.dataRoot, options.agentName),
    readUtf8Strict(options.inputPath)
  ]);
  const release = options.releaseVersion
    ? await loadRelease(agent, options.releaseVersion)
    : await loadActiveRelease(agent);
  const command = `nllagent run --agent ${agent.manifest.name} --input ${basename(options.inputPath)} --output ${basename(options.outputPath)}`;
  let registries = options.registries || createStandardRegistries();
  const run = await createRun(agent, options.inputPath, inputText, release, command, {
    node: process.version, package: 'natural-language-linter-agent@1.0.0',
    operators: registries.operators.describe().map((entry) => entry.id),
    verifiers: registries.verifiers.describe().map((entry) => entry.id)
  });
  const cache = options.cache || new FileArtifactCache(containedPath(agent.root, 'cache'));
  try {
    let translationBackend = options.registries ? { kind: 'injected', gateway: null } : null;
    if (!options.registries) {
      translationBackend = await resolveTranslationBackend({
        ...(options.translation || {}),
        workspaceRoot: containedPath(run.root, 'translation'),
        repoRoot: options.translation?.repoRoot || process.cwd()
      });
      registries = createStandardRegistries({ modelGateway: translationBackend.gateway });
      await updateRun(run, {
        runtime: {
          ...run.record.runtime,
          translationBackend: translationBackend.kind,
          modelGateway: translationBackend.gateway?.id || null,
          operators: registries.operators.describe().map((entry) => entry.id),
          verifiers: registries.verifiers.describe().map((entry) => entry.id)
        }
      });
    }
    const analysis = await analyzeText({
      agentName: agent.manifest.name, text: inputText, release, registries,
      language: agent.manifest.defaultLanguage || 'und', budgets: options.budgets, cache
    });
    let issue;
    if (analysis.status === 'stopped-incompatible') {
      issue = await createIssue(agent, {
        type: 'compatibility-gap', severity: 'error', release: release.manifest.version,
        run: run.id, sourceDigest: analysis.program.source.revision,
        affectedCircuits: analysis.compatibility.blockedCircuits,
        message: 'The release cannot satisfy all critical observation contracts for this document.',
        diagnostics: analysis.compatibility.obligations.filter((item) => item.status !== 'satisfied'),
        reproductionCommand: command,
        learningNeed: { remediationClasses: ['adapter', 'extractor', 'schema-type', 'accepted-limitation'] }
      });
      analysis.model.issue = issue;
      analysis.report = renderReport(analysis.model);
    } else if (analysis.status === 'stopped-incomplete') {
      issue = await createIssue(agent, {
        type: 'insufficient-critical-coverage', severity: 'error', release: release.manifest.version,
        run: run.id, sourceDigest: analysis.program.source.revision,
        affectedCircuits: analysis.compatibility.activeCircuits,
        message: 'One or more critical dynamic observation demands could not be satisfied.',
        diagnostics: analysis.unresolvedDemands, reproductionCommand: command,
        learningNeed: { remediationClasses: ['extractor', 'schema-type', 'operational-context', 'accepted-limitation'] }
      });
      analysis.model.issue = issue;
      analysis.report = renderReport(analysis.model);
    } else if (analysis.status === 'review-required-conflict') {
      issue = await createIssue(agent, {
        type: 'finding-conflict', severity: 'error', release: release.manifest.version,
        run: run.id, sourceDigest: analysis.program.source.revision,
        affectedCircuits: [...new Set(analysis.findings.map((finding) => finding.circuit))],
        message: 'The run produced incompatible verified findings for the same rule, subject, and scope.',
        diagnostics: analysis.conflicts, reproductionCommand: command,
        learningNeed: { remediationClasses: ['rule-priority', 'scope', 'identity', 'human-adjudication'] }
      });
      analysis.model.issue = issue;
      analysis.report = renderReport(analysis.model);
    } else if (analysis.verifierRejections?.length) {
      issue = await createIssue(agent, {
        type: 'verifier-rejection', severity: 'error', release: release.manifest.version,
        run: run.id, sourceDigest: analysis.program.source.revision,
        affectedCircuits: [...new Set(analysis.verifierRejections.map((item) => item.circuit).filter(Boolean))],
        message: 'One or more circuit candidates were rejected by trusted verifiers and were not published.',
        diagnostics: analysis.verifierRejections.map((item) => item.verifierResult), reproductionCommand: command
      });
      analysis.model.issue = issue;
      analysis.report = renderReport(analysis.model);
    }
    await persistAnalysis(run, analysis);
    await atomicWrite(containedPath(run.root, 'report.md'), analysis.report);
    await atomicWrite(options.outputPath, analysis.report);
    await updateRun(run, { state: analysis.status, issueIds: issue ? [issue.id] : [], findingCount: analysis.findings.length });
    const blockingSeverities = new Set(release.manifest.blockingSeverities || ['error', 'critical', 'blocker']);
    const hasBlockingFindings = analysis.findings.some((finding) => blockingSeverities.has(finding.severity));
    return {
      exitCode: analysis.status.startsWith('reported') && hasBlockingFindings ? 2 : TERMINAL_EXIT[analysis.status] ?? 70,
      run: run.record, outputPath: options.outputPath, status: analysis.status,
      findings: analysis.findings.length,
      ...(issue ? { issue: issue.id } : {}),
      translationBackend: run.record.runtime?.translationBackend || 'injected'
    };
  } catch (error) {
    const failure = asNllError(error);
    const status = failure.code === 'budget-exhausted' ? 'stopped-budget' : 'runtime-fault';
    const issue = await createIssue(agent, {
      type: failure.code, severity: 'error', release: release.manifest.version, run: run.id,
      sourceDigest: run.record.source.digest, affectedCircuits: [], message: failure.message,
      diagnostics: failure.details || {}, reproductionCommand: command
    });
    const model = createCnlAuditReport({
      agent: agent.manifest.name, release: release.manifest.version,
      sourceDigest: run.record.source.digest, status,
      compatibility: { status: 'unknown', activeCircuits: [], blockedCircuits: [] },
      coverage: [], findings: [], issue
    });
    const report = renderReport(model);
    await writeJson(containedPath(run.root, 'cnl-audit.json'), model);
    await atomicWrite(containedPath(run.root, 'report.md'), report);
    await atomicWrite(options.outputPath, report);
    await updateRun(run, { state: status, issueIds: [issue.id], error: failure.toJSON() });
    if (failure.code === 'budget-exhausted') return { exitCode: 5, status, issue: issue.id, run: run.record, outputPath: options.outputPath };
    throw new NllError(failure.code, failure.message, { ...failure.details, issue: issue.id, run: run.id }, { cause: failure });
  } finally {
    await run.lock.release();
  }
}

export { executeProductionRun, persistAnalysis };
