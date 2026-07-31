import {
  claim, explicit, gap, groundedAt, semanticUnit, span
} from '../../../../../src/longtext/api.mjs';
import { identifiedAs } from '../../../../../src/ontology/api.mjs';
import {
  DataController, ExceptionCoverageEvidence, ExceptionEvidence, PersonalDataCategory, PolicyScope,
  RetentionDeclaration, actor, assessmentScope, category, coverageScope, coverageState,
  durationYears, exceptionRecordId, exceptionStatus, exceptionUntil, legalAuthority,
  recordId, retentionName, sourceAnchor
} from '../ontologies/index.mjs';

const RETENTION = /^RETENTION \| id=([A-Z][A-Z0-9-]*) \| category=([^|]+?) \| years=([0-9]+) \| scope=([a-z0-9-]+)$/u;
const EXCEPTION = /^EXCEPTION \| retention=([A-Z][A-Z0-9-]*) \| status=(documented|undocumented) \| authority=([^|]+?) \| until=([^|]+)$/u;
const COVERAGE = /^COVERAGE \| scope=([a-z0-9-]+) \| exceptions=(closed|open|partial|conflict)$/u;
const CONTROLLED_PREFIX = /^(RETENTION|EXCEPTION|COVERAGE) \|/u;

function anchoredLines(source) {
  const lines = [];
  let codeUnitOffset = 0;
  for (const line of source.text.split('\n')) {
    const start = [...source.text.slice(0, codeUnitOffset)].length;
    const end = start + [...line].length;
    if (CONTROLLED_PREFIX.test(line)) lines.push(Object.freeze({ line, anchor: span(source, start, end) }));
    codeUnitOffset += line.length + 1;
  }
  return lines;
}

function scopeTerm(id) {
  return PolicyScope(identifiedAs(`retention-scope:${id}`), retentionName(id));
}

function categoryTerm(id) {
  return PersonalDataCategory(identifiedAs(`personal-data-category:${id}`), retentionName(id));
}

function materializePrivacyRetention({ source }) {
  const calibrationSources = new Set([
    'accepted-exception.md', 'boundary-satisfied.md', 'duration-conflict.md',
    'exception-conflict.md', 'explicit-undocumented.md', 'incomplete-exception-closed.md', 'ontology-gap.md',
    'privacy-retention-calibration.md', 'scope-isolation.md', 'symbolic-witness.md',
    'unknown-open.md', 'violation-closed.md'
  ]);
  // This adapter exists only so training benchmarks can compile their controlled fixtures.
  // Production tasks are materialized by nll-analyze-task and therefore receive no terms here.
  if (!calibrationSources.has(source.id)) return [];
  const units = [];
  const declarations = new Map();
  const controller = DataController(
    identifiedAs('data-controller:northstar-services'), retentionName('Northstar Services')
  );
  const lines = anchoredLines(source);

  for (const entry of lines) {
    const match = RETENTION.exec(entry.line);
    if (!match) continue;
    const [, id, categoryName, yearsText, scopeId] = match;
    if (categoryName.startsWith('unmapped:')) {
      units.push(semanticUnit(`ontology-gap-${id}`, gap('ontology', entry.anchor)));
      continue;
    }
    const scope = scopeTerm(scopeId);
    const declaration = RetentionDeclaration(
      identifiedAs(`retention-declaration:${entry.anchor.id}`),
      recordId(id), actor(controller), category(categoryTerm(categoryName)),
      durationYears(Number(yearsText)), assessmentScope(scope), sourceAnchor(entry.anchor)
    );
    const values = declarations.get(id) || [];
    values.push(declaration);
    declarations.set(id, values);
    units.push(semanticUnit(
      `retention-${id}-${values.length}`,
      claim(declaration, explicit(), groundedAt(entry.anchor))
    ));
  }

  for (const entry of lines) {
    const match = EXCEPTION.exec(entry.line);
    if (!match) continue;
    const [, id, status, authorityText, untilText] = match;
    const exception = ExceptionEvidence(
      identifiedAs(`exception-evidence:${entry.anchor.id}`),
      exceptionRecordId(id), exceptionStatus(status), legalAuthority(authorityText.trim()),
      exceptionUntil(untilText.trim()), sourceAnchor(entry.anchor)
    );
    units.push(semanticUnit(
      `exception-${id}-${entry.anchor.start}`,
      claim(exception, explicit(), groundedAt(entry.anchor))
    ));
  }

  for (const entry of lines) {
    const match = COVERAGE.exec(entry.line);
    if (!match) continue;
    const [, scopeId, state] = match;
    const scope = scopeTerm(scopeId);
    const evidence = ExceptionCoverageEvidence(
      identifiedAs(`exception-coverage:${entry.anchor.id}`),
      coverageScope(scope), coverageState(state), sourceAnchor(entry.anchor)
    );
    units.push(semanticUnit(
      `coverage-${scopeId}-${entry.anchor.start}`,
      claim(evidence, explicit(), groundedAt(entry.anchor))
    ));
  }

  for (const entry of lines) {
    if (RETENTION.test(entry.line) || EXCEPTION.test(entry.line) || COVERAGE.test(entry.line)) continue;
    units.push(semanticUnit(`malformed-${entry.anchor.start}`, gap('malformed-controlled-line', entry.anchor)));
  }
  return units;
}

export { anchoredLines, materializePrivacyRetention };
