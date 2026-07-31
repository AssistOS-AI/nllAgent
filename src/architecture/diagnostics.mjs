import { NllError, invariant } from '../core/errors.mjs';
import {
  ArchitectureValue, SOURCE_FORM, assertInstances, assertUnique, freeze, quote, sourceChain,
  validateId, validateText
} from './common.mjs';

class DiagnosticSeverity extends ArchitectureValue {
  constructor(id) { super('DiagnosticSeverity', { id: validateId(id, 'invalid-diagnostic-severity', 'Diagnostic severity') }); }
  get id() { return this.detail('id'); }
  [SOURCE_FORM]() { return `diagnosticSeverity(${quote(this.id)})`; }
}

class ArchitectureDiagnostic extends ArchitectureValue {
  constructor(code, message, fields) { super('ArchitectureDiagnostic', { code, message, ...fields }); }
  get code() { return this.detail('code'); }
  get message() { return this.detail('message'); }
  get severity() { return this.detail('severity'); }
  get file() { return this.detail('file'); }
  get location() { return this.detail('location'); }
  get subject() { return this.detail('subject'); }
  get expected() { return this.detail('expected'); }
  get received() { return this.detail('received'); }
  get authority() { return this.detail('authority'); }
  get traceSlice() { return this.detail('traceSlice'); }
  get owner() { return this.detail('owner'); }
  get gateId() { return this.detail('gateId'); }
  [SOURCE_FORM]() {
    let source = `diagnostic(${quote(this.code)},${quote(this.message)})`;
    if (this.severity.id !== 'ERROR') source += `.severity(${this.severity[SOURCE_FORM]()})`;
    if (this.file) source += `.file(${quote(this.file)}${this.location ? `,${quote(this.location)}` : ''})`;
    if (this.subject) source += `.subject(${quote(this.subject)})`;
    if (this.expected) source += `.expected(${quote(this.expected)})`;
    if (this.received) source += `.received(${quote(this.received)})`;
    if (this.authority) source += `.authority(${this.authority[SOURCE_FORM]()})`;
    source = sourceChain(source, 'trace', this.traceSlice);
    if (this.owner) source += `.owner(${quote(this.owner)})`;
    if (this.gateId) source += `.gate(${quote(this.gateId)})`;
    return `${source}.seal()`;
  }
}

