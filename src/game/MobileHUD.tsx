// ═══════════════════════════════════════════════════════════════════
// Farm Survival - Mobile HUD (Touch Controls) - OTIMIZADO
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from 'react';
import { Game } from './Game';
import { GameUIState, RARITY_COLORS } from './core/Types';
import { getItem } from './data/Items';

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

interface MobileHUDProps {
  game: Game;
  uiState: GameUIState;
}

export default function MobileHUD({ game, uiState }: MobileHUDProps) {
  const [, forceUpdate] = useState(0);
  const refresh = () => forceUpdate(n => n + 1);
  const [showExtra, setShowExtra] = useState(false);
  const [sprinting, setSprinting] = useState(false);
  const [uiAlpha, setUiAlpha] = useState(1);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check if a panel is open (hide controls)
  const panelOpen = uiState.activePanel !== 'none' && uiState.activePanel !== 'dialogue';

  // ── Transient UI: fade controls after 3s of inactivity ──
  const pokeFade = useCallback(() => {
    setUiAlpha(1);
    if (fadeTimer.current) clearTimeout(fadeTimer.current);
    fadeTimer.current = setTimeout(() => setUiAlpha(0.35), 3000);
  }, []);

  useEffect(() => {
    pokeFade();
    return () => { if (fadeTimer.current) clearTimeout(fadeTimer.current); };
  }, [pokeFade]);

  // ── Toggle sprint ──
  useEffect(() => {
    game.input.setVirtualKey('shift', sprinting);
  }, [sprinting, game]);

  // ── Poll UI updates ──
  useEffect(() => {
    const interval = setInterval(refresh, 100);
    return () => clearInterval(interval);
  }, []);

  // Close extra menu when any extra button is tapped
  const handleExtraClick = (fn: () => void) => {
    setShowExtra(false);
    fn();
  };

  const state = game.state;
  const player = state.player;
  const hotbar = player.hotbar;

  // Don't render touch controls when a panel is open
  if (panelOpen) return null;

  return (
    <div
      className="absolute inset-0 pointer-events-none z-20 select-none"
      onTouchStart={pokeFade}
      onTouchMove={pokeFade}
      onClick={pokeFade}
      style={{ transition: 'opacity 0.4s ease', opacity: uiAlpha }}
    >
      {/* ── Virtual Joystick (Left Bottom) ── */}
      <JoystickArea game={game} />

      {/* ── Sprint Toggle ── */}
      <button
        onTouchStart={(e) => { e.preventDefault(); vibrate(HAPTIC_TAP); }}
        onClick={() => { vibrate(HAPTIC_DOUBLE); setSprinting(!sprinting); }}
        className={`absolute bottom-36 left-[132px] pointer-events-auto w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all text-xs ${
          sprinting
            ? 'border-yellow-400 bg-yellow-500/30 text-yellow-300 shadow-lg shadow-yellow-500/20'
            : 'border-white/20 bg-black/50 text-white/50'
        }`}
        style={{ backdropFilter: 'blur(4px)' }}
      >
        {sprinting ? '🏃' : '🚶'}
      </button>

      {/* ── Action Buttons (Right Side) ── */}
      <div className="absolute bottom-28 right-3 flex flex-col gap-2.5 pointer-events-auto">
        {/* Attack — maior, mais acessível */}
        <TouchButton
          icon="⚔️"
          label=""
          color="red"
          onTouchStart={() => game.input.setVirtualKey('q', true)}
          onTouchEnd={() => game.input.setVirtualKey('q', false)}
          onClick={() => game.input.triggerVirtualKeyPress('q')}
        />

        {/* Interact */}
        <TouchButton
          icon="🤚"
          label=""
          color="blue"
          onTouchStart={() => game.input.setVirtualKey('e', true)}
          onTouchEnd={() => game.input.setVirtualKey('e', false)}
          onClick={() => game.input.triggerVirtualKeyPress('e')}
        />

        {/* Usar Item (equivalente a F) */}
        <TouchButton
          icon="🍽️"
          label=""
          color="green"
          onClick={() => { game.input.triggerVirtualKeyPress('f'); refresh(); }}
        />
      </div>

      {/* ── Quick Actions Row (Between Hotbar & Right Buttons) ── */}
      <div className="absolute bottom-28 right-20 flex flex-row gap-2 pointer-events-auto">
        <TouchButton
          icon="🌾"
          label=""
          color="green"
          size="small"
          onClick={() => { game.input.triggerVirtualKeyPress('p'); refresh(); }}
        />
        <TouchButton
          icon="💨"
          label=""
          color="yellow"
          size="small"
          onClick={() => { game.input.triggerVirtualKeyPress(' '); refresh(); }}
        />
      </div>

      {/* ── Hotbar (Bottom Center) ── */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-auto z-30 max-w-[95vw] overflow-x-auto no-scrollbar">
        <div className="flex gap-1">
          {hotbar.map((slot, i) => {
            const isSelected = player.currentTool === i;
            return (
              <button
                key={i}
                onTouchStart={(e) => { e.preventDefault(); }}
                onClick={() => { vibrate(HAPTIC_TAP); player.currentTool = i; refresh(); }}
                onContextMenu={(e) => { e.preventDefault(); vibrate(HAPTIC_DOUBLE); game.input.triggerVirtualKeyPress('g'); refresh(); }}
                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg border-2 flex items-center justify-center relative shrink-0 transition-all ${
                  isSelected
                    ? 'border-yellow-400 bg-yellow-400/20 scale-110 shadow-lg shadow-yellow-400/20 z-10'
                    : 'border-white/15 bg-black/60'
                }`}
              >
                {slot?.item && (
                  <>
                    <span className="text-base sm:text-lg" style={{ color: RARITY_COLORS[slot.item.rarity] }}>
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

      {/* ── Quick Utility Buttons (Top Right, compact) ── */}
      <div className="absolute top-3 right-3 flex flex-col gap-1.5 pointer-events-auto">
        <MiniButton icon="🎒" onClick={() => { game.input.triggerVirtualKeyPress('i'); refresh(); }} />
        <MiniButton icon="🔨" onClick={() => { game.input.triggerVirtualKeyPress('c'); refresh(); }} />
        <MiniButton icon="🧭" onClick={() => { game.input.triggerVirtualKeyPress('m'); refresh(); }} />

        {showExtra && (
          <>
            <MiniButton icon="🌟" onClick={() => { handleExtraClick(() => { game.input.triggerVirtualKeyPress('k'); refresh(); }); }} />
            <MiniButton icon="📜" onClick={() => { handleExtraClick(() => { game.input.triggerVirtualKeyPress('j'); refresh(); }); }} />
            <MiniButton icon="🏆" onClick={() => { handleExtraClick(() => { game.input.triggerVirtualKeyPress('l'); refresh(); }); }} />
            <MiniButton icon="💾" onClick={() => { handleExtraClick(() => { game.input.triggerVirtualKeyPress('h'); refresh(); }); }} />
          </>
        )}

        <button
          onTouchStart={(e) => e.preventDefault()}
          onClick={() => { vibrate(HAPTIC_DOUBLE); setShowExtra(!showExtra); }}
          className="w-8 h-8 rounded-full bg-black/60 border border-white/15 flex items-center justify-center text-white/60 text-[10px]"
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

function JoystickArea({ game }: { game: Game }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });
  const touchIdRef = useRef<number | null>(null);

  // Touch area (invisible, larger) vs visual (smaller, centered)
  const TOUCH_SIZE = 160;     // invisible touch target
  const VISUAL_SIZE = 120;    // visible ring
  const KNOB_SIZE = 42;
  const MAX_OFFSET = 34;

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

    // Trigger haptic at max pull
    if (dist >= MAX_OFFSET * 0.95) vibrate(HAPTIC_TAP);

    const nx = dx / MAX_OFFSET;
    const ny = dy / MAX_OFFSET;
    game.input.setTouchMovement(nx, ny);
  }, [game]);

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

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className="absolute bottom-28 left-3 pointer-events-auto"
      style={{ width: TOUCH_SIZE, height: TOUCH_SIZE }}
    >
      {/* Visual ring (centered in touch area) */}
      <div
        className={`absolute rounded-full border-2 transition-all duration-150 ${
          active ? 'border-white/30 bg-white/[0.07]' : 'border-white/10 bg-black/30'
        }`}
        style={{
          width: VISUAL_SIZE,
          height: VISUAL_SIZE,
          left: visualOffset,
          top: visualOffset,
          backdropFilter: 'blur(3px)',
        }}
      >
        {/* Direction indicators */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 text-white/15 text-[7px]">▲</div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-white/15 text-[7px]">▼</div>
        <div className="absolute left-0 top-1/2 -translate-y-1/2 text-white/15 text-[7px]">◄</div>
        <div className="absolute right-0 top-1/2 -translate-y-1/2 text-white/15 text-[7px]">►</div>
      </div>

      {/* Knob */}
      <div
        className={`absolute rounded-full border-2 transition-all duration-75 ${
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
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center text-white/50 text-base">⬤</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ── Touch Button ──────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

function TouchButton({
  icon, label, color, size = 'normal',
  onTouchStart, onTouchEnd, onClick,
}: {
  icon: string; label: string; color: string;
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
  const btnSize = isSmall ? 'w-9 h-9' : 'w-14 h-14';
  const iconSize = isSmall ? 'text-sm' : 'text-lg';
  const hapticPattern = color === 'red' ? HAPTIC_STRONG
    : (color === 'blue' || color === 'green') ? HAPTIC_MEDIUM : HAPTIC_TAP;

  return (
    <button
      onTouchStart={(e) => { e.preventDefault(); setPressed(true); vibrate(hapticPattern); onTouchStart?.(); }}
      onTouchEnd={(e) => { e.preventDefault(); setPressed(false); onTouchEnd?.(); onClick?.(); }}
      onClick={(e) => { if (e.detail === 0) return; vibrate(hapticPattern); onClick?.(); }}
      className={`${btnSize} rounded-full border-2 ${c.ring} ${
        pressed ? `${c.activeBg} scale-90` : c.bg
      } transition-all duration-75 flex items-center justify-center relative shadow-lg`}
      style={{ backdropFilter: 'blur(4px)', WebkitTapHighlightColor: 'transparent' }}
    >
      <span className={`${iconSize} ${pressed ? 'scale-110' : ''} transition-transform leading-none`}>{icon}</span>
      {label && <span className="absolute -bottom-3.5 text-[6px] text-white/40 whitespace-nowrap font-medium">{label}</span>}
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
      className={`w-8 h-8 rounded-full border border-white/15 flex items-center justify-center text-xs transition-all ${
        p ? 'bg-white/20 scale-90' : 'bg-black/50'
      }`}
      style={{ backdropFilter: 'blur(4px)', WebkitTapHighlightColor: 'transparent' }}
    >
      {icon}
    </button>
  );
}
