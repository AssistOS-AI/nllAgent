import { semanticMutation } from './expectation.mjs';

export default Object.freeze([
  semanticMutation(
    'delete-intervening-retrieval', 'retrieved', 'closed-gap',
    'Removing a supported retrieval must change SATISFIED to VIOLATED.'
  ),
  semanticMutation(
    'fabricate-closed-coverage', 'open-gap', 'closed-gap',
    'Changing partial coverage to closed must be observable and must not be accepted as the same result.'
  ),
  semanticMutation(
    'collapse-coverage-conflict', 'coverage-conflict', 'closed-gap',
    'Conflicting closure support must not collapse to the positive closed row.'
  ),
  semanticMutation(
    'reverse-temporal-order', 'closed-gap', 'reverse-order',
    'Source order mutation must remove the supported leave-before-use path.'
  ),
  semanticMutation(
    'merge-actor-identity', 'different-actor', 'closed-gap',
    'A leave by Mara must not satisfy the same-actor premise for Elias.'
  ),
  semanticMutation(
    'collapse-object-candidates', 'ambiguous', 'closed-gap',
    'Two object candidates must not be selected to manufacture a resolved finding.'
  )
]);
