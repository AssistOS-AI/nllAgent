import {
  CONCRETE,
  architectureRef,
  authorityFile,
  capabilityRef,
  circuitRef,
  provider,
  providerPin,
  rulePack
} from '../../../src/architecture/index.mjs';
import plan from './plans/scientific-report.plan.mjs';
import profile from './materialization/scientific.profile.mjs';

const output = capabilityRef('scientific-consistency-assessment');
const localProvider = provider('eval.scientific-report.provider@1')
  .component(circuitRef('eval.scientific-report.consistency@1'))
  .provides(output)
  .local()
  .seal();

export default rulePack('eval.scientific-report.pack@1')
  .sources(authorityFile('theory-input/scientific-report-control.md'))
  .ontology(architectureRef('ontology', 'eval.scientific-report@1'))
  .plans(plan)
  .materialization(profile)
  .circuits(circuitRef('eval.scientific-report.consistency@1'))
  .assurance(CONCRETE)
  .benchmarks(architectureRef('benchmark', 'scientific-consistency-benchmark'))
  .providers(providerPin(output).authorize(localProvider).select(localProvider).seal())
  .seal();
