import { NllError, invariant } from '../core/errors.mjs';
import {
  ArchitectureValue, SOURCE_FORM, assertInstances, assertUnique, freeze, quote, sourceChain,
  validateId, validateText
} from './common.mjs';
import { ArchitectureDiagnostic } from './diagnostics.mjs';

const ARTIFACT_PATH_PATTERN = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*\\).+$/u;

class BuildGate extends ArchitectureValue {
  constructor(id, prerequisites = []) {
    validateId(id, 'invalid-build-gate', 'Build gate');
    for (const value of prerequisites) validateId(value, 'invalid-build-gate-prerequisite', 'Build gate prerequisite');
    assertUnique(prerequisites, (value) => value, 'duplicate-gate-prerequisite', 'gate prerequisite');
    super('BuildGate', { id, prerequisites: freeze(prerequisites) });
  }
  get id() { return this.detail('id'); }
  get prerequisites() { return this.detail('prerequisites'); }
  [SOURCE_FORM]() { return `buildGate(${quote(this.id)}${this.prerequisites.length ? `,${this.prerequisites.map(quote).join(',')}` : ''})`; }
}

class GateStatus extends ArchitectureValue {
  constructor(id) {
    if (!['PENDING', 'PASSED', 'BLOCKED', 'STALE'].includes(id)) throw new NllError('invalid-gate-status', `Unsupported gate status: ${id}`);
    super('GateStatus', { id });
  }
  get id() { return this.detail('id'); }
  [SOURCE_FORM]() { return `gateStatus(${quote(this.id)})`; }
}

class BuildArtifact extends ArchitectureValue {
  constructor(path, digest, sourceGate) {
    if (typeof path !== 'string' || !ARTIFACT_PATH_PATTERN.test(path)) {
      throw new NllError('invalid-build-artifact-path', `Expected a contained relative artifact path: ${String(path)}`);
    }
    validateText(digest, 'invalid-build-artifact-digest', 'Artifact digest');
    invariant(sourceGate instanceof BuildGate, 'invalid-artifact-gate', 'Build artifact requires a BuildGate.');
    super('BuildArtifact', { path, digest, sourceGate });
  }
  get path() { return this.detail('path'); }
  get digest() { return this.detail('digest'); }
  get sourceGate() { return this.detail('sourceGate'); }
  [SOURCE_FORM]() { return `buildArtifact(${quote(this.path)},${quote(this.digest)},${this.sourceGate[SOURCE_FORM]()})`; }
}

class GateResult extends ArchitectureValue {
  constructor(gate, status, artifacts, diagnostics, reason) {
    super('GateResult', { gate, status, artifacts: freeze(artifacts), diagnostics: freeze(diagnostics), reason });
  }
  get gate() { return this.detail('gate'); }
  get status() { return this.detail('status'); }
  get artifacts() { return this.detail('artifacts'); }
  get diagnostics() { return this.detail('diagnostics'); }
  get reason() { return this.detail('reason'); }
  [SOURCE_FORM]() {
    return `gateResult(${this.gate[SOURCE_FORM]()},${this.status[SOURCE_FORM]()}`
      + `,${this.reason === null ? 'null' : quote(this.reason)},${this.artifacts.map((value) => value[SOURCE_FORM]()).join(',')}`
      + `${this.diagnostics.length ? `,${this.diagnostics.map((value) => value[SOURCE_FORM]()).join(',')}` : ''})`;
  }
}

class BuildState extends ArchitectureValue {
  constructor(id, results, extraDiagnostics) {
    const diagnostics = [...extraDiagnostics, ...results.flatMap((result) => result.diagnostics)];
    const artifacts = results.flatMap((result) => result.artifacts);
    super('BuildState', {
      id, results: freeze(results), diagnostics: freeze(diagnostics), artifacts: freeze(artifacts)
    });
  }
  get id() { return this.detail('id'); }
  get results() { return this.detail('results'); }
  get diagnostics() { return this.detail('diagnostics'); }
  get artifacts() { return this.detail('artifacts'); }
  result(gateOrId) { const id = gateOrId.id ?? gateOrId; return this.results.find((value) => value.gate.id === id); }
  get nextGate() { return this.results.find((value) => value.status.id !== 'PASSED')?.gate ?? null; }
  invalidateFrom(gateOrId, reason) {
    const id = gateOrId.id ?? gateOrId;
    const index = BUILD_GATES.findIndex((gate) => gate.id === id);
    if (index < 0) throw new NllError('unknown-build-gate', `Unknown build gate: ${id}`);
    validateText(reason, 'invalid-stale-reason', 'Stale reason');
    const results = this.results.map((result, resultIndex) => resultIndex < index || result.status.id === 'PENDING'
      ? result
      : new GateResult(result.gate, STALE, result.artifacts, [], reason));
    const resultDiagnostics = new Set(this.results.flatMap((value) => value.diagnostics));
    return new BuildState(this.id, results, this.diagnostics.filter((value) => !resultDiagnostics.has(value) && (() => {
      const diagnosticIndex = BUILD_GATES.findIndex((gate) => gate.id === value.gateId);
      return diagnosticIndex < 0 || diagnosticIndex < index;
    })()));
  }
  [SOURCE_FORM]() {
    let source = `buildState(${quote(this.id)})`;
    source = sourceChain(source, 'results', this.results.filter((value) => value.status.id !== 'PENDING'));
    const resultDiagnostics = new Set(this.results.flatMap((value) => value.diagnostics));
    source = sourceChain(source, 'diagnostics', this.diagnostics.filter((value) => !resultDiagnostics.has(value)));
    return `${source}.seal()`;
  }
}

