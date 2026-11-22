import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Lock,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type {
  AreaId,
  AttemptRecord,
  AudioSettings,
  MockTestResult,
  PlayerProgress,
  Question,
} from './types/game';
import { AREA_ORDER, WORLD_AREAS, type WorldHotspot } from './data/worldData';
import {
  generatePracticeQuestion,
  getHotspotQuestion,
} from './engine/questionBank';
import {
  isChampionsTowerUnlocked,
  recordAttemptIntoProgress,
} from './engine/adaptiveEngine';
import {
  addCustomSchoolQuestion,
  loadProgress,
  removeCustomSchoolQuestion,
  resetAndRefreshQuest,
  saveProgress,
  updateAudioSettings,
} from './storage/progressStore';
import { soundEngine } from './audio/soundEngine';
import { TitleScreen } from './components/modes/TitleScreen';
import { SummativeAcademy } from './components/modes/SummativeAcademy';
import { ThreeDayJourney } from './components/modes/ThreeDayJourney';
import { ParentDashboard } from './components/modes/ParentDashboard';
import { WorldSceneCanvas } from './components/art/WorldSceneCanvas';
import { PuzzleWorkspace, type PuzzleSubmissionPayload } from './components/puzzles/PuzzleWorkspace';

type AppScreen = 'title' | 'adventure' | 'academy' | 'journey' | 'parent';

