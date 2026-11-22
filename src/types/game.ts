export type CompetencyId =
  | 'number_patterns'
  | 'letter_patterns'
  | 'visual_patterns'
  | 'repeating_patterns'
  | 'rhythm_patterns'
  | 'missing_terms';

export type CreationSkillId = 'create_increasing' | 'create_decreasing';

export type DifficultyTier = 1 | 2 | 3 | 4;

export type QuestionKind =
  | 'next_term'
  | 'two_missing_terms'
  | 'missing_middle'
  | 'find_rule'
  | 'visual_sequence'
  | 'repeating_pattern'
  | 'letter_sequence'
  | 'rhythm_sequence'
  | 'create_increasing'
  | 'create_decreasing'
  | 'error_detection'
  | 'reasoning_challenge';

export type InteractionType =
  | 'slot_drag_tap'
  | 'pattern_builder'
  | 'rhythm_pads'
  | 'error_repair'
  | 'rule_selector'
  | 'letter_reorder';

export type AreaId =
  | 'counting_grove'
  | 'enchanted_garden'
  | 'rhythm_woods'
  | 'castle_sequences'
  | 'champions_tower';

export type VisualShape = 'circle' | 'triangle' | 'square' | 'star' | 'diamond' | 'leaf' | 'petal';
export type VisualColor = 'amber' | 'sky' | 'rose' | 'emerald' | 'indigo' | 'coral';
export type VisualSize = 'sm' | 'md' | 'lg';
export type VisualOrientation = 0 | 90 | 180 | 270;

export interface VisualToken {
  id: string;
  shape: VisualShape;
  color: VisualColor;
  size?: VisualSize;
  rotation?: VisualOrientation;
  label: string; // Accessible & non-color-only label e.g. "Amber Star"
}

export type RhythmInstrument = 'drum' | 'chime' | 'bell' | 'wood' | 'sparkle';

export interface RhythmToken {
  id: string;
  instrument: RhythmInstrument;
  symbol: string;
  label: string;
  pitchHz: number;
  color: VisualColor;
}

export interface SequenceItem {
  kind: 'number' | 'letter' | 'visual' | 'rhythm';
  value: string | number;
  visual?: VisualToken;
  rhythm?: RhythmToken;
  isMissing?: boolean;
  isError?: boolean;
}

export interface CreationSpec {
  direction: 'increasing' | 'decreasing';
  startValue: number;
  length: number; // e.g., 5 terms
  allowedSteps: number[]; // e.g., [2, 3, 4, 5, 10]
  minStep?: number;
  maxStep?: number;
  requireTargetAtEnd?: number; // optional constraint for Tier 4
}

export interface Question {
  id: string;
  competency: CompetencyId;
  creationSkill?: CreationSkillId;
  tier: DifficultyTier;
  kind: QuestionKind;
  interaction: InteractionType;
  area?: AreaId;
  isCompetition?: boolean; // True for Tier 3 & Tier 4 (kept separate from Grade 2 readiness)
  prompt: string;
  storyContext?: string;
  sequence: SequenceItem[];
  missingIndices?: number[]; // indices in sequence that need filling
  options?: Array<{
    id: string;
    label: string;
    value: string | number;
    visual?: VisualToken;
    rhythm?: RhythmToken;
  }>;
  correctAnswer: string | number | Array<string | number>;
  errorRepairSpec?: {
    wrongIndex: number;
    wrongValue: string | number;
    correctedValue: string | number;
  };
  creationSpec?: CreationSpec;
  ruleSummary: string;
  stepDelta?: number; // For visual jump-arc scaffolding (e.g. +4 or -5)
  hint1: string;
  hint2: string;
  explanation: string;
  misconceptionTags: string[];
  parentTag: string;
  isCustomSchoolQuestion?: boolean;
}

export interface AttemptRecord {
  id: string;
  timestamp: number;
  questionId: string;
  competency: CompetencyId;
  creationSkill?: CreationSkillId;
  tier: DifficultyTier;
  isCompetition: boolean;
  mode: 'adventure' | 'practice' | 'diagnostic' | 'mock_test' | 'day_mission' | 'champions_tower';
  correct: boolean;
  independent: boolean; // True only if solved on first check with 0 hints
  hintsUsed: number;
  attemptsCount: number;
  userAnswer: string;
  misconceptionTags: string[];
  promptSummary: string;
}

export interface CompetencyStats {
  competency: CompetencyId;
  totalAttempts: number;
  independentCorrect: number;
  hintAssistedCorrect: number;
  incorrectAttempts: number;
  currentTier: DifficultyTier;
  recentHistory: Array<{ independent: boolean; correct: boolean; timestamp: number }>;
}

export interface CreationStats {
  increasingAttempts: number;
  increasingIndependent: number;
  decreasingAttempts: number;
  decreasingIndependent: number;
}

export interface MockTestResult {
  id: string;
  timestamp: number;
  timed: boolean;
  durationSeconds: number;
  totalQuestions: number;
  correctCount: number;
  byCompetency: Record<CompetencyId, { correct: number; total: number }>;
  creationBreakdown: {
    increasingCorrect: number;
    increasingTotal: number;
    decreasingCorrect: number;
    decreasingTotal: number;
  };
  items: Array<{
    questionId: string;
    prompt: string;
    competency: CompetencyId;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    explanation: string;
  }>;
}

export interface AudioSettings {
  muted: boolean;
  musicVolume: number; // 0 to 1
  sfxVolume: number; // 0 to 1
}

export interface PlayerProgress {
  version: number;
  playerName: string;
  unlockedAreas: AreaId[];
  completedHotspots: string[]; // hotspot IDs solved in adventure mode
  collectedRelics: string[];
  diagnosticCompleted: boolean;
  completedDays: number[]; // e.g., [1, 2]
  attempts: AttemptRecord[];
  competencyStats: Record<CompetencyId, CompetencyStats>;
  creationStats: CreationStats;
  mockTestResults: MockTestResult[];
  remediationQueue: string[]; // question IDs or competencies to revisit
  customQuestions: Question[];
  audioSettings: AudioSettings;
  questSeed?: number;
  lastPlayedAt: number;
}

export interface ValidationOutcome {
  isCorrect: boolean;
  feedback: string;
  detectedMisconception?: string;
  normalizedAnswer: string;
}
