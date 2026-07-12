// ═══════════════════════════════════════════════════════════════════
// Farm Survival - Main Game Page
// ═══════════════════════════════════════════════════════════════════

import { useRef, useEffect, useState } from 'react';
import { Game } from './Game';
import { Input } from './core/Input';
import { getAudioEngine } from './core/AudioEngine';
import { GameState, GameUIState, PanelType, ItemCategory, RARITY_COLORS, Rarity, InventorySlot, TILE_SIZE, WORLD_WIDTH, WORLD_HEIGHT, ACHIEVEMENTS, AchievementProgress } from './core/Types';
import { getItem } from './data/Items';
import { RECIPES } from './data/Recipes';
import { getSpell } from './data/Spells';
import { SKILLS, getSkillsByTree } from './data/Skills';
import { QUESTS } from './data/Quests';
import { NPCS } from './data/Npcs';
import { formatTime } from './core/Utils';
import { getAllSaveSlots, formatSaveDate, getMaxSaveSlots, type SaveSlotInfo } from './systems/SaveSystem';
import MobileHUD from './MobileHUD';

// ── Time helpers for HUD ────────────────────────────────────────────

const HUD_PERIOD_ICONS: Record<string, string> = {
  madrugada: '🌙', amanhecer: '🌅', manha: '☀️',
  meioDia: '☀️', tarde: '⛅', porDoSol: '🌇', noite: '🌙',
};

const HUD_PERIOD_LABELS: Record<string, string> = {
  madrugada: 'Madrugada', amanhecer: 'Amanhecer', manha: 'Manhã',
  meioDia: 'Meio-Dia', tarde: 'Tarde', porDoSol: 'Pôr do Sol', noite: 'Noite',
};

function getHudPeriod(hour: number): string {
  if (hour < 5) return 'madrugada';
  if (hour < 7) return 'amanhecer';
  if (hour < 12) return 'manha';
  if (hour < 14) return 'meioDia';
  if (hour < 18) return 'tarde';
  if (hour < 19) return 'porDoSol';
  return 'noite';
}

function getPeriodIcon(hour: number): string {
  return HUD_PERIOD_ICONS[getHudPeriod(hour)] || '☀️';
}

function getPeriodLabel(hour: number): string {
  return HUD_PERIOD_LABELS[getHudPeriod(hour)] || '';
}

