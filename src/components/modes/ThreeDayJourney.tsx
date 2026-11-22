import React, { useMemo, useState } from 'react';
import { ArrowLeft, Calendar, CheckCircle2, PlayCircle, Sparkles } from 'lucide-react';
import type { AttemptRecord, PlayerProgress, Question } from '../../types/game';
import { THREE_DAY_PLAN, type DayMissionPlan } from '../../data/worldData';
import {
  CURATED_QUESTIONS,
  generateCreationQuestion,
  generateDiagnosticSet,
  generatePracticeQuestion,
} from '../../engine/questionBank';
import { PuzzleWorkspace, type PuzzleSubmissionPayload } from '../puzzles/PuzzleWorkspace';
import { soundEngine } from '../../audio/soundEngine';

interface ThreeDayJourneyProps {
  progress: PlayerProgress;
  onRecordAttempt: (attempt: AttemptRecord) => void;
  onCompleteDiagnostic: () => void;
  onCompleteDay: (day: 1 | 2 | 3) => void;
  onLaunchMockTest: () => void;
  onBack: () => void;
}

export function ThreeDayJourney({
  progress,
  onRecordAttempt,
  onCompleteDiagnostic,
  onCompleteDay,
  onLaunchMockTest,
  onBack,
}: ThreeDayJourneyProps) {
  const [activePlan, setActivePlan] = useState<DayMissionPlan | null>(null);
  const [missionQueue, setMissionQueue] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [solvedCurrent, setSolvedCurrent] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);

  const startDayMission = (plan: DayMissionPlan) => {
    soundEngine.playClick();
    const seedBase = Date.now() % 100000;
    let queue: Question[] = [];

    if (plan.day === 1) {
      // Diagnostic (6) + Number & Letter & Repeating warmups
      queue = [
        ...generateDiagnosticSet(seedBase),
        generatePracticeQuestion('number_patterns', 1, seedBase + 21, progress.customQuestions),
        generatePracticeQuestion('letter_patterns', 1, seedBase + 22, progress.customQuestions),
      ];
    } else if (plan.day === 2) {
      // Weakest / missed revisit + visual + rhythm + BOTH pattern creation directions
      const missedQ = progress.remediationQueue
        .map((id) => CURATED_QUESTIONS.find((q) => q.id === id))
        .filter((q): q is Question => Boolean(q))
        .slice(0, 2);
      queue = [
        ...missedQ,
        generatePracticeQuestion('visual_patterns', 2, seedBase + 31, progress.customQuestions),
        generatePracticeQuestion('rhythm_patterns', 2, seedBase + 32, progress.customQuestions),
        generateCreationQuestion('increasing', 2, seedBase + 33),
        generateCreationQuestion('decreasing', 2, seedBase + 34),
        generatePracticeQuestion('missing_terms', 2, seedBase + 35, progress.customQuestions),
      ];
    } else {
      // Day 3 warm-up (4 quick questions, then invites Mock Assessment!)
      queue = [
        generatePracticeQuestion('number_patterns', 2, seedBase + 41, progress.customQuestions),
        generatePracticeQuestion('missing_terms', 2, seedBase + 42, progress.customQuestions),
        generatePracticeQuestion('repeating_patterns', 2, seedBase + 43, progress.customQuestions),
        generateCreationQuestion('increasing', 2, seedBase + 44),
      ];
    }

    setActivePlan(plan);
    setMissionQueue(queue);
    setCurrentIdx(0);
    setSolvedCurrent(false);
    setSessionDone(false);
  };

  const currentQuestion = useMemo(
    () => (missionQueue[currentIdx] ? missionQueue[currentIdx] : null),
    [missionQueue, currentIdx]
  );

  const handleSolved = (res: PuzzleSubmissionPayload) => {
    if (!currentQuestion) return;
    onRecordAttempt({
      id: `day-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      questionId: currentQuestion.id,
      competency: currentQuestion.competency,
      creationSkill: currentQuestion.creationSkill,
      tier: currentQuestion.tier,
      isCompetition: false,
      mode: activePlan?.day === 1 && currentIdx < 6 ? 'diagnostic' : 'day_mission',
      correct: res.isCorrect,
      independent: res.independent,
      hintsUsed: res.hintsUsed,
      attemptsCount: res.attemptsCount,
      userAnswer: res.userAnswerLabel,
      misconceptionTags: res.misconceptionTags,
      promptSummary: currentQuestion.prompt,
    });
    setSolvedCurrent(true);
  };

  const handleNext = () => {
    soundEngine.playClick();
    if (currentIdx + 1 < missionQueue.length) {
      setCurrentIdx((i) => i + 1);
      setSolvedCurrent(false);
    } else {
      if (activePlan?.includesDiagnostic) onCompleteDiagnostic();
      if (activePlan) onCompleteDay(activePlan.day);
      setSessionDone(true);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#F5EFE0] text-stone-900 safe-pad flex flex-col">
      {/* Top Bar */}
      <div className="bg-gradient-to-b from-[#1A3046] to-[#122334] text-amber-50 px-5 py-3.5 flex items-center justify-between gap-4 border-b-2 border-amber-500/35 shadow-md">
        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            if (activePlan) {
              setActivePlan(null);
            } else {
              onBack();
            }
          }}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#213B54] hover:bg-[#2A4967] border border-amber-400/30 text-sm font-bold min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          {activePlan ? 'All 3 Days' : 'Back to Kingdom'}
        </button>
        <h2 className="font-display text-lg sm:text-xl font-bold truncate text-amber-100">
          3-Day Summative Review Journey
        </h2>
        <div className="text-xs font-semibold text-amber-200 hidden sm:block">
          Flexible Parent Access (No Calendar Locks)
        </div>
      </div>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6">
        {!activePlan ? (
          <div className="space-y-6">
            <div className="bg-amber-100/80 border-2 border-amber-700/35 rounded-2xl p-4 text-sm text-amber-950 font-medium shadow-xs">
              Designed around three ~15-minute review sessions before a summative test. Parents and
              learners can jump into any day immediately.
            </div>

            <div className="grid grid-cols-1 gap-4">
              {THREE_DAY_PLAN.map((plan) => {
                const isDone = progress.completedDays.includes(plan.day);
                return (
                  <div
                    key={plan.day}
                    className="fantasy-parchment rounded-2xl border-2 border-amber-700/50 p-5 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5">
                        <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-amber-200 border border-amber-700/40 text-amber-950 font-extrabold">
                          {plan.day}
                        </span>
                        <h3 className="font-display text-xl font-bold text-stone-900">
                          {plan.title}
                        </h3>
                        {isDone && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800">
                            <CheckCircle2 className="w-4 h-4" /> Completed
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-stone-700">{plan.subtitle}</p>
                      <ul className="text-xs sm:text-sm text-stone-800 space-y-1 pl-1">
                        {plan.goals.map((g, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                            <span>{g}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex flex-col gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => startDayMission(plan)}
                        className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-b from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 border border-emerald-900 text-white font-bold text-sm shadow-[0_3px_0_#064E3B] min-h-[48px]"
                      >
                        <PlayCircle className="w-5 h-5" />
                        {isDone ? `Replay Day ${plan.day}` : `Start Day ${plan.day}`}
                      </button>
                      {plan.includesMockTest && (
                        <button
                          type="button"
                          onClick={onLaunchMockTest}
                          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-b from-amber-300 to-amber-500 hover:brightness-105 border border-amber-800 text-stone-950 font-bold text-sm shadow-[0_2px_0_#92400E] min-h-[44px]"
                        >
                          Jump to 20-Q Mock Test
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : sessionDone ? (
          <div className="fantasy-parchment rounded-2xl border-2 border-emerald-700/50 p-6 sm:p-8 text-center space-y-4 shadow-md">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-100 border border-emerald-600/40 text-emerald-700 flex items-center justify-center">
              <Sparkles className="w-8 h-8" />
            </div>
            <h3 className="font-display text-2xl font-bold text-stone-900">
              {activePlan.title} Complete!
            </h3>
            <p className="text-stone-700 max-w-md mx-auto">
              Great focus! Your independent answers and hint-assisted practice have been saved to the
              Parent Dashboard.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              {activePlan.includesMockTest && (
                <button
                  type="button"
                  onClick={onLaunchMockTest}
                  className="px-6 py-3 rounded-xl bg-gradient-to-b from-amber-300 to-amber-500 hover:brightness-105 text-stone-950 font-extrabold border border-amber-800 shadow-[0_3px_0_#92400E] min-h-[48px]"
                >
                  Start 20-Question Mock Assessment
                </button>
              )}
              <button
                type="button"
                onClick={() => setActivePlan(null)}
                className="px-6 py-3 rounded-xl bg-[#162C42] hover:bg-[#1E3B58] text-amber-50 font-bold border border-amber-400/30 min-h-[48px]"
              >
                Back to 3-Day Plan
              </button>
            </div>
          </div>
        ) : currentQuestion ? (
          <div className="fantasy-parchment rounded-2xl border-2 border-amber-700/55 p-5 sm:p-6 shadow-md space-y-4">
            <div className="flex items-center justify-between text-xs font-bold text-stone-600 border-b border-amber-700/20 pb-3">
              <span>{activePlan.title}</span>
              <span className="tabular-nums">
                Activity {currentIdx + 1} of {missionQueue.length}
              </span>
            </div>

            <PuzzleWorkspace question={currentQuestion} onSolved={handleSolved} />

            {solvedCurrent && (
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-6 py-3 rounded-xl bg-gradient-to-b from-amber-300 to-amber-500 hover:brightness-105 text-stone-950 font-extrabold border border-amber-800 shadow-[0_3px_0_#92400E] min-h-[48px]"
                >
                  {currentIdx + 1 < missionQueue.length ? 'Next Challenge →' : 'Finish Day Mission'}
                </button>
              </div>
            )}
          </div>
        ) : null}
      </main>
    </div>
  );
}
