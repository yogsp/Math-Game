import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  HelpCircle,
  Lightbulb,
  Play,
  RotateCcw,
  Sparkles,
  Volume2,
} from 'lucide-react';
import type { Question, RhythmInstrument, ValidationOutcome } from '../../types/game';
import { validateQuestionAnswer } from '../../engine/mathValidator';
import { soundEngine } from '../../audio/soundEngine';
import { RhythmTokenBadge, VisualTokenSvg } from '../art/PatternTokenGraphic';
import { JumpArcScaffold } from './JumpArcScaffold';

export interface PuzzleSubmissionPayload {
  userAnswerLabel: string;
  isCorrect: boolean;
  hintsUsed: number;
  attemptsCount: number;
  independent: boolean;
  misconceptionTags: string[];
  rawAnswerPayload: {
    single?: string | number;
    slots?: Array<string | number>;
    errorFix?: { index: number; repairedValue: string | number };
    creation?: { step: number; terms: number[] };
  };
}

interface PuzzleWorkspaceProps {
  question: Question;
  /** In Mock Test mode: no hints, no immediate right/wrong reveal; parent collects answer */
  examMode?: boolean;
  initialExamPayload?: PuzzleSubmissionPayload['rawAnswerPayload'];
  onExamAnswerChange?: (payload: PuzzleSubmissionPayload) => void;
  onSolved?: (result: PuzzleSubmissionPayload) => void;
}

function getStageTheme(question: Question) {
  if (question.isCompetition || question.id.startsWith('ct-')) {
    return {
      surface: 'bg-gradient-to-b from-[#1E2B4D] via-[#273861] to-[#1A2442] border-indigo-400/50 text-amber-50',
      label: 'Observatory Star-Ledge',
      kind: 'tower' as const,
    };
  }
  if (question.id.startsWith('rw-') || question.interaction === 'rhythm_pads' || question.competency === 'rhythm_patterns') {
    return {
      surface: 'bg-gradient-to-b from-[#1A3B47] via-[#224A56] to-[#16313B] border-sky-400/40 text-amber-50',
      label: 'Songbird Forest Stage',
      kind: 'rhythm' as const,
    };
  }
  if (
    question.id.startsWith('eg-') ||
    question.competency === 'letter_patterns' ||
    question.competency === 'visual_patterns' ||
    question.competency === 'repeating_patterns'
  ) {
    return {
      surface: 'bg-gradient-to-b from-[#E5F2DF] via-[#DCEAD2] to-[#C8DFBC] border-emerald-700/40 text-stone-900',
      label: 'Garden Trellis & Lantern Beam',
      kind: 'garden' as const,
    };
  }
  if (question.id.startsWith('cs-') || question.interaction === 'pattern_builder' || question.interaction === 'error_repair') {
    return {
      surface: 'bg-gradient-to-b from-[#EFE3CC] via-[#E5D4B3] to-[#D6BF95] border-amber-800/45 text-stone-900',
      label: 'Castle Rune Courtyard',
      kind: 'castle' as const,
    };
  }
  return {
    surface: 'bg-gradient-to-b from-[#DFF2F0] via-[#CBEAE9] to-[#B7E1DF] border-teal-700/40 text-stone-900',
    label: 'Whispering Brook Stepping Stones',
    kind: 'brook' as const,
  };
}

