import type {
  AttemptRecord,
  CompetencyId,
  CompetencyStats,
  CreationStats,
  DifficultyTier,
  PlayerProgress,
} from '../types/game';

export const COMPETENCY_LABELS: Record<CompetencyId, string> = {
  number_patterns: 'Number Patterns',
  letter_patterns: 'Letter Patterns',
  visual_patterns: 'Visual Patterns',
  repeating_patterns: 'Repeating Patterns',
  rhythm_patterns: 'Rhythm Patterns',
  missing_terms: 'Missing Terms & Repair',
};

export const TIER_LABELS: Record<DifficultyTier, string> = {
  1: 'Pattern Explorer',
  2: 'Pattern Solver',
  3: 'Pattern Detective',
  4: "Champion's Tower",
};

export const MASTERY_MIN_SAMPLE = 3; // Minimum Grade 2 attempts before evaluating mastery
export const MASTERY_THRESHOLD = 0.8; // 80% recent independent accuracy product threshold

export function createInitialCompetencyStats(): Record<CompetencyId, CompetencyStats> {
  const ids: CompetencyId[] = [
    'number_patterns',
    'letter_patterns',
    'visual_patterns',
    'repeating_patterns',
    'rhythm_patterns',
    'missing_terms',
  ];
  const record = {} as Record<CompetencyId, CompetencyStats>;
  for (const id of ids) {
    record[id] = {
      competency: id,
      totalAttempts: 0,
      independentCorrect: 0,
      hintAssistedCorrect: 0,
      incorrectAttempts: 0,
      currentTier: 1,
      recentHistory: [],
    };
  }
  return record;
}

export function createInitialCreationStats(): CreationStats {
  return {
    increasingAttempts: 0,
    increasingIndependent: 0,
    decreasingAttempts: 0,
    decreasingIndependent: 0,
  };
}

/**
 * Updates per-topic stats and adaptive difficulty tier deterministically.
 * - Grade 2 readiness only advances between Tier 1 and Tier 2 automatically;
 *   Tier 3/4 competition mode is kept separate and optional.
 * - Speed is NEVER used to judge mastery.
 * - Independent accuracy (no hints, first attempt) is distinguished from hint-assisted success.
 */
export function recordAttemptIntoProgress(
  progress: PlayerProgress,
  attempt: AttemptRecord
): PlayerProgress {
  const nextStats = { ...progress.competencyStats };
  const nextCreation = { ...progress.creationStats };
  const nextRemediation = [...progress.remediationQueue];

  // Competition questions (Tier 3/4) are tracked in attempts for Champion's Tower reporting
  // without distorting Grade 2 summative-test readiness stats.
  if (!attempt.isCompetition) {
    const stat = { ...nextStats[attempt.competency] };
    stat.totalAttempts += 1;
    if (attempt.correct) {
      if (attempt.independent) {
        stat.independentCorrect += 1;
      } else {
        stat.hintAssistedCorrect += 1;
      }
      // Remove from remediation if resolved independently
      if (attempt.independent) {
        const idx = nextRemediation.indexOf(attempt.questionId);
        if (idx >= 0) nextRemediation.splice(idx, 1);
      }
    } else {
      stat.incorrectAttempts += 1;
      if (!nextRemediation.includes(attempt.questionId)) {
        nextRemediation.push(attempt.questionId);
      }
    }

    const updatedHistory = [
      ...stat.recentHistory,
      {
        independent: attempt.independent,
        correct: attempt.correct,
        timestamp: attempt.timestamp,
      },
    ].slice(-8);
    stat.recentHistory = updatedHistory;

    // Deterministic adaptive tiering for this specific competency only
    const recentWindow = updatedHistory.slice(-4);
    if (recentWindow.length >= 3) {
      const recentIndepRate =
        recentWindow.filter((h) => h.independent).length / recentWindow.length;
      const recentFailRate =
        recentWindow.filter((h) => !h.correct).length / recentWindow.length;

      if (stat.currentTier === 1 && recentIndepRate >= MASTERY_THRESHOLD) {
        stat.currentTier = 2;
      } else if (stat.currentTier === 2 && recentFailRate >= 0.5) {
        stat.currentTier = 1; // Drop back for gentle scaffolding
      }
    }

    nextStats[attempt.competency] = stat;

    if (attempt.creationSkill === 'create_increasing') {
      nextCreation.increasingAttempts += 1;
      if (attempt.independent) nextCreation.increasingIndependent += 1;
    } else if (attempt.creationSkill === 'create_decreasing') {
      nextCreation.decreasingAttempts += 1;
      if (attempt.independent) nextCreation.decreasingIndependent += 1;
    }
  }

  return {
    ...progress,
    attempts: [attempt, ...progress.attempts].slice(0, 300),
    competencyStats: nextStats,
    creationStats: nextCreation,
    remediationQueue: nextRemediation,
    lastPlayedAt: Date.now(),
  };
}

