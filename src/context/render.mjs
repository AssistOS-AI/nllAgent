import { canonicalSource } from '../core/canonical-source.mjs';
import { AgentAuthoringContext } from './model.mjs';

function renderAgentContextModule(context, options = {}) {
  assertContext(context);
  const apiModule = options.apiModule ?? './src/context/index.mjs';
  return `import {\n  agentAuthoringContext, agentBuild, contextField, contextRecord, contextResource,\n  coverageDemand, demandScope, sdkImport, semanticDemand\n} from '${escapeModule(apiModule)}';\n\nexport default ${canonicalSource(context)};\n`;
}

function renderAgentContextMarkdown(context) {
  assertContext(context);
  const build = context.agent.value('build');
  const lines = [
    `# Agent context: ${context.agent.id}`,
    '',
    `Purpose: **${context.purpose}**  `,
    `Build: **${build.id}** (${build.digest})  `,
    `Context digest: \`${context.digest}\``,
    '',
    '## Theory identities',
    '',
    ...resourceLines(context.theorySources, 'No theory source identities are exposed for this role.'),
    '',
    '## Ontology available to generated code',
    ''
  ];
  for (const ontology of context.ontology) {
    lines.push(`### ${ontology.id}`, '', '| Concept | Sort | Required/allowed roles |', '| --- | --- | --- |');
    for (const concept of ontology.values('concepts')) {
      const constraints = concept.values('constraints').map((value) =>
        `${value.id}[${value.value('minimum')}..${value.value('maximum')}]`);
      lines.push(`| ${cell(concept.id)} | ${cell(concept.value('sort'))} | ${cell(constraints.join(', ') || 'none')} |`);
    }
    lines.push('', '| Role | Source | Target | Cardinality |', '| --- | --- | --- | --- |');
    for (const role of ontology.values('roles')) {
      lines.push(`| ${cell(role.id)} | ${cell(role.values('source').join(' / '))} | ${cell(role.values('target').join(' / '))} | ${role.value('minimum')}..${role.value('maximum')} |`);
    }
    lines.push('');
  }
  lines.push('## Circuit inventory', '', '| Circuit | Requires | Provides | Methods | Components |',
    '| --- | --- | --- | --- | --- |');
  for (const circuit of context.circuits) {
    lines.push(`| ${cell(circuit.id)} | ${cell(join(circuit, 'required'))} | ${cell(join(circuit, 'provided'))} | ${cell(join(circuit, 'methods'))} | ${cell([...circuit.values('rules'), ...circuit.values('stages'), ...circuit.values('decisionTables')].join(', ') || 'none')} |`);
  }
  const demand = context.semanticDemand;
  lines.push('', '## Exact materialization demand', '',
    `Concepts: ${list([...demand.concepts])}`,
    `Roles: ${list([...demand.roles])}`,
    `Capabilities: ${list([...demand.capabilities])}`,
    `Operations: ${list([...demand.operations])}`,
    `Evidence policies: ${list([...demand.evidencePolicies])}`,
    `Closed coverage required: ${list(demand.coverageRequirements.map((value) => `${value.conceptId} within ${value.scopeId}`))}`,
    '',
    `Materialization profile: **${context.materializationProfile.id}**`,
    '',
    `Observed concepts: ${list(context.materializationProfile.values('observations').map((value) => value.id))}`,
    `Resolution duties: ${list(context.materializationProfile.values('resolutions'))}`,
    `Grounding duties: ${list(context.materializationProfile.values('grounding'))}`,
    `Alternatives to preserve: ${list(context.materializationProfile.values('alternatives'))}`,
    '',
    '## SDK methods and executable providers', '',
    '| Method | Problem shapes | Interpreters | Engine |', '| --- | --- | --- | --- |');
  for (const method of context.methodCatalog?.values('methods') ?? []) {
    lines.push(`| ${cell(method.id)} | ${cell(join(method, 'problemShapes'))} | ${cell(join(method, 'interpreters'))} | ${cell(method.value('engine') || 'none')} |`);
  }
  lines.push('',
    '| Method/provider | Engine or primitive | Import |', '| --- | --- | --- |');
  for (const provider of context.providers) {
    lines.push(`| ${cell(provider.id)} | ${cell(provider.value('primitive') || provider.value('component') || 'n/a')} | ${cell(provider.value('module') ? `${provider.value('module')}#${provider.value('export')}` : 'agent-local circuit')} |`);
  }
  lines.push('', 'Authorized SDK imports:', '');
  for (const entry of context.sdkImports) lines.push(`- \`${entry.modulePath}\`: ${entry.exports.map((value) => `\`${value}\``).join(', ')}`);
  lines.push('', '## Validation resources', '', 'Tests:', ...resourceLines(context.tests, 'No test identities exposed.'),
    '', 'Benchmarks:', ...resourceLines(context.benchmarks, 'No benchmark identities exposed.'),
    '', 'Commands:', '', ...context.commands.map((value) => `- \`${value}\``), '');
  return `${lines.join('\n')}\n`;
}

function assertContext(value) {
  if (!(value instanceof AgentAuthoringContext)) throw new TypeError('Expected an AgentAuthoringContext.');
}
function join(record, name) { return record.values(name).join(', ') || 'none'; }
function list(values) { return values.length ? [...values].sort().map((value) => `\`${value}\``).join(', ') : 'none'; }
function resourceLines(resources, empty) {
  return resources.length ? resources.map((value) => `- \`${value.id}\` — ${value.digest}`) : [`- ${empty}`];
}
function cell(value) { return String(value ?? '').replaceAll('|', '\\|'); }
function escapeModule(value) { return String(value).replaceAll('\\', '\\\\').replaceAll("'", "\\'"); }

export { renderAgentContextMarkdown, renderAgentContextModule };