class BuildStateBuilder {
  #id;
  #results = [];
  #diagnostics = [];
  #sealed = false;
  constructor(id) { this.#id = validateId(id, 'invalid-build-state-id', 'Build state id'); }
  #assertOpen() { if (this.#sealed) throw new NllError('build-state-sealed', `Build state ${this.#id} is sealed.`); }
  results(...values) { this.#assertOpen(); assertInstances(values, GateResult, 'invalid-gate-result', 'Expected a GateResult.'); this.#results.push(...values); return this; }
  diagnostics(...values) { this.#assertOpen(); assertInstances(values, ArchitectureDiagnostic, 'invalid-diagnostic', 'Expected an ArchitectureDiagnostic.'); this.#diagnostics.push(...values); return this; }
  seal() {
    this.#assertOpen();
    assertUnique(this.#results, (value) => value.gate.id, 'duplicate-gate-result', 'gate result');
    const known = new Set(BUILD_GATES.map((gate) => gate.id));
    if (this.#results.some((value) => !known.has(value.gate.id))) throw new NllError('unknown-build-gate', 'Build state contains an unknown gate.');
    const byId = new Map(this.#results.map((value) => [value.gate.id, value]));
    const results = BUILD_GATES.map((gate) => byId.get(gate.id) || new GateResult(gate, PENDING, [], [], null));
    for (const result of results) validateGateResult(result, results);
    const artifacts = results.flatMap((result) => result.artifacts);
    assertUnique(artifacts, (value) => value.path, 'duplicate-build-artifact', 'build artifact path');
    assertUnique(this.#diagnostics, (value) => `${value.code}:${value.subject || ''}:${value.message}`, 'duplicate-build-diagnostic', 'build diagnostic');
    this.#sealed = true;
    return new BuildState(this.#id, results, this.#diagnostics);
  }
}

function validateGateResult(result, allResults) {
  invariant(result instanceof GateResult, 'invalid-gate-result', 'Expected a GateResult.');
  const canonical = BUILD_GATES.find((gate) => gate.id === result.gate.id);
  invariant(canonical, 'unknown-build-gate', `Unknown build gate: ${result.gate.id}`);
  if (result.status.id === 'PASSED') {
    for (const prerequisite of canonical.prerequisites) {
      const upstream = allResults.find((value) => value.gate.id === prerequisite);
      invariant(upstream?.status.id === 'PASSED', 'gate-prerequisite-failed',
        `Gate ${canonical.id} cannot pass before ${prerequisite}.`);
    }
    invariant(result.diagnostics.length === 0, 'passed-gate-diagnostics', `Passed gate ${canonical.id} cannot retain diagnostics.`);
  }
  if (result.status.id === 'BLOCKED') {
    invariant(result.diagnostics.length > 0, 'blocked-gate-without-diagnostic', `Blocked gate ${canonical.id} requires a diagnostic.`);
  }
  if (result.status.id === 'STALE') invariant(result.reason, 'stale-gate-without-reason', `Stale gate ${canonical.id} requires a reason.`);
  if (result.status.id === 'PENDING') {
    invariant(result.artifacts.length === 0 && result.diagnostics.length === 0 && result.reason === null,
      'invalid-pending-gate', `Pending gate ${canonical.id} cannot contain artifacts, diagnostics, or a reason.`);
  }
  for (const artifact of result.artifacts) {
    invariant(artifact.sourceGate.id === canonical.id, 'artifact-gate-mismatch',
      `Artifact ${artifact.path} belongs to ${artifact.sourceGate.id}, not ${canonical.id}.`);
  }
}

const buildGate = (id, ...prerequisites) => new BuildGate(id, prerequisites);
const G1 = buildGate('G1');
const G2 = buildGate('G2', 'G1');
const G3 = buildGate('G3', 'G2');
const G4 = buildGate('G4', 'G3');
const G5 = buildGate('G5', 'G4');
const G6 = buildGate('G6', 'G5');
const G7 = buildGate('G7', 'G6');
const G8 = buildGate('G8', 'G7');
const BUILD_GATES = freeze([G1, G2, G3, G4, G5, G6, G7, G8]);
const gateStatus = (id) => new GateStatus(id);
const PENDING = gateStatus('PENDING');
const PASSED = gateStatus('PASSED');
const BLOCKED = gateStatus('BLOCKED');
const STALE = gateStatus('STALE');
const buildArtifact = (path, digest, gate) => new BuildArtifact(path, digest, gate);
const gateResult = (gate, status, reason = null, ...values) => {
  invariant(gate instanceof BuildGate, 'invalid-build-gate', 'Gate result requires a BuildGate.');
  invariant(status instanceof GateStatus, 'invalid-gate-status', 'Gate result requires a GateStatus.');
  const artifacts = values.filter((value) => value instanceof BuildArtifact);
  const diagnostics = values.filter((value) => value instanceof ArchitectureDiagnostic);
  if (artifacts.length + diagnostics.length !== values.length) throw new NllError('invalid-gate-result-value', 'Gate results accept only build artifacts and diagnostics.');
  return new GateResult(gate, status, artifacts, diagnostics, reason);
};
const passedGate = (gate, ...artifacts) => gateResult(gate, PASSED, null, ...artifacts);
const blockedGate = (gate, ...diagnostics) => gateResult(gate, BLOCKED, null, ...diagnostics);
const staleGate = (gate, reason, ...artifacts) => gateResult(gate, STALE, reason, ...artifacts);
const buildState = (id) => new BuildStateBuilder(id);

export {
  BLOCKED, BUILD_GATES, BuildArtifact, BuildGate, BuildState, BuildStateBuilder, G1, G2, G3, G4, G5,
  G6, G7, G8, GateResult, GateStatus, PASSED, PENDING, STALE, blockedGate, buildArtifact, buildGate,
  buildState, gateResult, gateStatus, passedGate, staleGate
};
