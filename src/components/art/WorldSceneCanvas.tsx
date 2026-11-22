import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, Sparkles } from 'lucide-react';
import type { AreaId } from '../../types/game';
import { WORLD_AREAS, type WorldHotspot } from '../../data/worldData';
import { getHotspotQuestion } from '../../engine/questionBank';
import { AreaCompanionNpc, type CharacterState, PatternGuardianSprite } from './KingdomCharacter';

interface WorldSceneCanvasProps {
  areaId: AreaId;
  questSeed?: number;
  completedHotspots: string[];
  celebratingHotspotId: string | null;
  onSelectHotspot: (hotspot: WorldHotspot) => void;
}

const AMBIENT_MOTES = [
  { left: '16%', top: '26%', delay: '0s', size: 6 },
  { left: '34%', top: '38%', delay: '1.1s', size: 5 },
  { left: '52%', top: '22%', delay: '2.3s', size: 7 },
  { left: '67%', top: '36%', delay: '0.7s', size: 5 },
  { left: '84%', top: '29%', delay: '1.9s', size: 6 },
  { left: '42%', top: '62%', delay: '2.9s', size: 5 },
  { left: '76%', top: '64%', delay: '1.4s', size: 6 },
];

export function WorldSceneCanvas({
  areaId,
  questSeed = 0,
  completedHotspots,
  celebratingHotspotId,
  onSelectHotspot,
}: WorldSceneCanvasProps) {
  const area = WORLD_AREAS[areaId];
  const containerRef = useRef<HTMLDivElement | null>(null);

  const bridgeQuestion = useMemo(
    () => getHotspotQuestion('cg-bridge-1', questSeed),
    [questSeed]
  );
  const lanternQuestion = useMemo(
    () => getHotspotQuestion('eg-lantern-3', questSeed),
    [questSeed]
  );
  const dynamicSubtitles = useMemo(() => {
    const map: Record<string, string> = {};
    if (bridgeQuestion.stepDelta) {
      map['hs-cg-bridge'] = `Stepping Stones (+${bridgeQuestion.stepDelta})`;
    }
    const berryQ = getHotspotQuestion('cg-fruit-3', questSeed);
    if (berryQ.stepDelta) {
      map['hs-cg-berries'] = `Decreasing Piles (${berryQ.stepDelta})`;
    }
    const flowerQ = getHotspotQuestion('eg-flower-1', questSeed);
    const flowerCode = flowerQ.ruleSummary.split(' ')[0];
    if (flowerCode) {
      map['hs-eg-flowers'] = `${flowerCode} Shape Pattern`;
    }
    const gemQ = getHotspotQuestion('eg-size-4', questSeed);
    const gemCode = gemQ.ruleSummary.split(' ')[0];
    if (gemCode) {
      map['hs-eg-gems'] = `${gemCode} Repeating Gems`;
    }
    return map;
  }, [questSeed, bridgeQuestion.stepDelta]);

  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 13, y: 74 });
  const [target, setTarget] = useState<{ x: number; y: number } | null>(null);
  const [facing, setFacing] = useState<'left' | 'right'>('right');
  const [charState, setCharState] = useState<CharacterState>('idle');
  const pendingHotspotRef = useRef<WorldHotspot | null>(null);
  const heldKeysRef = useRef<Set<string>>(new Set());

  // Reset character spawn on area change
  useEffect(() => {
    setPos({ x: 13, y: 74 });
    setTarget(null);
    setFacing('right');
    setCharState('idle');
    pendingHotspotRef.current = null;
  }, [areaId]);

  useEffect(() => {
    if (celebratingHotspotId) {
      setCharState('celebrating');
      const t = window.setTimeout(() => setCharState('idle'), 1400);
      return () => window.clearTimeout(t);
    }
  }, [celebratingHotspotId]);

  // Smooth clamped movement loop (tap-to-walk + keyboard/D-pad)
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();

    const step = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const keys = heldKeysRef.current;
      let dx = 0;
      let dy = 0;
      if (keys.has('ArrowLeft') || keys.has('KeyA')) dx -= 1;
      if (keys.has('ArrowRight') || keys.has('KeyD')) dx += 1;
      if (keys.has('ArrowUp') || keys.has('KeyW')) dy -= 1;
      if (keys.has('ArrowDown') || keys.has('KeyS')) dy += 1;

      if (dx !== 0 || dy !== 0) {
        const len = Math.hypot(dx, dy);
        const speed = 28; // % of viewport per second
        setTarget(null);
        pendingHotspotRef.current = null;
        if (dx < 0) setFacing('left');
        if (dx > 0) setFacing('right');
        setCharState('walking');
        setPos((prev) => ({
          x: Math.max(8, Math.min(92, prev.x + (dx / len) * speed * dt)),
          y: Math.max(42, Math.min(82, prev.y + (dy / len) * speed * dt)),
        }));
      } else if (target) {
        setPos((prev) => {
          const tx = target.x - prev.x;
          const ty = target.y - prev.y;
          const dist = Math.hypot(tx, ty);
          if (dist < 2.2) {
            setTarget(null);
            setCharState('idle');
            const pending = pendingHotspotRef.current;
            if (pending) {
              pendingHotspotRef.current = null;
              window.setTimeout(() => onSelectHotspot(pending), 40);
            }
            return { x: target.x, y: target.y };
          }
          if (tx < -0.5) setFacing('left');
          if (tx > 0.5) setFacing('right');
          setCharState('walking');
          const speed = 34;
          const move = Math.min(dist, speed * dt);
          return {
            x: prev.x + (tx / dist) * move,
            y: prev.y + (ty / dist) * move,
          };
        });
      } else if (!celebratingHotspotId) {
        setCharState((prev) => (prev === 'walking' ? 'idle' : prev));
      }

      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [target, celebratingHotspotId, onSelectHotspot]);

  // Keyboard listeners + blur cleanup
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) {
        heldKeysRef.current.add(e.code);
      }
      if (e.code === 'Space' || e.code === 'Enter') {
        const nearest = area.hotspots.find(
          (h) => Math.hypot(h.xPercent - pos.x, h.yPercent - pos.y) < 15
        );
        if (nearest) {
          onSelectHotspot(nearest);
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      heldKeysRef.current.delete(e.code);
    };
    const onBlur = () => heldKeysRef.current.clear();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [area.hotspots, pos.x, pos.y, onSelectHotspot]);

  const handleGroundTap = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    pendingHotspotRef.current = null;
    setTarget({
      x: Math.max(8, Math.min(92, xPct)),
      y: Math.max(44, Math.min(82, yPct)),
    });
  };

  const handleHotspotClick = (hotspot: WorldHotspot) => {
    const dist = Math.hypot(hotspot.xPercent - pos.x, hotspot.yPercent - pos.y);
    if (dist < 14) {
      onSelectHotspot(hotspot);
    } else {
      pendingHotspotRef.current = hotspot;
      setTarget({ x: hotspot.xPercent, y: Math.max(46, Math.min(80, hotspot.yPercent + 5)) });
    }
  };

  const startDpadHold = (code: string) => heldKeysRef.current.add(code);
  const stopDpadHold = (code: string) => heldKeysRef.current.delete(code);

  const isSolved = (id: string) => completedHotspots.includes(id);

  return (
    <div
      ref={containerRef}
      onPointerDown={handleGroundTap}
      className="relative w-full h-full overflow-hidden select-none touch-none rounded-2xl border-2 border-amber-500/40 shadow-[inset_0_0_32px_rgba(12,18,28,0.28)]"
      data-testid="world-scene-canvas"
      style={{
        background: `linear-gradient(180deg, ${area.palette.skyTop} 0%, ${area.palette.skyBottom} 58%, ${area.palette.ground} 58%, ${area.palette.ground} 100%)`,
      }}
    >
      {/* Hand-Painted 2D Fantasy Kingdom Backdrop */}
      <img
        src={area.backdropImage}
        referrerPolicy="no-referrer"
        alt={area.name}
        className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
      />

      {/* Soft Atmospheric Storybook Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 45%, transparent 56%, rgba(15, 23, 42, 0.28) 100%), linear-gradient(180deg, rgba(15,23,42,0.12) 0%, transparent 24%, transparent 82%, rgba(15,23,42,0.22) 100%)',
        }}
      />

      {/* Ambient Floating Sunbeam / Firefly Motes */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {AMBIENT_MOTES.map((mote, i) => (
          <span
            key={i}
            style={{
              left: mote.left,
              top: mote.top,
              width: `${mote.size}px`,
              height: `${mote.size}px`,
              animationDelay: mote.delay,
            }}
            className="absolute rounded-full bg-amber-200/85 shadow-[0_0_10px_rgba(253,224,71,0.9)] animate-mote-drift"
          />
        ))}
      </div>

      {/* Diegetic In-World Restored Prop Overlays (Synced to Painted Landmarks) */}
      <svg
        viewBox="0 0 1200 620"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full pointer-events-none"
        aria-hidden="true"
      >
        {areaId === 'counting_grove' && (
          <g>
            {/* Whispering Brook Stepping Stone Sequence (last 4 stones from active bridge question) */}
            <g transform="translate(260, 455)">
              {bridgeQuestion.sequence.slice(-4).map((item, idx) => {
                const isLast = idx === 3;
                const solvedStone = !isLast || isSolved('hs-cg-bridge');
                const label = isLast
                  ? isSolved('hs-cg-bridge')
                    ? String(bridgeQuestion.correctAnswer)
                    : '?'
                  : String(item.value);
                return (
                  <g key={idx} transform={`translate(${idx * 46}, ${idx % 2 === 0 ? 0 : -4})`}>
                    <rect
                      x="0"
                      y="0"
                      width="38"
                      height="26"
                      rx="9"
                      fill={solvedStone ? '#FEF3C7' : 'rgba(15, 23, 42, 0.35)'}
                      stroke={solvedStone ? '#B45309' : '#FDE68A'}
                      strokeWidth={solvedStone ? 2.5 : 2}
                      strokeDasharray={solvedStone ? undefined : '5 4'}
                    />
                    <text
                      x="19"
                      y="18"
                      textAnchor="middle"
                      fontSize="13"
                      fontWeight="bold"
                      fill={solvedStone ? '#78350F' : '#FEF3C7'}
                    >
                      {label}
                    </text>
                  </g>
                );
              })}
            </g>

            {/* Oak Treehouse Glowing Rung */}
            {isSolved('hs-cg-stairs') && (
              <g transform="translate(690, 320)" className="animate-shimmer-glow">
                <rect x="-28" y="-8" width="56" height="14" rx="5" fill="#FDE047" stroke="#92400E" strokeWidth="2.5" />
                <circle cx="0" cy="-20" r="5" fill="#FEF08A" />
              </g>
            )}

            {/* Sunberry Harvest Glow */}
            {isSolved('hs-cg-berries') && (
              <g transform="translate(816, 480)" fill="#FDE047" className="animate-shimmer-glow">
                <circle cx="-18" cy="0" r="7" stroke="#B45309" strokeWidth="2" />
                <circle cx="0" cy="-6" r="8" stroke="#B45309" strokeWidth="2" />
                <circle cx="18" cy="0" r="7" stroke="#B45309" strokeWidth="2" />
              </g>
            )}

            {/* Elder Grove Lanterns */}
            {isSolved('hs-cg-mushrooms') && (
              <g transform="translate(996, 330)" className="animate-shimmer-glow">
                <circle cx="0" cy="0" r="24" fill="#FDE047" opacity="0.28" />
                <circle cx="0" cy="0" r="8" fill="#FEF08A" stroke="#D97706" strokeWidth="2" />
              </g>
            )}
          </g>
        )}

        {areaId === 'enchanted_garden' && (
          <g>
            {/* Starlight Flower Bed Blossoms */}
            {isSolved('hs-eg-flowers') && (
              <g transform="translate(300, 455)" className="animate-shimmer-glow">
                <circle cx="-26" cy="4" r="8" fill="#FDE047" stroke="#B45309" strokeWidth="2" />
                <circle cx="0" cy="-6" r="9" fill="#38BDF8" stroke="#0369A1" strokeWidth="2" />
                <circle cx="26" cy="4" r="8" fill="#F472B6" stroke="#9D174D" strokeWidth="2" />
              </g>
            )}
            {/* Pergola Letter Lanterns */}
            <g transform="translate(476, 268)">
              {lanternQuestion.sequence.slice(0, 5).map((item, idx) => {
                const isMissing = Boolean(item.isMissing);
                const lit = !isMissing || isSolved('hs-eg-lanterns');
                const letter = isMissing ? String(lanternQuestion.correctAnswer) : String(item.value);
                return (
                  <g key={idx} transform={`translate(${idx * 36}, 0)`}>
                    <rect
                      x="-13"
                      y="-16"
                      width="26"
                      height="32"
                      rx="7"
                      fill={lit ? '#FEF08A' : 'rgba(30, 41, 59, 0.72)'}
                      stroke="#92400E"
                      strokeWidth="2.2"
                    />
                    <text
                      x="0"
                      y="5"
                      textAnchor="middle"
                      fontSize="14"
                      fontWeight="bold"
                      fill={lit ? '#78350F' : '#CBD5E1'}
                    >
                      {lit ? letter : '?'}
                    </text>
                  </g>
                );
              })}
            </g>
            {isSolved('hs-eg-vine') && (
              <circle cx="264" cy="278" r="22" fill="#34D399" opacity="0.32" className="animate-shimmer-glow" />
            )}
            {isSolved('hs-eg-gems') && (
              <g transform="translate(888, 430)" className="animate-shimmer-glow">
                <polygon points="0,-16 14,0 0,16 -14,0" fill="#38BDF8" stroke="#FEF9C3" strokeWidth="2" />
              </g>
            )}
          </g>
        )}

        {areaId === 'rhythm_woods' && (
          <g>
            {isSolved('hs-rw-melody') && (
              <text x="300" y="340" textAnchor="middle" fontSize="28" fill="#FEF08A" className="animate-shimmer-glow">
                ♪ ♫ ♪
              </text>
            )}
            {isSolved('hs-rw-echo') && (
              <g stroke="#FDE047" strokeWidth="3" fill="none" className="animate-shimmer-glow">
                <circle cx="636" cy="438" r="26" />
                <circle cx="636" cy="438" r="42" opacity="0.6" />
              </g>
            )}
            {isSolved('hs-rw-chorus') && (
              <text x="936" y="328" textAnchor="middle" fontSize="30" fill="#FEF08A" className="animate-shimmer-glow">
                ♫ ★ ♫
              </text>
            )}
          </g>
        )}

        {areaId === 'castle_sequences' && (
          <g>
            {isSolved('hs-cs-inc') && (
              <g transform="translate(372, 415)" className="animate-shimmer-glow">
                {[0, 1, 2, 3].map((s) => (
                  <rect
                    key={s}
                    x={s * 24 - 36}
                    y={-s * 11}
                    width="22"
                    height="10"
                    rx="3"
                    fill="#FDE047"
                    stroke="#92400E"
                    strokeWidth="1.8"
                  />
                ))}
              </g>
            )}
            {isSolved('hs-cs-dec') && (
              <ellipse cx="828" cy="472" rx="46" ry="14" fill="#FDE047" opacity="0.32" className="animate-shimmer-glow" />
            )}
            {isSolved('hs-cs-gate') && (
              <circle cx="240" cy="298" r="24" fill="#FDE047" opacity="0.3" className="animate-shimmer-glow" />
            )}
            {isSolved('hs-cs-crystal') && (
              <g transform="translate(912, 230)" className="animate-shimmer-glow">
                <circle cx="0" cy="0" r="46" fill="#38BDF8" opacity="0.28" />
                <polygon points="0,-28 18,0 0,28 -18,0" fill="#7DD3FC" stroke="#FEF08A" strokeWidth="3" />
              </g>
            )}
          </g>
        )}

        {areaId === 'champions_tower' && (
          <g>
            {area.hotspots.map(
              (hs) =>
                isSolved(hs.id) && (
                  <circle
                    key={hs.id}
                    cx={(hs.xPercent / 100) * 1200}
                    cy={(hs.yPercent / 100) * 620}
                    r="34"
                    fill="#FDE047"
                    opacity="0.24"
                    className="animate-shimmer-glow"
                  />
                )
            )}
          </g>
        )}
      </svg>

      {/* Tap-to-Walk Ground Destination Ring */}
      {target && (
        <div
          style={{
            left: `${target.x}%`,
            top: `${target.y}%`,
            transform: 'translate(-50%, -50%)',
          }}
          className="absolute z-10 pointer-events-none"
          aria-hidden="true"
        >
          <div className="w-9 h-5 rounded-full border-2 border-amber-300 bg-amber-300/25 shadow-[0_0_12px_rgba(253,224,71,0.85)] animate-ping" />
        </div>
      )}

      {/* Interactive Hotspot Nodes (Carved Storybook Parchment & Brass Medallions) */}
      {area.hotspots.map((hs, idx) => {
        const solved = isSolved(hs.id);
        const nearby = Math.hypot(hs.xPercent - pos.x, hs.yPercent - pos.y) < 15;
        const celebrating = celebratingHotspotId === hs.id;
        return (
          <button
            key={hs.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleHotspotClick(hs);
            }}
            aria-label={`${hs.title}: ${hs.subtitle}${solved ? ' (Restored)' : ''}`}
            style={{
              left: `${hs.xPercent}%`,
              top: `${hs.yPercent}%`,
              transform: 'translate(-50%, -50%)',
            }}
            className="absolute z-10 min-w-[44px] min-h-[44px] group flex flex-col items-center focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-300 rounded-2xl"
          >
            {celebrating && (
              <span
                className="absolute -inset-4 rounded-full bg-amber-300/60 blur-md animate-sparkle-burst pointer-events-none"
                aria-hidden="true"
              />
            )}
            <div
              className={`flex items-center gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-2xl border-2 shadow-[0_6px_16px_rgba(15,23,42,0.35)] transition-transform duration-150 group-hover:scale-105 ${
                solved
                  ? 'bg-emerald-50/95 border-emerald-700 text-emerald-950'
                  : nearby
                    ? 'bg-amber-200 border-amber-800 text-stone-950 scale-105 ring-4 ring-amber-300/70 animate-pulse-soft'
                    : 'fantasy-parchment border-amber-700/85 text-stone-900'
              }`}
            >
              <span
                className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-sm border shadow-xs shrink-0 ${
                  solved
                    ? 'bg-emerald-700 border-emerald-900 text-white'
                    : 'bg-gradient-to-b from-amber-400 to-amber-600 border-amber-800 text-stone-950'
                }`}
              >
                {solved ? <Check className="w-4 h-4" /> : idx + 1}
              </span>
              <div className="text-left leading-tight">
                <div className="text-xs sm:text-sm font-extrabold whitespace-nowrap">{hs.title}</div>
                <div className="text-[11px] font-semibold text-stone-700 whitespace-nowrap">
                  {dynamicSubtitles[hs.id] ?? hs.subtitle}
                </div>
              </div>
              {!solved && <Sparkles className="w-4 h-4 text-amber-700 shrink-0" />}
            </div>
          </button>
        );
      })}

      {/* Player Pattern Guardian Character */}
      <div
        style={{
          left: `${pos.x}%`,
          top: `${pos.y}%`,
          transform: 'translate(-50%, -82%)',
        }}
        className="absolute z-20 pointer-events-none transition-[left,top] duration-75"
      >
        <PatternGuardianSprite state={charState} facing={facing} className="w-18 h-22 sm:w-22 sm:h-26" />
      </div>

      {/* Friendly Area Companion Guide (Illuminated Storybook Scroll) */}
      <div className="absolute top-3 left-3 z-20 flex items-start gap-2.5 max-w-xs sm:max-w-sm pointer-events-none">
        <div className="fantasy-parchment rounded-2xl p-1.5 border-2 border-amber-700/80 shadow-[0_8px_20px_rgba(15,23,42,0.35)] shrink-0">
          <AreaCompanionNpc
            areaId={areaId}
            happy={Boolean(celebratingHotspotId)}
            className="w-11 h-11 sm:w-12 sm:h-12"
          />
        </div>
        <div className="fantasy-parchment border-2 border-amber-700/75 rounded-2xl px-3.5 py-2 shadow-[0_8px_20px_rgba(15,23,42,0.35)] text-stone-800">
          <div className="font-display text-xs sm:text-sm font-bold text-amber-900">{area.guideName}</div>
          <p className="text-xs leading-snug font-medium mt-0.5">{area.guideGreeting}</p>
        </div>
      </div>

      {/* Touch-Friendly iPad D-Pad (Carved Timber & Brass) */}
      <div
        className="absolute bottom-3 left-3 z-20 grid grid-cols-3 gap-1 bg-[#142433]/85 p-2 rounded-2xl border-2 border-amber-500/45 shadow-xl"
        aria-label="Movement directional pad"
      >
        <div />
        <button
          type="button"
          aria-label="Walk up"
          onPointerDown={(e) => { e.stopPropagation(); startDpadHold('ArrowUp'); }}
          onPointerUp={() => stopDpadHold('ArrowUp')}
          onPointerLeave={() => stopDpadHold('ArrowUp')}
          onPointerCancel={() => stopDpadHold('ArrowUp')}
          className="fantasy-stone-tile w-11 h-11 rounded-xl hover:brightness-105 active:scale-95 text-stone-900 border border-amber-700/50 flex items-center justify-center"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
        <div />
        <button
          type="button"
          aria-label="Walk left"
          onPointerDown={(e) => { e.stopPropagation(); startDpadHold('ArrowLeft'); }}
          onPointerUp={() => stopDpadHold('ArrowLeft')}
          onPointerLeave={() => stopDpadHold('ArrowLeft')}
          onPointerCancel={() => stopDpadHold('ArrowLeft')}
          className="fantasy-stone-tile w-11 h-11 rounded-xl hover:brightness-105 active:scale-95 text-stone-900 border border-amber-700/50 flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <button
          type="button"
          aria-label="Walk down"
          onPointerDown={(e) => { e.stopPropagation(); startDpadHold('ArrowDown'); }}
          onPointerUp={() => stopDpadHold('ArrowDown')}
          onPointerLeave={() => stopDpadHold('ArrowDown')}
          onPointerCancel={() => stopDpadHold('ArrowDown')}
          className="fantasy-stone-tile w-11 h-11 rounded-xl hover:brightness-105 active:scale-95 text-stone-900 border border-amber-700/50 flex items-center justify-center"
        >
          <ArrowDown className="w-5 h-5" />
        </button>
        <button
          type="button"
          aria-label="Walk right"
          onPointerDown={(e) => { e.stopPropagation(); startDpadHold('ArrowRight'); }}
          onPointerUp={() => stopDpadHold('ArrowRight')}
          onPointerLeave={() => stopDpadHold('ArrowRight')}
          onPointerCancel={() => stopDpadHold('ArrowRight')}
          className="fantasy-stone-tile w-11 h-11 rounded-xl hover:brightness-105 active:scale-95 text-stone-900 border border-amber-700/50 flex items-center justify-center"
        >
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>

      {/* Subtle Controls Whisper */}
      <div className="hidden sm:block absolute bottom-3 right-3 z-10 bg-[#142433]/80 border border-amber-500/35 text-amber-100 text-xs font-medium px-3.5 py-1.5 rounded-xl pointer-events-none shadow-md">
        Tap any glowing marker or ground to walk · WASD / Arrows + Space
      </div>
    </div>
  );
}
