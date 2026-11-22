import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isAlphabetSequenceUnambiguous,
  isArithmeticSequenceUnambiguous,
  isRepeatingCycleUnambiguous,
  validateCreationSequence,
  validateQuestionAnswer,
} from './mathValidator';
import {
  CURATED_QUESTIONS,
  generateAlphabetQuestion,
  generateArithmeticQuestion,
  generateCreationQuestion,
  generateErrorDetectionQuestion,
  generateMockAssessmentSet,
  generateRepeatingPatternQuestion,
  generateRhythmQuestion,
  generateVisualAttributeQuestion,
  getHotspotQuestion,
} from './questionBank';
import {
  createInitialCompetencyStats,
  createInitialCreationStats,
  evaluateCompetencyReadiness,
  recordAttemptIntoProgress,
} from './adaptiveEngine';
import { resetAndRefreshQuest } from '../storage/progressStore';
import type { PlayerProgress, Question } from '../types/game';

function makeBlankProgress(): PlayerProgress {
  return {
    version: 1,
    playerName: 'Maya',
    unlockedAreas: ['counting_grove'],
    completedHotspots: [],
    collectedRelics: [],
    diagnosticCompleted: false,
    completedDays: [],
    attempts: [],
    competencyStats: createInitialCompetencyStats(),
    creationStats: createInitialCreationStats(),
    mockTestResults: [],
    remediationQueue: [],
    customQuestions: [],
    audioSettings: { muted: false, musicVolume: 0.4, sfxVolume: 0.7 },
    lastPlayedAt: Date.now(),
  };
}

test('generates unambiguous increasing and decreasing arithmetic sequences', () => {
  let sawIncreasing = false;
  let sawDecreasing = false;

  for (let seed = 1; seed <= 40; seed++) {
    const q = generateArithmeticQuestion(2, seed, 'next_term');
    assert.equal(q.sequence.length, 5);
    const nums = q.sequence.slice(0, 4).map((s) => Number(s.value));
    const diffs = [nums[1] - nums[0], nums[2] - nums[1], nums[3] - nums[2]];
    assert.equal(diffs[0], diffs[1]);
    assert.equal(diffs[1], diffs[2]);
    assert.notEqual(diffs[0], 0);
    if (diffs[0] > 0) sawIncreasing = true;
    if (diffs[0] < 0) sawDecreasing = true;

    const expected = nums[3] + diffs[0];
    assert.equal(q.correctAnswer, expected);
    const valid = validateQuestionAnswer(q, { single: expected });
    assert.equal(valid.isCorrect, true);
    const invalid = validateQuestionAnswer(q, { single: expected + 1 });
    assert.equal(invalid.isCorrect, false);
  }

  assert.equal(sawIncreasing, true);
  assert.equal(sawDecreasing, true);
});

test('generates and validates missing middle and two missing terms questions', () => {
  const midQ = generateArithmeticQuestion(2, 77, 'missing_middle');
  assert.equal(midQ.kind, 'missing_middle');
  assert.equal(midQ.missingIndices?.length, 1);
  assert.equal(validateQuestionAnswer(midQ, { single: midQ.correctAnswer as number }).isCorrect, true);

  const twoQ = generateArithmeticQuestion(2, 88, 'two_missing_terms');
  assert.equal(twoQ.kind, 'two_missing_terms');
  assert.ok(Array.isArray(twoQ.correctAnswer));
  const [a1, a2] = twoQ.correctAnswer as number[];
  assert.equal(validateQuestionAnswer(twoQ, { slots: [a1, a2] }).isCorrect, true);

  // Partial correctness feedback when only first term matches
  const partial = validateQuestionAnswer(twoQ, { slots: [a1, a2 + 99] });
  assert.equal(partial.isCorrect, false);
  assert.equal(partial.detectedMisconception, 'second_term_drift');
});

test('generates valid alphabetical sequences within A-Z', () => {
  for (let seed = 10; seed <= 30; seed++) {
    const q = generateAlphabetQuestion(2, seed);
    assert.equal(q.competency, 'letter_patterns');
    const ans = String(q.correctAnswer);
    assert.match(ans, /^[A-Z]$/);
    assert.equal(validateQuestionAnswer(q, { single: ans }).isCorrect, true);
    assert.equal(validateQuestionAnswer(q, { single: ans === 'Z' ? 'A' : 'Z' }).isCorrect, false);
  }
});

