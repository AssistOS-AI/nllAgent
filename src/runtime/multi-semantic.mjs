import { CircuitTemplate } from '../circuit/model.mjs';
import { NllError, invariant } from '../core/errors.mjs';
import { ProofKernel } from '../engines/proof-kernel.mjs';
import { SynthesisEngine } from '../engines/synthesis-engine.mjs';
import {
  ABSTRACT_PREFLIGHT, CONCRETE_EXECUTION, LOCAL_PROOF_OBLIGATIONS, SYMBOLIC_WITNESS,
  TYPED_SYNTHESIS, AbstractState, EvidenceTruth, abstractCircuit as createAbstractCircuit,
  abstractPreflight, composeAssurance, opaqueOperation, replayWitness
} from '../interpreters/index.mjs';
import { SemanticValue } from '../ontology/model.mjs';
import { executeCircuit } from './scheduler.mjs';

class AssuranceBlocker extends SemanticValue {
  constructor(code, message) { super('AssuranceBlocker', { code, message }); }
  get code() { return this.detail('code'); }
  get message() { return this.detail('message'); }
}

class MultiSemanticResult extends SemanticValue {
  constructor(plan, concrete, abstract, witnesses, proofs, synthesis, blockers) {
    super('MultiSemanticResult', {
      plan, concrete, abstract,
      witnesses: Object.freeze([...witnesses]),
      proofs: Object.freeze([...proofs]),
      synthesis,
      blockers: Object.freeze([...blockers])
    });
  }
  get plan() { return this.detail('plan'); }
  get concrete() { return this.detail('concrete'); }
  get abstract() { return this.detail('abstract'); }
  get witnesses() { return this.detail('witnesses'); }
  get proofs() { return this.detail('proofs'); }
  get synthesis() { return this.detail('synthesis'); }
  get blockers() { return this.detail('blockers'); }
  get completed() { return this.blockers.length === 0; }
}

function conservativeAbstractCircuit(template) {
  invariant(template instanceof CircuitTemplate, 'invalid-circuit', 'Abstract derivation requires a CircuitTemplate.');
  const components = [...template.rules, ...template.stages, ...template.subcircuits];
  const operations = components.map((component, index) => opaqueOperation(
    component.id,
    index === 0 ? [] : [components[index - 1].id],
    EvidenceTruth.top()
  ));
  return createAbstractCircuit(`${template.id}:conservative`, operations);
}

async function executeMultiSemantic(request) {
  const { circuit, store, target, profile, options = {} } = request;
  if (!(circuit instanceof CircuitTemplate)) throw new NllError('invalid-circuit', 'Multi-semantic execution requires a CircuitTemplate.');
  const plan = composeAssurance(target, profile);
  const blockers = [];
  let abstract = null;
  if (plan.includesComponent(ABSTRACT_PREFLIGHT)) {
    const model = options.abstractCircuit || conservativeAbstractCircuit(circuit);
    abstract = abstractPreflight(model, options.abstractState || new AbstractState());
  }

  let concrete = null;
  if (plan.includesComponent(CONCRETE_EXECUTION)) {
    concrete = await executeCircuit(circuit, store, options.execution || {});
  }

  const witnesses = [];
  if (plan.includesComponent(SYMBOLIC_WITNESS)) {
    if (!options.witnessProtocol || !options.witnesses?.length) {
      blockers.push(new AssuranceBlocker('SYMBOLIC_WITNESS_UNAVAILABLE', 'Witnessed assurance requires witnesses and a replay protocol.'));
    } else {
      for (const witness of options.witnesses) witnesses.push(await replayWitness(witness, options.witnessProtocol));
      if (witnesses.some((result) => !result.confirmed)) {
        blockers.push(new AssuranceBlocker('WITNESS_NOT_REPRODUCED', 'At least one symbolic witness failed concrete replay.'));
      }
    }
  }

  const proofs = [];
  if (plan.includesComponent(LOCAL_PROOF_OBLIGATIONS)) {
    if (!options.certificates?.length) {
      blockers.push(new AssuranceBlocker('PROOF_UNDISCHARGED', 'Certified assurance requires local proof certificates.'));
    } else {
      const kernel = options.proofKernel || new ProofKernel();
      for (const certificate of options.certificates) proofs.push(kernel.verify(certificate, options.premises || []));
      if (proofs.some((result) => result.status !== 'ESTABLISHED')) {
        blockers.push(new AssuranceBlocker('PROOF_UNDISCHARGED', 'At least one local proof obligation was not established.'));
      }
    }
  }

  let synthesis = null;
  if (plan.includesComponent(TYPED_SYNTHESIS)) {
    if (!options.synthesis?.grammar || !options.synthesis?.validator) {
      blockers.push(new AssuranceBlocker('SYNTHESIS_UNAVAILABLE', 'Generative assurance requires a typed grammar and concrete validator.'));
    } else {
      const engine = options.synthesis.engine || new SynthesisEngine();
      synthesis = engine.synthesize(
        options.synthesis.grammar, options.synthesis.validator, options.synthesis.options || new Map()
      );
      if (synthesis.status !== 'FOUND') {
        blockers.push(new AssuranceBlocker('SYNTHESIS_EXHAUSTED', 'No validated synthesis candidate was found.'));
      }
    }
  }
  return new MultiSemanticResult(plan, concrete, abstract, witnesses, proofs, synthesis, blockers);
}

export { AssuranceBlocker, MultiSemanticResult, conservativeAbstractCircuit, executeMultiSemantic };
