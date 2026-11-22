import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileCheck2,
  Layers,
  ListChecks,
  Sparkles,
  XCircle,
} from 'lucide-react';
import type {
  AttemptRecord,
  CompetencyId,
  MockTestResult,
  PlayerProgress,
  Question,
} from '../../types/game';
import { COMPETENCY_LABELS } from '../../engine/adaptiveEngine';
import {
  generateCreationQuestion,
  generateDiagnosticSet,
  generateMockAssessmentSet,
  generatePracticeQuestion,
} from '../../engine/questionBank';
import { PuzzleWorkspace, type PuzzleSubmissionPayload } from '../puzzles/PuzzleWorkspace';
import { soundEngine } from '../../audio/soundEngine';

interface SummativeAcademyProps {
  progress: PlayerProgress;
  startDirectlyInMockTest?: boolean;
  onRecordAttempt: (attempt: AttemptRecord) => void;
  onSaveMockResult: (result: MockTestResult) => void;
  onCompleteDiagnostic: () => void;
  onBack: () => void;
}

type AcademySubMode = 'hub' | 'practice' | 'mock_setup' | 'mock_exam' | 'mock_review_submit' | 'mock_results';

export function SummativeAcademy({
  progress,
  startDirectlyInMockTest = false,
  onRecordAttempt,
  onSaveMockResult,
  onCompleteDiagnostic,
  onBack,
}: SummativeAcademyProps) {
  const [subMode, setSubMode] = useState<AcademySubMode>(
    startDirectlyInMockTest ? 'mock_setup' : 'hub'
  );
  const [sessionTitle, setSessionTitle] = useState('');
  const [isDiagnostic, setIsDiagnostic] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [solvedPractice, setSolvedPractice] = useState(false);
  const [practiceFinished, setPracticeFinished] = useState(false);

  // Mock test configuration & answers
  const [timedMode, setTimedMode] = useState(false);
  const [questionCount, setQuestionCount] = useState(20);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [examAnswers, setExamAnswers] = useState<Record<string, PuzzleSubmissionPayload>>({});
  const [latestResult, setLatestResult] = useState<MockTestResult | null>(null);

  useEffect(() => {
    if (startDirectlyInMockTest) {
      setSubMode('mock_setup');
    }
  }, [startDirectlyInMockTest]);

  // Mock test gentle timer (counts up, or optional 20-min countdown warning without harsh lockout)
  useEffect(() => {
    if (subMode !== 'mock_exam' && subMode !== 'mock_review_submit') return;
    const timer = window.setInterval(() => {
      setSecondsElapsed((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [subMode]);

  const startDiagnostic = () => {
    soundEngine.playClick();
    setQuestions(generateDiagnosticSet(Date.now() % 100000));
    setSessionTitle('6-Competency Diagnostic Check');
    setIsDiagnostic(true);
    setCurrentIdx(0);
    setSolvedPractice(false);
    setPracticeFinished(false);
    setSubMode('practice');
  };

  const startTopicPractice = (competency: CompetencyId) => {
    soundEngine.playClick();
    const tier = Math.min(2, progress.competencyStats[competency].currentTier) as 1 | 2;
    const seedBase = Date.now() % 100000;
    const list = Array.from({ length: 5 }, (_, i) =>
      generatePracticeQuestion(competency, tier, seedBase + i * 7, progress.customQuestions)
    );
    setQuestions(list);
    setSessionTitle(`${COMPETENCY_LABELS[competency]} Practice`);
    setIsDiagnostic(false);
    setCurrentIdx(0);
    setSolvedPractice(false);
    setPracticeFinished(false);
    setSubMode('practice');
  };

  const startCreationPractice = () => {
    soundEngine.playClick();
    const seedBase = Date.now() % 100000;
    setQuestions([
      generateCreationQuestion('increasing', 1, seedBase + 1),
      generateCreationQuestion('decreasing', 1, seedBase + 2),
      generateCreationQuestion('increasing', 2, seedBase + 3),
      generateCreationQuestion('decreasing', 2, seedBase + 4),
    ]);
    setSessionTitle('Pattern Creation Studio (Increasing & Decreasing)');
    setIsDiagnostic(false);
    setCurrentIdx(0);
    setSolvedPractice(false);
    setPracticeFinished(false);
    setSubMode('practice');
  };

  const startMixedPractice = () => {
    soundEngine.playClick();
    const seedBase = Date.now() % 100000;
    const comps: CompetencyId[] = [
      'number_patterns',
      'letter_patterns',
      'visual_patterns',
      'repeating_patterns',
      'rhythm_patterns',
      'missing_terms',
    ];
    const list = comps.map((c, idx) =>
      generatePracticeQuestion(
        c,
        Math.min(2, progress.competencyStats[c].currentTier) as 1 | 2,
        seedBase + idx * 11,
        progress.customQuestions
      )
    );
    setQuestions(list);
    setSessionTitle('Mixed Grade 2 Pattern Practice');
    setIsDiagnostic(false);
    setCurrentIdx(0);
    setSolvedPractice(false);
    setPracticeFinished(false);
    setSubMode('practice');
  };

  const launchMockExam = () => {
    soundEngine.playClick();
    const set = generateMockAssessmentSet(Date.now() % 100000, questionCount, progress.customQuestions);
    setQuestions(set);
    setExamAnswers({});
    setCurrentIdx(0);
    setSecondsElapsed(0);
    setSubMode('mock_exam');
  };

  const handlePracticeSolved = (res: PuzzleSubmissionPayload) => {
    const q = questions[currentIdx];
    if (!q) return;
    onRecordAttempt({
      id: `acad-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      questionId: q.id,
      competency: q.competency,
      creationSkill: q.creationSkill,
      tier: q.tier,
      isCompetition: false,
      mode: isDiagnostic ? 'diagnostic' : 'practice',
      correct: res.isCorrect,
      independent: res.independent,
      hintsUsed: res.hintsUsed,
      attemptsCount: res.attemptsCount,
      userAnswer: res.userAnswerLabel,
      misconceptionTags: res.misconceptionTags,
      promptSummary: q.prompt,
    });
    setSolvedPractice(true);
  };

  const submitMockExam = () => {
    soundEngine.playSuccess();
    const byComp: MockTestResult['byCompetency'] = {
      number_patterns: { correct: 0, total: 0 },
      letter_patterns: { correct: 0, total: 0 },
      visual_patterns: { correct: 0, total: 0 },
      repeating_patterns: { correct: 0, total: 0 },
      rhythm_patterns: { correct: 0, total: 0 },
      missing_terms: { correct: 0, total: 0 },
    };
    const creationBreakdown = {
      increasingCorrect: 0,
      increasingTotal: 0,
      decreasingCorrect: 0,
      decreasingTotal: 0,
    };

    let correctCount = 0;
    const items: MockTestResult['items'] = questions.map((q) => {
      const ans = examAnswers[q.id];
      const isCorrect = Boolean(ans?.isCorrect);
      if (isCorrect) correctCount += 1;

      byComp[q.competency].total += 1;
      if (isCorrect) byComp[q.competency].correct += 1;

      if (q.creationSkill === 'create_increasing') {
        creationBreakdown.increasingTotal += 1;
        if (isCorrect) creationBreakdown.increasingCorrect += 1;
      } else if (q.creationSkill === 'create_decreasing') {
        creationBreakdown.decreasingTotal += 1;
        if (isCorrect) creationBreakdown.decreasingCorrect += 1;
      }

      // Record attempt for adaptive & parent history
      onRecordAttempt({
        id: `mock-${Date.now()}-${q.id}`,
        timestamp: Date.now(),
        questionId: q.id,
        competency: q.competency,
        creationSkill: q.creationSkill,
        tier: q.tier,
        isCompetition: false,
        mode: 'mock_test',
        correct: isCorrect,
        independent: isCorrect,
        hintsUsed: 0,
        attemptsCount: 1,
        userAnswer: ans?.userAnswerLabel || 'No answer given',
        misconceptionTags: isCorrect ? [] : q.misconceptionTags,
        promptSummary: q.prompt,
      });

      const expectedDisplay = Array.isArray(q.correctAnswer)
        ? q.correctAnswer.join(', ')
        : q.creationSpec
          ? q.ruleSummary
          : String(q.correctAnswer);

      return {
        questionId: q.id,
        prompt: q.prompt,
        competency: q.competency,
        userAnswer: ans?.userAnswerLabel || 'No answer given',
        correctAnswer: expectedDisplay,
        isCorrect,
        explanation: q.explanation,
      };
    });

    const result: MockTestResult = {
      id: `mockres-${Date.now()}`,
      timestamp: Date.now(),
      timed: timedMode,
      durationSeconds: secondsElapsed,
      totalQuestions: questions.length,
      correctCount,
      byCompetency: byComp,
      creationBreakdown,
      items,
    };

    onSaveMockResult(result);
    setLatestResult(result);
    setSubMode('mock_results');
  };

  const currentQuestion = useMemo(() => questions[currentIdx] ?? null, [questions, currentIdx]);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const timeLimitSeconds = questionCount * 60; // 1 min/question gentle benchmark

  return (
    <div className="min-h-[100dvh] bg-[#F5EFE0] text-stone-900 safe-pad flex flex-col">
      {/* Top Bar */}
      <header className="bg-gradient-to-b from-[#1A3046] to-[#122334] text-amber-50 px-5 py-3.5 flex items-center justify-between gap-4 border-b-2 border-amber-500/35 shadow-md">
        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            if (subMode === 'hub') {
              onBack();
            } else {
              setSubMode('hub');
            }
          }}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#213B54] hover:bg-[#2A4967] border border-amber-400/30 text-sm font-bold min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          {subMode === 'hub' ? 'Back to Kingdom' : 'Academy Menu'}
        </button>
        <h2 className="font-display text-lg sm:text-xl font-bold truncate text-amber-100">
          Summative Test Academy
        </h2>
        <div className="text-xs font-semibold text-amber-200 hidden sm:block">
          Grade 2 Practice · Not an Official DLSZ Exam
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6">
        {/* === ACADEMY HUB === */}
        {subMode === 'hub' && (
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-950 font-medium">
              Prepare calmly for your Grade 2 Math summative test. Practice by topic, train pattern
              creation, or take a full 20-question mock assessment. (Content reflects an
              approximation of Grade 2 expectations, not an official DLSZ assessment.)
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={startDiagnostic}
                className="text-left bg-white hover:bg-amber-50/40 rounded-2xl border border-slate-200 p-5 shadow-xs transition-colors flex flex-col justify-between gap-3"
              >
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-2 text-amber-800 font-extrabold text-sm">
                    <Sparkles className="w-4 h-4" /> Step 1 · 6 Questions
                  </div>
                  <h3 className="font-display text-xl font-bold text-slate-900">
                    Quick Diagnostic Check
                  </h3>
                  <p className="text-sm text-slate-600">
                    Samples all six pattern categories to calibrate starting difficulty and highlight
                    what to review.
                  </p>
                </div>
                <span className="text-sm font-extrabold text-emerald-700">
                  {progress.diagnosticCompleted ? 'Retake Diagnostic →' : 'Start Diagnostic →'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setSubMode('mock_setup');
                }}
                className="text-left bg-white hover:bg-amber-50/40 rounded-2xl border-2 border-amber-400 p-5 shadow-xs transition-colors flex flex-col justify-between gap-3"
              >
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-2 text-amber-800 font-extrabold text-sm">
                    <ClipboardCheck className="w-4 h-4" /> Full Exam Mode · Up to 20 Questions
                  </div>
                  <h3 className="font-display text-xl font-bold text-slate-900">
                    Mock Summative Test
                  </h3>
                  <p className="text-sm text-slate-600">
                    Covers all 6 competencies plus creating increasing and decreasing patterns. No
                    hints during the test; full explanations after submitting!
                  </p>
                </div>
                <span className="text-sm font-extrabold text-amber-800">
                  Configure & Start Mock Test →
                </span>
              </button>
            </div>

            {/* Topic-Specific & Creation Practice */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg font-bold text-slate-900">
                    Topic-Specific & Mixed Practice
                  </h3>
                  <p className="text-sm text-slate-600">
                    Includes graduated hints and visual scaffolding whenever you need a hand.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={startMixedPractice}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm min-h-[44px]"
                >
                  <Layers className="w-4 h-4" /> Mixed Practice (6 Qs)
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {(Object.keys(COMPETENCY_LABELS) as CompetencyId[]).map((compId) => (
                  <button
                    key={compId}
                    type="button"
                    onClick={() => startTopicPractice(compId)}
                    className="text-left rounded-xl border border-slate-200 hover:border-amber-500 hover:bg-amber-50/40 p-3.5 transition-colors min-h-[68px]"
                  >
                    <div className="font-bold text-slate-900 text-sm">
                      {COMPETENCY_LABELS[compId]}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 tabular-nums">
                      Tier {Math.min(2, progress.competencyStats[compId].currentTier)} ·{' '}
                      {progress.competencyStats[compId].totalAttempts} practiced
                    </div>
                  </button>
                ))}

                <button
                  type="button"
                  onClick={startCreationPractice}
                  className="text-left rounded-xl border border-emerald-300 bg-emerald-50/60 hover:bg-emerald-100/70 p-3.5 transition-colors min-h-[68px] sm:col-span-2 lg:col-span-3"
                >
                  <div className="font-extrabold text-emerald-950 text-sm">
                    Create Your Own Patterns (Increasing & Decreasing Builder)
                  </div>
                  <div className="text-xs text-emerald-800 mt-0.5">
                    Practice inventing rules and building 5-term sequences from scratch!
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* === PRACTICE / DIAGNOSTIC RUNNER === */}
        {subMode === 'practice' && (
          <div className="max-w-3xl mx-auto">
            {practiceFinished ? (
              <div className="bg-white rounded-2xl border border-emerald-200 p-8 text-center space-y-4 shadow-sm">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <h3 className="font-display text-2xl font-bold text-slate-900">
                  {sessionTitle} Complete!
                </h3>
                <p className="text-slate-600 text-sm max-w-md mx-auto">
                  Every attempt has been logged cleanly to your topic mastery profile.
                </p>
                <div className="flex justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSubMode('hub')}
                    className="px-6 py-3 rounded-xl bg-slate-900 text-white font-bold min-h-[48px]"
                  >
                    Back to Test Academy
                  </button>
                </div>
              </div>
            ) : currentQuestion ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 border-b border-slate-100 pb-3">
                  <span>{sessionTitle}</span>
                  <span className="tabular-nums">
                    Question {currentIdx + 1} of {questions.length}
                  </span>
                </div>

                <PuzzleWorkspace question={currentQuestion} onSolved={handlePracticeSolved} />

                {solvedPractice && (
                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        if (currentIdx + 1 < questions.length) {
                          setCurrentIdx((i) => i + 1);
                          setSolvedPractice(false);
                        } else {
                          if (isDiagnostic) onCompleteDiagnostic();
                          setPracticeFinished(true);
                        }
                      }}
                      className="px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold min-h-[48px]"
                    >
                      {currentIdx + 1 < questions.length ? 'Next Question →' : 'Finish Session'}
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}

        {/* === MOCK EXAM SETUP === */}
        {subMode === 'mock_setup' && (
          <div className="max-w-xl mx-auto bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
            <h3 className="font-display text-2xl font-bold text-slate-900">
              Configure Mock Summative Assessment
            </h3>
            <p className="text-sm text-slate-600">
              Covers Number, Letter, Visual, Repeating, Rhythm, Missing Terms, Error Repair, and
              Creating Increasing & Decreasing Patterns. During the test, hints and right/wrong
              indicators stay hidden until you submit.
            </p>

            <div className="space-y-3">
              <div className="text-sm font-bold text-slate-800">Number of Questions</div>
              <div className="flex gap-2">
                {[10, 20].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setQuestionCount(cnt)}
                    className={`flex-1 py-3 rounded-xl border-2 font-bold text-sm min-h-[48px] ${
                      questionCount === cnt
                        ? 'bg-amber-100 border-amber-600 text-amber-950'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    {cnt} Questions {cnt === 20 ? '(Recommended Full Mock)' : '(Quick Mock)'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-sm font-bold text-slate-800">Parent Timing Option</div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTimedMode(false)}
                  className={`flex-1 py-3 rounded-xl border-2 font-bold text-sm min-h-[48px] ${
                    !timedMode
                      ? 'bg-emerald-50 border-emerald-600 text-emerald-950'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  Untimed (Calm Pace)
                </button>
                <button
                  type="button"
                  onClick={() => setTimedMode(true)}
                  className={`flex-1 py-3 rounded-xl border-2 font-bold text-sm min-h-[48px] ${
                    timedMode
                      ? 'bg-amber-100 border-amber-600 text-amber-950'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  Timed ({questionCount} min target)
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={launchMockExam}
              className="w-full py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-base shadow-sm min-h-[52px]"
            >
              Begin Mock Assessment
            </button>
          </div>
        )}

        {/* === MOCK EXAM IN PROGRESS === */}
        {subMode === 'mock_exam' && currentQuestion && (
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm font-bold text-slate-800 tabular-nums">
                Question {currentIdx + 1} of {questions.length}
              </div>
              <div className="flex items-center gap-3 text-xs font-bold text-slate-600 tabular-nums">
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-4 h-4 text-amber-600" />
                  {timedMode
                    ? `Elapsed: ${formatDuration(secondsElapsed)} / ${formatDuration(timeLimitSeconds)}`
                    : `Time: ${formatDuration(secondsElapsed)} (Untimed)`}
                </span>
                <button
                  type="button"
                  onClick={() => setSubMode('mock_review_submit')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold"
                >
                  <ListChecks className="w-4 h-4" /> Review All
                </button>
              </div>
            </div>

            {/* Question Jump Strip */}
            <div className="flex flex-wrap gap-1.5 justify-center">
              {questions.map((q, idx) => {
                const answered = Boolean(examAnswers[q.id]?.userAnswerLabel);
                const active = idx === currentIdx;
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentIdx(idx)}
                    aria-label={`Go to question ${idx + 1}${answered ? ' (answered)' : ''}`}
                    className={`w-9 h-9 rounded-lg text-xs font-mono-num font-bold border transition-colors ${
                      active
                        ? 'bg-slate-900 text-white border-slate-900'
                        : answered
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-400'
                          : 'bg-white text-slate-600 border-slate-300'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
              <PuzzleWorkspace
                question={currentQuestion}
                examMode={true}
                initialExamPayload={examAnswers[currentQuestion.id]?.rawAnswerPayload}
                onExamAnswerChange={(payload) => {
                  setExamAnswers((prev) => ({
                    ...prev,
                    [currentQuestion.id]: payload,
                  }));
                }}
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                className="px-5 py-3 rounded-xl bg-white border border-slate-300 disabled:opacity-40 font-bold text-sm min-h-[48px]"
              >
                ← Previous
              </button>

              {currentIdx + 1 < questions.length ? (
                <button
                  type="button"
                  onClick={() => setCurrentIdx((i) => i + 1)}
                  className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm min-h-[48px]"
                >
                  Save & Next →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setSubMode('mock_review_submit')}
                  className="px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-sm min-h-[48px]"
                >
                  Review Before Submitting →
                </button>
              )}
            </div>
          </div>
        )}

        {/* === REVIEW BEFORE SUBMIT === */}
        {subMode === 'mock_review_submit' && (
          <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-2xl font-bold text-slate-900">
                Review Your Answers
              </h3>
              <span className="text-sm font-bold text-slate-600 tabular-nums">
                {Object.keys(examAnswers).length} of {questions.length} answered
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {questions.map((q, idx) => {
                const ans = examAnswers[q.id];
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => {
                      setCurrentIdx(idx);
                      setSubMode('mock_exam');
                    }}
                    className="text-left p-3 rounded-xl border border-slate-200 hover:border-amber-500 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-500">
                        Q{idx + 1} · {COMPETENCY_LABELS[q.competency]}
                      </div>
                      <div className="text-sm font-bold text-slate-900 truncate">
                        {ans?.userAnswerLabel ? `Answer: ${ans.userAnswerLabel}` : 'Not answered yet'}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-amber-700 shrink-0">Edit</span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSubMode('mock_exam')}
                className="px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-sm min-h-[48px]"
              >
                ← Back to Questions
              </button>
              <button
                type="button"
                onClick={submitMockExam}
                className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-base min-h-[48px]"
              >
                <FileCheck2 className="w-5 h-5" /> Submit Mock Assessment
              </button>
            </div>
          </div>
        )}

        {/* === POST-SUBMIT RESULTS & EXPLANATIONS === */}
        {subMode === 'mock_results' && latestResult && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <div className="text-xs font-bold text-amber-700">
                  Mock Summative Assessment Complete
                </div>
                <h3 className="font-display text-3xl font-bold text-slate-900 tabular-nums mt-1">
                  {latestResult.correctCount} / {latestResult.totalQuestions} Correct (
                  {Math.round((latestResult.correctCount / latestResult.totalQuestions) * 100)}%)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Time: {formatDuration(latestResult.durationSeconds)} · Practice score reflects this
                  20-question mock set (not an official DLSZ grade predictor).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSubMode('hub')}
                className="px-5 py-3 rounded-xl bg-slate-900 text-white font-bold text-sm min-h-[48px]"
              >
                Return to Academy
              </button>
            </div>

            {/* Competency Breakdown */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
              <h4 className="font-display text-lg font-bold text-slate-900">
                Results by Competency & Pattern Creation
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {(Object.keys(latestResult.byCompetency) as CompetencyId[]).map((cId) => {
                  const row = latestResult.byCompetency[cId];
                  if (row.total === 0) return null;
                  return (
                    <div key={cId} className="rounded-xl border border-slate-200 p-3">
                      <div className="text-xs font-bold text-slate-600">
                        {COMPETENCY_LABELS[cId]}
                      </div>
                      <div className="text-xl font-extrabold text-slate-900 tabular-nums mt-1">
                        {row.correct} / {row.total}
                      </div>
                    </div>
                  );
                })}
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
                  <div className="text-xs font-bold text-emerald-800">
                    Creating Increasing & Decreasing Patterns
                  </div>
                  <div className="text-sm font-extrabold text-emerald-950 tabular-nums mt-1">
                    Increasing: {latestResult.creationBreakdown.increasingCorrect}/
                    {latestResult.creationBreakdown.increasingTotal} · Decreasing:{' '}
                    {latestResult.creationBreakdown.decreasingCorrect}/
                    {latestResult.creationBreakdown.decreasingTotal}
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Question-by-Question Review & Explanations */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
              <h4 className="font-display text-lg font-bold text-slate-900">
                Question Review & Explanations
              </h4>
              <div className="space-y-3">
                {latestResult.items.map((item, idx) => (
                  <div
                    key={item.questionId + idx}
                    className={`rounded-xl border p-4 space-y-1.5 ${
                      item.isCorrect
                        ? 'bg-emerald-50/40 border-emerald-200'
                        : 'bg-orange-50/60 border-orange-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold text-sm text-slate-900">
                        Q{idx + 1}. {item.prompt}
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-extrabold shrink-0 ${
                          item.isCorrect ? 'text-emerald-700' : 'text-orange-700'
                        }`}
                      >
                        {item.isCorrect ? (
                          <>
                            <CheckCircle2 className="w-4 h-4" /> Correct
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4" /> Review
                          </>
                        )}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-700">
                      Your answer: <span className="font-mono-num">{item.userAnswer}</span> ·
                      Expected: <span className="font-mono-num">{item.correctAnswer}</span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-700">{item.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
