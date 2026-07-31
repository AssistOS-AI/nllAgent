import { NllError, invariant } from '../core/errors.mjs';
import {
  ArchitectureReference, ArchitectureValue, SOURCE_FORM, assertInstances, assertUnique, freeze, quote,
  sourceChain, validateId
} from './common.mjs';

class ProblemShape extends ArchitectureValue {
  constructor(id) {
    super('ProblemShape', { id: validateId(id, 'invalid-problem-shape', 'Problem shape') });
  }
  get id() { return this.detail('id'); }
  [SOURCE_FORM]() { return `problemShape(${quote(this.id)})`; }
}

class MethodCondition extends ArchitectureValue {
  constructor(id) {
    super('MethodCondition', { id: validateId(id, 'invalid-method-condition', 'Method condition') });
  }
  get id() { return this.detail('id'); }
  [SOURCE_FORM]() { return `methodCondition(${quote(this.id)})`; }
}

class InterpreterMode extends ArchitectureValue {
  constructor(id) {
    super('InterpreterMode', { id: validateId(id, 'invalid-interpreter-mode', 'Interpreter mode') });
  }
  get id() { return this.detail('id'); }
  [SOURCE_FORM]() { return `interpreterMode(${quote(this.id)})`; }
}

class MethodDescriptor extends ArchitectureValue {
  constructor(id, fields) {
    super('MethodDescriptor', { id, ...fields });
  }

  get id() { return this.detail('id'); }
  get problemShapes() { return this.detail('problemShapes'); }
  get requirements() { return this.detail('requirements'); }
  get outputs() { return this.detail('outputs'); }
  get interpreters() { return this.detail('interpreters'); }
  get preferences() { return this.detail('preferences'); }
  get rejections() { return this.detail('rejections'); }
  get diagnosticCodes() { return this.detail('diagnosticCodes'); }
  get engineId() { return this.detail('engineId'); }
  get complexity() { return this.detail('complexity'); }

  [SOURCE_FORM]() {
    let source = `method(${quote(this.id)})`;
    source = sourceChain(source, 'appliesTo', this.problemShapes);
    source = sourceChain(source, 'requires', this.requirements);
    source = sourceChain(source, 'provides', this.outputs);
    source = sourceChain(source, 'supports', this.interpreters);
    source = sourceChain(source, 'preferWhen', this.preferences);
    source = sourceChain(source, 'rejectWhen', this.rejections);
    source = sourceChain(source, 'diagnostics', this.diagnosticCodes);
    if (this.engineId) source += `.engine(${quote(this.engineId)})`;
    if (this.complexity !== 1) source += `.complexity(${this.complexity})`;
    return `${source}.seal()`;
  }
}

class MethodBuilder {
  #id;
  #problemShapes = [];
  #requirements = [];
  #outputs = [];
  #interpreters = [];
  #preferences = [];
  #rejections = [];
  #diagnosticCodes = [];
  #engineId = null;
  #complexity = 1;
  #sealed = false;

