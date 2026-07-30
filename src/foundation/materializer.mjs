import { claim, explicit, groundedAt, semanticUnit } from '../longtext/api.mjs';
import { identifiedAs } from '../ontology/api.mjs';
import { StateAssertion, during, polarity, predicate, subject } from '../../ontologies/core/index.mjs';

const STATE_PATTERN = /^(?<subject>.+?)\s+(?:is|are|was|were)\s+(?<negative>not\s+)?(?<predicate>[a-z][a-z -]*?)(?:\s+at\s+(?<time>[^.]+))?[.]?$/iu;

function materializeFoundation({ program }) {
  const units = [];
  for (const sentenceClaim of program.values()) {
    if (sentenceClaim?.content?.concept?.name !== 'Sentence') continue;
    const match = STATE_PATTERN.exec(sentenceClaim.content.value('text'));
    if (!match) continue;
    const roles = [
      subject(match.groups.subject.trim().toLowerCase()),
      predicate(match.groups.predicate.trim().toLowerCase()),
      polarity(match.groups.negative ? 'denied' : 'affirmed')
    ];
    if (match.groups.time) roles.push(during(match.groups.time.trim().toLowerCase()));
    const anchor = sentenceClaim.anchors[0];
    const assertion = StateAssertion(identifiedAs(`foundation-state:${anchor.id}`), ...roles);
    units.push(semanticUnit(
      `foundation-${units.length}`,
      claim(assertion, explicit(), groundedAt(anchor))
    ));
  }
  return units;
}

export { STATE_PATTERN, materializeFoundation };
