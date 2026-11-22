import type { RhythmToken, VisualColor, VisualSize, VisualToken } from '../../types/game';

const COLOR_MAP: Record<VisualColor, { fill: string; stroke: string; light: string }> = {
  amber: { fill: '#F59E0B', stroke: '#92400E', light: '#FEF3C7' },
  sky: { fill: '#0EA5E9', stroke: '#075985', light: '#E0F2FE' },
  rose: { fill: '#EC4899', stroke: '#9D174D', light: '#FCE7F3' },
  emerald: { fill: '#10B981', stroke: '#065F46', light: '#D1FAE5' },
  indigo: { fill: '#6366F1', stroke: '#3730A3', light: '#E0E7FF' },
  coral: { fill: '#F97316', stroke: '#9A3412', light: '#FFEDD5' },
};

const SIZE_SCALE: Record<VisualSize, number> = {
  sm: 0.62,
  md: 0.84,
  lg: 1.06,
};

export function VisualTokenSvg({
  token,
  className = 'w-12 h-12',
}: {
  token: VisualToken;
  className?: string;
}) {
  const palette = COLOR_MAP[token.color] ?? COLOR_MAP.amber;
  const scale = SIZE_SCALE[token.size ?? 'md'];
  const rot = token.rotation ?? 0;

  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label={token.label}
    >
      <g transform={`translate(32 32) rotate(${rot}) scale(${scale}) translate(-32 -32)`}>
        {token.shape === 'circle' && (
          <>
            <circle cx="32" cy="32" r="22" fill={palette.fill} stroke={palette.stroke} strokeWidth="3.5" />
            <circle cx="25" cy="24" r="6" fill={palette.light} opacity="0.7" />
          </>
        )}
        {token.shape === 'square' && (
          <>
            <rect x="12" y="12" width="40" height="40" rx="8" fill={palette.fill} stroke={palette.stroke} strokeWidth="3.5" />
            <rect x="18" y="18" width="12" height="12" rx="3" fill={palette.light} opacity="0.6" />
          </>
        )}
        {token.shape === 'triangle' && (
          <>
            <polygon
              points="32,8 56,52 8,52"
              strokeLinejoin="round"
              fill={palette.fill}
              stroke={palette.stroke}
              strokeWidth="3.5"
            />
            <polygon points="32,18 42,42 22,42" fill={palette.light} opacity="0.45" />
          </>
        )}
        {token.shape === 'diamond' && (
          <>
            <polygon
              points="32,6 56,32 32,58 8,32"
              strokeLinejoin="round"
              fill={palette.fill}
              stroke={palette.stroke}
              strokeWidth="3.5"
            />
            <polygon points="32,15 44,32 32,49 20,32" fill={palette.light} opacity="0.45" />
          </>
        )}
        {token.shape === 'star' && (
          <>
            <polygon
              points="32,6 39,23 57,24 43,36 47,54 32,44 17,54 21,36 7,24 25,23"
              strokeLinejoin="round"
              fill={palette.fill}
              stroke={palette.stroke}
              strokeWidth="3.2"
            />
            <circle cx="32" cy="31" r="6" fill={palette.light} opacity="0.65" />
          </>
        )}
        {token.shape === 'leaf' && (
          <>
            <path
              d="M32,8 C49,14 54,36 32,56 C10,36 15,14 32,8 Z"
              fill={palette.fill}
              stroke={palette.stroke}
              strokeWidth="3.5"
            />
            <path d="M32,14 L32,50 M32,26 L42,20 M32,36 L22,29" stroke={palette.light} strokeWidth="2.8" strokeLinecap="round" />
          </>
        )}
        {token.shape === 'petal' && (
          <>
            <circle cx="32" cy="18" r="10" fill={palette.fill} stroke={palette.stroke} strokeWidth="2.8" />
            <circle cx="45" cy="29" r="10" fill={palette.fill} stroke={palette.stroke} strokeWidth="2.8" />
            <circle cx="39" cy="44" r="10" fill={palette.fill} stroke={palette.stroke} strokeWidth="2.8" />
            <circle cx="25" cy="44" r="10" fill={palette.fill} stroke={palette.stroke} strokeWidth="2.8" />
            <circle cx="19" cy="29" r="10" fill={palette.fill} stroke={palette.stroke} strokeWidth="2.8" />
            <circle cx="32" cy="32" r="9" fill={palette.light} stroke={palette.stroke} strokeWidth="2.5" />
          </>
        )}
      </g>
    </svg>
  );
}

export function RhythmTokenBadge({
  token,
  active = false,
  className = '',
}: {
  token: RhythmToken;
  active?: boolean;
  className?: string;
}) {
  const palette = COLOR_MAP[token.color] ?? COLOR_MAP.amber;
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border-2 px-3 py-2 transition-transform duration-150 ${
        active ? 'scale-105 ring-4 ring-amber-300' : ''
      } ${className}`}
      style={{
        backgroundColor: palette.light,
        borderColor: palette.stroke,
        color: palette.stroke,
      }}
    >
      <span className="text-2xl font-bold leading-none" aria-hidden="true">
        {token.symbol}
      </span>
      <span className="mt-1 text-xs font-bold whitespace-nowrap">{token.label}</span>
    </div>
  );
}
