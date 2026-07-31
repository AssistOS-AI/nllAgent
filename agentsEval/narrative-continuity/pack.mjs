import {
  ABSTRACT, SYMBOLIC, architectureRef, authorityFile, capabilityRef, circuitRef, provider,
  providerPin, rulePack
} from '../../src/architecture/index.mjs';
import profile from './materialization/continuity.profile.mjs';
import plan from './plans/continuity.plan.mjs';

const assessment = capabilityRef('narrative-continuity-assessment');
const implementation = provider('narrative.continuity.provider@1')
  .component(circuitRef('narrative.continuity.root@1'))
  .provides(assessment)
  .guarantees(
    architectureRef('guarantee', 'source-grounded'),
    architectureRef('guarantee', 'coverage-aware-absence'),
    architectureRef('guarantee', 'transactional-findings')
  )
  .local()
  .cost(1)
  .seal();
const pin = providerPin(assessment).authorize(implementation).select(implementation).seal();

export default rulePack('narrative.continuity.pack@1')
  .sources(authorityFile('training/theory-input/editorial-continuity-theory.md'))
  .ontology(architectureRef('ontology', 'narrative.continuity@1'))
  .plans(plan)
  .materialization(profile)
  .circuits(circuitRef('narrative.continuity.root@1'))
  .assurance(ABSTRACT, SYMBOLIC)
  .benchmarks(architectureRef('benchmark', 'narrative.continuity@1'))
  .providers(pin)
  .seal();
