import { digestJson, normalizeJson } from '../core/canonical.mjs';
import { invariant } from '../core/errors.mjs';

const REQUIRED_DOCUMENT_FIELDS = Object.freeze(['type', 'language', 'audience', 'purpose']);

function nonEmptyString(value) {
  return typeof value === 'string' && Boolean(value.trim());
}

function validateContentStep(source, context = {}) {
  const step = normalizeJson(source);
  invariant(step && typeof step === 'object' && !Array.isArray(step),
    'invalid-cnl-plan', 'CNL content steps must be objects.', context);
  invariant(nonEmptyString(step.id), 'invalid-cnl-plan', 'CNL content steps require an id.', context);
  invariant(nonEmptyString(step.instruction),
    'invalid-cnl-plan', `CNL content step ${step.id || '<unknown>'} requires an instruction.`, context);
  invariant(step.requiredContent === undefined || (Array.isArray(step.requiredContent)
    && step.requiredContent.every(nonEmptyString)),
  'invalid-cnl-plan', `CNL content step ${step.id} requiredContent must contain non-empty strings.`, context);
  invariant(step.dependsOn === undefined || (Array.isArray(step.dependsOn)
    && step.dependsOn.every(nonEmptyString)),
  'invalid-cnl-plan', `CNL content step ${step.id} dependsOn must contain step identifiers.`, context);
  return step;
}

function validateCnlPlanBody(source, context = {}) {
  const plan = normalizeJson(source);
  invariant(plan && typeof plan === 'object' && !Array.isArray(plan),
    'invalid-cnl-plan', 'CNL plan content must be an object.', context);
  invariant(nonEmptyString(plan.title), 'invalid-cnl-plan', 'A CNL generation plan requires a title.', context);
  invariant(nonEmptyString(plan.sourceIdea),
    'invalid-cnl-plan', 'A CNL generation plan must preserve the source idea.', context);
  invariant(plan.document && typeof plan.document === 'object' && !Array.isArray(plan.document),
    'invalid-cnl-plan', 'A CNL generation plan requires a document design.', context);
  for (const field of REQUIRED_DOCUMENT_FIELDS) {
    invariant(nonEmptyString(plan.document[field]),
      'invalid-cnl-plan', `CNL document design requires ${field}.`, context);
  }
  invariant(Array.isArray(plan.contentPlan) && plan.contentPlan.length > 0,
    'invalid-cnl-plan', 'A CNL generation plan requires an ordered content plan.', context);
  const steps = plan.contentPlan.map((step) => validateContentStep(step, context));
  invariant(new Set(steps.map((step) => step.id)).size === steps.length,
    'invalid-cnl-plan', 'CNL content step identifiers must be unique.', context);
  const knownSteps = new Set(steps.map((step) => step.id));
  for (const step of steps) {
    invariant((step.dependsOn || []).every((dependency) => knownSteps.has(dependency)),
      'invalid-cnl-plan', `CNL content step ${step.id} depends on an unknown step.`, context);
  }
  invariant(Array.isArray(plan.realizationGuidance) && plan.realizationGuidance.length > 0
    && plan.realizationGuidance.every(nonEmptyString),
  'invalid-cnl-plan', 'A CNL generation plan requires natural-language realization guidance.', context);
  return { ...plan, contentPlan: steps };
}

function planLocationExists(plan, location) {
  if (!nonEmptyString(location)) return false;
  const separator = location.indexOf(':');
  if (separator < 1) return false;
  const family = location.slice(0, separator);
  const target = location.slice(separator + 1);
  if (family === 'contentPlan') return plan.contentPlan.some((step) => step.id === target);
  if (family === 'realizationGuidance') {
    const index = Number(target);
    return Number.isInteger(index) && index >= 1 && index <= plan.realizationGuidance.length;
  }
  if (family === 'document') return Object.hasOwn(plan.document, target) && nonEmptyString(plan.document[target]);
  return false;
}

function validateRuleApplications(source, plan, appliedRules, context = {}) {
  invariant(Array.isArray(source) && source.length > 0,
    'invalid-cnl-plan', 'CNL generation plans require rule-to-plan verification witnesses.', context);
  const applications = normalizeJson(source);
  const knownRules = new Set(appliedRules);
  for (const application of applications) {
    invariant(application && typeof application === 'object' && !Array.isArray(application)
      && nonEmptyString(application.rule),
    'invalid-cnl-plan', 'Every CNL rule application requires a rule identifier.', context);
    invariant(knownRules.has(application.rule),
      'invalid-cnl-plan', `CNL rule application ${application.rule} is not an applied rule.`, context);
    invariant(Array.isArray(application.planLocations) && application.planLocations.length > 0
      && application.planLocations.every(nonEmptyString),
    'invalid-cnl-plan', `CNL rule application ${application.rule} requires plan locations.`, context);
    invariant(application.planLocations.every((location) => planLocationExists(plan, location)),
      'invalid-cnl-plan', `CNL rule application ${application.rule} references an unknown plan location.`, context);
  }
  const coveredRules = new Set(applications.map((application) => application.rule));
  invariant(appliedRules.every((rule) => coveredRules.has(rule)),
    'invalid-cnl-plan', 'Every applied rule must have a concrete location in the CNL plan.', context);
  return applications;
}

