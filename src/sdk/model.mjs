import { SOURCE_FORM, quote } from '../core/canonical-source.mjs';
import { NllError, invariant } from '../core/errors.mjs';
import { MethodCatalog } from '../architecture/methods.mjs';
import { SemanticValue } from '../ontology/model.mjs';
import { PrimitiveRegistry } from '../primitives/registry.mjs';

class SdkType extends SemanticValue {
  constructor(id) { super('SdkType', { id }); }
  get id() { return this.detail('id'); }
}

class SdkImport extends SemanticValue {
  constructor(id, modulePath, exports, providerIds) {
    invariant(typeof id === 'string' && id.length > 0, 'invalid-sdk-import', 'SDK import requires an id.');
    invariant(typeof modulePath === 'string' && modulePath.endsWith('.mjs') && !modulePath.startsWith('/')
      && !modulePath.split('/').includes('..'),
    'invalid-sdk-import', 'SDK import module must be a contained .mjs path.');
    invariant(exports.length > 0 && exports.every(validExport),
      'invalid-sdk-import', 'SDK import requires JavaScript export names.');
    invariant(providerIds.every((value) => typeof value === 'string' && value.length > 0),
      'invalid-sdk-import', 'SDK import provider ids must be non-empty strings.');
    super('SdkImport', {
      id, modulePath, exports: Object.freeze([...new Set(exports)].sort()),
      providerIds: Object.freeze([...new Set(providerIds)].sort())
    });
  }
  get id() { return this.detail('id'); }
  get modulePath() { return this.detail('modulePath'); }
  get exports() { return this.detail('exports'); }
  get providerIds() { return this.detail('providerIds'); }
  [SOURCE_FORM]() {
    return `sdkImport(${quote(this.id)},${quote(this.modulePath)},[${this.exports.map(quote).join(',')}],[${this.providerIds.map(quote).join(',')}])`;
  }
}

class SdkEngineResult extends SemanticValue {
  constructor(engine, values) { super('SdkEngineResult', { engine, values: Object.freeze([...values]) }); }
  get engine() { return this.detail('engine'); }
  get values() { return this.detail('values'); }
  value(index) { return this.values[index]; }
}

class SdkCatalog extends SemanticValue {
  constructor(id, methodCatalog, primitiveRegistry, imports) {
    invariant(methodCatalog instanceof MethodCatalog, 'invalid-sdk-method-catalog', 'SDK requires a MethodCatalog.');
    invariant(primitiveRegistry instanceof PrimitiveRegistry,
      'invalid-sdk-primitive-registry', 'SDK requires a PrimitiveRegistry.');
    invariant(imports.length > 0 && imports.every((value) => value instanceof SdkImport),
      'invalid-sdk-imports', 'SDK requires typed import descriptors.');
    const uncovered = methodCatalog.descriptors
      .filter((method) => primitiveRegistry.providersForMethod(method.id).length === 0)
      .map((method) => method.id);
    if (uncovered.length) throw new NllError('sdk-method-without-provider', uncovered.join(', '));
    super('SdkCatalog', { id, methodCatalog, primitiveRegistry, imports: Object.freeze([...imports]) });
  }
  get id() { return this.detail('id'); }
  get methodCatalog() { return this.detail('methodCatalog'); }
  get primitiveRegistry() { return this.detail('primitiveRegistry'); }
  get imports() { return this.detail('imports'); }
  providersForMethod(methodId) { return this.primitiveRegistry.providersForMethod(methodId); }
}

function validExport(value) { return typeof value === 'string' && /^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(value); }
const sdkType = (id) => new SdkType(id);
const sdkImport = (id, modulePath, exports, providerIds = []) => new SdkImport(id, modulePath, exports, providerIds);
const sdkEngineResult = (engine, ...values) => new SdkEngineResult(engine, values);

export { SdkCatalog, SdkEngineResult, SdkImport, SdkType, sdkEngineResult, sdkImport, sdkType };
