import { DEFAULT_METHOD_CATALOG } from '../architecture/default-methods.mjs';
import { logicalAnd, logicalNot, logicalOr } from '../circuit/logic.mjs';
import { DecisionTable } from '../circuit/model.mjs';
import { invariant } from '../core/errors.mjs';
import {
  ConstraintKernel, EGraphLite, ProofKernel, RelationEngine, SynthesisEngine
} from '../engines/index.mjs';
import { replayWitness } from '../interpreters/symbolic.mjs';
import {
  input, output, primitive, primitiveProvider, reads, writes
} from '../primitives/api.mjs';
import { PrimitiveRegistry } from '../primitives/registry.mjs';
import { absence, exists } from '../store/query.mjs';
import { SdkCatalog, sdkEngineResult, sdkImport, sdkType } from './model.mjs';

const ANY = sdkType('nll.sdk:Any');
const QUERY = sdkType('nll.sdk:SemanticQuery');
const BINDINGS = sdkType('nll.sdk:BindingSet');
const LOGIC = sdkType('nll.sdk:EvidenceTruth');
const COVERAGE = sdkType('nll.sdk:CoverageState');
const ENGINE_INPUT = sdkType('nll.sdk:EngineInput');
const ENGINE_RESULT = sdkType('nll.sdk:EngineResult');

function contextQuery(context, [query]) {
  invariant(context && typeof context.query === 'function',
    'sdk-query-context', 'semantic.query requires an ExecutionContext.');
  return context.query(query);
}

const semanticQueryPrimitive = primitive('semantic.query@1')
  .input(input('query', QUERY)).output(output('bindings', BINDINGS))
  .effects(reads('SemanticStore')).concrete(contextQuery).seal();
const semanticExistsPrimitive = primitive('semantic.exists@1')
  .input(input('bindings', BINDINGS)).output(output('result', LOGIC))
  .concrete((_context, [bindings]) => exists(bindings)).seal();
const semanticAbsencePrimitive = primitive('semantic.absence@1')
  .input(input('bindings', BINDINGS)).input(input('coverage', COVERAGE)).output(output('result', LOGIC))
  .concrete((_context, [bindings, coverage]) => absence(bindings, coverage)).seal();
const logicAndPrimitive = primitive('logic.and@1')
  .input(input('left', LOGIC)).input(input('right', LOGIC)).output(output('result', LOGIC))
  .concrete((_context, [left, right]) => logicalAnd(left, right)).seal();
const logicOrPrimitive = primitive('logic.or@1')
  .input(input('left', LOGIC)).input(input('right', LOGIC)).output(output('result', LOGIC))
  .concrete((_context, [left, right]) => logicalOr(left, right)).seal();
const logicNotPrimitive = primitive('logic.not@1')
  .input(input('value', LOGIC)).output(output('result', LOGIC))
  .concrete((_context, [value]) => logicalNot(value)).seal();
const decisionEvaluatePrimitive = primitive('decision.evaluate@1')
  .input(input('table', ANY)).input(input('values', ANY)).output(output('result', ANY))
  .concrete((_context, [table, values]) => {
    invariant(table instanceof DecisionTable, 'sdk-decision-table', 'decision.evaluate requires a DecisionTable.');
    return table.decide(values);
  }).seal();

const constraintSolvePrimitive = primitive('constraints.solve@1')
  .input(input('constraints', ENGINE_INPUT)).output(output('result', ENGINE_RESULT))
  .concrete((_context, [constraints]) => new ConstraintKernel().solve(constraints)).seal();
const relationClosePrimitive = primitive('relations.close@1')
  .input(input('facts', ENGINE_INPUT)).input(input('rules', ENGINE_INPUT)).output(output('result', ENGINE_RESULT))
  .concrete((_context, [facts, rules]) => new RelationEngine().evaluate(facts, rules)).seal();
const egraphNormalizePrimitive = primitive('egraph.normalize@1')
  .input(input('term', ENGINE_INPUT)).input(input('rules', ENGINE_INPUT)).output(output('result', ENGINE_RESULT))
  .concrete((_context, [term, rules, options = new Map(), costModel = () => 1]) => {
    const engine = new EGraphLite();
    const handle = engine.add(term);
    const saturation = engine.saturate(rules, options);
    return sdkEngineResult('egraph-lite', saturation, engine.extract(handle, costModel));
  }).seal();
const proofVerifyPrimitive = primitive('proof.verify@1')
  .input(input('certificate', ENGINE_INPUT)).input(input('premises', ENGINE_INPUT)).output(output('result', ENGINE_RESULT))
  .concrete((_context, [certificate, premises = []]) => new ProofKernel().verify(certificate, premises)).seal();
const synthesisSearchPrimitive = primitive('synthesis.search@1')
  .input(input('grammar', ENGINE_INPUT)).input(input('validator', ENGINE_INPUT)).output(output('result', ENGINE_RESULT))
  .concrete((_context, [grammar, validator, options = new Map()]) =>
    new SynthesisEngine().synthesize(grammar, validator, options)).seal();
const witnessReplayPrimitive = primitive('symbolic.replay-witness@1')
  .input(input('witness', ENGINE_INPUT)).input(input('protocol', ENGINE_INPUT)).output(output('result', ENGINE_RESULT))
  .concrete((_context, [witness, protocol]) => replayWitness(witness, protocol)).seal();
