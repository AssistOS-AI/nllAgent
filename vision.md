nllAgent
Arhitectura consolidată a circuitelor semantice dinamice
OntologyJS, LongTextJS și CircuitJS ca DSL-uri interne JavaScript reale
Propunere tehnică autonomă pentru linting, derivare semantică și generare controlată de text
Versiune consolidată · Iulie 2026
Experiment de cercetare; fără compatibilitate cu formatele anterioare, fără JSON și fără TypeScript

Rezumat executiv
Această propunere redefinește nllAgent ca un experiment coerent de programare semantică pentru limbaj natural. Obiectivul nu este construirea unei ontologii universale și nici transformarea unui model lingvistic într-o autoritate finală asupra sensului. Obiectivul este mai precis: reguli formulate inițial în limbaj natural trebuie să poată fi transformate de coding agents în programe inspectabile, iar documentele lungi trebuie să poată fi transformate în programe semantice asupra cărora regulile sunt executate reproductibil. Rezultatul trebuie să păstreze legătura cu textul, să distingă necunoscutul de fals, să permită interpretări alternative și să explice cum a fost obținut fiecare finding sau fragment generat.
Arhitectura folosește trei DSL-uri interne, toate exprimate prin module ESM `.mjs`. OntologyJS definește vocabularul executabil: sorturi, concepte, roluri, relații, cardinalități, incompatibilități, lexicalizări și normalizări. LongTextJS folosește constructorii ontologici pentru a materializa ceea ce documentul afirmă: entități, evenimente, stări, claims, contexte, modalitate, negație, timp, loc, alternative și ancore exacte către text. CircuitJS folosește aceeași semnătură semantică, dar adaugă variabile, pattern-uri, query-uri, reguli, tabele decizionale, subcircuite, algoritmi JavaScript, apeluri de tool-uri și modele, verificare și generare de text.
Cele trei limbaje nu sunt obiecte de configurare ascunse sub funcții estetice. Constructorii produc termeni opaci și tipați, nu obiecte cu câmpuri arbitrare. Semantica publică este definită de o algebră comună de termeni și de interpreții runtime-ului. Aceeași expresie ontologică poate fi construită ca termen ground în LongTextJS, folosită ca pattern în CircuitJS, validată, indexată, afișată sau tipărită din nou ca sursă `.mjs`. Nu există fișiere JSON, AST-uri JSON, manifesturi de date sau conversii intermediare care devin sursa semantică reală. Persistența structurată se face prin module `.mjs`; rapoartele destinate oamenilor se scriu în Markdown.
CircuitJS este definit ca un circuit semantic dinamic și ierarhic. La nivel logic, circuitul este un graf dataflow cu valori imutabile și cu o disciplină apropiată de Static Single Assignment. Template-urile sunt instanțiate pentru bindings concrete, iar graful poate crește pe măsură ce apar match-uri, facts sau cereri de capabilitate. În același timp, sistemul nu obligă autorul să reducă orice algoritm la mii de noduri declarative. Reguli și tabele decizionale sunt compilate în noduri fine, dar un algoritm de graf, o simulare, o buclă iterativă sau un apel asincron poate rămâne o funcție JavaScript normală, tratată de runtime ca macro-nod instrumentat. Astfel sunt păstrate simultan inspectabilitatea circuitului și puterea algoritmică a JavaScript-ului.
LongTextJS și CircuitJS operează asupra unui singur model logic, SemanticStore. Acesta este un graf de termeni tipați și atribuiți, cu claims, contexte, evidence și provenance. Indecșii după concept, rol, span, identitate, timp, scope sau dependență sunt structuri fizice ascunse. Circuitele nu citesc array-uri și nu cunosc forma internă a store-ului; ele folosesc o algebră stabilă de query, derivare și emitere. Compatibilitatea dintre document și circuit este calculată din conceptele, rolurile, operațiile și cerințele de coverage utilizate efectiv. Atunci când o regulă cere o noțiune pe care materializarea nu o poate reprezenta, rezultatul este `BLOCKED_ONTOLOGY` sau `UNKNOWN`, nu o presupusă conformitate.
Execuția combină planificarea backward cu activarea forward. Plannerul pornește de la rezultatul cerut, de exemplu `AllFindings`, `ComplianceSummary` sau `CNLFrame`, și caută circuite care îl pot produce. Contractele `requires/provides` descriu tipurile, scope-ul, nivelul de evidență și capabilitățile operaționale necesare. Odată selectat lanțul minimal, apariția unor match-uri concrete instanțiază subcircuitele relevante. Schedulerul menține o agendă, un cache adresat după conținut, epochs de derivare și un trace complet. Negația prin absență este permisă numai într-un scope declarat închis; interpretările alternative sunt evaluate separat și agregate ca rezultate robuste, condiționale sau conflictuale.
Coding agents sunt mecanismul de compilare practică. Ei generează proiecte multi-fișier: ontologii, materializări LongTextJS, circuite, operatori, benchmark-uri, gramatici CNL și module de asamblare. Skill-urile definite în document oferă instrucțiuni și tool-uri pentru inspectarea sursei, verificarea spanurilor, introspecția ontologiei, rularea store-ului, explicarea trace-ului, testarea circuitelor și mutation testing. Agentul nu livrează un singur bloc de cod; el modifică iterativ un repository `.mjs` până când semantic checks, benchmark-urile și review-ul independent trec.
Pentru generarea controlată, circuitele produc mai întâi cadre semantice complete. Un renderer CNL determinist lexicalizează cadrul, apoi un parser reconstruiește structura, iar comparatorul verifică echivalența de round-trip. Generarea liberă asistată de model rămâne posibilă pentru documente mai ample, dar este clasificată explicit ca model-assisted și este reintrodusă în LongTextJS pentru reanalizare. Sistemul nu confundă un text plauzibil cu un text semantic verificat.
Tabelul 1. Deciziile normative ale propunerii
Decizie	Consecință arhitecturală
Experiment construit direct pe arhitectura nouă	Nu există plan de migrare, compatibilitate cu formatele vechi sau artefacte de release. Codul actual poate fi înlocuit integral.
Toate artefactele executabile sunt `.mjs`	Ontologii, LongTextJS, CircuitJS, operatori, benchmark-uri, traces și rezultate structurate sunt module ESM. Nu se folosește TypeScript.
Niciun JSON ca limbaj sau format semantic	Nu există obiecte de configurare care mimează un DSL, AST-uri JSON sau snapshot-uri JSON. Runtime-ul folosește termeni, clase, Map, Set, grafuri și indecși.
JavaScript rămâne expresiv	`if`, bucle, funcții, clase, recursie și `async/await` sunt permise. Izolarea se rezolvă prin sandboxing, nu prin amputarea limbajului.
Circuitul are un nucleu dataflow/SSA ierarhic	Regulile declarative sunt inspectabile fin; algoritmii procedurali apar ca macro-noduri instrumentate cu intrări, ieșiri și trace.
Un singur SemanticStore logic	Structurile fizice sunt ascunse în spatele query algebra. LongTextJS materializează, CircuitJS interoghează și derivă peste aceleași identități ontologice.
Planner pe capabilități	Circuitele sunt selectate prin `requires/provides`, apoi activate forward de match-uri și fapte concrete.
Coding agents produc proiecte multi-fișier	Generarea ontologiilor, materializărilor și circuitelor este organizată prin skill-uri, tool-uri și benchmark-uri executabile.

Cuprins conceptual
Capitol	Rol în proiectarea sistemului
1. Problema și angajamentele de proiectare	Delimitează experimentul și explică de ce un linter LLM-only sau un JSON semantic nu sunt suficiente.
2. Familia de limbaje și substratul semantic	Definește algebra comună, modelul logic unic, scope-ul, negația, alternativele și stările de evidență.
3. OntologyJS	Specifică vocabularul executabil, ontologiile de bază, extensia și limitele comportamentelor ontologice.
4. LongTextJS	Arată cum documentele lungi devin programe ground, ancorate și organizate multi-fișier.
5. Natura CircuitJS	Definește circuitul dinamic, template-urile, instanțele, regulile, operatorii JS, compoziția și capabilitățile.
6. Semantica de execuție	Descrie plannerul, schedulerul, agendele, epochs, cache-ul, non-monotonicitatea, trace-ul și statusurile.
7. API-ul concret și repository-ul	Prezintă query algebra, output-urile ontologice, convențiile `.mjs` și structura implementării.
8. Generarea controlată	Separă CNL determinist de generarea model-assisted și definește round-trip-ul semantic.
9. Skill-urile coding agents	Proiectează instrucțiunile și tool-urile prin care agenții construiesc și repară proiectele.
10. Exemple end-to-end	Demonstrează retenția, contradicțiile, continuitatea narativă și verificarea unui raport științific.
11. Validare și criteriul de succes	Definește benchmark-uri, mutații, teste de incrementalitate, fidelitate și acceptare.
12. Decizii finale	Condensează arhitectura și fixează responsabilitățile fiecărui strat.
Probleme rămase deschise	Enumeră numai deciziile care nu pot fi închise credibil fără experimente concrete.

1. Problema și angajamentele de proiectare
nllAgent trebuie să transforme interpretarea flexibilă a limbajului natural într-un proces programabil fără să pretindă că ambiguitatea a dispărut. Această cerință obligă arhitectura să separe ceea ce textul exprimă, ceea ce regula cere și ceea ce runtime-ul poate demonstra sau doar propune.
1.1 De ce un linter bazat numai pe LLM este insuficient
Un linter clasic funcționează pe un limbaj cu gramatică și semantică stabilă. Codul este transformat într-un AST determinist, iar regulile verifică proprietăți locale sau globale ale acelui AST. Limbajul natural nu oferă aceeași stabilitate. Referințele pot traversa capitole, aceeași expresie poate avea sensuri diferite, o excepție poate schimba scope-ul unei obligații, iar absența unei afirmații nu este echivalentă cu afirmația negată. O regulă aparent simplă, precum „nicio perioadă de retenție nu trebuie să depășească cinci ani în lipsa unei obligații legale documentate”, cere identificarea acțiunii, obiectului, duratei, autorității, excepției și a domeniului în care absența excepției poate fi considerată completă.
Un model lingvistic poate primi documentul și regula și poate produce un verdict convingător. Totuși, promptul rămâne un program opac. Nu există o reprezentare stabilă a afirmațiilor extrase, nu este clar dacă modelul a verificat toate secțiunile, nu se poate distinge între „nu am găsit” și „nu există”, iar explicația poate fi formulată post hoc fără să reflecte exact calculul. Repetarea aceleiași analize poate schimba fragmentele selectate și interpretarea. LLM-ul este foarte util pentru traducerea flexibilă dintre limbaj natural și primitive semantice, dar nu trebuie să fie simultan parser, bază de date, motor de reguli, evaluator și generator de justificări.
Sistemul propus introduce un strat intermediar explicit. Documentul este materializat ca program LongTextJS; regulile sunt compilate ca programe CircuitJS; ontologia definește vocabularul comun; SemanticStore păstrează termenii și proveniența; runtime-ul execută circuitele și produce rezultate structurate. LLM-ul și coding agents pot greși, dar greșeala devine localizabilă: ontologia poate fi insuficientă, materializarea poate lega greșit un span, un circuit poate trata incorect o excepție sau un renderer poate pierde modalitatea. Această separare permite benchmark-uri și review real.
1.2 Semantica urmărită este operațională și delimitată
Propunerea nu urmărește o semantică universală a limbajului uman. Ea urmărește o semantică operațională relativă la o ontologie, la un set de circuite și la un scope de analiză. Pentru un agent de retenție a datelor, conceptele relevante pot fi actor, operație de păstrare sau ștergere, tip de date, durată, scop, bază juridică, obligație și excepție. Pentru un agent editorial, vocabularul relevant poate fi claim, definiție, sursă, referință, actor narativ, eveniment, locație și contradicție. Nu este necesar ca fiecare proiect să importe toate conceptele posibile.
Această delimitare produce un criteriu clar de onestitate. Un document nu este declarat pur și simplu „înțeles”. Runtime-ul poate raporta ce concepte cerute de circuite sunt reprezentate, ce relații au coverage suficient, ce termeni au rămas neclasificați, ce interpretări alternative schimbă verdictul și ce reguli sunt blocate. Compatibilitatea semantică devine o proprietate inspectabilă, nu o impresie a modelului.
Arhitectura nu adoptă RDF, triple stores, JSON-LD sau infrastructura Semantic Web. Motivația nu este doar preferința pentru o implementare mai ușoară, ci nevoia de a păstra structura recursivă, scope-ul, operatorii modali, alternativele și codul algoritmic într-o singură familie de limbaje. Modelul intern este un graf de termeni tipați, construit prin primitive JavaScript și ascuns în spatele unor API-uri semantice. Interoperabilitatea externă poate fi adăugată ulterior dacă devine necesară, fără ca reprezentarea internă să fie forțată în paradigma tripletelor.
Principiu de proiectare. Sistemul nu promite adevărul complet al textului. El promite că, pentru conceptele și regulile declarate, interpretarea, derivarea și generarea sunt explicite, reexecutabile și ancorate în sursă.
1.3 Statutul experimentului și limitele intenționate
nllAgent este aici un laborator software, nu un produs aflat în exploatare. Nu există obligația de a păstra API-uri, formate sau date istorice. Implementarea poate fi rescrisă direct în jurul noii teorii. Nu se introduc etape de migrare și nu se păstrează loadere pentru vechile obiecte LongTextJS sau grafuri CircuitJS exprimate prin `nodes`, `primitive`, `$port` și `$node`. Dacă o idee este utilă, ea este reimplementată în forma nouă; forma veche nu primește statut de compatibilitate.
Toate artefactele executabile sunt `.mjs`. Alegerea oferă importuri ESM, posibilitatea de modularizare naturală și acces la tool-uri mature de coding, fără a cere TypeScript. Tipurile relevante nu sunt tipuri structurale ale host language, ci sorturi și concepte ontologice validate de runtime. JSDoc poate fi folosit pentru ergonomia editorului, dar nu devine sursa semantică.
Eliminarea JSON-ului este completă la nivel de authoring și persistență semantică. Un modul poate folosi object literals sau array-uri ca valori locale JavaScript dacă algoritmul are nevoie de ele, dar acestea nu sunt fapte semantice și nu sunt persistate ca artefacte canonice. Pentru a intra în SemanticStore, o valoare trebuie construită prin constructori ontologici sau prin API-urile de output. Această delimitare păstrează libertatea programatorului fără a lăsa semantica să se dizolve în payload-uri arbitrare.

Figura 1. Arhitectura generală: coding agents transformă limbajul natural în ontologii și programe `.mjs`, iar SemanticStore, plannerul și evaluatorul realizează calculul explicit.
2. Familia de limbaje și substratul semantic comun
OntologyJS, LongTextJS și CircuitJS trebuie înțelese ca trei roluri ale aceleiași algebre semantice. Diferența dintre ele nu este forma de serializare, ci ce fel de termeni produc și ce operații permit asupra acelor termeni.
2.1 Algebra de termeni și relația dintre DSL-uri
Baza teoretică potrivită este o algebră de termeni multi-sortată. Ontologia definește sorturi precum `Entity`, `Event`, `State`, `Time`, `Place`, `Proposition`, `Claim`, `Evidence` și `Context`, apoi adaugă constructori tipați. `Open`, de exemplu, poate construi un eveniment; `agent` leagă evenimentul de o persoană; `theme` îl leagă de un obiect; `during` îl leagă de un interval. Un program este o compoziție finită de asemenea constructori. În JavaScript, forma naturală este apelul recursiv de funcții; aceeași structură ar putea fi scrisă ca S-expresie, dar ESM și ecosistemul Node fac apelurile JavaScript mai practice.
LongTextJS folosește fragmentul ground al algebrei: identificatorii și rolurile sunt legați de instanțe concrete, claims și ancore. CircuitJS folosește aceeași algebră, dar admite variabile, pattern-uri, condiții, reguli și transformări. Este mai exact să spunem că CircuitJS este o extensie conservativă a limbajului comun de termeni, nu că orice modul LongTextJS este automat un circuit. Contractele modulelor sunt diferite, însă o expresie ontologică ground validă în LongTextJS rămâne o expresie validă în interiorul CircuitJS.
Modelul subiect–verb–obiect indică doar intuiția inițială. Semantica neo-davidsoniană a evenimentelor și frame semantics oferă o uniformizare mai bună: verbul introduce un eveniment sau o situație, iar participanții sunt legați prin roluri tematice. Astfel, `Open(agent(Ana), theme(Gate), during(T09), at(Entrance))` poate fi extins fără a inventa predicate de arități diferite. Pentru texte lungi sunt necesare și claims, contexte, discurs raportat, negație și alternative; de aceea evenimentul este doar o parte a substratului.
Exemplul 1. Același vocabular descrie evenimentul și statutul epistemic al afirmației
const opening = Open(
  agent(Person(named("Ana"))),
  theme(Gate(named("north gate"))),
  during(clockTime("09:00")),
  at(MainEntrance)
);

