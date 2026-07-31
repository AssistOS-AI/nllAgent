import {
  ABSTRACT, SYMBOLIC, architectureRef, authorityFile, capabilityRef, circuitRef,
  provider, providerPin, rulePack
} from '../../../../src/architecture/index.mjs';
import retentionCircuit from './circuits/retention.circuit.mjs';
import profile from './materialization/retention.profile.mjs';
import ontology from './ontologies/index.mjs';
import plan from './plans/retention.plan.mjs';

const assessment = capabilityRef('RetentionAssessment');
const implementation = provider('privacy.retention.assessment.provider@2')
  .component(circuitRef(retentionCircuit.id))
  .provides(assessment)
  .guarantees(
    architectureRef('guarantee', 'exact-source-evidence'),
    architectureRef('guarantee', 'coverage-aware-absence'),
    architectureRef('guarantee', 'four-valued-decision')
  )
  .local()
  .cost(1)
  .seal();

const pinned = providerPin(assessment).authorize(implementation).select(implementation).seal();

export default rulePack('privacy.retention.pack@2')
  .sources(authorityFile('theory/sources/retention-policy.md'))
  .ontology(architectureRef('ontology', ontology.id))
  .plans(plan)
  .materialization(profile)
  .circuits(circuitRef(retentionCircuit.id))
  .assurance(ABSTRACT, SYMBOLIC)
  .benchmarks(architectureRef('benchmark', 'privacy.retention.semantic-suite@2'))
  .providers(pinned)
  .seal();
