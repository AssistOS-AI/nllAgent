export default function materializeNorthstarRetention({ source, api, ontology }) {
  const {
    claim, explicit, gap, groundedAt, semanticUnit, span
  } = api;
  const {
    DataController, ExceptionCoverageEvidence, ExceptionEvidence, PersonalDataCategory,
    PolicyScope, RetentionDeclaration, actor, assessmentScope, category, coverageScope,
    coverageState, durationYears, exceptionRecordId, exceptionStatus, exceptionUntil,
    legalAuthority, recordId, retentionName, sourceAnchor
  } = ontology;

  const codePointOffset = (codeUnitOffset) => [...source.text.slice(0, codeUnitOffset)].length;
  const anchor = (literal) => {
    const codeUnitStart = source.text.indexOf(literal);
    if (codeUnitStart < 0) throw new Error(`Required source excerpt is missing: ${literal}`);
    const start = codePointOffset(codeUnitStart);
    return span(source, start, start + [...literal].length);
  };
  const identified = (id) => ontology.identifiedAs(id);

  const controller = DataController(identified('data-controller:northstar-services'), retentionName('Northstar Services'));
  const scopes = new Map();
  const scope = (id) => {
    if (!scopes.has(id)) scopes.set(id,
      PolicyScope(identified(`retention-scope:${id}`), retentionName(id)));
    return scopes.get(id);
  };
  const categories = new Map();
  const data = (id) => {
    if (!categories.has(id)) categories.set(id,
      PersonalDataCategory(identified(`personal-data-category:${id}`), retentionName(id)));
    return categories.get(id);
  };
  const units = [];

  const retain = (id, categoryName, years, scopeId) => {
    const literal = `RETENTION | id=${id} | category=${categoryName} | years=${years} | scope=${scopeId}`;
    const grounded = anchor(literal);
    const term = RetentionDeclaration(
      identified(`retention-declaration:${grounded.id}`),
      recordId(id), actor(controller), category(data(categoryName)), durationYears(years),
      assessmentScope(scope(scopeId)), sourceAnchor(grounded)
    );
    units.push(semanticUnit(`retention-${id}-${years}`, claim(term, explicit(), groundedAt(grounded))));
  };
  const exception = (id, status, authority, until) => {
    const literal = `EXCEPTION | retention=${id} | status=${status} | authority=${authority} | until=${until}`;
    const grounded = anchor(literal);
    const term = ExceptionEvidence(
      identified(`exception-evidence:${grounded.id}`), exceptionRecordId(id), exceptionStatus(status),
      legalAuthority(authority), exceptionUntil(until), sourceAnchor(grounded)
    );
    units.push(semanticUnit(`exception-${id}-${status}`, claim(term, explicit(), groundedAt(grounded))));
  };
  const coverage = (scopeId, state) => {
    const literal = `COVERAGE | scope=${scopeId} | exceptions=${state}`;
    const grounded = anchor(literal);
    const term = ExceptionCoverageEvidence(
      identified(`exception-coverage:${grounded.id}`), coverageScope(scope(scopeId)),
      coverageState(state), sourceAnchor(grounded)
    );
    units.push(semanticUnit(`coverage-${scopeId}`, claim(term, explicit(), groundedAt(grounded))));
  };

  retain('R1', 'support-transcript', 7, 'scope-r1');
  coverage('scope-r1', 'closed');
  retain('R2', 'tax-invoice', 8, 'scope-r2');
  exception('R2', 'documented', 'Fictional Tax Records Act section 41', '2032-12-31');
  coverage('scope-r2', 'closed');
  retain('R3', 'customer-profile', 5, 'scope-r3');
  coverage('scope-r3', 'closed');
  retain('R4', 'research-interview', 9, 'scope-r4');
  coverage('scope-r4', 'open');
  retain('R5', 'fraud-case', 9, 'scope-r5');
  exception('R5', 'documented', 'Fictional Financial Integrity Code article 12', '2031-06-30');
  exception('R5', 'undocumented', 'none', 'unresolved');
  coverage('scope-r5', 'closed');
  retain('R6', 'marketing-suppression', 3, 'scope-r6');
  retain('R6', 'marketing-suppression', 7, 'scope-r6');
  coverage('scope-r6', 'closed');

  const unmapped = anchor('RETENTION | id=R7 | category=unmapped:biometric-template | years=6 | scope=scope-r7');
  units.push(semanticUnit('ontology-gap-R7', gap('ontology', unmapped)));
  coverage('scope-r7', 'closed');
  return units;
}
