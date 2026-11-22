import type { AreaId } from '../../types/game';

export type CharacterState = 'idle' | 'walking' | 'celebrating' | 'thinking';

export function PatternGuardianSprite({
  state = 'idle',
  facing = 'right',
  className = 'w-20 h-24',
}: {
  state?: CharacterState;
  facing?: 'left' | 'right';
  className?: string;
}) {
  const animClass =
    state === 'walking'
      ? 'animate-walk-bob'
      : state === 'celebrating'
        ? 'animate-celebrate'
        : 'animate-float-slow';

  return (
    <div
      className={`inline-block select-none pointer-events-none ${animClass} ${className}`}
      style={{ transform: facing === 'left' ? 'scaleX(-1)' : 'scaleX(1)' }}
    >
      <svg viewBox="0 0 112 132" className="w-full h-full drop-shadow-[0_6px_10px_rgba(15,23,42,0.42)]" aria-hidden="true">
        <defs>
          <linearGradient id="guardian-tunic" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34D399" />
            <stop offset="55%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>
          <linearGradient id="guardian-cloak" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0F766E" />
            <stop offset="100%" stopColor="#134E4A" />
          </linearGradient>
          <linearGradient id="guardian-hat" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#065F46" />
          </linearGradient>
          <radialGradient id="staff-orb-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FEF08A" stopOpacity="0.95" />
            <stop offset="55%" stopColor="#38BDF8" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#38BDF8" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ground shadow */}
        <ellipse cx="54" cy="121" rx="25" ry="6" fill="#0F172A" opacity="0.28" />

        {/* Walking dust puffs */}
        {state === 'walking' && (
          <g fill="#FEF3C7" opacity="0.72">
            <circle cx="24" cy="116" r="5" />
            <circle cx="16" cy="113" r="3.5" />
            <circle cx="31" cy="118" r="3" />
          </g>
        )}

        {/* Flowing Explorer Cloak with Golden Trim */}
        <path
          d={
            state === 'walking'
              ? 'M32 60 Q12 86 15 106 Q34 102 52 100 L50 60 Z'
              : 'M32 60 Q17 85 23 105 Q38 101 52 100 L50 60 Z'
          }
          fill="url(#guardian-cloak)"
          stroke="#115E59"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path
          d={state === 'walking' ? 'M16 104 Q34 100 50 98' : 'M24 103 Q38 99 50 98'}
          fill="none"
          stroke="#F59E0B"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Sturdy Leather Boots with Cuffs */}
        <rect x="37" y="96" width="12" height="19" rx="5.5" fill="#78350F" stroke="#451A03" strokeWidth="2.4" />
        <rect x="36" y="95" width="14" height="5" rx="2.5" fill="#B45309" stroke="#451A03" strokeWidth="1.8" />
        <rect x="57" y="96" width="12" height="19" rx="5.5" fill="#78350F" stroke="#451A03" strokeWidth="2.4" />
        <rect x="56" y="95" width="14" height="5" rx="2.5" fill="#B45309" stroke="#451A03" strokeWidth="1.8" />

        {/* Tunic Body */}
        <path
          d="M35 58 L71 58 L76 96 Q53 102 31 96 Z"
          fill="url(#guardian-tunic)"
          stroke="#064E3B"
          strokeWidth="2.6"
          strokeLinejoin="round"
        />
        {/* Tunic Collar V-Crest */}
        <path d="M43 58 L53 69 L63 58" fill="#FEF3C7" stroke="#D97706" strokeWidth="2" strokeLinejoin="round" />

        {/* Gold Belt & Compass Buckle */}
        <rect x="33" y="77" width="40" height="8" rx="3" fill="#D97706" stroke="#78350F" strokeWidth="2" />
        <circle cx="53" cy="81" r="6" fill="#FEF3C7" stroke="#92400E" strokeWidth="2.2" />
        <polygon points="53,77 55,81 53,85 51,81" fill="#D97706" />

        {/* Explorer Satchel with Brass Clasp */}
        <rect x="64" y="72" width="14" height="16" rx="4" fill="#92400E" stroke="#451A03" strokeWidth="2.2" />
        <path d="M64 78 L78 78" stroke="#451A03" strokeWidth="2" />
        <circle cx="71" cy="79" r="2" fill="#FBBF24" />

        {/* Left Arm */}
        <path
          d={state === 'celebrating' ? 'M35 63 L18 40' : 'M35 63 L23 79'}
          stroke="#FDBA74"
          strokeWidth="8.5"
          strokeLinecap="round"
        />
        <circle
          cx={state === 'celebrating' ? 18 : 23}
          cy={state === 'celebrating' ? 40 : 79}
          r="5"
          fill="#FED7AA"
          stroke="#9A3412"
          strokeWidth="2"
        />

        {/* Right Arm holding Pattern Staff */}
        <path
          d={state === 'celebrating' ? 'M71 63 L87 40' : state === 'thinking' ? 'M71 63 L64 49' : 'M71 63 L84 76'}
          stroke="#FDBA74"
          strokeWidth="8.5"
          strokeLinecap="round"
        />
        <circle
          cx={state === 'celebrating' ? 87 : state === 'thinking' ? 64 : 84}
          cy={state === 'celebrating' ? 40 : state === 'thinking' ? 49 : 76}
          r="5"
          fill="#FED7AA"
          stroke="#9A3412"
          strokeWidth="2"
        />

        {/* Carved Oak Pattern Wand / Staff with Glowing Star Crystal */}
        <g transform={state === 'celebrating' ? 'translate(4, -12) rotate(8 86 64)' : ''}>
          <circle cx="86" cy="31" r="18" fill="url(#staff-orb-glow)" className="animate-shimmer-glow" />
          <line x1="86" y1="41" x2="86" y2="108" stroke="#78350F" strokeWidth="5" strokeLinecap="round" />
          <line x1="86" y1="43" x2="86" y2="106" stroke="#B45309" strokeWidth="2" strokeLinecap="round" />
          <path d="M80 42 Q86 36 92 42" fill="none" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
          <polygon
            points="86,18 90.5,27 100,28.5 93,35 94.5,44.5 86,40 77.5,44.5 79,35 72,28.5 81.5,27"
            fill="#FDE047"
            stroke="#B45309"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <circle cx="86" cy="32" r="4" fill="#38BDF8" stroke="#FEF9C3" strokeWidth="1.5" />
        </g>

        {/* Celebration Sparkles */}
        {state === 'celebrating' && (
          <g fill="#FDE047">
            <polygon points="16,22 18,27 23,28 19,31 20,36 16,33 12,36 13,31 9,28 14,27" />
            <polygon points="99,16 101,20 105,21 102,24 103,28 99,26 95,28 96,24 93,21 97,20" />
            <circle cx="53" cy="8" r="3" fill="#38BDF8" />
          </g>
        )}

        {/* Head & Warm Storybook Face */}
        <circle cx="53" cy="39" r="20" fill="#FED7AA" stroke="#9A3412" strokeWidth="2.5" />
        {/* Hair Bangs */}
        <path
          d="M32 38 Q33 16 53 16 Q73 16 74 38 Q67 27 59 29 Q53 24 46 29 Q39 27 32 38 Z"
          fill="#5C2D12"
        />

        {/* Adventurer Leaf-Crest Cap */}
        <path
          d="M29 33 Q53 10 77 31 Q62 21 53 23 Q42 21 29 33 Z"
          fill="url(#guardian-hat)"
          stroke="#064E3B"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        <path d="M62 20 Q72 13 76 19 Q70 25 62 22 Z" fill="#FBBF24" stroke="#92400E" strokeWidth="1.8" />

        {/* Expressive Blinking Eyes */}
        <g className="animate-eye-blink">
          <ellipse cx="46.5" cy="41" rx="3" ry="3.4" fill="#1E293B" />
          <ellipse cx="60.5" cy="41" rx="3" ry="3.4" fill="#1E293B" />
          <circle cx="47.5" cy="39.8" r="1.1" fill="#FFFFFF" />
          <circle cx="61.5" cy="39.8" r="1.1" fill="#FFFFFF" />
        </g>

        {/* Soft Brows & Rosy Cheeks */}
        <path d="M43 35.5 Q46.5 34 50 35.5" fill="none" stroke="#5C2D12" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M57 35.5 Q60.5 34 64 35.5" fill="none" stroke="#5C2D12" strokeWidth="1.8" strokeLinecap="round" />
        <ellipse cx="40.5" cy="45.5" rx="3.4" ry="2.1" fill="#FB7185" opacity="0.48" />
        <ellipse cx="66.5" cy="45.5" rx="3.4" ry="2.1" fill="#FB7185" opacity="0.48" />

        {/* Smile */}
        <path
          d={
            state === 'celebrating'
              ? 'M46 48 Q53 55 60 48'
              : state === 'thinking'
                ? 'M49 49 Q53 47.5 57 49'
                : 'M47 48 Q53 52.5 59 48'
          }
          fill="none"
          stroke="#7C2D12"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

export function AreaCompanionNpc({
  areaId,
  happy = false,
  className = 'w-14 h-14',
}: {
  areaId: AreaId;
  happy?: boolean;
  className?: string;
}) {
  return (
    <div className={`inline-block ${happy ? 'animate-celebrate' : 'animate-float-slow'} ${className}`}>
      {areaId === 'counting_grove' || areaId === 'champions_tower' ? (
        // Barnaby / Grandmaster Owl
        <svg viewBox="0 0 68 68" className="w-full h-full drop-shadow" aria-hidden="true">
          {/* Feather Ear Tufts */}
          <path d="M18 22 L12 11 L25 18 Z" fill={areaId === 'champions_tower' ? '#312E81' : '#78350F'} />
          <path d="M50 22 L56 11 L43 18 Z" fill={areaId === 'champions_tower' ? '#312E81' : '#78350F'} />
          {/* Owl Body */}
          <ellipse
            cx="34"
            cy="40"
            rx="20"
            ry="22"
            fill={areaId === 'champions_tower' ? '#4338CA' : '#92400E'}
            stroke="#1E293B"
            strokeWidth="2.4"
          />
          {/* Layered Wings */}
          <path
            d="M15 36 Q10 48 20 55"
            fill={areaId === 'champions_tower' ? '#3730A3' : '#78350F'}
            stroke="#1E293B"
            strokeWidth="2"
          />
          <path
            d="M53 36 Q58 48 48 55"
            fill={areaId === 'champions_tower' ? '#3730A3' : '#78350F'}
            stroke="#1E293B"
            strokeWidth="2"
          />
          {/* Cream Belly Plumage */}
          <ellipse cx="34" cy="45" rx="12" ry="14" fill="#FEF3C7" />
          <path d="M28 42 Q34 45 40 42 M27 48 Q34 51 41 48" stroke="#D97706" strokeWidth="1.5" fill="none" opacity="0.55" />
          {/* Expressive Owl Eyes */}
          <circle cx="26.5" cy="29" r="7.5" fill="#FFFBEB" stroke="#1E293B" strokeWidth="2.2" />
          <circle cx="41.5" cy="29" r="7.5" fill="#FFFBEB" stroke="#1E293B" strokeWidth="2.2" />
          <g className="animate-eye-blink">
            <circle cx="26.5" cy="29" r="3.2" fill="#0F172A" />
            <circle cx="41.5" cy="29" r="3.2" fill="#0F172A" />
            <circle cx="27.5" cy="27.8" r="1.1" fill="#FFFFFF" />
            <circle cx="42.5" cy="27.8" r="1.1" fill="#FFFFFF" />
          </g>
          {/* Golden Beak */}
          <polygon points="34,32 29.5,38.5 38.5,38.5" fill="#F59E0B" stroke="#78350F" strokeWidth="1.6" strokeLinejoin="round" />
          {areaId === 'champions_tower' && (
            <polygon points="20,16 34,5 48,16 44,19 24,19" fill="#FBBF24" stroke="#78350F" strokeWidth="2" strokeLinejoin="round" />
          )}
        </svg>
      ) : areaId === 'enchanted_garden' ? (
        // Pip the Sprout Sprite
        <svg viewBox="0 0 68 68" className="w-full h-full drop-shadow" aria-hidden="true">
          <path d="M34,17 Q44,5 51,12 Q44,21 34,17 Z" fill="#10B981" stroke="#065F46" strokeWidth="2" />
          <path d="M34,17 Q24,5 17,12 Q24,21 34,17 Z" fill="#34D399" stroke="#065F46" strokeWidth="2" />
          <circle cx="34" cy="17" r="3.5" fill="#FDE047" stroke="#92400E" strokeWidth="1.5" />
          <circle cx="34" cy="39" r="19" fill="#A7F3D0" stroke="#065F46" strokeWidth="2.4" />
          <circle cx="26" cy="43" r="3" fill="#FB7185" opacity="0.45" />
          <circle cx="42" cy="43" r="3" fill="#FB7185" opacity="0.45" />
          <g className="animate-eye-blink">
            <circle cx="27.5" cy="37" r="2.8" fill="#064E3B" />
            <circle cx="40.5" cy="37" r="2.8" fill="#064E3B" />
            <circle cx="28.4" cy="36" r="1" fill="#FFFFFF" />
            <circle cx="41.4" cy="36" r="1" fill="#FFFFFF" />
          </g>
          <path d="M29 45 Q34 50 39 45" fill="none" stroke="#064E3B" strokeWidth="2.3" strokeLinecap="round" />
        </svg>
      ) : areaId === 'rhythm_woods' ? (
        // Lyra the Songbird
        <svg viewBox="0 0 68 68" className="w-full h-full drop-shadow" aria-hidden="true">
          <path d="M29 18 Q34 10 40 16 Q35 21 30 22 Z" fill="#38BDF8" stroke="#075985" strokeWidth="1.8" />
          <ellipse cx="34" cy="40" rx="19" ry="16" fill="#0EA5E9" stroke="#075985" strokeWidth="2.4" />
          <ellipse cx="32" cy="44" rx="11" ry="9.5" fill="#E0F2FE" />
          <path d="M16 36 Q7 27 14 20 Q23 26 23 36 Z" fill="#38BDF8" stroke="#075985" strokeWidth="2" />
          <path d="M25 38 Q33 34 38 44 Q28 48 25 38 Z" fill="#0284C7" stroke="#075985" strokeWidth="1.8" />
          <g className="animate-eye-blink">
            <circle cx="41" cy="33" r="2.8" fill="#0F172A" />
            <circle cx="41.9" cy="32" r="1" fill="#FFFFFF" />
          </g>
          <polygon points="51,35 61,38 51,42" fill="#F59E0B" stroke="#78350F" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      ) : (
        // Sir Cedric
        <svg viewBox="0 0 68 68" className="w-full h-full drop-shadow" aria-hidden="true">
          <path d="M34,7 L40,21 L28,21 Z" fill="#DC2626" stroke="#7F1D1D" strokeWidth="2" strokeLinejoin="round" />
          <rect x="19" y="21" width="30" height="34" rx="11" fill="#E2E8F0" stroke="#334155" strokeWidth="2.5" />
          <rect x="19" y="21" width="30" height="7" rx="3" fill="#F59E0B" stroke="#78350F" strokeWidth="1.8" />
          <rect x="23" y="31" width="22" height="9" rx="3.5" fill="#1E293B" />
          <g className="animate-eye-blink">
            <circle cx="29.5" cy="35.5" r="2.2" fill="#FDE047" />
            <circle cx="38.5" cy="35.5" r="2.2" fill="#FDE047" />
          </g>
        </svg>
      )}
    </div>
  );
}
