import assert from 'node:assert/strict';
import test from 'node:test';
import core, {
  Finding, assurance, evidence, findingType, message, severity
} from '../../ontologies/core/index.mjs';
import { circuit, include, stage } from '../../src/circuit/index.mjs';
import { claim, explicit, longTextProgram, semanticUnit, source } from '../../src/longtext/index.mjs';
import { exactlyOne, extendsOntology, from, identifiedAs, ontology, requires, to } from '../../src/ontology/index.mjs';
import { executeCircuit } from '../../src/runtime/index.mjs';
import { SemanticStore } from '../../src/store/index.mjs';

test('retention policy distinguishes violation from a documented exception', async () => {
  const O = ontology('test.retention@1', extendsOntology(core));
  const named = O.role('named', from(O.Entity), to(O.Value), exactlyOne());
  const duration = O.role('duration', from(O.Event), to(O.Value), exactlyOne());
  const legalException = O.role('legalException', from(O.Event), to(O.Value), exactlyOne());
  const Data = O.entity('Data', requires(named));
  const dataRole = O.role('dataRole', from(O.Event), to(Data), exactlyOne());
  const Retain = O.event('Retain', requires(dataRole), requires(duration), requires(legalException));
  const records = Data(identifiedAs('data:records'), named('customer records'));
  async function assess(exception) {
    const document = source('policy.md', 'Retention policy.');
    const store = new SemanticStore();
    store.publish(longTextProgram('policy', document, semanticUnit('retention', claim(Retain(dataRole(records), duration(10), legalException(exception)), explicit()))));
    const check = stage('retention-check', async (ctx) => {
      for (const term of ctx.store.instancesOf(Retain)) {
        if (term.value(duration) <= 5 || term.value(legalException)) continue;
        ctx.emit(Finding(findingType('retention-violation'), message('Retention exceeds five years.'), severity('error'), evidence('authority:retention-rule'), assurance('mechanical')));
      }
    });
    await executeCircuit(circuit('retention@1', include(check)), store);
    return store.outputs;
  }
  assert.equal((await assess(false)).length, 1);
  assert.equal((await assess(true)).length, 0);
});

test('continuity and scientific checks remain ordinary JavaScript macro-nodes over typed terms', async () => {
  const O = ontology('test.global@1', extendsOntology(core));
  const named = O.role('named', from(O.Entity), to(O.Value), exactlyOne());
  const metricName = O.role('metricName', from(O.State), to(O.Value), exactlyOne());
  const value = O.role('value', from(O.State), to(O.Value), exactlyOne());
  const ObjectEntity = O.entity('ObjectEntity', requires(named));
  const Metric = O.state('Metric', requires(metricName), requires(value));
  const phone = ObjectEntity(identifiedAs('phone'), named('phone'));
  const first = Metric(identifiedAs('abstract'), metricName('accuracy'), value(18));
  const second = Metric(identifiedAs('results'), metricName('accuracy'), value(12));
  const document = source('report.md', 'The phone moved. Accuracy differs.');
  const store = new SemanticStore();
  store.publish(longTextProgram('report', document, semanticUnit('facts', phone, first, second)));
  const globalCheck = stage('global-check', async (ctx) => {
    const metrics = ctx.store.instancesOf(Metric);
    if (metrics.length === 2 && metrics[0].value(value) !== metrics[1].value(value)) {
      ctx.emit(Finding(findingType('scientific-value-conflict'), message('The same metric has incompatible values.'), severity('warning'), evidence('report'), assurance('mechanical')));
    }
  });
  await executeCircuit(circuit('global@1', include(globalCheck)), store);
  assert.equal(store.outputs[0].value(findingType), 'scientific-value-conflict');
});
