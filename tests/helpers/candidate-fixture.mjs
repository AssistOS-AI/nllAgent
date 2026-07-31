import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

function url(path) { return pathToFileURL(path).href; }

async function writeCandidate(root, repositoryRoot, agentId) {
  await mkdir(join(root, 'ontologies'), { recursive: true });
  await mkdir(join(root, 'circuits'), { recursive: true });
  await mkdir(join(root, 'tests'), { recursive: true });
  await mkdir(join(root, 'benchmarks', 'empty-document'), { recursive: true });
  await writeFile(join(root, 'ontologies', 'index.mjs'), [
    `import { ontology } from '${url(join(repositoryRoot, 'src', 'ontology', 'api.mjs'))}';`,
    `const O = ontology('${agentId}.ontology@1');`, "export const Thing = O.entity('Thing');", 'export default O.seal();',
    `export * from '${url(join(repositoryRoot, 'ontologies', 'core', 'index.mjs'))}';`, ''
  ].join('\n'), 'utf8');
  await writeFile(join(root, 'circuits', 'root.circuit.mjs'), [
    `import { circuit } from '${url(join(repositoryRoot, 'src', 'circuit', 'api.mjs'))}';`,
    "export default circuit('root@1');", ''
  ].join('\n'), 'utf8');
  await writeFile(join(root, 'agent.mjs'), [
    `import { agent, benchmarks, build, materializationProfiles, rulePacks, runs, tests, theorySources, using } from '${url(join(repositoryRoot, 'src', 'agent', 'api.mjs'))}';`,
    `import { agentBuild, contextResource } from '${url(join(repositoryRoot, 'src', 'context', 'index.mjs'))}';`,
    "import ontology from './ontologies/index.mjs';",
    "import pack, { profile } from './pack.mjs';", "import root from './circuits/root.circuit.mjs';",
    `export default agent('${agentId}',using(ontology),runs(root),rulePacks(pack),materializationProfiles(profile),build(agentBuild('${agentId}','candidate','sha256:candidate')),theorySources(contextResource('theory','theory/sources/001-authority.md','sha256:theory')),tests(contextResource('test','tests/agent.test.mjs','sha256:test')),benchmarks(contextResource('benchmark','benchmarks/empty-document/case.mjs','sha256:benchmark')));`, ''
  ].join('\n'), 'utf8');
  await writeFile(join(root, 'pack.mjs'), [
    `import * as A from '${url(join(repositoryRoot, 'src', 'architecture', 'index.mjs'))}';`,
    "const analysis=A.ruleAnalysis('RULE-1').authority(A.authoritySpan('theory/sources/001-authority.md',0,4)).obligations(A.ruleObligation('O1','Observe the rule.')).outcomes(A.outcome('UNKNOWN')).seal();",
    "const step=A.planStep('observe').obligations('O1').shapes(A.FINITE_PATTERN_MATCHING).outputs(A.capabilityRef('Assessment')).methods(A.queryDataflowMethod).create('circuits/root.circuit.mjs').owner('nll-train-agent').rationale('A finite source query.').seal();",
    "const plan=A.circuitArchitecturePlan('plan@1').sourceRule(analysis).goal(A.capabilityRef('Assessment')).steps(step).compose(A.circuitRef('root@1')).deriveMaterializationProfile('materialization/profile.mjs').benchmarkGoals('empty-case').ownership(A.ownedModule('circuits/root.circuit.mjs','nll-train-agent')).seal();",
    `export const profile=A.materializationProfile('profile@1').observations(A.observe(A.conceptRef('${agentId}.ontology@1:Thing'))).groundEveryClaimWith(A.groundingRequirement('source-span')).seal();`,
    "const provider=A.provider('provider@1').component(A.circuitRef('root@1')).provides(A.capabilityRef('Assessment')).seal();",
    "const pin=A.providerPin(A.capabilityRef('Assessment')).authorize(provider).select(provider).seal();",
    `export default A.rulePack('${agentId}.pack@1').sources(A.authorityFile('theory/sources/001-authority.md')).ontology(A.architectureRef('ontology','${agentId}.ontology@1')).plans(plan).materialization(profile).circuits(A.circuitRef('root@1')).assurance(A.CONCRETE).benchmarks(A.architectureRef('benchmark','empty@1')).providers(pin).seal();`,
    ''
  ].join('\n'), 'utf8');
  await writeFile(join(root, 'tests', 'agent.test.mjs'), [
    "import assert from 'node:assert/strict';", "import test from 'node:test';", "import agent from '../agent.mjs';",
    `test('candidate identity',()=>assert.equal(agent.id,'${agentId}'));`, ''
  ].join('\n'), 'utf8');
  await writeFile(join(root, 'benchmarks', 'empty-document', 'input.md'), '# Empty benchmark\n', 'utf8');
  await writeFile(join(root, 'benchmarks', 'empty-document', 'case.mjs'), [
    `import { benchmarkCase, findingCount } from '${url(join(repositoryRoot, 'src', 'benchmark', 'api.mjs'))}';`,
    "export default benchmarkCase('empty-document','input.md',findingCount(0));", ''
  ].join('\n'), 'utf8');
  await writeFile(join(root, 'handoff.md'), '# Candidate handoff\n\nTests and benchmark are ready.\n', 'utf8');
}

export { writeCandidate };