test('generates repeating, visual, rhythm, and error-repair questions with valid answers', () => {
  const rep = generateRepeatingPatternQuestion(2, 123);
  assert.equal(validateQuestionAnswer(rep, { single: rep.correctAnswer as string }).isCorrect, true);

  const vis = generateVisualAttributeQuestion(2, 456);
  assert.equal(validateQuestionAnswer(vis, { single: vis.correctAnswer as string }).isCorrect, true);

  const rhy = generateRhythmQuestion(2, 789);
  assert.equal(validateQuestionAnswer(rhy, { single: rhy.correctAnswer as string }).isCorrect, true);

  const errQ = generateErrorDetectionQuestion(2, 321);
  assert.ok(errQ.errorRepairSpec);
  const { wrongIndex, correctedValue } = errQ.errorRepairSpec!;
  assert.equal(
    validateQuestionAnswer(errQ, { errorFix: { index: wrongIndex, repairedValue: correctedValue } }).isCorrect,
    true
  );
  // Wrong index rejected
  assert.equal(
    validateQuestionAnswer(errQ, {
      errorFix: { index: wrongIndex === 1 ? 2 : 1, repairedValue: correctedValue },
    }).isCorrect,
    false
  );
});

test('validates student-created increasing and decreasing sequences strictly', () => {
  const incSpec = {
    direction: 'increasing' as const,
    startValue: 7,
    length: 5,
    allowedSteps: [3, 4, 5, 10],
  };

  assert.equal(validateCreationSequence(incSpec, 4, [7, 11, 15, 19, 23]).isCorrect, true);
  assert.equal(validateCreationSequence(incSpec, 4, [7, 11, 15, 19, 24]).isCorrect, false);
  assert.equal(validateCreationSequence(incSpec, 4, [8, 12, 16, 20, 24]).isCorrect, false);
  assert.equal(validateCreationSequence(incSpec, 4, [7, 3, -1, -5, -9]).isCorrect, false);

  const decSpec = {
    direction: 'decreasing' as const,
    startValue: 50,
    length: 5,
    allowedSteps: [2, 4, 5, 10],
  };
  assert.equal(validateCreationSequence(decSpec, 5, [50, 45, 40, 35, 30]).isCorrect, true);
  assert.equal(validateCreationSequence(decSpec, 5, [50, 55, 60, 65, 70]).isCorrect, false);

  // Constrained Tier 4 creation (must land on 30)
  const constrained = CURATED_QUESTIONS.find((q) => q.id === 'ct-constraint-4')!;
  assert.equal(
    validateQuestionAnswer(constrained, { creation: { step: 6, terms: [6, 12, 18, 24, 30] } }).isCorrect,
    true
  );
  assert.equal(
    validateQuestionAnswer(constrained, { creation: { step: 4, terms: [6, 10, 14, 18, 22] } }).isCorrect,
    false
  );
});

test('validates Tier 4 alternating / interleaved competition sequences', () => {
  const altQ = CURATED_QUESTIONS.find((q) => q.id === 'ct-alt-3')!;
  assert.equal(validateQuestionAnswer(altQ, { slots: [20, 25] }).isCorrect, true);
  assert.equal(validateQuestionAnswer(altQ, { slots: [25, 20] }).isCorrect, false);
});

test('ambiguity checks reject underspecified or ambiguous patterns', () => {
  assert.equal(isArithmeticSequenceUnambiguous([2, 4, 6], 2), false); // too short (<4)
  assert.equal(isArithmeticSequenceUnambiguous([5, 5, 5, 5], 0), false); // zero delta
  assert.equal(isArithmeticSequenceUnambiguous([2, 4, 6, 9], 2), false); // inconsistent delta
  assert.equal(isArithmeticSequenceUnambiguous([2, 4, 6, 8], 2), true);

  assert.equal(isRepeatingCycleUnambiguous(['A', 'A'], 4), false); // trivial single token
  assert.equal(isRepeatingCycleUnambiguous(['A', 'B', 'C'], 4), false); // < 2 cycles
  assert.equal(isRepeatingCycleUnambiguous(['A', 'B', 'C'], 6), true);

  assert.equal(isAlphabetSequenceUnambiguous(['A', 'C', 'E'], 2), false); // too short
  assert.equal(isAlphabetSequenceUnambiguous(['A', 'C', 'E', 'G'], 2), true);
  assert.equal(isAlphabetSequenceUnambiguous(['Y', 'Z', '[', '\\'], 1), false); // out of A-Z
});