const refinementRequestPrimitive = primitive('refinement.request@1')
  .input(input('manager', ENGINE_INPUT)).input(input('demand', ENGINE_INPUT)).output(output('result', ENGINE_RESULT))
  .concrete((_context, [manager, demand]) => manager.request(demand)).seal();
const semanticDerivePrimitive = primitive('semantic.derive@1')
  .input(input('term', ANY)).output(output('term', ANY)).effects(writes('SemanticStore'))
  .concrete((context, [term]) => context.derive(term)).seal();
const semanticEmitPrimitive = primitive('semantic.emit@1')
  .input(input('output', ANY)).output(output('output', ANY)).effects(writes('SemanticStore'))
  .concrete((context, [value]) => context.emit(value)).seal();
const javascriptStagePrimitive = primitive('javascript.stage@1')
  .input(input('operation', ANY)).input(input('arguments', ANY)).output(output('result', ANY))
  .concrete((context, [operation, args = []]) => operation(context, ...args)).seal();

const PROVIDER_DEFINITIONS = Object.freeze([
  ['query-dataflow.sdk@1', 'query-dataflow', semanticQueryPrimitive, 'semanticQueryPrimitive'],
  ['finite-decision.sdk@1', 'finite-decision-table', decisionEvaluatePrimitive, 'decisionEvaluatePrimitive'],
  ['constraints.sdk@1', 'constraint-kernel', constraintSolvePrimitive, 'constraintSolvePrimitive'],
  ['relations.sdk@1', 'relation-engine', relationClosePrimitive, 'relationClosePrimitive'],
  ['egraph.sdk@1', 'egraph-lite', egraphNormalizePrimitive, 'egraphNormalizePrimitive'],
  ['symbolic-witness.sdk@1', 'symbolic-witness', witnessReplayPrimitive, 'witnessReplayPrimitive'],
  ['refinement.sdk@1', 'cegar-refinement', refinementRequestPrimitive, 'refinementRequestPrimitive'],
  ['proof.sdk@1', 'proof-kernel', proofVerifyPrimitive, 'proofVerifyPrimitive'],
  ['synthesis.sdk@1', 'synthesis-engine', synthesisSearchPrimitive, 'synthesisSearchPrimitive'],
  ['javascript-stage.sdk@1', 'javascript-macro-node', javascriptStagePrimitive, 'javascriptStagePrimitive']
]);

const DEFAULT_PRIMITIVE_PROVIDERS = Object.freeze(PROVIDER_DEFINITIONS.map(([id, methodId, descriptor, exportName]) =>
  primitiveProvider(id, methodId, descriptor, 'src/sdk/index.mjs', exportName)));
const DEFAULT_PRIMITIVE_REGISTRY = new PrimitiveRegistry()
  .register(semanticExistsPrimitive, semanticAbsencePrimitive, logicAndPrimitive, logicOrPrimitive,
    logicNotPrimitive, semanticDerivePrimitive, semanticEmitPrimitive)
  .provide(...DEFAULT_PRIMITIVE_PROVIDERS).seal();
const DEFAULT_SDK_IMPORTS = Object.freeze([sdkImport(
  'nll.core-sdk@1', 'src/sdk/index.mjs',
  [
    'semanticQueryPrimitive', 'semanticExistsPrimitive', 'semanticAbsencePrimitive',
    'logicAndPrimitive', 'logicOrPrimitive', 'logicNotPrimitive', 'decisionEvaluatePrimitive',
    'constraintSolvePrimitive', 'relationClosePrimitive', 'egraphNormalizePrimitive',
    'proofVerifyPrimitive', 'synthesisSearchPrimitive', 'witnessReplayPrimitive',
    'refinementRequestPrimitive', 'semanticDerivePrimitive', 'semanticEmitPrimitive',
    'javascriptStagePrimitive', 'DEFAULT_PRIMITIVE_REGISTRY', 'DEFAULT_METHOD_CATALOG'
  ], DEFAULT_PRIMITIVE_PROVIDERS.map((provider) => provider.id)
)]);
const DEFAULT_SDK_CATALOG = new SdkCatalog(
  'nll.core-sdk@1', DEFAULT_METHOD_CATALOG, DEFAULT_PRIMITIVE_REGISTRY, DEFAULT_SDK_IMPORTS
);

export {
  ANY, BINDINGS, COVERAGE, DEFAULT_METHOD_CATALOG, DEFAULT_PRIMITIVE_PROVIDERS,
  DEFAULT_PRIMITIVE_REGISTRY, DEFAULT_SDK_CATALOG, DEFAULT_SDK_IMPORTS, ENGINE_INPUT, ENGINE_RESULT, LOGIC, QUERY,
  constraintSolvePrimitive, decisionEvaluatePrimitive, egraphNormalizePrimitive,
  javascriptStagePrimitive, logicAndPrimitive, logicNotPrimitive, logicOrPrimitive,
  proofVerifyPrimitive, refinementRequestPrimitive, relationClosePrimitive, semanticAbsencePrimitive,
  semanticDerivePrimitive, semanticEmitPrimitive, semanticExistsPrimitive, semanticQueryPrimitive,
  synthesisSearchPrimitive, witnessReplayPrimitive
};