const statement = claim(
  opening,
  assertedBy(Narrator),
  groundedAt(span(source, 182, 231)),
  proposed(confidence(0.91))
);

Figura 2. OntologyJS definește semnătura, LongTextJS instanțiază termeni ground, iar CircuitJS adaugă pattern-uri și calcul peste aceleași identități.
2.2 Modelul logic unic: typed attributed term graph
SemanticStore prezintă un singur model logic: un graf de termeni tipați și atribuiți. Structura recursivă a propozițiilor este păstrată ca term DAG; rolurile și relațiile apar ca muchii tipate; claims leagă conținutul de sursă, context, statut și producător. Repetarea aceluiași subtermen poate fi deduplicată, dar identitatea semantică nu este redusă automat la identitate structurală. O persoană menționată în două fragmente poate avea două mentions și o ipoteză de coreferință, nu o unire forțată.
Store-ul are straturi logice. Stratul `source` conține documentele, reviziile și spanurile. Stratul `observation` conține claims și termeni materializați din text. Stratul `derived` conține fapte produse de circuite. Stratul `hypothesis` conține interpretări sau rezultate model-assisted care nu au fost promovate. Stratul `output` conține findings, plans, patches și CNLFrames. Aceste straturi pot fi implementate în același graf, dar diferența de autoritate trebuie să rămână vizibilă.
Indecșii sunt proprietăți fizice. Runtime-ul poate menține `byConcept`, `byRole`, `reverseRole`, `byAnchor`, `byContext`, `identity`, `temporal`, `coverage` și `dependencies`; poate folosi hash maps, arbori de intervale sau reprezentări columnare. CircuitJS nu vede aceste structuri. Query algebra este contractul public, iar optimizarea poate evolua fără rescrierea circuitelor.

Figura 3. SemanticStore separă conținutul semantic, ancorarea, contextul, scope-ul și proveniența, păstrând indecșii în afara modelului public.
2.3 Scope, negație, modalitate și alternative
Scope-ul este o proprietate semantică de primă clasă. Enunțul „operatorul nu a confirmat că Ana a deschis poarta” nu poate fi aplatizat într-un fapt `Not(Open)`. Negația se aplică actului de confirmare, iar conținutul propozițional trebuie păstrat. În mod similar, o excepție la o interdicție aparține aceleiași structuri normative și nu este doar un claim aflat în vecinătate textuală.
Absența unui termen din store nu este negație. `notExists` poate produce un rezultat final numai când circuitul deține o dovadă că domeniul relevant a fost materializat complet. Această dovadă poate fi `scopeClosed(section17)` sau `coverage(Retrieve, interval)`. În lipsa ei, rezultatul este `UNKNOWN`. Alegerea este conservatoare, dar elimină una dintre cele mai periculoase erori ale sistemelor de verificare pe texte lungi: confundarea lipsei de observație cu dovada absenței.
LongTextJS poate păstra mai multe interpretări. Alternativele partajează faptele sigure și diferă prin legături, clasificări sau scope. Circuitele sunt evaluate în contextul fiecărei alternative. Agregatorul poate clasifica un finding ca robust dacă apare în toate interpretările admise, condițional dacă depinde de o ipoteză numită sau conflictual dacă interpretări plauzibile produc rezultate incompatibile. Un singur scor de încredere nu înlocuiește această structură.
Exemplul 2. Scope-ul negației și alternativele rămân structurale
const report = not(
  Confirm(
    agent(operator),
    proposition(
      Open(
        agent(ana),
        theme(northGate)
      )
    )
  )
);

const readings = alternatives(
  interpretation(
    resolvesTo(pronoun("it"), processor),
    confidence(0.56)
  ),
  interpretation(
    resolvesTo(pronoun("it"), controller),
    confidence(0.44)
  )
);
Tabelul 2. Logica de bază pentru predicate și condiții
Valoare	Semnificație operațională
TRUE	Există suport admis pentru predicat și nu există refutare admisă în contextul selectat.
FALSE	Există refutare admisă sau o condiție incompatibilă suficientă pentru respingerea predicatului.
UNKNOWN	Datele, coverage-ul sau normalizarea necesară sunt insuficiente pentru a decide.
CONFLICT	Există simultan suport și refutare sau interpretări admise care conduc la valori incompatibile.

3. OntologyJS: vocabular executabil și extensibil
Ontologia nu este un catalog pasiv de etichete. Ea generează constructorii folosiți de coding agents, validează rolurile, furnizează metadate pentru query planning și stabilește identitatea conceptelor partajate de LongTextJS și CircuitJS.
3.1 Modelul OntologyJS
Un modul OntologyJS creează un namespace versionat și definește concepte prin apeluri de funcții. `O.entity`, `O.event`, `O.state`, `O.role`, `O.relation` și `O.valueType` înregistrează simboluri calificate și returnează constructori apelabili. `requires`, `allows`, `exactlyOne`, `zeroOrOne`, `zeroOrMany`, `from`, `to`, `subtypeOf`, `disjointWith` și `lexicalizeAs` adaugă constrângeri executabile. `O.seal()` închide ontologia și produce un obiect introspectabil.
Constructorii nu întorc plain objects. Ei produc instanțe de `Term`, `RoleValue`, `Pattern` sau alte clase opace, în funcție de context și argumente. Dacă toate argumentele sunt ground, rezultatul este un termen. Dacă apare o variabilă CircuitJS, rezultatul este un pattern tipat. Această dublă utilizare elimină generatoarele separate de API și garantează că circuitul caută exact aceleași concepte pe care LongTextJS le produce.
Ontologia poate asocia behaviors, dar responsabilitatea lor trebuie limitată. Validarea locală, normalizarea unei unități, calculul unei forme canonice, indexarea și pretty-printing-ul sunt comportamente ontologice legitime. Reguli defeasible, priorități, excepții juridice sau concluzii dependente de context aparțin CircuitJS. Altfel, ontologia ar ascunde teoria de verificare într-un strat greu de inspectat.
Exemplul 3. Ontologie executabilă, fără obiect de configurare JSON-like
// ontologies/facility/facility.ontology.mjs
import {
  ontology, extendsOntology,
  requires, allows,
  from, to,
  exactlyOne, zeroOrOne, zeroOrMany
} from "../../../src/ontology/api.mjs";

import core from "../../core/index.mjs";

const O = ontology(
  "facility.operations@1",
  extendsOntology(core)
);

export const Person = O.entity("Person");
export const Door = O.entity("Door");
export const Building = O.entity("Building");
export const Credential = O.entity("Credential");

export const agent = O.role(
  "agent",
  from(O.Event),
  to(Person),
  exactlyOne()
);

export const theme = O.role(
  "theme",
  from(O.Event),
  to(O.oneOf(Door, Building, Credential)),
  exactlyOne()
);

export const location = O.role(
  "location",
  from(O.Situation),
  to(O.Place),
  zeroOrOne()
);

export const instrument = O.role(
  "instrument",
  from(O.Event),
  to(O.Entity),
  zeroOrMany()
);

export const Open = O.event(
  "Open",
  requires(agent),
  requires(theme),
  allows(location),
  allows(instrument)
);

export default O.seal();
3.2 Ontologiile de bază
Nucleul trebuie să fie mic, dar suficient de expresiv pentru ca ontologiile de domeniu să nu reinventeze sursa, timpul, claims sau evidence. Propunerea fixează opt pachete de bază. Ele sunt module independente și pot fi importate selectiv. Domeniile juridic, editorial, științific sau medical sunt construite deasupra lor.
Tabelul 3. Ontologiile de bază ale runtime-ului
Pachet de bază	Concepte și responsabilitate
`nll.source@1`	`Document`, `Revision`, `Section`, `Paragraph`, `Sentence`, `Span`, `Anchor`, `Channel`, `SourceOrder`; verifică intervale half-open, citate și hash-uri ale sursei.
`nll.semantic@1`	`Term`, `Entity`, `Situation`, `Event`, `State`, `Attribute`, `Value`, `Proposition`; roluri generice precum `agent`, `theme`, `source`, `target`, `instrument`.
`nll.discourse@1`	`Mention`, `Reference`, `Speaker`, `Narrator`, `ReportedSpeech`, `Conditional`, `Alternative`, `Context`, `World`, `Perspective`; păstrează scope-ul discursiv.
`nll.epistemic@1`	`Claim`, `Evidence`, `Interpretation`, `Support`, `Refutation`, `Conflict`, `Confidence`, `Coverage`, `Gap`, `Producer`, `Method`.
`nll.time@1`	`Instant`, `Interval`, `Duration`, `CalendarDate`, `ClockTime`, `RelativeTime`, `Timeline`; relațiile Allen și propagarea constrângerilor.
`nll.space@1`	`Place`, `Region`, `Point`, `Path`, `Origin`, `Destination`; relații precum `inside`, `contains`, `at`, `fromPlace`, `toPlace`, `through`.
`nll.quantity@1`	`Quantity`, `Unit`, `Dimension`, `ExactValue`, `IntervalValue`, `Tolerance`, `Ratio`; conversie și comparație fără string-uri nevalidate.
`nll.operational@1`	`Finding`, `Assessment`, `Gap`, `Recommendation`, `Plan`, `TextPatch`, `GeneratedDocument`, `CNLFrame`, `Verification`, `TraceEvent`.

`nll.normative`, `nll.editorial`, `nll.scientific` și alte pachete sunt ontologii standard de domeniu. `nll.normative` poate introduce `Obligation`, `Permission`, `Prohibition`, `Condition`, `Exception`, `Authority`, `Priority`, `Deadline` și `Satisfaction`. Un agent editorial nu trebuie să importe aceste concepte dacă nu le folosește. Ontologia activă rămâne specifică scopului agentului.
3.3 Extensie, concepte derivate și compatibilitate
Extensia se face prin import și namespace nou, nu prin mutarea unui registru global. Un modul sigilat păstrează identitatea conceptelor de bază. O ontologie de domeniu poate adăuga subtipuri, roluri și lexicalizări; o ontologie de analiză poate adăuga concepte derivate precum `ContinuityGap`, `UnmetObligation`, `UnsupportedClaim` sau `SuggestedPatch`. Conceptele derivate nu trebuie materializate din document ca și cum ar fi observații ale sursei.
Compatibilitatea are trei niveluri. Compatibilitatea de semnătură verifică dacă identitățile conceptelor și rolurilor cerute există și dacă versiunile sunt acceptabile. Compatibilitatea operațională verifică dacă sunt disponibile capabilitățile necesare, precum normalizarea temporală, rezoluția identității sau un renderer CNL. Compatibilitatea de coverage verifică dacă documentul a fost materializat suficient pentru concluzii bazate pe absență. Un circuit poate fi valid static și totuși blocat pentru un document concret.
Introspecția este obligatorie. `ontology.inspect` trebuie să poată afișa concepte, supertipuri, roluri, cardinalități, incompatibilități, lexicalizări, behaviors și utilizări. Coding agents folosesc această vedere pentru a nu inventa constructori inexistenți, iar plannerul o folosește pentru unificare și optimizare.
Exemplul 4. Ontologia de analiză separă rezultatele circuitelor de observațiile documentului
const A = ontology(
  "editorial.continuity.analysis@1",
  extendsOntology(continuityOntology)
);

export const ContinuityGap = A.derivedConcept(
  "ContinuityGap"
);

export const MissingTransition = A.derivedConcept(
  "MissingTransition"
);

export const SuggestedPatch = A.derivedConcept(
  "SuggestedPatch"
);

export default A.seal();
4. LongTextJS: programul semantic al documentului
LongTextJS are o singură responsabilitate: să descrie ce exprimă documentul, cu ancore, contexte și incertitudine. El nu decide conformitatea și nu produce findings; aceste funcții aparțin circuitelor.
4.1 Structură multi-fișier și ancorare
Un document scurt poate fi materializat într-un singur modul. Un document lung este împărțit după structura naturală și dependențele semantice. `source.mjs` declară sursa și revizia; `identities.mjs` păstrează entități stabile și ipoteze de coreferință; modulele `parts` descriu secțiuni; modulele `relations` leagă evenimente aflate în fișiere diferite; `program.mjs` compune totul. Importurile ESM sunt mecanismul de modularizare și nu există un manifest paralel de date.
Ancorele sunt obligatorii pentru claims și pentru observațiile care justifică findings. Un span conține sursa, revizia și intervalul exact. Runtime-ul poate verifica excerpt-ul sau hash-ul. Un termen poate avea mai multe ancore, iar același span poate susține mai multe interpretări. Codul nu copiază inutil textul integral; păstrează identificatori și materializează fragmentul numai pentru explicație sau validare.
Mențiunea și entitatea sunt separate. `mention(span, lexicalForm)` descrie apariția textuală; `Person(named("Ana"))` descrie o entitate; `refersTo` sau `identityCandidate` leagă apariția de entitate cu un statut epistemic. Această separare permite alternative și împiedică unirea prematură a numelor similare.
Exemplul 5. Organizarea unui document lung
longtext/incident-17/
  source.mjs
  identities.mjs
  contexts.mjs
  parts/
    0001-introduction.longtext.mjs
    0002-incident.longtext.mjs
    0003-response.longtext.mjs
    0004-conclusion.longtext.mjs
  relations/
    timeline.longtext.mjs
    cross-references.longtext.mjs
  coverage.longtext.mjs
  program.mjs
4.2 Termeni, claims, contexte și alternative
LongTextJS construiește termeni ground folosind ontologia activă. Evenimentele și stările descriu conținutul; claims descriu faptul că documentul, un actor sau o sursă afirmă acel conținut. Statutul `explicit`, `inferred`, `proposed`, `verified`, `rejected` sau `ambiguous` descrie originea interpretării și nu trebuie confundat cu valoarea de adevăr. Un claim propus poate fi suficient pentru o analiză euristică, dar un circuit juridic poate cere numai claims verificate.
Timpul și spațiul sunt termeni, nu string-uri. Evenimentele pot avea intervale și relații relative. `before(alarm, opening)` păstrează o constrângere care poate fi propagată; `during(opening, dateTime(...))` leagă un timp absolut. Locația funcționează similar. Un circuit poate interoga relația entailed, explicită sau doar compatibilă.
Pentru ambiguitate, `alternatives` creează contexte incompatibile. Coding agentul nu trebuie să aleagă o singură coreferință sau clasificare doar pentru ca circuitul să poată rula. În cazurile în care ontologia nu poate exprima ceva relevant, LongTextJS produce `gap`, nu un termen improvizat.
Exemplul 6. Unitate LongTextJS cu eveniment, claim, ancoră și alternative
// parts/0002-incident.longtext.mjs
import {
  semanticUnit, claim, explicit,
  groundedAt, alternatives,
  interpretation, confidence
} from "../../../../src/longtext/api.mjs";

import {
  Person, Door, Open,
  agent, theme, during
} from "../../../ontologies/index.mjs";

import { source, sOpening } from "../source.mjs";
import { ana, northGate } from "../identities.mjs";

const opening = Open(
  agent(ana),
  theme(northGate),
  during(clockTime("09:00"))
);

const openingClaim = claim(
  opening,
  explicit(),
  groundedAt(sOpening)
);