function DiegeticStageDecor({ kind }: { kind: ReturnType<typeof getStageTheme>['kind'] }) {
  return (
    <svg
      viewBox="0 0 600 120"
      preserveAspectRatio="none"
      className="absolute inset-0 w-full h-full pointer-events-none opacity-65"
      aria-hidden="true"
    >
      {kind === 'brook' && (
        <g fill="none" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round">
          <path d="M20 96 Q90 84 160 96 T300 96 T440 96 T580 96" opacity="0.5" />
          <path d="M50 108 Q120 98 190 108 T330 108 T470 108" opacity="0.38" />
        </g>
      )}
      {kind === 'garden' && (
        <g>
          <rect x="0" y="10" width="600" height="8" fill="#78350F" opacity="0.35" />
          <path d="M0 24 Q75 40 150 22 T300 24 T450 22 T600 24" fill="none" stroke="#15803D" strokeWidth="3" opacity="0.45" />
        </g>
      )}
      {kind === 'rhythm' && (
        <g fill="none" stroke="#7DD3FC" strokeWidth="2.5" opacity="0.4">
          <circle cx="90" cy="60" r="32" />
          <circle cx="510" cy="60" r="36" />
          <path d="M40 104 Q300 88 560 104" stroke="#FDE047" strokeWidth="3" opacity="0.4" />
        </g>
      )}
      {kind === 'castle' && (
        <g stroke="#92400E" strokeWidth="2" opacity="0.22">
          <line x1="0" y1="104" x2="600" y2="104" />
          <line x1="120" y1="88" x2="120" y2="120" />
          <line x1="300" y1="88" x2="300" y2="120" />
          <line x1="480" y1="88" x2="480" y2="120" />
        </g>
      )}
      {kind === 'tower' && (
        <g fill="#FDE68A" opacity="0.5">
          <circle cx="60" cy="22" r="2" />
          <circle cx="170" cy="18" r="2.5" />
          <circle cx="430" cy="20" r="2" />
          <circle cx="540" cy="26" r="2.5" />
        </g>
      )}
    </svg>
  );
}

