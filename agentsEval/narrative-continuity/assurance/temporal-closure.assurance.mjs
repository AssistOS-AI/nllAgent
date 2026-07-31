import {
  RelationEngine, relation, relationAtom, relationFact, relationRule, relationValue, relationVariable
} from '../../../src/engines/relation-engine.mjs';

const PRECEDES = relation('AssurancePrecedes', 'Event', 'Event');
const left = relationVariable('left', 'Event');
const middle = relationVariable('middle', 'Event');
const right = relationVariable('right', 'Event');
const transitive = relationRule(
  'assurance-transitive-precedence',
  relationAtom(PRECEDES, left, right),
  relationAtom(PRECEDES, left, middle),
  relationAtom(PRECEDES, middle, right)
);

function event(value) { return relationValue('Event', value); }

function runTemporalClosureAssurance() {
  return new RelationEngine().evaluate([
    relationFact(PRECEDES, event('section-1:leave'), event('section-2:bridge')),
    relationFact(PRECEDES, event('section-2:bridge'), event('section-3:use'))
  ], [transitive]);
}

export { PRECEDES, event, runTemporalClosureAssurance };
export default runTemporalClosureAssurance;
