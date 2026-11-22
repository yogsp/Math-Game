import type { CreationSpec, Question, ValidationOutcome } from '../types/game';

/**
 * Deterministic validation for pattern answers, student-created sequences,
 * and ambiguity rejection for generated arithmetic/alphabetical sequences.
 */

export function normalizeToken(val: string | number): string {
  return String(val).trim().toUpperCase();
}

export function validateCreationSequence(
  spec: CreationSpec,
  chosenStep: number,
  terms: number[]
): ValidationOutcome {
  if (!Number.isFinite(chosenStep) || chosenStep <= 0) {
    return {
      isCorrect: false,
      feedback: 'First choose how much your pattern changes at each step.',
      detectedMisconception: 'missing_rule_selection',
      normalizedAnswer: terms.join(', '),
    };
  }

  if (spec.allowedSteps.length > 0 && !spec.allowedSteps.includes(chosenStep)) {
    return {
      isCorrect: false,
      feedback: `Choose one of the available step rules (${spec.allowedSteps.join(', ')}).`,
      detectedMisconception: 'invalid_step_choice',
      normalizedAnswer: terms.join(', '),
    };
  }

  if (terms.length !== spec.length) {
    return {
      isCorrect: false,
      feedback: `Your pattern needs exactly ${spec.length} numbers.`,
      detectedMisconception: 'incorrect_sequence_length',
      normalizedAnswer: terms.join(', '),
    };
  }

  if (terms.some((n) => !Number.isFinite(n))) {
    return {
      isCorrect: false,
      feedback: 'Fill every stone with a number before checking.',
      detectedMisconception: 'incomplete_sequence',
      normalizedAnswer: terms.join(', '),
    };
  }

  if (terms[0] !== spec.startValue) {
    return {
      isCorrect: false,
      feedback: `Your sequence must begin at ${spec.startValue}.`,
      detectedMisconception: 'wrong_starting_term',
      normalizedAnswer: terms.join(', '),
    };
  }

  const signedDelta = spec.direction === 'increasing' ? chosenStep : -chosenStep;

  for (let i = 1; i < terms.length; i++) {
    const expected = terms[i - 1] + signedDelta;
    if (terms[i] !== expected) {
      const actualDiff = terms[i] - terms[i - 1];
      if (spec.direction === 'increasing' && actualDiff <= 0) {
        return {
          isCorrect: false,
          feedback: `Step ${i + 1} went down or stayed the same. An increasing pattern goes up by +${chosenStep} each time!`,
          detectedMisconception: 'direction_confusion_increasing',
          normalizedAnswer: terms.join(', '),
        };
      }
      if (spec.direction === 'decreasing' && actualDiff >= 0) {
        return {
          isCorrect: false,
          feedback: `Step ${i + 1} went up or stayed the same. A decreasing pattern goes down by -${chosenStep} each time!`,
          detectedMisconception: 'direction_confusion_decreasing',
          normalizedAnswer: terms.join(', '),
        };
      }
      return {
        isCorrect: false,
        feedback: `Look closely between ${terms[i - 1]} and ${terms[i]}. If your rule is ${signedDelta > 0 ? `+${chosenStep}` : `-${chosenStep}`}, what should come after ${terms[i - 1]}?`,
        detectedMisconception: 'inconsistent_step_application',
        normalizedAnswer: terms.join(', '),
      };
    }
  }

  if (spec.requireTargetAtEnd !== undefined && terms[terms.length - 1] !== spec.requireTargetAtEnd) {
    return {
      isCorrect: false,
      feedback: `Your rule works, but this puzzle asks the sequence to land on ${spec.requireTargetAtEnd} at the end! Try a different step size.`,
      detectedMisconception: 'constraint_mismatch',
      normalizedAnswer: terms.join(', '),
    };
  }

  const ruleText = spec.direction === 'increasing' ? `add ${chosenStep}` : `subtract ${chosenStep}`;
  return {
    isCorrect: true,
    feedback: `Wonderful! You built a true ${spec.direction} pattern using the rule "${ruleText}": ${terms.join(', ')}.`,
    normalizedAnswer: `Rule: ${signedDelta > 0 ? `+${chosenStep}` : `-${chosenStep}`} | ${terms.join(', ')}`,
  };
}

