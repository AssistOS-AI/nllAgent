import { SOURCE_FORM, digestSource, quote } from '../core/canonical-source.mjs';
import { SemanticValue } from '../ontology/model.mjs';

class ArtifactReference extends SemanticValue {
  constructor(kind, path, identity) { super('ArtifactReference', { artifactKind: kind, path, identity }); }
  get artifactKind() { return this.detail('artifactKind'); }
  get path() { return this.detail('path'); }
  get identity() { return this.detail('identity'); }
  [SOURCE_FORM]() { return `artifactRef(${quote(this.artifactKind)},${quote(this.path)},${quote(this.identity)})`; }
}

class AnalysisResult extends SemanticValue {
  constructor(id, status, outputs, artifacts = []) {
    super('AnalysisResult', {
      id,
      status,
      outputs: Object.freeze([...outputs]),
      artifacts: Object.freeze([...artifacts]),
      identity: `analysis-result:${digestSource([id, status, ...outputs.map((item) => item.identity)])}`
    });
  }
  get id() { return this.detail('id'); }
  get status() { return this.detail('status'); }
  get outputs() { return this.detail('outputs'); }
  get artifacts() { return this.detail('artifacts'); }
  get identity() { return this.detail('identity'); }
}

class PersistedTrace extends SemanticValue {
  constructor(id, events) { super('PersistedTrace', { id, events: Object.freeze([...events]) }); }
  get id() { return this.detail('id'); }
  get events() { return this.detail('events'); }
}

const artifactRef = (kind, path, identity) => new ArtifactReference(kind, path, identity);
const analysisResult = (id, status, ...outputs) => new AnalysisResult(id, status, outputs);
const persistedTrace = (id, ...events) => new PersistedTrace(id, events);

export { AnalysisResult, ArtifactReference, PersistedTrace, analysisResult, artifactRef, persistedTrace };
