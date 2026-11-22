import React, { useEffect } from 'react';
import { BookOpen, Calendar, Compass, RotateCcw, ShieldCheck, Volume2, VolumeX } from 'lucide-react';
import { PatternGuardianSprite } from '../art/KingdomCharacter';

interface TitleScreenProps {
  hasExistingProgress: boolean;
  solvedCount: number;
  muted: boolean;
  onToggleMute: () => void;
  onStartAdventure: () => void;
  onOpenAcademy: () => void;
  onOpenJourney: () => void;
  onOpenParent: () => void;
  onRequestResetAndRefresh: () => void;
}

const TITLE_FIREFLIES = [
  { left: '54%', top: '34%', delay: '0s', size: 6 },
  { left: '63%', top: '52%', delay: '1.2s', size: 5 },
  { left: '72%', top: '28%', delay: '2.1s', size: 6 },
  { left: '81%', top: '46%', delay: '0.6s', size: 7 },
  { left: '89%', top: '62%', delay: '1.8s', size: 5 },
  { left: '68%', top: '72%', delay: '2.6s', size: 6 },
];

export function TitleScreen({
  hasExistingProgress,
  solvedCount,
  muted,
  onToggleMute,
  onStartAdventure,
  onOpenAcademy,
  onOpenJourney,
  onOpenParent,
  onRequestResetAndRefresh,
}: TitleScreenProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'BUTTON' || tag === 'A') return;
        e.preventDefault();
        onStartAdventure();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onStartAdventure]);

  return (
    <div className="relative w-full h-full min-h-[100dvh] overflow-y-auto overflow-x-hidden flex flex-col justify-between bg-[#0D2238] text-white safe-pad">
      {/* Hand-Painted Storybook Kingdom Panorama Backdrop */}
      <img
        src="/src/assets/images/title_kingdom_panorama_1795336831632.jpg"
        referrerPolicy="no-referrer"
        alt=""
        aria-hidden="true"
        className="fixed inset-0 w-full h-full object-cover object-right pointer-events-none"
      />

      {/* Seamless Left-Side Twilight Scrim (dissolves sky edge & creates legible negative space) */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, #0D2238 0%, #0D2238 26%, rgba(13,34,56,0.94) 37%, rgba(13,34,56,0.58) 52%, rgba(13,34,56,0.14) 72%, transparent 100%), linear-gradient(180deg, rgba(13,34,56,0.42) 0%, transparent 22%, transparent 78%, rgba(13,34,56,0.68) 100%)',
        }}
      />

      {/* Ambient Floating Kingdom Fireflies */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {TITLE_FIREFLIES.map((mote, i) => (
          <span
            key={i}
            style={{
              left: mote.left,
              top: mote.top,
              width: `${mote.size}px`,
              height: `${mote.size}px`,
              animationDelay: mote.delay,
            }}
            className="absolute rounded-full bg-amber-200/90 shadow-[0_0_12px_rgba(253,224,71,0.95)] animate-mote-drift"
          />
        ))}
      </div>

      {/* Top Minimal Utility Row */}
      <div className="relative z-10 flex items-center justify-between px-5 sm:px-8 pt-4">
        <span className="text-xs sm:text-sm font-semibold text-amber-100/90 tracking-wide">
          Grade 2 Pattern Adventure · DLSZ Study Companion
        </span>
        <button
          type="button"
          onClick={onToggleMute}
          aria-label={muted ? 'Unmute sound' : 'Mute sound'}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#13293D]/80 hover:bg-[#19354F] border border-amber-400/35 text-xs font-bold text-amber-50 min-h-[44px] shadow-md"
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-amber-300" />}
          <span className="hidden sm:inline">{muted ? 'Sound Off' : 'Sound On'}</span>
        </button>
      </div>

      {/* Main Hero Lockup (Left / Center Negative-Space Composition) */}
      <main className="relative z-10 max-w-7xl w-full mx-auto px-5 sm:px-10 py-6 flex flex-col lg:flex-row items-center justify-between gap-8">
        <div className="max-w-xl space-y-5 text-center lg:text-left">
          {/* Bespoke Crest Lockup */}
          <div className="inline-flex items-center gap-3 bg-[#142D44]/75 border border-amber-400/35 rounded-2xl px-3.5 py-1.5 shadow-md">
            <svg width="36" height="36" viewBox="0 0 48 48" aria-hidden="true" className="shrink-0">
              <polygon points="24,3 38,24 24,45 10,24" fill="#38BDF8" stroke="#FDE68A" strokeWidth="3" />
              <polygon points="24,11 31,24 24,37 17,24" fill="#E0F2FE" opacity="0.85" />
            </svg>
            <span className="font-display text-sm font-bold text-amber-200 tracking-wide">
              Quest of the Lost Sequences
            </span>
          </div>

          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.06] text-amber-50 drop-shadow-[0_4px_14px_rgba(0,0,0,0.55)] text-balance">
            The Pattern Kingdom
          </h1>

          <p className="text-base sm:text-lg text-sky-100/95 leading-relaxed max-w-lg mx-auto lg:mx-0 drop-shadow">
            Restore shattered bridges, singing flowers, and castle gates by discovering, extending,
            and creating mathematical patterns.
          </p>

          {/* Primary + Focused Mode Actions (Tactile Fantasy Buttons) */}
          <div className="space-y-3 pt-1">
            <div className="flex flex-col sm:flex-row sm:flex-nowrap items-stretch sm:items-center justify-center lg:justify-start gap-3">
              <button
                type="button"
                data-start="true"
                onClick={onStartAdventure}
                className="inline-flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 hover:brightness-105 active:scale-[0.99] text-stone-950 font-extrabold text-lg border-2 border-amber-800/70 shadow-[0_4px_0_#92400E,0_10px_24px_rgba(0,0,0,0.4)] transition-all min-h-[56px] whitespace-nowrap"
              >
                <Compass className="w-6 h-6" />
                {hasExistingProgress ? `Continue Quest (${solvedCount} Restored)` : 'Start Adventure'}
              </button>

              <button
                type="button"
                onClick={onOpenJourney}
                className="inline-flex items-center justify-center gap-2 px-5 py-4 rounded-2xl bg-gradient-to-b from-emerald-600 to-emerald-800 hover:from-emerald-500 hover:to-emerald-700 border-2 border-emerald-400/50 text-white font-bold text-base shadow-[0_4px_0_#064E3B,0_8px_18px_rgba(0,0,0,0.35)] transition-all min-h-[56px] whitespace-nowrap"
              >
                <Calendar className="w-5 h-5" />
                3-Day Review
              </button>

              <button
                type="button"
                onClick={onOpenAcademy}
                className="inline-flex items-center justify-center gap-2 px-5 py-4 rounded-2xl bg-gradient-to-b from-[#1D3B56] to-[#13283C] hover:from-[#244868] hover:to-[#18334C] border-2 border-amber-400/45 text-amber-50 font-bold text-base shadow-[0_4px_0_#091724,0_8px_18px_rgba(0,0,0,0.35)] transition-all min-h-[56px] whitespace-nowrap"
              >
                <BookOpen className="w-5 h-5 text-amber-300" />
                Test Academy
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2">
              <button
                type="button"
                onClick={onOpenParent}
                className="inline-flex items-center gap-2 text-sm font-bold text-amber-200 hover:text-amber-100 underline underline-offset-4 py-1.5 px-1 min-h-[44px] whitespace-nowrap"
              >
                <ShieldCheck className="w-4 h-4" />
                Parent Dashboard &amp; Progress Report
              </button>

              <button
                type="button"
                onClick={onRequestResetAndRefresh}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#13293D]/85 hover:bg-[#19354F] border border-amber-400/35 text-xs sm:text-sm font-bold text-amber-100 hover:text-amber-50 min-h-[44px] whitespace-nowrap shadow-sm"
              >
                <RotateCcw className="w-4 h-4 text-amber-300" />
                {hasExistingProgress ? 'Start Over & New Questions' : 'New Quest & Questions'}
              </button>
            </div>
          </div>
        </div>

        {/* Diegetic Guardian Character Showcase on the Painted Path */}
        <div className="relative flex flex-col items-center lg:mr-28 lg:mt-24">
          <div className="relative p-2">
            <PatternGuardianSprite state="idle" facing="right" className="w-36 h-44 sm:w-44 sm:h-52" />
          </div>
          <div className="fantasy-parchment border-2 border-amber-700/80 rounded-2xl px-4 py-2 text-xs sm:text-sm font-bold text-stone-900 shadow-[0_8px_20px_rgba(0,0,0,0.4)] whitespace-nowrap">
            Ready to restore the Great Sequence Crystal!
          </div>
        </div>
      </main>

      {/* Quiet Bottom Control & Disclaimer Strip */}
      <footer className="relative z-10 px-5 sm:px-8 pb-4 pt-2 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-amber-100/85">
        <span>Touch D-pad, Tap-to-Walk, or Keyboard WASD / Arrows · Press Enter to Start</span>
        <span>Practice approximation of Grade 2 competencies (not an official DLSZ exam)</span>
      </footer>
    </div>
  );
}
