import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Download,
  Plus,
  RotateCcw,
  Trash2,
  Trophy,
  Unlock,
  Upload,
} from 'lucide-react';
import type { AreaId, CompetencyId, PlayerProgress, Question } from '../../types/game';
import {
  COMPETENCY_LABELS,
  evaluateCompetencyReadiness,
  suggestNextActivity,
} from '../../engine/adaptiveEngine';
import { exportProgressJson, importProgressJson } from '../../storage/progressStore';
import { AREA_ORDER, WORLD_AREAS } from '../../data/worldData';
import { soundEngine } from '../../audio/soundEngine';

interface ParentDashboardProps {
  progress: PlayerProgress;
  onUnlockAllAreas: () => void;
  onAddCustomQuestion: (q: Question) => void;
  onDeleteCustomQuestion: (id: string) => void;
  onImportProgress: (next: PlayerProgress) => void;
  onResetProgress: () => void;
  onJumpToDay: () => void;
  onBack: () => void;
}

export function ParentDashboard({
  progress,
  onUnlockAllAreas,
  onAddCustomQuestion,
  onDeleteCustomQuestion,
  onImportProgress,
  onResetProgress,
  onJumpToDay,
  onBack,
}: ParentDashboardProps) {
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Add custom school worksheet question state
  const [customComp, setCustomComp] = useState<CompetencyId>('number_patterns');
  const [customPrompt, setCustomPrompt] = useState('');
  const [customSequenceStr, setCustomSequenceStr] = useState('3, 6, 9, 12');
  const [customAnswer, setCustomAnswer] = useState('15');
  const [customExplanation, setCustomExplanation] = useState('');
  const [customAddedMsg, setCustomAddedMsg] = useState<string | null>(null);

  const grade2Attempts = useMemo(
    () => progress.attempts.filter((a) => !a.isCompetition),
    [progress.attempts]
  );
  const competitionAttempts = useMemo(
    () => progress.attempts.filter((a) => a.isCompetition),
    [progress.attempts]
  );

  const overallIndepCount = grade2Attempts.filter((a) => a.independent).length;
  const overallHintCount = grade2Attempts.filter((a) => a.correct && !a.independent).length;
  const overallTotal = grade2Attempts.length;

  const readinessSummaries = useMemo(
    () =>
      (Object.keys(COMPETENCY_LABELS) as CompetencyId[]).map((id) =>
        evaluateCompetencyReadiness(progress.competencyStats[id])
      ),
    [progress.competencyStats]
  );

  const topicsNeedingReview = readinessSummaries.filter((r) => r.status === 'needs_review');
  const recentMistakes = grade2Attempts.filter((a) => !a.correct).slice(0, 6);
  const nextSuggestion = suggestNextActivity(progress);

  const handleDownloadJson = () => {
    const data = exportProgressJson(progress);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pattern-kingdom-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportSubmit = () => {
    const parsed = importProgressJson(importText);
    if (!parsed) {
      setImportStatus('Could not read JSON backup. Please paste a valid exported progress JSON.');
      return;
    }
    onImportProgress(parsed);
    setImportText('');
    setImportStatus('Progress backup restored successfully!');
  };

  const handleCreateCustomQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    const parts = customSequenceStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!customPrompt.trim() || parts.length < 3 || !customAnswer.trim()) {
      setCustomAddedMsg('Please enter a prompt, at least 3 sequence terms separated by commas, and the answer.');
      return;
    }

    const isNum = parts.every((p) => Number.isFinite(Number(p))) && Number.isFinite(Number(customAnswer));
    const parsedAns = isNum ? Number(customAnswer) : customAnswer.trim().toUpperCase();
    const seqItems = [
      ...parts.map((p) => ({
        kind: (isNum ? 'number' : 'letter') as 'number' | 'letter',
        value: isNum ? Number(p) : p.toUpperCase(),
      })),
      { kind: (isNum ? 'number' : 'letter') as 'number' | 'letter', value: '?', isMissing: true },
    ];

    const distractorVals = isNum
      ? [Number(parsedAns) + 2, Math.max(0, Number(parsedAns) - 2), Number(parsedAns) + 5]
      : ['X', 'Y', 'Z'].filter((c) => c !== parsedAns);

    const newQ: Question = {
      id: `custom-${Date.now()}`,
      competency: customComp,
      tier: 2,
      kind: isNum ? 'next_term' : 'letter_sequence',
      interaction: isNum ? 'slot_drag_tap' : 'letter_reorder',
      prompt: customPrompt.trim(),
      sequence: seqItems,
      missingIndices: [seqItems.length - 1],
      options: [parsedAns, ...distractorVals].slice(0, 4).map((v, idx) => ({
        id: `copt-${idx}`,
        label: String(v),
        value: v,
      })),
      correctAnswer: parsedAns,
      ruleSummary: customExplanation.trim() || 'School worksheet custom pattern',
      hint1: 'Compare each term with the one before it to spot the steady change.',
      hint2: `Look closely at the jump between ${parts[0]} and ${parts[1]}.`,
      explanation:
        customExplanation.trim() || `The correct next term completing ${parts.join(', ')} is ${parsedAns}.`,
      misconceptionTags: ['school_worksheet_custom'],
      parentTag: 'Custom school question',
      isCustomSchoolQuestion: true,
    };

    onAddCustomQuestion(newQ);
    setCustomPrompt('');
    setCustomExplanation('');
    setCustomAddedMsg('Added school question! It will appear in Topic Practice and Mock Assessments.');
  };

  return (
    <div className="min-h-[100dvh] bg-[#F8FAFC] text-slate-900 safe-pad flex flex-col">
      <header className="bg-[#0F2942] text-white px-5 py-3.5 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            onBack();
          }}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-bold min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Game
        </button>
        <h2 className="font-display text-lg sm:text-xl font-bold truncate">
          Parent Dashboard & Learning Insights
        </h2>
        <div className="text-xs font-semibold text-amber-200 hidden sm:block">
          Saved Locally in Browser
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Disclaimer & Storage Note */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs sm:text-sm text-amber-950 space-y-1">
          <p className="font-bold">
            Assessment Note: Readiness labels and mock test scores use product-level mastery thresholds
            (approx. 80% recent independent accuracy) as an approximation of Grade 2 competencies, not an
            official DLSZ exam or a scientifically validated probability of passing.
          </p>
          <p>
            Progress is saved automatically in this browser&apos;s local storage (no login needed).
            Clearing browser storage will erase local progress unless you export a backup below.
          </p>
        </div>

        {/* Top Summary Strip */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <div className="text-xs font-bold text-slate-500">Completed Grade 2 Questions</div>
            <div className="text-3xl font-extrabold text-slate-900 tabular-nums mt-1">
              {overallTotal}
            </div>
            <div className="text-xs text-slate-600 mt-1 tabular-nums">
              {progress.completedHotspots.length} adventure landmarks restored
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <div className="text-xs font-bold text-slate-500">Independent Accuracy (No Hints)</div>
            <div className="text-3xl font-extrabold text-emerald-700 tabular-nums mt-1">
              {overallTotal >= 3 ? `${Math.round((overallIndepCount / overallTotal) * 100)}%` : '—'}
            </div>
            <div className="text-xs text-slate-600 mt-1 tabular-nums">
              {overallTotal >= 3
                ? `${overallIndepCount} solved independently on 1st try`
                : 'Not enough practice yet'}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <div className="text-xs font-bold text-slate-500">Solved After Hints</div>
            <div className="text-3xl font-extrabold text-amber-700 tabular-nums mt-1">
              {overallTotal >= 3 ? `${Math.round((overallHintCount / overallTotal) * 100)}%` : '—'}
            </div>
            <div className="text-xs text-slate-600 mt-1 tabular-nums">
              {overallHintCount} solved with graduated hints
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <div className="text-xs font-bold text-slate-500">Suggested Next Activity</div>
            <div className="text-sm font-extrabold text-slate-900 mt-1">{nextSuggestion.title}</div>
            <p className="text-xs text-slate-600 mt-1 leading-snug">{nextSuggestion.reason}</p>
          </div>
        </section>

        {/* 6 Primary Competencies + Pattern Creation Separate Tracking */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-display text-xl font-bold text-slate-900">
                Grade 2 Summative Readiness by Competency
              </h3>
              <p className="text-xs sm:text-sm text-slate-600">
                Each of the 6 core competencies is tracked separately. Topics with fewer than 3
                attempts show &ldquo;Not enough practice yet.&rdquo;
              </p>
            </div>
            <button
              type="button"
              onClick={onJumpToDay}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm min-h-[44px]"
            >
              Open 3-Day Review Plan
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {readinessSummaries.map((item) => (
              <div
                key={item.competency}
                className="rounded-xl border border-slate-200 p-4 flex flex-col justify-between gap-2"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 text-sm">{item.label}</span>
                    <span className="text-xs font-mono-num font-bold text-slate-500">
                      Tier {item.currentTier}
                    </span>
                  </div>
                  <div className="text-xs font-bold mt-1.5">
                    {item.status === 'insufficient' && (
                      <span className="text-slate-600">Not enough practice yet ({item.totalAttempts}/3)</span>
                    )}
                    {item.status === 'ready' && (
                      <span className="text-emerald-700">✓ {item.statusLabel}</span>
                    )}
                    {item.status === 'developing' && (
                      <span className="text-sky-700">● {item.statusLabel}</span>
                    )}
                    {item.status === 'needs_review' && (
                      <span className="text-orange-700">▲ {item.statusLabel}</span>
                    )}
                  </div>
                </div>

                {item.independentAccuracy !== null && (
                  <div className="text-xs text-slate-600 tabular-nums pt-2 border-t border-slate-100">
                    Without hints: <strong>{Math.round(item.independentAccuracy * 100)}%</strong> ·
                    With hints: <strong>{Math.round((item.hintAssistedRate ?? 0) * 100)}%</strong> ·{' '}
                    {item.totalAttempts} total
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Separate Increasing vs Decreasing Pattern Creation Tracking */}
          <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl bg-emerald-50/70 border border-emerald-200 p-4">
              <div className="text-xs font-bold text-emerald-900">
                Skill: Creating Increasing Patterns
              </div>
              <div className="text-lg font-extrabold text-emerald-950 tabular-nums mt-1">
                {progress.creationStats.increasingAttempts === 0
                  ? 'Not enough practice yet'
                  : `${progress.creationStats.increasingIndependent} / ${progress.creationStats.increasingAttempts} created independently`}
              </div>
            </div>
            <div className="rounded-xl bg-sky-50/70 border border-sky-200 p-4">
              <div className="text-xs font-bold text-sky-900">
                Skill: Creating Decreasing Patterns
              </div>
              <div className="text-lg font-extrabold text-sky-950 tabular-nums mt-1">
                {progress.creationStats.decreasingAttempts === 0
                  ? 'Not enough practice yet'
                  : `${progress.creationStats.decreasingIndependent} / ${progress.creationStats.decreasingAttempts} created independently`}
              </div>
            </div>
          </div>
        </section>

        {/* Topics Needing Review, Recent Mistakes & Mock Assessment Trend */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <h3 className="font-display text-lg font-bold text-slate-900">
              Topics Needing Review & Recent Mistakes
            </h3>
            {topicsNeedingReview.length > 0 ? (
              <div className="text-sm text-orange-800 bg-orange-50 border border-orange-200 rounded-xl p-3 font-semibold">
                Focus areas: {topicsNeedingReview.map((t) => t.label).join(', ')}
              </div>
            ) : (
              <div className="text-sm text-slate-600">
                No flagged weak competencies right now.
              </div>
            )}

            {recentMistakes.length === 0 ? (
              <p className="text-sm text-slate-500">No missed Grade 2 questions logged yet.</p>
            ) : (
              <ul className="space-y-2">
                {recentMistakes.map((m) => (
                  <li key={m.id} className="text-xs border border-slate-200 rounded-xl p-3 space-y-1">
                    <div className="font-bold text-slate-800">
                      {COMPETENCY_LABELS[m.competency]} · {m.promptSummary}
                    </div>
                    <div className="text-slate-600">
                      Answered: <span className="font-mono-num">{m.userAnswer}</span>
                      {m.misconceptionTags.length > 0 && (
                        <> · Misconception tag: {m.misconceptionTags.join(', ')}</>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h3 className="font-display text-lg font-bold text-slate-900">
              Mock Assessments & Session Trend
            </h3>
            {progress.mockTestResults.length === 0 ? (
              <p className="text-sm text-slate-500">
                No mock summative tests completed yet. Launch one from Summative Test Academy!
              </p>
            ) : (
              <ul className="space-y-2">
                {progress.mockTestResults.map((res, idx) => (
                  <li
                    key={res.id}
                    className="rounded-xl border border-slate-200 p-3 flex items-center justify-between text-sm"
                  >
                    <div>
                      <div className="font-bold text-slate-900">
                        Mock Test #{progress.mockTestResults.length - idx} (
                        {res.timed ? 'Timed' : 'Untimed'})
                      </div>
                      <div className="text-xs text-slate-500">
                        {new Date(res.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-lg font-extrabold text-emerald-700 tabular-nums">
                      {res.correctCount}/{res.totalQuestions} (
                      {Math.round((res.correctCount / res.totalQuestions) * 100)}%)
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* Separate Competition Progress */}
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2 font-bold text-indigo-950 text-sm">
                <Trophy className="w-4 h-4 text-amber-600" />
                Separate Competition Progress (Champion&apos;s Tower — Grades 3–5 Style)
              </div>
              <p className="text-xs text-slate-600 mt-1 tabular-nums">
                {competitionAttempts.length === 0
                  ? 'No optional competition puzzles attempted yet. Kept separate from Grade 2 school readiness.'
                  : `${competitionAttempts.filter((a) => a.correct).length} solved out of ${
                      competitionAttempts.length
                    } attempts (excluded from Grade 2 summative percentage).`}
              </p>
            </div>
          </section>
        </div>

        {/* Custom School Question Editor */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div>
            <h3 className="font-display text-lg font-bold text-slate-900">
              Add School-Specific Worksheet Questions
            </h3>
            <p className="text-xs sm:text-sm text-slate-600">
              Add examples from your child&apos;s DLSZ math worksheet or study guide so they appear
              in Topic Practice and Mock Tests.
            </p>
          </div>

          <form onSubmit={handleCreateCustomQuestion} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Competency</label>
              <select
                value={customComp}
                onChange={(e) => setCustomComp(e.target.value as CompetencyId)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm bg-white"
              >
                {(Object.keys(COMPETENCY_LABELS) as CompetencyId[]).map((c) => (
                  <option key={c} value={c}>
                    {COMPETENCY_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Prompt / Question Text
              </label>
              <input
                type="text"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="e.g., Find the next number in the skip-count sequence"
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Known Sequence Terms (comma-separated)
              </label>
              <input
                type="text"
                value={customSequenceStr}
                onChange={(e) => setCustomSequenceStr(e.target.value)}
                placeholder="3, 6, 9, 12"
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Correct Answer</label>
              <input
                type="text"
                value={customAnswer}
                onChange={(e) => setCustomAnswer(e.target.value)}
                placeholder="15"
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-mono-num"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Child-Friendly Explanation (Optional)
              </label>
              <input
                type="text"
                value={customExplanation}
                onChange={(e) => setCustomExplanation(e.target.value)}
                placeholder="We add 3 each time: 12 + 3 = 15."
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              />
            </div>
            <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm min-h-[44px]"
              >
                <Plus className="w-4 h-4" /> Add Question to Bank
              </button>
              {customAddedMsg && (
                <span className="text-xs font-bold text-emerald-800">{customAddedMsg}</span>
              )}
            </div>
          </form>

          {progress.customQuestions.length > 0 && (
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="text-xs font-bold text-slate-600">
                Saved School Questions ({progress.customQuestions.length})
              </div>
              {progress.customQuestions.map((cq) => (
                <div
                  key={cq.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-xs"
                >
                  <div>
                    <span className="font-bold">{cq.prompt}</span>{' '}
                    <span className="text-slate-500">
                      (Answer: {String(cq.correctAnswer)})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteCustomQuestion(cq.id)}
                    aria-label={`Remove custom question ${cq.prompt}`}
                    className="text-rose-700 hover:text-rose-900 p-1.5"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Parent Controls: Unlock Areas, Export/Import JSON, Reset */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <h3 className="font-display text-lg font-bold text-slate-900">
            Parent Controls & Progress Backup
          </h3>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onUnlockAllAreas();
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold text-sm min-h-[44px]"
            >
              <Unlock className="w-4 h-4" /> Unlock All Kingdom Areas ({AREA_ORDER.length}/
              {AREA_ORDER.length})
            </button>

            <button
              type="button"
              onClick={handleDownloadJson}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-sm min-h-[44px]"
            >
              <Download className="w-4 h-4" /> Export Progress JSON
            </button>

            <button
              type="button"
              onClick={() => setConfirmResetOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold text-sm min-h-[44px]"
            >
              <RotateCcw className="w-4 h-4" /> Reset All Progress
            </button>
          </div>

          <div className="text-xs text-slate-500">
            Currently unlocked: {progress.unlockedAreas.map((id: AreaId) => WORLD_AREAS[id].shortLabel).join(', ')}
          </div>

          {/* Optional JSON Import */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              Restore from Exported JSON Backup
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Paste exported JSON string here..."
                className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono-num"
              />
              <button
                type="button"
                onClick={handleImportSubmit}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs min-h-[44px]"
              >
                <Upload className="w-4 h-4" /> Import Backup
              </button>
            </div>
            {importStatus && <p className="text-xs font-semibold text-amber-800">{importStatus}</p>}
          </div>
        </section>
      </main>

      {/* Reset Confirmation Dialog */}
      {confirmResetOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-2.5 text-rose-700 font-extrabold text-lg">
              <AlertTriangle className="w-6 h-6" /> Reset All Progress?
            </div>
            <p className="text-sm text-slate-600">
              This will erase all restored kingdom areas, mock test history, and topic statistics on
              this device. Consider exporting a JSON backup first.
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmResetOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-sm min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onResetProgress();
                  setConfirmResetOpen(false);
                }}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm min-h-[44px]"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
