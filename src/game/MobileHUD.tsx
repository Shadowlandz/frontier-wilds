// ═══════════════════════════════════════════════════════════════════
// Farm Survival - Mobile HUD (Touch Controls)
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from 'react';
import { Game } from './Game';
import { GameUIState, RARITY_COLORS } from './core/Types';
import { getItem } from './data/Items';

interface MobileHUDProps {
  game: Game;
  uiState: GameUIState;
}

export default function MobileHUD({ game, uiState }: MobileHUDProps) {
  const [, forceUpdate] = useState(0);
  const refresh = () => forceUpdate(n => n + 1);
  const [showExtra, setShowExtra] = useState(false);

  // ── Poll UI updates ──
  useEffect(() => {
    const interval = setInterval(refresh, 100);
    return () => clearInterval(interval);
  }, []);

  const state = game.state;
  const player = state.player;
  const stats = player.stats;
  const hotbar = player.hotbar;

  return (
    <div className="absolute inset-0 pointer-events-none z-20">
      {/* ── Virtual Joystick (Left) ── */}
      <JoystickArea game={game} />

      {/* ── Action Buttons (Right) ── */}
      <div className="absolute bottom-28 right-4 flex flex-col gap-3 pointer-events-auto">
        {/* Attack Button */}
        <TouchButton
          icon="⚔️"
          label="Atacar"
          color="red"
          onTouchStart={() => game.input.setVirtualKey('q', true)}
          onTouchEnd={() => game.input.setVirtualKey('q', false)}
          onClick={() => game.input.triggerVirtualKeyPress('q')}
        />

        {/* Interact / Use Button */}
        <TouchButton
          icon="🤚"
          label="Interagir"
          color="blue"
          onTouchStart={() => game.input.setVirtualKey('e', true)}
          onTouchEnd={() => game.input.setVirtualKey('e', false)}
          onClick={() => game.input.triggerVirtualKeyPress('e')}
        />

        {/* Farm Button */}
        <TouchButton
          icon="🌾"
          label="Plantar"
          color="green"
          onClick={() => { game.input.triggerVirtualKeyPress('p'); refresh(); }}
        />
      </div>

      {/* ── Hotbar (Bottom Center) ── */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto z-30">
        <div className="flex gap-1.5">
          {hotbar.map((slot, i) => {
            const isSelected = player.currentTool === i;
            return (
              <button
                key={i}
                onClick={() => { player.currentTool = i; refresh(); }}
                onContextMenu={(e) => { e.preventDefault(); game.input.triggerVirtualKeyPress('g'); refresh(); }}
                className={`w-11 h-11 rounded-lg border-2 flex items-center justify-center relative transition-all ${
                  isSelected
                    ? 'border-yellow-400 bg-yellow-400/20 scale-110 shadow-lg shadow-yellow-400/20'
                    : 'border-white/20 bg-black/60 hover:border-white/40'
                }`}
              >
                {slot?.item && (
                  <>
                    <span className="text-lg" style={{ color: RARITY_COLORS[slot.item.rarity] }}>
                      {slot.unidentified ? '❓' : slot.item.icon}
                    </span>
                    {slot.count > 1 && (
                      <span className="absolute -bottom-0.5 -right-0.5 text-[8px] text-white font-bold bg-black/70 rounded px-0.5 leading-tight">
                        {slot.count}
                      </span>
                    )}
                  </>
                )}
                <span className="absolute -top-1 -left-0.5 text-[7px] text-white/40 font-bold">{i + 1}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Extra Utility Buttons (Top Right) ── */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 pointer-events-auto">
        <TouchButton
          icon="🎒"
          label="Inventário"
          color="purple"
          size="small"
          onClick={() => { game.input.triggerVirtualKeyPress('i'); refresh(); }}
        />
        <TouchButton
          icon="🔨"
          label="Craft"
          color="orange"
          size="small"
          onClick={() => { game.input.triggerVirtualKeyPress('c'); refresh(); }}
        />
        <TouchButton
          icon="🧭"
          label="Mapa"
          color="teal"
          size="small"
          onClick={() => { game.input.triggerVirtualKeyPress('m'); refresh(); }}
        />

        {showExtra && (
          <>
            <TouchButton icon="🌟" label="Skills" color="purple" size="small"
              onClick={() => { game.input.triggerVirtualKeyPress('k'); refresh(); }} />
            <TouchButton icon="📜" label="Missões" color="amber" size="small"
              onClick={() => { game.input.triggerVirtualKeyPress('j'); refresh(); }} />
            <TouchButton icon="🏆" label="Conquistas" color="yellow" size="small"
              onClick={() => { game.input.triggerVirtualKeyPress('l'); refresh(); }} />
            <TouchButton icon="💾" label="Salvar" color="gray" size="small"
              onClick={() => { game.input.triggerVirtualKeyPress('h'); refresh(); }} />
          </>
        )}

        <button
          onClick={() => setShowExtra(!showExtra)}
          className="w-10 h-10 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white/70 text-xs hover:bg-white/10 transition-all"
        >
          {showExtra ? '✕' : '···'}
        </button>
      </div>

      {/* ── Controls Hint ── */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 pointer-events-none text-white/20 text-[8px] text-center leading-tight">
        Toque nos botões ou use o joystick
      </div>
    </div>
  );
}

// ── Virtual Joystick ──────────────────────────────────────────────
function JoystickArea({ game }: { game: Game }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });
  const knobRef = useRef<HTMLDivElement>(null);
  const touchIdRef = useRef<number | null>(null);
  const JOYSTICK_SIZE = 130;
  const KNOB_RADIUS = 22;
  const MAX_OFFSET = 35;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    touchIdRef.current = touch.identifier;
    setActive(true);
    updateKnob(touch.clientX, touch.clientY);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touchIdRef.current === null || touch.identifier === touchIdRef.current) {
        updateKnob(touch.clientX, touch.clientY);
        break;
      }
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touchIdRef.current === null || touch.identifier === touchIdRef.current) {
        touchIdRef.current = null;
        setActive(false);
        setKnobOffset({ x: 0, y: 0 });
        game.input.clearTouchMovement();
        break;
      }
    }
  }, [game]);

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

    // Normalize movement (-1..1)
    const nx = dx / MAX_OFFSET;
    const ny = dy / MAX_OFFSET;
    game.input.setTouchMovement(nx, ny);
  }, [game]);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className="absolute bottom-32 left-6 pointer-events-auto select-none"
      style={{ width: JOYSTICK_SIZE, height: JOYSTICK_SIZE }}
    >
      {/* Joystick base */}
      <div
        className={`absolute inset-0 rounded-full border-2 transition-all duration-100 ${
          active ? 'border-white/40 bg-white/10' : 'border-white/15 bg-black/40'
        }`}
        style={{ backdropFilter: 'blur(4px)' }}
      >
        {/* Center dot */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-white/20" />
      </div>

      {/* Knob */}
      <div
        ref={knobRef}
        className={`absolute rounded-full border-2 transition-all duration-75 ${
          active ? 'border-white/60 bg-white/20 scale-110' : 'border-white/30 bg-black/50'
        }`}
        style={{
          width: KNOB_RADIUS * 2,
          height: KNOB_RADIUS * 2,
          left: `calc(50% - ${KNOB_RADIUS}px + ${knobOffset.x}px)`,
          top: `calc(50% - ${KNOB_RADIUS}px + ${knobOffset.y}px)`,
          backdropFilter: 'blur(2px)',
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center text-white/60 text-sm">⬤</div>
      </div>
    </div>
  );
}

// ── Touch Button ──────────────────────────────────────────────────
function TouchButton({
  icon,
  label,
  color,
  size = 'normal',
  onTouchStart,
  onTouchEnd,
  onClick,
}: {
  icon: string;
  label: string;
  color: string;
  size?: 'normal' | 'small';
  onTouchStart?: () => void;
  onTouchEnd?: () => void;
  onClick?: () => void;
}) {
  const [pressed, setPressed] = useState(false);

  const colorMap: Record<string, { ring: string; bg: string; activeBg: string }> = {
    red: { ring: 'border-red-500/50', bg: 'bg-red-900/30', activeBg: 'bg-red-600/40' },
    blue: { ring: 'border-blue-500/50', bg: 'bg-blue-900/30', activeBg: 'bg-blue-600/40' },
    green: { ring: 'border-green-500/50', bg: 'bg-green-900/30', activeBg: 'bg-green-600/40' },
    purple: { ring: 'border-purple-500/50', bg: 'bg-purple-900/30', activeBg: 'bg-purple-600/40' },
    orange: { ring: 'border-orange-500/50', bg: 'bg-orange-900/30', activeBg: 'bg-orange-600/40' },
    teal: { ring: 'border-cyan-500/50', bg: 'bg-cyan-900/30', activeBg: 'bg-cyan-600/40' },
    amber: { ring: 'border-amber-500/50', bg: 'bg-amber-900/30', activeBg: 'bg-amber-600/40' },
    yellow: { ring: 'border-yellow-500/50', bg: 'bg-yellow-900/30', activeBg: 'bg-yellow-600/40' },
    gray: { ring: 'border-gray-500/50', bg: 'bg-gray-900/30', activeBg: 'bg-gray-600/40' },
  };

  const c = colorMap[color] || colorMap.gray;
  const isSmall = size === 'small';
  const btnSize = isSmall ? 'w-10 h-10' : 'w-14 h-14';
  const iconSize = isSmall ? 'text-base' : 'text-xl';

  return (
    <button
      onTouchStart={(e) => {
        e.preventDefault();
        setPressed(true);
        onTouchStart?.();
      }}
      onTouchEnd={(e) => {
        e.preventDefault();
        setPressed(false);
        onTouchEnd?.();
        onClick?.();
      }}
      onClick={(e) => {
        // Only trigger on actual clicks (not from touch simulation)
        if (e.detail === 0) return;
        onClick?.();
      }}
      className={`${btnSize} rounded-full border-2 ${c.ring} ${pressed ? c.activeBg + ' scale-90' : c.bg} transition-all duration-75 flex items-center justify-center relative`}
      style={{ backdropFilter: 'blur(4px)' }}
    >
      <span className={`${iconSize} ${pressed ? 'scale-110' : ''} transition-transform`}>{icon}</span>
      <span className="absolute -bottom-4 text-[7px] text-white/50 whitespace-nowrap">{label}</span>
    </button>
  );
}
