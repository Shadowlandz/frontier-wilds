// ═══════════════════════════════════════════════════════════════════
// Farm Survival - Mobile HUD (Touch Controls)
// Orientation-Responsive | Safe-Area Aware | Professional Layout
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from 'react';
import { Game } from './Game';
import { GameUIState, RARITY_COLORS } from './core/Types';

// ── Haptic vibration helper ───────────────────────────────────────
function vibrate(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate(pattern); } catch {}
  }
}

const HAPTIC_TAP = 10;
const HAPTIC_MEDIUM = 20;
const HAPTIC_STRONG = [15, 30, 15];
const HAPTIC_DOUBLE = [10, 20, 10];

// ── Orientation Hook ──────────────────────────────────────────────
function useOrientation(): 'portrait' | 'landscape' {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(() => {
    if (typeof window === 'undefined') return 'portrait';
    return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
  });

  useEffect(() => {
    const mq = window.matchMedia('(orientation: portrait)');
    const handler = (e: MediaQueryListEvent) => {
      setOrientation(e.matches ? 'portrait' : 'landscape');
    };
    // Also handle resize for desktop-like mobile browsers
    const resizeHandler = () => {
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
    };
    mq.addEventListener('change', handler);
    window.addEventListener('resize', resizeHandler);
    return () => {
      mq.removeEventListener('change', handler);
      window.removeEventListener('resize', resizeHandler);
    };
  }, []);

  return orientation;
}

interface MobileHUDProps {
  game: Game;
  uiState: GameUIState;
}