export interface CompetencyReadinessSummary {
  competency: CompetencyId;
  label: string;
  totalAttempts: number;
  independentAccuracy: number | null; // null if insufficient evidence
  hintAssistedRate: number | null;
  status: 'insufficient' | 'needs_review' | 'developing' | 'ready';
  statusLabel: string;
  currentTier: DifficultyTier;
}

export function evaluateCompetencyReadiness(stat: CompetencyStats): CompetencyReadinessSummary {
  if (stat.totalAttempts < MASTERY_MIN_SAMPLE) {
    return {
      competency: stat.competency,
      label: COMPETENCY_LABELS[stat.competency],
      totalAttempts: stat.totalAttempts,
      independentAccuracy: null,
      hintAssistedRate: null,
      status: 'insufficient',
      statusLabel: 'Not enough practice yet',
      currentTier: stat.currentTier,
    };
  }

  const recent = stat.recentHistory.length > 0 ? stat.recentHistory : [];
  const sampleSize = recent.length || stat.totalAttempts;
  const indepCount =
    recent.length > 0 ? recent.filter((h) => h.independent).length : stat.independentCorrect;
  const totalCorrectCount =
    recent.length > 0
      ? recent.filter((h) => h.correct).length
      : stat.independentCorrect + stat.hintAssistedCorrect;

  const independentAccuracy = indepCount / sampleSize;
  const hintAssistedRate = (totalCorrectCount - indepCount) / sampleSize;

  let status: CompetencyReadinessSummary['status'] = 'developing';
  let statusLabel = 'Developing steadily';

  if (independentAccuracy >= MASTERY_THRESHOLD) {
    status = 'ready';
    statusLabel = 'Strong independent mastery';
  } else if (independentAccuracy < 0.55) {
    status = 'needs_review';
    statusLabel = 'Needs guided review';
  }

  return {
    competency: stat.competency,
    label: COMPETENCY_LABELS[stat.competency],
    totalAttempts: stat.totalAttempts,
    independentAccuracy,
    hintAssistedRate,
    status,
    statusLabel,
    currentTier: stat.currentTier,
  };
}

export function isChampionsTowerUnlocked(progress: PlayerProgress): boolean {
  // Unlocks naturally once the player has solved at least 4 adventure puzzles
  // OR reached strong readiness in at least 2 core topics
  if (progress.completedHotspots.length >= 4) return true;
  const readyCount = Object.values(progress.competencyStats).filter(
    (s) => evaluateCompetencyReadiness(s).status === 'ready'
  ).length;
  return readyCount >= 2;
}

export function suggestNextActivity(progress: PlayerProgress): {
  title: string;
  reason: string;
  recommendedCompetency?: CompetencyId;
} {
  if (!progress.diagnosticCompleted && progress.attempts.length < 4) {
    return {
      title: 'Start Day 1 Diagnostic or Explore The Counting Grove',
      reason: 'A quick 6-question check shows which pattern types are already strong and which need practice.',
    };
  }

  const summaries = Object.values(progress.competencyStats).map(evaluateCompetencyReadiness);
  const needsReview = summaries.find((s) => s.status === 'needs_review');
  if (needsReview) {
    return {
      title: `Practice ${needsReview.label}`,
      reason: `Independent accuracy is below target in ${needsReview.label}. Short guided practice will build confidence.`,
      recommendedCompetency: needsReview.competency,
    };
  }

  const insufficient = summaries.find((s) => s.status === 'insufficient');
  if (insufficient) {
    return {
      title: `Explore ${insufficient.label}`,
      reason: `Not enough practice yet in ${insufficient.label} to measure Grade 2 readiness.`,
      recommendedCompetency: insufficient.competency,
    };
  }

  if (
    progress.creationStats.increasingAttempts < 2 ||
    progress.creationStats.decreasingAttempts < 2
  ) {
    return {
      title: 'Create Patterns in The Castle of Sequences',
      reason: 'Building original increasing and decreasing sequences strengthens test-day rule mastery.',
      recommendedCompetency: 'number_patterns',
    };
  }

  if (progress.mockTestResults.length === 0) {
    return {
      title: 'Take the 20-Question Mock Summative Test',
      reason: 'Core topics have solid practice! Try a calm full-length mock test in Summative Test Academy.',
    };
  }

  return {
    title: 'Mixed Review or Optional Champion’s Tower',
    reason: 'Grade 2 core competencies look strong! Keep sharp with mixed practice or try advanced competition puzzles.',
  };
}