export default function App() {
  const [progress, setProgress] = useState<PlayerProgress>(() => loadProgress());
  const [screen, setScreen] = useState<AppScreen>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        return 'adventure';
      }
    }
    return 'title';
  });

  const [activeArea, setActiveArea] = useState<AreaId>('counting_grove');
  const [activeHotspot, setActiveHotspot] = useState<WorldHotspot | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);
  const [puzzleSolvedBanner, setPuzzleSolvedBanner] = useState<string | null>(null);
  const [celebratingHotspotId, setCelebratingHotspotId] = useState<string | null>(null);
  const [unlockNotice, setUnlockNotice] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [audioPopoverOpen, setAudioPopoverOpen] = useState(false);
  const [academyMockDirect, setAcademyMockDirect] = useState(false);
  const [kingdomVictoryModal, setKingdomVictoryModal] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  // Sync soundEngine with persisted audioSettings
  useEffect(() => {
    soundEngine.updateSettings(progress.audioSettings);
  }, [progress.audioSettings]);

  // Mirror state machine to document.body.dataset.state
  useEffect(() => {
    if (kingdomVictoryModal) {
      document.body.dataset.state = 'gameover';
    } else if (paused) {
      document.body.dataset.state = 'paused';
    } else if (screen === 'title') {
      document.body.dataset.state = 'title';
    } else {
      document.body.dataset.state = 'playing';
    }
  }, [screen, paused, kingdomVictoryModal]);

  // Global Pause shortcut (Escape or P) in Adventure mode
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (confirmResetOpen && e.key === 'Escape') {
        setConfirmResetOpen(false);
        return;
      }
      if (screen !== 'adventure') return;
      if (e.key === 'Escape') {
        if (activeHotspot) {
          setActiveHotspot(null);
          setActiveQuestion(null);
          setPuzzleSolvedBanner(null);
        } else if (audioPopoverOpen) {
          setAudioPopoverOpen(false);
        } else {
          setPaused((p) => !p);
        }
      } else if (e.key.toLowerCase() === 'p' && !activeHotspot && !confirmResetOpen) {
        setPaused((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screen, activeHotspot, audioPopoverOpen, confirmResetOpen]);

  const persistUpdate = useCallback((updater: (prev: PlayerProgress) => PlayerProgress) => {
    setProgress((prev) => {
      const next = updater(prev);
      saveProgress(next);
      return next;
    });
  }, []);

  const handleRecordAttempt = useCallback(
    (attempt: AttemptRecord) => {
      persistUpdate((prev) => {
        const updated = recordAttemptIntoProgress(prev, attempt);
        // Check Champion's Tower unlock dynamically
        if (
          !updated.unlockedAreas.includes('champions_tower') &&
          isChampionsTowerUnlocked(updated)
        ) {
          updated.unlockedAreas = [...updated.unlockedAreas, 'champions_tower'];
          setUnlockNotice("Optional Champion's Tower unlocked for advanced math challenges!");
        }
        return updated;
      });
    },
    [persistUpdate]
  );

  const handleAudioChange = (patch: Partial<AudioSettings>) => {
    soundEngine.unlockFromGesture();
    persistUpdate((prev) => updateAudioSettings(prev, { ...prev.audioSettings, ...patch }));
  };

  const handleSelectHotspot = useCallback(
    (hotspot: WorldHotspot) => {
      soundEngine.unlockFromGesture();
      soundEngine.playClick();
      const q = getHotspotQuestion(hotspot.questionId, progress.questSeed ?? 0);
      setActiveHotspot(hotspot);
      setActiveQuestion(q);
      setPuzzleSolvedBanner(null);
    },
    [progress.questSeed]
  );

  const handleAdventureSolved = (res: PuzzleSubmissionPayload) => {
    if (!activeQuestion || !activeHotspot) return;

    const attempt: AttemptRecord = {
      id: `adv-${Date.now()}`,
      timestamp: Date.now(),
      questionId: activeQuestion.id,
      competency: activeQuestion.competency,
      creationSkill: activeQuestion.creationSkill,
      tier: activeQuestion.tier,
      isCompetition: Boolean(activeQuestion.isCompetition),
      mode: activeArea === 'champions_tower' ? 'champions_tower' : 'adventure',
      correct: res.isCorrect,
      independent: res.independent,
      hintsUsed: res.hintsUsed,
      attemptsCount: res.attemptsCount,
      userAnswer: res.userAnswerLabel,
      misconceptionTags: res.misconceptionTags,
      promptSummary: activeQuestion.prompt,
    };

    persistUpdate((prev) => {
      let next = recordAttemptIntoProgress(prev, attempt);
      if (!next.completedHotspots.includes(activeHotspot.id)) {
        next = {
          ...next,
          completedHotspots: [...next.completedHotspots, activeHotspot.id],
          collectedRelics: [...next.collectedRelics, activeHotspot.relicName],
        };
      }

      // Check area progression unlocks (2 solved in current area unlocks next area)
      const areaMeta = WORLD_AREAS[activeHotspot.areaId];
      const solvedInArea = areaMeta.hotspots.filter((h) =>
        next.completedHotspots.includes(h.id)
      ).length;

      if (
        areaMeta.nextAreaId &&
        areaMeta.nextAreaId !== 'champions_tower' &&
        solvedInArea >= 2 &&
        !next.unlockedAreas.includes(areaMeta.nextAreaId)
      ) {
        next = {
          ...next,
          unlockedAreas: [...next.unlockedAreas, areaMeta.nextAreaId],
        };
        soundEngine.playAreaUnlock();
        setUnlockNotice(`New Area Unlocked: ${WORLD_AREAS[areaMeta.nextAreaId].name}!`);
      }

      if (
        !next.unlockedAreas.includes('champions_tower') &&
        isChampionsTowerUnlocked(next)
      ) {
        next = {
          ...next,
          unlockedAreas: [...next.unlockedAreas, 'champions_tower'],
        };
        setUnlockNotice("Champion's Tower Unlocked! (Optional competition challenges)");
      }

      // Check if all 15 core adventure hotspots (Areas 1–4) are restored
      const mainHotspotIds = (['counting_grove', 'enchanted_garden', 'rhythm_woods', 'castle_sequences'] as AreaId[])
        .flatMap((id) => WORLD_AREAS[id].hotspots.map((h) => h.id));
      const allMainRestored = mainHotspotIds.every((id) => next.completedHotspots.includes(id));
      if (allMainRestored && activeQuestion.id === activeHotspot.questionId) {
        window.setTimeout(() => setKingdomVictoryModal(true), 800);
      }

      return next;
    });

    setPuzzleSolvedBanner(activeHotspot.worldEffectText);
    setCelebratingHotspotId(activeHotspot.id);
    window.setTimeout(() => setCelebratingHotspotId(null), 1600);
  };

  const handleLoadFreshBonusQuestion = () => {
    if (!activeQuestion) return;
    soundEngine.playClick();
    const fresh = generatePracticeQuestion(
      activeQuestion.competency,
      Math.min(2, progress.competencyStats[activeQuestion.competency].currentTier) as 1 | 2,
      Date.now() % 100000,
      progress.customQuestions
    );
    setActiveQuestion(fresh);
    setPuzzleSolvedBanner(null);
  };

  const startAdventure = () => {
    soundEngine.unlockFromGesture();
    soundEngine.playClick();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setPaused(false);
    setScreen('adventure');
  };

  const handleConfirmResetAndRefresh = useCallback(() => {
    soundEngine.unlockFromGesture();
    soundEngine.playAreaUnlock();
    const refreshed = resetAndRefreshQuest(progress);
    setProgress(refreshed);
    setActiveArea('counting_grove');
    setActiveHotspot(null);
    setActiveQuestion(null);
    setPuzzleSolvedBanner(null);
    setCelebratingHotspotId(null);
    setUnlockNotice('New quest started from the beginning with fresh math questions!');
    setPaused(false);
    setKingdomVictoryModal(false);
    setConfirmResetOpen(false);
    setScreen('adventure');
  }, [progress]);

  const resetConfirmationDialog = confirmResetOpen ? (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Start Over from the Beginning"
      className="fixed inset-0 z-50 bg-[#0B1724]/70 backdrop-blur-none flex items-center justify-center p-4"
    >
      <div className="fantasy-parchment rounded-3xl max-w-md w-full p-6 space-y-4 text-center shadow-2xl border-2 border-amber-700/75 ring-4 ring-amber-400/20">
        <div className="w-12 h-12 rounded-2xl bg-amber-100 border-2 border-amber-600/60 text-amber-800 flex items-center justify-center mx-auto">
          <RotateCcw className="w-6 h-6" />
        </div>
        <h3 className="font-display text-2xl font-bold text-stone-900">
          Start a Brand-New Quest?
        </h3>
        <p className="text-sm text-stone-700 leading-relaxed font-medium">
          This clears your restored landmarks, mock test scores, and 3-day progress, starts back at
          The Counting Grove, and refreshes all math puzzles with new questions. Sound settings and
          Parent custom questions stay saved.
        </p>
        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setConfirmResetOpen(false);
            }}
            className="fantasy-stone-tile flex-1 py-3 px-4 rounded-xl border border-amber-700/50 text-stone-900 font-bold min-h-[48px] whitespace-nowrap"
          >
            Keep Playing
          </button>
          <button
            type="button"
            onClick={handleConfirmResetAndRefresh}
            className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-b from-amber-300 to-amber-500 hover:brightness-105 text-stone-950 font-extrabold border border-amber-800 shadow-[0_3px_0_#92400E] min-h-[48px] whitespace-nowrap"
          >
            <RotateCcw className="w-4 h-4" /> Start Over &amp; Refresh
          </button>
        </div>
      </div>
    </div>
  ) : null;

  const unlockedSet = useMemo(() => new Set(progress.unlockedAreas), [progress.unlockedAreas]);

  if (screen === 'title') {
    return (
      <>
        <TitleScreen
          hasExistingProgress={progress.completedHotspots.length > 0 || progress.attempts.length > 0}
          solvedCount={progress.completedHotspots.length}
          muted={progress.audioSettings.muted}
          onToggleMute={() => handleAudioChange({ muted: !progress.audioSettings.muted })}
          onStartAdventure={startAdventure}
          onOpenAcademy={() => {
            soundEngine.unlockFromGesture();
            setAcademyMockDirect(false);
            setScreen('academy');
          }}
          onOpenJourney={() => {
            soundEngine.unlockFromGesture();
            setScreen('journey');
          }}
          onOpenParent={() => {
            soundEngine.unlockFromGesture();
            setScreen('parent');
          }}
          onRequestResetAndRefresh={() => {
            soundEngine.unlockFromGesture();
            soundEngine.playClick();
            setConfirmResetOpen(true);
          }}
        />
        {resetConfirmationDialog}
      </>
    );
  }

  if (screen === 'academy') {
    return (
      <SummativeAcademy
        key={`academy-${progress.questSeed ?? 0}`}
        progress={progress}
        startDirectlyInMockTest={academyMockDirect}
        onRecordAttempt={handleRecordAttempt}
        onSaveMockResult={(result: MockTestResult) => {
          persistUpdate((prev) => ({
            ...prev,
            mockTestResults: [result, ...prev.mockTestResults].slice(0, 20),
          }));
        }}
        onCompleteDiagnostic={() => {
          persistUpdate((prev) => ({ ...prev, diagnosticCompleted: true }));
        }}
        onBack={() => setScreen('adventure')}
      />
    );
  }

  if (screen === 'journey') {
    return (
      <ThreeDayJourney
        key={`journey-${progress.questSeed ?? 0}`}
        progress={progress}
        onRecordAttempt={handleRecordAttempt}
        onCompleteDiagnostic={() => {
          persistUpdate((prev) => ({ ...prev, diagnosticCompleted: true }));
        }}
        onCompleteDay={(day) => {
          persistUpdate((prev) => ({
            ...prev,
            completedDays: prev.completedDays.includes(day)
              ? prev.completedDays
              : [...prev.completedDays, day],
          }));
        }}
        onLaunchMockTest={() => {
          setAcademyMockDirect(true);
          setScreen('academy');
        }}
        onBack={() => setScreen('adventure')}
      />
    );
  }

  if (screen === 'parent') {
    return (
      <ParentDashboard
        progress={progress}
        onUnlockAllAreas={() => {
          persistUpdate((prev) => ({
            ...prev,
            unlockedAreas: [...AREA_ORDER],
          }));
        }}
        onAddCustomQuestion={(q) => {
          persistUpdate((prev) => addCustomSchoolQuestion(prev, q));
        }}
        onDeleteCustomQuestion={(id) => {
          persistUpdate((prev) => removeCustomSchoolQuestion(prev, id));
        }}
        onImportProgress={(next) => {
          setProgress(next);
        }}
        onResetProgress={() => {
          setProgress((prev) => resetAndRefreshQuest(prev));
          setActiveArea('counting_grove');
        }}
        onJumpToDay={() => setScreen('journey')}
        onBack={() => setScreen('adventure')}
      />
    );
  }

  // === ADVENTURE MODE (Full-Viewport 2D World Explorer + World-Matched HUD) ===
  const currentAreaMeta = WORLD_AREAS[activeArea];

  return (
    <div className="h-[100dvh] w-full bg-[#112233] flex flex-col overflow-hidden safe-pad">
      {/* Compact Timber & Brass Kingdom HUD Strip */}
      <div className="bg-gradient-to-b from-[#1A3046] to-[#122334] text-amber-50 px-3 sm:px-4 py-2 flex flex-wrap lg:flex-nowrap items-center justify-between gap-2 border-b-2 border-amber-500/35 shrink-0 shadow-md">
        {/* Area Switcher Tabs */}
        <nav className="flex items-center gap-1.5 overflow-x-auto py-0.5 min-w-0" aria-label="Kingdom regions">
          {AREA_ORDER.map((areaId) => {
            const area = WORLD_AREAS[areaId];
            const isUnlocked = unlockedSet.has(areaId);
            const isCurrent = activeArea === areaId;
            const solvedHere = area.hotspots.filter((h) =>
              progress.completedHotspots.includes(h.id)
            ).length;

            return (
              <button
                key={areaId}
                type="button"
                disabled={!isUnlocked}
                onClick={() => {
                  soundEngine.playClick();
                  setActiveArea(areaId);
                  setUnlockNotice(null);
                }}
                title={!isUnlocked ? area.unlockRequirementText : area.name}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 min-h-[38px] border transition-all ${
                  isCurrent
                    ? 'bg-gradient-to-b from-amber-300 to-amber-500 border-amber-800 text-stone-950 shadow-[0_2px_0_#92400E]'
                    : isUnlocked
                      ? 'bg-[#213B54] hover:bg-[#2A4967] border-amber-400/25 text-amber-50'
                      : 'bg-white/5 border-white/10 text-slate-400 opacity-65 cursor-not-allowed'
                }`}
              >
                {!isUnlocked && <Lock className="w-3 h-3" />}
                <span>{area.shortLabel}</span>
                <span className="font-mono-num opacity-85">
                  {solvedHere}/{area.hotspots.length}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Right HUD Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#213B54] border border-amber-400/30 text-amber-200 text-xs font-bold tabular-nums">
            <Award className="w-4 h-4 text-amber-300" />
            <span>{progress.collectedRelics.length} Shards</span>
          </div>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setScreen('journey');
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-b from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 border border-emerald-400/40 text-white text-xs font-bold min-h-[38px] whitespace-nowrap shadow-xs"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">3-Day Plan</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setAcademyMockDirect(false);
              setScreen('academy');
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-b from-sky-600 to-sky-800 hover:from-sky-500 hover:to-sky-700 border border-sky-300/35 text-white text-xs font-bold min-h-[38px] whitespace-nowrap shadow-xs"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Test Academy</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setScreen('parent');
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#213B54] hover:bg-[#2A4967] border border-amber-400/30 text-amber-200 text-xs font-bold min-h-[38px] whitespace-nowrap"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Parent</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setConfirmResetOpen(true);
            }}
            title="Start over from the beginning & refresh questions"
            aria-label="Start over and refresh questions"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#213B54] hover:bg-[#2A4967] border border-amber-400/30 text-amber-200 text-xs font-bold min-h-[38px] whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">New Quest</span>
          </button>

          {/* Audio Controls Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setAudioPopoverOpen((o) => !o)}
              aria-label="Audio settings"
              className="w-10 h-10 rounded-xl bg-[#213B54] hover:bg-[#2A4967] border border-amber-400/30 flex items-center justify-center"
            >
              {progress.audioSettings.muted ? (
                <VolumeX className="w-4 h-4 text-rose-300" />
              ) : (
                <Volume2 className="w-4 h-4 text-amber-200" />
              )}
            </button>
            {audioPopoverOpen && (
              <div className="fantasy-parchment absolute right-0 mt-2 w-60 text-stone-900 rounded-2xl shadow-2xl border-2 border-amber-700/75 p-4 z-40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-display text-sm font-bold text-stone-900">Sound & Music</span>
                  <button
                    type="button"
                    onClick={() => handleAudioChange({ muted: !progress.audioSettings.muted })}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                      progress.audioSettings.muted
                        ? 'bg-rose-100 border-rose-300 text-rose-900'
                        : 'bg-emerald-100 border-emerald-400 text-emerald-900'
                    }`}
                  >
                    {progress.audioSettings.muted ? 'Muted' : 'Audio On'}
                  </button>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Music Volume ({Math.round(progress.audioSettings.musicVolume * 100)}%)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={progress.audioSettings.musicVolume}
                    onChange={(e) => handleAudioChange({ musicVolume: Number(e.target.value) })}
                    className="w-full accent-amber-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Effects & Rhythm ({Math.round(progress.audioSettings.sfxVolume * 100)}%)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={progress.audioSettings.sfxVolume}
                    onChange={(e) => handleAudioChange({ sfxVolume: Number(e.target.value) })}
                    className="w-full accent-emerald-700"
                  />
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setPaused(true)}
            aria-label="Pause game"
            className="w-10 h-10 rounded-xl bg-[#213B54] hover:bg-[#2A4967] border border-amber-400/30 flex items-center justify-center"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Unlock Banner */}
      {unlockNotice && (
        <div className="bg-gradient-to-r from-amber-300 via-amber-200 to-amber-300 border-b border-amber-700/40 text-stone-950 px-4 py-2 text-xs sm:text-sm font-extrabold flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-800 shrink-0" />
            <span>{unlockNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setUnlockNotice(null)}
            aria-label="Dismiss notification"
            className="p-1 rounded hover:bg-amber-400/60"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Playable 2D World Stage */}
      <main className="flex-1 p-2 sm:p-3 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 relative">
          <WorldSceneCanvas
            areaId={activeArea}
            questSeed={progress.questSeed ?? 0}
            completedHotspots={progress.completedHotspots}
            celebratingHotspotId={celebratingHotspotId}
            onSelectHotspot={handleSelectHotspot}
          />
        </div>
        <div className="pt-1.5 px-2 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-100/90 shrink-0">
          <span>
            <strong className="font-display text-amber-300">{currentAreaMeta.name}:</strong>{' '}
            {currentAreaMeta.description}
          </span>
          {currentAreaMeta.nextAreaId && !unlockedSet.has(currentAreaMeta.nextAreaId) && (
            <span className="text-amber-200 font-semibold">
              {WORLD_AREAS[currentAreaMeta.nextAreaId].unlockRequirementText}
            </span>
          )}
        </div>
      </main>

      {/* === INTERACTIVE STORYBOOK PUZZLE TABLET === */}
      {activeHotspot && activeQuestion && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={activeHotspot.title}
          className="fixed inset-0 z-40 bg-[#0B1724]/65 backdrop-blur-none flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
        >
          <div className="fantasy-parchment rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-[0_24px_60px_rgba(12,18,28,0.65)] border-2 border-amber-700/70 ring-4 ring-amber-400/20 space-y-4 my-auto">
            <div className="flex items-start justify-between gap-3 border-b-2 border-amber-700/20 pb-3">
              <div>
                <div className="font-display text-sm font-bold text-amber-900">
                  {WORLD_AREAS[activeHotspot.areaId].name} · {activeHotspot.title}
                </div>
                <div className="text-xs font-semibold text-stone-600 mt-0.5">
                  {activeQuestion.isCompetition
                    ? "Optional Champion's Tower Challenge (Grades 3–5 reasoning)"
                    : `Grade 2 Pattern Quest · Tier ${activeQuestion.tier}`}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setActiveHotspot(null);
                  setActiveQuestion(null);
                  setPuzzleSolvedBanner(null);
                }}
                aria-label="Close puzzle"
                className="fantasy-stone-tile w-10 h-10 rounded-xl border border-amber-700/50 text-stone-800 hover:brightness-105 flex items-center justify-center shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <PuzzleWorkspace
              key={`${activeQuestion.id}-${progress.questSeed ?? 0}`}
              question={activeQuestion}
              onSolved={handleAdventureSolved}
            />

            {puzzleSolvedBanner && (
              <div className="rounded-2xl bg-gradient-to-r from-emerald-700 via-emerald-800 to-teal-800 border-2 border-amber-400/60 text-white p-4 space-y-3 shadow-lg">
                <div className="flex items-center gap-2.5 font-extrabold text-base">
                  <CheckCircle2 className="w-6 h-6 text-amber-300 shrink-0" />
                  <span>World Restored: {puzzleSolvedBanner}</span>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleLoadFreshBonusQuestion}
                    className="px-4 py-2.5 rounded-xl bg-emerald-950/65 hover:bg-emerald-950 border border-emerald-300/35 text-amber-50 font-bold text-xs sm:text-sm min-h-[44px]"
                  >
                    Try Another Generated Puzzle
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setActiveHotspot(null);
                      setActiveQuestion(null);
                      setPuzzleSolvedBanner(null);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-b from-amber-300 to-amber-500 hover:brightness-105 text-stone-950 font-extrabold text-sm border border-amber-800 shadow-[0_2px_0_#92400E] min-h-[44px]"
                  >
                    Return to {WORLD_AREAS[activeHotspot.areaId].shortLabel}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* === PAUSE MODAL === */}
      {paused && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Game Paused"
          className="fixed inset-0 z-50 bg-[#0B1724]/70 backdrop-blur-none flex items-center justify-center p-4"
        >
          <div className="fantasy-parchment rounded-3xl max-w-sm w-full p-6 space-y-5 text-center shadow-2xl border-2 border-amber-700/75">
            <h3 className="font-display text-2xl font-bold text-stone-900">Adventure Paused</h3>
            <div className="grid grid-cols-2 gap-3 text-left bg-amber-100/60 rounded-2xl p-3 border border-amber-700/30">
              <div>
                <div className="text-xs font-bold text-stone-600">Landmarks</div>
                <div className="text-xl font-extrabold text-stone-900 tabular-nums">
                  {progress.completedHotspots.length}/15
                </div>
              </div>
              <div>
                <div className="text-xs font-bold text-stone-600">Shards Found</div>
                <div className="text-xl font-extrabold text-amber-800 tabular-nums">
                  {progress.collectedRelics.length}
                </div>
              </div>
            </div>
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => setPaused(false)}
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-b from-amber-300 to-amber-500 hover:brightness-105 text-stone-950 font-extrabold border border-amber-800 shadow-[0_3px_0_#92400E] min-h-[48px] whitespace-nowrap"
              >
                <Play className="w-5 h-5" /> Resume Adventure
              </button>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setPaused(false);
                  setConfirmResetOpen(true);
                }}
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[#162C42] hover:bg-[#1E3B58] text-amber-100 font-bold border border-amber-400/40 min-h-[48px] whitespace-nowrap"
              >
                <RotateCcw className="w-4 h-4 text-amber-300" /> Start Over &amp; Refresh Questions
              </button>
              <button
                type="button"
                onClick={() => {
                  setPaused(false);
                  setScreen('title');
                }}
                className="fantasy-stone-tile w-full py-3 rounded-xl border border-amber-700/50 text-stone-900 font-bold min-h-[48px] whitespace-nowrap"
              >
                Return to Title Screen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === KINGDOM RESTORED CELEBRATION MODAL === */}
      {kingdomVictoryModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Kingdom Restored"
          className="fixed inset-0 z-50 bg-[#0B1724]/75 backdrop-blur-none flex items-center justify-center p-4"
        >
          <div className="fantasy-parchment rounded-3xl max-w-md w-full p-7 space-y-5 text-center shadow-2xl border-2 border-amber-600 ring-4 ring-amber-300/40">
            <Sparkles className="w-14 h-14 text-amber-600 mx-auto" />
            <h3 className="font-display text-3xl font-bold text-stone-900">
              The Great Sequence Crystal Shines!
            </h3>
            <p className="text-sm text-stone-700 font-medium">
              You restored all four regions of The Pattern Kingdom! Ready to prove your powers on
              the 20-question Mock Summative Test or try the Champion&apos;s Tower?
            </p>
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setKingdomVictoryModal(false);
                  setAcademyMockDirect(true);
                  setScreen('academy');
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-b from-amber-300 to-amber-500 hover:brightness-105 text-stone-950 font-extrabold border border-amber-800 shadow-[0_3px_0_#92400E] min-h-[48px]"
              >
                Take 20-Question Mock Test
              </button>
              <button
                type="button"
                onClick={() => setKingdomVictoryModal(false)}
                className="w-full py-3 rounded-xl bg-[#162C42] hover:bg-[#1E3B58] text-amber-50 font-bold border border-amber-400/35 min-h-[48px]"
              >
                Keep Exploring Kingdom
              </button>
            </div>
          </div>
        </div>
      )}

      {resetConfirmationDialog}
    </div>
  );
}