const subjectReading = alternatives(
  interpretation(
    resolvesTo(mention(sOpening, "she"), ana),
    confidence(0.72)
  ),
  interpretation(
    unresolvedReference(mention(sOpening, "she")),
    confidence(0.28)
  )
);

export default semanticUnit(
  "incident.opening",
  openingClaim,
  subjectReading
);
4.3 Execuția LongTextJS și cererea semantică
Modulele LongTextJS sunt executate ca JavaScript normal într-un sandbox. Runtime-ul injectează environment-ul ontologic și TermFactory. Constructorii validează sorturile și cardinalitățile înainte ca termenii să intre în store. Helpers, loops și funcții locale sunt permise pentru a reduce repetiția; valoarea semantică finală trebuie însă să fie formată din termeni și colecții DSL, nu din obiecte arbitrare.
Execuția produce un snapshot semantic. Stratul source și observațiile acceptate sunt sigilate pentru acel snapshot. Indecșii sunt construiți incremental. Coding agentul poate inspecta store-ul după concept, rol, context, timeline, identitate și anchor. Această inspecție este esențială: un fișier care se încarcă fără eroare poate totuși să lege greșit un rol sau să piardă o relație cross-section.
Circuitele deduc un `SemanticDemand` din pattern-uri, queries, declarațiile etapelor procedurale și contractele de capability. Cererea descrie conceptele, rolurile, operațiile temporale, rezoluția identității, evidence policy și absențele sensibile la coverage. Skill-ul LongText primește această vedere și materializează documentul orientat de cerere, fără a fi obligat să se limiteze la ea. Dacă cererea critică nu poate fi satisfăcută, agentul produce gaps explicite.
Exemplul 7. Vederea umană a SemanticDemand
Required concepts:
  Incident, Notification, Person,
  Authority, Exception

Required roles:
  subject, actor, occurredAt, jurisdiction

Operational capabilities:
  temporal comparison
  identity resolution
  source grounding

Coverage-sensitive absence:
  Notification within each reporting interval
Tabelul 4. Rezultatele posibile ale LongTextJS
Rezultat al materializării	Semnificație
Termen acceptat	Constructorii și rolurile sunt valide, iar proveniența este suficientă pentru statutul declarat.
Interpretare alternativă	Există mai multe legături sau clasificări coerente care trebuie păstrate separat.
Gap ontologic	Textul conține o noțiune relevantă pe care ontologia activă nu o poate reprezenta.
Gap de coverage	Nu poate fi demonstrat că toate aparițiile relevante au fost materializate în scope-ul cerut.
Referință nerezolvată	Mențiunea este ancorată, dar identitatea nu poate fi stabilită fără ipoteze suplimentare.

5. Natura CircuitJS: circuit dinamic, reguli și algoritmi
CircuitJS nu este nici un JSON cu noduri, nici un simplu motor de reguli, nici un program JavaScript opac. El este un limbaj ierarhic în care structura de calcul relevantă este explicită, iar algoritmii greu de descompus pot rămâne funcții instrumentate.
5.1 Definiția circuitului semantic
Un circuit template definește identitatea, ontologia, porturile, contractul `requires/provides`, regulile, etapele, subcircuitele și ordinea lor. O instanță de circuit leagă template-ul de valori concrete și de un context de interpretare. Graful de execuție conține noduri și muchii dataflow; fiecare valoare care traversează o muchie are un singur producător și nu este modificată după publicare. Aceasta este disciplina SSA relevantă pentru sistem.
Graful nu trebuie materializat integral înainte de rulare. Un query poate produce zece bindings, iar `instantiateEach` creează zece instanțe canonice ale unui subcircuit. Apariția unor facts noi poate activa `onMatch`; o etapă poate emite `requestCapability`; un plan poate extinde graful cu un renderer sau un verifier. În interiorul unui snapshot, expansiunea este append-only. Aceeași combinație template–binding–context nu este instanțiată de două ori.
Circuitul este ierarhic. Nodurile declarative precum query, normalize, compare, decide și derive pot fi inspectate fin și memoizate individual. Un operator JavaScript care implementează un algoritm de graf sau un apel iterativ de model este un macro-nod. Runtime-ul îi cunoaște intrările semantice, ieșirile, efectele și trace-ul, dar nu pretinde că variabilele locale ale funcției sunt noduri SSA. Această delimitare evită două extreme: grafuri artificiale imposibil de scris și funcții complet opace fără contract semantic.

Figura 4. Circuitul semantic este dinamic și ierarhic: reguli declarative, operatori JavaScript și subcircuite se compun în același graf de execuție.
Tabelul 5. Vocabularul circuitelor
Concept	Semnificație concretă
Circuit template	Definiție reutilizabilă cu porturi, contract, reguli, stages, schedule și outputs.
Circuit instance	Template legat de bindings și context semantic concret.
ValueRef	Referință imuabilă la o valoare produsă o singură dată în graful de execuție.
Declarative node	Operație inspectabilă fin: query, normalize, compare, decision, derive, aggregate, validate, emit.
Operator node	Funcție JavaScript normală, posibil asincronă sau stateful, instrumentată prin `ExecutionContext`.
Expansion request	Cerere tipată de instanțiere a unui subcircuit sau de obținere a unei capabilități.
Capability contract	Declarație a faptelor, operațiilor și garanțiilor cerute sau produse.

5.2 Reguli declarative și tabele decizionale
Regulile locale și relaționale trebuie exprimate declarativ atunci când forma este naturală. O regulă leagă variabile în `when`, aplică condiții, poate verifica absențe cu coverage explicit și execută acțiuni în `then`. Constructorii ontologici sunt folosiți direct ca pattern-uri. Query planner-ul poate inspecta regula, deduce cererea semantică și construi un plan bazat pe indecși.
Tabelele decizionale sunt potrivite pentru politici normative cu combinații explicite. Ele nu trebuie reduse la booleeni. Celulele pot conține `TRUE`, `FALSE`, `UNKNOWN` și `CONFLICT`; rezultatele pot fi `VIOLATED`, `SATISFIED`, `ACCEPTED_EXCEPTION`, `NOT_APPLICABLE`, `UNKNOWN` sau `BLOCKED_ONTOLOGY`. Compilatorul verifică suprapunerea rândurilor și incompletitudinea. Două rânduri cu aceeași prioritate și concluzii incompatibile produc `RULE_CONFLICT`, nu alegerea primului rând.
Regulile și tabelele sunt obiecte DSL reale, nu plain data. Ele pot fi importate, specializate, compuse și introspectate. Coding agentul poate genera un fișier per regulă și un index de circuit care le reunește.
Exemplul 8. Regulă declarativă peste constructorii ontologici
// circuits/continuity/rules/unexplained-use.rule.mjs
import {
  rule, when, then,
  match, variable, ref,
  where, notExists,
  requireCoverage,
  derive, emit, evidence,
  message, heuristic
} from "../../../../src/circuit/api.mjs";

import {
  Person, PhysicalObject, Place,
  Leave, Retrieve, Use,
  ContinuityGap,
  actor, objectRole, place
} from "../../../ontologies/index.mjs";

const person = variable(Person, "person");
const object = variable(PhysicalObject, "object");
const origin = variable(Place, "origin");
const destination = variable(Place, "destination");

export default rule(
  "unexplained-object-use",

  when(
    match(
      Leave(
        actor(person),
        objectRole(object),
        place(origin)
      )
    ).as("leaving"),

    match(
      Use(
        actor(person),
        objectRole(object),
        place(destination)
      )
    ).as("laterUse"),

    where(different(origin, destination)),
    where(before(ref("leaving"), ref("laterUse"))),

    notExists(
      match(
        Retrieve(
          actor(person),
          objectRole(object)
        )
      ),
      between(ref("leaving"), ref("laterUse")),
      requireCoverage(Retrieve)
    )
  ),

  then(
    derive(
      ContinuityGap(
        subject(object),
        fromPlace(origin),
        toPlace(destination)
      )
    ),

    emit(
      finding("possible-continuity-gap"),
      evidence(ref("leaving"), ref("laterUse")),
      message(
        "Obiectul este folosit într-un alt loc " +
        "fără o tranziție observată."
      ),
      assurance(heuristic())
    )
  )
);
Exemplul 9. Tabel decizional cu stări multivaluate
const retentionDecision = decisionTable(
  "personal-data-retention",
  columns(exceedsLimit, documentedException),

  row(
    values(TRUE, FALSE),
    result(VIOLATED)
  ),

  row(
    values(TRUE, TRUE),
    result(ACCEPTED_EXCEPTION)
  ),

  row(
    values(FALSE, anyValue()),
    result(SATISFIED)
  ),

  row(
    values(UNKNOWN, anyValue()),
    result(UNKNOWN)
  ),

  row(
    values(anyValue(), CONFLICT),
    result(CONFLICT)
  ),

  hitPolicy(uniqueOrConflict())
);
5.3 Etape procedurale și JavaScript complet
Nu toate verificările se reduc credibil la pattern-uri și tabele. CircuitJS trebuie să poată implementa algoritmi de graf, parsare, constraint solving, simulare, dynamic programming, clustering, căutare, agregare globală și iterații cu modele. O etapă procedurală este o funcție JavaScript normală care primește `ExecutionContext`. Ea poate folosi `let`, assignment, `if`, `switch`, loops, recursie, clase locale, excepții, Promise și `async/await`. Nu există o listă artificială de construcții interzise pentru a face limbajul să pară formal.
Delimitarea este API-ul semantic. Funcția citește prin `ctx.query` sau metodele store-ului public, derivă prin `ctx.derive`, emite prin `ctx.emit`, cheamă tool-uri prin `ctx.callTool`, modele prin `ctx.callModel` și subcircuite prin `ctx.runSubcircuit`. Accesul direct la indecși sau mutarea termenilor existenți nu este permisă. Plain objects pot exista local, dar nu intră în store până când nu sunt transformați în termeni ontologici.
Etapa poate declara `reads`, `writes`, `effects`, `requires` și `provides`. Pentru un experiment, declarațiile nu trebuie să blocheze rularea dacă sunt incomplete; instrumentarea poate observa ce concepte au fost accesate și poate raporta diferența. Totuși, contractele complete îmbunătățesc plannerul, caching-ul și explicațiile.
Exemplul 10. Operator procedural: algoritmul rămâne JavaScript normal, iar rezultatele rămân ontologice
export async function detectGlobalTimelineCycles(ctx) {
  const events = ctx.store.instancesOf(Event);
  const graph = new TemporalGraph();

  for (const event of events) {
    graph.add(event);
  }

  for (const relation of ctx.store.instancesOf(
    TemporalRelation
  )) {
    graph.connect(relation);
  }

  const cycles = graph.findStrictBeforeCycles();

  for (const cycle of cycles) {
    const verification = await ctx.verify(
      "timeline-cycle",
      () => replayTemporalCycle(cycle, ctx.store)
    );

    ctx.emit(
      TimelineContradiction(
        members(sequence(...cycle.events)),
        evidence(setOf(...cycle.claims)),
        verifiedBy(verification)
      )
    );
  }
}
Tabelul 6. Efectele operatorilor CircuitJS
Clasă de efect	Semantica runtime recomandată
`pure`	Rezultatul depinde numai de intrări și versiuni; poate fi memoizat și reexecutat identic.
`deterministicTool`	Apelează un tool versionat determinist; poate fi cached dacă inputul și versiunea tool-ului sunt fixate.
`model`	Apelează un model probabilistic; output-ul și promptul devin artefacte înghețate, iar replay-ul folosește artefactul, nu un nou apel implicit.
`stateful`	Modifică o resursă externă sau un state explicit; nu este memoizat ca funcție pură și trebuie izolat într-o tranzacție trasabilă.

5.4 Compoziție, capabilități și megacircuit virtual
Circuitele se compun prin importuri, porturi tipate și operații precum `include`, `instantiate`, `instantiateEach`, `connect`, `joinCircuits`, `specialize`, `onMatch`, `onFinding`, `requestCapability` și `aggregateProof`. Reuniunea a două grafuri nu este suficientă: tipurile, ontologiile, scope-ul și contextul de interpretare trebuie să fie compatibile. Un finding derivat într-o alternativă nu poate fi conectat la un circuit care așteaptă un fapt robust fără agregare explicită.
Registry-ul de capabilități evită materializarea tuturor circuitelor disponibile. O țintă precum `AllFindings(document, ruleSet)` este rezolvată backward: plannerul caută circuite care produc `FindingSet`, apoi rezolvă recursiv cerințele lor. După selectarea scheletului, activarea forward instanțiază circuitele pe facts concrete. Această combinație este mai realistă decât un singur megacircuit plat și mai explicită decât alegerea unui prompt global.
Contractul unui circuit descrie nu doar tipurile de input și output. `requires` poate cere un concept, un rol, scope închis, identity resolution, temporal comparison, evidence policy, un tool sau un dialect CNL. `provides` poate garanta evidence complet, determinism după parsare, interpretare-aware sau round-trip CNL. Plannerul preferă circuite ale căror cerințe sunt deja satisfăcute și poate solicita o nouă materializare sau un subcircuit atunci când lipsește o capabilitate.

Figura 5. Planificarea pornește de la rezultatul dorit și selectează lanțurile de capabilități; facts concrete activează apoi instanțele relevante.
Exemplul 11. Circuit compus prin capabilități și schedule explicit
export default circuit(
  "legal.notice-analysis@1",

  using(legalOntology),

  requires(
    capability(Claim),
    capability(IdentityResolution),
    capability(TemporalComparison)
  ),

  provides(
    capability(NoticeAssessment),
    guarantee(evidenceComplete()),
    guarantee(interpretationAware())
  ),

  include(
    extractApplicableAuthority,
    instantiateObligations,
    calculateDeadlines,
    evaluateExceptions,
    draftNoticePlan,
    verifyPlanCoverage
  ),

  schedule(
    beforeStage(
      extractApplicableAuthority,
      instantiateObligations
    ),
    parallel(
      calculateDeadlines,
      evaluateExceptions
    ),
    afterStage(
      draftNoticePlan,
      calculateDeadlines,
      evaluateExceptions
    ),
    afterStage(
      verifyPlanCoverage,
      draftNoticePlan
    )
  )
);
5.5 Frontiera exactă dintre circuit și program JavaScript
CircuitJS trebuie să păstreze o distincție explicită între trei obiecte care în variantele anterioare erau amestecate. Primul este limbajul de authoring: modulele `.mjs` pe care coding agentul le scrie, cu `rule`, `decisionTable`, `stage`, `circuit`, funcții și clase. Al doilea este modelul logic al circuitului: template-uri, porturi, capabilități, rules, stages și relații de ordine. Al treilea este graful materializat al unei rulări: instanțe concrete, ValueRefs, nodes, edges, bindings, requests și outputs. Graful de execuție nu trebuie confundat nici cu sursa CircuitJS, nici cu bytecode-ul JavaScript.
Regulile declarative pot fi coborâte în noduri fine deoarece structura lor este deja explicită. Un `match`, un join, o normalizare și un rând de decision table pot avea ValueRefs separate și pot fi cache-uite independent. O funcție procedurală, în schimb, este tratată ca o unitate semantică mai mare. Runtime-ul nu încearcă să transforme fiecare instrucțiune JavaScript într-un nod. La intrare, macro-nodul primește handles către valori sau un query capability; la ieșire publică termeni, results, expansion requests ori tool/model artifacts. Între aceste granițe, JavaScript-ul rămâne JavaScript.
Această alegere este importantă pentru realism. Dacă întregul CircuitJS ar fi un API declarativ strict, orice algoritm nontrivial ar trebui rescris într-o imitație de limbaj general. Dacă întregul CircuitJS ar fi doar funcții imperative, plannerul, trace-ul și compoziția ar pierde structura relevantă. Modelul ierarhic păstrează exact nivelul de granularitate util: fin acolo unde semantica este declarată, grosier acolo unde algoritmul are o structură internă proprie.
SSA se aplică valorilor publicate între nodes și stages, nu variabilelor locale. Un stage poate actualiza o variabilă locală de o mie de ori, dar publică o singură valoare imuabilă atunci când se încheie. Dacă dorește trace mai fin, autorul poate folosi `ctx.task`, `ctx.checkpoint` sau subcircuite pentru a expune pașii relevanți. Astfel, gradul de explicabilitate este controlat de semantica aplicației, nu de o transformare mecanică a sintaxei JavaScript.
Store-ul rămâne protejat chiar dacă limbajul este expresiv. Un operator nu primește internals mutabile și nu poate schimba retrospectiv un claim sursă. El poate propune derivări într-un transaction buffer; runtime-ul validează termenii, provenance și stratul de destinație înainte de commit. Efectele externe sunt accesate numai prin context, ceea ce permite logging și replay. Aceasta este o restricție arhitecturală legitimă deoarece apără modelul semantic, nu o restricție arbitrară asupra algoritmului.
Tabelul 6a. Cele trei niveluri ale CircuitJS
Nivel	Ce reprezintă și ce nu reprezintă
Sursa CircuitJS `.mjs`	Limbajul scris de coding agents: combinatori declarativi și JavaScript complet. Nu este un JSON și nu este graful materializat.
Circuit model	Template-uri, ports, contracts, rules, stages și schedule. Este inspectabil înaintea unei rulări concrete.
Execution graph	Instanțe și nodes concrete create pentru un snapshot, bindings și context. Este dinamic și append-only în acea rulare.
Declarative node	Unitate fină cu semnificație cunoscută plannerului și cache-ului.
Procedural macro-node	Funcție JavaScript normală cu boundary semantic, effects și trace; internals nu sunt convertite automat în graf.
SemanticStore transaction	Buffer de derivări și outputs validat înainte de commit; nu este mutație directă a internals.

