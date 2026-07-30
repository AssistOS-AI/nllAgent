import { relative } from 'node:path';
import { SOURCE_FORM, quote } from '../core/canonical-source.mjs';
import { CNLFrame } from '../generation/cnl.mjs';
import { Claim } from '../longtext/model.mjs';
import { RoleValue, Term } from '../ontology/model.mjs';

function moduleSpecifier(fromDirectory, target) {
  const value = relative(fromDirectory, target).replaceAll('\\', '/');
  return value.startsWith('.') ? value : `./${value}`;
}

function collectOntologyNames(value, names = new Set()) {
  if (value instanceof Claim) return collectOntologyNames(value.content, names);
  if (value instanceof Term) {
    names.add(value.concept.name);
    for (const roleValue of value.roleValues) collectOntologyNames(roleValue, names);
  } else if (value instanceof RoleValue) {
    names.add(value.role.name);
    for (const nested of value.values) collectOntologyNames(nested, names);
  }
  return names;
}

function replaceSourceReference(text, sourceId, replacement = 'sourceValue') {
  return text.replaceAll(`sourceRef(${quote(sourceId)})`, replacement);
}

function renderLongTextModule(program, options) {
  const names = new Set();
  for (const value of program.values()) collectOntologyNames(value, names);
  const api = moduleSpecifier(options.moduleDirectory, options.longTextApi);
  const ontologyApi = moduleSpecifier(options.moduleDirectory, options.ontologyApi);
  const ontology = moduleSpecifier(options.moduleDirectory, options.ontologyModule);
  const sourceLine = `const sourceValue = source(${quote(program.source.id)},${quote(program.source.text)},${quote(program.source.revision)});`;
  const units = program.units.map((unit) => replaceSourceReference(unit[SOURCE_FORM](), program.source.id));
  return [
    `import { alternatives, ambiguous, assertedBy, claim, confidence, coverage, explicit, gap, groundedAt, identityCandidate, inferred, interpretation, longTextProgram, mention, producedBy, proposed, rejected, resolvesTo, semanticUnit, source, span, verified, within } from ${quote(api)};`,
    `import { identifiedAs } from ${quote(ontologyApi)};`,
    names.size ? `import { ${[...names].sort().join(', ')} } from ${quote(ontology)};` : '',
    '',
    sourceLine,
    '',
    `const program = longTextProgram(${quote(program.id)},sourceValue,`,
    units.map((unit) => `  ${unit}`).join(',\n'),
    ');',
    '',
    'export { sourceValue };',
    'export default program;',
    ''
  ].filter((line) => line !== '').join('\n');
}

function renderTraceModule(trace, options) {
  const artifacts = moduleSpecifier(options.moduleDirectory, options.artifactsApi);
  const traceApi = moduleSpecifier(options.moduleDirectory, options.traceApi);
  return [
    `import { persistedTrace } from ${quote(artifacts)};`,
    `import { traceEvent } from ${quote(traceApi)};`,
    '',
    `export default persistedTrace(${quote(trace.id)},`,
    trace.events.map((event) => `  ${event[SOURCE_FORM]()}`).join(',\n'),
    ');',
    ''
  ].join('\n');
}

function renderResultModule(id, status, outputs, options) {
  const names = new Set();
  for (const output of outputs) collectOntologyNames(output, names);
  const artifactApi = moduleSpecifier(options.moduleDirectory, options.artifactsApi);
  const ontology = moduleSpecifier(options.moduleDirectory, options.ontologyModule);
  const longText = moduleSpecifier(options.moduleDirectory, options.longTextModule);
  const longTextApi = moduleSpecifier(options.moduleDirectory, options.longTextApi);
  const cnl = moduleSpecifier(options.moduleDirectory, options.cnlApi);
  const sourceId = options.sourceId;
  const values = outputs.map((output) => {
    if (output instanceof CNLFrame) return output[SOURCE_FORM]();
    return replaceSourceReference(output[SOURCE_FORM](), sourceId);
  });
  return [
    `import { analysisResult } from ${quote(artifactApi)};`,
    names.size ? `import { ${[...names].sort().join(', ')} } from ${quote(ontology)};` : '',
    `import { sourceValue } from ${quote(longText)};`,
    `import { span } from ${quote(longTextApi)};`,
    outputs.some((output) => output instanceof CNLFrame) ? `import { cnlFrame, slot } from ${quote(cnl)};` : '',
    '',
    `export default analysisResult(${quote(id)},${quote(status)},`,
    values.map((value) => `  ${value}`).join(',\n'),
    ');',
    ''
  ].filter((line) => line !== '').join('\n');
}

export { collectOntologyNames, moduleSpecifier, renderLongTextModule, renderResultModule, renderTraceModule };