test('20-question mock assessment covers all 6 competencies and both creation directions', () => {
  const mock = generateMockAssessmentSet(2026, 20);
  assert.equal(mock.length, 20);
  const competencies = new Set(mock.map((q) => q.competency));
  assert.equal(competencies.has('number_patterns'), true);
  assert.equal(competencies.has('letter_patterns'), true);
  assert.equal(competencies.has('visual_patterns'), true);
  assert.equal(competencies.has('repeating_patterns'), true);
  assert.equal(competencies.has('rhythm_patterns'), true);
  assert.equal(competencies.has('missing_terms'), true);

  assert.equal(mock.some((q) => q.kind === 'create_increasing'), true);
  assert.equal(mock.some((q) => q.kind === 'create_decreasing'), true);
  assert.equal(mock.every((q) => !q.isCompetition), true);
});

test('adaptive engine distinguishes independent vs hint-assisted answers and isolates competition stats', () => {
  let progress = makeBlankProgress();

  // Below min sample -> insufficient evidence
  assert.equal(
    evaluateCompetencyReadiness(progress.competencyStats.number_patterns).status,
    'insufficient'
  );

  // 3 independent correct in number_patterns -> promotes number_patterns to Tier 2, NOT letter_patterns
  for (let i = 0; i < 3; i++) {
    progress = recordAttemptIntoProgress(progress, {
      id: `a-${i}`,
      timestamp: Date.now() + i,
      questionId: `q-${i}`,
      competency: 'number_patterns',
      tier: 1,
      isCompetition: false,
      mode: 'adventure',
      correct: true,
      independent: true,
      hintsUsed: 0,
      attemptsCount: 1,
      userAnswer: '20',
      misconceptionTags: [],
      promptSummary: 'Test',
    });
  }

  assert.equal(progress.competencyStats.number_patterns.currentTier, 2);
  assert.equal(progress.competencyStats.letter_patterns.currentTier, 1);
  assert.equal(
    evaluateCompetencyReadiness(progress.competencyStats.number_patterns).status,
    'ready'
  );

  // Competition question should NOT alter Grade 2 readiness counts for letter_patterns
  progress = recordAttemptIntoProgress(progress, {
    id: 'comp-1',
    timestamp: Date.now() + 10,
    questionId: 'ct-alt-3',
    competency: 'letter_patterns',
    tier: 4,
    isCompetition: true,
    mode: 'champions_tower',
    correct: false,
    independent: false,
    hintsUsed: 1,
    attemptsCount: 2,
    userAnswer: 'X',
    misconceptionTags: ['interleaved'],
    promptSummary: 'Comp test',
  });

  assert.equal(progress.competencyStats.letter_patterns.totalAttempts, 0);
  assert.equal(progress.attempts.length, 4);

  // Creation question generation check
  const cInc = generateCreationQuestion('increasing', 1, 55);
  assert.equal(cInc.creationSkill, 'create_increasing');
  const cDec = generateCreationQuestion('decreasing', 2, 66);
  assert.equal(cDec.creationSkill, 'create_decreasing');
});

function buildValidSubmissionForQuestion(q: Question) {
  if (q.kind === 'create_increasing' || q.kind === 'create_decreasing') {
    const spec = q.creationSpec!;
    let step = spec.allowedSteps[0];
    if (spec.requireTargetAtEnd !== undefined) {
      step = spec.allowedSteps.find(
        (s) => spec.startValue + (spec.length - 1) * s === spec.requireTargetAtEnd
      )!;
    }
    const signed = spec.direction === 'increasing' ? step : -step;
    const terms = Array.from({ length: spec.length }, (_, i) => spec.startValue + i * signed);
    return { creation: { step, terms } };
  }
  if (q.kind === 'error_detection' && q.errorRepairSpec) {
    return {
      errorFix: {
        index: q.errorRepairSpec.wrongIndex,
        repairedValue: q.errorRepairSpec.correctedValue,
      },
    };
  }
  if (Array.isArray(q.correctAnswer)) {
    return { slots: q.correctAnswer };
  }
  return { single: q.correctAnswer };
}