6. Semantica de execuție și runtime-ul dinamic
Execuția trebuie să fie suficient de explicită pentru audit și suficient de flexibilă pentru algoritmi reali. Runtime-ul construiește graful în memorie, îl extinde pe măsură ce apar bindings și păstrează toate tranzițiile importante în trace.
6.1 Fluxul complet al unui snapshot
Rularea începe cu un `agent.mjs` care importă ontologiile, programul LongText, circuitele, tool-urile, modelele și dialectele CNL. Ontologiile sunt executate și sigilate. LongTextJS construiește snapshot-ul semantic și indecșii. Runtime-ul calculează compatibilitatea și SemanticDemand. Plannerul alege lanțurile de capabilități, apoi instanțiază template-urile și pornește agenda.
Fiecare nod primește referințe la valori imutabile. Pentru nodurile pure, runtime-ul calculează o cheie de conținut din identitatea operației, intrări, versiunea codului, ontologia, contextul de interpretare și evidence policy. Dacă rezultatul există, este reutilizat. Altfel, nodul este evaluat, valoarea este legată de output și trace-ul este actualizat. Expansion requests adaugă noi instanțe și noduri gata de rulare.
Procesul continuă în epochs. Un epoch pozitiv extrage și derivă facts monotone. Un epoch de closure propagă relații precum subtipul și timpul. Un epoch non-monotone evaluează absențe și excepții numai pentru scope-uri închise. Ultimul epoch emite findings, plans și CNLFrames. Dacă apar cereri nesatisfăcute sau capabilități lipsă, runtime-ul raportează blocajul și nu prezintă un rezultat incomplet ca succes.

Figura 6. Bucla unui snapshot: materializare, compatibilitate, planificare, instanțiere, evaluare, stabilizare și emitere.
Exemplul 12. Bucla conceptuală a schedulerului
while (readyAgenda.hasNodes()) {
  const node = readyAgenda.pop();
  const key = contentKey(
    node,
    inputValueIds(node),
    activeVersions,
    interpretationContext(node)
  );

  const value = cache.has(key)
    ? cache.get(key)
    : await evaluateNode(node, executionContext);

  if (!cache.has(key) && node.isCacheable()) {
    cache.put(key, value);
  }

  valueStore.bind(node.output, value);
  trace.recordEvaluation(node, value);

  for (const request of expansionRequests(value)) {
    const instance = instantiateCanonical(request);
    graph.insert(instance);
    readyAgenda.addNewlyReady(instance);
  }

  readyAgenda.addDependentsMadeReady(node);
}
6.2 Monotonicitate, scope closure și actualizarea documentului
Într-un snapshot, observațiile sursă și valorile publicate sunt imutabile. Derivările pozitive sunt monotone: adăugarea unor facts noi nu invalidează concluziile pozitive anterioare. Reguli precum „nu există excepție” sunt non-monotone. Ele nu sunt evaluate definitiv până când scope-ul relevant nu este închis. `notExists` returnează `UNKNOWN` într-un scope deschis și poate deveni `FALSE` sau `TRUE` numai după closure.
Editarea documentului creează un snapshot nou. Un algoritm de aliniere poate păstra identitățile spanurilor neschimbate și poate reutiliza subgrafurile comune prin content hash. Nu este necesar ca runtime-ul să mute sau să șteargă noduri din graful vechi. Noul snapshot referă valorile comune și invalidează descendenții observațiilor modificate. Modelul seamănă cu o structură persistentă și face auditul între versiuni mult mai clar.
Circuitele recursive pot folosi `iterateUntilStable` sau o buclă proprie. Helper-ul oferă trasare, detectarea convergenței și o frontieră de oprire, dar nu este o restricție asupra limbajului. Expansiunea canonică previne re-instantierea identică; bugetele de timp, noduri și apeluri de model protejează experimentul de divergențe accidentale. Depășirea bugetului produce `BLOCKED_RESOURCE`, nu absența unei încălcări.
6.3 Statusuri, assurance și explicații
Un rezultat de regulă nu este doar `true` sau `false`. Precondițiile pot lipsi, excepțiile pot fi valabile, ontologia poate fi incompatibilă, alternativele pot intra în conflict sau evaluarea poate fi blocată de resurse. Statusurile trebuie să fie tipuri ontologice și să aibă semantică explicită.
Fiecare output are și un nivel de assurance. `mechanical` indică o proprietate verificată de un algoritm determinist; `crossChecked` indică replay sau o a doua implementare; `modelAssisted` arată dependența de un model; `heuristic` descrie o euristică explicită; `unverified` marchează un rezultat exploratoriu. Nu orice output are nevoie de verifier independent, dar raportul nu trebuie să confunde nivelurile.
Explicația este derivată din trace. Forma compactă arată regula, fragmentul și motivul principal. Forma structurală arată queries, bindings, valori intermediare, rândul tabelului decizional, excepțiile căutate, coverage-ul și verificatorii. Un model poate reformula explicația, dar nu poate adăuga premise absente din trace.
Tabelul 7. Statusurile regulilor și ale execuției
Status	Interpretare
`SATISFIED`	Condițiile relevante sunt îndeplinite și informația necesară este disponibilă.
`VIOLATED`	Există evidență suficientă că regula este încălcată în scope-ul evaluat.
`NOT_APPLICABLE`	Precondițiile regulii nu sunt îndeplinite; nu este o declarație de conformitate generală.
`ACCEPTED_EXCEPTION`	Condiția principală ar indica încălcarea, dar o excepție validă și documentată se aplică.
`UNKNOWN`	Regula este relevantă, dar una sau mai multe premise nu pot fi determinate.
`CONFLICT`	Claims, interpretări sau reguli admise produc concluzii incompatibile.
`BLOCKED_ONTOLOGY`	Reprezentarea activă nu poate exprima o noțiune necesară circuitului.
`BLOCKED_CAPABILITY`	Lipsește o operație sau un circuit necesar, de exemplu normalizarea temporală ori un renderer.
`BLOCKED_RESOURCE`	Evaluarea nu a ajuns la punct fix în bugetul alocat.
`ERROR_EXECUTION`	Un operator sau tool a eșuat; eroarea este tehnică și nu trebuie transformată în verdict semantic.

Tabelul 8. Invariantele nucleului runtime
Invariant	Cerință
`EveryFindingHasEvidence`	Fiecare finding are cel puțin un span sau o evidență externă versionată.
`EveryDerivedFactHasProvenance`	Orice fapt derivat indică circuitul, nodul și intrările care l-au produs.
`UnknownIsNotFalse`	Lipsa unei valori nu satisface automat o condiție negativă.
`ClosedScopeForAbsence`	`none` și `notExists` necesită coverage sau scope închis pentru verdict final.
`NoImplicitOntologyCast`	Conversiile între concepte sunt permise numai prin relații ontologice explicite.
`NoUntrackedModelFact`	Ieșirile modelelor sunt candidate cu model, prompt, run și proveniență.
`InterpretationContextPreserved`	Faptele și findings dintr-o alternativă nu devin robuste fără agregare explicită.
`NoDuplicateInstantiation`	Aceeași instanță canonică de template nu este introdusă de două ori.
`ResourceFailureIsExplicit`	Oprirea din cauza resurselor nu poate fi raportată ca rezultat semantic.

6.4 Trace, replay și persistență
Trace-ul trebuie să răspundă la întrebări concrete: ce fișier LongText a creat termenul, ce span îl susține, ce query l-a selectat, ce binding a instanțiat circuitul, ce rând decizional s-a aplicat, ce operator a derivat concluzia, ce verifier a fost rulat și ce output a fost emis. Trace-ul este el însuși un program `.mjs`, împărțit pe fișiere în rulări mari.
Replay-ul determinist reexecută nodurile non-model pentru aceleași intrări și versiuni. Pentru un apel de model, rezultatul acceptat este înghețat ca artefact și devine input al replay-ului. Runtime-ul nu reapelază implicit modelul și nu pretinde că două generări sunt identice. Această diferență permite auditarea lanțului fără a interzice componente probabilistice.
Persistența autoritativă este codul: ontologii, LongText, circuite, expected outputs și traces `.mjs`, plus surse și rapoarte Markdown. Cache-ul intern poate fi reconstruit și nu este sursa semantică. Când un finding este exportat, runtime-ul îl tipărește prin aceiași constructori ontologici pe care alte circuite îi pot importa.
Exemplul 13. Trace persistent ca modul `.mjs`
// runs/incident-17/run.trace.mjs
import {
  trace, loaded, createdTerm,
  matched, instantiated,
  derived, verified, emitted,
  sequence
} from "../../src/trace/api.mjs";

export default trace(
  "incident-17-run",
  sequence(
    loaded("longtext/incident-17/program.mjs"),
    createdTerm(
      ref("claim.opening"),
      fromFile("parts/0002-incident.longtext.mjs")
    ),
    matched(
      ref("rule.unexplained-use"),
      bindingsFile("bindings-0007.mjs")
    ),
    instantiated(ref("circuit-instance-0042")),
    derived(ref("continuity-gap-1")),
    verified(ref("verification-1")),
    emitted(ref("finding-1"))
  )
);
6.5 Tranzacții semantice, paralelism și lifecycle-ul unui nod
Fiecare evaluare de node sau stage rulează într-un context tranzacțional. Query-urile citesc snapshot-ul stabil al epoch-ului curent. `ctx.derive` și `ctx.emit` nu modifică imediat store-ul; ele adaugă termeni într-un buffer. La final, runtime-ul verifică ontologia, stratul de write, provenance, duplicatele și invariants. Numai apoi publică valorile și activează dependenții. Dacă operatorul aruncă o excepție, bufferul este abandonat și trace-ul înregistrează `ERROR_EXECUTION` fără facts parțiale.
Această disciplină nu transformă JavaScript-ul într-un limbaj pur, dar face efectele asupra semanticii atomice. Un operator poate folosi fișiere temporare, modele sau tool-uri, însă numai artifactele declarate sunt atașate tranzacției. Pentru un tool stateful, runtime-ul poate avea un `prepare/commit/rollback` adapter; pentru experiment este suficient ca write-urile semantice să fie atomice și efectele externe să fie vizibile în trace.
Nodurile independente pot rula în paralel. Schedulerul poate executa queries, normalizări și subcircuite ale căror intrări sunt disponibile și ale căror write sets nu intră în conflict. Merge-ul rezultatelor este determinist: termenii sunt ordonați canonic pentru hashing și presentation, iar publication order nu schimbă semantica. Dacă două nodes derivă termeni incompatibili, store-ul păstrează conflictul sau activează un circuit de rezoluție; nu lasă ultima scriere să câștige.
Lifecycle-ul recomandat este `CREATED → READY → RUNNING → PRODUCED → VALIDATED → COMMITTED`. Un node poate trece în `CACHED`, `BLOCKED`, `FAILED` sau `CANCELLED`. Starea tehnică nu este statusul semantic al unei reguli. De exemplu, un decision node poate fi `COMMITTED` și să producă `UNKNOWN`; un operator poate fi `FAILED` și să nu producă niciun verdict. Separarea previne confuzia dintre problemele runtime-ului și concluziile despre document.
Pentru apelurile de model, lifecycle-ul include `REQUESTED`, `ARTIFACT_CAPTURED` și `ACCEPTED` sau `REJECTED`. Output-ul brut nu intră automat în store. Un validator, un reviewer ori un circuit de acceptare îl transformă într-un claim sau GeneratedDocument cu provenance completă. Astfel, „LLM-ul a spus” nu devine implicit fapt semantic.
Tabelul 8a. Lifecycle-ul tehnic al unui nod
Stare de node	Semnificație
`CREATED`	Instanța există în graful materializat, dar dependențele nu sunt încă satisfăcute.
`READY`	Toate intrările și capabilitățile locale necesare sunt disponibile.
`RUNNING`	Evaluatorul sau operatorul execută calculul.
`PRODUCED`	Au fost create valori candidate și un transaction buffer.
`VALIDATED`	Tipurile, provenance și invariants au fost verificate.
`COMMITTED`	Valorile au fost publicate în store și pot activa dependenți.
`CACHED`	Valoarea a fost reutilizată dintr-o intrare content-addressed validă.
`BLOCKED`	Lipsește o intrare, capabilitate, scope closure sau resursă.
`FAILED`	Operatorul sau tool-ul a eșuat; bufferul semantic nu a fost publicat.

7. API-ul concret, query algebra și repository-ul
Arhitectura trebuie să poată fi implementată fără un strat paralel de date. API-urile publice construiesc termeni, patterns și circuite; runtime-ul poate schimba reprezentarea internă fără să schimbe codul generat de agents.
7.1 Query algebra asupra SemanticStore
CircuitJS interoghează modelul logic, nu fișierele LongTextJS și nu array-uri interne. Operațiile de bază sunt `match`, `bind`, `where`, `exists`, `notExists`, `same`, `different`, `related`, `withinScope`, `inContext`, `groundedAt`, `before`, `after`, `between`, `overlaps`, `group`, `aggregate`, `path`, `stateAt` și `derive`. Pattern-urile sunt tipate prin constructorii ontologici.
Query planner-ul transformă un pattern într-un plan bazat pe indecși. `match(Use(actor(person), theme(object)))` poate deveni intersecția indexului de concept `Use` cu indecșii de rol pentru `actor` și `theme`. Dacă variabilele sunt libere, query-ul produce bindings. Dacă pattern-ul este ground, produce terms sau o valoare multivaluată. Contextul și interpretation set-ul fac parte din plan.
Circuitele procedurale pot folosi un API fluent sau iteratori. API-ul nu trebuie să impună un singur stil. Important este ca toate accesările să fie instrumentabile și să păstreze scope-ul, evidence policy și provenance.
Exemplul 14. Query semantic în interiorul unui operator JavaScript
const uses = ctx.query(
  match(
    Use(
      actor(person),
      theme(object)
    )
  )
    .within(documentScope)
    .under(evidencePolicy(verifiedOrExplicit()))
    .orderedBy(sourceOrder())
);