export function validateQuestionAnswer(
  question: Question,
  submission: {
    single?: string | number;
    slots?: Array<string | number>;
    errorFix?: { index: number; repairedValue: string | number };
    creation?: { step: number; terms: number[] };
  }
): ValidationOutcome {
  if (question.kind === 'create_increasing' || question.kind === 'create_decreasing') {
    if (!question.creationSpec || !submission.creation) {
      return {
        isCorrect: false,
        feedback: 'Choose a rule and place numbers in all the spaces.',
        normalizedAnswer: '',
      };
    }
    return validateCreationSequence(
      question.creationSpec,
      submission.creation.step,
      submission.creation.terms
    );
  }

  if (question.kind === 'error_detection' && question.errorRepairSpec) {
    if (!submission.errorFix) {
      return {
        isCorrect: false,
        feedback: 'First tap the term that does not follow the pattern, then choose the number that fixes it.',
        normalizedAnswer: '',
      };
    }
    const { wrongIndex, correctedValue } = question.errorRepairSpec;
    const indexMatches = submission.errorFix.index === wrongIndex;
    const valueMatches =
      normalizeToken(submission.errorFix.repairedValue) === normalizeToken(correctedValue);

    if (!indexMatches) {
      return {
        isCorrect: false,
        feedback: 'Check the jumps between each pair of neighbors. Which number breaks the pattern rule?',
        detectedMisconception: 'wrong_error_location',
        normalizedAnswer: `Index ${submission.errorFix.index + 1} -> ${submission.errorFix.repairedValue}`,
      };
    }

    if (!valueMatches) {
      return {
        isCorrect: false,
        feedback: 'You found the broken stone! Now check the rule again to pick the exact number that belongs there.',
        detectedMisconception: 'found_error_wrong_repair',
        normalizedAnswer: `Index ${submission.errorFix.index + 1} -> ${submission.errorFix.repairedValue}`,
      };
    }

    return {
      isCorrect: true,
      feedback: `Spot on! You repaired the broken term with ${correctedValue}.`,
      normalizedAnswer: `${correctedValue}`,
    };
  }

  if (Array.isArray(question.correctAnswer)) {
    const expected = question.correctAnswer.map(normalizeToken);
    const provided = (submission.slots ?? []).map(normalizeToken);

    if (provided.length !== expected.length || provided.some((p) => p === '')) {
      return {
        isCorrect: false,
        feedback: `Fill in all ${expected.length} missing spaces before checking.`,
        normalizedAnswer: provided.join(', '),
      };
    }

    const allMatch = expected.every((exp, i) => exp === provided[i]);
    if (allMatch) {
      return {
        isCorrect: true,
        feedback: 'Brilliant! Every missing piece fits the pattern.',
        normalizedAnswer: provided.join(', '),
      };
    }

    // Specific helpful feedback for two missing terms
    if (expected[0] === provided[0] && expected[1] !== provided[1]) {
      return {
        isCorrect: false,
        feedback: 'Your first missing piece is right! Apply the same rule one more time for the second space.',
        detectedMisconception: 'second_term_drift',
        normalizedAnswer: provided.join(', '),
      };
    }

    return {
      isCorrect: false,
      feedback: 'Not quite yet. Compare neighboring terms to see how the pattern moves from step to step.',
      detectedMisconception: question.misconceptionTags[0] ?? 'pattern_rule_misread',
      normalizedAnswer: provided.join(', '),
    };
  }

  const rawSingle =
    submission.single !== undefined
      ? submission.single
      : submission.slots && submission.slots.length > 0
        ? submission.slots[0]
        : '';
  const providedNorm = normalizeToken(rawSingle);
  const expectedNorm = normalizeToken(question.correctAnswer);

  if (!providedNorm) {
    return {
      isCorrect: false,
      feedback: 'Choose or place an answer first.',
      normalizedAnswer: '',
    };
  }

  if (providedNorm === expectedNorm) {
    return {
      isCorrect: true,
      feedback: 'Awesome thinking! That completes the sequence.',
      normalizedAnswer: providedNorm,
    };
  }

  // Diagnostic arithmetic misconception hints
  const numProvided = Number(providedNorm);
  const numExpected = Number(expectedNorm);
  if (
    Number.isFinite(numProvided) &&
    Number.isFinite(numExpected) &&
    question.stepDelta !== undefined
  ) {
    if (
      question.stepDelta > 0 &&
      numProvided < numExpected &&
      numProvided === numExpected - 2 * question.stepDelta
    ) {
      return {
        isCorrect: false,
        feedback: 'Careful! That goes backward instead of forward. Check whether the numbers are growing or shrinking.',
        detectedMisconception: 'direction_reversal',
        normalizedAnswer: providedNorm,
      };
    }
    if (Math.abs(numProvided - numExpected) === 1) {
      return {
        isCorrect: false,
        feedback: 'You are super close—just 1 away! Double-check your counting.',
        detectedMisconception: 'off_by_one_counting',
        normalizedAnswer: providedNorm,
      };
    }
  }

  return {
    isCorrect: false,
    feedback: 'Take another look at the pattern rule. Use a hint if you would like a clue!',
    detectedMisconception: question.misconceptionTags[0] ?? 'pattern_rule_misread',
    normalizedAnswer: providedNorm,
  };
}

/**
 * Uniqueness & ambiguity guard for generated sequences:
 * - Constant arithmetic sequences must have at least 4 known numbers (so constant difference d is uniquely determined).
 * - Second-order / growing-difference sequences (Tier 3/4) must have at least 5 known numbers so the 2nd difference is clear.
 * - Repeating patterns must display at least 2 full cycles (or 1.5+ unambiguous cycles with period <= 3).
 * - Alphabetical sequences must stay strictly within A-Z and show >= 4 letters with constant step.
 */
export function isArithmeticSequenceUnambiguous(
  visibleValues: number[],
  stepDelta: number
): boolean {
  if (stepDelta === 0) return false;
  if (visibleValues.length < 4) return false;
  if (visibleValues.some((v) => v < 0 || !Number.isInteger(v))) return false;
  // Verify constant difference across all consecutive pairs
  for (let i = 1; i < visibleValues.length; i++) {
    if (visibleValues[i] - visibleValues[i - 1] !== stepDelta) {
      return false;
    }
  }
  return true;
}

export function isRepeatingCycleUnambiguous(
  cycle: string[],
  shownLength: number
): boolean {
  if (cycle.length < 2) return false;
  const uniqueCount = new Set(cycle).size;
  if (uniqueCount < 2) return false; // e.g. A, A, A is trivial
  // Require at least 2 full cycles OR at least 5 items for period 3 so AB vs AAB vs ABC is never ambiguous
  const minShown = Math.max(cycle.length * 2, 4);
  return shownLength >= minShown;
}

export function isAlphabetSequenceUnambiguous(
  letters: string[],
  step: number
): boolean {
  if (step === 0 || letters.length < 4) return false;
  for (let i = 0; i < letters.length; i++) {
    const code = letters[i].charCodeAt(0);
    if (code < 65 || code > 90) return false;
    if (i > 0 && code - letters[i - 1].charCodeAt(0) !== step) {
      return false;
    }
  }
  return true;
}