class DiagnosticBuilder {
  #code;
  #message;
  #severity = ERROR;
  #file = null;
  #location = null;
  #subject = null;
  #expected = null;
  #received = null;
  #authority = null;
  #trace = [];
  #owner = null;
  #gateId = null;
  #sealed = false;
  constructor(code, message) {
    this.#code = validateId(code, 'invalid-diagnostic-code', 'Diagnostic code');
    this.#message = validateText(message, 'invalid-diagnostic-message', 'Diagnostic message');
  }
  #assertOpen() { if (this.#sealed) throw new NllError('diagnostic-sealed', `Diagnostic ${this.#code} is sealed.`); }
  severity(value) { this.#assertOpen(); invariant(value instanceof DiagnosticSeverity, 'invalid-diagnostic-severity', 'Expected a DiagnosticSeverity.'); this.#severity = value; return this; }
  file(value, location = null) { this.#assertOpen(); this.#file = validateText(value, 'invalid-diagnostic-file', 'Diagnostic file'); if (location !== null) this.#location = validateText(location, 'invalid-diagnostic-location', 'Diagnostic location'); return this; }
  subject(value) { this.#assertOpen(); this.#subject = validateText(value, 'invalid-diagnostic-subject', 'Diagnostic subject'); return this; }
  expected(value) { this.#assertOpen(); this.#expected = validateText(value, 'invalid-diagnostic-expected', 'Expected value'); return this; }
  received(value) { this.#assertOpen(); this.#received = validateText(value, 'invalid-diagnostic-received', 'Received value'); return this; }
  authority(value) { this.#assertOpen(); invariant(value instanceof ArchitectureValue, 'invalid-diagnostic-authority', 'Expected an opaque authority value.'); this.#authority = value; return this; }
  trace(...values) { this.#assertOpen(); for (const value of values) validateText(value, 'invalid-trace-slice', 'Trace slice'); this.#trace.push(...values); return this; }
  owner(value) { this.#assertOpen(); this.#owner = validateId(value, 'invalid-diagnostic-owner', 'Diagnostic owner'); return this; }
  gate(value) { this.#assertOpen(); this.#gateId = validateId(value, 'invalid-diagnostic-gate', 'Diagnostic gate'); return this; }
  seal() {
    this.#assertOpen();
    assertUnique(this.#trace, (value) => value, 'duplicate-trace-entry', 'trace entry');
    this.#sealed = true;
    return new ArchitectureDiagnostic(this.#code, this.#message, {
      severity: this.#severity, file: this.#file, location: this.#location, subject: this.#subject,
      expected: this.#expected, received: this.#received, authority: this.#authority,
      traceSlice: freeze(this.#trace), owner: this.#owner, gateId: this.#gateId
    });
  }
}

class DiagnosticRouteRule extends ArchitectureValue {
  constructor(code, owner) {
    super('DiagnosticRouteRule', {
      code: validateId(code, 'invalid-diagnostic-code', 'Diagnostic code'),
      owner: validateId(owner, 'invalid-diagnostic-owner', 'Diagnostic owner')
    });
  }
  get code() { return this.detail('code'); }
  get owner() { return this.detail('owner'); }
  [SOURCE_FORM]() { return `diagnosticRoute(${quote(this.code)},${quote(this.owner)})`; }
}

class RoutedDiagnostic extends ArchitectureValue {
  constructor(owner, value) { super('RoutedDiagnostic', { owner, value }); }
  get owner() { return this.detail('owner'); }
  get diagnostic() { return this.detail('value'); }
  [SOURCE_FORM]() { return `routedDiagnostic(${quote(this.owner)},${this.diagnostic[SOURCE_FORM]()})`; }
}

class DiagnosticRouter extends ArchitectureValue {
  constructor(id, rules, fallbackOwner) { super('DiagnosticRouter', { id, rules: freeze(rules), fallbackOwner }); }
  get id() { return this.detail('id'); }
  get rules() { return this.detail('rules'); }
  get fallbackOwner() { return this.detail('fallbackOwner'); }
  route(value) {
    invariant(value instanceof ArchitectureDiagnostic, 'invalid-diagnostic', 'DiagnosticRouter expects an ArchitectureDiagnostic.');
    const owner = value.owner || this.rules.find((rule) => rule.code === value.code)?.owner || this.fallbackOwner;
    return new RoutedDiagnostic(owner, value);
  }
  routeAll(values) {
    assertInstances(values, ArchitectureDiagnostic, 'invalid-diagnostic', 'Expected an ArchitectureDiagnostic.');
    return freeze(values.map((value) => this.route(value)).sort((left, right) =>
      left.owner.localeCompare(right.owner)
      || left.diagnostic.code.localeCompare(right.diagnostic.code)
      || (left.diagnostic.subject || '').localeCompare(right.diagnostic.subject || '')));
  }
  [SOURCE_FORM]() {
    return `diagnosticRouter(${quote(this.id)},${this.rules.map((rule) => rule[SOURCE_FORM]()).join(',')})`
      + `.fallback(${quote(this.fallbackOwner)}).seal()`;
  }
}

class DiagnosticRouterBuilder {
  #id;
  #rules = [];
  #fallbackOwner = 'nll-review-and-repair';
  #sealed = false;
  constructor(id, rules) { this.#id = validateId(id, 'invalid-diagnostic-router-id', 'Diagnostic router id'); this.#rules.push(...rules); }
  routes(...values) { if (this.#sealed) throw new NllError('diagnostic-router-sealed', `Diagnostic router ${this.#id} is sealed.`); assertInstances(values, DiagnosticRouteRule, 'invalid-diagnostic-route', 'Expected a DiagnosticRouteRule.'); this.#rules.push(...values); return this; }
  fallback(value) { if (this.#sealed) throw new NllError('diagnostic-router-sealed', `Diagnostic router ${this.#id} is sealed.`); this.#fallbackOwner = validateId(value, 'invalid-diagnostic-owner', 'Fallback diagnostic owner'); return this; }
  seal() { if (this.#sealed) throw new NllError('diagnostic-router-sealed', `Diagnostic router ${this.#id} is sealed.`); assertInstances(this.#rules, DiagnosticRouteRule, 'invalid-diagnostic-route', 'Expected a DiagnosticRouteRule.'); assertUnique(this.#rules, (rule) => rule.code, 'duplicate-diagnostic-route', 'diagnostic route'); this.#sealed = true; return new DiagnosticRouter(this.#id, this.#rules, this.#fallbackOwner); }
}

const diagnosticSeverity = (id) => new DiagnosticSeverity(id);
const INFO = diagnosticSeverity('INFO');
const WARNING = diagnosticSeverity('WARNING');
const ERROR = diagnosticSeverity('ERROR');
const diagnostic = (code, message) => new DiagnosticBuilder(code, message);
const diagnosticRoute = (code, owner) => new DiagnosticRouteRule(code, owner);
const diagnosticRouter = (id, ...rules) => new DiagnosticRouterBuilder(id, rules);
const routedDiagnostic = (owner, value) => new RoutedDiagnostic(owner, value);

const DEFAULT_DIAGNOSTIC_ROUTER = diagnosticRouter('nll.default-diagnostics@1',
  diagnosticRoute('PLAN_UNMAPPED_RULE_OBLIGATION', 'nll-train-agent'),
  diagnosticRoute('METHOD_NOT_APPLICABLE', 'nll-train-agent'),
  diagnosticRoute('PLAN_IMPLEMENTATION_DRIFT', 'nll-train-agent'),
  diagnosticRoute('UNCLASSIFIED_CAPABILITY_CYCLE', 'nll-train-agent'),
  diagnosticRoute('PLAN_OWNERSHIP_MISMATCH', 'nll-train-agent'),
  diagnosticRoute('MISSING_ABSTRACT_TRANSFER', 'nll-train-agent'),
  diagnosticRoute('SYMBOLIC_UNSUPPORTED_NODE', 'nll-train-agent'),
  diagnosticRoute('ABSENCE_WITHOUT_COVERAGE', 'nll-train-agent'),
  diagnosticRoute('REFINEMENT_STALLED', 'nll-review-and-repair'),
  diagnosticRoute('PROOF_UNDISCHARGED', 'nll-train-agent'),
  diagnosticRoute('BENCHMARK_ORACLE_CONFLICT', 'nll-review-and-repair'),
  diagnosticRoute('EFFECT_DRIFT', 'nll-train-agent'),
  diagnosticRoute('PACK_PROVIDER_AMBIGUITY', 'nll-train-agent')
).seal();

export {
  ArchitectureDiagnostic, DEFAULT_DIAGNOSTIC_ROUTER, DiagnosticBuilder, DiagnosticRouteRule,
  DiagnosticRouter, DiagnosticRouterBuilder, DiagnosticSeverity, ERROR, INFO, RoutedDiagnostic, WARNING,
  diagnostic, diagnosticRoute, diagnosticRouter, diagnosticSeverity, routedDiagnostic
};
