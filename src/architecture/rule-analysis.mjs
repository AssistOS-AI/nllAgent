import { NllError, invariant } from '../core/errors.mjs';
import {
  ArchitectureValue, SOURCE_FORM, assertInstances, assertUnique, freeze, quote,
  sourceChain, validateId, validateText
} from './common.mjs';

const FACET_KINDS = new Set([
  'scope', 'modality', 'premise', 'exception', 'outcome', 'unknown-condition', 'evidence-requirement'
]);

class AuthoritySpan extends ArchitectureValue {
  constructor(file, start, end) {
    validateText(file, 'invalid-authority-file', 'Authority file');
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end <= start) {
      throw new NllError('invalid-authority-span', `Invalid half-open authority span [${start}, ${end}) in ${file}.`);
    }
    super('AuthoritySpan', { file, start, end });
  }

  get file() { return this.detail('file'); }
  get start() { return this.detail('start'); }
  get end() { return this.detail('end'); }
  [SOURCE_FORM]() { return `authoritySpan(${quote(this.file)},${this.start},${this.end})`; }
}

class RuleObligation extends ArchitectureValue {
  constructor(id, statement) {
    validateId(id, 'invalid-obligation-id', 'Rule obligation id');
    validateText(statement, 'invalid-obligation', 'Rule obligation');
    super('RuleObligation', { id, statement });
  }

  get id() { return this.detail('id'); }
  get statement() { return this.detail('statement'); }
  [SOURCE_FORM]() { return `ruleObligation(${quote(this.id)},${quote(this.statement)})`; }
}

class RuleFacet extends ArchitectureValue {
  constructor(facetKind, id, statement) {
    if (!FACET_KINDS.has(facetKind)) {
      throw new NllError('invalid-rule-facet', `Unsupported rule-analysis facet: ${facetKind}`);
    }
    validateId(id, 'invalid-rule-facet-id', 'Rule facet id');
    validateText(statement, 'invalid-rule-facet', 'Rule facet');
    super('RuleFacet', { facetKind, id, statement });
  }

  get facetKind() { return this.detail('facetKind'); }
  get id() { return this.detail('id'); }
  get statement() { return this.detail('statement'); }
  [SOURCE_FORM]() { return `ruleFacet(${quote(this.facetKind)},${quote(this.id)},${quote(this.statement)})`; }
}

class RuleAnalysis extends ArchitectureValue {
  constructor(id, authority, obligations, facets) {
    super('RuleAnalysis', {
      id,
      authority,
      obligations: freeze(obligations),
      facets: freeze(facets)
    });
  }

  get id() { return this.detail('id'); }
  get authority() { return this.detail('authority'); }
  get obligations() { return this.detail('obligations'); }
  get facets() { return this.detail('facets'); }
  facetsOf(kind) { return freeze(this.facets.filter((facet) => facet.facetKind === kind)); }

  [SOURCE_FORM]() {
    let source = `ruleAnalysis(${quote(this.id)}).authority(${this.authority[SOURCE_FORM]()})`;
    source = sourceChain(source, 'obligations', this.obligations);
    source = sourceChain(source, 'facets', this.facets);
    return `${source}.seal()`;
  }
}

class RuleAnalysisBuilder {
  #id;
  #authority = null;
  #obligations = [];
  #facets = [];
  #sealed = false;

  constructor(id) {
    this.#id = validateId(id, 'invalid-rule-analysis-id', 'Rule analysis id');
  }

  #assertOpen() {
    if (this.#sealed) throw new NllError('rule-analysis-sealed', `Rule analysis ${this.#id} is sealed.`);
  }

  authority(value) {
    this.#assertOpen();
    invariant(value instanceof AuthoritySpan, 'invalid-rule-authority', 'Rule analysis requires an AuthoritySpan.');
    if (this.#authority) throw new NllError('duplicate-rule-authority', `Rule analysis ${this.#id} already has authority.`);
    this.#authority = value;
    return this;
  }

  obligations(...values) {
    this.#assertOpen();
    assertInstances(values, RuleObligation, 'invalid-rule-obligation', 'Expected a RuleObligation.');
    this.#obligations.push(...values);
    return this;
  }

  facets(...values) {
    this.#assertOpen();
    assertInstances(values, RuleFacet, 'invalid-rule-facet', 'Expected a RuleFacet.');
    this.#facets.push(...values);
    return this;
  }

  scope(...values) { return this.facets(...values.map((value) => facetAs('scope', value))); }
  modality(...values) { return this.facets(...values.map((value) => facetAs('modality', value))); }
  premises(...values) { return this.facets(...values.map((value) => facetAs('premise', value))); }
  conditions(...values) { return this.premises(...values); }
  exceptions(...values) { return this.facets(...values.map((value) => facetAs('exception', value))); }
  outcomes(...values) { return this.facets(...values.map((value) => facetAs('outcome', value))); }
  unknownWhen(...values) { return this.facets(...values.map((value) => facetAs('unknown-condition', value))); }
  evidence(...values) { return this.facets(...values.map((value) => facetAs('evidence-requirement', value))); }

  seal() {
    this.#assertOpen();
    invariant(this.#authority, 'missing-rule-authority', `Rule analysis ${this.#id} has no authority span.`);
    invariant(this.#obligations.length > 0, 'missing-rule-obligation', `Rule analysis ${this.#id} has no obligations.`);
    invariant(this.#facets.some((facet) => facet.facetKind === 'outcome'),
      'missing-rule-outcome', `Rule analysis ${this.#id} has no declared outcomes.`);
    assertUnique(this.#obligations, (value) => value.id, 'duplicate-rule-obligation', 'rule obligation');
    assertUnique(this.#facets, (value) => `${value.facetKind}:${value.id}`, 'duplicate-rule-facet', 'rule facet');
    this.#sealed = true;
    return new RuleAnalysis(this.#id, this.#authority, this.#obligations, this.#facets);
  }
}

function facetAs(kind, value) {
  invariant(value instanceof RuleFacet && value.facetKind === kind,
    'rule-facet-kind-mismatch', `Expected a ${kind} rule facet.`);
  return value;
}

const authoritySpan = (file, start, end) => new AuthoritySpan(file, start, end);
const ruleObligation = (id, statement) => new RuleObligation(id, statement);
const ruleFacet = (kind, id, statement) => new RuleFacet(kind, id, statement);
const scope = (id, statement) => ruleFacet('scope', id, statement);
const modality = (id, statement) => ruleFacet('modality', id, statement);
const premise = (id, statement) => ruleFacet('premise', id, statement);
const exception = (id, statement) => ruleFacet('exception', id, statement);
const outcome = (id, statement = id) => ruleFacet('outcome', id, statement);
const unknownWhen = (id, statement) => ruleFacet('unknown-condition', id, statement);
const evidenceRequirement = (id, statement) => ruleFacet('evidence-requirement', id, statement);
const ruleAnalysis = (id) => new RuleAnalysisBuilder(id);

export {
  AuthoritySpan, RuleAnalysis, RuleAnalysisBuilder, RuleFacet, RuleObligation, authoritySpan,
  evidenceRequirement, exception, modality, outcome, premise, ruleAnalysis, ruleFacet, ruleObligation,
  scope, unknownWhen
};