for (const binding of uses) {
  const history = ctx.query(
    relatedEvents(binding.object)
      .before(binding.event)
      .within(sameNarrativeWorld(binding.event))
  );

  // Algoritm procedural normal peste rezultate semantice.
}
Tabelul 9. Familiile principale de primitive
Familie	Primitive reprezentative
Construcție semantică	`entity`, `event`, `state`, `claim`, `proposition`, `context`, `evidence`, `span`, `alternatives`.
Pattern și query	`variable`, `match`, `where`, `join`, `exists`, `notExists`, `related`, `withinScope`, `path`.
Normalizare	`normalizeTime`, `normalizeQuantity`, `canonicalConcept`, `resolveReference`, `compare`.
Derivare	`derive`, `project`, `aggregate`, `classify`, `inferRelation`, `deriveUntilStable`.
Decizie	`decisionTable`, `require`, `forbid`, `allow`, `unless`, `conflict`, `unknown`, `blocked`.
Compoziție	`include`, `instantiate`, `instantiateEach`, `specialize`, `connect`, `parallel`, `schedule`.
Expansiune	`onMatch`, `onFinding`, `expandIf`, `requestCapability`, `runSubcircuit`.
Output	`emitFinding`, `emitGap`, `emitPlan`, `emitPatch`, `emitGeneratedDocument`, `emitCNLFrame`.
Proveniență	`groundedAt`, `dependsOn`, `generatedBy`, `interpretationContext`, `versionPin`, `assurance`.

7.2 Structura repository-ului
Repository-ul nu conține formate paralele, directoare de candidates și releases sau fișiere `.json` și `.ts`. Codul runtime-ului, ontologiile și proiectele agentului sunt ESM. Un proiect concret poate avea multe surse și multe circuite, iar `agent.mjs` rămâne rădăcina compozițională.
Exemplul 15. Structura repository-ului
nllAgent/
  README.md
  AGENTS.md
  bin/
    nllagent.mjs
  src/
    ontology/
      api.mjs
      environment.mjs
      term-factory.mjs
    longtext/
      api.mjs
      program.mjs
      source.mjs
    store/
      semantic-store.mjs
      query.mjs
      indexes.mjs
      temporal.mjs
      coverage.mjs
    circuit/
      api.mjs
      rule.mjs
      decision-table.mjs
      template.mjs
      execution-context.mjs
    planner/
      capability-registry.mjs
      planner.mjs
    runtime/
      scheduler.mjs
      cache.mjs
      trace.mjs
      sandbox.mjs
    cnl/
      frame.mjs
      renderer.mjs
      parser.mjs
      comparator.mjs
    benchmark/
      api.mjs
      runner.mjs
      mutation.mjs
    skills/
      nll-design-ontology/
      nll-materialize-longtext/
      nll-author-circuits/
      nll-author-cnl/
      nll-build-benchmark/
      nll-integrate-experiment/
      nll-review-and-repair/
  ontologies/
    core/
    domains/
  agents/
    editorial/
      authority/
      ontologies/
      longtext/
      circuits/
      cnl/
      benchmarks/
      tools/
      agent.mjs
  runs/
7.3 Module de asamblare și convenții
`agent.mjs` poate calcula liste de circuite, selecta ontologii și configura tool-uri prin cod normal. El nu este un manifest de date. Runner-ul importă modulul într-un proces sandboxed, injectează tool-urile permise și creează `OntologyEnvironment`, `SemanticStore`, `CapabilityRegistry` și `ExecutionContext`.
Convențiile de fișiere fac repository-ul navigabil: `.ontology.mjs` pentru ontologii, `.longtext.mjs` pentru materializare, `.rule.mjs` pentru reguli declarative, `.stage.mjs` pentru etape procedurale, `.operator.mjs` pentru algoritmi reutilizabili, `.circuit.mjs` pentru compoziție, `.expected.mjs` pentru rezultate de benchmark, `.trace.mjs` pentru traces și `.grammar.mjs` pentru dialecte CNL. Convenția nu limitează importurile; ea ajută agents și tool-urile să găsească artefactele.
Sandboxing-ul este separat de semantica DSL. Modulele rulează într-un worker sau proces copil cu director dedicat, importuri permise și tool-uri injectate. Sistemul nu parsează JavaScript pentru a elimina control flow-ul și nu transformă codul într-un AST de date. Izolarea protejează runtime-ul, iar API-urile semantice păstrează coerența store-ului.
Exemplul 16. Rădăcina executabilă a unui proiect nllAgent
// agents/editorial/agent.mjs
import {
  agent, using,
  materializes, runs,
  tools, models, dialects
} from "../../src/agent/api.mjs";

import ontology from "./ontologies/index.mjs";
import manuscript from "./longtext/manuscript/program.mjs";
import continuity from "./circuits/continuity/index.circuit.mjs";
import chronology from "./circuits/chronology/index.circuit.mjs";
import scientific from "./circuits/scientific/index.circuit.mjs";
import cnl from "./cnl/index.mjs";
import localTools from "./tools/index.mjs";
import localModels from "./models/index.mjs";

export default agent(
  "editorial-experiment",
  using(ontology),
  materializes(manuscript),
  runs(continuity, chronology, scientific),
  tools(localTools),
  models(localModels),
  dialects(cnl)
);
8. Generarea controlată de text și CNL
CircuitJS trebuie să poată repara, sintetiza și explica texte, dar rezultatul controlat nu trebuie să pornească de la un prompt liber. Sensul este construit înaintea formulării și este verificat după formulare.
8.1 CNLFrame și rendererul determinist
Un `CNLFrame` descrie tipul enunțului și sloturile semantice obligatorii. Pentru o normă, acestea pot fi actor, modalitate, acțiune, obiect, condiție, termen, excepție și autoritate. Pentru o definiție, conceptul, clasa superioară și diferențiatorii. Pentru o constatare, obiectul, proprietatea, evidența și nivelul de assurance.
Rendererul nu completează sloturi lipsă. El poate refuza cadrul sau poate produce o întrebare de clarificare. Lexiconul mapează concepte ontologice la forme canonice, iar gramatica controlează ordinea, acordul și evitarea pronumelor ambigue. Un dialect CNL este un modul `.mjs` cu renderer și parser corespunzător.
După lexicalizare, parserul reconstruiește cadrul. Comparatorul verifică echivalența pentru modalitate, cuantificare, negație, timp, actor, obiect, condiții și excepții. Dacă round-trip-ul eșuează, textul nu primește statut de CNL verificat.
Exemplul 17. Cadru semantic pentru o clauză normativă
const frame = obligation(
  actor(entityRef("controller")),
  action(concept("erase")),
  object(concept("personal-data")),
  deadline(
    noLaterThan(
      yearsAfter(eventRef("collection"), 5)
    )
  ),
  exception(
    documentedLegalObligation(
      requiresLongerRetention()
    )
  )
);

Figura 7. CNL-ul este acceptat numai dacă textul reanalizat reconstruiește un cadru semantic echivalent.
8.2 Generarea model-assisted și reanalizarea
CNL-ul determinist nu acoperă toate formele de text. Pentru rapoarte, explicații extinse sau secțiuni editoriale, CircuitJS poate construi un plan semantic, selecta evidence și apela un model writer. Output-ul este un `GeneratedDocument` cu prompt, model run, plan, evidence și assurance `modelAssisted`. El este apoi reintrodus în LongTextJS și verificat de circuite.
Această buclă permite generări arbitrar de complexe fără a le declara echivalente cu CNL-ul. Un text model-assisted poate fi acceptat ca draft, poate fi revizuit automat pe baza findings sau poate fi blocat dacă introduce claims neautorizate. Circuitul este liber să itereze, dar fiecare versiune și fiecare motiv de revizie rămân în trace.
Exemplul 18. Generare model-assisted cu plan semantic și reanalizare
export async function generateIncidentNotice(ctx) {
  const plan = buildNoticePlan(ctx.store);
  ctx.derive(plan);

  const draft = await ctx.callModel(
    "writer",
    promptFrom(plan),
    withEvidence(planEvidence(plan)),
    withStyle(noticeStyleGuide)
  );

  const generated = GeneratedDocument(
    content(markdown(draft.text)),
    basedOn(plan),
    producedBy(modelRun(draft.runId)),
    assurance(modelAssisted())
  );

  ctx.emit(generated);

  const audit = await ctx.runSubcircuit(
    auditGeneratedNotice,
    inputDocument(generated)
  );

  if (audit.hasCriticalFindings()) {
    const revised = await ctx.callModel(
      "writer.revise",
      draft,
      findings(audit.findings)
    );

    ctx.emit(
      GeneratedDocument(
        content(markdown(revised.text)),
        revisionOf(generated),
        producedBy(modelRun(revised.runId))
      )
    );
  }
}
9. Skill-urile coding agents și generarea multi-fișier
Coding agents sunt compilatoarele practice ale sistemului. Ei trebuie să poată citi surse lungi, să creeze mai multe fișiere, să ruleze checker-ele, să inspecteze store-ul și să repare iterativ ontologia, materializarea și circuitele.

Figura 8. Skill-urile împart problema pe artefacte, iar tool-urile și review-ul formează bucla de feedback executabil.
9.1 Tool-urile comune
Skill-urile sunt documente `SKILL.md` cu scop, intrări, instrucțiuni, tool-uri, output-uri și criterii de finalizare. Ele nu depind de un anumit coding harness. Un adapter poate expune acțiunile ca tools native sau ca CLI. Output-ul persistent rămâne `.mjs` și Markdown.
Tabelul 10. Tool-urile disponibile coding agents
Tool	Funcție
`repo.list` / `repo.search`	Enumeră și caută fișiere, imports, concepte, reguli, references și utilizări.
`repo.read` / `repo.write` / `repo.patch`	Citește, creează și modifică mai multe fișiere în workspace.
`source.outline`	Afișează structura unui document, secțiunile și offset-urile globale.
`source.span`	Verifică un interval și excerpt-ul asociat.
`ontology.inspect`	Afișează concepte, roluri, cardinalități, behaviors, extensii și usages.
`ontology.check`	Execută modulele ontologice și raportează conflicte, constructori invalizi și exemple eșuate.
`longtext.check`	Validează modulele LongTextJS, ancorele, sorturile, referințele și gaps.
`longtext.run`	Construiește SemanticStore și produce un raport de materializare.
`store.inspect` / `store.query`	Inspectează termeni, claims, contexte, timeline, identity și execută query-uri `.mjs`.
`circuit.check`	Încarcă circuitele, verifică contractele, variabilele, coverage-ul și outputs.
`circuit.run`	Execută circuite pe un snapshot și produce findings și trace.
`trace.explain`	Reconstruiește lanțul de la output la rules, bindings, terms și spans.
`benchmark.run`	Rulează micro-cazuri, mutații și scenarii end-to-end.
`test.run`	Rulează `node --test` pentru modulele `.test.mjs`.

9.2 Skill-ul `nll-design-ontology`
Scopul skill-ului este construirea sau extinderea ontologiei necesare regulilor și documentelor de calibrare. Agentul primește sursele de autoritate, regulile, exemplele, ontologiile existente și output-urile dorite. El trebuie să distingă conceptele observabile în document de conceptele derivate de circuite, să identifice rolurile și cardinalitățile și să evite sinonimele care dublează aceeași identitate.
Agentul creează mai multe fișiere când domeniul este amplu: `core.ontology.mjs`, subontologii pe domenii, behaviors de normalizare, lexicalizări, exemple și teste. El poate folosi funcții și helpers normale. Nu introduce reguli defeasible în behaviors. Pentru fiecare concept de domeniu păstrează o justificare în `ontology-notes.md`: sursa, rolul în reguli, dacă este observabil sau derivat și ce constructori îl folosesc.
Workflow-ul executabil este: inspectarea surselor și a ontologiilor existente; construirea matricei conceptuale; scrierea modulelor; generarea exemplelor valide și invalide; `ontology.check`; `node --test`; introspecția usages; generarea documentației. Skill-ul se încheie când ontologiile se încarcă, exemplele invalide eșuează cu diagnostice precise și fiecare concept este folosit de materializare sau circuite.
Tabelul 11. Contractul skill-ului de ontologie
Element al contractului	Specificație
Intrări	Reguli și exemple NL, documente de calibrare, ontologii existente, outputs dorite.
Output-uri	Module `.ontology.mjs`, behaviors `.mjs`, `ontology.examples.mjs`, teste și `ontology.md`.
Interdicție semantică	Nu materializează findings și nu ascunde excepții sau priorități în normalizatori.
Criteriu de finalizare	Constructorii sunt validați, rolurile sunt complete, conceptele duplicate sunt eliminate, iar usages sunt explicabile.

9.3 Skill-ul `nll-materialize-longtext`
Skill-ul transformă unul sau mai multe documente într-un program LongTextJS multi-fișier. Agentul primește sursa, ontologia activă, SemanticDemand, exemplele existente și scope-ul sarcinii. Pentru texte lungi, `source.outline` și segmentarea după secțiuni furnizează fragmente cu offset-uri globale.
Agentul creează `source.mjs`, registre de identitate, contexte, module pe secțiuni, module pentru relații cross-section, coverage și `program.mjs`. El păstrează textul nemodificat și verifică fiecare anchor. Claims sunt marcate `explicit`, `inferred` sau `proposed`; ambiguitatea produce alternatives; noțiunile nereprezentabile produc gaps. Findings și conceptele derivate ale circuitelor nu apar în materializare.
Strategia multi-fișier urmărește unitățile semantice, nu un număr fix de tokeni. Evenimentele locale rămân în secțiune; identitățile recurente sunt centralizate; timeline-ul și relațiile globale sunt module separate. Agentul rulează `longtext.check` după fiecare grup de fișiere, apoi `longtext.run`, `store.inspect` și query-urile de cerere. Skill-ul se încheie când ancorele sunt valide, referințele sunt fie rezolvate, fie marcate, iar cererea critică este satisfăcută sau reprezentată prin gaps.
Tabelul 12. Contractul skill-ului LongTextJS
Element al contractului	Specificație
Intrări	Documente sursă, ontologie, SemanticDemand, exemple LongText și limitele analizei.
Output-uri	`source.mjs`, `identities.mjs`, `contexts.mjs`, module `parts`, `relations`, `coverage` și `program.mjs`.
Principiu	Descrie ceea ce textul exprimă, nu verdictul și nu ceea ce regula ar dori să găsească.
Criteriu de finalizare	Store-ul este valid, ancorat, inspectabil, iar gaps și alternativele sunt explicite.

9.4 Skill-ul `nll-author-circuits`
Skill-ul transformă reguli, exemple și ontologii într-un ansamblu de circuite. Agentul primește sursele de autoritate, documentele de calibrare materializate, benchmark-urile existente și output-urile dorite. El trebuie să poată executa queries și circuite pe store-uri concrete în timpul authoring-ului.
Pentru fiecare familie de reguli, agentul scrie un README scurt cu premise, excepții, priorități, evidence policy și outputs. Apoi alege forma potrivită: `rule` pentru pattern-uri locale, `decisionTable` pentru politici tabulare, `stage` pentru algoritmi globali, `template` pentru instanțiere repetată și `circuit` pentru compoziție. Nu este obligat să aleagă cea mai declarativă formă; criteriul este claritatea și corectitudinea.
Agentul poate defini funcții, clase, loops, recursie și `async`. Tool-urile și modelele sunt accesate prin context. Fiecare output are evidence și assurance. Verificatorul independent este obligatoriu numai când se pretinde `mechanical` sau `crossChecked`. Agentul rulează `circuit.check`, `circuit.run`, inspectează trace-ul și repară stratul corect: dacă lipsa este ontologică, nu o maschează prin string matching în circuit.
Tabelul 13. Contractul skill-ului CircuitJS
Element al contractului	Specificație
Intrări	Reguli NL, authority spans, ontologii, LongText de calibrare, benchmark-uri și traces de eșec.
Output-uri	Fișiere `.rule.mjs`, `.stage.mjs`, `.operator.mjs`, templates, verifiers și `index.circuit.mjs`.
Principiu	Graful de execuție este explicit la granițele semantice; algoritmii nu sunt descompuși artificial.
Criteriu de finalizare	Fiecare regulă are path executabil, excepțiile sunt reprezentate, outputs au evidence, iar trace-ul ajunge la sursă.