export default function MobileHUD({ game, uiState }: MobileHUDProps) {
  const orientation = useOrientation();
  const [, forceUpdate] = useState(0);
  const refresh = () => forceUpdate(n => n + 1);
  const [showExtra, setShowExtra] = useState(false);
  const [sprinting, setSprinting] = useState(false);
  const [uiAlpha, setUiAlpha] = useState(1);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const panelOpen = uiState.activePanel !== 'none' && uiState.activePanel !== 'dialogue';

  // ── Transient UI ──
  const pokeFade = useCallback(() => {
    setUiAlpha(1);
    if (fadeTimer.current) clearTimeout(fadeTimer.current);
    fadeTimer.current = setTimeout(() => setUiAlpha(0.35), 3000);
  }, []);

  useEffect(() => {
    pokeFade();
    return () => { if (fadeTimer.current) clearTimeout(fadeTimer.current); };
  }, [pokeFade]);

  useEffect(() => {
    game.input.setVirtualKey('shift', sprinting);
  }, [sprinting, game]);

  useEffect(() => {
    const interval = setInterval(refresh, 100);
    return () => clearInterval(interval);
  }, []);

  const handleExtraClick = (fn: () => void) => {
    setShowExtra(false);
    fn();
  };

  const state = game.state;
  const player = state.player;
  const hotbar = player.hotbar;
  const isPortrait = orientation === 'portrait';

  if (panelOpen) return null;

  // Safe area env will be applied via CSS custom property fallback
  const safeBottom = 'env(safe-area-inset-bottom, 0px)';
  const safeTop = 'env(safe-area-inset-top, 0px)';
  const safeLeft = 'env(safe-area-inset-left, 0px)';
  const safeRight = 'env(safe-area-inset-right, 0px)';

  return (
    <div
      className="absolute inset-0 pointer-events-none z-20 select-none"
      onTouchStart={pokeFade}
      onTouchMove={pokeFade}
      onClick={pokeFade}
      style={{
        transition: 'opacity 0.4s ease',
        opacity: uiAlpha,
        // Prevent accidental zoom / pull-to-refresh
        touchAction: 'manipulation',
        overscrollBehavior: 'none',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {/* ── Virtual Joystick ── */}
      <div className={isPortrait ? '' : 'landscape-only'}>
        <JoystickArea game={game} isPortrait={isPortrait} />
      </div>

      {/* ── Sprint Toggle ── */}
      <button
        onTouchStart={(e) => { e.preventDefault(); vibrate(HAPTIC_TAP); }}
        onClick={() => { vibrate(HAPTIC_DOUBLE); setSprinting(!sprinting); }}
        style={{
          backdropFilter: 'blur(4px)',
          bottom: isPortrait ? 'max(144px, calc(144px + env(safe-area-inset-bottom, 0px)))' : 'max(16px, calc(16px + env(safe-area-inset-bottom, 0px)))',
          left: isPortrait ? 'max(132px, calc(132px + env(safe-area-inset-left, 0px)))' : 'max(208px, calc(208px + env(safe-area-inset-left, 0px)))',
        }}
        className={`absolute pointer-events-auto w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all text-xs ${
          sprinting
            ? 'border-yellow-400 bg-yellow-500/30 text-yellow-300 shadow-lg shadow-yellow-500/20'
            : 'border-white/20 bg-black/50 text-white/50'
        }`}
      >
        {sprinting ? '🏃' : '🚶'}
      </button>

      {/* ── Action Buttons (Right Side) ── */}
      <div
        style={{
          bottom: isPortrait
            ? 'max(112px, calc(112px + env(safe-area-inset-bottom, 0px)))'
            : 'max(16px, calc(16px + env(safe-area-inset-bottom, 0px)))',
          right: 'max(12px, calc(12px + env(safe-area-inset-right, 0px)))',
          gap: isPortrait ? '10px' : '8px',
        }}
        className={`absolute flex pointer-events-auto ${isPortrait ? 'flex-col' : 'flex-row-reverse items-end'}`}
      >
        <TouchButton
          icon="⚔️"
          color="red"
          size={isPortrait ? 'normal' : 'small'}
          onTouchStart={() => game.input.setVirtualKey('q', true)}
          onTouchEnd={() => game.input.setVirtualKey('q', false)}
          onClick={() => game.input.triggerVirtualKeyPress('q')}
        />
        <TouchButton
          icon="🤚"
          color="blue"
          size={isPortrait ? 'normal' : 'small'}
          onTouchStart={() => game.input.setVirtualKey('e', true)}
          onTouchEnd={() => game.input.setVirtualKey('e', false)}
          onClick={() => game.input.triggerVirtualKeyPress('e')}
        />
        <TouchButton
          icon="🍽️"
          color="green"
          size={isPortrait ? 'normal' : 'small'}
          onClick={() => { game.input.triggerVirtualKeyPress('f'); refresh(); }}
        />
      </div>

      {/* ── Quick Actions (plant, dodge) ── */}
      <div
        style={{
          bottom: isPortrait
            ? 'max(112px, calc(112px + env(safe-area-inset-bottom, 0px)))'
            : 'max(64px, calc(64px + env(safe-area-inset-bottom, 0px)))',
          right: isPortrait
            ? 'max(76px, calc(76px + env(safe-area-inset-right, 0px)))'
            : 'max(12px, calc(12px + env(safe-area-inset-right, 0px)))',
          gap: '8px',
        }}
        className={`absolute flex pointer-events-auto ${isPortrait ? 'flex-col' : 'flex-row'}`}
      >
        <TouchButton
          icon="🌾"
          color="green"
          size="small"
          onClick={() => { game.input.triggerVirtualKeyPress('p'); refresh(); }}
        />
        <TouchButton
          icon="💨"
          color="yellow"
          size="small"
          onClick={() => { game.input.triggerVirtualKeyPress(' '); refresh(); }}
        />
      </div>

      {/* ── Hotbar ── */}
      <div
        style={{
          bottom: isPortrait
            ? 'max(12px, calc(12px + env(safe-area-inset-bottom, 0px)))'
            : 'max(8px, calc(8px + env(safe-area-inset-bottom, 0px)))',
          left: isPortrait ? '50%' : '50%',
          transform: 'translateX(-50%)',
        }}
        className="absolute pointer-events-auto z-30 max-w-[92vw] overflow-x-auto no-scrollbar"
      >
        <div className="flex gap-1 px-2">
          {hotbar.map((slot, i) => {
            const isSelected = player.currentTool === i;
            const hs = isPortrait ? 'w-11 h-11' : 'w-9 h-9';
            return (
              <button
                key={i}
                onTouchStart={(e) => { e.preventDefault(); }}
                onClick={() => { vibrate(HAPTIC_TAP); player.currentTool = i; refresh(); }}
                onContextMenu={(e) => { e.preventDefault(); vibrate(HAPTIC_DOUBLE); game.input.triggerVirtualKeyPress('g'); refresh(); }}
                className={`${hs} rounded-lg border-2 flex items-center justify-center relative shrink-0 transition-all ${
                  isSelected
                    ? 'border-yellow-400 bg-yellow-400/20 scale-110 shadow-lg shadow-yellow-400/20 z-10'
                    : 'border-white/15 bg-black/60'
                }`}
              >
                {slot?.item && (
                  <>
                    <span className={isPortrait ? 'text-base' : 'text-sm'} style={{ color: RARITY_COLORS[slot.item.rarity] }}>
                      {slot.unidentified ? '❓' : slot.item.icon}
                    </span>
                    {slot.count > 1 && (
                      <span className="absolute -bottom-0.5 -right-0.5 text-[7px] text-white font-bold bg-black/80 rounded px-0.5 leading-tight">
                        {slot.count}
                      </span>
                    )}
                    {slot.item.foodValue && (
                      <span className="absolute -top-1 -right-1 text-[6px]">🍖</span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Utility Buttons (Top) ── */}
      <div
        style={{
          top: 'max(8px, calc(8px + env(safe-area-inset-top, 0px)))',
          right: 'max(8px, calc(8px + env(safe-area-inset-right, 0px)))',
        }}
        className={`absolute flex pointer-events-auto ${isPortrait ? 'flex-col gap-1.5' : 'flex-row gap-2 items-start'}`}
      >
        <MiniButton icon="🎒" onClick={() => { game.input.triggerVirtualKeyPress('i'); refresh(); }} />
        <MiniButton icon="🔨" onClick={() => { game.input.triggerVirtualKeyPress('c'); refresh(); }} />
        <MiniButton icon="🧭" onClick={() => { game.input.triggerVirtualKeyPress('m'); refresh(); }} />

        {showExtra && (
          <div className={`flex ${isPortrait ? 'flex-col' : 'flex-row'} gap-1.5`}>
            <MiniButton icon="🌟" onClick={() => { handleExtraClick(() => { game.input.triggerVirtualKeyPress('k'); refresh(); }); }} />
            <MiniButton icon="📜" onClick={() => { handleExtraClick(() => { game.input.triggerVirtualKeyPress('j'); refresh(); }); }} />
            <MiniButton icon="🏆" onClick={() => { handleExtraClick(() => { game.input.triggerVirtualKeyPress('l'); refresh(); }); }} />
            <MiniButton icon="💾" onClick={() => { handleExtraClick(() => { game.input.triggerVirtualKeyPress('h'); refresh(); }); }} />
          </div>
        )}

        <button
          onTouchStart={(e) => e.preventDefault()}
          onClick={() => { vibrate(HAPTIC_DOUBLE); setShowExtra(!showExtra); }}
          className="w-8 h-8 rounded-full bg-black/60 border border-white/15 flex items-center justify-center text-white/60 text-[10px] shrink-0"
          style={{ backdropFilter: 'blur(4px)' }}
        >
          {showExtra ? '✕' : '···'}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ── Virtual Joystick ──────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

function JoystickArea({ game, isPortrait }: { game: Game; isPortrait: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });
  const touchIdRef = useRef<number | null>(null);

  // Bigger joystick in portrait, more compact in landscape
  const TOUCH_SIZE = isPortrait ? 160 : 120;
  const VISUAL_SIZE = isPortrait ? 110 : 90;
  const KNOB_SIZE = isPortrait ? 42 : 36;
  const MAX_OFFSET = isPortrait ? 34 : 28;

  const updateKnob = useCallback((clientX: number, clientY: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > MAX_OFFSET) {
      dx = (dx / dist) * MAX_OFFSET;
      dy = (dy / dist) * MAX_OFFSET;
    }

    setKnobOffset({ x: dx, y: dy });

    if (dist >= MAX_OFFSET * 0.95) vibrate(HAPTIC_TAP);

    const nx = dx / MAX_OFFSET;
    const ny = dy / MAX_OFFSET;
    game.input.setTouchMovement(nx, ny);
  }, [game, MAX_OFFSET]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    touchIdRef.current = touch.identifier;
    setActive(true);
    vibrate(HAPTIC_TAP);
    updateKnob(touch.clientX, touch.clientY);
  }, [updateKnob]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (touchIdRef.current === null || e.changedTouches[i].identifier === touchIdRef.current) {
        updateKnob(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
        break;
      }
    }
  }, [updateKnob]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (touchIdRef.current === null || e.changedTouches[i].identifier === touchIdRef.current) {
        touchIdRef.current = null;
        setActive(false);
        setKnobOffset({ x: 0, y: 0 });
        game.input.clearTouchMovement();
        break;
      }
    }
  }, [game]);

  const visualOffset = (TOUCH_SIZE - VISUAL_SIZE) / 2;

  // Bottom position: portrait = bottom-left thumb zone; landscape = left center
  const bottomPos = isPortrait ? 112 : 'auto';
  const leftPos = isPortrait ? 12 : 8;
  const topPos = isPortrait ? 'auto' : '50%';
  const translateY = isPortrait ? undefined : '-50%';

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className="absolute pointer-events-auto"
      style={{
        width: TOUCH_SIZE,
        height: TOUCH_SIZE,
        bottom: typeof bottomPos === 'number' ? `max(${bottomPos}px, calc(${bottomPos}px + env(safe-area-inset-bottom, 0px)))` : bottomPos,
        left: `max(${leftPos}px, calc(${leftPos}px + env(safe-area-inset-left, 0px)))`,
        top: topPos !== 'auto' ? topPos : undefined,
        transform: translateY ? `translateY(${translateY})` : undefined,
      }}
    >
      {/* Visual ring */}
      <div
        className={`absolute rounded-full border-2 transition-all duration-150 ${
          active ? 'border-white/30 bg-white/[0.08]' : 'border-white/10 bg-black/30'
        }`}
        style={{
          width: VISUAL_SIZE,
          height: VISUAL_SIZE,
          left: visualOffset,
          top: visualOffset,
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
      >
        {/* Direction indicators */}
        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 text-white/20 text-[9px]">▲</div>
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-white/20 text-[9px]">▼</div>
        <div className="absolute left-1.5 top-1/2 -translate-y-1/2 text-white/20 text-[9px]">◄</div>
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 text-white/20 text-[9px]">►</div>
      </div>

      {/* Knob */}
      <div
        className={`absolute rounded-full border-2 transition-all duration-75 flex items-center justify-center ${
          active
            ? 'border-white/50 bg-white/25 scale-110 shadow-lg shadow-white/10'
            : 'border-white/20 bg-black/60'
        }`}
        style={{
          width: KNOB_SIZE,
          height: KNOB_SIZE,
          left: `calc(50% - ${KNOB_SIZE / 2}px + ${knobOffset.x}px)`,
          top: `calc(50% - ${KNOB_SIZE / 2}px + ${knobOffset.y}px)`,
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
        }}
      >
        <div className="flex items-center justify-center text-white/60 text-sm">⬤</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ── Touch Button ──────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

function TouchButton({
  icon, color, size = 'normal',
  onTouchStart, onTouchEnd, onClick,
}: {
  icon: string; color: string;
  size?: 'normal' | 'small';
  onTouchStart?: () => void; onTouchEnd?: () => void; onClick?: () => void;
}) {
  const [pressed, setPressed] = useState(false);

  const colorMap: Record<string, { ring: string; bg: string; activeBg: string }> = {
    red:    { ring: 'border-red-500/60', bg: 'bg-red-900/25', activeBg: 'bg-red-500/45' },
    blue:   { ring: 'border-blue-500/60', bg: 'bg-blue-900/25', activeBg: 'bg-blue-500/45' },
    green:  { ring: 'border-green-500/60', bg: 'bg-green-900/25', activeBg: 'bg-green-500/45' },
    purple: { ring: 'border-purple-500/60', bg: 'bg-purple-900/25', activeBg: 'bg-purple-500/45' },
    orange: { ring: 'border-orange-500/60', bg: 'bg-orange-900/25', activeBg: 'bg-orange-500/45' },
    teal:   { ring: 'border-cyan-500/60', bg: 'bg-cyan-900/25', activeBg: 'bg-cyan-500/45' },
    amber:  { ring: 'border-amber-500/60', bg: 'bg-amber-900/25', activeBg: 'bg-amber-500/45' },
    yellow: { ring: 'border-yellow-500/60', bg: 'bg-yellow-900/25', activeBg: 'bg-yellow-500/45' },
    gray:   { ring: 'border-gray-500/60', bg: 'bg-gray-800/30', activeBg: 'bg-gray-500/40' },
  };

  const c = colorMap[color] || colorMap.gray;
  const isSmall = size === 'small';
  const btnSize = isSmall ? 'w-10 h-10' : 'w-14 h-14';
  const iconSize = isSmall ? 'text-base' : 'text-xl';
  const hapticPattern = color === 'red' ? HAPTIC_STRONG
    : (color === 'blue' || color === 'green') ? HAPTIC_MEDIUM : HAPTIC_TAP;

  return (
    <button
      onTouchStart={(e) => { e.preventDefault(); setPressed(true); vibrate(hapticPattern); onTouchStart?.(); }}
      onTouchEnd={(e) => { e.preventDefault(); setPressed(false); onTouchEnd?.(); onClick?.(); }}
      onClick={(e) => { if (e.detail === 0) return; vibrate(hapticPattern); onClick?.(); }}
      className={`${btnSize} rounded-full border-2 ${c.ring} ${
        pressed ? `${c.activeBg} scale-90 shadow-2xl` : c.bg
      } transition-all duration-75 flex items-center justify-center relative`}
      style={{
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        WebkitTapHighlightColor: 'transparent',
        // Enable pointer events inside a pointer-events-none parent
      }}
    >
      <span className={`${iconSize} ${pressed ? 'scale-110' : ''} transition-transform leading-none`}>{icon}</span>
      {/* Glow ring on press */}
      {pressed && (
        <div
          className="absolute inset-0 rounded-full animate-ping opacity-30"
          style={{
            borderWidth: 2,
            borderColor: c.ring.replace('border-', '').replace('/60', '/40'),
          }}
        />
      )}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ── Mini Button (Utility) ─────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

function MiniButton({ icon, onClick }: { icon: string; onClick: () => void }) {
  const [p, setP] = useState(false);
  return (
    <button
      onTouchStart={(e) => { e.preventDefault(); setP(true); vibrate(HAPTIC_TAP); }}
      onTouchEnd={(e) => { e.preventDefault(); setP(false); }}
      onClick={() => { vibrate(HAPTIC_TAP); onClick(); }}
      className="w-9 h-9 rounded-full border border-white/15 flex items-center justify-center text-sm transition-all bg-black/50 hover:bg-white/10 active:scale-90"
      style={{
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <span className={`${p ? 'scale-90' : ''} transition-transform`}>{icon}</span>
    </button>
  );
}