  constructor(id) { this.#id = validateId(id, 'invalid-method-id', 'Method id'); }
  #assertOpen() {
    if (this.#sealed) throw new NllError('method-sealed', `Method ${this.#id} is sealed.`);
  }
  appliesTo(...values) { this.#assertOpen(); assertInstances(values, ProblemShape, 'invalid-method-shape', 'Expected a ProblemShape.'); this.#problemShapes.push(...values); return this; }
  requires(...values) { this.#assertOpen(); assertInstances(values, MethodCondition, 'invalid-method-requirement', 'Expected a MethodCondition.'); this.#requirements.push(...values); return this; }
  provides(...values) { this.#assertOpen(); assertInstances(values, ArchitectureReference, 'invalid-method-output', 'Expected an ArchitectureReference.'); this.#outputs.push(...values); return this; }
  supports(...values) { this.#assertOpen(); assertInstances(values, InterpreterMode, 'invalid-method-interpreter', 'Expected an InterpreterMode.'); this.#interpreters.push(...values); return this; }
  preferWhen(...values) { this.#assertOpen(); assertInstances(values, MethodCondition, 'invalid-method-preference', 'Expected a MethodCondition.'); this.#preferences.push(...values); return this; }
  rejectWhen(...values) { this.#assertOpen(); assertInstances(values, MethodCondition, 'invalid-method-rejection', 'Expected a MethodCondition.'); this.#rejections.push(...values); return this; }
  diagnostics(...values) {
    this.#assertOpen();
    for (const value of values) validateId(value, 'invalid-diagnostic-code', 'Diagnostic code');
    this.#diagnosticCodes.push(...values);
    return this;
  }
  engine(value) { this.#assertOpen(); this.#engineId = validateId(value, 'invalid-engine-id', 'Engine id'); return this; }
  complexity(value) {
    this.#assertOpen();
    if (!Number.isSafeInteger(value) || value < 0) throw new NllError('invalid-method-complexity', 'Method complexity must be a non-negative integer.');
    this.#complexity = value;
    return this;
  }
  seal() {
    this.#assertOpen();
    invariant(this.#problemShapes.length > 0, 'missing-method-shape', `Method ${this.#id} has no problem shapes.`);
    invariant(this.#interpreters.some((mode) => mode.id === 'CONCRETE'),
      'missing-concrete-method', `Method ${this.#id} must support concrete execution.`);
    const groups = [this.#problemShapes, this.#requirements, this.#outputs, this.#interpreters, this.#preferences, this.#rejections];
    for (const values of groups) assertUnique(values, (value) => value.id, 'duplicate-method-entry', 'method entry');
    assertUnique(this.#diagnosticCodes, (value) => value, 'duplicate-method-diagnostic', 'method diagnostic');
    this.#sealed = true;
    return new MethodDescriptor(this.#id, {
      problemShapes: freeze(this.#problemShapes), requirements: freeze(this.#requirements),
      outputs: freeze(this.#outputs), interpreters: freeze(this.#interpreters),
      preferences: freeze(this.#preferences), rejections: freeze(this.#rejections),
      diagnosticCodes: freeze(this.#diagnosticCodes), engineId: this.#engineId, complexity: this.#complexity
    });
  }
}

class MethodRequest extends ArchitectureValue {
  constructor(id, shapes, signals, interpreters, reusableMethodIds) {
    super('MethodRequest', {
      id, shapes: freeze(shapes), signals: freeze(signals), interpreters: freeze(interpreters),
      reusableMethodIds: freeze(reusableMethodIds)
    });
  }
  get id() { return this.detail('id'); }
  get shapes() { return this.detail('shapes'); }
  get signals() { return this.detail('signals'); }
  get interpreters() { return this.detail('interpreters'); }
  get reusableMethodIds() { return this.detail('reusableMethodIds'); }
  [SOURCE_FORM]() {
    let source = `methodRequest(${quote(this.id)})`;
    source = sourceChain(source, 'shapes', this.shapes);
    source = sourceChain(source, 'signals', this.signals);
    source = sourceChain(source, 'assurance', this.interpreters);
    source = sourceChain(source, 'reusable', this.reusableMethodIds);
    return `${source}.seal()`;
  }
}

class MethodRequestBuilder {
  #id;
  #shapes = [];
  #signals = [];
  #interpreters = [CONCRETE];
  #reusable = [];
  #sealed = false;
  constructor(id) { this.#id = validateId(id, 'invalid-method-request-id', 'Method request id'); }
  #assertOpen() { if (this.#sealed) throw new NllError('method-request-sealed', `Method request ${this.#id} is sealed.`); }
  shapes(...values) { this.#assertOpen(); assertInstances(values, ProblemShape, 'invalid-request-shape', 'Expected a ProblemShape.'); this.#shapes.push(...values); return this; }
  signals(...values) { this.#assertOpen(); assertInstances(values, MethodCondition, 'invalid-request-signal', 'Expected a MethodCondition.'); this.#signals.push(...values); return this; }
  assurance(...values) { this.#assertOpen(); assertInstances(values, InterpreterMode, 'invalid-request-assurance', 'Expected an InterpreterMode.'); this.#interpreters = [CONCRETE, ...values.filter((value) => value.id !== 'CONCRETE')]; return this; }
  reusable(...values) { this.#assertOpen(); for (const value of values) validateId(value, 'invalid-reusable-method', 'Reusable method'); this.#reusable.push(...values); return this; }
  seal() {
    this.#assertOpen();
    invariant(this.#shapes.length > 0, 'missing-request-shape', `Method request ${this.#id} has no problem shapes.`);
    for (const values of [this.#shapes, this.#signals, this.#interpreters]) assertUnique(values, (value) => value.id, 'duplicate-method-request-entry', 'method request entry');
    assertUnique(this.#reusable, (value) => value, 'duplicate-reusable-method', 'reusable method');
    this.#sealed = true;
    return new MethodRequest(this.#id, this.#shapes, this.#signals, this.#interpreters, this.#reusable);
  }
}

class MethodSuggestion extends ArchitectureValue {
  constructor(descriptor, coveredShapes, preferenceMatches, reusable) {
    super('MethodSuggestion', { descriptor, coveredShapes: freeze(coveredShapes), preferenceMatches, reusable });
  }
  get descriptor() { return this.detail('descriptor'); }
  get coveredShapes() { return this.detail('coveredShapes'); }
  get preferenceMatches() { return this.detail('preferenceMatches'); }
  get reusable() { return this.detail('reusable'); }
  [SOURCE_FORM]() {
    return `methodSuggestion(${this.descriptor[SOURCE_FORM]()},${this.preferenceMatches},${this.reusable}`
      + `${this.coveredShapes.length ? `,${this.coveredShapes.map((shape) => shape[SOURCE_FORM]()).join(',')}` : ''})`;
  }
}

class MethodCover extends ArchitectureValue {
  constructor(request, suggestions, uncoveredShapes) {
    super('MethodCover', { request, suggestions: freeze(suggestions), uncoveredShapes: freeze(uncoveredShapes) });
  }
  get request() { return this.detail('request'); }
  get suggestions() { return this.detail('suggestions'); }
  get uncoveredShapes() { return this.detail('uncoveredShapes'); }
  get complete() { return this.uncoveredShapes.length === 0; }
  [SOURCE_FORM]() {
    const values = [...this.suggestions, ...this.uncoveredShapes];
    return `methodCover(${this.request[SOURCE_FORM]()}${values.length ? `,${values.map((value) => value[SOURCE_FORM]()).join(',')}` : ''})`;
  }
}

class MethodCatalog extends ArchitectureValue {
  constructor(id, descriptors) { super('MethodCatalog', { id, descriptors: freeze(descriptors) }); }
  get id() { return this.detail('id'); }
  get descriptors() { return this.detail('descriptors'); }
  method(id) { return this.descriptors.find((descriptor) => descriptor.id === id); }
  suggest(request) {
    invariant(request instanceof MethodRequest, 'invalid-method-request', 'MethodCatalog expects a MethodRequest.');
    return freeze(this.descriptors
      .filter((descriptor) => methodApplies(descriptor, request))
      .map((descriptor) => suggestionFor(descriptor, request))
      .sort(compareSuggestions));
  }
  suggestCover(request) {
    const ranked = this.suggest(request);
    const uncovered = new Map(request.shapes.map((shape) => [shape.id, shape]));
    const selected = [];
    while (uncovered.size) {
      const candidate = ranked
        .filter((suggestion) => !selected.includes(suggestion))
        .map((suggestion) => [suggestion, suggestion.coveredShapes.filter((shape) => uncovered.has(shape.id)).length])
        .filter(([, coverage]) => coverage > 0)
        .sort((left, right) => right[1] - left[1] || compareSuggestions(left[0], right[0]))[0];
      if (!candidate) break;
      selected.push(candidate[0]);
      for (const shape of candidate[0].coveredShapes) uncovered.delete(shape.id);
    }
    return new MethodCover(request, selected, uncovered.values());
  }
  [SOURCE_FORM]() { return `methodCatalog(${quote(this.id)},${this.descriptors.map((value) => value[SOURCE_FORM]()).join(',')}).seal()`; }
}

class MethodCatalogBuilder {
  #id;
  #descriptors = [];
  #sealed = false;
  constructor(id, descriptors) { this.#id = validateId(id, 'invalid-method-catalog-id', 'Method catalog id'); this.#descriptors.push(...descriptors); }
  register(...values) { if (this.#sealed) throw new NllError('method-catalog-sealed', `Method catalog ${this.#id} is sealed.`); assertInstances(values, MethodDescriptor, 'invalid-method-descriptor', 'Expected a MethodDescriptor.'); this.#descriptors.push(...values); return this; }
  seal() { if (this.#sealed) throw new NllError('method-catalog-sealed', `Method catalog ${this.#id} is sealed.`); assertInstances(this.#descriptors, MethodDescriptor, 'invalid-method-descriptor', 'Expected a MethodDescriptor.'); assertUnique(this.#descriptors, (value) => value.id, 'duplicate-method-id', 'method'); this.#sealed = true; return new MethodCatalog(this.#id, this.#descriptors); }
}

function methodApplies(descriptor, request) {
  const shapeIds = new Set(request.shapes.map((value) => value.id));
  const signalIds = new Set(request.signals.map((value) => value.id));
  const interpreterIds = new Set(descriptor.interpreters.map((value) => value.id));
  return descriptor.problemShapes.some((value) => shapeIds.has(value.id))
    && descriptor.requirements.every((value) => signalIds.has(value.id))
    && descriptor.rejections.every((value) => !signalIds.has(value.id))
    && request.interpreters.every((value) => interpreterIds.has(value.id));
}

function suggestionFor(descriptor, request) {
  const shapeIds = new Set(request.shapes.map((value) => value.id));
  const signalIds = new Set(request.signals.map((value) => value.id));
  return new MethodSuggestion(
    descriptor,
    descriptor.problemShapes.filter((value) => shapeIds.has(value.id)),
    descriptor.preferences.filter((value) => signalIds.has(value.id)).length,
    request.reusableMethodIds.includes(descriptor.id)
  );
}

function compareSuggestions(left, right) {
  return right.coveredShapes.length - left.coveredShapes.length
    || (left.descriptor.problemShapes.length - left.coveredShapes.length) - (right.descriptor.problemShapes.length - right.coveredShapes.length)
    || Number(right.reusable) - Number(left.reusable)
    || right.preferenceMatches - left.preferenceMatches
    || left.descriptor.complexity - right.descriptor.complexity
    || left.descriptor.id.localeCompare(right.descriptor.id);
}

const problemShape = (id) => new ProblemShape(id);
const methodCondition = (id) => new MethodCondition(id);
const interpreterMode = (id) => new InterpreterMode(id);
const CONCRETE = interpreterMode('CONCRETE');
const ABSTRACT = interpreterMode('ABSTRACT');
const SYMBOLIC = interpreterMode('SYMBOLIC');
const CONCOLIC = interpreterMode('CONCOLIC');
const PROVE = interpreterMode('PROVE');
const SYNTHESIZE = interpreterMode('SYNTHESIZE');
const method = (id) => new MethodBuilder(id);
const methodRequest = (id) => new MethodRequestBuilder(id);
const methodCatalog = (id, ...descriptors) => new MethodCatalogBuilder(id, descriptors);
const methodSuggestion = (descriptor, preferenceMatches, reusable, ...coveredShapes) =>
  new MethodSuggestion(descriptor, coveredShapes, preferenceMatches, reusable);
const methodCover = (request, ...values) => {
  const suggestions = values.filter((value) => value instanceof MethodSuggestion);
  const uncoveredShapes = values.filter((value) => value instanceof ProblemShape);
  if (suggestions.length + uncoveredShapes.length !== values.length) {
    throw new NllError('invalid-method-cover-value', 'MethodCover accepts only suggestions and uncovered ProblemShapes.');
  }
  return new MethodCover(request, suggestions, uncoveredShapes);
};

export {
  ABSTRACT, CONCOLIC, CONCRETE, InterpreterMode, MethodBuilder, MethodCatalog, MethodCatalogBuilder,
  MethodCondition, MethodCover, MethodDescriptor, MethodRequest, MethodRequestBuilder, MethodSuggestion,
  PROVE, ProblemShape, SYMBOLIC, SYNTHESIZE, interpreterMode, method, methodApplies, methodCatalog,
  methodCondition, methodCover, methodRequest, methodSuggestion, problemShape
};
