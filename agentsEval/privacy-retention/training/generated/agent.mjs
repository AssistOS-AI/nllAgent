import {
  agent, benchmarks, build, description, materializationProfiles, materializes,
  primitiveRegistries, rulePacks, runs, tests, theorySources, using
} from '../../../../src/agent/api.mjs';
import { agentBuild, contextResource } from '../../../../src/context/index.mjs';
import { DEFAULT_PRIMITIVE_REGISTRY } from '../../../../src/sdk/index.mjs';
import retentionCircuit from './circuits/retention.circuit.mjs';
import { materializePrivacyRetention } from './calibration/privacy-retention.materializer.mjs';
import profile from './materialization/retention.profile.mjs';
import ontology from './ontologies/index.mjs';
import pack from './pack.mjs';

export default agent(
  'privacy-retention',
  description('Northstar privacy-retention assessment compiled from fictional policy authority.'),
  using(ontology),
  materializes(materializePrivacyRetention),
  runs(retentionCircuit),
  rulePacks(pack),
  materializationProfiles(profile),
  primitiveRegistries(DEFAULT_PRIMITIVE_REGISTRY),
  build(agentBuild('privacy-retention', 'eval-2026-07-31',
    'sha256:8111b3835a6e7b63a29c25832a07e6c4a339cf6459d4b9df2f61c6ed11f7e51d')),
  theorySources(contextResource('theory', 'theory/sources/retention-policy.md',
    'sha256:34589d56bd4c16dd37f626a3d76f94971fd906e584f189d8d152f27ce65c7876')),
  tests(contextResource('test', 'tests/privacy-retention.test.mjs',
    'sha256:912c70f735cf94ba983fd6fc239e0c243bf124e565d3e3a6aad52b5728745933')),
  benchmarks(contextResource('benchmark', 'benchmarks/privacy-retention',
    'sha256:afdc32e9e6ac0277f9ed59f44d4e350056b41093484433c2d73558b556bae5c5'))
);