9.5 Skill-urile CNL, benchmark, integrare și review
`nll-author-cnl` construiește frames, lexicon, renderer, parser și comparator pentru un dialect controlat. El produce cazuri de round-trip pentru modalități, negații, termene și excepții. Skill-ul refuză un dialect în care parserul nu poate reconstrui exact sloturile critice.
`nll-build-benchmark` produce micro-cazuri și scenarii long-range. Un caz conține `input.md`, opțional `input.longtext.mjs`, `expected.mjs` și `notes.md`. Pentru testarea circuitului, materializarea este fixată; pentru testarea coding agentului, materializarea este generată. Suite-ul include caz conform, încălcare, excepție, informație insuficientă, scope deschis și închis, ambiguitate, conflict și incompatibilitate ontologică. Mutation testing elimină excepții, inversează comparatori, ignoră coverage-ul sau unește identități pentru a verifica dacă benchmark-ul detectează erorile.
`nll-integrate-experiment` construiește `agent.mjs`, conectează toate modulele și rulează fluxul end-to-end. Poate delega materializarea pe secțiuni și integra rezultatele. Produce `experiment-report.md`, nu un release manifest.
`nll-review-and-repair` este executat de un agent independent sau într-o sesiune nouă. El caută premise materializate ca facts, findings introduse în LongText, scope pierdut, identity merge nejustificat, negație aplatizată, coverage fictiv, behaviors ontologice care ascund reguli și operatori care accesează structurile fizice. Review-ul poate modifica toate artefactele și trebuie să reruleze benchmark-ul.
Exemplul 19. Benchmark semantic fără expected JSON
benchmarks/cases/unexplained-object-use/
  input.md
  input.longtext.mjs
  expected.mjs
  notes.md

// expected.mjs
import {
  expected,
  containsFinding,
  excludesFinding
} from "../../../src/benchmark/api.mjs";

import {
  ContinuityGap,
  subject,
  entityNamed,
  type
} from "../../ontologies/index.mjs";

export default expected(
  containsFinding(
    ContinuityGap(
      subject(entityNamed("phone"))
    )
  ),
  excludesFinding(
    type("timeline-contradiction")
  )
);
10. Exemple end-to-end
Exemplele următoare arată cum aceeași arhitectură tratează reguli normative, contradicții, continuitate narativă și coerență științifică. Accentul este pe traseul semantic, nu pe un verdict izolat.
10.1 Politica de retenție
Documentul afirmă: „Operatorul poate păstra înregistrările clienților timp de zece ani pentru audit.” Regula de autoritate spune: „Datele personale nu trebuie păstrate mai mult de cinci ani, cu excepția cazului în care o obligație legală documentată impune o perioadă mai lungă.” Ontologia clasifică `customerRecords` ca subtip de `PersonalData`; LongTextJS materializează un eveniment `Retain`, durata de zece ani, scopul de audit și modalitatea de permisiune.
Circuitul selectează claims de retenție asupra datelor personale, normalizează durata și caută claims de obligație legală documentată asociate aceleiași retenții. Dacă scope-ul politicii este închis și excepția lipsește, tabelul decizional produce `VIOLATED`. Scopul „audit” nu este tratat ca obligație legală doar pentru că pare rezonabil. Finding-ul include spanul duratei, authority span-ul limitei și trace-ul căutării excepției.
Dacă scope-ul este deschis, rezultatul este `UNKNOWN`. Dacă documentul conține o obligație legală documentată, rezultatul este `ACCEPTED_EXCEPTION`. Dacă ontologia nu poate reprezenta tipul de autoritate menționat, rezultatul este `BLOCKED_ONTOLOGY`. Același circuit produce astfel rezultate distincte fără a le reduce la un scor.
Tabelul 14. Decizia pentru politica de retenție
Condiție semantică	Rezultat
Durata depășește limita; scope închis; excepția lipsește	`VIOLATED`
Durata depășește limita; există obligație legală documentată	`ACCEPTED_EXCEPTION`
Durata nu depășește limita	`SATISFIED`
Durata sau excepția nu poate fi determinată	`UNKNOWN`
Tipul obligației nu poate fi reprezentat	`BLOCKED_ONTOLOGY`
Alternative plauzibile produc concluzii opuse	`CONFLICT`

Pentru repair, circuitul nu schimbă mecanic „zece” în „cinci”. El produce două CNLFrames: o permisiune limitată la cinci ani și o excepție condiționată de obligația legală. Rendererul poate produce: „The operator MAY retain customer records for no longer than five years after collection. The operator MAY retain the records for a longer period only when a documented legal obligation requires it.” Round-trip-ul confirmă că excepția și modalitatea sunt păstrate.
10.2 Contradicție aparentă și specializare
Documentul afirmă: „Jurnalele sunt păstrate 30 de zile. Jurnalele de securitate sunt păstrate un an.” Un linter lexical vede două durate incompatibile. Circuitul semantic verifică dacă subiectele sunt identice, dacă scope-urile se suprapun și dacă a doua afirmație este o specializare sau excepție. Dacă `SecurityLogs` este subtip de `Logs`, a doua propoziție poate fi o regulă mai specifică, nu o contradicție.
Circuitul de contradicție cere aceeași proprietate, aceleași condiții relevante, valori incompatibile și absența unei relații de specializare, excepție sau prioritate. În cazul de mai sus, statusul contradicției este `NOT_APPLICABLE`, iar un alt circuit poate emite recomandarea de a formula explicit excepția. Dacă prima propoziție spune „Toate jurnalele, inclusiv jurnalele de securitate, sunt șterse după 30 de zile”, cuantificarea explicită elimină interpretarea compatibilă și rezultatul devine `CONFLICT`.
10.3 Continuitate narativă și instanțiere dinamică
Într-un roman, un personaj lasă telefonul în mașină și îl folosește ulterior într-o cameră de hotel. LongTextJS materializează evenimentele `Leave` și `Use`, actorul, obiectul, locațiile și ordinea narativă. Circuitul `unexplained-object-use` potrivește perechi de evenimente și caută `Retrieve` între ele. Fiecare pereche relevantă instanțiază un subcircuit; nu există un loop hard-coded peste toate combinațiile documentului.
Dacă un eveniment de retrieval este materializat ulterior, într-un snapshot nou, findings dependente de pereche sunt reevaluate și celelalte rezultate sunt reutilizate. Dacă textul nu acoperă complet intervalul narativ sau există o ellipsis explicită, `notExists` produce `UNKNOWN` sau finding euristic, nu o contradicție mecanică. Acest exemplu arată avantajul circuitului dinamic: template-ul rămâne mic, iar runtime-ul creează numai instanțele necesare.
10.4 Consistența unui raport științific
Un raport afirmă în rezumat că metoda îmbunătățește performanța cu 18%, în secțiunea de rezultate raportează 12%, iar tabelul include 0,14 ca diferență relativă. LongTextJS materializează claims, măsuri, metrici, populații, condiții experimentale și anchors. Circuitul nu compară numerele înainte de a verifica dacă metricile, baseline-ul și agregarea sunt aceleași.
Un subcircuit normalizează cantitățile și unitățile; un altul leagă claims de același experiment și outcome; un decision table clasifică diferența ca explicabilă, necunoscută sau conflictuală. Dacă 18% este o reducere relativă și 12 puncte este diferență absolută, circuitul poate produce `NOT_APPLICABLE` pentru contradicție și o recomandare de clarificare terminologică. Dacă toate condițiile sunt identice și valorile rămân incompatibile, finding-ul indică exact cele trei spanuri și normalizările folosite.
Pentru generarea rezumatului, un circuit poate construi un plan semantic din claims verificate și poate cere unui model writer să redacteze. Textul rezultat este reanalizat; orice valoare neancorată sau modificare a modalității devine finding înainte ca rezumatul să fie acceptat.
Tabelul 15. Trasă conceptuală comună exemplelor
Nod de trace	Conținut
O1	Spanul devine claim sau eveniment ancorat.
O2	Ontologia clasifică obiectul și rolurile.
Q1	Pattern-ul selectează claims și evidence.
N1	Normalizează timpul, cantitatea sau identitatea.
Q2	Caută excepții și tranziții în același scope.
S1	Verifică coverage și scope closure.
D1	Tabela decizională produce statusul.
F1	Emite finding-ul cu evidence și trace.
R1	Validează round-trip-ul textului.

11. Validare și criteriul de succes
Validarea nu trebuie să măsoare doar verdictul final. Un circuit poate produce verdictul corect din motive greșite; de aceea benchmark-urile compară structura, evidence, statusul și traseul de derivare.
11.1 Testarea limbajelor și a runtime-ului
OntologyJS este testat prin constructori valizi și invalizi, cardinalități, subtipuri, incompatibilități, lexicalizări și introspecție. LongTextJS este testat prin anchors, mentions, identity candidates, claims, scope, modalitate, alternative și gaps. CircuitJS este testat prin queries, bindings, decision tables, operatori procedurali, compoziție, capability planning, instanțiere canonică și output-uri ontologice.
Testele de incrementalitate modifică un singur fragment și verifică nodurile invalidate, cache hits și identitatea findings neschimbate. Ordinea introducerii facts este permutată pentru a verifica dacă punctul fix este același. Testele de non-monotonicitate verifică faptul că absența rămâne `UNKNOWN` până la closure.
Pentru CNL, fiecare frame este lexicalizat, reanalizat și comparat. Cazurile includ modalități, negații, excepții, termene relative, cuantificatori și coordonări. Pentru generarea model-assisted, testele verifică reanalizarea, claims neautorizate și proveniența sloturilor.
11.2 Benchmark-urile coding agents
Benchmark-ul agentului nu presupune că materializarea și circuitul sunt date. Unele suite pornesc de la `input.md` și cer agentului să genereze întreg proiectul. Rezultatul este evaluat prin executarea codului, compararea expected terms și review semantic. Alte suite fixează LongTextJS și testează numai authoring-ul circuitului, pentru a izola sursa erorii.
Micro-cazurile sunt mici pentru a putea fi validate manual sau de un critic independent. Fiecare regulă are caz normal conform, încălcare clară, excepție validă, excepție incompletă, informație absentă în scope deschis, scope închis, negație, cuantificare, coreferință ambiguă, incompatibilitate ontologică și conflict. Cazurile long-range verifică legături între capitole și compoziții de subcircuite.
Mutation testing este obligatoriu pentru circuitele importante. Eliminarea unei excepții, inversarea unui comparator, promovarea unui claim `proposed`, ignorarea coverage-ului sau unirea a două identități trebuie să fie detectate de suite. Un benchmark care acceptă mutanți semnificativi nu oferă încredere, chiar dacă exemplele originale trec.
Tabelul 16. Metricile de validare
Metrică	Ce măsoară
Rule decision accuracy	Corectitudinea statusului pe micro-cazuri validate.
Evidence precision/recall	Cât de bine output-ul selectează fragmentele care justifică concluzia.
Ontology coverage	Proporția cerințelor circuitelor reprezentabile în snapshot.
Ambiguity preservation	Proporția cazurilor în care alternativele semnificative nu sunt eliminate prematur.
Trace fidelity	Concordanța dintre explicație, bindings, noduri și evidence reală.
Deterministic replay	Identitatea rezultatelor non-model pentru aceleași artefacte și versiuni.
Incremental recomputation	Nodurile reevaluate raportate la subgraful realmente afectat.
Cache reuse	Proporția valorilor pure reutilizate între snapshot-uri sau documente.
CNL round-trip success	Proporția frames lexicalizate și reconstruite echivalent.
Blocked-case correctness	Capacitatea de a opri analiza când ontologia, coverage-ul sau capabilitățile sunt insuficiente.
Mutation score	Proporția mutanților semantici relevanți detectați de benchmark.

11.3 Criteriul de succes al experimentului
Experimentul este reușit dacă poate demonstra un ciclu complet și repetabil. Coding agentul primește reguli, exemple și un document; produce ontologii, LongTextJS și CircuitJS multi-fișier; checker-ele validează termenii și ancorele; runtime-ul materializează SemanticStore; plannerul selectează circuitele; evaluatorul produce findings sau text; trace-ul leagă rezultatul de rules și spans; benchmark-ul detectează mutanți relevanți; un agent independent poate inspecta și repara proiectul.
Nu este necesar ca sistemul să rezolve orice text sau orice regulă. Este necesar să distingă clar succesul de incompatibilitate, necunoscut și conflict. O arhitectură care produce mai puține verdicturi, dar oprește corect cazurile nereprezentabile, este mai valoroasă decât una care completează agresiv golurile și pare universală.
Criteriul tehnic final este că niciun strat nu depinde de forma vechilor JSON-uri. Autorul sau coding agentul lucrează cu constructori, termeni, rules, stages și modules. Circuitul nu interoghează payload-uri; store-ul nu expune array-uri; output-ul nu este un obiect anonim. Semantica trebuie să rămână vizibilă în cod și în trace.
12. Deciziile finale ale arhitecturii
Această secțiune fixează forma consolidată a nllAgent. Ea nu descrie o migrare și nu oferă variante concurente; exprimă deciziile recomandate pentru implementarea experimentului.
OntologyJS este sursa unică a identității semantice. El definește concepte, roluri, relații și constrângeri și generează constructorii folosiți în ambele DSL-uri. Behaviors ontologice sunt limitate la validare, normalizare, indexare și definiții locale; regulile contextuale apar în circuite.
LongTextJS este programul ground al documentului. El este cod `.mjs` multi-fișier, ancorat în sursă, cu claims, alternative, identity candidates, timp, scope, coverage și gaps. El nu produce verdicturi și nu introduce concepte derivate ca observații.
CircuitJS este limbajul regulilor și al transformărilor. Nucleul său este un circuit semantic dinamic și ierarhic, cu template-uri, instanțe, valori imutabile, capabilități și expansiune. Reguli și tabele decizionale sunt inspectabile fin; etapele procedurale sunt funcții JavaScript complete, instrumentate la granița SemanticStore. Graful de execuție este o reprezentare runtime, nu formatul pe care agents îl scriu manual.
SemanticStore este un singur model logic. Termenii, claims, contexts, evidence și provenance formează un graf tipat; indecșii sunt ascunși. Query algebra este suficient de acoperitoare pentru circuite, iar runtime-ul poate schimba implementarea fizică fără a modifica DSL-urile.
Plannerul combină backward chaining pe `requires/provides` cu activarea forward a instanțelor. Runtime-ul evaluează prin agendă, cache și epochs. Absența cere scope închis; alternativele sunt păstrate; model calls sunt trasate și înghețate; outputs au status și assurance.
Generarea controlată produce mai întâi CNLFrames și folosește round-trip. Generarea model-assisted este permisă pentru texte mai ample, dar rămâne distinctă și este reanalizată.
Coding agents construiesc întregul proiect prin skill-uri specializate și pot crea oricâte fișiere sunt necesare. Tool-urile de inspectare și benchmark-urile sunt parte din procesul de compilare, nu activități opționale de după implementare.
Tabelul 17. Responsabilitățile definitive ale componentelor
Strat	Responsabilitate finală
OntologyJS	Definește semnătura, constructorii, validarea locală și informația pentru planning.
LongTextJS	Materializează documentul ca termeni ground, claims, contexts, alternatives, coverage și gaps.
SemanticStore	Păstrează modelul logic unic și oferă query/update algebra; ascunde structurile fizice.
CircuitJS	Implementează reguli, tabele decizionale, algoritmi, subcircuite, generare și verificare.
Capability planner	Selectează lanțurile necesare pentru ținta semantică și solicită capabilitățile lipsă.
Dynamic evaluator	Instanțiază, evaluează, extinde, cache-uiește și stabilizează graful de execuție.
Trace and output	Păstrează proveniența și tipărește rezultate structurate `.mjs` și rapoarte Markdown.
Coding-agent skills	Generează și repară proiectele multi-fișier prin feedback executabil.