export default function GamePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [uiState, setUiState] = useState<GameUIState | null>(null);
  const [selectedHotbar, setSelectedHotbar] = useState(0);

  useEffect(() => {
    if (!canvasRef.current) return;

    const game = new Game(getAudioEngine());
    let lastReactUpdate = 0;
    const REACT_THROTTLE_MS = 50;

    game.init(canvasRef.current, (state, ui) => {
      const now = performance.now();
      if (now - lastReactUpdate > REACT_THROTTLE_MS) {
        lastReactUpdate = now;
        setGameState({ ...state });
        setUiState({ ...ui });
      }
    });
    game.start();
    gameRef.current = game;

    return () => {
      game.stop();
    };
  }, []);

  const game = gameRef.current;
  const loaded = game && gameState && uiState;
  const stats = loaded ? gameState.player.stats : null;
  const player = loaded ? gameState.player : null;
  const gameTime = loaded ? gameState.gameTime : null;
  const notifications = loaded ? gameState.notifications : [];

  return (
    <div className="w-screen h-screen bg-black overflow-hidden relative select-none" style={{ fontFamily: 'monospace' }}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        tabIndex={0}
      />

      {!loaded ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="text-white text-xl animate-pulse">Carregando Farm Survival...</div>
        </div>
      ) : (
        <>
          <HUD
            game={game!}
            stats={stats!}
            gameTime={gameTime!}
            selectedTool={player!.currentTool}
            hotbar={player!.hotbar}
            notifications={notifications}
            player={player!}
          />

          {gameState.settings.showMinimap && (
            <div className="absolute top-24 right-4 z-10 pointer-events-none">
              <Minmap game={game!} />
            </div>
          )}

          {uiState.showMap && (
            <WorldMap game={game!} />
          )}

          {game.achievementQueue && game.achievementQueue.length > 0 && (
            <AchievementPopup game={game} achievementId={game.achievementQueue[game.achievementQueue.length - 1]} />
          )}

          {!Input.isMobileDevice() && (
            <Hotbar
              hotbar={player!.hotbar}
              selected={player!.currentTool}
              onSelect={(i) => { player!.currentTool = i; setSelectedHotbar(i); }}
              game={game!}
            />
          )}

          <BottomBar stats={stats!} />

          {uiState.activePanel === 'inventory' && (
            <InventoryPanel game={game!} />
          )}
          {uiState.activePanel === 'crafting' && (
            <CraftingPanel game={game!} uiState={uiState} />
          )}
          {uiState.activePanel === 'skills' && (
            <SkillsPanel game={game!} />
          )}
          {uiState.activePanel === 'quests' && (
            <QuestsPanel game={game!} />
          )}
          {uiState.activePanel === 'achievements' && (
            <AchievementsPanel game={game!} />
          )}
          {uiState.activePanel === 'shop' && (
            <ShopPanel game={game!} uiState={uiState} />
          )}
          {uiState.activePanel === 'forge' && (
            <ForgePanel game={game!} />
          )}
          {uiState.activePanel === 'dialogue' && (
            <DialoguePanel game={game!} uiState={uiState} />
          )}
          {uiState.activePanel === 'save' && (
            <SavePanel game={game!} />
          )}

          {uiState.activePanel === 'furnace' && (
            <FurnacePanel game={game!} />
          )}
          {uiState.activePanel === 'sleep' && (
            <SleepPanel game={game!} />
          )}
          {uiState.activePanel === 'spellbook' && (
            <SpellbookPanel game={game!} />
          )}

          {uiState.activePanel === 'inventory' && game.state.activeStorageChestId && (
            <StoragePanel game={game!} />
          )}

          {!Input.isMobileDevice() && (
            <>
              <FarmingBar game={game!} />
              <FishingBar game={game!} />
            </>
          )}

          {Input.isMobileDevice() ? (
            <MobileHUD game={game!} uiState={uiState} />
          ) : (
            <div className="absolute bottom-16 left-4 text-white/30 text-[10px] pointer-events-none">
              WASD=Mover | E=Interagir | Q=Atacar | R=Magia | T=Grimorio | F=Usar | G=Soltar | I=Inv | C=Craft | K=Hab | J=Miss | L=Conq | M=Mapa | P=Plantar | H=Salvar
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Helper: notification class ────────────────────────────────────
function getNotificationClass(type: string): string {
  // All notifications: gray background + rounded borders + green text
  // Type is used only for the left border accent color
  const accents: Record<string, string> = {
    success: 'border-l-green-500', warning: 'border-l-yellow-500',
    error: 'border-l-red-500', item: 'border-l-purple-500', quest: 'border-l-amber-500',
  };
  const accent = accents[type] || 'border-l-blue-500';
  return `bg-gray-800/85 text-green-300 border border-gray-600/30 ${accent} rounded-xl`;
}

// ── HUD Component ─────────────────────────────────────────────────
function HUD({ game, stats, gameTime, selectedTool, hotbar, notifications, player }: {
  game: Game;
  stats: GameState['player']['stats'];
  gameTime: GameState['gameTime'];
  selectedTool: number;
  hotbar: GameState['player']['hotbar'];
  notifications: GameState['notifications'];
  player?: GameState['player'];
}) {
  const weatherIcon: Record<string, string> = {
    clear: '☀️', rain: '🌧️', heavyRain: '⛈️', fog: '🌫️', snow: '❄️', storm: '⛈️'
  };
  const seasonIcon: Record<string, string> = {
    spring: '🌸', summer: '☀️', autumn: '🍂', winter: '❄️'
  };

  const wi = weatherIcon[gameTime.weather] || '☀️';
  const si = seasonIcon[gameTime.season] || '🌍';

  const weatherDesc: Record<string, string> = {
    clear: 'Ceu limpo', rain: 'Chuva 🌧️', heavyRain: 'Tempestade ⛈️',
    fog: 'Nevoeiro 🌫️', snow: 'Neve ❄️', storm: 'Tempestade 🌪️'
  };

  return (
    <>
      <div className="absolute top-4 left-4 space-y-1.5 pointer-events-none">
        <BarBar label="❤️ Vida" current={stats.hp} max={stats.maxHp} color="#e53935" />
        <BarBar label="🍖 Fome" current={stats.hunger} max={stats.maxHunger} color="#ff9800" />
        <BarBar label="⚡ Stamina" current={player?.stamina ?? 0} max={player?.maxStamina ?? 100} color="#2196f3" />
        <BarBar label="💧 Mana" current={player?.mana ?? 0} max={player?.maxMana ?? 100} color="#9c27b0" />
        
        {/* ── Player Status Effects ── */}
        {player?.statusEffects && player.statusEffects.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mt-0.5 mb-1">
            {player.statusEffects.map((se: any, si: number) => {
              const statusConfig: Record<string, { icon: string; color: string; label: string }> = {
                burn: { icon: '🔥', color: '#ff4400', label: 'Queimadura' },
                slow: { icon: '❄️', color: '#66ddff', label: 'Lentidão' },
                stun: { icon: '⚡', color: '#ffee44', label: 'Stun' },
                poison: { icon: '☠️', color: '#44ff44', label: 'Veneno' },
                freeze: { icon: '🧊', color: '#aaffff', label: 'Congelamento' },
              };
              const cfg = statusConfig[se.type] || { icon: '?', color: '#fff', label: se.type };
              return (
                <div
                  key={si}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px]"
                  style={{
                    borderColor: cfg.color + '40',
                    backgroundColor: cfg.color + '15',
                    color: cfg.color,
                  }}
                  title={`${cfg.label} - ${Math.ceil(se.remaining)}s restantes`}
                >
                  <span className="text-xs">{cfg.icon}</span>
                  <span className="font-bold" style={{ opacity: 0.5 + 0.5 * Math.sin(Date.now() * 0.005 + si) }}>
                    {Math.ceil(se.remaining)}s
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] sm:text-xs text-white/70 mt-1">
          <span>⚔️ {stats.strength}</span>
          <span>🛡️ {stats.defense}</span>
          <span>🍀 {stats.luck}</span>
          <span>🪙 {stats.gold}</span>
        </div>
        <div className="text-[10px] sm:text-xs text-yellow-400">Lv.{stats.level}</div>
        <div className="w-36 sm:w-52">
          <div className="flex justify-between text-[9px] text-white/40 mb-0.5">
            <span>XP</span>
            <span>{stats.xp}/{stats.xpToNext}</span>
          </div>
          <div className="h-1.5 bg-black/50 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, (stats.xp / stats.xpToNext) * 100)}%`, background: 'linear-gradient(90deg, #ffd700, #ffec80)' }}
            />
          </div>
        </div>

        {game.inCave && game.caveData && (() => {
          const pct = game.getCaveDepth();
          const name = game.getLevelName();
          const isPortalSpawned = game.cavePortalSpawned;
          return (
            <div className="bg-black/70 backdrop-blur-sm rounded px-2 py-1.5 mt-1 w-36 sm:w-52 border border-amber-800/30">
              <div className="flex items-center gap-1.5 text-[10px] text-amber-300 font-bold mb-0.5">
                🕳️ {name || 'Caverna'}
              </div>
              <div className="text-[9px] text-white/50 mb-0.5">
                ⬇️ Profundidade: {pct}%
              </div>
              <div className="h-1.5 bg-black/50 rounded-full overflow-hidden mb-0.5">
                <div className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #666, #aaa, #fff)' }}
                />
              </div>
              {/* ── Compass: direction to exit ── */}
              {(() => {
                const playerX = game.state.player.x;
                const playerY = game.state.player.y;
                const ex = game.caveData!.entranceX + 16;
                const ey = game.caveData!.entranceY + 16;
                const dx = ex - playerX;
                const dy = ey - playerY;
                const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                const dist = Math.sqrt(dx * dx + dy * dy);
                const distTiles = Math.floor(dist / 32);
                return (
                  <div className="flex items-center gap-2 my-1">
                    {/* Compass arrow */}
                    <div className="relative w-6 h-6 shrink-0">
                      {/* Outer ring */}
                      <svg viewBox="0 0 24 24" className="w-6 h-6">
                        <circle cx="12" cy="12" r="10" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
                        {/* Needle */}
                        <polygon
                          points="12,3 8,12 12,10 16,12"
                          fill="#44ff88"
                          transform={`rotate(${angle}, 12, 12)`}
                          style={{ filter: 'drop-shadow(0 0 2px rgba(68,255,136,0.6))' }}
                        />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0 leading-tight">
                      <div className="text-[9px] text-green-300 font-bold">
                        🟢 Saída {distTiles}m
                      </div>
                      <div className="text-[7px] text-white/30">
                        {distTiles < 5 ? '⚠️ Muito perto!' : ''}
                      </div>
                    </div>
                  </div>
                );
              })()}
              <div className="text-[7px] text-white/40 border-t border-white/10 pt-1 mt-0.5">
                {isPortalSpawned
                  ? '✅ Portal aberto nas profundezas'
                  : '💀 Derrote o Shadow Lord para progredir'}
              </div>
            </div>
          );
        })()}
      </div>

      <div className="absolute top-4 right-4 text-right pointer-events-none">
        <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 space-y-1 border border-white/10 shadow-lg shadow-black/30">
          <div className="text-white font-bold text-sm flex items-center justify-end gap-1.5">
            {getPeriodIcon(gameTime.hour)}
            {formatTime(gameTime.hour, gameTime.minute)}
          </div>
          <div className="text-white/70 text-xs">Dia {gameTime.day} {si} {wi}</div>
          <div className="text-white/40 text-[9px]">{weatherDesc[gameTime.weather] || 'Desconhecido'}</div>
          <div className="text-white/50 text-xs capitalize">{gameTime.season}</div>
          {getPeriodLabel(gameTime.hour) && (
            <div className="text-white/60 text-[9px] italic">{getPeriodLabel(gameTime.hour)}</div>
          )}
          {gameTime.isNight && <div className="text-blue-300 text-xs">🌙 Noite</div>}
        </div>
      </div>

      <div className="absolute top-20 left-1/2 -translate-x-1/2 space-y-1 pointer-events-none">
        {notifications.slice(-5).map(n => (
          <div key={n.id}
            className={`px-4 py-1.5 rounded text-sm text-center animate-[fadeIn_0.3s] ${getNotificationClass(n.type)}`}
          >{n.message}</div>
        ))}
      </div>
    </>
  );
}

// ── Bar Component ─────────────────────────────────────────────────
function BarBar({ label, current, max, color }: { label: string; current: number; max: number; color: string }) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100));
  return (
    <div className="bg-black/60 backdrop-blur-sm rounded px-2 py-1 w-36 sm:w-52">
      <div className="flex justify-between text-[9px] sm:text-[10px] text-white/80 mb-0.5">
        <span>{label}</span>
        <span className="text-[8px] sm:text-[10px]">{Math.ceil(current)}/{max}</span>
      </div>
      <div className="h-1.5 sm:h-2 bg-black/50 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

// ── Hotbar ────────────────────────────────────────────────────────
function Hotbar({ hotbar, selected, onSelect, game }: {
  hotbar: GameState['player']['hotbar'];
  selected: number;
  onSelect: (i: number) => void;
  game?: Game;
}) {
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [dragSource, setDragSource] = useState<number | null>(null);

  const handleDragStart = (i: number) => setDragSource(i);
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
  const handleDrop = (i: number) => {
    if (dragSource === null || dragSource === i) return;
    if (game) game.swapSlots({ pool: 'hotbar', index: dragSource }, { pool: 'hotbar', index: i });
    setDragSource(null);
  };
  const handleDragEnd = () => setDragSource(null);

  return (
    <>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1 pointer-events-auto">
        {hotbar.map((slot, i) => (
          <div key={i}
            draggable={!!slot?.item}
            onDragStart={() => handleDragStart(i)}
            onDragOver={handleDragOver}
            onDrop={(e) => { e.preventDefault(); handleDrop(i); }}
            onDragEnd={handleDragEnd}
            onClick={() => onSelect(i)}
            onMouseEnter={(e) => { if (slot?.item) { setHoveredSlot(i); setTooltipPos({ x: e.clientX, y: e.clientY }); } }}
            onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
            onMouseLeave={() => setHoveredSlot(null)}
            className={`w-12 h-12 rounded border-2 flex items-center justify-center relative cursor-pointer transition-all ${dragSource === i ? 'opacity-30 scale-90' : ''} ${i === selected ? 'border-yellow-400 bg-yellow-400/20 scale-110' : 'border-white/20 bg-black/60 hover:border-white/40'}`}
          >
            {slot?.item && (
              <>
                <span className="text-xl" style={{ color: RARITY_COLORS[slot.item.rarity] }}>{slot.unidentified ? '❓' : slot.item.icon}</span>
                {slot.count > 1 && <span className="absolute bottom-0 right-0.5 text-[9px] text-white font-bold drop-shadow">{slot.count}</span>}
                {slot.unidentified && <span className="absolute top-0 left-0.5 text-[6px] text-cyan-400 font-bold drop-shadow">?</span>}
                {slot.durability !== undefined && slot.item.maxDurability && (
                  <div className="absolute bottom-0 left-0.5 right-0.5 h-1 bg-black/50 rounded-full">
                    <div className="h-full rounded-full" style={{ width: `${(slot.durability / slot.item.maxDurability) * 100}%`, backgroundColor: slot.durability / slot.item.maxDurability > 0.5 ? '#4caf50' : '#ff9800' }} />
                  </div>
                )}
              </>
            )}
            <span className="absolute top-0 left-1 text-[8px] text-white/40">{i + 1}</span>
          </div>
        ))}
      </div>
      {hoveredSlot !== null && hotbar[hoveredSlot]?.item && (
        <ItemTooltip item={hotbar[hoveredSlot].item!} durability={hotbar[hoveredSlot].durability}
          position={tooltipPos} playerStats={{} as any} affixes={hotbar[hoveredSlot].affixes} unidentified={hotbar[hoveredSlot].unidentified} />
      )}
    </>
  );
}

// ── Bottom Bar ────────────────────────────────────────────────────
function BottomBar({ stats }: { stats: GameState['player']['stats'] }) {
  return (
    <div className="absolute bottom-16 right-4 pointer-events-none">
      <div className="bg-black/50 backdrop-blur-sm rounded px-3 py-1 text-xs text-white/60 flex gap-3"></div>
    </div>
  );
}

// ── Minimap ──────────────────────────────────────────────────────
const MINIMAP_SIZE = 150;
const MINIMAP_RADIUS = 75;

const MINI_BIOME_COLORS: Record<string, string> = {
  forest: '#1a5a1a', plains: '#3a7a2a', mountains: '#5a5a5a',
  swamp: '#2a4a1a', desert: '#8a7a3a', tundra: '#6a8a8a',
  cave: '#1a1a1a', ruins: '#4a3a2a', village: '#5a8a3a', lake: '#2a6a9a', river: '#3a7aaa',
};

const BIOME_NAMES: Record<string, string> = {
  forest: 'Floresta', plains: 'Planicie', mountains: 'Montanha',
  swamp: 'Pantano', desert: 'Deserto', tundra: 'Tundra',
  cave: 'Caverna', ruins: 'Ruinas', village: 'Vila', lake: 'Lago', river: 'Rio',
};

const LEGEND_ENTRIES = [
  { color: '#88ddff', label: 'Jogador' }, { color: '#ff4444', label: 'Inimigo' },
  { color: '#44ff88', label: 'NPC' }, { color: '#ffdd44', label: 'Vila' }, { color: '#aa66ff', label: 'Caverna' },
];

const BIOME_LEGEND = [
  { color: '#1a5a1a', name: 'Floresta' }, { color: '#3a7a2a', name: 'Planicie' },
  { color: '#5a5a5a', name: 'Montanha' }, { color: '#8a7a3a', name: 'Deserto' }, { color: '#2a6a9a', name: 'Lago' },
];

function Minmap({ game }: { game: Game }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showLegend, setShowLegend] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = MINIMAP_SIZE;
    canvas.height = MINIMAP_SIZE;

    const { biomeMap, enemies, npcs, resources, state, camera } = game;
    const { player } = state;
    const worldW = biomeMap[0]?.length || 1;
    const worldH = biomeMap.length || 1;
    const playerTx = Math.floor(player.x / TILE_SIZE);
    const playerTy = Math.floor(player.y / TILE_SIZE);

    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);
    ctx.strokeStyle = 'rgba(180, 160, 100, 0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, MINIMAP_SIZE - 1, MINIMAP_SIZE - 1);

    const cx = MINIMAP_SIZE / 2;
    const cy = MINIMAP_SIZE / 2;
    const startTx = playerTx - MINIMAP_RADIUS;
    const startTy = playerTy - MINIMAP_RADIUS;

    const imageData = ctx.createImageData(MINIMAP_SIZE, MINIMAP_SIZE);
    const data = imageData.data;
    for (let px = 0; px < MINIMAP_SIZE; px++) {
      for (let py = 0; py < MINIMAP_SIZE; py++) {
        const worldTx = startTx + px;
        const worldTy = startTy + py;
        let r = 0, g = 0, b = 0, a = 255;
        if (worldTx >= 0 && worldTx < worldW && worldTy >= 0 && worldTy < worldH) {
          const biome = biomeMap[worldTy]?.[worldTx];
          const color = MINI_BIOME_COLORS[biome] || '#2a2a2a';
          const hex = color.replace('#', '');
          r = parseInt(hex.substring(0, 2), 16);
          g = parseInt(hex.substring(2, 4), 16);
          b = parseInt(hex.substring(4, 6), 16);
        }
        const idx = (py * MINIMAP_SIZE + px) * 4;
        data[idx] = r; data[idx + 1] = g; data[idx + 2] = b; data[idx + 3] = a;
      }
    }
    ctx.putImageData(imageData, 0, 0);

    // Village marker
    const vx = cx + (Math.floor(WORLD_WIDTH / 2) - playerTx);
    const vy = cy + (Math.floor(WORLD_HEIGHT / 2) - playerTy);
    if (vx > 0 && vx < MINIMAP_SIZE && vy > 0 && vy < MINIMAP_SIZE) {
      ctx.fillStyle = '#ffdd44'; ctx.beginPath(); ctx.arc(vx, vy, 2, 0, Math.PI * 2); ctx.fill();
    }

    // Enemies (red dots)
    for (const enemy of enemies) {
      const ex = cx + (Math.floor(enemy.x / TILE_SIZE) - playerTx);
      const ey = cy + (Math.floor(enemy.y / TILE_SIZE) - playerTy);
      if (ex > 0 && ex < MINIMAP_SIZE && ey > 0 && ey < MINIMAP_SIZE) {
        ctx.fillStyle = 'rgba(255, 50, 50, 0.7)'; ctx.beginPath(); ctx.arc(ex, ey, 1.5, 0, Math.PI * 2); ctx.fill();
      }
    }
    // NPCs (green dots)
    for (const npc of npcs) {
      const nx = cx + (Math.floor(npc.x / TILE_SIZE) - playerTx);
      const ny = cy + (Math.floor(npc.y / TILE_SIZE) - playerTy);
      if (nx > 0 && nx < MINIMAP_SIZE && ny > 0 && ny < MINIMAP_SIZE) {
        ctx.fillStyle = 'rgba(50, 255, 100, 0.7)'; ctx.beginPath(); ctx.arc(nx, ny, 1.5, 0, Math.PI * 2); ctx.fill();
      }
    }
    // Resources
    for (const res of resources) {
      const rx = cx + (Math.floor(res.x / TILE_SIZE) - playerTx);
      const ry = cy + (Math.floor(res.y / TILE_SIZE) - playerTy);
      if (rx > 0 && rx < MINIMAP_SIZE && ry > 0 && ry < MINIMAP_SIZE) {
        let color = '#8B4513';
        if (res.type === 'cave_entrance') color = 'rgba(150, 100, 255, 0.8)';
        else if (res.type === 'tree' || res.type === 'bush') color = 'rgba(50, 180, 50, 0.5)';
        else if (res.type.includes('rock') || res.type.includes('ore')) color = 'rgba(180, 160, 100, 0.6)';
        else if (res.type === 'crystal_node') color = 'rgba(100, 200, 255, 0.7)';
        ctx.fillStyle = color; ctx.beginPath(); ctx.arc(rx, ry, res.type === 'cave_entrance' ? 2 : 0.8, 0, Math.PI * 2); ctx.fill();
      }
    }

    // ── Cave Minimap Markers ──
    if (game.inCave && game.caveData) {
      // 1) Exit beacon (green) at cave entrance
      const entranceTx = Math.floor(game.caveData.entranceX / TILE_SIZE);
      const entranceTy = Math.floor(game.caveData.entranceY / TILE_SIZE);
      const bex = cx + (entranceTx - playerTx);
      const bey = cy + (entranceTy - playerTy);
      if (bex > 0 && bex < MINIMAP_SIZE && bey > 0 && bey < MINIMAP_SIZE) {
        const beaconPulse = Math.sin(performance.now() / 400) * 0.3 + 0.7;
        ctx.shadowColor = 'rgba(0, 255, 100, 0.8)'; ctx.shadowBlur = 10;
        ctx.fillStyle = `rgba(0, 255, 100, ${beaconPulse * 0.9})`;
        ctx.beginPath(); ctx.arc(bex, bey, 3, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        // Inner bright core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(bex, bey, 1.5, 0, Math.PI * 2); ctx.fill();
        // Label
        ctx.fillStyle = 'rgba(0, 255, 100, 0.5)'; ctx.font = '6px monospace'; ctx.textAlign = 'center';
        ctx.fillText('SAIDA', bex, bey + 8);
      }

      // 2) Portal marker (purple) when boss is defeated
      if (game.cavePortalSpawned && game.cavePortalTileX > 0) {
        const ptx = cx + (game.cavePortalTileX - playerTx);
        const pty = cy + (game.cavePortalTileY - playerTy);
        if (ptx > 0 && ptx < MINIMAP_SIZE && pty > 0 && pty < MINIMAP_SIZE) {
          const portalPulse = Math.sin(performance.now() / 300) * 0.3 + 0.7;
          ctx.shadowColor = 'rgba(170, 60, 255, 0.9)'; ctx.shadowBlur = 12;
          ctx.fillStyle = `rgba(170, 60, 255, ${portalPulse * 0.9})`;
          ctx.beginPath(); ctx.arc(ptx, pty, 3, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0;
          // Inner bright core
          ctx.fillStyle = '#d4a0ff';
          ctx.beginPath(); ctx.arc(ptx, pty, 1.5, 0, Math.PI * 2); ctx.fill();
          // Label
          ctx.fillStyle = 'rgba(170, 60, 255, 0.5)'; ctx.font = '6px monospace'; ctx.textAlign = 'center';
          ctx.fillText('PORTAL', ptx, pty + 8);
        }
      }
    }

    // Camera viewport
    const rectX = cx + (Math.floor(camera.x / TILE_SIZE) - playerTx);
    const rectY = cy + (Math.floor(camera.y / TILE_SIZE) - playerTy);
    const rectW = Math.ceil((camera.x + camera.width / camera.zoom) / TILE_SIZE) - Math.floor(camera.x / TILE_SIZE);
    const rectH = Math.ceil((camera.y + camera.height / camera.zoom) / TILE_SIZE) - Math.floor(camera.y / TILE_SIZE);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)'; ctx.lineWidth = 1; ctx.strokeRect(rectX, rectY, rectW, rectH);

    // Player dot
    ctx.shadowColor = 'rgba(100, 200, 255, 0.6)'; ctx.shadowBlur = 6;
    ctx.fillStyle = '#88ddff'; ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, 1.5, 0, Math.PI * 2); ctx.fill();
    // Facing direction
    ctx.strokeStyle = '#88ddff'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + player.facing.x * 6, cy + player.facing.y * 6); ctx.stroke();
  }, [game, game.state.player.x, game.state.player.y, game.camera.x, game.camera.y]);

  const currentBiome = (() => {
    const tx = Math.floor(game.state.player.x / TILE_SIZE);
    const ty = Math.floor(game.state.player.y / TILE_SIZE);
    if (ty >= 0 && ty < game.biomeMap.length && tx >= 0 && tx < game.biomeMap[0].length) return game.biomeMap[ty][tx];
    return null;
  })();

  return (
    <div className="flex flex-col gap-1">
      <div className="bg-black/70 backdrop-blur-sm rounded-md px-2 py-1 text-center">
        <div className="text-[9px] text-white/60">{BIOME_NAMES[currentBiome || ''] || ''}</div>
        <div className="text-[8px] text-white/30">Lv.{game.state.player.stats.level}</div>
      </div>
      <div className="relative flex gap-2">
        <canvas ref={canvasRef} className="rounded-md shadow-lg shadow-black/60 cursor-pointer"
          style={{ width: MINIMAP_SIZE + 4, height: MINIMAP_SIZE + 4, imageRendering: 'pixelated' }}
          onClick={() => setShowLegend(!showLegend)} />
        {showLegend && (
          <div className="bg-black/85 backdrop-blur-sm rounded-md border border-white/10 p-2 shadow-lg shadow-black/60 w-36">
            <div className="text-[9px] font-bold text-white/70 border-b border-white/10 pb-1 mb-1.5">📍 Marcadores</div>
            <div className="space-y-1 mb-2">{LEGEND_ENTRIES.map((e, i) => (
              <div key={i} className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: e.color }} /><span className="text-[8px] text-white/60">{e.label}</span></div>
            ))}</div>
            <div className="text-[9px] font-bold text-white/70 border-b border-white/10 pb-1 mb-1.5">🌿 Biomas</div>
            <div className="space-y-1">{BIOME_LEGEND.map((b, i) => (
              <div key={i} className="flex items-center gap-1.5"><div className="w-2.5 h-2 rounded-sm" style={{ backgroundColor: b.color }} /><span className="text-[8px] text-white/50">{b.name}</span></div>
            ))}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── World Map ─────────────────────────────────────────────────────
function WorldMap({ game }: { game: Game }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeTab, setActiveTab] = useState<'legends' | 'monsters' | 'npcs'>('legends');
  const [hoveredBiome, setHoveredBiome] = useState<{ biome: string; x: number; y: number } | null>(null);
  const [animTick, setAnimTick] = useState(0);
  const fogAnimations = useRef<Record<string, number>>({});
  const prevUnlocked = useRef<Set<string>>(new Set());
  const animFrameRef = useRef<number>(0);
  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; color: string }[]>([]);
  const FOG_DURATION = 1800;
  const MAP_W = 550, MAP_H = 450;

  const biomeLabels: Record<string, string> = {
    forest: 'Floresta Sombria', plains: 'Planicies Verdejantes', mountains: 'Montanhas Geladas',
    swamp: 'Pantano Nebuloso', desert: 'Deserto da Perdicao', tundra: 'Tundra Glacial',
    cave: 'Cavernas Profundas', ruins: 'Ruinas Antigas', village: 'Vila de Pedra',
    lake: 'Lago Esquecido', river: 'Rio Cristalino',
  };
  const biomeColors: Record<string, string> = {
    forest: '#1a3a12', plains: '#2a5a1e', mountains: '#4a5a4a', swamp: '#2a4a1a',
    desert: '#8a7a4a', tundra: '#6a7a7a', cave: '#2a2a2a', ruins: '#5a4a3a',
    village: '#4a7a4a', lake: '#2a5a7a', river: '#3a6a8a',
  };
  const biomeLevelRequirements: Record<string, number> = {
    plains: 1, forest: 1, village: 1, lake: 1, river: 1,
    swamp: 5, cave: 6, mountains: 10, ruins: 12, desert: 15, tundra: 20,
  };
  const biomeDesc: Record<string, string> = {
    forest: 'Floresta densa e sombria.', plains: 'Planicies abertas.', mountains: 'Picos gelados.',
    swamp: 'Pantano venenoso.', desert: 'Deserto escaldante.', tundra: 'Tundra congelada.',
    cave: 'Cavernas profundas.', ruins: 'Ruinas antigas.', village: 'Vila segura.',
    lake: 'Lago sereno.', river: 'Rio cristalino.',
  };
  const particleColors: Record<string, string> = {
    forest: '#66ff66', plains: '#aaff44', mountains: '#aaaaff', swamp: '#88ff66',
    desert: '#ffdd44', tundra: '#aaddff', cave: '#aa66ff', ruins: '#ff8844',
    village: '#ffdd44', lake: '#66ffff', river: '#66aaff',
  };
  const biomeCenters: Record<string, { x: number; y: number; count: number }> = {};

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = MAP_W;
    canvas.height = MAP_H;
    const { biomeMap, state, resources, npcs } = game;
    const worldW = biomeMap[0]?.length || 1;
    const worldH = biomeMap.length || 1;
    const scaleX = (MAP_W - 20) / worldW;
    const scaleY = (MAP_H - 20) / worldH;

    ctx.fillStyle = '#1a1410'; ctx.fillRect(0, 0, MAP_W, MAP_H);
    ctx.strokeStyle = '#8a7a5a'; ctx.lineWidth = 2; ctx.strokeRect(2, 2, MAP_W - 4, MAP_H - 4);
    ctx.strokeStyle = '#6a5a3a'; ctx.lineWidth = 1; ctx.strokeRect(5, 5, MAP_W - 10, MAP_H - 10);

    Object.keys(biomeColors).forEach(k => { biomeCenters[k] = { x: 0, y: 0, count: 0 }; });
    ctx.save();
    ctx.translate(10, 10);

    for (let y = 0; y < worldH; y++) {
      for (let x = 0; x < worldW; x++) {
        const biome = biomeMap[y]?.[x];
        if (!biome) continue;
        const baseColor = biomeColors[biome] || '#2a2a2a';
        const px = x * scaleX, py = y * scaleY, sw = scaleX + 0.5, sh = scaleY + 0.5;
        ctx.fillStyle = baseColor; ctx.fillRect(px, py, sw, sh);
        const noise = Math.sin(x * 3.7 + y * 5.1) * 0.04 + 0.04;
        ctx.fillStyle = `rgba(255,255,255,${noise})`; ctx.fillRect(px, py, sw, sh);

        // Fog of war
        const reqLevel = biomeLevelRequirements[biome] || 1;
        if (state.player.stats.level < reqLevel) {
          const animStart = fogAnimations.current[biome];
          let fogAlpha = 0.55;
          if (animStart !== undefined) {
            const progress = Math.min(1, (performance.now() - animStart) / FOG_DURATION);
            fogAlpha = 0.55 * (1 - (1 - Math.pow(1 - progress, 3)));
          }
          ctx.fillStyle = `rgba(0,0,0,${fogAlpha})`; ctx.fillRect(px, py, sw, sh);
          if (x % 4 === 0 && y % 4 === 0 && fogAlpha > 0.05) {
            ctx.font = `${Math.max(4, Math.min(7, scaleX * 0.3))}px monospace`;
            ctx.fillStyle = `rgba(255,100,50,${0.25 * (fogAlpha / 0.55)})`;
            ctx.textAlign = 'center';
            ctx.fillText(`Nv.${reqLevel}`, px + sw / 2, py + sh / 2 + 2);
            ctx.textAlign = 'left';
          }
        }
        if (biomeCenters[biome]) { biomeCenters[biome].x += x; biomeCenters[biome].y += y; biomeCenters[biome].count++; }
      }
    }

    // Particles
    const ap = particlesRef.current;
    for (let i = ap.length - 1; i >= 0; i--) {
      const p = ap[i];
      p.x += p.vx * 0.02; p.y += p.vy * 0.02; p.vy += 0.03; p.life -= 0.016 / p.maxLife;
      if (p.life <= 0) { ap.splice(i, 1); continue; }
      const alpha = p.life < 0.3 ? p.life / 0.3 : Math.min(1, p.life * 2);
      ctx.shadowColor = p.color; ctx.shadowBlur = p.size * 3;
      ctx.fillStyle = `rgba(255,255,255,${alpha * 0.6})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = p.size * 2;
      const pr = parseInt(p.color.slice(1,3),16), pg = parseInt(p.color.slice(3,5),16), pb = parseInt(p.color.slice(5,7),16);
      ctx.fillStyle = `rgba(${pr},${pg},${pb},${alpha})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.shadowBlur = 0;

    // Village icon
    const vx = (Math.floor(worldW / 2) * scaleX), vy = (Math.floor(worldH / 2) * scaleY);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffdd44'; ctx.shadowColor = 'rgba(255,220,80,0.3)'; ctx.shadowBlur = 8;
    ctx.font = '18px serif'; ctx.fillText('🏘️', vx, vy + 6);
    ctx.shadowBlur = 0; ctx.font = '9px monospace'; ctx.fillStyle = '#ffe066'; ctx.fillText('Vila', vx, vy + 20);

    for (const res of resources) {
      if (res.type === 'cave_entrance') {
        const rx = (res.x / TILE_SIZE / worldW) * (MAP_W - 20), ry = (res.y / TILE_SIZE / worldH) * (MAP_H - 20);
        ctx.fillStyle = '#ff6644'; ctx.shadowColor = 'rgba(255,100,50,0.3)'; ctx.shadowBlur = 6;
        ctx.font = '12px serif'; ctx.fillText('🕳️', rx, ry + 4);
        ctx.shadowBlur = 0; ctx.font = '7px monospace'; ctx.fillStyle = '#ff8844'; ctx.fillText('Caverna', rx, ry + 14);
      }
    }

    // NPC markers
    for (const npc of npcs) {
      const nx = ((npc.x / TILE_SIZE) / worldW) * (MAP_W - 20), ny = ((npc.y / TILE_SIZE) / worldH) * (MAP_H - 20);
      ctx.font = '10px serif'; ctx.fillStyle = '#88ffaa'; ctx.fillText(npc.definition.icon, nx, ny + 4);
    }

    // Boss markers
    for (const enemy of game.enemies) {
      if (['SlimeKing', 'ShadowLord', 'Dragon', 'DarkKnight'].includes(enemy.type)) {
        const ex = ((enemy.x / TILE_SIZE) / worldW) * (MAP_W - 20), ey = ((enemy.y / TILE_SIZE) / worldH) * (MAP_H - 20);
        ctx.fillStyle = '#ff2244'; ctx.shadowColor = 'rgba(255,0,0,0.4)'; ctx.shadowBlur = 10;
        ctx.font = '14px serif'; ctx.fillText('💀', ex, ey + 5);
        ctx.shadowBlur = 0; ctx.font = '7px monospace'; ctx.fillStyle = '#ff4444'; ctx.fillText('BOSS', ex, ey + 15);
      }
    }

    // Player position
    const px = (state.player.x / TILE_SIZE / worldW) * (MAP_W - 20), py = (state.player.y / TILE_SIZE / worldH) * (MAP_H - 20);
    ctx.shadowColor = 'rgba(255,255,100,0.5)'; ctx.shadowBlur = 12;
    ctx.fillStyle = '#ffee44'; ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    // Compass
    ctx.save(); ctx.translate(MAP_W - 40, 30);
    ctx.fillStyle = '#d4c08a'; ctx.font = 'bold 11px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('N', 0, -10);
    ctx.font = '8px serif'; ctx.fillStyle = '#8a7a5a';
    ctx.fillText('S', 0, 10); ctx.fillText('O', -10, 0); ctx.fillText('L', 10, 0);
    ctx.strokeStyle = '#8a7a5a'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(0, 8); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.stroke();
    ctx.fillStyle = '#d4c08a'; ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(-3, -6); ctx.lineTo(3, -6); ctx.closePath(); ctx.fill();
    ctx.restore(); ctx.textBaseline = 'alphabetic';

    ctx.textAlign = 'center';
    ctx.fillStyle = '#d4c08a'; ctx.font = 'bold 18px serif'; ctx.fillText('TERRAS SOMBRIAS', MAP_W / 2, 22);
    ctx.fillStyle = '#8a7a5a'; ctx.font = '9px monospace'; ctx.fillText('UM MUNDO DE AVENTURAS E PERIGOS', MAP_W / 2, 34);

    ctx.fillStyle = '#2a1a0a'; ctx.fillRect(0, MAP_H - 18, MAP_W, 18);
    ctx.strokeStyle = '#5a4a2a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, MAP_H - 18); ctx.lineTo(MAP_W, MAP_H - 18); ctx.stroke();
    ctx.fillStyle = '#a08860'; ctx.font = 'bold 10px serif'; ctx.fillText('✧  EXPLORE  ·  SOBREVIVA  ·  EVOLUA  ✧', MAP_W / 2, MAP_H - 5);

    // Unlock detection
    const unlocked = new Set(Object.entries(biomeLevelRequirements).filter(([_, r]) => state.player.stats.level >= r).map(([b]) => b));
    for (const biome of unlocked) {
      if (!prevUnlocked.current.has(biome) && !(biome in fogAnimations.current)) {
        fogAnimations.current[biome] = performance.now();
        const center = biomeCenters[biome];
        if (center && center.count > 0) {
          const avgX = (center.x / center.count) * scaleX, avgY = (center.y / center.count) * scaleY;
          const radius = Math.sqrt(center.count) * scaleX * 1.2, color = particleColors[biome] || '#ffee88';
          for (let i = 0; i < Math.min(40, Math.max(20, Math.floor(center.count * 0.03))); i++) {
            const angle = Math.random() * Math.PI * 2, dist = Math.random() * radius;
            particlesRef.current.push({ x: avgX + Math.cos(angle) * dist, y: avgY + Math.sin(angle) * dist, vx: (Math.random() - 0.5) * 12, vy: -Math.random() * 15 - 3, life: 1, maxLife: 1 + Math.random() * 0.2, size: 1.5 + Math.random() * 2.5, color });
          }
        }
      }
    }
    prevUnlocked.current = unlocked;

    let hasActive = false;
    for (const [b, st] of Object.entries(fogAnimations.current)) {
      if (performance.now() - st >= FOG_DURATION) delete fogAnimations.current[b];
      else hasActive = true;
    }
    if (hasActive) {
      if (!animFrameRef.current) {
        const animate = () => { setAnimTick(t => t + 1); animFrameRef.current = requestAnimationFrame(animate); };
        animFrameRef.current = requestAnimationFrame(animate);
      }
    } else if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = 0; }

    return () => { if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = 0; } };
  }, [game, game.state.player.x, game.state.player.y, animTick]);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 pointer-events-auto">
      <div className="relative flex gap-4">
        <div className="rounded-lg overflow-hidden border-2 border-amber-800/60 shadow-2xl shadow-black/80">
          <canvas ref={canvasRef} className="block cursor-crosshair"
            onMouseMove={(e) => {
              const canvas = canvasRef.current; if (!canvas) return;
              const rect = canvas.getBoundingClientRect();
              const relX = e.clientX - rect.left - 10, relY = e.clientY - rect.top - 10;
              const tileX = Math.floor(relX / ((MAP_W - 20) / (game.biomeMap[0]?.length || 1)));
              const tileY = Math.floor(relY / ((MAP_H - 20) / game.biomeMap.length));
              if (tileX >= 0 && tileX < (game.biomeMap[0]?.length || 1) && tileY >= 0 && tileY < game.biomeMap.length) {
                const biome = game.biomeMap[tileY]?.[tileX];
                setHoveredBiome(biome ? { biome, x: e.clientX, y: e.clientY } : null);
              } else setHoveredBiome(null);
            }}
            onMouseLeave={() => setHoveredBiome(null)} />
        </div>

        <div className="w-56 bg-[#1a1410] border-2 border-amber-800/60 rounded-lg p-3 text-white/80 shadow-2xl shadow-black/80">
          <div className="flex gap-0.5 mb-3 border-b border-amber-900/40 pb-2">
            <button onClick={() => setActiveTab('legends')} className={`text-[9px] px-2 py-1 rounded-t ${activeTab === 'legends' ? 'bg-amber-900/40 text-amber-300' : 'text-white/40 hover:text-white/60'}`}>📜 Lendas</button>
            <button onClick={() => setActiveTab('monsters')} className={`text-[9px] px-2 py-1 rounded-t ${activeTab === 'monsters' ? 'bg-amber-900/40 text-amber-300' : 'text-white/40 hover:text-white/60'}`}>👹 Monstros</button>
            <button onClick={() => setActiveTab('npcs')} className={`text-[9px] px-2 py-1 rounded-t ${activeTab === 'npcs' ? 'bg-amber-900/40 text-amber-300' : 'text-white/40 hover:text-white/60'}`}>🧙 NPCs</button>
          </div>

          {activeTab === 'legends' && (
            <div className="space-y-2">
              <div className="text-[10px] font-bold text-amber-400/80 border-b border-amber-900/30 pb-1">📍 Legenda do Mapa</div>
              {[{ icon: '🏘️', label: 'Vila de Pedra', desc: 'Centro' }, { icon: '🕳️', label: 'Caverna', desc: 'Nv.6+' }, { icon: '💀', label: 'BOSS', desc: 'Lendario' }, { icon: '🟡', label: 'Jogador', desc: 'Sua posicao' }].map((item, i) => (
                <div key={i} className="flex items-start gap-2"><span className="text-sm">{item.icon}</span><div className="flex-1"><div className="text-[10px] text-white/80">{item.label}</div><div className="text-[8px] text-white/30">{item.desc}</div></div></div>
              ))}
            </div>
          )}
          {activeTab === 'monsters' && (
            <div className="space-y-2">
              <div className="text-[10px] font-bold text-red-400/80 border-b border-amber-900/30 pb-1">👹 Monstros</div>
              {[{ icon: '🐺', label: 'Lobo', desc: 'Floresta' }, { icon: '🐗', label: 'Javali', desc: 'Planicies' }, { icon: '🟢', label: 'Slime', desc: 'Planicies' }, { icon: '🕷️', label: 'Aranha', desc: 'Floresta' }, { icon: '💀', label: 'Esqueleto', desc: 'Cavernas' }, { icon: '🗿', label: 'Golem', desc: 'Montanhas' }, { icon: '🦇', label: 'Morcego', desc: 'Cavernas' }, { icon: '🐉', label: 'Dragon', desc: 'Lendario' }].map((item, i) => (
                <div key={i} className="flex items-center gap-1.5"><span className="text-xs">{item.icon}</span><div className="flex-1"><span className="text-[9px] text-white/70">{item.label}</span><span className="text-[7px] text-white/30 ml-1">— {item.desc}</span></div></div>
              ))}
            </div>
          )}
          {activeTab === 'npcs' && (
            <div className="space-y-2">
              <div className="text-[10px] font-bold text-blue-400/80 border-b border-amber-900/30 pb-1">🧙 NPCs</div>
              {[{ icon: '🧔', label: 'Mercador' }, { icon: '⚒️', label: 'Ferreiro' }, { icon: '👨‍🌾', label: 'Fazendeiro' }, { icon: '🧙', label: 'Alquimista' }, { icon: '🏹', label: 'Cacador' }, { icon: '👴', label: 'Anciao' }].map((item, i) => (
                <div key={i} className="flex items-center gap-1.5"><span className="text-xs">{item.icon}</span><span className="text-[9px] text-white/70">{item.label}</span></div>
              ))}
            </div>
          )}
          <button onClick={() => game.closeMap()} className="w-full mt-3 py-1.5 rounded text-[10px] font-bold bg-amber-900/40 hover:bg-amber-800/50 text-amber-300/80 border border-amber-800/40">✕ Fechar Mapa [M]</button>
        </div>
      </div>

      {hoveredBiome && (() => {
        const biome = hoveredBiome.biome;
        const req = biomeLevelRequirements[biome] || 1;
        const unlocked = game.state.player.stats.level >= req;
        return (
          <div className="fixed z-[60] pointer-events-none" style={{ left: Math.min(hoveredBiome.x + 16, window.innerWidth - 200), top: Math.min(hoveredBiome.y - 8, window.innerHeight - 120) }}>
            <div className="bg-[#1a1410]/95 backdrop-blur-sm border border-amber-800/60 rounded-lg p-2.5 shadow-2xl shadow-black/60 w-44">
              <div className="flex items-center gap-1.5 mb-1"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: biomeColors[biome] || '#2a2a2a' }} /><span className="text-[10px] font-bold text-amber-300">{biomeLabels[biome] || biome}</span></div>
              <div className="text-[8px] text-white/50 leading-tight mb-1.5">{biomeDesc[biome] || ''}</div>
              <div className={`text-[9px] font-bold ${unlocked ? 'text-green-400' : 'text-red-400'}`}>{unlocked ? '✅ Desbloqueado' : `🔒 Requer Nivel ${req}`}</div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── Inventory Panel ───────────────────────────────────────────────
function InventoryPanel({ game }: { game: Game }) {
  const [, forceUpdate] = useState(0);
  const state = game.state;
  const [hoveredSlot, setHoveredSlot] = useState<{ pool: string; index: string | number } | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [dragSource, setDragSource] = useState<{ pool: 'inventory' | 'hotbar' | 'equipment'; index: string | number } | null>(null);
  const refresh = () => forceUpdate(n => n + 1);
  // Mobile touch: single timer ref for long-press detection
  const touchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchSlotRef = useRef<{ pool: 'inventory' | 'hotbar' | 'equipment'; index: string | number } | null>(null);

  const handleTouchStart = (pool: 'inventory' | 'hotbar' | 'equipment', index: string | number) => {
    touchSlotRef.current = { pool, index };
    touchTimerRef.current = setTimeout(() => {
      // Long press → show tooltip
      setHoveredSlot(touchSlotRef.current);
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try { navigator.vibrate(15); } catch {}
      }
    }, 400);
  };

  const handleTouchMove = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  const handleTouchEnd = (pool: 'inventory' | 'hotbar' | 'equipment', index: string | number) => {
    if (touchTimerRef.current) {
      // Short tap: perform default action
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
      handleShortTap(pool, index);
    } else {
      setHoveredSlot(null);
    }
  };

  const handleShortTap = (pool: 'inventory' | 'hotbar' | 'equipment', index: string | number) => {
    if (pool === 'hotbar') {
      state.player.currentTool = index as number;
      refresh();
    } else if (pool === 'inventory') {
      const slot = state.player.inventory[index as number];
      if (!slot?.item) return;
      const vs = game.getValidEquipSlot(slot.item);
      if (vs) { game.equipFromInventory(index as number, vs); refresh(); }
      else { game.moveToHotbar(index as number, state.player.currentTool); refresh(); }
    }
  };

  const handleDragStart = (pool: 'inventory' | 'hotbar' | 'equipment', index: string | number) => setDragSource({ pool, index });
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
  const handleDrop = (pool: 'inventory' | 'hotbar' | 'equipment', index: string | number) => {
    if (!dragSource || (dragSource.pool === pool && dragSource.index === index)) return;
    game.swapSlots(dragSource, { pool, index }); setDragSource(null); refresh();
  };
  const handleDragEnd = () => setDragSource(null);

  const equipLabels: Record<string, string> = {
    helmet: '🪖 Capacete', chest: '🦺 Peitoral', boots: '👢 Botas', gloves: '🧤 Luvas',
    weapon: '⚔️ Arma', tool: '🔧 Ferramenta', ring: '💍 Anel', amulet: '📿 Amuleto',
  };

  return (
    <Panel title="🎒 Inventario" onClose={() => game.setActivePanel('none')}>
      {/* Mobile touch info */}
      {Input.isMobileDevice() && (
        <div className="text-[9px] text-white/30 mb-2 text-center">Toque = mover | Toque longo = info | Toque em slot vazio para equipar/guardar</div>
      )}
      <div className="mb-3">
        <div className="text-white/60 text-xs mb-1">Equipamento</div>
        <div className="grid grid-cols-4 gap-1">
          {(['helmet', 'chest', 'boots', 'gloves', 'weapon', 'tool', 'ring', 'amulet'] as const).map(equipSlot => {
            const equipped = state.player.equipment[equipSlot];
            const isDrop = dragSource && dragSource.pool !== 'equipment';
            const isDrag = dragSource?.pool === 'equipment' && dragSource.index === equipSlot;
            return (
              <div key={equipSlot} draggable={!!equipped?.item}
                onDragStart={() => handleDragStart('equipment', equipSlot)} onDragOver={handleDragOver}
                onDrop={(e) => { e.stopPropagation(); handleDrop('equipment', equipSlot); }} onDragEnd={handleDragEnd}
                onMouseEnter={(e) => { if (equipped?.item) { setHoveredSlot({ pool: 'equipment', index: equipSlot }); setTooltipPos({ x: e.clientX, y: e.clientY }); } }}
                onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
                onMouseLeave={() => setHoveredSlot(null)}
                onTouchStart={() => { if (equipped?.item) { setHoveredSlot({ pool: 'equipment', index: equipSlot }); } }}
                onTouchEnd={() => { if (equipped?.item) { setHoveredSlot(null); /* unequip on tap */ game.unequipItem(equipSlot); refresh(); } }}
                className={`w-full aspect-square rounded border flex items-center justify-center relative cursor-pointer transition-all ${isDrag ? 'opacity-30 scale-90' : ''} ${isDrop ? 'border-blue-400/60 bg-blue-900/20' : 'border-white/20 bg-black/40'} hover:border-white/40`}
              >
                {equipped?.item ? (
                  <><span className="text-lg" style={{ color: RARITY_COLORS[equipped.item.rarity] }}>{equipped.unidentified ? '❓' : equipped.item.icon}</span>{equipped.unidentified && <span className="absolute -top-1 left-0.5 text-[7px] text-cyan-400 font-bold">?</span>}<span className="absolute -top-1 -right-1 text-[7px] bg-white/20 rounded px-0.5">{equipLabels[equipSlot]?.split(' ')[0] || equipSlot.slice(0, 3)}</span></>
                ) : <span className="text-white/20 text-[9px] uppercase">{equipLabels[equipSlot]?.split(' ')[1] || equipSlot}</span>}
              </div>
            );
          })}
        </div>
        {Input.isMobileDevice() && (
          <div className="text-[8px] text-white/20 mt-1">Toque para remover equipamento</div>
        )}
      </div>

      <div className="text-white/60 text-xs mb-1">Hotbar</div>
      <div className="flex gap-1 mb-3 flex-wrap">
        {state.player.hotbar.map((slot, i) => {
          const isDrop = dragSource && dragSource.pool !== 'hotbar';
          const isDrag = dragSource?.pool === 'hotbar' && dragSource.index === i;
          const isSelected = state.player.currentTool === i;
          return (
            <div key={i} draggable={!!slot?.item}
              onDragStart={() => handleDragStart('hotbar', i)} onDragOver={handleDragOver}
              onDrop={(e) => { e.stopPropagation(); handleDrop('hotbar', i); }} onDragEnd={handleDragEnd}
              onClick={() => { state.player.currentTool = i; refresh(); }}
              onMouseEnter={(e) => { if (slot?.item) { setHoveredSlot({ pool: 'hotbar', index: i }); setTooltipPos({ x: e.clientX, y: e.clientY }); } }}
              onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
              onMouseLeave={() => setHoveredSlot(null)}
              onTouchStart={() => handleTouchStart('hotbar', i)}
              onTouchMove={handleTouchMove}
              onTouchEnd={() => handleTouchEnd('hotbar', i)}
              className={`w-12 h-full aspect-square rounded border-2 flex items-center justify-center relative cursor-pointer transition-all ${isDrag ? 'opacity-30 scale-90' : ''} ${isSelected ? 'border-yellow-400 bg-yellow-400/15' : ''} ${isDrop ? 'border-blue-400/60 bg-blue-900/20' : 'border-white/15 bg-black/40'} hover:border-white/40`}
            >
              {slot?.item && <><span className="text-sm" style={{ color: RARITY_COLORS[slot.item.rarity] }}>{slot.unidentified ? '❓' : slot.item.icon}</span>{slot.count > 1 && <span className="absolute bottom-0 right-0.5 text-[8px] text-white font-bold">{slot.count}</span>}{slot.unidentified && <span className="absolute top-0 left-0.5 text-[6px] text-cyan-400 font-bold">?</span>}</>}
              <span className="absolute top-0 left-0.5 text-[7px] text-white/40">{i + 1}</span>
            </div>
          );
        })}
      </div>

      <div className="text-white/60 text-xs mb-1">Mochila</div>
      <div className="grid grid-cols-8 sm:grid-cols-9 gap-1 mb-3">
        {state.player.inventory.map((slot, i) => {
          const isDrop = dragSource && dragSource.pool !== 'inventory';
          const isDrag = dragSource?.pool === 'inventory' && dragSource.index === i;
          return (
            <div key={i} draggable={!!slot?.item}
              onDragStart={() => handleDragStart('inventory', i)} onDragOver={handleDragOver}
              onDrop={(e) => { e.stopPropagation(); handleDrop('inventory', i); }} onDragEnd={handleDragEnd}
              onDoubleClick={() => { if (!slot?.item) return; const vs = game.getValidEquipSlot(slot.item); if (vs) { game.equipFromInventory(i, vs); refresh(); } else { game.moveToHotbar(i, state.player.currentTool); refresh(); } }}
              onMouseEnter={(e) => { if (slot?.item) { setHoveredSlot({ pool: 'inventory', index: i }); setTooltipPos({ x: e.clientX, y: e.clientY }); } }}
              onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
              onMouseLeave={() => setHoveredSlot(null)}
              onTouchStart={() => handleTouchStart('inventory', i)}
              onTouchMove={handleTouchMove}
              onTouchEnd={() => handleTouchEnd('inventory', i)}
              className={`w-full aspect-square rounded border flex items-center justify-center cursor-pointer transition-all ${isDrag ? 'opacity-30 scale-90' : ''} ${isDrop ? 'border-blue-400/60 bg-blue-900/20' : 'border-white/15 bg-black/40'} hover:border-white/30 hover:bg-white/10`}
            >
              {slot?.item && <><span className="text-sm" style={{ color: RARITY_COLORS[slot.item.rarity] }}>{slot.unidentified ? '❓' : slot.item.icon}</span>{slot.count > 1 && <span className="absolute bottom-0 right-0.5 text-[8px] text-white font-bold">{slot.count}</span>}{slot.unidentified && <span className="absolute top-0 left-0.5 text-[6px] text-cyan-400 font-bold">?</span>}</>}
            </div>
          );
        })}
      </div>

      <div className="text-yellow-400 text-sm">🪙 {state.player.stats.gold} ouro</div>
      {Input.isMobileDevice() ? (
        <div className="text-white/30 text-[9px] mt-1">Toque = equipar/usar | Toque longo = info</div>
      ) : (
        <div className="text-white/30 text-[9px] mt-1">Clique duplo = equipar | Arrastar = reorganizar</div>
      )}

      {hoveredSlot && (() => {
        const getSlot = () => {
          if (hoveredSlot.pool === 'inventory') return state.player.inventory[hoveredSlot.index as number];
          if (hoveredSlot.pool === 'hotbar') return state.player.hotbar[hoveredSlot.index as number];
          if (hoveredSlot.pool === 'equipment') return state.player.equipment[hoveredSlot.index as keyof typeof state.player.equipment];
          return null;
        };
        const sd = getSlot();
        if (!sd?.item) return null;
        const eqKey = sd.item.armorSlot || (sd.item.toolType === 'sword' || sd.item.toolType === 'bow' ? 'weapon' : sd.item.toolType ? 'tool' : null);
        return <ItemTooltip item={sd.item} durability={sd.durability} position={tooltipPos}
          compareWith={eqKey ? state.player.equipment[eqKey as keyof typeof state.player.equipment] : null}
          playerStats={state.player.stats} affixes={sd.affixes} unidentified={sd.unidentified} />;
      })()}
    </Panel>
  );
}
// ── Crafting Panel (with Lote 8 Station Improvements) ────────────
function CraftingPanel({ game, uiState }: { game: Game; uiState: GameUIState }) {
  const [, forceUpdate] = useState(0);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [hoveredIngredient, setHoveredIngredient] = useState<any>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [craftProgress, setCraftProgress] = useState(0);
  const [isCrafting, setIsCrafting] = useState(false);
  const [stationFilter, setStationFilter] = useState<string | null>(null);
  const [showIdentify, setShowIdentify] = useState(!!uiState.showIdentify);

  const handleCraft = (recipeId: string) => {
    const recipe = RECIPES.find(r => r.id === recipeId);
    if (!recipe) return;
    setSelectedRecipeId(recipeId);
    setIsCrafting(true);
    setCraftProgress(0);
    const duration = Math.max(300, recipe.requiredLevel * 50 + 200);
    const interval = 30;
    const steps = duration / interval;
    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      setCraftProgress(Math.min(1, currentStep / steps));
      if (currentStep / steps >= 1) {
        clearInterval(timer);
        game.craftRecipe(recipeId);
        setIsCrafting(false);
        setCraftProgress(0);
        refresh();
      }
    }, interval);
  };

  const refresh = () => forceUpdate(n => n + 1);
  const state = game.state;

  const categories = [
    { cat: ItemCategory.Tool, icon: '🔧', label: 'Ferramentas' },
    { cat: ItemCategory.Weapon, icon: '⚔️', label: 'Armas' },
    { cat: ItemCategory.Armor, icon: '🛡️', label: 'Armaduras' },
    { cat: ItemCategory.Consumable, icon: '🧪', label: 'Consumiveis' },
    { cat: ItemCategory.Material, icon: '📦', label: 'Materiais' },
    { cat: ItemCategory.Furniture, icon: '🏗️', label: 'Construcao' },
    { cat: ItemCategory.Ring, icon: '💍', label: 'Joias' },
  ];

  const selectedCat = uiState.craftingCategory;
  // Lote 8a: Station filter applied alongside category filter
  const recipes = RECIPES.filter(r => r.category === selectedCat).filter(r => !stationFilter || (r.station || 'none') === stationFilter);

  // Helper to check if a station is nearby
  const stationNearby = (s: string | undefined): boolean => {
    if (!s) return true; // handcraft always possible
    return game.isNearbyStation ? game.isNearbyStation(s) : false;
  };

  return (
    <Panel title="🔨 Crafting" onClose={() => game.setActivePanel('none')}>
      {/* Category tabs */}
      <div className="flex gap-1 mb-3 flex-wrap">
        {categories.map(c => (
          <button key={c.cat} onClick={() => { game.setCraftingCategory(c.cat); refresh(); }}
            className={`px-2 py-1 rounded text-xs ${selectedCat === c.cat ? 'bg-amber-600 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}>
            {c.icon} {c.label}
          </button>
        ))}
      </div>

      {/* Lote 8a: Station filter tabs */}
      <div className="flex gap-1 mb-2">
        <button onClick={() => { setStationFilter(null); refresh(); }}
          className={`px-2 py-0.5 rounded text-[9px] ${stationFilter === null ? 'bg-amber-600 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}>🔄 Todas</button>
        <button onClick={() => { setStationFilter('none'); refresh(); }}
          className={`px-2 py-0.5 rounded text-[9px] ${stationFilter === 'none' ? 'bg-green-700 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}>🤲 Maos</button>
        <button onClick={() => { setStationFilter('workbench'); refresh(); }}
          className={`px-2 py-0.5 rounded text-[9px] ${stationFilter === 'workbench' ? 'bg-cyan-700 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}>🪚 Bancada</button>
        <button onClick={() => { setStationFilter('furnace'); refresh(); }}
          className={`px-2 py-0.5 rounded text-[9px] ${stationFilter === 'furnace' ? 'bg-orange-700 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}>🔥 Fornalha</button>
        {/* Identification tab — only active near workbench */}
        {showIdentify && (
          <button onClick={() => { setShowIdentify(false); refresh(); }}
            className="px-2 py-0.5 rounded text-[9px] bg-purple-700 text-white font-bold ml-1">🔍 Identificar</button>
        )}
      </div>
      
      {/* Lote 10: Identification Panel (shown when identification is active) */}
      {showIdentify && (
        <IdentifyPanel game={game} onDone={() => { setShowIdentify(false); game.ui.showIdentify = false; refresh(); }} npcMode={!!uiState.showIdentify} />
      )}

      {/* Lote 8e: Nearby stations indicator */}
      <div className="text-[8px] text-white/30 mb-1 flex gap-2">
        <span>{game.isNearbyStation && game.isNearbyStation('furnace') ? '✅ Fornalha 🔥' : '❌ Fornalha'}</span>
        <span>{game.isNearbyStation && game.isNearbyStation('workbench') ? '✅ Bancada 🪚' : '❌ Bancada'}</span>
        {game.isNearbyStation && game.isNearbyStation('workbench') && game.getUnidentifiedSlots().length > 0 && (
          <button onClick={() => setShowIdentify(true)}
            className="text-purple-400 hover:text-purple-300 underline decoration-purple-400/30">
            🔍 {game.getUnidentifiedSlots().length} p/ identificar
          </button>
        )}
        <span className="text-green-500/50">🤲 Maos (sempre)</span>
      </div>

      {/* Recipe list */}
      <div className="space-y-1.5 max-h-80 overflow-y-auto">
        {recipes.length === 0 && (
          <div className="text-white/40 text-xs text-center py-4">Nenhuma receita nesta categoria</div>
        )}
        {recipes.map(recipe => {
          const resultItem = getItem(recipe.result);
          const canCraft = recipe.requiredLevel <= state.player.stats.level &&
            recipe.ingredients.every(ing => game.countInInventory(ing.itemId) >= ing.count);
          const nearby = stationNearby(recipe.station);

          return (
            <div key={recipe.id}
              className={`flex items-center gap-2 p-2 rounded border ${canCraft && nearby ? 'border-green-500/50 bg-green-900/20 hover:bg-green-800/30' : 'border-white/10 bg-white/5'}`}
              onMouseEnter={(e) => { if (resultItem) { setHoveredItem(recipe.result); setTooltipPos({ x: e.clientX, y: e.clientY }); } }}
              onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <span className="text-xl">{resultItem?.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-white text-xs font-bold truncate">{recipe.name}</div>
                <div className="text-white/40 text-[10px]">
                  {recipe.ingredients.map(ing => {
                    const item = getItem(ing.itemId);
                    const have = game.countInInventory(ing.itemId);
                    return <span key={ing.itemId}
                      className={`mr-1 px-1 py-0.5 rounded cursor-pointer transition-colors ${have >= ing.count ? 'text-green-400 hover:bg-green-900/30' : 'text-red-400 hover:bg-red-900/30'}`}
                      onMouseEnter={(e) => { if (item) { setHoveredIngredient(item); setTooltipPos({ x: e.clientX, y: e.clientY }); } }}
                      onMouseMove={(e) => { if (item) { setTooltipPos({ x: e.clientX, y: e.clientY }); } }}
                      onMouseLeave={() => setHoveredIngredient(null)}
                    >{item?.icon} <span className="text-white/60">{item?.name}</span> {have}/{ing.count}</span>;
                  })}
                </div>
                <div className="flex flex-wrap gap-x-2 text-[9px] mt-0.5">
                  {recipe.requiredLevel > 1 && <span className="text-yellow-400/60">Nv.{recipe.requiredLevel}</span>}
                  {resultItem?.damage && <span className="text-red-400/60">⚔️ {resultItem.damage}</span>}
                  {resultItem?.defense && <span className="text-blue-400/60">🛡️ {resultItem.defense}</span>}
                  {resultItem?.healAmount && <span className="text-green-400/60">❤️ +{resultItem.healAmount}</span>}
                  {resultItem?.foodValue && <span className="text-orange-400/60">🍖 +{resultItem.foodValue}</span>}
                  {resultItem?.maxDurability && <span className="text-white/40">🔧 {resultItem.maxDurability}</span>}
                </div>
                {/* Lote 8b: Station proximity indicator */}
                {recipe.station && (
                  <div className="text-[9px]">
                    <span className={nearby ? 'text-green-400' : 'text-red-400'}>{nearby ? '✅' : '❌'}</span>
                    <span className="text-white/50"> Requer </span>
                    <span className={nearby ? 'text-green-400' : 'text-red-400'}>
                      {recipe.station === 'furnace' ? '🔥 Fornalha' : recipe.station === 'workbench' ? '🪚 Bancada' : recipe.station}
                    </span>
                  </div>
                )}
              </div>
              <button disabled={!canCraft || !nearby || isCrafting}
                onClick={() => { handleCraft(recipe.id); }}
                className={`px-2 py-1 rounded text-xs font-bold ${canCraft && nearby ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-white/10 text-white/30 cursor-not-allowed'}`}>
                Craftar
              </button>
            </div>
          );
        })}
      </div>

      {/* Forge preview */}
      {isCrafting && selectedRecipeId && (() => {
        const recipe = RECIPES.find(r => r.id === selectedRecipeId);
        const resultItem = recipe ? getItem(recipe.result) : null;
        if (!recipe || !resultItem) return null;
        return (
          <div className="mb-3 p-3 rounded-lg border-2 border-amber-500/30 bg-gradient-to-r from-amber-900/30 via-yellow-900/20 to-amber-900/30 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="relative">
                <span className="text-3xl animate-bounce" style={{ color: RARITY_COLORS[resultItem.rarity as Rarity] || '#fff' }}>{resultItem.icon}</span>
                <div className="absolute -inset-2 rounded-full bg-yellow-400/10 animate-ping" />
              </div>
              <div className="flex-1">
                <div className="text-white font-bold text-sm" style={{ color: RARITY_COLORS[resultItem.rarity as Rarity] || '#fff' }}>🔨 Forjando {resultItem.name}...</div>
                <div className="mt-2">
                  <div className="h-2 bg-black/50 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-100" style={{ width: `${craftProgress * 100}%`, background: 'linear-gradient(90deg, #ff6600, #ffcc00, #ff6600)', backgroundSize: '200% 100%' }} />
                  </div>
                  <div className="flex justify-between text-[9px] text-white/40 mt-0.5">
                    <span>{recipe.station === 'furnace' ? '🔥 Aquecendo...' : recipe.station === 'workbench' ? '🪚 Trabalhando...' : '🔧 Montando...'}</span>
                    <span>{Math.round(craftProgress * 100)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {hoveredItem && (() => { const item = getItem(hoveredItem); return item ? <ItemTooltip item={item} position={tooltipPos} playerStats={state.player.stats} /> : null; })()}

      {/* Ingredient tooltip */}
      {hoveredIngredient && (
        <div className="fixed z-[100] pointer-events-none" style={{ left: tooltipPos.x + 16, top: tooltipPos.y - 8 }}>
          <div className="bg-gray-900/95 backdrop-blur-md rounded-xl border border-white/10 p-3 w-56 shadow-2xl shadow-black/50">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-lg">{hoveredIngredient.icon}</span>
              <div>
                <div className="text-xs font-bold text-white">{hoveredIngredient.name}</div>
                <div className="text-[9px] text-white/50 uppercase tracking-wider">{hoveredIngredient.category} {hoveredIngredient.rarity}</div>
              </div>
            </div>
            <div className="text-white/50 text-[10px] mb-2 border-b border-white/10 pb-2 leading-relaxed">
              {hoveredIngredient.description}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-[10px]">
                <span className="text-white/40">📦</span>
                <span className="text-white/60">Empilhável: {hoveredIngredient.stackSize}x</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px]">
                <span className="text-white/40">💰</span>
                <span className="text-white/60">Valor: {hoveredIngredient.value} 🪙</span>
              </div>
              {hoveredIngredient.foodValue && (
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span className="text-orange-400/60">🍖</span>
                  <span className="text-orange-300/60">Fome: +{hoveredIngredient.foodValue}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}

// ── Identification Panel ──────────────────────────────────────
function IdentifyPanel({ game, onDone, npcMode }: { game: Game; onDone: () => void; npcMode?: boolean }) {
  const unidentified = game.getUnidentifiedSlots();
  const [identifyingId, setIdentifyingId] = useState<string | null>(null);

  const handleIdentify = (pool: 'inventory' | 'hotbar' | 'equipment', index: string | number) => {
    const key = `${pool}_${index}`;
    setIdentifyingId(key);
    setTimeout(() => {
      game.identifyItem(pool, index, !!npcMode);
      setIdentifyingId(null);
      onDone();
    }, 600);
  };

  const rarityColors: Record<string, string> = {
    common: '#b0b0b0', uncommon: '#4caf50', rare: '#2196f3', epic: '#9c27b0', legendary: '#ff9800',
  };
  const rarityNames: Record<string, string> = {
    common: 'Comum', uncommon: 'Incomum', rare: 'Raro', epic: 'Epico', legendary: 'Lendario',
  };
  const identifyCosts: Record<string, number> = {
    common: 0, uncommon: 50, rare: 150, epic: 500, legendary: 2000,
  };

  return (
    <div className="border border-purple-500/30 bg-purple-900/15 rounded-lg p-3 mb-2">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">🔍</span>
        <span className="text-sm font-bold text-purple-300">Identificar Itens</span>
        <span className="text-[9px] text-white/40 ml-auto">{npcMode ? '🧙 S\u00e1bio Eron' : '\uD83D\uDD2A Bancada'}</span>
      </div>

      {unidentified.length === 0 ? (
        <div className="text-white/40 text-xs text-center py-4">
          ✨ Nenhum item misterioso para identificar!
        </div>
      ) : (
        <div className="space-y-1.5 max-h-60 overflow-y-auto">
          {unidentified.map((entry) => {
            const key = `${entry.pool}_${entry.index}`;
            const cost = identifyCosts[entry.rarity] || 0;
            const canAfford = game.state.player.stats.gold >= cost;
            const isIdentifying = identifyingId === key;
            const color = rarityColors[entry.rarity] || '#b0b0b0';

            return (
              <div key={key}
                className={`flex items-center gap-2 p-2 rounded border ${canAfford ? 'border-purple-500/30 bg-purple-800/20 hover:bg-purple-700/30' : 'border-white/10 bg-white/5 opacity-50'}`}
              >
                <span className="text-lg" style={{ color }}>❓</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold" style={{ color }}>Item Misterioso</div>
                  <div className="text-[9px] text-white/40">{rarityNames[entry.rarity] || entry.rarity}</div>
                  <div className="text-[9px] text-white/30">{entry.pool === 'inventory' ? 'Mochila' : entry.pool === 'hotbar' ? 'Hotbar' : 'Equipamento'} [{entry.index}]</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-yellow-400">💰 {cost}</div>
                  {isIdentifying ? (
                    <div className="text-[9px] text-purple-400 animate-pulse">🔮 Identificando...</div>
                  ) : (
                    <button
                      disabled={!canAfford}
                      onClick={() => handleIdentify(entry.pool, entry.index)}
                      className={`px-2 py-1 rounded text-[9px] font-bold ${canAfford ? 'bg-purple-600 hover:bg-purple-500 text-white' : 'bg-white/10 text-white/30 cursor-not-allowed'}`}
                    >
                      Identificar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Skills Panel ──────────────────────────────────────────────────
function SkillsPanel({ game }: { game: Game }) {
  const [, forceUpdate] = useState(0);
  const refresh = () => forceUpdate(n => n + 1);
  const state = game.state;

  const trees = [
    { name: 'Sobrevivencia', icon: '🏕️', tree: 'survival' as const },
    { name: 'Combate', icon: '⚔️', tree: 'combat' as const },
    { name: 'Coleta', icon: '⛏️', tree: 'gathering' as const },
    { name: 'Craft', icon: '🔧', tree: 'crafting' as const },
    { name: 'Exploracao', icon: '🧭', tree: 'exploration' as const },
  ];

  const [selectedTree, setSelectedTree] = useState(trees[0].tree);
  const skills = getSkillsByTree(selectedTree);

  return (
    <Panel title="🌟 Habilidades" onClose={() => game.setActivePanel('none')}>
      <div className="mb-2 text-yellow-400 text-xs">Pontos disponiveis: {state.player.stats.skillPoints}</div>
      <div className="flex gap-1 mb-3">
        {trees.map(t => (
          <button key={t.tree} onClick={() => setSelectedTree(t.tree)}
            className={`px-2 py-1 rounded text-xs ${selectedTree === t.tree ? 'bg-purple-600 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}>{t.icon} {t.name}</button>
        ))}
      </div>
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {skills.map(skill => {
          const level = state.skills[skill.id] || 0;
          const canUpgrade = level < skill.maxLevel && state.player.stats.skillPoints >= skill.cost;
          return (
            <div key={skill.id} className="p-2 rounded border border-white/10 bg-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{skill.icon}</span>
                  <div>
                    <div className="text-white text-xs font-bold">{skill.name}</div>
                    <div className="text-white/40 text-[10px]">{skill.description}</div>
                    <div className="text-white/30 text-[9px]">Nv.{level}/{skill.maxLevel} | Custo: {skill.cost} pts</div>
                  </div>
                </div>
                <button disabled={!canUpgrade} onClick={() => { game.upgradeSkill(skill.id); refresh(); }}
                  className={`px-3 py-1 rounded text-xs font-bold ${canUpgrade ? 'bg-purple-600 hover:bg-purple-500 text-white' : 'bg-white/10 text-white/30'}`}>+</button>
              </div>
              <div className="flex gap-0.5 mt-1">
                {Array.from({ length: skill.maxLevel }).map((_, i) => (
                  <div key={i} className={`h-1.5 flex-1 rounded-full ${i < level ? 'bg-purple-400' : 'bg-white/10'}`} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

// ── Quests Panel ──────────────────────────────────────────────────
function QuestsPanel({ game }: { game: Game }) {
  const [, forceUpdate] = useState(0);
  const refresh = () => forceUpdate(n => n + 1);
  const state = game.state;
  const activeQuests = state.quests.filter(q => q.status === 'active');
  const completedQuests = state.quests.filter(q => q.status === 'completed');
  const availableQuests = QUESTS.filter(q => {
    if (state.quests.some(eq => eq.definition.id === q.id)) return false;
    if (state.player.stats.level < q.requiredLevel) return false;
    if (q.prerequisiteQuests) return q.prerequisiteQuests.every(pq => state.quests.some(q => q.definition.id === pq && q.status === 'completed'));
    return true;
  });

  return (
    <Panel title="📜 Missoes" onClose={() => game.setActivePanel('none')}>
      <div className="text-white/60 text-xs mb-1">Ativas</div>
      <div className="space-y-1 mb-3">
        {activeQuests.length === 0 && <div className="text-white/30 text-xs">Nenhuma missao ativa</div>}
        {activeQuests.map(q => (
          <div key={q.definition.id} className="p-2 rounded border border-amber-500/30 bg-amber-900/20">
            <div className="text-white text-xs font-bold">{q.definition.name}</div>
            <div className="text-white/50 text-[10px]">{q.definition.description}</div>
            {q.definition.objectives.map((obj, i) => {
              const key = `${obj.type}_${obj.target}`;
              const progress = q.progress[key] || 0;
              return <div key={i} className="text-[10px] mt-1"><span className={progress >= obj.count ? 'text-green-400' : 'text-white/60'}>{progress >= obj.count ? '✅' : '⬜'} {obj.description}: {Math.min(progress, obj.count)}/{obj.count}</span></div>;
            })}
            <div className="text-yellow-400/60 text-[9px] mt-1">Recompensas: {q.definition.rewards.xp} XP, {q.definition.rewards.gold} 🪙</div>
          </div>
        ))}
      </div>

      {availableQuests.length > 0 && (
        <><div className="text-white/60 text-xs mb-1">Disponiveis</div>
          <div className="space-y-1 mb-3">{availableQuests.map(q => (
            <div key={q.id} className="p-2 rounded border border-white/10 bg-white/5 flex justify-between items-center">
              <div><div className="text-white text-xs">{q.name} <span className="text-yellow-400/50">[Nv.{q.requiredLevel}]</span></div><div className="text-white/40 text-[10px]">{q.description}</div></div>
              <button onClick={() => { game.acceptQuest(q.id); refresh(); }} className="px-2 py-1 rounded bg-green-600 hover:bg-green-500 text-white text-xs">Aceitar</button>
            </div>
          ))}</div></>
      )}

      {completedQuests.length > 0 && (
        <><div className="text-white/60 text-xs mb-1">Completas</div>
          <div className="space-y-1">{completedQuests.map(q => (<div key={q.definition.id} className="p-1 rounded bg-white/5 text-white/30 text-xs">✅ {q.definition.name}</div>))}</div></>
      )}
    </Panel>
  );
}

// ── Shop Panel ────────────────────────────────────────────────────
function ShopPanel({ game, uiState }: { game: Game; uiState: GameUIState }) {
  const [, forceUpdate] = useState(0);
  const refresh = () => forceUpdate(n => n + 1);
  const [shopTab, setShopTab] = useState<'buy' | 'sell'>('buy');
  const state = game.state;
  const npc = uiState.activeShopNpc;
  if (!npc) return null;
  const shopItems = (npc.definition.shopItems || []).map(id => getItem(id)).filter(Boolean) as any[];
  const buyPrices = npc.definition.buysItems as Record<string, number> | undefined;
  const hasSellTab = buyPrices && Object.keys(buyPrices).length > 0;

  // Collect player items that the NPC buys
  const sellableItems = hasSellTab
    ? ([] as { item: any; count: number; price: number }[]).concat(
        state.player.inventory
          .filter(s => s.item && s.count > 0 && buyPrices![s.item.id] !== undefined)
          .map(s => ({ item: s.item!, count: s.count, price: buyPrices![s.item!.id] })),
        state.player.hotbar
          .filter(s => s.item && s.count > 0 && buyPrices![s.item.id] !== undefined)
          .map(s => ({ item: s.item!, count: s.count, price: buyPrices![s.item!.id] }))
      )
        .filter((entry, index, self) => self.findIndex(e => e.item.id === entry.item.id) === index)
        .sort((a, b) => b.price - a.price)
    : [];

  return (
    <Panel title={`🏪 ${npc.definition.name}`} onClose={() => game.setActivePanel('none')}>
      <div className="text-yellow-400 text-xs mb-2">Seu ouro: {state.player.stats.gold} 🪙</div>

      {hasSellTab && (
        <div className="flex gap-1 mb-2">
          <button onClick={() => setShopTab('buy')}
            className={`flex-1 py-1 rounded text-[10px] font-bold transition-all ${shopTab === 'buy' ? 'bg-green-700 text-white' : 'bg-white/10 text-white/50 hover:bg-white/20'}`}>
            🛒 Comprar
          </button>
          <button onClick={() => setShopTab('sell')}
            className={`flex-1 py-1 rounded text-[10px] font-bold transition-all ${shopTab === 'sell' ? 'bg-amber-700 text-white' : 'bg-white/10 text-white/50 hover:bg-white/20'}`}>
            💰 Vender Colheitas
          </button>
        </div>
      )}

      {shopTab === 'buy' && (
        <div className="space-y-1 max-h-80 overflow-y-auto">
          {shopItems.map((item: any) => {
            const price = Math.floor(item.value * 1.5);
            const canBuy = state.player.stats.gold >= price;
            return (
              <div key={item.id} className="flex items-center gap-2 p-2 rounded border border-white/10 bg-white/5">
                <span className="text-lg">{item.icon}</span>
                <div className="flex-1"><div className="text-white text-xs">{item.name}</div><div className="text-white/40 text-[10px]">{item.description}</div></div>
                <div className="text-right"><div className="text-yellow-400 text-xs">{price} 🪙</div>
                  <button disabled={!canBuy} onClick={() => { game.buyItem(item.id); refresh(); }}
                    className={`px-2 py-0.5 rounded text-[10px] ${canBuy ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-white/10 text-white/30'}`}>Comprar</button>
                </div>
              </div>
            );
          })}
          {shopItems.length === 0 && (
            <div className="text-center text-white/30 text-xs py-4">Nenhum item à venda.</div>
          )}
        </div>
      )}

      {shopTab === 'sell' && (
        <div className="space-y-1 max-h-80 overflow-y-auto">
          {sellableItems.length === 0 ? (
            <div className="text-center text-white/30 text-xs py-4">
              Nenhuma colheita ou item para vender.
            </div>
          ) : (
            sellableItems.map((entry: any) => {
              const playerCount = game.countInInventory(entry.item.id);
              const price = entry.price;
              return (
                <div key={entry.item.id} className="flex items-center gap-2 p-2 rounded border border-amber-700/30 bg-amber-900/20">
                  <span className="text-lg">{entry.item.icon}</span>
                  <div className="flex-1">
                    <div className="text-white text-xs">{entry.item.name} <span className="text-white/40">x{playerCount}</span></div>
                    <div className="text-white/40 text-[10px]">{entry.item.description}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-amber-400 text-xs">{price} 🪙</div>
                    <button onClick={() => { game.sellToNpc(entry.item.id); refresh(); }}
                      className="px-2 py-0.5 rounded text-[10px] bg-amber-600 hover:bg-amber-500 text-white">Vender</button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </Panel>
  );
}

// ── Dialogue Panel ────────────────────────────────────────────────
function DialoguePanel({ game, uiState }: { game: Game; uiState: GameUIState }) {
  const npc = uiState.activeDialogueNpc;
  if (!npc) return null;
  const dialogue = npc.definition.dialogue[npc.dialogueIndex % npc.definition.dialogue.length];
  const isLastDialogue = npc.dialogueIndex >= npc.definition.dialogue.length - 1;

  const handleNext = () => {
    npc.dialogueIndex++;
    if (npc.dialogueIndex >= npc.definition.dialogue.length) {
      if (npc.definition.type === 'identifier') {
        // Open crafting panel with identification mode
        game.ui.showIdentify = true;
        game.ui.activePanel = 'crafting';
      } else if (npc.definition.shopItems && npc.definition.shopItems.length > 0) {
        game.ui.activeShopNpc = npc;
        game.ui.activePanel = 'shop';
      } else if (npc.definition.questIds && npc.definition.questIds.length > 0) {
        game.ui.activePanel = 'quests';
      } else {
        game.ui.activePanel = 'none';
      }
    }
  };

  return (
    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-[480px] max-w-[90vw] pointer-events-auto">
      <div className="bg-black/85 backdrop-blur-sm rounded-xl border border-white/10 p-4">
        <div className="flex items-start gap-3">
          <div className="text-3xl">{npc.definition.icon}</div>
          <div className="flex-1">
            <div className="text-amber-400 text-sm font-bold mb-1">{npc.definition.name}</div>
            <div className="text-white text-sm">{dialogue}</div>
          </div>
        </div>
        <div className="flex justify-end mt-3 gap-2">
          {isLastDialogue && npc.definition.type === 'blacksmith' && (
            <button onClick={() => { game.openForge(); }} className="px-4 py-1.5 rounded bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold">⚒️ Forja (Upgrade)</button>
          )}
          {isLastDialogue && npc.definition.type === 'identifier' && (
            <button onClick={() => { game.ui.showIdentify = true; game.ui.activePanel = 'crafting'; }} className="px-4 py-1.5 rounded bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold">🔍 Identificar Itens</button>
          )}
          {isLastDialogue && npc.definition.type === 'mage' && (
            <button onClick={() => { game.ui.activePanel = 'spellbook'; }} className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold">📖 Abrir Grimório</button>
          )}
          <button onClick={handleNext} className="px-4 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold">{isLastDialogue ? 'Fechar' : 'Proximo'}</button>
        </div>
      </div>
    </div>
  );
}

// ── Forge Panel ───────────────────────────────────────────────────
function ForgePanel({ game }: { game: Game }) {
  const [, forceUpdate] = useState(0);
  const refresh = () => forceUpdate(n => n + 1);
  const state = game.state;
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
  const [upgradeProgress, setUpgradeProgress] = useState(0);
  const [isUpgrading, setIsUpgrading] = useState(false);

  const forgeableSlots = [...state.player.inventory, ...state.player.hotbar].filter(s => s.item && (s.item.category === 'weapon' || s.item.category === 'tool' || s.item.category === 'armor'));

  const handleUpgrade = () => {
    if (selectedItemIndex === null || isUpgrading) return;
    const sourcePool: 'inventory' | 'hotbar' = selectedItemIndex < state.player.inventory.length ? 'inventory' : 'hotbar';
    const index = sourcePool === 'inventory' ? selectedItemIndex : selectedItemIndex - state.player.inventory.length;
    const source: number = index;
    setIsUpgrading(true);
    setUpgradeProgress(0);
    const duration = 600;
    const interval = 30;
    const steps = duration / interval;
    let cs = 0;
    const timer = setInterval(() => {
      cs++;
      setUpgradeProgress(Math.min(1, cs / steps));
      if (cs / steps >= 1) {                        clearInterval(timer);                        game.upgradeItem(sourcePool, index);
        setIsUpgrading(false);
        setUpgradeProgress(0);
        refresh();
      }
    }, interval);
  };

  return (
    <Panel title="⚒️ Forja" onClose={() => game.setActivePanel('none')}>
      <div className="text-white/60 text-xs mb-2">Selecione um item para melhorar:</div>
      <div className="grid grid-cols-6 gap-1 mb-3">
        {forgeableSlots.map((slot, i) => (
          <div key={i} onClick={() => { if (!isUpgrading) setSelectedItemIndex(i); }}
            className={`w-10 h-10 rounded border flex items-center justify-center cursor-pointer transition-all ${selectedItemIndex === i ? 'border-orange-400 bg-orange-900/30 scale-110' : 'border-white/20 bg-black/40 hover:border-white/40'}`}>
            {slot.item && <span className="text-sm" style={{ color: RARITY_COLORS[slot.item.rarity] }}>{slot.item.icon}</span>}
          </div>
        ))}
      </div>

      {isUpgrading && (
        <div className="mb-3 p-3 rounded-lg border-2 border-orange-500/30 bg-gradient-to-r from-orange-900/30 to-red-900/30">
          <div className="text-white text-xs font-bold mb-1">⚒️ Melhorando item...</div>
          <div className="h-2 bg-black/50 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-100"
              style={{ width: `${upgradeProgress * 100}%`, background: 'linear-gradient(90deg, #ff4400, #ff8800, #ffcc00)' }} />
          </div>
          <div className="text-[9px] text-white/40 mt-0.5">{Math.round(upgradeProgress * 100)}%</div>
        </div>
      )}

      {selectedItemIndex !== null && !isUpgrading && (
        <button onClick={handleUpgrade}
          className="w-full py-2 rounded bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold">⚒️ Melhorar Item</button>
      )}
    </Panel>
  );
}

// ── Panel ─────────────────────────────────────────────────────────
function Panel({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const isMobile = Input.isMobileDevice();
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/50 pointer-events-auto z-50" style={{touchAction: 'manipulation'}}>
      <div className={`bg-gray-900/95 backdrop-blur-md border border-white/10 flex flex-col ${
        isMobile
          ? 'w-full h-full rounded-none p-3 pt-safe overflow-y-auto'
          : 'rounded-2xl p-4 w-[520px] max-w-[95vw] max-h-[85vh]'
      }`}
        style={isMobile ? {
          paddingTop: 'max(12px, env(safe-area-inset-top, 12px))',
          paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))',
          paddingLeft: 'max(12px, env(safe-area-inset-left, 12px))',
          paddingRight: 'max(12px, env(safe-area-inset-right, 12px))',
        } : {}}
      >
        <div className="flex justify-between items-center mb-3 shrink-0">
          <h2 className="text-white font-bold text-lg">{title}</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white text-xl leading-none w-10 h-10 flex items-center justify-center active:scale-90 transition-transform" style={{ WebkitTapHighlightColor: 'transparent' }}>✕</button>
        </div>
        <div className={`flex-1 ${isMobile ? 'overflow-y-auto overscroll-behavior-contain' : 'overflow-y-auto'}`} style={isMobile ? { WebkitOverflowScrolling: 'touch' } : {}}>{children}</div>
        <div className="text-white/20 text-[10px] text-center mt-2 shrink-0">Pressione ESC ou I/C/K/J para fechar</div>
      </div>
    </div>
  );
}

// ── Item Tooltip ──────────────────────────────────────────────────
function ItemTooltip({ item, durability, position, compareWith, playerStats, affixes, unidentified }: {
  item: any;
  durability?: number;
  position: { x: number; y: number };
  compareWith?: any;
  playerStats?: GameState['player']['stats'];
  affixes?: { name: string; stat: string; value: number; tier: number }[];
  unidentified?: boolean;
}) {
  const rarityColor = RARITY_COLORS[item.rarity as Rarity] || '\#fff';

  const statLabels: Record<string, string> = {
    maxHp: '❤️ Vida Max', strength: '⚔️ Forca', defense: '🛡️ Defesa', speed: '🏃 Velocidade',
    mining: '⛏️ Mineracao', woodcutting: '🪓 Corte', farming: '🌾 Fazenda', fishing: '🎣 Pesca', luck: '🍀 Sorte',
  };

  return (
    <div className="fixed z-[100] pointer-events-none" style={{ left: position.x + 16, top: position.y - 8 }}>
      <div className="bg-gray-900/95 backdrop-blur-md rounded-xl border border-white/10 p-3 w-60 shadow-2xl shadow-black/50">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">{item.icon}</span>
          <div>
            <div className="text-sm font-bold" style={{ color: rarityColor }}>{unidentified ? 'Item Misterioso' : item.name}</div>
            <div className="text-[10px]" style={{ color: rarityColor }}>{unidentified ? 'Desconhecido' : item.rarity} {unidentified ? '' : item.category}</div>
          </div>
        </div>

        {affixes && affixes.length > 0 && (
          <div className="mb-1.5 flex flex-wrap gap-1">
            {affixes.map((aff, i) => (
              <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-sm font-bold"
                style={{ color: '#b388ff', backgroundColor: '#b388ff18', border: '1px solid #b388ff40' }}>{aff.name}</span>
            ))}
          </div>
        )}

        <div className="text-white/50 text-[10px] mb-2 border-b border-white/10 pb-2">{unidentified ? '❓ Item não identificado. Leve a uma Bancada para revelar seus atributos!' : item.description}</div>

        <div className="space-y-0.5">
          {unidentified ? (
            <>
              <div className="text-[9px] text-white/30 italic">⚔️ Dano: ???</div>
              <div className="text-[9px] text-white/30 italic">🛡️ Defesa: ???</div>
              <div className="text-[9px] text-white/30 italic">⚡ Velocidade: ???</div>
              <div className="text-[9px] text-white/30 italic">🔧 Efeitos misteriosos...</div>
            </>
          ) : (
            <>
          {item.damage && <StatLine label="⚔️ Dano" value={item.damage} />}
          {item.defense && <StatLine label="🛡️ Defesa" value={item.defense} />}
          {item.speed && <StatLine label="⚡ Velocidade" value={item.speed} />}
          {item.range && <StatLine label="📏 Alcance" value={item.range} />}
          {item.foodValue && <div className="text-[9px] text-orange-400/80">+{item.foodValue} 🍖 Fome</div>}
          {item.healAmount && <div className="text-[9px] text-red-400/80">+{item.healAmount} ❤️ Vida</div>}

          {item.toolType && <div className="text-[9px] text-white/40">Tipo: {item.toolType}</div>}
          {item.armorSlot && <div className="text-[9px] text-white/40">Slot: {item.armorSlot}</div>}

          {item.bonuses && Object.entries(item.bonuses).map(([key, val]) => val ? <StatLine key={key} label={statLabels[key] || key} value={val as number} /> : null)}

          {item.effects?.map((eff: any, i: number) => (
            <div key={i} className="text-[9px] text-green-400/80">+{eff.value} {eff.type === 'heal' ? '❤️ Vida' : eff.type === 'hunger' ? '🍖 Fome' : eff.type === 'energy' ? '⚡ Energia' : eff.type === 'xp' ? '✨ XP' : eff.type}</div>
          ))}
            </>
          )}

          {durability !== undefined && item.maxDurability && (
            <div className="mt-1">
              <div className="flex justify-between text-[9px] text-white/40 mb-0.5"><span>Durabilidade</span><span>{durability}/{item.maxDurability}</span></div>
              <div className="h-1.5 bg-black/50 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${(durability / item.maxDurability) * 100}%`, backgroundColor: durability / item.maxDurability > 0.5 ? '#4caf50' : '#ff9800' }} />
              </div>
            </div>
          )}
        </div>

        <div className="mt-1.5 pt-1.5 border-t border-white/10 flex justify-between text-[9px] text-white/30">
          <span>💰 {item.value} 🪙</span>
          <span>⚖️ {item.weight}kg</span>
        </div>
      </div>
    </div>
  );
}

function StatLine({ label, value, compare }: { label: string; value: number; compare?: number }) {
  const diff = compare !== undefined ? value - compare : null;
  return (
    <div className="flex items-center justify-between text-[9px]">
      <span className="text-white/50">{label}</span>
      <span className={diff !== null && diff !== 0 ? (diff > 0 ? 'text-green-400' : 'text-red-400') : 'text-white/70'}>{value}</span>
    </div>
  );
}

// ── Save Panel ───────────────────────────────────────────────────
function SavePanel({ game }: { game: Game }) {
  const [slots, setSlots] = useState<SaveSlotInfo[]>(getAllSaveSlots());
  const refresh = () => setSlots(getAllSaveSlots());

  return (
    <Panel title="💾 Salvar / Carregar" onClose={() => game.setActivePanel('none')}>
      <div className="space-y-2">
        {slots.map(slot => (
          <div key={slot.slot} className="flex items-center justify-between p-2 rounded border border-white/10 bg-white/5">
            <div>
              <div className="text-white text-xs font-bold">Slot {slot.slot + 1} {slot.slot === 0 ? '(Auto)' : ''}</div>
              {slot.exists ? <div className="text-white/50 text-[10px]">Nv.{slot.playerLevel} | {slot.playTime} | {formatSaveDate(slot.timestamp)}</div>
                : <div className="text-white/30 text-[10px]">Vazio</div>}
            </div>
            <div className="flex gap-1">
              {slot.exists && <button onClick={() => { game.loadFromSlot(slot.slot); refresh(); game.setActivePanel('none'); }} className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[10px]">Carregar</button>}
              <button onClick={() => { game.saveToSlot(slot.slot); refresh(); }} className="px-2 py-1 rounded bg-green-600 hover:bg-green-500 text-white text-[10px]">Salvar</button>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

// ── Storage Panel ────────────────────────────────────────────────
function StoragePanel({ game }: { game: Game }) {
  const [, forceUpdate] = useState(0);
  const refresh = () => forceUpdate(n => n + 1);
  const chestId = game.state.activeStorageChestId;
  const chest = chestId ? game.state.storageChests.find(c => c.id === chestId) : null;
  if (!chest || !chestId) return null;

  const isMobile = Input.isMobileDevice();

  return (
    <div className={`z-50 pointer-events-auto ${isMobile ? 'absolute inset-0 flex items-center justify-center bg-black/50' : 'absolute right-4 top-1/2 -translate-y-1/2'}`}>
      <div className={`bg-gray-900/95 backdrop-blur-md rounded-2xl border border-amber-800/40 shadow-2xl shadow-black/60 ${
        isMobile ? 'w-[85vw] max-h-[75vh] p-3 overflow-y-auto' : 'p-3 w-64'
      }`}>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-white font-bold text-sm">🗄️ {chest.name}</h3>
          <button onClick={() => { game.state.activeStorageChestId = null; game.ui.activePanel = 'none'; refresh(); }} className="text-white/40 hover:text-white text-sm active:scale-90">✕</button>
        </div>
        <div className="text-white/40 text-[10px] mb-2">{chest.slots.filter(s => s.item).length}/{chest.maxSlots} slots usados</div>
        {isMobile && <div className="text-[8px] text-white/30 mb-1">Toque para pegar item</div>}
        <div className={`grid gap-1 ${isMobile ? 'grid-cols-6' : 'grid-cols-5'}`}>
          {chest.slots.map((slot, i) => (
            <div key={i}
              onDoubleClick={() => { if (slot.item) { game.takeFromStorage(i, chestId!, slot.count); refresh(); } }}
              onClick={() => { if (isMobile && slot.item) { game.takeFromStorage(i, chestId!, slot.count); refresh(); } }}
              className={`${isMobile ? 'w-full aspect-square' : 'w-10 h-10'} rounded border border-white/10 bg-black/40 flex items-center justify-center relative cursor-pointer hover:border-white/30 group active:scale-90 transition-transform`}
            >
              {slot.item && <><span className="text-sm" style={{ color: RARITY_COLORS[slot.item.rarity as Rarity] }}>{slot.item.icon}</span>{slot.count > 1 && <span className="absolute bottom-0 right-0.5 text-[8px] text-white font-bold">{slot.count}</span>}</>}
            </div>
          ))}
        </div>
        <div className="border-t border-white/10 mt-2 pt-2">
          <div className="text-white/40 text-[10px] mb-1">Seu inventario:</div>
          {isMobile && <div className="text-[8px] text-white/30 mb-1">Toque para guardar item</div>}
          <div className={`grid gap-1 ${isMobile ? 'grid-cols-6' : 'grid-cols-5'}`}>
            {game.state.player.inventory.slice(0, isMobile ? 24 : 15).map((slot, i) => (
              <div key={i}
                onDoubleClick={() => { if (slot.item) { game.moveToStorage(i, chestId!, slot.count); refresh(); } }}
                onClick={() => { if (isMobile && slot.item) { game.moveToStorage(i, chestId!, slot.count); refresh(); } }}
                className={`${isMobile ? 'w-full aspect-square' : 'w-10 h-10'} rounded border border-white/10 bg-black/40 flex items-center justify-center relative cursor-pointer hover:border-green-400/50 group active:scale-90 transition-transform`}
              >
                {slot.item && <><span className="text-sm" style={{ color: RARITY_COLORS[slot.item.rarity as Rarity] }}>{slot.item.icon}</span>{slot.count > 1 && <span className="absolute bottom-0 right-0.5 text-[8px] text-white font-bold">{slot.count}</span>}</>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Achievement Popup ─────────────────────────────────────────────
function AchievementPopup({ game, achievementId }: { game: Game; achievementId: string }) {
  const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      // After fade-out transition, dismiss from queue
      setTimeout(() => {
        game.dismissAchievement();
      }, 300);
    }, 3000);

    return () => clearTimeout(timer);
  }, [achievementId, game]);

  if (!achievement) return null;

  const rarityColors: Record<string, string> = {
    progression: '#ffd700', combat: '#ff4444', gathering: '#44aa44',
    farming: '#66bb6a', crafting: '#44aadd', exploration: '#aa66ff', special: '#ff8800'
  };

  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
      <div className="bg-gradient-to-r from-yellow-900/90 via-amber-900/90 to-yellow-900/90 border-2 border-yellow-500/60 rounded-xl px-6 py-3 shadow-2xl shadow-yellow-500/20 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="text-4xl animate-bounce">{achievement.icon}</div>
          <div>
            <div className="text-[10px] text-yellow-300/70 font-bold uppercase tracking-wider">🏆 Conquista Desbloqueada!</div>
            <div className="text-white font-bold text-lg" style={{ color: rarityColors[achievement.category] || '#ffd700' }}>{achievement.name}</div>
            <div className="text-white/60 text-xs">{achievement.description}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Achievements Panel ───────────────────────────────────────────
function AchievementsPanel({ game }: { game: Game }) {
  const state = game.state;
  const total = ACHIEVEMENTS.length;
  const unlocked = state.achievements.filter(a => a.unlocked).length;

  return (
    <Panel title="🏆 Conquistas" onClose={() => game.setActivePanel('none')}>
      <div className="mb-3">
        <div className="flex justify-between text-xs text-white/70 mb-1"><span>Progresso</span><span>{unlocked}/{total}</span></div>
        <div className="h-2 bg-black/50 rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-yellow-300 transition-all" style={{ width: `${(unlocked / total) * 100}%` }} />
        </div>
      </div>
      <div className="space-y-1 max-h-80 overflow-y-auto">
        {ACHIEVEMENTS.map(ach => {
          const prog = state.achievements.find(a => a.id === ach.id);
          const isUnlocked = prog?.unlocked ?? false;
          const catColors: Record<string, string> = { exploration: '#aa66ff', combat: '#ff4444', gathering: '#44aa44', farming: '#66bb6a', crafting: '#44aadd', progression: '#ffd700', special: '#ff8800' };
          return (
            <div key={ach.id} className={`flex items-center gap-2 p-2 rounded border ${isUnlocked ? 'border-yellow-500/30 bg-yellow-900/20' : 'border-white/10 bg-white/5 opacity-50'}`}>
              <span className={`text-xl ${isUnlocked ? '' : 'grayscale'}`}>{ach.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-white text-xs font-bold" style={isUnlocked ? { color: catColors[ach.category] || '#ffd700' } : {}}>{ach.name}</div>
                <div className="text-white/40 text-[10px]">{ach.description}</div>
              </div>
              <div className="text-[10px]">{isUnlocked ? '✅' : '🔒'}</div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}


// ── Furnace Panel ─────────────────────────────────────────────────
function FurnacePanel({ game }: { game: Game }) {
  const [, forceUpdate] = useState(0);
  const refresh = () => forceUpdate(n => n + 1);
  const structId = game.ui.activeFurnaceId;
  const struct = structId ? game.state.structures.find(s => s.id === structId) : null;
  const fd = struct?.furnaceData;
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [tab, setTab] = useState<'smelt' | 'upgrade'>('smelt');

  // ── Upgrade state ──
  const [selectedItemIdx, setSelectedItemIdx] = useState<number | null>(null);
  const [upgradeProgress, setUpgradeProgress] = useState(0);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const forgeableSlots = [...game.state.player.inventory, ...game.state.player.hotbar].filter(
    s => s.item && (s.item.category === 'weapon' || s.item.category === 'tool' || s.item.category === 'armor')
  );

  if (!struct || !fd) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/50 pointer-events-auto z-50">
        <div className="bg-gray-900/95 backdrop-blur-md rounded-2xl border border-orange-800/40 p-6">
          <div className="text-white text-sm">Fornalha n\u00e3o encontrada.</div>
          <button onClick={() => { game.ui.activePanel = 'none'; refresh(); }} className="mt-3 px-4 py-1.5 rounded bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold">Fechar</button>
        </div>
      </div>
    );
  }

  const currentRecipe = fd?.currentRecipeId ? RECIPES.find(r => r.id === fd.currentRecipeId) : null;
  const resultItem = currentRecipe ? getItem(currentRecipe.result) : null;

  const handleSlotDrop = (slotType: 'input' | 'fuel', itemId: string) => {
    if (!game.removeFromInventory(itemId, 1)) return;
    if (slotType === 'input') game.furnaceAddInput(structId!, itemId, 1);
    else game.furnaceAddFuel(structId!, itemId, 1);
    refresh();
  };

  const handleUpgrade = () => {
    if (selectedItemIdx === null || isUpgrading) return;
    const sourcePool: 'inventory' | 'hotbar' = selectedItemIdx < game.state.player.inventory.length ? 'inventory' : 'hotbar';
    const index = sourcePool === 'inventory' ? selectedItemIdx : selectedItemIdx - game.state.player.inventory.length;
    setIsUpgrading(true);
    setUpgradeProgress(0);
    const duration = 600;
    const interval = 30;
    const steps = duration / interval;
    let cs = 0;
    const timer = setInterval(() => {
      cs++;
      setUpgradeProgress(Math.min(1, cs / steps));
      if (cs / steps >= 1) {
        clearInterval(timer);
        game.upgradeItem(sourcePool, index);
        setIsUpgrading(false);
        setUpgradeProgress(0);
        refresh();
      }
    }, interval);
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/50 pointer-events-auto z-50">
      <div className="bg-gray-900/95 backdrop-blur-md rounded-2xl border border-orange-800/40 p-5 w-[440px] shadow-2xl shadow-orange-900/30">
        {/* Header */}
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            {tab === 'smelt' ? (fd.lit ? '\uD83D\uDD25' : '\u26DB\uFE0F') : '\u2692\uFE0F'} Fornalha
          </h2>
          <button onClick={() => { game.ui.activeFurnaceId = null; game.ui.activePanel = 'none'; refresh(); }}
            className="text-white/40 hover:text-white text-xl leading-none">\u2715</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-3">
          <button onClick={() => { setTab('smelt'); setSelectedItemIdx(null); }}
            className={`flex-1 py-1.5 rounded text-[10px] font-bold transition-all ${tab === 'smelt' ? 'bg-orange-700 text-white' : 'bg-white/10 text-white/50 hover:bg-white/20'}`}>
            \uD83D\uDD25 Fus\u00e3o
          </button>
          <button onClick={() => { setTab('upgrade'); }}
            className={`flex-1 py-1.5 rounded text-[10px] font-bold transition-all ${tab === 'upgrade' ? 'bg-orange-700 text-white' : 'bg-white/10 text-white/50 hover:bg-white/20'}`}>
            \u2692\uFE0F Melhorias
          </button>
        </div>

        {tab === 'smelt' && (
          <>
            {/* Status indicator */}
            <div className="flex items-center gap-2 mb-3 text-xs">
              <span className={fd.lit ? 'text-orange-400' : 'text-white/40'}>
                {fd.lit ? '\uD83D\uDD25 Acesa' : '\u26DB\uFE0F Apagada'}
              </span>
              {fd.fuelTime > 0 && (
                <span className="text-yellow-400/70">\u23F1 {Math.ceil(fd.fuelTime)}s restantes</span>
              )}
              {fd.currentRecipeId && (
                <span className="text-green-400/70">
                  {fd.progress > 0 ? `\uD83D\uDD28 ${Math.floor(fd.progress * 100)}%` : '\u2705 Pronto'}
                </span>
              )}
            </div>

            {/* Fuel bar */}
            {fd.maxFuelTime > 0 && (
              <div className="mb-3">
                <div className="flex justify-between text-[9px] text-white/40 mb-0.5">
                  <span>Combust\u00edvel</span>
                  <span>{Math.ceil(fd.fuelTime)}/{Math.ceil(fd.maxFuelTime)}s</span>
                </div>
                <div className="h-2.5 bg-black/50 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${(fd.fuelTime / fd.maxFuelTime) * 100}%`, background: 'linear-gradient(90deg, #ff4400, #ff8800)' }} />
                </div>
              </div>
            )}

            {/* Smelting progress */}
            {fd.currentRecipeId && fd.smeltTime > 0 && (
              <div className="mb-3">
                <div className="flex justify-between text-[9px] text-white/40 mb-0.5">
                  <span>Fus\u00e3o</span>
                  <span>{Math.floor(fd.progress * 100)}%</span>
                </div>
                <div className="h-2.5 bg-black/50 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-200"
                    style={{ width: `${Math.min(100, fd.progress * 100)}%`, background: 'linear-gradient(90deg, #ff6600, #ffcc00)' }} />
                </div>
              </div>
            )}

            {/* Three slot areas */}
            <div className="flex gap-4 items-start justify-center mb-4">
              {/* Input slot */}
              <div className="text-center">
                <div className="text-[9px] text-white/40 mb-1">Entrada</div>
                <div
                  onMouseEnter={() => setHoveredSlot('input')}
                  onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
                  onMouseLeave={() => setHoveredSlot(null)}
                  onDragOver={(e) => { e.preventDefault(); setDragOverSlot('input'); }}
                  onDragLeave={() => setDragOverSlot(null)}
                  onDrop={(e) => { e.preventDefault(); setDragOverSlot(null); const data = e.dataTransfer.getData('text/plain'); if (data) handleSlotDrop('input', data); }}
                  className={`w-14 h-14 rounded-lg border-2 flex items-center justify-center relative transition-all ${dragOverSlot === 'input' ? 'border-green-400 bg-green-900/30' : 'border-white/20 bg-black/40'}`}>
                  {fd.input?.item ? (
                    <><span className="text-2xl" style={{ color: RARITY_COLORS[fd.input.item.rarity as Rarity] }}>{fd.input.item.icon}</span><div className="absolute top-0.5 left-0.5 w-2 h-2 rounded-full" style={{ backgroundColor: RARITY_COLORS[fd.input.item.rarity as Rarity] }} />{fd.input.count > 1 && <span className="absolute bottom-0 right-1 text-[10px] text-white font-bold">{fd.input.count}</span>}</>
                  ) : (
                    <span className="text-white/20 text-[10px]">\u2B07\uFE0F</span>
                  )}
                </div>
                {fd.input?.item && <button onClick={() => { game.furnaceTakeInput(structId!); refresh(); }} className="mt-1 text-[8px] text-white/40 hover:text-white/60">Retirar</button>}
              </div>

              {/* Fuel slot */}
              <div className="text-center">
                <div className="text-[9px] text-white/40 mb-1">Combust\u00edvel</div>
                <div
                  onMouseEnter={() => setHoveredSlot('fuel')}
                  onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
                  onMouseLeave={() => setHoveredSlot(null)}
                  onDragOver={(e) => { e.preventDefault(); setDragOverSlot('fuel'); }}
                  onDragLeave={() => setDragOverSlot(null)}
                  onDrop={(e) => { e.preventDefault(); setDragOverSlot(null); const data = e.dataTransfer.getData('text/plain'); if (data) handleSlotDrop('fuel', data); }}
                  className={`w-14 h-14 rounded-lg border-2 flex items-center justify-center relative transition-all ${dragOverSlot === 'fuel' ? 'border-orange-400 bg-orange-900/30' : 'border-white/20 bg-black/40'}`}>
                  {fd.fuel?.item ? (
                    <><span className="text-2xl" style={{ color: RARITY_COLORS[fd.fuel.item.rarity as Rarity] }}>{fd.fuel.item.icon}</span><div className="absolute top-0.5 left-0.5 w-2 h-2 rounded-full" style={{ backgroundColor: RARITY_COLORS[fd.fuel.item.rarity as Rarity] }} />{fd.fuel.count > 1 && <span className="absolute bottom-0 right-1 text-[10px] text-white font-bold">{fd.fuel.count}</span>}</>
                  ) : (
                    <span className="text-white/20 text-[10px]">\uD83E\uDEB5</span>
                  )}
                </div>
                {fd.fuel?.item && <button onClick={() => { game.furnaceTakeFuel(structId!); refresh(); }} className="mt-1 text-[8px] text-white/40 hover:text-white/60">Retirar</button>}
              </div>

              {/* Output slot */}
              <div className="text-center">
                <div className="text-[9px] text-white/40 mb-1">Sa\u00edda</div>
                <div
                  onMouseEnter={() => setHoveredSlot('output')}
                  onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
                  onMouseLeave={() => setHoveredSlot(null)}
                  className="w-14 h-14 rounded-lg border-2 border-yellow-600/40 bg-black/40 flex items-center justify-center relative">
                  {fd.output?.item ? (
                    <><span className="text-2xl" style={{ color: RARITY_COLORS[fd.output.item.rarity as Rarity] }}>{fd.output.item.icon}</span><div className="absolute top-0.5 left-0.5 w-2 h-2 rounded-full" style={{ backgroundColor: RARITY_COLORS[fd.output.item.rarity as Rarity] }} />{fd.output.count > 1 && <span className="absolute bottom-0 right-1 text-[10px] text-white font-bold">{fd.output.count}</span>}</>
                  ) : (
                    <span className="text-white/20 text-[10px]">\u27A1\uFE0F</span>
                  )}
                </div>
                {fd.output?.item && <button onClick={() => { game.furnaceTakeOutput(structId!); refresh(); }} className="mt-1 text-[8px] text-green-400/60 hover:text-green-400">Pegar</button>}
              </div>
            </div>

            {/* Fuel hints */}
            <div className="text-[9px] text-white/30 text-center mb-3">
              \uD83D\uDD25 Combust\u00edveis: \uD83E\uDEB5 Madeira (15s) | \uD83D\uDDA4 Carv\u00e3o (45s)
            </div>

            {/* Inventory drag area */}
            <div className="border-t border-orange-900/40 pt-2 mb-3">
              <div className="text-[9px] text-white/40 mb-1.5 flex items-center gap-2">
                <span>\uD83D\uDCE6 Arraste itens do invent\u00e1rio para os slots acima</span>
              </div>
              <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto p-1.5 rounded-lg bg-black/30 border border-white/5">
                {game.state.player.inventory.map((slot, i) =>
                  slot?.item && slot.count > 0 ? (
                    <div key={`inv_${i}`}
                      draggable
                      onDragStart={(e) => { e.dataTransfer.setData('text/plain', slot.item!.id); e.dataTransfer.effectAllowed = 'copy'; }}
                      className="w-9 h-9 rounded border border-white/10 bg-black/40 flex items-center justify-center relative cursor-grab active:cursor-grabbing hover:border-orange-400/50 hover:bg-orange-900/20 transition-all group"
                      title={slot.item.name}
                    >
                      <span className="text-sm" style={{ color: RARITY_COLORS[slot.item.rarity as Rarity] }}>{slot.item.icon}</span>
                      {slot.count > 1 && <span className="absolute -bottom-0.5 -right-0.5 text-[7px] text-white font-bold bg-black/60 rounded px-0.5">{slot.count}</span>}
                      <div className="absolute inset-0 rounded border-2 border-transparent group-hover:border-orange-400/30 pointer-events-none" />
                    </div>
                  ) : null
                )}
                {game.state.player.hotbar.map((slot, i) =>
                  slot?.item && slot.count > 0 ? (
                    <div key={`hot_${i}`}
                      draggable
                      onDragStart={(e) => { e.dataTransfer.setData('text/plain', slot.item!.id); e.dataTransfer.effectAllowed = 'copy'; }}
                      className="w-9 h-9 rounded border border-white/10 bg-black/40 flex items-center justify-center relative cursor-grab active:cursor-grabbing hover:border-orange-400/50 hover:bg-orange-900/20 transition-all group"
                      title={slot.item.name}
                    >
                      <span className="text-sm" style={{ color: RARITY_COLORS[slot.item.rarity as Rarity] }}>{slot.item.icon}</span>
                      {slot.count > 1 && <span className="absolute -bottom-0.5 -right-0.5 text-[7px] text-white font-bold bg-black/60 rounded px-0.5">{slot.count}</span>}
                      <div className="absolute inset-0 rounded border-2 border-transparent group-hover:border-orange-400/30 pointer-events-none" />
                    </div>
                  ) : null
                )}
              </div>
            </div>

            {/* Quick actions */}
            <div className="flex gap-1 justify-center">
              <button onClick={() => { game.furnaceTakeOutput(structId!); refresh(); }}
                className="px-3 py-1.5 rounded bg-orange-700 hover:bg-orange-600 text-white text-[10px] font-bold">\uD83D\uDCE6 Pegar tudo</button>
              <button onClick={() => { game.ui.activePanel = 'none'; refresh(); }}
                className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-white/60 text-[10px]">\u2715 Fechar</button>
            </div>

            {/* Recipe tooltip on hover */}
            {hoveredSlot && currentRecipe && resultItem && (() => {
              const timeSeconds = Math.ceil((currentRecipe.craftTime || fd.smeltTime || 0) / 1000);
              return (
                <div className="fixed z-[100] pointer-events-none" style={{ left: tooltipPos.x + 16, top: tooltipPos.y - 8 }}>
                  <div className="bg-gray-900/95 backdrop-blur-md rounded-xl border border-orange-800/40 p-3 w-56 shadow-2xl shadow-orange-900/30">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl" style={{ color: RARITY_COLORS[resultItem.rarity as Rarity] }}>{resultItem.icon}</span>
                      <div>
                        <div className="text-sm font-bold text-white">{currentRecipe.name}</div>
                        <div className="text-[9px]" style={{ color: RARITY_COLORS[resultItem.rarity as Rarity] }}>{resultItem.name}</div>
                      </div>
                    </div>

                    {/* Craft time */}
                    <div className="flex items-center gap-1.5 text-[10px] text-white/70 mb-2 border-b border-orange-900/40 pb-2">
                      <span>\u23F1 {timeSeconds}s</span>
                      {fd.smeltTime > 0 && <span className="text-white/40">| {Math.floor(fd.progress * 100)}%</span>}
                      {currentRecipe.requiredLevel > 1 && <span className="text-yellow-400/60">| Nv.{currentRecipe.requiredLevel}</span>}
                    </div>

                    {/* Ingredients */}
                    <div className="text-[9px] text-white/50 mb-1">\uD83D\uDCE6 Ingredientes:</div>
                    <div className="space-y-1">
                      {currentRecipe.ingredients.map(ing => {
                        const item = getItem(ing.itemId);
                        const have = game.countInInventory(ing.itemId);
                        return (
                          <div key={ing.itemId} className="flex items-center justify-between text-[10px]">
                            <span className="flex items-center gap-1">
                              <span>{item?.icon}</span>
                              <span className={have >= ing.count ? 'text-green-400' : 'text-red-400'}>{item?.name}</span>
                            </span>
                            <span className={have >= ing.count ? 'text-green-400' : 'text-red-400'}>
                              {have}/{ing.count}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Result count */}
                    {currentRecipe.resultCount && currentRecipe.resultCount > 1 && (
                      <div className="mt-1.5 text-[9px] text-white/40 border-t border-orange-900/40 pt-1.5">
                        \u27A1\uFE0F Produz {currentRecipe.resultCount}x
                      </div>
                    )}

                    {/* Station */}
                    {currentRecipe.station && (
                      <div className="mt-1 text-[8px] text-orange-400/60">
                        \uD83D\uDD25 {currentRecipe.station === 'furnace' ? 'Fornalha' : currentRecipe.station}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </>
        )}

        {tab === 'upgrade' && (
          <>
            <div className="text-white/60 text-xs mb-2">Selecione um item para melhorar (gasta min\u00e9rios e ouro):</div>
            <div className="grid grid-cols-6 gap-1 mb-3">
              {forgeableSlots.length === 0 && (
                <div className="col-span-6 text-center text-white/30 text-[10px] py-3">Nenhum item melhor\u00e1vel no invent\u00e1rio.</div>
              )}
              {forgeableSlots.map((slot, i) => (
                <div key={i} onClick={() => { if (!isUpgrading) setSelectedItemIdx(i); }}
                  className={`w-10 h-10 rounded border flex items-center justify-center cursor-pointer transition-all ${selectedItemIdx === i ? 'border-orange-400 bg-orange-900/30 scale-110' : 'border-white/20 bg-black/40 hover:border-white/40'}`}>
                  {slot.item && (
                    <div className="relative">
                      <span className="text-sm" style={{ color: RARITY_COLORS[slot.item.rarity] }}>{slot.item.icon}</span>
                      <div className="absolute -top-0.5 -left-0.5 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: RARITY_COLORS[slot.item.rarity] }} />
                      {(slot.upgradeLevel ?? 0) > 0 && (
                        <span className="absolute -top-1 -right-2 text-[7px] text-orange-400 font-bold">+{slot.upgradeLevel}</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {isUpgrading && (
              <div className="mb-3 p-3 rounded-lg border-2 border-orange-500/30 bg-gradient-to-r from-orange-900/30 to-red-900/30">
                <div className="text-white text-xs font-bold mb-1">\u2692\uFE0F Melhorando item...</div>
                <div className="h-2 bg-black/50 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-100"
                    style={{ width: `${upgradeProgress * 100}%`, background: 'linear-gradient(90deg, #ff4400, #ff8800, #ffcc00)' }} />
                </div>
                <div className="text-[9px] text-white/40 mt-0.5">{Math.round(upgradeProgress * 100)}%</div>
              </div>
            )}

            {selectedItemIdx !== null && !isUpgrading && (
              <button onClick={handleUpgrade}
                className="w-full py-2 rounded bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold">\u2692\uFE0F Melhorar Item</button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
// ── Farming Bar ──────────────────────────────────────────────────
function FarmingBar({ game }: { game: Game }) {
  const [, forceUpdate] = useState(0);
  const refresh = () => forceUpdate(n => n + 1);

  const handleFarming = () => {
    // Use the game's internal interaction for farming
    // Pressing P triggers the farm action via the input system
    const input = (game as any).input;
    if (input) {
      // Simulate pressing the interact key near a plot
      (game as any).tryFarmAction?.();
    }
    refresh();
  };

  return (
    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 pointer-events-auto flex gap-1">
      <button onClick={handleFarming} className="px-2 py-1 rounded bg-green-800 hover:bg-green-700 text-white text-[10px] border border-green-600/40">🌾 Cultivar (P)</button>
    </div>
  );
}

// ── Fishing Progress Bar ───────────────────────────────────────────
function FishingBar({ game }: { game: Game }) {
  const [fishingState, setFishingState] = useState({
    active: false,
    progress: 0,
    caught: false,
    bobberX: 0,
    bobberY: 0,
    phase: 0,
    rodName: '',
    baitName: '',
  });

  useEffect(() => {
    const interval = setInterval(() => {
      if (!game) return;
      setFishingState({
        active: game.isFishing,
        progress: game.fishingTotalTime > 0 ? Math.min(1, game.fishingTimer / game.fishingTotalTime) : 0,
        caught: game.fishingCaught,
        bobberX: game.fishingBobberX,
        bobberY: game.fishingBobberY,
        phase: game.fishingBobberPhase,
        rodName: game.fishingRodId ? (getItem(game.fishingRodId)?.name ?? 'Vara') : '',
        baitName: game.fishingBait ? (getItem(game.fishingBait)?.name ?? 'Isca') : '',
      });
    }, 50);

    return () => clearInterval(interval);
  }, [game]);

  if (!fishingState.active && !fishingState.caught) return null;

  const progress = fishingState.progress;
  const pct = Math.round(progress * 100);
  const wave = Math.sin(Date.now() / 300) * 0.5 + 0.5;
  const fishPulse = Math.sin(Date.now() / 200) * 0.3 + 0.7;
  const bobOffset = Math.sin(Date.now() / 400 + fishingState.phase) * 2;

  return (
    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 pointer-events-auto z-30">
      <div className="bg-black/75 backdrop-blur-md rounded-2xl border border-cyan-500/30 px-6 py-3 shadow-2xl shadow-cyan-900/30 min-w-[320px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎣</span>
            <span className="text-white font-bold text-xs">
              {fishingState.caught ? '🎉 Algo pegou!' : 'Pescando...'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[9px] text-white/40">
            {fishingState.rodName && <span>🎣 {fishingState.rodName}</span>}
            {fishingState.baitName && <span>• 🪱 {fishingState.baitName}</span>}
          </div>
        </div>

        {/* Bobber visualization */}
        <div className="relative h-16 mb-2 overflow-hidden rounded-lg bg-gradient-to-b from-cyan-950/60 via-blue-950/50 to-cyan-950/60 border border-cyan-500/20">
          {/* Water waves */}
          <div className="absolute inset-0 opacity-20">
            <svg viewBox="0 0 320 64" className="w-full h-full">
              <defs>
                <linearGradient id="waveGradFishing" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="50%" stopColor="#0ea5e9" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
              <path d={`M0,${32 + wave * 4} Q${40},${20 + wave * 6} ${80},${32 + wave * 2} T${160},${32 - wave * 3} T${240},${32 + wave * 4} T${320},${32 - wave * 2} L320,64 L0,64 Z`}
                fill="url(#waveGradFishing)" opacity={0.5}>
                <animate attributeName="d" dur="3s" repeatCount="indefinite"
                  values={`M0,${32} Q40,${20} 80,${32} T160,${32} T240,${32} T320,${32} L320,64 L0,64 Z;M0,${32 + 4} Q40,${20 + 6} 80,${32 + 2} T160,${32 - 3} T240,${32 + 4} T320,${32 - 2} L320,64 L0,64 Z;M0,${32} Q40,${20} 80,${32} T160,${32} T240,${32} T320,${32} L320,64 L0,64 Z`} />
              </path>
            </svg>
          </div>

          {/* Bobber */}
          {!fishingState.caught && (
            <div className="absolute transition-all duration-200"
              style={{ left: `calc(50% - 10px)`, top: `${10 + bobOffset}px` }}>
              <div className="relative">
                <span className="text-xl" style={{ filter: `brightness(${1 + wave * 0.3})` }}>🎣</span>
                <div className="absolute -bottom-1 -left-2 w-8 h-2 rounded-full bg-cyan-400/20 animate-ping" />
              </div>
            </div>
          )}

          {/* Caught indicator */}
          {fishingState.caught && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-bounce text-center">
                <span className="text-3xl">🐟</span>
                <div className="text-[9px] text-yellow-400 font-bold mt-1">🔴 Clique ou [E]!</div>
              </div>
            </div>
          )}

          {/* Splash particles */}
          {!fishingState.caught && (
            <>
              <div className="absolute bottom-2 left-1/4 w-1 h-1 rounded-full bg-cyan-300/40 animate-ping"
                style={{ animationDuration: '0.8s', animationDelay: '0.2s' }} />
              <div className="absolute bottom-4 right-1/4 w-1.5 h-1.5 rounded-full bg-cyan-300/30 animate-ping"
                style={{ animationDuration: '1.2s', animationDelay: '0.6s' }} />
              <div className="absolute bottom-1 left-1/2 w-1 h-1 rounded-full bg-white/30 animate-ping"
                style={{ animationDuration: '1.0s', animationDelay: '0.8s' }} />
            </>
          )}
        </div>

        {/* Progress bar */}
        {!fishingState.caught && (
          <div>
            <div className="flex justify-between text-[9px] text-white/40 mb-0.5">
              <span className="text-cyan-300">{fishingState.baitName ? `🪱 Isca ativa` : `🎯 Aguardando...`}</span>
              <span className="text-cyan-400 font-bold">{pct}%</span>
            </div>
            <div className="h-2.5 bg-black/50 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-150"
                style={{
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, #0891b2, #06b6d4, #22d3ee, #67e8f9)`,
                  backgroundSize: '200% 100%',
                }}>
                {pct > 0 && pct < 100 && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_1.5s_infinite]" />
                )}
              </div>
            </div>
            <div className="flex justify-between mt-0.5 text-[8px]">
              <span className="text-white/20">Pressione E ou clique para fisgar!</span>
              <span className="text-cyan-400/40" style={{ opacity: fishPulse }}>●</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
// ── Sleep Panel ───────────────────────────────────────────────────
function SleepPanel({ game }: { game: Game }) {
  const [, forceUpdate] = useState(0);
  const refresh = () => forceUpdate(n => n + 1);
  const currentHour = game.timeSystem.getHour();

  const sleepOptions = [
    { hour: 6, label: '\uD83C\uDF05 Amanhecer (06:00)', desc: 'Acorde cedo para um dia produtivo' },
    { hour: 8, label: '\u2600\uFE0F Manh\u00e3 (08:00)', desc: 'Acorde com o sol j\u00e1 alto' },
    { hour: 12, label: '\uD83C\uDF1E Meio-Dia (12:00)', desc: 'Durma at\u00e9 o meio-dia' },
  ];

  const handleSleep = (hour: number) => {
    game.sleepInBed(hour);
    game.ui.activePanel = 'none';
    refresh();
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/50 pointer-events-auto z-50">
      <div className="bg-gray-900/95 backdrop-blur-md rounded-2xl border border-purple-800/40 p-5 w-80 shadow-2xl shadow-purple-900/30">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-white font-bold text-lg flex items-center gap-2">\uD83D\uDECF\uFE0F Dormir</h2>
          <button onClick={() => { game.ui.activePanel = 'none'; refresh(); }}
            className="text-white/40 hover:text-white text-xl leading-none">\u2715</button>
        </div>
        <div className="text-white/60 text-xs mb-3">Hora atual: {String(currentHour).padStart(2, '0')}:00</div>
        <div className="space-y-2">
          {sleepOptions.map(opt => (
            <button key={opt.hour} onClick={() => handleSleep(opt.hour)}
              className="w-full p-3 rounded-lg border border-purple-700/40 bg-purple-900/20 hover:bg-purple-900/40 transition-all text-left">
              <div className="text-white text-sm font-bold">{opt.label}</div>
              <div className="text-white/40 text-[10px]">{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Spellbook Panel ────────────────────────────────────────────
function SpellbookPanel({ game }: { game: Game }) {
  const [, forceUpdate] = useState(0);
  const refresh = () => forceUpdate(n => n + 1);
  const state = game.state;
  const unlockedSpells = game.unlockedSpells || [];
  const hasSpells = unlockedSpells.length > 0;

  const handleSelect = (idx: number) => {
    state.player.selectedSpell = idx;
    game.addNotification(`Magia selecionada: ${getSpell(unlockedSpells[idx])?.name || ''}`, 'info');
    refresh();
  };

  const handleLearnFromInventory = () => {
    // Check inventory for tome items
    const allSlots = [...state.player.inventory, ...state.player.hotbar];
    for (const slot of allSlots) {
      if (slot.item && slot.item.id.endsWith('_tome')) {
        const learned = game.learnSpell(slot.item.id);
        if (learned) {
          slot.count--;
          if (slot.count <= 0) {
            slot.item = null;
          }
          refresh();
          return;
        }
      }
    }
    game.addNotification('🔮 Nenhum tomo de magia no inventário!', 'info');
  };

  return (
    <Panel title="📖 Grimório Mágico" onClose={() => game.setActivePanel('none')}>
      <div className="text-white/70 text-xs mb-3">💧 Mana: {Math.ceil(state.player.mana)}/{state.player.maxMana}</div>

      {!hasSpells ? (
        <div className="text-center py-6">
          <div className="text-4xl mb-2">🔮</div>
          <div className="text-white/50 text-xs mb-3">Você ainda não conhece nenhuma magia.</div>
          <div className="text-white/30 text-[10px] mb-4">Encontre Tomos de Magia em baús e inimigos para aprender feitiços!</div>
          <button onClick={handleLearnFromInventory}
            className="px-4 py-2 rounded bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold transition-all">
            📖 Aprender do Inventário
          </button>
        </div>
      ) : (
        <>
          <div className="text-white/50 text-[10px] mb-2">Selecione uma magia (Pressione [R] para conjurar):</div>
          <div className="space-y-2">
            {unlockedSpells.map((spellId, idx) => {
              const spell = getSpell(spellId);
              if (!spell) return null;
              const isSelected = state.player.selectedSpell % unlockedSpells.length === idx;
              const canCast = state.player.mana >= spell.manaCost;
              const onCooldown = state.player.spellCooldown > 0;

              return (
                <div key={spell.id}
                  onClick={() => handleSelect(idx)}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-purple-500/60 bg-purple-900/30 scale-[1.02]'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  } ${!canCast ? 'opacity-50' : ''}`}
                >
                  <div className="relative">
                    <span className="text-2xl">{spell.icon}</span>
                    {isSelected && (
                      <div className="absolute -inset-1 rounded-full bg-purple-400/20 animate-ping" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-xs font-bold">{spell.name}</div>
                    <div className="text-white/40 text-[9px]">{spell.description}</div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-2 text-[9px]">
                      <span className="text-purple-400">💧 {spell.manaCost} Mana</span>
                      {spell.damage > 0 && <span className="text-red-400">⚔️ {spell.damage} Dano</span>}
                      {spell.healAmount && <span className="text-green-400">❤️ +{spell.healAmount} Cura</span>}
                      <span className="text-white/40">⏱️ {spell.cooldown.toFixed(1)}s</span>
                    </div>
                  </div>
                  <div>
                    {onCooldown ? (
                      <div className="text-[9px] text-yellow-400 animate-pulse">⏳ {state.player.spellCooldown.toFixed(1)}s</div>
                    ) : (
                      <div className={`text-[9px] ${canCast ? 'text-green-400' : 'text-red-400'}`}>
                        {canCast ? '✅ Pronto' : '💧 Sem Mana'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 text-white/30 text-[9px] text-center">
            Pressione [R] para conjurar a magia selecionada
          </div>
        </>
      )}
    </Panel>
  );
}
