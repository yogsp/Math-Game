import type { SequenceItem } from '../../types/game';

/**
 * Visual difference / jump-arc scaffolding shown when Hint 1 or Hint 2 is active
 * on numerical or alphabetical sequences so the child sees the mathematical jump!
 */
export function JumpArcScaffold({
  sequence,
  stepDelta,
  showValues,
}: {
  sequence: SequenceItem[];
  stepDelta?: number;
  showValues: boolean;
}) {
  const isAlpha = sequence.some((s) => s.kind === 'letter');
  const label =
    stepDelta !== undefined
      ? isAlpha
        ? stepDelta > 0
          ? `+${stepDelta} letters`
          : `${stepDelta} letters`
        : stepDelta > 0
          ? `+${stepDelta}`
          : `${stepDelta}`
      : '?';

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-4 py-1 text-xs font-mono-num font-bold text-amber-800" aria-hidden="true">
      {sequence.slice(0, -1).map((_, idx) => (
        <div key={idx} className="flex flex-col items-center">
          <svg width="54" height="22" viewBox="0 0 54 22" className="overflow-visible">
            <path
              d="M4 20 Q27 -2 50 20"
              fill="none"
              stroke="#D97706"
              strokeWidth="2.5"
              strokeDasharray={showValues ? undefined : '4 3'}
            />
            <polygon points="50,20 43,16 47,12" fill="#D97706" />
          </svg>
          <span className="px-1.5 py-0.5 rounded bg-amber-100 border border-amber-300 text-[11px]">
            {showValues ? label : '?'}
          </span>
        </div>
      ))}
    </div>
  );
}
