export default function materializeNarrativeContinuity({ source, api, vocabulary }) {
  const {
    alternatives, claim, confidence, coverage, explicit, gap, groundedAt, identityCandidate, inferred,
    interpretation, mention, semanticUnit, span
  } = api;
  const {
    CoverageNotice, DirectBefore, Leave, NarrativeInterval, NarrativePlace, Person, PortableObject,
    Retrieve, Use, actor, actorReferenceKey, atPlace, coverageState, earlier, eventAnchor, identifiedAs,
    intervalEnd, intervalObject, intervalScope, intervalStart, later, named, narrativeOrder, object,
    referenceKey
  } = vocabulary;

  const anchors = new Map([
    ['brass-leave', [390, 431, 'Mara left the brass key in the boathouse.']],
    ['notebook-leave', [671, 714, 'Tomas left the red notebook in the archive.']],
    ['compass-leave', [942, 988, 'Ivo left the compass in the train compartment.']],
    ['notebook-retrieve', [1716, 1766, 'Tomas retrieved the red notebook from the archive.']],
    ['umbrella-leave', [2194, 2235, 'Mara left the black umbrella in the cafe.']],
    ['brass-use', [3885, 3927, 'Mara used the brass key in the hill tower.']],
    ['brass-coverage', [4356, 4434, 'The account between leaving the brass key and using the brass key is complete.']],
    ['notebook-use', [5205, 5251, 'Tomas used the red notebook in the hill tower.']],
    ['notebook-coverage', [5575, 5659, 'The account between leaving the red notebook and using the red notebook is complete.']],
    ['pronoun-use', [6014, 6044, 'She used it in the hill tower.']],
    ['actor-pronoun', [6014, 6017, 'She']],
    ['object-pronoun', [6023, 6025, 'it']],
    ['pronoun-candidates', [6046, 6160, 'In that sentence, "She" may name either Mara or Nora, and "it" may name either the cigarette case or the map case.']],
    ['compass-use', [6880, 6922, 'Ivo used the compass in the harbor office.']],
    ['compass-coverage', [7371, 7447, 'The account between leaving the compass and using the compass is incomplete.']],
    ['umbrella-use', [7819, 7870, 'Elias used the black umbrella in the harbor office.']],
    ['umbrella-coverage', [8263, 8351, 'The account between leaving the black umbrella and using the black umbrella is complete.']],
    ['scarf-use', [8353, 8401, 'Nora used the violet scarf in the harbor office.']],
    ['scene-order', [11990, 12152, 'Finally, the editor recorded that chapter order matches the forward scene sequence for the leave, retrieval, and use\nevents explicitly represented in this review.']]
  ]);

  function exact(id) {
    const [start, end, expected] = anchors.get(id);
    const value = span(source, start, end);
    if (value.excerpt !== expected) throw new Error(`Anchor ${id} does not match the pinned source revision.`);
    return value;
  }
  const person = (id, label) => Person(identifiedAs(`person:${id}`), named(label));
  const portable = (id, label) => PortableObject(identifiedAs(`object:${id}`), named(label));
  const place = (id, label) => NarrativePlace(identifiedAs(`place:${id}`), named(label));

  const mara = person('mara-venn', 'Mara Venn');
  const tomas = person('tomas-rell', 'Tomas Rell');
  const ivo = person('ivo-dane', 'Ivo Dane');
  const elias = person('elias-courier', 'Elias');
  const nora = person('nora-clerk', 'Nora');
  const brassKey = portable('brass-key', 'brass key');
  const redNotebook = portable('red-notebook', 'red notebook');
  const compass = portable('brass-compass', 'compass');
  const maraUmbrella = portable('mara-black-umbrella', 'Mara black umbrella');
  const eliasUmbrella = portable('elias-black-umbrella', 'Elias black umbrella');
  const violetScarf = portable('violet-scarf', 'violet scarf');
  const cigaretteCase = portable('cigarette-case', 'cigarette case');
  const mapCase = portable('map-case', 'map case');
  const boathouse = place('boathouse', 'boathouse');
  const archive = place('archive', 'archive');
  const train = place('train-compartment', 'train compartment');
  const cafe = place('cafe', 'cafe');
  const tower = place('hill-tower', 'hill tower');
  const harbor = place('harbor-office', 'harbor office');

  function event(constructor, id, orderValue, anchorId, roles) {
    return constructor(
      identifiedAs(`event:${id}`), ...roles,
      narrativeOrder(orderValue), eventAnchor(exact(anchorId))
    );
  }
  const events = [
    event(Leave, 'brass-leave', 1, 'brass-leave', [actor(mara), object(brassKey), atPlace(boathouse)]),
    event(Leave, 'notebook-leave', 2, 'notebook-leave', [actor(tomas), object(redNotebook), atPlace(archive)]),
    event(Leave, 'compass-leave', 3, 'compass-leave', [actor(ivo), object(compass), atPlace(train)]),
    event(Retrieve, 'notebook-retrieve', 4, 'notebook-retrieve', [actor(tomas), object(redNotebook), atPlace(archive)]),
    event(Leave, 'umbrella-leave', 5, 'umbrella-leave', [actor(mara), object(maraUmbrella), atPlace(cafe)]),
    event(Use, 'brass-use', 6, 'brass-use', [actor(mara), object(brassKey), atPlace(tower)]),
    event(Use, 'notebook-use', 7, 'notebook-use', [actor(tomas), object(redNotebook), atPlace(tower)])
  ];
  const actorMention = mention(exact('actor-pronoun'), 'She');
  const objectMention = mention(exact('object-pronoun'), 'it');
  events.push(event(Use, 'pronoun-use', 8, 'pronoun-use', [
    actorReferenceKey(actorMention.identity), referenceKey(objectMention.identity), atPlace(tower)
  ]));
  events.push(
    event(Use, 'compass-use', 9, 'compass-use', [actor(ivo), object(compass), atPlace(harbor)]),
    event(Use, 'umbrella-use', 10, 'umbrella-use', [actor(elias), object(eliasUmbrella), atPlace(harbor)]),
    event(Use, 'scarf-use', 11, 'scarf-use', [actor(nora), object(violetScarf), atPlace(harbor)])
  );

  const byId = new Map(events.map((value) => [value.identity.split(':').at(-1), value]));
  const [brassLeave, notebookLeave, compassLeave, notebookRetrieve, umbrellaLeave,
    brassUse, notebookUse, pronounUse, compassUse, umbrellaUse, scarfUse] = events;
  const brassInterval = NarrativeInterval(
    identifiedAs('interval:brass-key'), named('brass key leave-to-use interval'),
    intervalObject(brassKey), intervalStart(brassLeave), intervalEnd(brassUse)
  );
  const notebookInterval = NarrativeInterval(
    identifiedAs('interval:red-notebook'), named('red notebook leave-to-use interval'),
    intervalObject(redNotebook), intervalStart(notebookLeave), intervalEnd(notebookUse)
  );
  const compassInterval = NarrativeInterval(
    identifiedAs('interval:compass'), named('compass leave-to-use interval'),
    intervalObject(compass), intervalStart(compassLeave), intervalEnd(compassUse)
  );
  const coverageDefinitions = [
    [brassInterval, 'closed', 'brass-coverage'],
    [notebookInterval, 'closed', 'notebook-coverage'],
    [compassInterval, 'partial', 'compass-coverage']
  ];

  const units = events.map((value, index) => semanticUnit(
    `event-${index + 1}`,
    claim(value, explicit(), groundedAt(value.value(eventAnchor)))
  ));
  for (let index = 1; index < events.length; index += 1) {
    units.push(semanticUnit(`before-${index}`, claim(
      DirectBefore(earlier(events[index - 1]), later(events[index])),
      inferred(), groundedAt(exact('scene-order')),
      groundedAt(events[index - 1].value(eventAnchor)), groundedAt(events[index].value(eventAnchor))
    )));
  }
  units.push(semanticUnit(
    'pronoun-alternatives', actorMention, objectMention,
    alternatives('actor-pronoun-readings',
      interpretation('actor-is-mara', identityCandidate(actorMention, mara, confidence(0.5))),
      interpretation('actor-is-nora', identityCandidate(actorMention, nora, confidence(0.5)))),
    alternatives('object-pronoun-readings',
      interpretation('object-is-cigarette-case', identityCandidate(objectMention, cigaretteCase, confidence(0.5))),
      interpretation('object-is-map-case', identityCandidate(objectMention, mapCase, confidence(0.5)))),
    gap('identity-unresolved', exact('actor-pronoun'), exact('object-pronoun'), exact('pronoun-candidates'))
  ));
  for (const interval of [brassInterval, notebookInterval, compassInterval]) {
    units.push(semanticUnit(`interval-${interval.identity}`, claim(
      interval, inferred(), groundedAt(interval.value(intervalStart).value(eventAnchor)),
      groundedAt(interval.value(intervalEnd).value(eventAnchor))
    )));
  }
  for (const [interval, state, anchorId] of coverageDefinitions) {
    const notice = CoverageNotice(
      identifiedAs(`coverage:${interval.identity}`), intervalScope(interval), coverageState(state),
      eventAnchor(exact(anchorId))
    );
    units.push(semanticUnit(`coverage-${interval.identity}`,
      claim(notice, explicit(), groundedAt(exact(anchorId))), coverage(Retrieve, interval, state),
      ...(state === 'closed' ? [] : [gap('retrieval-coverage-open', exact(anchorId))])
    ));
  }
  units.push(semanticUnit(
    'unmatched-umbrella-coverage',
    gap('coverage-identity-mismatch', exact('umbrella-coverage'), umbrellaLeave.value(eventAnchor), umbrellaUse.value(eventAnchor))
  ));
  units.push(semanticUnit('pronoun-coverage-gap', gap('retrieval-coverage-unknown', pronounUse.value(eventAnchor))));
  units.push(semanticUnit('scarf-no-leave', gap('no-qualifying-leave-observation', scarfUse.value(eventAnchor))));
  void byId;
  void notebookRetrieve;
  return units;
}
