import {
  agent, benchmarks, build, description, materializationProfiles, primitiveRegistries, rulePacks,
  runs, tests, theorySources, using
} from '../../src/agent/api.mjs';
import { agentBuild, contextResource } from '../../src/context/index.mjs';
import { DEFAULT_PRIMITIVE_REGISTRY } from '../../src/sdk/index.mjs';
import continuityCircuit from './circuits/continuity.circuit.mjs';
import profile from './materialization/continuity.profile.mjs';
import ontology from './ontologies/index.mjs';
import pack from './pack.mjs';

export default agent(
  'narrative-continuity',
  description('Editorial object-continuity assessment over Codex-authored, source-grounded LongTextJS.'),
  using(ontology),
  runs(continuityCircuit),
  rulePacks(pack),
  materializationProfiles(profile),
  primitiveRegistries(DEFAULT_PRIMITIVE_REGISTRY),
  build(agentBuild('narrative-continuity', 'eval-build-20260731', 'sha256:narrative-continuity-eval-build-20260731')),
  theorySources(contextResource(
    'theory', 'training/theory-input/editorial-continuity-theory.md',
    'sha256:editorial-continuity-theory-20260731'
  )),
  tests(contextResource('test', 'tests/narrative-continuity.test.mjs', 'sha256:narrative-continuity-tests-20260731')),
  benchmarks(contextResource('benchmark', 'benchmark/index.mjs', 'sha256:narrative-continuity-benchmarks-20260731'))
);