test('getHotspotQuestion refreshes all 20 landmarks with validatable variants across seeds', () => {
  let changedCount = 0;

  for (const curated of CURATED_QUESTIONS) {
    assert.equal(getHotspotQuestion(curated.id, 0), curated);

    for (const seed of [101, 2026]) {
      const refreshed = getHotspotQuestion(curated.id, seed);
      assert.equal(refreshed.id, curated.id);
      assert.equal(refreshed.area, curated.area);
      assert.equal(refreshed.competency, curated.competency);
      assert.equal(refreshed.kind, curated.kind);
      assert.equal(refreshed.interaction, curated.interaction);
      assert.equal(Boolean(refreshed.isCompetition), Boolean(curated.isCompetition));

      const validPayload = buildValidSubmissionForQuestion(refreshed);
      const outcome = validateQuestionAnswer(refreshed, validPayload);
      assert.equal(
        outcome.isCorrect,
        true,
        `Expected valid answer for ${curated.id} (seed=${seed}) to pass: ${outcome.feedback}`
      );

      if (refreshed.options && refreshed.options.length > 0 && !Array.isArray(refreshed.correctAnswer)) {
        const optionVals = refreshed.options.map((o) => String(o.value));
        assert.equal(
          optionVals.includes(String(refreshed.correctAnswer)),
          true,
          `Expected options for ${curated.id} (seed=${seed}) to contain correctAnswer ${refreshed.correctAnswer}`
        );
      }

      if (
        seed === 101 &&
        (JSON.stringify(refreshed.sequence) !== JSON.stringify(curated.sequence) ||
          JSON.stringify(refreshed.correctAnswer) !== JSON.stringify(curated.correctAnswer))
      ) {
        changedCount++;
      }
    }
  }

  assert.equal(changedCount, CURATED_QUESTIONS.length);
});

test('resetAndRefreshQuest clears progress, assigns a new questSeed, and preserves customQuestions & audioSettings', () => {
  const customQ = CURATED_QUESTIONS[0];
  const populated: PlayerProgress = {
    ...makeBlankProgress(),
    unlockedAreas: ['counting_grove', 'enchanted_garden', 'rhythm_woods'],
    completedHotspots: ['hs-cg-bridge', 'hs-cg-stairs'],
    collectedRelics: ['Brookstone Shard', 'Acorn Step Gem'],
    diagnosticCompleted: true,
    completedDays: [1, 2],
    remediationQueue: ['number_patterns'],
    customQuestions: [customQ],
    audioSettings: { muted: true, musicVolume: 0.15, sfxVolume: 0.9 },
    questSeed: 0,
  };

  const firstReset = resetAndRefreshQuest(populated);
  assert.deepEqual(firstReset.unlockedAreas, ['counting_grove']);
  assert.deepEqual(firstReset.completedHotspots, []);
  assert.deepEqual(firstReset.collectedRelics, []);
  assert.deepEqual(firstReset.completedDays, []);
  assert.deepEqual(firstReset.attempts, []);
  assert.deepEqual(firstReset.mockTestResults, []);
  assert.deepEqual(firstReset.remediationQueue, []);
  assert.equal(firstReset.diagnosticCompleted, false);
  assert.equal(firstReset.customQuestions.length, 1);
  assert.equal(firstReset.customQuestions[0].id, customQ.id);
  assert.deepEqual(firstReset.audioSettings, { muted: true, musicVolume: 0.15, sfxVolume: 0.9 });
  assert.ok((firstReset.questSeed ?? 0) > 0);

  const secondReset = resetAndRefreshQuest(firstReset);
  assert.notEqual(secondReset.questSeed, firstReset.questSeed);
  assert.ok((secondReset.questSeed ?? 0) > 0);
});

