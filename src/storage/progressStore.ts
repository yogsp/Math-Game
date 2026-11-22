import type { AudioSettings, PlayerProgress, Question } from '../types/game';
import {
  createInitialCompetencyStats,
  createInitialCreationStats,
} from '../engine/adaptiveEngine';

const STORAGE_KEY = 'pattern_kingdom_progress_v1';

export function createDefaultProgress(): PlayerProgress {
  return {
    version: 1,
    playerName: 'Pattern Guardian',
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
    audioSettings: {
      muted: false,
      musicVolume: 0.35,
      sfxVolume: 0.7,
    },
    questSeed: 0,
    lastPlayedAt: Date.now(),
  };
}

export function loadProgress(): PlayerProgress {
  if (typeof window === 'undefined') return createDefaultProgress();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultProgress();
    const parsed = JSON.parse(raw) as Partial<PlayerProgress>;
    const defaults = createDefaultProgress();
    return {
      ...defaults,
      ...parsed,
      competencyStats: {
        ...defaults.competencyStats,
        ...(parsed.competencyStats ?? {}),
      },
      creationStats: {
        ...defaults.creationStats,
        ...(parsed.creationStats ?? {}),
      },
      audioSettings: {
        ...defaults.audioSettings,
        ...(parsed.audioSettings ?? {}),
      },
      unlockedAreas:
        Array.isArray(parsed.unlockedAreas) && parsed.unlockedAreas.length > 0
          ? parsed.unlockedAreas
          : defaults.unlockedAreas,
      completedHotspots: Array.isArray(parsed.completedHotspots) ? parsed.completedHotspots : [],
      collectedRelics: Array.isArray(parsed.collectedRelics) ? parsed.collectedRelics : [],
      completedDays: Array.isArray(parsed.completedDays) ? parsed.completedDays : [],
      attempts: Array.isArray(parsed.attempts) ? parsed.attempts : [],
      mockTestResults: Array.isArray(parsed.mockTestResults) ? parsed.mockTestResults : [],
      remediationQueue: Array.isArray(parsed.remediationQueue) ? parsed.remediationQueue : [],
      customQuestions: Array.isArray(parsed.customQuestions) ? parsed.customQuestions : [],
      questSeed:
        typeof parsed.questSeed === 'number' && Number.isFinite(parsed.questSeed) && parsed.questSeed >= 0
          ? parsed.questSeed
          : 0,
    };
  } catch {
    return createDefaultProgress();
  }
}

export function saveProgress(progress: PlayerProgress): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function resetProgressStorage(): PlayerProgress {
  const fresh = createDefaultProgress();
  saveProgress(fresh);
  return fresh;
}

export function resetAndRefreshQuest(prev: PlayerProgress): PlayerProgress {
  const fresh = createDefaultProgress();
  const prevSeed = typeof prev.questSeed === 'number' ? prev.questSeed : 0;
  const candidate = (Date.now() % 1_000_000) + 1;
  const nextSeed = candidate === prevSeed ? prevSeed + 1 : candidate;

  const next: PlayerProgress = {
    ...fresh,
    customQuestions: Array.isArray(prev.customQuestions) ? prev.customQuestions : [],
    audioSettings: prev.audioSettings ?? fresh.audioSettings,
    questSeed: nextSeed,
    lastPlayedAt: Date.now(),
  };
  saveProgress(next);
  return next;
}

export function exportProgressJson(progress: PlayerProgress): string {
  return JSON.stringify(progress, null, 2);
}

export function importProgressJson(jsonText: string): PlayerProgress | null {
  try {
    const parsed = JSON.parse(jsonText) as Partial<PlayerProgress>;
    if (!parsed || typeof parsed !== 'object' || !parsed.competencyStats) {
      return null;
    }
    const defaults = createDefaultProgress();
    const merged: PlayerProgress = {
      ...defaults,
      ...parsed,
      competencyStats: { ...defaults.competencyStats, ...parsed.competencyStats },
      creationStats: { ...defaults.creationStats, ...(parsed.creationStats ?? {}) },
      audioSettings: { ...defaults.audioSettings, ...(parsed.audioSettings ?? {}) },
    };
    saveProgress(merged);
    return merged;
  } catch {
    return null;
  }
}

export function updateAudioSettings(
  progress: PlayerProgress,
  audioSettings: AudioSettings
): PlayerProgress {
  const next = { ...progress, audioSettings };
  saveProgress(next);
  return next;
}

export function addCustomSchoolQuestion(
  progress: PlayerProgress,
  question: Question
): PlayerProgress {
  const next = {
    ...progress,
    customQuestions: [question, ...progress.customQuestions],
  };
  saveProgress(next);
  return next;
}

export function removeCustomSchoolQuestion(
  progress: PlayerProgress,
  questionId: string
): PlayerProgress {
  const next = {
    ...progress,
    customQuestions: progress.customQuestions.filter((q) => q.id !== questionId),
  };
  saveProgress(next);
  return next;
}