Concluzie
nllAgent devine realist atunci când renunță la ideea că o structură JSON amplă este un limbaj și la ideea opusă că un singur apel LLM poate substitui programarea semantică. Ontologia trebuie să fie cod executabil care definește constructori și constrângeri. LongTextJS trebuie să fie un program al documentului, nu o serializare. CircuitJS trebuie să fie suficient de formal pentru query, compoziție și trace, dar suficient de puternic pentru algoritmi JavaScript reali.
Contribuția conceptuală principală este circuitul semantic dinamic și ierarhic. Programul poate crește prin instanțiere pe match-uri și prin cereri de capabilitate, păstrând valori imutabile și caching structural. În același timp, complexitatea internă a unui algoritm nu este forțată într-un graf decorativ. Granița semantică este explicită: termeni și bindings intră în operator, termeni și outputs ies, iar trace-ul păstrează relația cu sursa.
Această arhitectură nu garantează că un coding agent va interpreta corect orice regulă sau document. Ea garantează însă că interpretarea devine software inspectabil și reparabil. Exact aceasta este ipoteza pe care experimentul trebuie să o testeze: poate un agent să transforme limbajul natural în ontologii, materializări și circuite suficient de clare pentru a fi validate, compuse și reutilizate? Documentul definește o bază pe care răspunsul poate fi măsurat fără a confunda un JSON redenumit cu un DSL și fără a confunda fluiditatea unui LLM cu o semantică executabilă.
Anexa A. Semantica operațională de referință
Această anexă fixează sensul implementabil al termenilor, pattern-urilor și circuitelor. Formalizarea este intenționat limitată la proprietățile de care runtime-ul are nevoie; nu încearcă să transforme întregul limbaj natural într-un calcul logic complet.
A.1 Semnătura și termenii
O ontologie sigilată definește o semnătură `Σ`. Semnătura conține sorturi, constructori, roluri, relații, subtipuri și constrângeri. Pentru fiecare constructor, runtime-ul cunoaște sortul rezultat și rolurile admise. Un termen ground este o aplicare finită a unui constructor la valori ground. Un pattern este aceeași structură, dar poate conține variabile tipate și condiții.
Reprezentarea canonică a unui termen include identitatea conceptului, rolurile în ordinea lor canonică, contextul și, unde este relevant, un identificator explicit. Numele variabilei JavaScript nu participă la identitate. Două expresii construite în fișiere diferite pot reprezenta același termen numai dacă politica de identitate a conceptului permite acest lucru. Entitățile și evenimentele ancorate folosesc de regulă identificatori expliciți; valori și termeni derivați pot folosi identitate structurală.
Colecțiile au semantică distinctă. `sequence` păstrează ordinea și duplicatele; `setOf` elimină duplicatele după identitatea semantică; `allOf` reprezintă conjuncție; `anyOf` reprezintă disjuncție; `alternatives` reprezintă contexte incompatibile și nu trebuie confundat cu un set obișnuit. Array-urile JavaScript pot fi folosite intern, dar când o colecție intră în SemanticStore trebuie convertită într-un tip semantic cunoscut.
Tabelul A1. Valorile expuse de DSL și runtime
Tip de valoare	Semantica publică
`Term`	Instanță ontologică ground cu concept, roluri, identitate, context și provenance.
`Pattern`	Structură ontologică ce poate conține variabile și predicates de filtrare.
`Variable`	Placeholder tipat cu scope lexical în regulă sau query.
`Binding`	Mapare imuabilă de la variabile la termeni compatibili.
`Claim`	Afirmație despre o proposition, legată de source, context și status epistemic.
`ValueRef`	Referință SSA la o valoare produsă de un node.
`TermSet`	Mulțime semantică deduplicată, cu context și policy de evidență.
`BindingSet`	Colecție de bindings produsă de un query sau match.
`StatusValue`	Valoare semantică multivaluată sau status de regulă.
`Artifact`	Rezultat extern înghețat: model output, tool output sau fișier, cu provenance.

A.2 Evaluarea LongTextJS
Evaluarea unui program LongTextJS se face într-un `OntologyEnvironment` și într-un `SourceEnvironment`. Programul produce termeni, claims, contexts, coverage declarations și gaps. Runtime-ul verifică anchors, referințe, sorturi și cardinalități și apoi publică rezultatul în straturile source și observation ale store-ului.
Semantic, evaluarea poate fi citită astfel: un program `P`, o ontologie `O` și o revizie `R` produc un snapshot `S` și un set de diagnostics `D`. Dacă există erori structurale, snapshot-ul nu este sigilat. Gaps și alternativele nu sunt erori; ele sunt rezultate semantice acceptate. Această distincție permite programului să fie incomplet fără a fi invalid.
Un helper JavaScript poate genera sute de termeni. Pentru runtime, important este numai rezultatul constructorilor și ordinea publication. Source-level control flow nu are semantică proprie în LongTextJS. De aceea, două programe diferite care produc același snapshot canonic sunt semantic echivalente pentru circuite, chiar dacă stilul codului diferă.
Exemplul A1. Contractul operațional al evaluării LongTextJS
const result = evaluateLongText(
  longTextProgram,
  ontologyEnvironment,
  sourceRevision
);

if (result.hasStructuralErrors()) {
  throw new LongTextCompilationError(
    result.diagnostics
  );
}

const snapshot = semanticStore.publishObservationLayer(
  result.terms,
  result.claims,
  result.contexts,
  result.coverage,
  result.gaps
);
A.3 Evaluarea CircuitJS și matching-ul
Un pattern se potrivește cu un termen dacă identitatea conceptului este egală sau subtip compatibil, fiecare rol ground este satisfăcut și fiecare variabilă poate fi legată fără conflict. Unificarea respectă contextul, identity policy și evidence policy. Un claim dintr-o alternativă nu poate satisface un pattern din world-ul principal decât dacă query-ul cere explicit agregarea sau traversarea contextului.
O regulă este evaluată asupra unui BindingSet. Condițiile pot elimina bindings, pot produce valori multivaluate sau pot suspenda evaluarea pentru capabilități lipsă. Acțiunile primesc numai bindings care au trecut condițiile. `derive` publică terms în stratul derived; `emit` publică output-uri. `instantiateEach` aplică un template fiecărui binding canonic și produce instanțe independente.
Un circuit procedural are semantica unei transformări instrumentate: primește un store snapshot și un execution context și produce derivări, outputs, expansion requests și trace. Nu are voie să returneze arbitrar un obiect care devine semantic. Contextul acceptă numai valori recunoscute sau artifacts explicit înregistrate.
Exemplul A2. Semantica externă a unui CircuitProgram
CircuitProgram:
  SemanticStore × ExecutionContext
    → SemanticDelta
      × OutputSet
      × ExpansionRequestSet
      × Trace

SemanticDelta:
  sequence(
    derivedTerms(...),
    coverageChanges(...),
    interpretationUpdates(...)
  )
A.4 Algebra valorilor multivaluate
Runtime-ul folosește o logică cu patru valori pentru predicates: `TRUE`, `FALSE`, `UNKNOWN` și `CONFLICT`. `UNKNOWN` înseamnă lipsă de informație suficientă; `CONFLICT` înseamnă suport simultan pentru valori incompatibile. Operatorii trebuie să fie definiți explicit și să nu delegheze această alegere LLM-ului.
Conjuncția poate scurtcircuita pe `FALSE`, deoarece o condiție falsă este suficientă pentru a respinge un `allOf`. `TRUE AND UNKNOWN` rămâne `UNKNOWN`. Disjuncția poate scurtcircuita pe `TRUE`. `NOT UNKNOWN` rămâne `UNKNOWN`, iar `NOT CONFLICT` rămâne `CONFLICT`. Aceste reguli sunt simple, dar trebuie păstrate în runtime și în decision tables.
Statusurile de regulă sunt un strat superior. `NOT_APPLICABLE` nu este `FALSE`, iar `BLOCKED_ONTOLOGY` nu este `UNKNOWN`. Circuitul mapează explicit valorile predicates și starea execuției la statusul final.
Tabelul A2. Reguli operaționale pentru valorile multivaluate
Operator sau situație	Rezultat recomandat
`TRUE AND UNKNOWN`	`UNKNOWN`
`FALSE AND UNKNOWN`	`FALSE`
`TRUE OR UNKNOWN`	`TRUE`
`FALSE OR UNKNOWN`	`UNKNOWN`
`NOT UNKNOWN`	`UNKNOWN`
`NOT CONFLICT`	`CONFLICT`
Match absent în scope deschis	`UNKNOWN`
Match absent în scope închis	`FALSE` pentru `exists`, `TRUE` pentru `notExists`.
Suport și refutare admise simultan	`CONFLICT`

Anexa B. Specificația API-urilor publice
Tabelele următoare fixează suprafața minimă a implementării. Numele pot fi ajustate în cod, dar responsabilitățile trebuie păstrate; altfel DSL-urile riscă să redevină simple obiecte de configurare.
B.1 API OntologyJS
Tabelul B1. API-ul OntologyJS
Primitivă	Contract
`ontology(id, ...extensions)`	Creează un namespace versionat și importă identitățile ontologiilor extinse.
`O.sort(name)`	Definește o categorie fundamentală pentru type checking.
`O.entity(name)`	Definește un constructor de entități cu identity policy configurabilă.
`O.event(name, ...constraints)`	Definește un constructor de eveniment și rolurile admise.
`O.state(name, ...constraints)`	Definește o stare valabilă într-un interval sau context.
`O.relation(name, ...constraints)`	Definește o relație tipată independentă de un event constructor.
`O.role(name, from(...), to(...), cardinality)`	Definește o muchie tipată și cardinalitatea ei.
`O.valueType(name, normalizer)`	Definește valori controlate și o reprezentare canonică.
`O.subtype(child, parent)`	Adaugă relația de subtip și actualizează closure-ul.
`O.disjoint(a, b)`	Declară concepte incompatibile.
`O.lexicalize(concept, ...forms)`	Asociază forme canonice și sinonime folosite de materializare și CNL.
`O.behavior(concept, behavior)`	Leagă validator, normalizer, indexer sau view definitional; nu reguli defeasible.
`O.derivedConcept(name)`	Definește un concept produs de circuite, nu observat direct.
`O.seal()`	Închide ontologia, verifică conflictele și produce environment introspectabil.

B.2 API LongTextJS
Tabelul B2. API-ul LongTextJS
Primitivă	Contract
`longTextProgram(id, ...units)`	Compune modulele unui document într-un program executabil.
`source(file, revision, hash)`	Declară sursa versionată și politica de verificare.
`span(source, start, end)`	Creează un anchor half-open validat față de sursă.
`semanticUnit(id, ...terms)`	Grupează termeni și claims locali fără a crea scope implicit neclar.
`claim(content, ...qualifiers)`	Leagă o proposition de source, context, status, producer și evidence.
`explicit / inferred / proposed / verified`	Declară originea epistemică a interpretării.
`mention(span, lexicalForm)`	Reprezintă o apariție textuală, distinctă de entitate.
`resolvesTo / identityCandidate`	Leagă mentions de entities cu status și confidence.
`within(context, ...terms)`	Plasează termeni într-un scope, world, speaker sau hypothesis.
`alternatives(...interpretations)`	Definește ramuri incompatibile care partajează fapte comune.
`coverage(concept, scope)`	Declară completitudinea materializării pentru o relație sau un concept.
`gap(kind, ...evidence)`	Înregistrează o limită ontologică, de coverage sau rezoluție.
`include(module)`	Compune programe multi-fișier fără manifest paralel.

B.3 API CircuitJS
Tabelul B3. API-ul CircuitJS
Primitivă	Contract
`circuit(id, ...parts)`	Definește template-ul principal și compune contracts, rules, stages și schedule.
`rule(id, when(...), then(...))`	Definește o regulă inspectabilă cu variabile și acțiuni.
`decisionTable(id, columns(...), ...rows)`	Definește o decizie tabulară cu hit policy și valori multivaluate.
`stage(id, function)`	Înregistrează o funcție JavaScript ca macro-nod instrumentat.
`template(id, circuit)`	Definește un subcircuit parametrizat și instanțiabil.
`variable(concept, name)`	Creează o variabilă tipată pentru patterns.
`match(termPattern)`	Creează un query pattern peste constructorii ontologici.
`where(predicate)`	Adaugă o condiție evaluată asupra binding-ului.
`notExists(pattern, scope, coveragePolicy)`	Verifică absența numai cu politica de closure explicită.
`derive(term)`	Propune un fapt derivat cu provenance automat.
`emit(output)`	Propune un finding, plan, patch, generated document sau CNLFrame.
`instantiateEach(bindings, template)`	Creează o instanță canonică pentru fiecare binding.
`requestCapability(capability)`	Solicită plannerului o extensie a grafului.
`include / schedule / parallel`	Compune subcircuite și relații de ordine.
`requires / provides / guarantee`	Definește contractul de capabilitate al circuitului.

B.4 API SemanticStore și Query
Tabelul B4. API-ul SemanticStore
Metodă	Contract
`instancesOf(concept, options)`	Returnează termeni ai conceptului sau subtipurilor, în contextul și evidence policy selectate.
`query(patternOrQuery)`	Execută un query și produce terms, bindings sau StatusValue.
`get(termId)`	Returnează termenul opac și metadata publică, nu structurile interne.
`claimsAbout(proposition)`	Returnează claims relevante cu contexts și statuses.
`evidenceFor(termOrOutput)`	Returnează anchors și provenance transitive.
`contextsOf(term)`	Returnează worlds, alternatives și scopes în care termenul este valid.
`temporalRelation(a, b, mode)`	Răspunde cu relația explicită, entailed sau compatible.
`identityCandidates(mention)`	Returnează ipotezele de coreferință fără unire implicită.
`coverageFor(concept, scope)`	Returnează complet, parțial, necunoscut sau conflictual.
`beginTransaction(node)`	Creează bufferul atomic pentru derivări și outputs.
`commit(transaction)`	Validează și publică delta semantică.
`snapshot()`	Returnează identitatea imuabilă a stării curente.

B.5 API ExecutionContext
Tabelul B5. API-ul ExecutionContext
Metodă	Contract
`ctx.query(...)`	Execută query-uri instrumentate și adaugă dependențele în trace.
`ctx.derive(term)`	Adaugă un termen în transaction buffer și atașează provenance.
`ctx.emit(output)`	Adaugă un output ontologic în buffer.
`ctx.verify(id, verifier)`	Rulează un verifier și produce Verification cu witness.
`ctx.runSubcircuit(circuit, inputs)`	Instanțiază și așteaptă un subcircuit.
`ctx.requestCapability(capability)`	Creează o cerere către planner.
`ctx.callTool(id, ...inputs)`	Apelează un tool injectat și capturează artifactul și metadata.
`ctx.callModel(id, ...inputs)`	Apelează un model și păstrează promptul, versiunea și output-ul brut.
`ctx.iterateUntilStable(id, fn)`	Rulează o buclă instrumentată până la fixpoint sau blocaj.
`ctx.task(id, fn)`	Expune un subpas relevant ca node copil în trace.
`ctx.checkpoint(value)`	Publică un artifact intermediar reutilizabil.
`ctx.assurance(level)`	Atașează nivelul epistemic output-urilor.

Anexa C. Pattern-uri canonice de circuit
Pattern-urile următoare nu limitează CircuitJS; ele oferă forme recognoscibile pe care coding agents le pot reutiliza și pe care runtime-ul le poate explica și optimiza.
C.1 Instanțiere per match și agregare
Pattern-ul cel mai comun pornește de la un query global, instanțiază un subcircuit pentru fiecare binding și agregă rezultatele. Template-ul de evaluare rămâne mic, iar graful materializat conține numai instanțele relevante. Identitatea instanței este hash-ul template-ului, binding-ului și contextului.
Exemplul C1. Instanțierea unui subcircuit pentru fiecare candidat
const candidates = query(
  match(
    Retain(
      actor(controller),
      objectRole(data),
      duration(retentionDuration)
    )
  )
);

const assessments = instantiateEach(
  candidates,
  retentionAssessmentTemplate
);

