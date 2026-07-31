import {
  agent,
  benchmarks,
  build,
  description,
  materializationProfiles,
  primitiveRegistries,
  rulePacks,
  runs,
  tests,
  theorySources,
  using
} from '../../../src/agent/index.mjs';
import { agentBuild, contextResource } from '../../../src/context/index.mjs';
import { DEFAULT_PRIMITIVE_REGISTRY } from '../../../src/sdk/index.mjs';
import ontology from './ontologies/index.mjs';
import profile from './materialization/scientific.profile.mjs';
import circuit from './circuits/scientific-consistency.circuit.mjs';
import pack from './pack.mjs';

export default agent(
  'scientific-consistency',
  description('Cross-section quantitative scientific report control with compatibility-before-arithmetic.'),
  using(ontology),
  runs(circuit),
  rulePacks(pack),
  materializationProfiles(profile),
  primitiveRegistries(DEFAULT_PRIMITIVE_REGISTRY),
  build(agentBuild(
    'scientific-consistency',
    'scientific-consistency@1',
    'sha256:007992eded91fea009527060a22a030ff5b3a1816a9edaf442294dd00e472caa'
  )),
  theorySources(contextResource(
    'theory', 'theory-input/scientific-report-control.md',
    'sha256:scientific-report-control-2026-07-31'
  )),
  tests(contextResource('test', 'generated/tests/scientific-consistency.test.mjs', 'sha256:scientific-tests-1')),
  benchmarks(contextResource(
    'benchmark', 'generated/benchmarks/scientific-consistency.benchmark.mjs', 'sha256:scientific-benchmark-1'
  ))
);