export function PuzzleWorkspace({
  question,
  examMode = false,
  initialExamPayload,
  onExamAnswerChange,
  onSolved,
}: PuzzleWorkspaceProps) {
  const missingIndices = useMemo(
    () =>
      question.missingIndices ??
      question.sequence
        .map((s, idx) => (s.isMissing ? idx : -1))
        .filter((i) => i >= 0),
    [question]
  );

  // Slot values keyed by sequence index
  const [slotValues, setSlotValues] = useState<Record<number, string | number>>({});
  const [selectedOption, setSelectedOption] = useState<string | number | null>(null);
  const [activeSlotIdx, setActiveSlotIdx] = useState<number | null>(missingIndices[0] ?? null);

  // Error detection state
  const [selectedWrongIdx, setSelectedWrongIdx] = useState<number | null>(null);
  const [repairedValue, setRepairedValue] = useState<string | number | null>(null);

  // Pattern builder (Create Increasing / Decreasing) state
  const [chosenStep, setChosenStep] = useState<number | null>(null);
  const [createdTerms, setCreatedTerms] = useState<Array<number | ''>>([]);

  // Rhythm playback state
  const [activeBeatIdx, setActiveBeatIdx] = useState<number | null>(null);
  const [isPlayingRhythm, setIsPlayingRhythm] = useState(false);

  // Graduated hints & attempts
  const [hintsUsed, setHintsUsed] = useState(0);
  const [attemptsCount, setAttemptsCount] = useState(0);
  const [outcome, setOutcome] = useState<ValidationOutcome | null>(null);
  const [solvedState, setSolvedState] = useState(false);

  // Dragging state for pointer drag-and-drop
  const [draggingValue, setDraggingValue] = useState<string | number | null>(null);
  const slotRefs = useRef<Record<number, HTMLButtonElement | null>>({});

  const stageTheme = useMemo(() => getStageTheme(question), [question]);

  // Reset local state whenever question changes
  useEffect(() => {
    setHintsUsed(0);
    setAttemptsCount(0);
    setOutcome(null);
    setSolvedState(false);
    setDraggingValue(null);

    if (initialExamPayload) {
      if (initialExamPayload.slots && missingIndices.length > 0) {
        const mapped: Record<number, string | number> = {};
        missingIndices.forEach((mIdx, i) => {
          if (initialExamPayload.slots![i] !== undefined) {
            mapped[mIdx] = initialExamPayload.slots![i];
          }
        });
        setSlotValues(mapped);
      } else {
        setSlotValues({});
      }
      setSelectedOption(initialExamPayload.single ?? null);
      setSelectedWrongIdx(initialExamPayload.errorFix?.index ?? null);
      setRepairedValue(initialExamPayload.errorFix?.repairedValue ?? null);
      if (initialExamPayload.creation) {
        setChosenStep(initialExamPayload.creation.step);
        setCreatedTerms(initialExamPayload.creation.terms);
      } else if (question.creationSpec) {
        setChosenStep(null);
        setCreatedTerms([
          question.creationSpec.startValue,
          ...Array(question.creationSpec.length - 1).fill(''),
        ]);
      }
    } else {
      setSlotValues({});
      setSelectedOption(null);
      setActiveSlotIdx(missingIndices[0] ?? null);
      setSelectedWrongIdx(null);
      setRepairedValue(null);
      setChosenStep(null);
      if (question.creationSpec) {
        setCreatedTerms([
          question.creationSpec.startValue,
          ...Array(question.creationSpec.length - 1).fill(''),
        ]);
      } else {
        setCreatedTerms([]);
      }
    }
  }, [question.id, question.prompt, question.correctAnswer]);

  // Emit live exam-mode answers cleanly
  const notifyExamChange = (
    raw: PuzzleSubmissionPayload['rawAnswerPayload'],
    label: string
  ) => {
    if (!examMode || !onExamAnswerChange) return;
    const validation = validateQuestionAnswer(question, raw);
    onExamAnswerChange({
      userAnswerLabel: label,
      isCorrect: validation.isCorrect,
      hintsUsed: 0,
      attemptsCount: 1,
      independent: validation.isCorrect,
      misconceptionTags: validation.isCorrect
        ? []
        : [validation.detectedMisconception ?? question.misconceptionTags[0] ?? 'incorrect'],
      rawAnswerPayload: raw,
    });
  };

  // Play rhythm sequence visually and audibly
  const playRhythmSequence = () => {
    if (isPlayingRhythm) return;
    soundEngine.unlockFromGesture();
    setIsPlayingRhythm(true);
    const seq = question.sequence;
    seq.forEach((item, idx) => {
      window.setTimeout(() => {
        setActiveBeatIdx(idx);
        if (!item.isMissing && item.rhythm) {
          soundEngine.playRhythmInstrument(item.rhythm.instrument);
        }
        if (idx === seq.length - 1) {
          window.setTimeout(() => {
            setActiveBeatIdx(null);
            setIsPlayingRhythm(false);
          }, 420);
        }
      }, idx * 460);
    });
  };

  // Place a value into the currently active slot (supports tap-to-place AND drag-drop)
  const assignSlotValue = (slotIdx: number, val: string | number) => {
    if (solvedState && !examMode) return;
    soundEngine.playPlaceTile();
    const updated = { ...slotValues, [slotIdx]: val };
    setSlotValues(updated);
    setOutcome(null);

    const nextEmpty = missingIndices.find((idx) => idx !== slotIdx && updated[idx] === undefined);
    if (nextEmpty !== undefined) {
      setActiveSlotIdx(nextEmpty);
    }

    if (examMode) {
      const slotsArr = missingIndices.map((m) => updated[m] ?? '');
      const raw =
        missingIndices.length === 1
          ? { single: slotsArr[0], slots: slotsArr }
          : { slots: slotsArr };
      notifyExamChange(raw, slotsArr.join(', '));
    }
  };

  const handleOptionActivate = (val: string | number, instrument?: RhythmInstrument) => {
    if (solvedState && !examMode) return;
    if (instrument) {
      soundEngine.playRhythmInstrument(instrument);
    } else {
      soundEngine.playClick();
    }

    if (question.interaction === 'rule_selector') {
      setSelectedOption(val);
      setOutcome(null);
      if (examMode) {
        notifyExamChange({ single: val }, String(val));
      }
      return;
    }

    if (question.interaction === 'error_repair') {
      setRepairedValue(val);
      setOutcome(null);
      if (examMode && selectedWrongIdx !== null) {
        notifyExamChange(
          { errorFix: { index: selectedWrongIdx, repairedValue: val } },
          `Position ${selectedWrongIdx + 1} → ${val}`
        );
      }
      return;
    }

    const targetSlot = activeSlotIdx ?? missingIndices[0];
    if (targetSlot !== undefined) {
      assignSlotValue(targetSlot, val);
    }
  };

  // Pointer-based drag-and-drop that works cleanly on iPad touch + desktop mouse
  const handleOptionPointerDown = (
    e: React.PointerEvent<HTMLButtonElement>,
    val: string | number
  ) => {
    if (
      question.interaction === 'rule_selector' ||
      question.interaction === 'error_repair' ||
      (solvedState && !examMode)
    ) {
      return;
    }
    setDraggingValue(val);
    (e.currentTarget as HTMLElement).dataset.startX = String(e.clientX);
    (e.currentTarget as HTMLElement).dataset.startY = String(e.clientY);
  };

  const handleOptionPointerUp = (
    e: React.PointerEvent<HTMLButtonElement>,
    val: string | number,
    instrument?: RhythmInstrument
  ) => {
    const startX = Number((e.currentTarget as HTMLElement).dataset.startX ?? e.clientX);
    const startY = Number((e.currentTarget as HTMLElement).dataset.startY ?? e.clientY);
    const moved = Math.hypot(e.clientX - startX, e.clientY - startY);

    if (draggingValue !== null && moved > 18) {
      for (const mIdx of missingIndices) {
        const el = slotRefs.current[mIdx];
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (
          e.clientX >= rect.left - 18 &&
          e.clientX <= rect.right + 18 &&
          e.clientY >= rect.top - 18 &&
          e.clientY <= rect.bottom + 18
        ) {
          assignSlotValue(mIdx, val);
          setDraggingValue(null);
          return;
        }
      }
    }
    setDraggingValue(null);
    if (moved <= 18) {
      handleOptionActivate(val, instrument);
    }
  };

  // Pattern Builder: selectable number pad chips for each step
  const creationCandidateChips = useMemo(() => {
    if (!question.creationSpec) return [];
    const { startValue, direction, allowedSteps, length } = question.creationSpec;
    const set = new Set<number>();
    for (const step of allowedSteps) {
      for (let i = 1; i < length; i++) {
        const v = direction === 'increasing' ? startValue + i * step : startValue - i * step;
        if (v >= 0) set.add(v);
      }
    }
    if (allowedSteps[0]) {
      const sample = direction === 'increasing' ? startValue + allowedSteps[0] + 1 : Math.max(0, startValue - allowedSteps[0] - 1);
      set.add(sample);
    }
    return Array.from(set).sort((a, b) => a - b);
  }, [question.creationSpec]);

  const handleCreationNumberInput = (idx: number, val: string) => {
    if (idx === 0 || (solvedState && !examMode)) return;
    const parsed = val === '' ? '' : Number(val);
    if (val !== '' && !Number.isFinite(parsed)) return;
    const next = [...createdTerms];
    next[idx] = parsed as number | '';
    setCreatedTerms(next);
    setOutcome(null);

    if (examMode && chosenStep !== null) {
      const numericTerms = next.map((v) => (v === '' ? NaN : Number(v)));
      notifyExamChange(
        { creation: { step: chosenStep, terms: numericTerms } },
        `Rule ${question.creationSpec?.direction === 'increasing' ? '+' : '-'}${chosenStep}: ${next.join(', ')}`
      );
    }
  };

  const handleCreationChipTap = (num: number) => {
    if (solvedState && !examMode) return;
    soundEngine.playPlaceTile();
    const firstBlank = createdTerms.findIndex((t, idx) => idx > 0 && t === '');
    const targetIdx = firstBlank >= 1 ? firstBlank : createdTerms.length - 1;
    const next = [...createdTerms];
    next[targetIdx] = num;
    setCreatedTerms(next);
    setOutcome(null);

    if (examMode && chosenStep !== null) {
      const numericTerms = next.map((v) => (v === '' ? NaN : Number(v)));
      notifyExamChange(
        { creation: { step: chosenStep, terms: numericTerms } },
        `Rule ${question.creationSpec?.direction === 'increasing' ? '+' : '-'}${chosenStep}: ${next.join(', ')}`
      );
    }
  };

  const handleCheckAnswer = () => {
    if (examMode || solvedState) return;
    soundEngine.unlockFromGesture();

    let payload: PuzzleSubmissionPayload['rawAnswerPayload'] = {};
    if (question.interaction === 'pattern_builder' && question.creationSpec) {
      const numericTerms = createdTerms.map((v) => (v === '' ? NaN : Number(v)));
      payload = { creation: { step: chosenStep ?? 0, terms: numericTerms } };
    } else if (question.interaction === 'error_repair') {
      if (selectedWrongIdx !== null && repairedValue !== null) {
        payload = { errorFix: { index: selectedWrongIdx, repairedValue } };
      }
    } else if (question.interaction === 'rule_selector') {
      payload = { single: selectedOption ?? '' };
    } else {
      const slotsArr = missingIndices.map((m) => slotValues[m] ?? '');
      payload =
        missingIndices.length === 1
          ? { single: slotsArr[0], slots: slotsArr }
          : { slots: slotsArr };
    }

    const res = validateQuestionAnswer(question, payload);
    const nextAttemptNum = attemptsCount + 1;
    setAttemptsCount(nextAttemptNum);
    setOutcome(res);

    if (res.isCorrect) {
      soundEngine.playSuccess();
      setSolvedState(true);
      onSolved?.({
        userAnswerLabel: res.normalizedAnswer,
        isCorrect: true,
        hintsUsed,
        attemptsCount: nextAttemptNum,
        independent: hintsUsed === 0 && nextAttemptNum === 1,
        misconceptionTags: [],
        rawAnswerPayload: payload,
      });
    } else {
      soundEngine.playGentleRetry();
      if (nextAttemptNum === 1 && hintsUsed === 0) {
        setHintsUsed(1);
      } else if (nextAttemptNum >= 2 && hintsUsed < 2) {
        setHintsUsed(2);
      }
    }
  };

  const renderSequenceTile = (item: Question['sequence'][number], idx: number) => {
    const isMissingSlot = item.isMissing || missingIndices.includes(idx);
    const placedVal = slotValues[idx];

    if (question.interaction === 'error_repair') {
      const isSelectedWrong = selectedWrongIdx === idx;
      const showFixed = isSelectedWrong && repairedValue !== null;
      return (
        <button
          key={idx}
          type="button"
          onClick={() => {
            soundEngine.playClick();
            setSelectedWrongIdx(idx);
            setOutcome(null);
            if (examMode && repairedValue !== null) {
              notifyExamChange(
                { errorFix: { index: idx, repairedValue } },
                `Position ${idx + 1} → ${repairedValue}`
              );
            }
          }}
          className={`min-w-[64px] min-h-[64px] px-4 py-3 rounded-2xl border-2 font-mono-num text-xl font-bold transition-all ${
            isSelectedWrong
              ? 'bg-amber-200 border-amber-800 text-stone-950 ring-4 ring-amber-300/80 scale-105 shadow-md'
              : 'fantasy-stone-tile border-amber-700/55 text-stone-900 hover:border-amber-700'
          }`}
          aria-label={`Term ${idx + 1}: ${item.value}${isSelectedWrong ? ' (selected to fix)' : ''}`}
        >
          {showFixed ? (
            <span className="flex flex-col items-center leading-tight">
              <span className="text-xs line-through text-stone-400">{item.value}</span>
              <span className="text-emerald-800">{repairedValue}</span>
            </span>
          ) : (
            item.value
          )}
        </button>
      );
    }

    if (isMissingSlot) {
      const isActive = activeSlotIdx === idx;
      const placedOption = question.options?.find((o) => String(o.value) === String(placedVal));
      return (
        <button
          key={idx}
          ref={(el) => {
            slotRefs.current[idx] = el;
          }}
          type="button"
          onClick={() => {
            soundEngine.playClick();
            setActiveSlotIdx(idx);
          }}
          aria-label={`Missing slot ${idx + 1}${placedVal !== undefined ? `: filled with ${placedOption?.label ?? placedVal}` : ' (empty)'}`}
          className={`min-w-[68px] min-h-[68px] px-3 py-2 rounded-2xl border-2 flex items-center justify-center transition-all ${
            solvedState
              ? 'bg-emerald-100 border-emerald-700 text-emerald-950 ring-4 ring-amber-300/80 shadow-[0_0_20px_rgba(251,191,36,0.65)]'
              : placedVal !== undefined
                ? 'fantasy-stone-tile border-amber-700 text-stone-950'
                : isActive
                  ? 'border-dashed border-amber-700 bg-amber-100/90 ring-4 ring-amber-300/75 text-amber-900 animate-pulse-soft'
                  : 'border-dashed border-amber-800/55 bg-amber-50/75 text-amber-900/70'
          }`}
        >
          {placedOption?.visual ? (
            <VisualTokenSvg token={placedOption.visual} className="w-12 h-12" />
          ) : placedOption?.rhythm ? (
            <RhythmTokenBadge token={placedOption.rhythm} active={activeBeatIdx === idx} />
          ) : placedVal !== undefined ? (
            <span className="font-mono-num text-xl font-bold">{placedVal}</span>
          ) : (
            <span className="font-mono-num text-xl font-bold">?</span>
          )}
        </button>
      );
    }

    // Standard non-missing sequence item
    if (item.visual) {
      return (
        <div
          key={idx}
          className="fantasy-stone-tile min-w-[64px] min-h-[64px] p-2 rounded-2xl border border-amber-700/45 flex items-center justify-center"
        >
          <VisualTokenSvg token={item.visual} className="w-12 h-12" />
        </div>
      );
    }

    if (item.rhythm) {
      return (
        <div key={idx} className="flex items-center justify-center">
          <RhythmTokenBadge token={item.rhythm} active={activeBeatIdx === idx} />
        </div>
      );
    }

    return (
      <div
        key={idx}
        className="fantasy-stone-tile min-w-[60px] min-h-[60px] px-4 py-3 rounded-2xl border border-amber-700/45 flex items-center justify-center font-mono-num text-xl font-bold text-stone-900"
      >
        {item.value}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Story Scroll & Question Prompt */}
      <div>
        {question.storyContext && (
          <p className="text-sm font-medium text-amber-950 bg-amber-100/80 border border-amber-700/30 rounded-xl px-3.5 py-2 mb-2.5 shadow-2xs">
            {question.storyContext}
          </p>
        )}
        <h3 className="font-display text-lg sm:text-xl font-bold text-stone-900 leading-snug">
          {question.prompt}
        </h3>
      </div>

      {/* Rhythm Replay Bar */}
      {question.interaction === 'rhythm_pads' && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={playRhythmSequence}
            disabled={isPlayingRhythm}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-700 hover:bg-sky-600 disabled:opacity-60 text-white font-bold text-sm shadow-sm transition-colors min-h-[44px] border border-sky-900/40"
          >
            {isPlayingRhythm ? <Volume2 className="w-4 h-4 animate-pulse" /> : <Play className="w-4 h-4" />}
            {isPlayingRhythm ? 'Playing Rhythm...' : 'Replay Rhythm'}
          </button>
          <span className="text-xs font-semibold text-stone-600">
            Visual symbols match every sound so you can play with audio muted too.
          </span>
        </div>
      )}

      {/* === INTERACTION TYPE: PATTERN BUILDER (Create Increasing / Decreasing) === */}
      {question.interaction === 'pattern_builder' && question.creationSpec ? (
        <div className={`relative overflow-hidden space-y-4 rounded-2xl border-2 p-4 shadow-inner ${stageTheme.surface}`}>
          <DiegeticStageDecor kind={stageTheme.kind} />
          <div className="relative z-10">
            <div className="text-xs font-extrabold uppercase tracking-wider opacity-75 mb-2">
              Step 1 · Choose your {question.creationSpec.direction} rule
            </div>
            <div className="flex flex-wrap gap-2">
              {question.creationSpec.allowedSteps.map((step) => {
                const active = chosenStep === step;
                const sign = question.creationSpec!.direction === 'increasing' ? '+' : '-';
                return (
                  <button
                    key={step}
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setChosenStep(step);
                      setOutcome(null);
                      if (examMode) {
                        const numericTerms = createdTerms.map((v) => (v === '' ? NaN : Number(v)));
                        notifyExamChange(
                          { creation: { step, terms: numericTerms } },
                          `Rule ${sign}${step}: ${createdTerms.join(', ')}`
                        );
                      }
                    }}
                    className={`min-h-[46px] px-4 py-2 rounded-xl font-mono-num font-bold text-base border-2 transition-all ${
                      active
                        ? 'bg-gradient-to-b from-amber-300 to-amber-500 border-amber-900 text-stone-950 shadow-md scale-105'
                        : 'fantasy-stone-tile border-amber-700/50 text-stone-900 hover:border-amber-700'
                    }`}
                  >
                    {sign}
                    {step} each time
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold uppercase tracking-wider opacity-75">
                Step 2 · Carve the {question.creationSpec.length} stones
              </span>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setCreatedTerms([
                    question.creationSpec!.startValue,
                    ...Array(question.creationSpec!.length - 1).fill(''),
                  ]);
                  setOutcome(null);
                }}
                className="inline-flex items-center gap-1 text-xs font-bold opacity-80 hover:opacity-100 px-2 py-1 rounded-lg bg-white/60 text-stone-900"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Clear stones
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              {createdTerms.map((val, idx) => (
                <div key={idx} className="flex flex-col items-center">
                  <input
                    type="number"
                    inputMode="numeric"
                    readOnly={idx === 0}
                    value={val}
                    aria-label={`Pattern stone ${idx + 1}`}
                    onChange={(e) => handleCreationNumberInput(idx, e.target.value)}
                    className={`w-16 h-16 text-center rounded-2xl border-2 font-mono-num text-xl font-bold focus:outline-none focus:ring-4 focus:ring-amber-300 ${
                      idx === 0
                        ? 'bg-emerald-100 border-emerald-700 text-emerald-950 shadow-sm'
                        : 'fantasy-stone-tile border-amber-700/60 text-stone-900'
                    }`}
                  />
                  <span className="text-[11px] font-bold opacity-80 mt-1">
                    {idx === 0 ? 'Start' : `Stone ${idx + 1}`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10">
            <div className="text-xs font-bold opacity-80 mb-1.5">
              Quick Rune Chips (Tap to fill next empty stone):
            </div>
            <div className="flex flex-wrap gap-2">
              {creationCandidateChips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleCreationChipTap(chip)}
                  className="fantasy-stone-tile min-w-[48px] min-h-[44px] px-3 py-1.5 rounded-xl border border-amber-700/50 hover:brightness-105 font-mono-num font-bold text-sm text-stone-900"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* === IN-WORLD SEQUENCE DISPLAY STAGE === */
        <div className={`relative overflow-hidden rounded-2xl border-2 p-4 shadow-inner ${stageTheme.surface}`}>
          <DiegeticStageDecor kind={stageTheme.kind} />
          <div className="relative z-10 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 py-1">
            {question.sequence.map((item, idx) => renderSequenceTile(item, idx))}
          </div>

          {/* Visual Jump Arcs Scaffolding when hints are unlocked */}
          {!examMode &&
            hintsUsed >= 1 &&
            (question.sequence[0]?.kind === 'number' || question.sequence[0]?.kind === 'letter') && (
              <div className="relative z-10 mt-2 bg-white/85 rounded-xl px-2 py-1 border border-amber-700/25">
                <JumpArcScaffold
                  sequence={question.sequence}
                  stepDelta={question.stepDelta}
                  showValues={hintsUsed >= 2}
                />
              </div>
            )}

          {question.interaction === 'error_repair' && (
            <p className="relative z-10 text-xs font-bold text-center mt-3 bg-white/75 text-stone-900 rounded-lg px-3 py-1.5 mx-auto w-fit">
              {selectedWrongIdx === null
                ? '1. Tap the rune stone above that breaks the pattern.'
                : `Selected stone #${selectedWrongIdx + 1} (${question.sequence[selectedWrongIdx]?.value}). Now pick the true number below:`}
            </p>
          )}
        </div>
      )}

      {/* === INTERACTIVE OPTION TRAY (Drag or Tap Carved Tiles) === */}
      {question.interaction !== 'pattern_builder' && question.options && (
        <div>
          {question.interaction !== 'rule_selector' && question.interaction !== 'error_repair' && (
            <div className="text-xs font-semibold text-stone-600 mb-2">
              Drag a rune tile into the glowing ? socket, or tap a tile to place it:
            </div>
          )}

          <div
            className={
              question.interaction === 'rule_selector'
                ? 'grid grid-cols-1 gap-2.5'
                : 'flex flex-wrap items-center justify-center gap-3'
            }
          >
            {question.options.map((opt) => {
              const isSelected =
                question.interaction === 'rule_selector'
                  ? String(selectedOption) === String(opt.value)
                  : question.interaction === 'error_repair'
                    ? String(repairedValue) === String(opt.value)
                    : Object.values(slotValues).some((v) => String(v) === String(opt.value));

              return (
                <button
                  key={opt.id}
                  type="button"
                  onPointerDown={(e) => handleOptionPointerDown(e, opt.value)}
                  onPointerUp={(e) => handleOptionPointerUp(e, opt.value, opt.rhythm?.instrument)}
                  onClick={() => {
                    if (draggingValue === null) {
                      handleOptionActivate(opt.value, opt.rhythm?.instrument);
                    }
                  }}
                  className={`touch-none select-none min-h-[54px] px-4 py-2.5 rounded-2xl border-2 font-bold transition-all flex items-center justify-center gap-2 ${
                    question.interaction === 'rule_selector' ? 'justify-start text-left text-sm sm:text-base' : 'min-w-[68px]'
                  } ${
                    isSelected
                      ? 'bg-amber-200 border-amber-800 text-stone-950 ring-2 ring-amber-400 shadow-md'
                      : 'fantasy-stone-tile border-amber-700/50 text-stone-900 hover:border-amber-700 hover:brightness-102'
                  }`}
                >
                  {opt.visual ? (
                    <div className="flex flex-col items-center gap-1">
                      <VisualTokenSvg token={opt.visual} className="w-11 h-11" />
                      <span className="text-xs font-bold text-stone-800">{opt.label}</span>
                    </div>
                  ) : opt.rhythm ? (
                    <RhythmTokenBadge token={opt.rhythm} />
                  ) : (
                    <span className={question.interaction === 'rule_selector' ? '' : 'font-mono-num text-xl'}>
                      {opt.label}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* === ACTION BAR & GRADUATED HINTS (Hidden in Exam Mode) === */}
      {!examMode && (
        <div className="pt-2 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {hintsUsed < 2 && !solvedState && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setHintsUsed((h) => Math.min(2, h + 1));
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-200/80 hover:bg-amber-200 border border-amber-700/40 text-amber-950 font-bold text-sm min-h-[44px]"
                >
                  <Lightbulb className="w-4 h-4 text-amber-800" />
                  {hintsUsed === 0 ? 'Need a Hint?' : 'Show Step Hint'}
                </button>
              )}
            </div>

            {!solvedState && (
              <button
                type="button"
                onClick={handleCheckAnswer}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-b from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 active:scale-98 text-white font-extrabold text-base shadow-[0_3px_0_#064E3B] border border-emerald-900 transition-all min-h-[48px]"
              >
                <CheckCircle2 className="w-5 h-5" />
                Check Answer
              </button>
            )}
          </div>

          {/* Graduated Hint Parchment Scroll */}
          {hintsUsed >= 1 && !solvedState && (
            <div className="rounded-xl bg-amber-100/85 border-2 border-amber-600/45 px-4 py-3 text-sm text-amber-950 space-y-1.5 shadow-xs">
              <div className="flex items-center gap-1.5 font-extrabold text-amber-900">
                <HelpCircle className="w-4 h-4" /> Companion Hint 1
              </div>
              <p className="font-medium">{question.hint1}</p>
              {hintsUsed >= 2 && (
                <div className="pt-1.5 border-t border-amber-700/20">
                  <div className="font-extrabold text-amber-900">Companion Hint 2</div>
                  <p className="font-medium">{question.hint2}</p>
                </div>
              )}
            </div>
          )}

          {/* Friendly Feedback & Magical Celebration */}
          {outcome && (
            <div
              role="status"
              className={`rounded-2xl px-4 py-3.5 border-2 text-sm font-semibold shadow-sm ${
                outcome.isCorrect
                  ? 'bg-emerald-50 border-emerald-600 text-emerald-950 ring-2 ring-amber-300/60'
                  : 'bg-orange-50 border-orange-400 text-orange-950'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <Sparkles
                  className={`w-5 h-5 shrink-0 mt-0.5 ${
                    outcome.isCorrect ? 'text-amber-600' : 'text-orange-600'
                  }`}
                />
                <div className="space-y-1">
                  <p className="font-extrabold">{outcome.feedback}</p>
                  {outcome.isCorrect && (
                    <p className="text-emerald-900 font-medium">{question.explanation}</p>
                  )}
                  {!outcome.isCorrect && attemptsCount >= 3 && (
                    <p className="text-orange-900 pt-1 border-t border-orange-200 font-medium">
                      Worked tip: {question.explanation}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