const summary = aggregate(
  assessments,
  byStatusAndAuthority()
);
C.2 Closure recursivă și fixpoint
Pentru dependențe, reachability sau reguli recursive, un operator poate folosi `iterateUntilStable`. Fiecare derivare nouă este deduplicată de store, iar bucla se oprește când nu mai apar facts. Runtime-ul înregistrează numărul de iterații și poate reutiliza closure-ul dacă intrările nu s-au schimbat.
Exemplul C2. Closure recursivă cu trace și deduplicare
await ctx.iterateUntilStable(
  "dependency-closure",
  async () => {
    let changed = false;

    for (const [a, b] of ctx.query(
      match(DependsOn($a, $b))
    )) {
      for (const [, c] of ctx.query(
        match(DependsOn(b, $c))
      )) {
        changed ||= ctx.deriveIfNew(
          DependsOn(a, c)
        );
      }
    }

    return changed;
  }
);
C.3 Paralelism cu merge determinist
Subcircuitele independente pot rula în paralel, dar outputs sunt publicate prin transactions separate și apoi reunite canonic. O analiză juridică poate calcula deadline-ul și excepțiile simultan, deoarece ambele citesc același incident și nu scriu același concept derivat. Circuitul de decizie pornește numai după commit-ul ambelor.
Exemplul C3. Etape paralele și decizie după merge
export default circuit(
  "incident.assessment@1",

  include(
    determineApplicableAuthority,
    calculateDeadline,
    evaluateExceptions,
    decideCompliance
  ),

  schedule(
    beforeStage(
      determineApplicableAuthority,
      calculateDeadline,
      evaluateExceptions
    ),
    parallel(
      calculateDeadline,
      evaluateExceptions
    ),
    afterStage(
      decideCompliance,
      calculateDeadline,
      evaluateExceptions
    )
  )
);
C.4 Circuit model-assisted cu artifact înghețat
Un apel de model nu trebuie să fie un side effect invizibil. Circuitul construiește promptul din termeni și evidence, înregistrează request-ul, capturează output-ul ca Artifact și îl trimite unui validator. Numai artifactul acceptat este transformat în claim sau GeneratedDocument.
Exemplul C4. Model call explicit și acceptare prin subcircuit
const artifact = await ctx.callModel(
  "rule-interpreter",
  promptFrom(authorityText, examples),
  requireStructuredCode("CircuitJS")
);

const review = await ctx.runSubcircuit(
  reviewGeneratedCircuit,
  inputArtifact(artifact)
);

if (review.status === ACCEPTED) {
  ctx.emit(
    AcceptedCodeArtifact(
      sourceModule(artifact.file),
      reviewedBy(review.verification)
    )
  );
} else {
  ctx.emit(
    RejectedCodeArtifact(
      sourceModule(artifact.file),
      findings(review.findings)
    )
  );
}
C.5 Circuit care solicită o capabilitate lipsă
Când un circuit descoperă că un deadline este exprimat relativ la un eveniment nerezolvat, el nu trebuie să improvizeze. Poate solicita `TemporalAnchorResolution`. Plannerul caută un circuit sau tool care produce capabilitatea, îl instanțiază și reia nodul blocat după commit.
Exemplul C5. Plannerul extinde circuitul la cerere
const start = resolveStartInstant(obligation, ctx.store);
if (!start) {
  const resolution = await ctx.requestCapability(
    TemporalAnchorResolution(
      subject(obligation), within(obligationScope(obligation))
    )
  );
  if (!resolution.available)
    return ctx.emit(blocked("missing-temporal-anchor", obligation));
}
Anexa D. Specificația implementabilă a skill-urilor
Skill-urile trebuie să poată fi transpuse direct într-un harness de coding agents. Fiecare skill are o structură fixă, dar permite agentului să creeze și să modifice oricâte fișiere sunt necesare.
D.1 Structura unui `SKILL.md`
Un skill conține: scop, intrări obligatorii, artefacte existente care trebuie inspectate, output-uri, tool-uri permise, instrucțiuni normative, workflow executabil, diagnostics care trebuie tratate, criteriu de finalizare și reguli de handoff. El nu trebuie să includă un prompt monolitic; trebuie să descrie o buclă de lucru asupra repository-ului.
Agentul poate opri skill-ul numai în două situații: toate criteriile sunt satisfăcute sau există un blocker explicit reprezentat printr-un diagnostic și evidence. „Pare suficient” nu este un criteriu. Un skill poate delega subtask-uri, dar agentul principal verifică imports, integrarea și benchmark-ul final.
Exemplul D1. Scheletul unui skill executabil
# Skill: nll-author-circuits

## Goal
Transform authority rules and calibration examples into
an executable multi-file CircuitJS project.

## Required inputs
- authority Markdown files and spans
- active ontology modules
- calibration LongText programs
- existing benchmarks and traces

## Required outputs
- rules/*.rule.mjs
- stages/*.stage.mjs
- operators/*.operator.mjs
- templates/*.circuit.mjs
- index.circuit.mjs
- README.md
- tests and benchmark updates

## Mandatory workflow
1. Inspect ontology and calibration stores.
2. Write premise queries for each rule.
3. Choose rule, decisionTable, stage, or composition.
4. Implement authority, evidence, exceptions, status.
5. Run circuit.check and circuit.run.
6. Inspect trace for every emitted output.
7. Run benchmark and mutation suite.
8. Repair the correct layer and repeat.

## Completion gate
All applicable rules have an executable path; outputs carry
evidence and assurance; benchmarks pass; relevant mutants fail.
D.2 Decompoziția multi-agent și ownership-ul fișierelor
Pentru documente și teorii lungi, orchestratorul poate delega pe secțiuni sau familii de reguli. Un ontology agent deține namespace-urile și aprobă schimbările de semnătură. LongText agents dețin modulele de secțiune, dar nu modifică independent identity registry-ul fără review. Circuit agents dețin familii de reguli și pot propune extensii ontologice. Benchmark agentul nu modifică expected outputs pentru a face codul să treacă. Review agentul are dreptul să modifice orice strat, dar trebuie să documenteze motivul.
Handoff-ul se face prin repository și diagnostics, nu prin rezumate informale. Un subagent trebuie să lase cod, teste, note și comenzile rulate. Agentul integrator verifică modulele împreună și rezolvă conflictele de imports și identitate.
Tabelul D1. Decompoziția recomandată a coding agents
Rol de agent	Ownership și responsabilitate
Ontology agent	Namespace-uri, concepte, roluri, constraints, lexicalizări și tests. Aprobă identitățile comune.
LongText section agent	Materializarea unei secțiuni și anchors; nu emite findings și nu unește identități globale fără review.
Identity/timeline agent	Coreferințe cross-section, contexts și relații temporale globale.
Circuit family agent	Rules, stages, templates, capability contracts, outputs și local benchmarks.
CNL agent	Frames, lexicon, grammar, parser, comparator și round-trip tests.
Benchmark agent	Micro-cazuri, expected terms, mutants și metrics; independent de implementarea circuitului.
Integration agent	`agent.mjs`, imports, tool/model adapters și end-to-end run.
Review agent	Caută erori de categorie, inspectează trace și repară stratul corect.

D.3 Bucla de diagnostic și repair
Diagnostics trebuie să fie suficient de precise pentru repair automat. Fiecare diagnostic conține cod, fișier, linie, concept, rol, expected, received, authority span și un hint de strat. De exemplu, `RoleTypeMismatch` indică un bug LongText sau ontology; `AbsenceWithoutCoverage` indică un bug de circuit; `UnsatisfiedCapability` poate cere materializare ori un nou subcircuit.
Agentul nu trebuie să repare simptomul la nivelul cel mai apropiat. Dacă circuitul nu găsește actorul deoarece ontologia nu are rolul necesar, adăugarea unui string matcher în operator este o reparație greșită. Review skill-ul clasifică erorile în ontology, materialization, rule, runtime, CNL sau benchmark și modifică stratul cu autoritate.
Anexa E. Compatibilitate și diagnostics
Fail-closed semantic este util numai dacă blocker-ele sunt explicabile și reparabile. Compatibilitatea trebuie calculată pe mai multe dimensiuni și raportată prin coduri precise.
E.1 Raportul de compatibilitate
Înainte de instanțiere, plannerul compară SemanticDemand cu snapshot-ul și registry-ul. Raportul include concepte și roluri disponibile, operații suportate, coverage, contexts, evidence policies, tools, models și dialecte. Compatibilitatea poate fi completă pentru o regulă și insuficientă pentru alta; blocarea este locală, nu globală.
Un report complet este persistat ca `.mjs` și poate fi importat de skill-ul de repair. El nu spune doar „lipsește conceptul X”, ci arată ce pattern sau stage l-a cerut și ce fragmente au sugerat că noțiunea este relevantă.
Exemplul E1. Raport de compatibilitate persistent
export default compatibilityReport(
  snapshot("document-17@r3"),
  circuit("privacy.transfer@2"),

  satisfied(
    concept(TransferEvent),
    role(recipient),
    capability(IdentityResolution)
  ),

  missing(
    capability(LegalBasisClassification),
    requestedBy(
      ruleRef("external-transfer-legal-basis")
    ),
    evidence(
      spanRef("section-4", 112, 189)
    )
  ),

  coverageUnknown(
    concept(LegalBasisClaim),
    within(documentScope())
  )
);
E.2 Coduri de diagnostic recomandate
Tabelul E1. Diagnostics principale
Cod	Semnificație și strat recomandat pentru repair
`ONT-E001 DuplicateConceptIdentity`	Două module definesc aceeași identitate calificată incompatibil. Repair în OntologyJS.
`ONT-E020 HiddenRuleBehavior`	Un behavior ontologic pare să implementeze o regulă contextuală. Mutare în CircuitJS.
`LTJ-E104 RoleTypeMismatch`	Un constructor primește un termen cu sort incompatibil. Repair în LongText sau ontologie.
`LTJ-E210 InvalidAnchor`	Spanul, excerpt-ul sau revizia nu corespunde sursei. Repair în LongText source grounding.
`LTJ-W240 UnresolvedIdentity`	Mențiunea nu are o identitate robustă; poate rămâne alternative sau gap.
`CIR-E301 UnboundVariable`	O acțiune sau condiție folosește o variabilă nelegată în `when`.
`CIR-E330 AbsenceWithoutCoverage`	Verdictul depinde de `notExists`, dar scope closure lipsește.
`CIR-E350 OutputWithoutEvidence`	Finding-ul nu are source evidence sau derivare admisă.
`PLAN-E410 UnsatisfiedCapability`	Nu există lanț de circuite sau tool-uri care să producă o cerință.
`RUN-E501 DuplicateInstantiation`	Aceeași cheie template–binding–context a fost instanțiată de două ori.
`RUN-E520 TransactionInvariantFailure`	Delta semantică a operatorului nu poate fi committed.
`RUN-E540 NonDeterministicPureNode`	Un node declarat pure produce rezultate diferite la replay.
`CNL-E610 RoundTripMismatch`	Textul reanalizat schimbă modalitatea, actorul, timpul, negația sau excepția.
`BEN-E720 SurvivingSemanticMutant`	Benchmark-ul nu detectează o mutație relevantă a regulii.

E.3 Regula de oprire și continuare parțială
Un blocker nu trebuie să oprească toate circuitele dacă dependențele sunt independente. Dacă ontologia nu poate reprezenta o bază juridică, regula de transfer este blocată, dar un linter de terminologie poate continua. Plannerul marchează subgraful dependent și agregatorul produce un raport care separă findings finalizate de reguli blocate.
Continuarea parțială nu permite însă transformarea unui rezultat local în verdict global. Un `ComplianceSummary` este `BLOCKED` dacă orice regulă obligatorie nu a fost evaluată, chiar dacă alte findings sunt valide. API-ul de output trebuie să distingă `partialResults` de `finalAssessment`.
Referințe conceptuale
Cheie	Referință
[ACA05]	Acar, U. A. Self-Adjusting Computation. PhD thesis, Carnegie Mellon University, 2005.
[AHV95]	Abiteboul, S., Hull, R., Vianu, V. Foundations of Databases. Addison-Wesley, 1995.
[ALL83]	Allen, J. F. Maintaining knowledge about temporal intervals. Communications of the ACM, 26(11), 1983.
[BEL77]	Belnap, N. D. A Useful Four-Valued Logic. In Modern Uses of Multiple-Valued Logic, 1977.
[BN98]	Baader, F., Nipkow, T. Term Rewriting and All That. Cambridge University Press, 1998.
[CAR09]	Carette, J., Kiselyov, O., Shan, C. Finally tagless, partially evaluated: Tagless staged interpreters for simpler typed languages. Journal of Functional Programming, 2009.
[CYC91]	Cytron, R. et al. Efficiently Computing Static Single Assignment Form and the Control Dependence Graph. ACM TOPLAS, 1991.
[DAV67]	Davidson, D. The Logical Form of Action Sentences. In The Logic of Decision and Action, 1967.
[FIL82]	Fillmore, C. J. Frame Semantics. In Linguistics in the Morning Calm, 1982.
[FOR82]	Forgy, C. Rete: A Fast Algorithm for the Many Pattern/Many Object Pattern Match Problem. Artificial Intelligence, 1982.
[FOW10]	Fowler, M. Domain-Specific Languages. Addison-Wesley, 2010.
[GRU93]	Gruber, T. R. A Translation Approach to Portable Ontology Specifications. Knowledge Acquisition, 1993.
[HAM14]	Hammer, M. A. et al. Adapton: Composable, Demand-Driven Incremental Computation. PLDI, 2014.
[KAM93]	Kamp, H., Reyle, U. From Discourse to Logic. Kluwer Academic Publishers, 1993.
[KNU68]	Knuth, D. E. Semantics of Context-Free Languages. Mathematical Systems Theory, 1968.
[KUH14]	Kuhn, T. A Survey and Classification of Controlled Natural Languages. Computational Linguistics, 2014.
[OLI12]	Oliveira, B. C. d. S., Cook, W. R. Extensibility for the Masses: Practical Extensibility with Object Algebras. ECOOP, 2012.
[PAR90]	Parsons, T. Events in the Semantics of English. MIT Press, 1990.

Probleme rămase deschise care necesită o decizie experimentală
Majoritatea contradicțiilor dintre variantele de arhitectură au fost închise în favoarea unui circuit dinamic ierarhic și a unui JavaScript complet la nivel de operator. Următoarele probleme nu pot fi rezolvate credibil numai prin formulare; ele cer prototipuri și benchmark-uri.
Tabelul 18. Problemele deschise care merită decizie comună
Problemă	Decizia provizorie și ceea ce trebuie verificat
1. Identitatea canonică a termenilor între module și snapshot-uri	Recomandarea este un model hibrid: identificatori expliciți pentru entități și evenimente ancorate în sursă, canonicalizare structurală pentru termeni derivați. Trebuie măsurat cât de des canonicalizarea structurală unește termeni care ar trebui să rămână distincți și cât de stabilă este identitatea după editări locale.
2. Frontiera dintre behavior ontologic și regulă CircuitJS	Decizia recomandată este ca ontologia să conțină numai definiții locale, validare, normalizare și views deductive necontroversate. Trebuie totuși construit un checker care detectează când un behavior începe să ascundă o regulă contextuală; criteriul exact nu este încă demonstrat.
3. Controlul exploziei interpretărilor și al coreferințelor	Alternativele trebuie păstrate, dar evaluarea tuturor combinațiilor poate deveni impracticabilă. Recomandarea este evaluare lazy, contexts partajate și pruning numai pe baza incompatibilităților demonstrate. Strategia de agregare care păstrează corect findings robuste fără explozie combinatorială trebuie testată.
4. Replay și cache pentru apeluri de model	Output-ul acceptat al modelului trebuie înghețat ca artefact `.mjs` și folosit la replay. Rămâne de decis în ce condiții un rezultat de model poate fi reutilizat între documente sau versiuni fără a ascunde dependențe de prompt, model și context.
5. Echivalența semantică a CNLFrame	Pentru nucleul normativ, comparatorul trebuie să ceară echivalență exactă a modalității, actorilor, negației, timpului și excepțiilor. Rămâne de stabilit câtă variație lexicală și structurală poate fi permisă fără a slăbi garanția de round-trip și cum se extinde aceeași idee la alte limbi.

Aceste cinci probleme nu schimbă arhitectura de bază. Ele afectează identitatea, extensibilitatea și eficiența implementării și trebuie tratate prin experimente izolate. Restul deciziilor din document sunt suficient de clare pentru a începe implementarea directă a noului nllAgent.

