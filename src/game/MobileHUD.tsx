// ═══════════════════════════════════════════════════════════════════
// Farm Survival - Mobile HUD (Touch Controls)
// Orientation-Responsive | Auto-Target | Long Press Tooltips
// Professional Touch Interaction System
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from 'react';
import { Game } from './Game';
import { Input } from './core/Input';
import { GameUIState, RARITY_COLORS, Rarity } from './core/Types';
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
const HAPTIC_LONG = 40;

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

// ── Long Press Hook (inline for simplicity) ──────────────────────
function useLongPress(
  onLongPress: () => void,
  duration = 400,
): {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
} {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongRef = useRef(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    isLongRef.current = false;
    timerRef.current = setTimeout(() => {
      isLongRef.current = true;
      vibrate(HAPTIC_LONG);
      onLongPress();
    }, duration);
  }, [duration, onLongPress]);

  const onTouchMove = useCallback(() => {
    // Cancel on move to prevent accidental long-press while scrolling
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return { onTouchStart, onTouchMove, onTouchEnd };
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

  // ── Tooltip state ──
  const [tooltipItem, setTooltipItem] = useState<{ id: string; x: number; y: number } | null>(null);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // ── Direct panel toggles ──
  const togglePanel = (panel: string) => {
    game.setActivePanel(uiState.activePanel === panel ? 'none' : panel as any);
    refresh();
  };

  const handleExtraClick = (fn: () => void) => {
    setShowExtra(false);
    fn();
  };

  // ── Auto-target attack ──
  const doAutoTargetAttack = useCallback(() => {
    const player = game.state.player;
    const px = player.x + 12;
    const py = player.y + 12;

    // Get current enemies (surface, cave, or cursed lands)
    let enemies: { x: number; y: number; width: number; height: number; state: string; hp: number }[] = [];
    if (game.inCave) enemies = game.caveEnemies;
    else if (game.inCursedLands) enemies = game.cursedLandsEnemies;
    else enemies = game.enemies;

    const tool = player.hotbar[player.currentTool]?.item;
    const attackRange = tool?.range ?? 40;

    const nearest = Input.getNearestEnemy(px, py, enemies, attackRange + 60);
    if (nearest) {
      // Face the enemy
      const ex = nearest.x + nearest.width / 2;
      const ey = nearest.y + nearest.height / 2;
      const dx = ex - px;
      const dy = ey - py;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        player.facing.x = dx / dist;
        player.facing.y = dy / dist;
      }
    }

    vibrate(HAPTIC_STRONG);
    game.input.triggerVirtualKeyPress('q');
    refresh();
  }, [game]);

  // ── Auto-interact (closest NPC, item, resource, crop) ──
  const doInteract = useCallback(() => {
    vibrate(HAPTIC_MEDIUM);
    game.input.triggerVirtualKeyPress('e');
    refresh();
  }, [game]);

  // ── Use/food item ──
  const doUseItem = useCallback(() => {
    vibrate(HAPTIC_MEDIUM);
    game.input.triggerVirtualKeyPress('f');
    refresh();
  }, [game]);

  // ── Plant action ──
  const doPlant = useCallback(() => {
    vibrate(HAPTIC_TAP);
    game.input.triggerVirtualKeyPress('p');
    refresh();
  }, [game]);

  // ── Hotbar tooltip via long press ──
  const showHotbarTooltip = useCallback((slotIdx: number, e: React.TouchEvent) => {
    const slot = game.state.player.hotbar[slotIdx];
    if (!slot?.item) return;
    const touch = e.changedTouches[0];
    setTooltipItem({
      id: slot.item.id,
      x: touch.clientX,
      y: touch.clientY - 100,
    });
    // Auto-hide after 3s
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    tooltipTimer.current = setTimeout(() => setTooltipItem(null), 3000);
  }, [game]);

  const state = game.state;
  const player = state.player;
  const hotbar = player.hotbar;
  const isPortrait = orientation === 'portrait';

  if (panelOpen) return null;

  return (
    <div
      className="absolute inset-0 pointer-events-none z-20 select-none"
      onTouchStart={pokeFade}
      onTouchMove={pokeFade}
      onClick={pokeFade}
      style={{
        transition: 'opacity 0.4s ease',
        opacity: uiAlpha,
        touchAction: 'manipulation',
        overscrollBehavior: 'none',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {/* ── Virtual Joystick ── */}
      <JoystickArea game={game} isPortrait={isPortrait} />

      {/* ── Sprint Toggle ── */}
      <button
        onClick={() => { vibrate(HAPTIC_DOUBLE); setSprinting(!sprinting); }}
        style={{
          backdropFilter: 'blur(4px)',
          bottom: isPortrait
            ? `max(144px, calc(144px + env(safe-area-inset-bottom, 0px)))`
            : `max(16px, calc(16px + env(safe-area-inset-bottom, 0px)))`,
          left: isPortrait
            ? `max(136px, calc(136px + env(safe-area-inset-left, 0px)))`
            : `max(196px, calc(196px + env(safe-area-inset-left, 0px)))`,
        }}
        className={`absolute pointer-events-auto w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all text-xs ${
          sprinting
            ? 'border-yellow-400 bg-yellow-500/30 text-yellow-300 shadow-lg shadow-yellow-500/20'
            : 'border-white/20 bg-black/50 text-white/50'
        }`}
      >
        {sprinting ? '🏃' : '🚶'}
      </button>

      {/* ── Right Action Cluster ── */}
      <div
        style={{
          bottom: isPortrait
            ? `max(100px, calc(100px + env(safe-area-inset-bottom, 0px)))`
            : `max(16px, calc(16px + env(safe-area-inset-bottom, 0px)))`,
          right: `max(12px, calc(12px + env(safe-area-inset-right, 0px)))`,
        }}
        className={`absolute flex pointer-events-auto ${isPortrait ? 'flex-col gap-2.5 items-end' : 'flex-row-reverse gap-2 items-end'}`}
      >
        {/* Attack with auto-target */}
        <TouchButton
          icon="⚔️"
          color="red"
          size={isPortrait ? 'normal' : 'small'}
          onClick={doAutoTargetAttack}
        />

        {/* Interact */}
        <TouchButton
          icon="🤚"
          color="blue"
          size={isPortrait ? 'normal' : 'small'}
          onClick={doInteract}
        />

        {/* Use/Food */}
        <TouchButton
          icon="🍽️"
          color="green"
          size={isPortrait ? 'normal' : 'small'}
          onClick={doUseItem}
        />
      </div>

      {/* ── Quick Actions ── */}
      <div
        style={{
          bottom: isPortrait
            ? `max(216px, calc(216px + env(safe-area-inset-bottom, 0px)))`
            : `max(84px, calc(84px + env(safe-area-inset-bottom, 0px)))`,
          right: `max(12px, calc(12px + env(safe-area-inset-right, 0px)))`,
          gap: '8px',
        }}
        className={`absolute flex pointer-events-auto ${isPortrait ? 'flex-row' : 'flex-row'}`}
      >
        <QuickButton icon="🌾" label="Plantar" onClick={doPlant} />
      </div>

      {/* ── Crosshair / Aim Indicator (when enemies near) ── */}
      <CrosshairOverlay game={game} />

      {/* ── Hotbar ── */}
      <div
        style={{
          bottom: isPortrait
            ? `max(8px, calc(8px + env(safe-area-inset-bottom, 0px)))`
            : `max(8px, calc(8px + env(safe-area-inset-bottom, 0px)))`,
          left: '50%',
          transform: 'translateX(-50%)',
        }}
        className="absolute pointer-events-auto z-30 max-w-[94vw]"
      >
        <div className="flex gap-1 px-1 overflow-x-auto no-scrollbar">
          {hotbar.map((slot, i) => {
            const isSelected = player.currentTool === i;
            const hs = isPortrait ? 'w-12 h-12' : 'w-10 h-10';
            const longPressHandlers = useLongPress(
              () => {
                const s = game.state.player.hotbar[i];
                if (s?.item) {
                  // Show tooltip
                  const touch = lastTouchRef.current;
                  if (touch) {
                    setTooltipItem({
                      id: s.item.id,
                      x: touch.clientX,
                      y: touch.clientY - 80,
                    });
                    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
                    tooltipTimer.current = setTimeout(() => setTooltipItem(null), 3000);
                  }
                }
              },
              400
            );

            return (
              <button
                key={i}
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
                    {slot.item.healAmount && (
                      <span className="absolute -top-1 -left-1 text-[6px]">❤️</span>
                    )}
                  </>
                )}
                {/* Long press handlers */}
                <span
                  className="absolute inset-0"
                  onTouchStart={(e) => { e.preventDefault(); longPressHandlers.onTouchStart(e); }}
                  onTouchMove={(e) => longPressHandlers.onTouchMove(e)}
                  onTouchEnd={(e) => { e.preventDefault(); longPressHandlers.onTouchEnd(e); }}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Utility Buttons (Top Right) ── */}
      <div
        style={{
          top: `max(8px, calc(8px + env(safe-area-inset-top, 0px)))`,
          right: `max(8px, calc(8px + env(safe-area-inset-right, 0px)))`,
        }}
        className={`absolute flex pointer-events-auto ${isPortrait ? 'flex-col gap-1.5' : 'flex-row gap-2 items-start'}`}
      >
        <MiniButton icon="🎒" label="Inventário" onClick={() => { togglePanel('inventory'); }} />
        <MiniButton icon="🔨" label="Craft" onClick={() => { togglePanel('crafting'); }} />
        <MiniButton icon="🧭" label="Mapa" onClick={() => { game.input.triggerVirtualKeyPress('m'); refresh(); }} />

        {showExtra && (
          <div className={`flex ${isPortrait ? 'flex-col' : 'flex-row'} gap-1.5`}>
            <MiniButton icon="🌟" label="Skills" onClick={() => { handleExtraClick(() => { togglePanel('skills'); }); }} />
            <MiniButton icon="📜" label="Missões" onClick={() => { handleExtraClick(() => { togglePanel('quests'); }); }} />
            <MiniButton icon="🏆" label="Conquistas" onClick={() => { handleExtraClick(() => { togglePanel('achievements'); }); }} />
            <MiniButton icon="💾" label="Salvar" onClick={() => { handleExtraClick(() => { togglePanel('save'); }); }} />
          </div>
        )}

        <button
          onClick={() => { vibrate(HAPTIC_DOUBLE); setShowExtra(!showExtra); }}
          className="w-8 h-8 rounded-full bg-black/60 border border-white/15 flex items-center justify-center text-white/60 text-[10px] shrink-0"
          style={{ backdropFilter: 'blur(4px)' }}
        >
          {showExtra ? '✕' : '···'}
        </button>
      </div>

      {/* ── Floating Tooltip ── */}
      {tooltipItem && (() => {
        const item = getItem(tooltipItem.id);
        if (!item) return null;
        return (
          <div
            className="fixed z-[100] pointer-events-none"
            style={{
              left: Math.min(tooltipItem.x, window.innerWidth - 180),
              top: Math.max(tooltipItem.y, 20),
            }}
          >
            <div className="bg-gray-900/95 backdrop-blur-md border border-white/10 rounded-xl p-2.5 w-40 shadow-2xl shadow-black/60">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-lg">{item.icon}</span>
                <div className="text-xs font-bold truncate" style={{ color: RARITY_COLORS[item.rarity as Rarity] || '#fff' }}>
                  {item.name}
                </div>
              </div>
              <div className="text-[9px] text-white/50 leading-tight mb-1">{item.description}</div>
              <div className="text-[8px] text-white/30 flex justify-between">
                <span>{item.rarity}</span>
                <span>💰 {item.value}</span>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── Track last touch position for tooltip positioning ──
const lastTouchRef = { current: null as { clientX: number; clientY: number } | null };

// ═══════════════════════════════════════════════════════════════════
// ── Crosshair Overlay ────────────────────────────────────────────
// Shows nearest enemy direction when attack button is held
// ═══════════════════════════════════════════════════════════════════

function CrosshairOverlay({ game }: { game: Game }) {
  const [targetData, setTargetData] = useState<{ dx: number; dy: number; dist: number } | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const player = game.state.player;
      const px = player.x + 12;
      const py = player.y + 12;

      let enemies: { x: number; y: number; width: number; height: number; state: string; hp: number }[] = [];
      if (game.inCave) enemies = game.caveEnemies;
      else if (game.inCursedLands) enemies = game.cursedLandsEnemies;
      else enemies = game.enemies;

      const tool = player.hotbar[player.currentTool]?.item;
      const attackRange = tool?.range ?? 40;
      const nearest = Input.getNearestEnemy(px, py, enemies, attackRange + 80);

      if (nearest) {
        const ex = nearest.x + nearest.width / 2;
        const ey = nearest.y + nearest.height / 2;
        const dx = ex - px;
        const dy = ey - py;
        const dist = Math.sqrt(dx * dx + dy * dy);
        setTargetData({ dx, dy, dist });
      } else {
        setTargetData(null);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [game]);

  if (!targetData || targetData.dist > 250) return null;

  // Position crosshair at enemy direction from center of screen
  const angle = Math.atan2(targetData.dy, targetData.dx);
  const screenDist = Math.min(targetData.dist * 2, 120);
  const cx = window.innerWidth / 2 + Math.cos(angle) * screenDist;
  const cy = window.innerHeight / 2 + Math.sin(angle) * screenDist;

  return (
    <div
      className="absolute pointer-events-none z-10"
      style={{
        left: cx - 14,
        top: cy - 14,
        width: 28,
        height: 28,
      }}
    >
      {/* Outer ring */}
      <div className="absolute inset-0 rounded-full border-2 border-red-500/50 animate-pulse" />
      {/* Inner dot */}
      <div className="absolute inset-[6px] rounded-full bg-red-500/70 shadow-lg shadow-red-500/40" />
      {/* Direction lines */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-2.5 bg-red-400/60 rounded" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0.5 h-2.5 bg-red-400/60 rounded" />
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2.5 h-0.5 bg-red-400/60 rounded" />
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-0.5 bg-red-400/60 rounded" />
      </div>
      {/* Distance label */}
      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[7px] text-red-400/70 whitespace-nowrap">
        {Math.round(targetData.dist)}px
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

  // Track last touch for tooltip
  const handleTouchMoveTrack = useCallback((e: React.TouchEvent) => {
    const touch = e.changedTouches[0];
    lastTouchRef.current = { clientX: touch.clientX, clientY: touch.clientY };
    handleTouchMove(e);
  }, [handleTouchMove]);

  const handleTouchStartTrack = useCallback((e: React.TouchEvent) => {
    const touch = e.changedTouches[0];
    lastTouchRef.current = { clientX: touch.clientX, clientY: touch.clientY };
    handleTouchStart(e);
  }, [handleTouchStart]);

  const visualOffset = (TOUCH_SIZE - VISUAL_SIZE) / 2;

  const bottomPos = isPortrait ? 112 : 'auto';
  const leftPos = isPortrait ? 12 : 8;
  const topPos = isPortrait ? 'auto' : '50%';

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStartTrack}
      onTouchMove={handleTouchMoveTrack}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className="absolute pointer-events-auto"
      style={{
        width: TOUCH_SIZE,
        height: TOUCH_SIZE,
        bottom: typeof bottomPos === 'number' ? `max(${bottomPos}px, calc(${bottomPos}px + env(safe-area-inset-bottom, 0px)))` : bottomPos,
        left: `max(${leftPos}px, calc(${leftPos}px + env(safe-area-inset-left, 0px)))`,
        top: topPos !== 'auto' ? topPos : undefined,
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
  icon, color, size = 'normal', onClick,
}: {
  icon: string; color: string;
  size?: 'normal' | 'small';
  onClick?: () => void;
}) {
  const [pressed, setPressed] = useState(false);

  const colorMap: Record<string, { ring: string; bg: string; activeBg: string }> = {
    red:    { ring: 'border-red-500/60', bg: 'bg-red-900/25', activeBg: 'bg-red-500/45' },
    blue:   { ring: 'border-blue-500/60', bg: 'bg-blue-900/25', activeBg: 'bg-blue-500/45' },
    green:  { ring: 'border-green-500/60', bg: 'bg-green-900/25', activeBg: 'bg-green-500/45' },
    purple: { ring: 'border-purple-500/60', bg: 'bg-purple-900/25', activeBg: 'bg-purple-500/45' },
    orange: { ring: 'border-orange-500/60', bg: 'bg-orange-900/25', activeBg: 'bg-orange-500/45' },
    cyan:   { ring: 'border-cyan-500/60', bg: 'bg-cyan-900/25', activeBg: 'bg-cyan-500/45' },
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
      onTouchStart={(e) => { e.preventDefault(); setPressed(true); vibrate(hapticPattern); }}
      onTouchEnd={(e) => { e.preventDefault(); setPressed(false); onClick?.(); }}
      className={`${btnSize} rounded-full border-2 ${c.ring} ${
        pressed ? `${c.activeBg} scale-90 shadow-2xl` : c.bg
      } transition-all duration-75 flex items-center justify-center relative`}
      style={{
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <span className={`${iconSize} ${pressed ? 'scale-110' : ''} transition-transform leading-none`}>{icon}</span>
      {pressed && (
        <div
          className="absolute inset-0 rounded-full animate-ping opacity-30"
          style={{ borderWidth: 2, borderColor: c.ring.replace('border-', '').replace('/60', '/40') }}
        />
      )}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ── Quick Action Button ───────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

function QuickButton({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      onTouchStart={(e) => { e.preventDefault(); setPressed(true); vibrate(HAPTIC_TAP); }}
      onTouchEnd={(e) => { e.preventDefault(); setPressed(false); onClick(); }}
      className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/60 border border-white/15 text-white/80 text-xs transition-all"
      style={{
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        WebkitTapHighlightColor: 'transparent',
        transform: pressed ? 'scale(0.92)' : 'scale(1)',
      }}
    >
      <span>{icon}</span>
      <span className="text-[10px]">{label}</span>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ── Mini Button (Utility) ─────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

function MiniButton({ icon, label, onClick }: { icon: string; label?: string; onClick: () => void }) {
  const [p, setP] = useState(false);
  return (
    <button
      onTouchStart={(e) => { e.preventDefault(); setP(true); vibrate(HAPTIC_TAP); }}
      onTouchEnd={(e) => { e.preventDefault(); setP(false); }}
      onClick={() => { vibrate(HAPTIC_TAP); onClick(); }}
      className="w-9 h-9 rounded-full border border-white/15 flex items-center justify-center text-sm transition-all bg-black/50 active:scale-90"
      style={{
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        WebkitTapHighlightColor: 'transparent',
        transform: p ? 'scale(0.9)' : undefined,
      }}
    >
      <span>{icon}</span>
    </button>
  );
}