function validateCnlPlanCandidate(source, context = {}) {
  const candidate = normalizeJson(source);
  invariant(candidate.kind === 'CNLGenerationPlanCandidate',
    'invalid-cnl-plan', 'Planning operators must produce CNLGenerationPlanCandidate.', context);
  invariant(candidate.schemaVersion === 1,
    'invalid-cnl-plan', 'CNL generation plan candidates require schemaVersion 1.', context);
  invariant(nonEmptyString(candidate.sourceDigest),
    'invalid-cnl-plan', 'CNL generation plan candidates require a source digest.', context);
  invariant(Array.isArray(candidate.sourceObservationIds) && candidate.sourceObservationIds.length > 0
    && candidate.sourceObservationIds.every(nonEmptyString),
  'invalid-cnl-plan', 'CNL generation plans require source-grounded idea observations.', context);
  invariant(Array.isArray(candidate.appliedRules) && candidate.appliedRules.length > 0
    && candidate.appliedRules.every(nonEmptyString),
  'invalid-cnl-plan', 'CNL generation plans must record the rules applied by the planning circuit.', context);
  invariant(Array.isArray(candidate.sourceRuleReferences) && candidate.sourceRuleReferences.length > 0
    && candidate.sourceRuleReferences.every(nonEmptyString),
  'invalid-cnl-plan', 'CNL generation plans require authority provenance.', context);
  const plan = validateCnlPlanBody(candidate.plan, context);
  return {
    ...candidate,
    plan,
    ruleApplications: validateRuleApplications(
      candidate.ruleApplications, plan, candidate.appliedRules, context
    )
  };
}

function interpolatePlanTemplate(value, variables) {
  if (Array.isArray(value)) return value.map((item) => interpolatePlanTemplate(item, variables));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value)
      .map(([key, item]) => [key, interpolatePlanTemplate(item, variables)]));
  }
  if (typeof value !== 'string') return value;
  return Object.entries(variables).reduce(
    (result, [name, replacement]) => result.replaceAll(`{{${name}}}`, replacement), value
  );
}

function finalizeCnlPlan(source, options = {}) {
  const candidate = validateCnlPlanCandidate(source);
  const stable = {
    sourceDigest: candidate.sourceDigest,
    plan: candidate.plan,
    appliedRules: candidate.appliedRules,
    sourceRuleReferences: candidate.sourceRuleReferences,
    ruleApplications: candidate.ruleApplications,
    planningCircuit: options.planningCircuit
  };
  return normalizeJson({
    kind: 'CNLGenerationPlan', schemaVersion: 1, dialect: 'CNL/Plan-1', profile: 'specification',
    id: `cnl-plan:${digestJson(stable).slice(7, 31)}`,
    sourceDigest: candidate.sourceDigest,
    ...candidate.plan,
    provenance: {
      release: options.release || null,
      planningCircuit: options.planningCircuit || null,
      sourceObservationIds: candidate.sourceObservationIds,
      appliedRules: candidate.appliedRules,
      sourceRuleReferences: candidate.sourceRuleReferences
    },
    verification: {
      status: 'mechanically-certified',
      ruleApplications: candidate.ruleApplications
    },
    limitations: [...new Set([...(candidate.limitations || []), ...(options.limitations || [])])]
  });
}

function renderCnlPlan(plan) {
  invariant(plan?.kind === 'CNLGenerationPlan',
    'invalid-cnl-plan', 'Only a finalized CNLGenerationPlan can be rendered.');
  const lines = [
    '# CNL/Plan-1 generation specification', '',
    `Plan: \`${plan.id}\``,
    `Title: ${plan.title}`, '',
    '## Source idea', '', plan.sourceIdea, '',
    '## Document design', '',
    `- Type: ${plan.document.type}`,
    `- Language: ${plan.document.language}`,
    `- Audience: ${plan.document.audience}`,
    `- Purpose: ${plan.document.purpose}`
  ];
  for (const [field, value] of Object.entries(plan.document)) {
    if (!REQUIRED_DOCUMENT_FIELDS.includes(field)) lines.push(`- ${field}: ${value}`);
  }
  lines.push('', '## Content sequence', '');
  for (const [index, step] of plan.contentPlan.entries()) {
    lines.push(`### ${index + 1}. ${step.id}`, '', step.instruction);
    if (step.requiredContent?.length) {
      lines.push('', 'Include:');
      for (const item of step.requiredContent) lines.push(`- ${item}`);
    }
    if (step.dependsOn?.length) lines.push('', `Depends on: ${step.dependsOn.join(', ')}`);
    lines.push('');
  }
  lines.push('## Realization guidance', '');
  for (const guidance of plan.realizationGuidance) lines.push(`- ${guidance}`);
  lines.push('', '## Plan verification', '');
  for (const application of plan.verification.ruleApplications) {
    lines.push(`- ${application.rule}: ${application.planLocations.join(', ')}`);
  }
  lines.push('', '## Plan provenance', '',
    `- Release: ${plan.provenance.release || 'unbound'}`,
    `- Planning circuit: ${plan.provenance.planningCircuit || 'unbound'}`,
    `- Applied rules: ${plan.provenance.appliedRules.join(', ')}`,
    '',
    'This CNL artifact is the circuit-produced specification for later text realization.',
    'It is not the final document and does not claim that any later realization has passed validation.', '');
  return lines.join('\n');
}

export {
  REQUIRED_DOCUMENT_FIELDS,
  finalizeCnlPlan,
  interpolatePlanTemplate,
  renderCnlPlan,
  validateCnlPlanBody,
  validateCnlPlanCandidate,
  validateContentStep,
  validateRuleApplications
};
