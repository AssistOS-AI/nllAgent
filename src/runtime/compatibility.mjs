import { STATUS_CEILINGS, guaranteeSatisfies } from './guarantees.mjs';

function availableTypes(program) {
  const capabilities = new Map();
  for (const capability of program.capabilities) {
    if (!capabilities.has(capability.type)) capabilities.set(capability.type, []);
    capabilities.get(capability.type).push(capability);
  }
  return capabilities;
}

function evaluateCompatibility(program, compiledCircuits, profile = {}) {
  const obligations = [];
  const supportedFormats = profile.formats || ['text/markdown'];
  obligations.push({
    kind: 'format', requirement: program.source.mediaType,
    status: supportedFormats.includes(program.source.mediaType) ? 'satisfied' : 'missing',
    evidence: { supportedFormats }
  });
  for (const channel of profile.requiredChannels || []) {
    obligations.push({
      kind: 'source-channel', requirement: channel,
      status: program.source.channels?.includes(channel) ? 'satisfied' : 'missing',
      critical: true, evidence: { availableChannels: program.source.channels || [] }
    });
  }
  for (const dialect of profile.requiredStructures || []) {
    obligations.push({
      kind: 'source-structure', requirement: dialect,
      status: program.source.structure?.dialect === dialect ? 'satisfied' : 'missing',
      critical: true, evidence: { actual: program.source.structure?.dialect || null }
    });
  }
  const supportedLanguages = profile.languages || ['und'];
  obligations.push({
    kind: 'language', requirement: program.source.language,
    status: supportedLanguages.includes(program.source.language) || supportedLanguages.includes('*') ? 'satisfied' : 'missing',
    evidence: { supportedLanguages }
  });
  const size = Array.from(program.source.content).length;
  obligations.push({
    kind: 'source-size', requirement: `<=${profile.maxCodePoints ?? Number.MAX_SAFE_INTEGER}`,
    status: size <= (profile.maxCodePoints ?? Number.MAX_SAFE_INTEGER) ? 'satisfied' : 'missing',
    evidence: { actualCodePoints: size }
  });

  const capabilities = availableTypes(program);
  for (const gap of program.gaps || []) {
    obligations.push({
      kind: 'source-gap', requirement: gap.kind,
      status: gap.critical ? 'missing' : 'semantically-uncertain',
      critical: Boolean(gap.critical), evidence: gap
    });
  }
  for (const type of profile.requiredObservationTypes || []) {
    obligations.push({
      kind: 'profile-observation', requirement: type,
      status: capabilities.has(type) ? 'satisfied' : 'missing', critical: true,
      evidence: { producers: capabilities.get(type) || [] }
    });
  }
  const circuits = [];
  for (const compiled of compiledCircuits) {
    const circuitObligations = [];
    for (const [name, port] of Object.entries(compiled.circuit.inputs)) {
      const types = port.types || [port.type];
      const producers = types.filter(Boolean).flatMap((type) => capabilities.get(type) || []);
      const observations = program.observations.filter((observation) =>
        types.includes(observation.type)
        && (!port.statuses?.length || port.statuses.includes(observation.status)));
      const critical = port.critical !== false;
      let status = producers.length ? 'satisfied' : critical ? 'missing' : 'partially-satisfied';
      if (port.statuses?.length && !producers.some((producer) =>
        (producer.statuses || []).some((producerStatus) => port.statuses.includes(producerStatus)))) {
        status = critical ? 'missing' : 'partially-satisfied';
      }
      const coverageCertificates = (program.coverage || []).filter((coverage) =>
        coverage.mode === 'closed-world' && coverage.verified === true
        && types.some((type) => coverage.types?.includes(type)));
      if (port.coverage === 'closed-world' && !coverageCertificates.length) {
        status = critical ? 'missing' : 'partially-satisfied';
      }
      const cardinality = port.cardinality || 'many';
      const cardinalitySatisfied = cardinality === 'many'
        || (cardinality === 'one' && observations.length === 1)
        || (cardinality === 'optional' && observations.length <= 1)
        || (['at-least-one', 'one-or-more'].includes(cardinality) && observations.length > 0);
      if (!cardinalitySatisfied) status = critical ? 'missing' : 'partially-satisfied';
      if (port.guarantee) {
        const available = observations.some((observation) =>
          guaranteeSatisfies(STATUS_CEILINGS[observation.status] || 'review-required', port.guarantee));
        if (!available) status = critical ? 'missing' : 'partially-satisfied';
      }
      const producerGaps = (program.gaps || []).filter((gap) => types.includes(gap.type));
      const blockingProducerGaps = producerGaps.filter((gap) =>
        gap.critical || ['operational', 'insufficient-materialization'].includes(gap.kind));
      const qualityGaps = producerGaps.filter((gap) => !blockingProducerGaps.includes(gap));
      if (blockingProducerGaps.length) status = critical ? 'missing' : 'partially-satisfied';
      else if (status === 'satisfied' && qualityGaps.length) status = 'satisfied-with-limits';
      circuitObligations.push({
        kind: 'observation-port', port: name, requirement: types,
        status, critical, evidence: {
          producers, observations: observations.length, cardinality,
          coverageCertificates: coverageCertificates.map((coverage) => coverage.id),
          producerGaps, blockingProducerGaps, qualityGaps
        }
      });
    }
    const blocked = circuitObligations.some((item) => item.critical && item.status === 'missing');
    circuits.push({
      id: compiled.circuit.id, status: blocked ? 'blocked' : 'ready',
      obligations: circuitObligations
    });
    obligations.push(...circuitObligations.map((item) => ({ ...item, circuit: compiled.circuit.id })));
  }
  const globalFailure = obligations.some((item) => item.status === 'missing' && (item.critical !== false));
  return {
    kind: 'CompatibilityReport', schemaVersion: 1,
    status: globalFailure ? 'incompatible' : obligations.some((item) => item.status !== 'satisfied') ? 'compatible-with-limits' : 'compatible',
    profile: profile.id || 'compatibility:default@1', obligations, circuits,
    activeCircuits: circuits.filter((item) => item.status === 'ready').map((item) => item.id),
    blockedCircuits: circuits.filter((item) => item.status === 'blocked').map((item) => item.id)
  };
}

export { evaluateCompatibility };
