import ambiguousCase from './ambiguous/case.mjs';
import ambiguousExpected from './ambiguous/expected.mjs';
import closedCase from './closed-gap/case.mjs';
import closedExpected from './closed-gap/expected.mjs';
import conflictCase from './coverage-conflict/case.mjs';
import conflictExpected from './coverage-conflict/expected.mjs';
import actorCase from './different-actor/case.mjs';
import actorExpected from './different-actor/expected.mjs';
import noLeaveCase from './no-leave/case.mjs';
import noLeaveExpected from './no-leave/expected.mjs';
import openCase from './open-gap/case.mjs';
import openExpected from './open-gap/expected.mjs';
import retrievedCase from './retrieved/case.mjs';
import retrievedExpected from './retrieved/expected.mjs';
import reverseCase from './reverse-order/case.mjs';
import reverseExpected from './reverse-order/expected.mjs';
import { benchmarkEntry, narrativeBenchmarkSuite } from './expectation.mjs';

export default narrativeBenchmarkSuite(
  'narrative.continuity@1',
  benchmarkEntry(closedCase, closedExpected),
  benchmarkEntry(retrievedCase, retrievedExpected),
  benchmarkEntry(openCase, openExpected),
  benchmarkEntry(ambiguousCase, ambiguousExpected),
  benchmarkEntry(conflictCase, conflictExpected),
  benchmarkEntry(reverseCase, reverseExpected),
  benchmarkEntry(noLeaveCase, noLeaveExpected),
  benchmarkEntry(actorCase, actorExpected)
);
