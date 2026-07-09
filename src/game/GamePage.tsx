// ═══════════════════════════════════════════════════════════════════
// Farm Survival - Main Game Page
// ═══════════════════════════════════════════════════════════════════

import { useRef, useEffect, useState } from 'react';
import { Game } from './Game';
import { GameState, GameUIState, PanelType, ItemCategory, RARITY_COLORS, Rarity, InventorySlot, TILE_SIZE, WORLD_WIDTH, WORLD_HEIGHT } from './core/Types';
import { getItem } from './data/Items';
import { RECIPES } from './data/Recipes';
import { SKILLS, getSkillsByTree } from './data/Skills';
import { QUESTS } from './data/Quests';
import { NPCS } from './data/Npcs';
import { formatTime } from './core/Utils';
import { getAllSaveSlots, formatSaveDate, getMaxSaveSlots, type SaveSlotInfo } from './systems/SaveSystem';

export default function GamePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [uiState, setUiState] = useState<GameUIState | null>(null);
  const [selectedHotbar, setSelectedHotbar] = useState(0);

  useEffect(() => {
    if (!canvasRef.current) return;

    const game = new Game();
    let lastReactUpdate = 0;
    const REACT_THROTTLE_MS = 50; // ~20fps React updates vs 60fps canvas

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
      {/* Canvas is ALWAYS rendered so canvasRef is available for game init */}
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
          {/* HUD Overlay */}
          <HUD
            stats={stats!}
            gameTime={gameTime!}
            selectedTool={player!.currentTool}
            hotbar={player!.hotbar}
            notifications={notifications}
            player={player!}
          />

          {/* World Map (full overlay) */}
          {/* Minimap (top-right, below HUD) */}
          {gameState.settings.showMinimap && (
            <div className="absolute top-24 right-4 z-10 pointer-events-none">
              <Minmap game={game!} />
            </div>
          )}

          {uiState.showMap && (
            <WorldMap game={game!} />
          )}

          {/* Hotbar */}
          <Hotbar
            hotbar={player!.hotbar}
            selected={player!.currentTool}
            onSelect={(i) => { player!.currentTool = i; setSelectedHotbar(i); }}
            game={game!}
          />

          {/* Bottom Info Bar */}
          <BottomBar stats={stats!} />

          {/* Panels */}
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

          {/* Storage Chest Panel (opens when chest is nearby & inventory is open) */}
          {uiState.activePanel === 'inventory' && game.state.activeStorageChestId && (
            <StoragePanel game={game!} />
          )}

          {/* Farming/Building Quick Bar */}
          <FarmingBar game={game!} />

          {/* Controls Help */}
          <div className="absolute bottom-16 left-4 text-white/30 text-[10px] pointer-events-none">
            WASD=Mover | E=Coletar/Interagir | Q/Clique=Atacar | F=Usar | G=Soltar | I=Inventário | C=Craft | K=Habilidades | J=Missões | M=Mapa | P=Plantar | H=Salvar
          </div>
        </>
      )}
    </div>
  );
}

// ── HUD Component ─────────────────────────────────────────────────
function HUD({ stats, gameTime, selectedTool, hotbar, notifications, player }: {
  stats: GameState['player']['stats'];
  gameTime: GameState['gameTime'];
  selectedTool: number;
  hotbar: GameState['player']['hotbar'];
  notifications: GameState['notifications'];
  player?: GameState['player'];
}) {
  const weatherIcon = {
    clear: '☀️', rain: '🌧️', heavyRain: '⛈️', fog: '🌫️', snow: '❄️', storm: '⛈️'
  }[gameTime.weather] || '☀️';

  const seasonIcon = {
    spring: '🌸', summer: '☀️', autumn: '🍂', winter: '❄️'
  }[gameTime.season] || '🌍';

  return (
    <>
      {/* Top-left: Stats */}
      <div className="absolute top-4 left-4 space-y-1.5 pointer-events-none">
        <BarBar label="❤️ Vida" current={stats.hp} max={stats.maxHp} color="#e53935" />
        <BarBar label="🍖 Fome" current={stats.hunger} max={stats.maxHunger} color="#ff9800" />
        <BarBar label="⚡ Stamina" current={player?.stamina ?? 0} max={player?.maxStamina ?? 100} color="#2196f3" />
        <div className="flex gap-3 text-xs text-white/70 mt-1">
          <span>⚔️ {stats.strength}</span>
          <span>🛡️ {stats.defense}</span>
          <span>🍀 {stats.luck}</span>
          <span>🪙 {stats.gold}</span>
        </div>
        <div className="text-xs text-yellow-400">
          Lv.{stats.level}
        </div>
        <div className="w-52">
          <div className="flex justify-between text-[9px] text-white/40 mb-0.5">
            <span>XP</span>
            <span>{stats.xp}/{stats.xpToNext}</span>
          </div>
          <div className="h-1.5 bg-black/50 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(100, (stats.xp / stats.xpToNext) * 100)}%`,
                background: 'linear-gradient(90deg, #ffd700, #ffec80)'
              }}
            />
          </div>
        </div>
      </div>

      {/* Top-right: Time & Weather */}
      <div className="absolute top-4 right-4 text-right pointer-events-none">
        <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 space-y-1">
          <div className="text-white font-bold text-sm">
            {formatTime(gameTime.hour, gameTime.minute)}
          </div>
          <div className="text-white/70 text-xs">
            Dia {gameTime.day} {seasonIcon} {weatherIcon}
          </div>
          <div className="text-white/40 text-[9px]">
            {gameTime.weather === 'clear' ? 'Céu limpo' :
             gameTime.weather === 'rain' ? 'Chuva 🌧️' :
             gameTime.weather === 'heavyRain' ? 'Tempestade ⛈️' :
             gameTime.weather === 'fog' ? 'Nevoeiro 🌫️' :
             gameTime.weather === 'snow' ? 'Neve ❄️' :
             gameTime.weather === 'storm' ? 'Tempestade violenta 🌪️' : 'Desconhecido'}
          </div>
          <div className="text-white/50 text-xs capitalize">
            {gameTime.season}
          </div>
          {gameTime.isNight && (
            <div className="text-blue-300 text-xs">🌙 Noite</div>
          )}
        </div>
      </div>

      {/* Notifications */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 space-y-1 pointer-events-none">
        {notifications.slice(-5).map(n => (
          <div
            key={n.id}
            className={`px-4 py-1.5 rounded text-sm text-center animate-[fadeIn_0.3s] ${getNotificationClass(n.type)}`}
          >
            {n.message}
          </div>
        ))}
      </div>
    </>
  );
}

// ── Bar Component ─────────────────────────────────────────────────
function BarBar({ label, current, max, color }: {
  label: string; current: number; max: number; color: string;
}) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100));
  return (
    <div className="bg-black/60 backdrop-blur-sm rounded px-2 py-1 w-52">
      <div className="flex justify-between text-[10px] text-white/80 mb-0.5">
        <span>{label}</span>
        <span>{Math.ceil(current)}/{max}</span>
      </div>
      <div className="h-2 bg-black/50 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
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
    if (game) {
      game.swapSlots({ pool: 'hotbar', index: dragSource }, { pool: 'hotbar', index: i });
    }
    setDragSource(null);
  };
  const handleDragEnd = () => setDragSource(null);

  return (
    <>
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1 pointer-events-auto">
      {hotbar.map((slot, i) => (
        <div
          key={i}
          draggable={!!slot?.item}
          onDragStart={() => handleDragStart(i)}
          onDragOver={handleDragOver}
          onDrop={(e) => { e.preventDefault(); handleDrop(i); }}
          onDragEnd={handleDragEnd}
          onClick={() => onSelect(i)}
          onMouseEnter={(e) => {
            if (slot?.item) {
              setHoveredSlot(i);
              setTooltipPos({ x: e.clientX, y: e.clientY });
            }
          }}
          onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
          onMouseLeave={() => setHoveredSlot(null)}
          className={`w-12 h-12 rounded border-2 flex items-center justify-center relative cursor-pointer transition-all ${
            dragSource === i ? 'opacity-30 scale-90' : ''
          } ${
            i === selected
              ? 'border-yellow-400 bg-yellow-400/20 scale-110'
              : 'border-white/20 bg-black/60 hover:border-white/40'
          }`}
        >
          {slot?.item && (
            <>
              <span className="text-xl" style={{ color: RARITY_COLORS[slot.item.rarity] }}>
                {slot.item.icon}
              </span>
              {slot.count > 1 && (
                <span className="absolute bottom-0 right-0.5 text-[9px] text-white font-bold drop-shadow">
                  {slot.count}
                </span>
              )}
              {slot.durability !== undefined && slot.item.maxDurability && (
                <div className="absolute bottom-0 left-0.5 right-0.5 h-1 bg-black/50 rounded-full">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(slot.durability / slot.item.maxDurability) * 100}%`,
                      backgroundColor: slot.durability / slot.item.maxDurability > 0.5 ? '#4caf50' : '#ff9800',
                    }}
                  />
                </div>
              )}
            </>
          )}
          <span className="absolute top-0 left-1 text-[8px] text-white/40">{i + 1}</span>
        </div>
      ))}
    </div>

    {/* Hotbar Tooltip */}
    {hoveredSlot !== null && hotbar[hoveredSlot]?.item && (
      <ItemTooltip
        item={hotbar[hoveredSlot].item!}
        durability={hotbar[hoveredSlot].durability}
        position={tooltipPos}
        playerStats={{} as any}
        affixes={hotbar[hoveredSlot].affixes}
      />
    )}
    </>
  );
}

// ── Bottom Bar ────────────────────────────────────────────────────
function BottomBar({ stats }: { stats: GameState['player']['stats'] }) {
  return (
    <div className="absolute bottom-16 right-4 pointer-events-none">
      <div className="bg-black/50 backdrop-blur-sm rounded px-3 py-1 text-xs text-white/60 flex gap-3">
        <span>{/* disabled as minimap is here */}</span>
      </div>
    </div>
  );
}

// ── Minimap ──────────────────────────────────────────────────────
const MINIMAP_SIZE = 150;
const MINIMAP_RADIUS = 75;

const MINI_BIOME_COLORS: Record<string, string> = {
  forest: '#1a5a1a', plains: '#3a7a2a', mountains: '#5a5a5a',
  swamp: '#2a4a1a', desert: '#8a7a3a', tundra: '#6a8a8a',
  cave: '#1a1a1a', ruins: '#4a3a2a', village: '#5a8a3a',
  lake: '#2a6a9a', river: '#3a7aaa',
};

const BIOME_NAMES: Record<string, string> = {
  forest: 'Floresta', plains: 'Planície', mountains: 'Montanha',
  swamp: 'Pântano', desert: 'Deserto', tundra: 'Tundra',
  cave: 'Caverna', ruins: 'Ruínas', village: 'Vila',
  lake: 'Lago', river: 'Rio',
};

const LEGEND_ENTRIES = [
  { color: '#88ddff', label: 'Jogador' },
  { color: '#ff4444', label: 'Inimigo' },
  { color: '#44ff88', label: 'NPC' },
  { color: '#ffdd44', label: 'Vila' },
  { color: '#aa66ff', label: 'Caverna' },
];

const BIOME_LEGEND = [
  { color: '#1a5a1a', name: 'Floresta' },
  { color: '#3a7a2a', name: 'Planície' },
  { color: '#5a5a5a', name: 'Montanha' },
  { color: '#8a7a3a', name: 'Deserto' },
  { color: '#2a6a9a', name: 'Lago' },
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

    // Player tile position (center of minimap)
    const playerTx = Math.floor(player.x / TILE_SIZE);
    const playerTy = Math.floor(player.y / TILE_SIZE);

    // ── Background ──
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);

    // ── Border ──
    ctx.strokeStyle = 'rgba(180, 160, 100, 0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, MINIMAP_SIZE - 1, MINIMAP_SIZE - 1);

    // Center pixel offset
    const cx = MINIMAP_SIZE / 2;
    const cy = MINIMAP_SIZE / 2;

    // ── Draw terrain tiles ──
    const startTx = playerTx - MINIMAP_RADIUS;
    const startTy = playerTy - MINIMAP_RADIUS;

    // Use ImageData for faster pixel rendering
    const imageData = ctx.createImageData(MINIMAP_SIZE, MINIMAP_SIZE);
    const data = imageData.data;

    for (let px = 0; px < MINIMAP_SIZE; px++) {
      for (let py = 0; py < MINIMAP_SIZE; py++) {
        const worldTx = startTx + px;
        const worldTy = startTy + py;
        let r = 0, g = 0, b = 0, a = 255;

        if (worldTx >= 0 && worldTx < worldW && worldTy >= 0 && worldTy < worldH) {
          const biome = biomeMap[worldTy][worldTx];
          const color = MINI_BIOME_COLORS[biome] || '#2a2a2a';
          const hex = color.replace('#', '');
          r = parseInt(hex.substring(0, 2), 16);
          g = parseInt(hex.substring(2, 4), 16);
          b = parseInt(hex.substring(4, 6), 16);
        } else {
          r = 0; g = 0; b = 0;
        }

        const idx = (py * MINIMAP_SIZE + px) * 4;
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = a;
      }
    }

    ctx.putImageData(imageData, 0, 0);

    // ── Village marker ──
    const villageTx = Math.floor(WORLD_WIDTH / 2);
    const villageTy = Math.floor(WORLD_HEIGHT / 2);
    const vx = cx + (villageTx - playerTx);
    const vy = cy + (villageTy - playerTy);
    if (vx > 0 && vx < MINIMAP_SIZE && vy > 0 && vy < MINIMAP_SIZE) {
      ctx.fillStyle = '#ffdd44';
      ctx.beginPath();
      ctx.arc(vx, vy, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Enemies (red dots) ──
    for (const enemy of enemies) {
      const ex = cx + (Math.floor(enemy.x / TILE_SIZE) - playerTx);
      const ey = cy + (Math.floor(enemy.y / TILE_SIZE) - playerTy);
      if (ex > 0 && ex < MINIMAP_SIZE && ey > 0 && ey < MINIMAP_SIZE) {
        ctx.fillStyle = 'rgba(255, 50, 50, 0.7)';
        ctx.beginPath();
        ctx.arc(ex, ey, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ── NPCs (green dots) ──
    for (const npc of npcs) {
      const nx = cx + (Math.floor(npc.x / TILE_SIZE) - playerTx);
      const ny = cy + (Math.floor(npc.y / TILE_SIZE) - playerTy);
      if (nx > 0 && nx < MINIMAP_SIZE && ny > 0 && ny < MINIMAP_SIZE) {
        ctx.fillStyle = 'rgba(50, 255, 100, 0.7)';
        ctx.beginPath();
        ctx.arc(nx, ny, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ── Resources (wood, ore, etc. - colored dots) ──
    for (const res of resources) {
      const rx = cx + (Math.floor(res.x / TILE_SIZE) - playerTx);
      const ry = cy + (Math.floor(res.y / TILE_SIZE) - playerTy);
      if (rx > 0 && rx < MINIMAP_SIZE && ry > 0 && ry < MINIMAP_SIZE) {
        let color = '#8B4513';
        if (res.type === 'cave_entrance') color = 'rgba(150, 100, 255, 0.8)';
        else if (res.type === 'tree' || res.type === 'bush') color = 'rgba(50, 180, 50, 0.5)';
        else if (res.type.includes('rock') || res.type.includes('ore')) color = 'rgba(180, 160, 100, 0.6)';
        else if (res.type === 'crystal_node') color = 'rgba(100, 200, 255, 0.7)';
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(rx, ry, res.type === 'cave_entrance' ? 2 : 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ── Camera viewport rectangle ──
    const camLeftTx = Math.floor(camera.x / TILE_SIZE);
    const camTopTy = Math.floor(camera.y / TILE_SIZE);
    const camRightTx = Math.ceil((camera.x + camera.width / camera.zoom) / TILE_SIZE);
    const camBottomTy = Math.ceil((camera.y + camera.height / camera.zoom) / TILE_SIZE);

    const rectX = cx + (camLeftTx - playerTx);
    const rectY = cy + (camTopTy - playerTy);
    const rectW = camRightTx - camLeftTx;
    const rectH = camBottomTy - camTopTy;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(rectX, rectY, rectW, rectH);

    // ── Player dot (bright, with glow) ──
    ctx.shadowColor = 'rgba(100, 200, 255, 0.6)';
    ctx.shadowBlur = 6;
    ctx.fillStyle = '#88ddff';
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();
    // Inner white dot
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(cx, cy, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // ── Facing direction indicator ──
    ctx.strokeStyle = '#88ddff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + player.facing.x * 6, cy + player.facing.y * 6);
    ctx.stroke();
  }, [game, game.state.player.x, game.state.player.y, game.camera.x, game.camera.y]);

  // Get current biome for label
  const currentBiome = (() => {
    const tx = Math.floor(game.state.player.x / TILE_SIZE);
    const ty = Math.floor(game.state.player.y / TILE_SIZE);
    if (ty >= 0 && ty < game.biomeMap.length && tx >= 0 && tx < game.biomeMap[0].length) {
      return game.biomeMap[ty][tx];
    }
    return null;
  })();

  const biomeLabel = BIOME_NAMES[currentBiome || ''] || '';

  return (
    <div className="flex flex-col gap-1">
        <div className="bg-black/70 backdrop-blur-sm rounded-md px-2 py-1 text-center">
          <div className="text-[9px] text-white/60">{biomeLabel}</div>
          <div className="text-[8px] text-white/30">Lv.{game.state.player.stats.level}</div>
        </div>
      <div className="relative flex gap-2">
      {/* Map canvas */}
      <canvas
        ref={canvasRef}
        className="rounded-md shadow-lg shadow-black/60 cursor-pointer"
        style={{ width: MINIMAP_SIZE + 4, height: MINIMAP_SIZE + 4, imageRendering: 'pixelated' }}
        onClick={() => setShowLegend(!showLegend)}
      />

      {/* Legend panel - toggled by clicking map */}
      {showLegend && (
        <div className="bg-black/85 backdrop-blur-sm rounded-md border border-white/10 p-2 shadow-lg shadow-black/60 w-36">
          {/* Section: Markers */}
          <div className="text-[9px] font-bold text-white/70 border-b border-white/10 pb-1 mb-1.5">📍 Marcadores</div>
          <div className="space-y-1 mb-2">
            {LEGEND_ENTRIES.map((entry, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-[8px] text-white/60">{entry.label}</span>
              </div>
            ))}
          </div>

          {/* Section: Biomes */}
          <div className="text-[9px] font-bold text-white/70 border-b border-white/10 pb-1 mb-1.5">🌿 Biomas</div>
          <div className="space-y-1">
            {BIOME_LEGEND.map((bio, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2 rounded-sm" style={{ backgroundColor: bio.color }} />
                <span className="text-[8px] text-white/50">{bio.name}</span>
              </div>
            ))}
          </div>

          {/* Viewport hint */}
          <div className="mt-1.5 pt-1.5 border-t border-white/10">
            <div className="flex items-center gap-1">
              <div className="w-3 h-2 border border-white/40 rounded-sm" />
              <span className="text-[7px] text-white/30">Viewport</span>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}

// ── World Map (Full Overlay, inspired by fantasy RPG maps) ────────
function WorldMap({ game }: { game: Game }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeTab, setActiveTab] = useState<'legends' | 'monsters' | 'npcs'>('legends');
  const [hoveredBiome, setHoveredBiome] = useState<{ biome: string; x: number; y: number; tileX: number; tileY: number } | null>(null);
  const [animTick, setAnimTick] = useState(0);

  // 🎬 Fog dissipation animation system
  const fogAnimations = useRef<Record<string, number>>({}); // biome -> startTime
  const prevUnlocked = useRef<Set<string>>(new Set());
  const animFrameRef = useRef<number>(0);
  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; color: string }[]>([]);
  const FOG_DURATION = 1800; // 1.8s for full dissipation

  // ✨ Reveal particle colors (bright variants of biome colors)
  const particleColors: Record<string, string> = {
    forest: '#66ff66', plains: '#aaff44', mountains: '#aaaaff',
    swamp: '#88ff66', desert: '#ffdd44', tundra: '#aaddff',
    cave: '#aa66ff', ruins: '#ff8844', village: '#ffdd44',
    lake: '#66ffff', river: '#66aaff',
  };

  // Empty - spawnRevealParticles logic is inside the useEffect where coordinates are available

  const MAP_W = 550;
  const MAP_H = 450;

  const biomeLabels: Record<string, string> = {
    forest: 'Floresta Sombria',
    plains: 'Planícies Verdejantes',
    mountains: 'Montanhas Geladas',
    swamp: 'Pântano Nebuloso',
    desert: 'Deserto da Perdição',
    tundra: 'Tundra Glacial',
    cave: 'Cavernas Profundas',
    ruins: 'Ruínas Antigas',
    village: 'Vila de Pedra',
    lake: 'Lago Esquecido',
    river: 'Rio Cristalino',
  };

  const biomeColors: Record<string, string> = {
    forest: '#1a3a12', plains: '#2a5a1e', mountains: '#4a5a4a',
    swamp: '#2a4a1a', desert: '#8a7a4a', tundra: '#6a7a7a',
    cave: '#2a2a2a', ruins: '#5a4a3a', village: '#4a7a4a',
    lake: '#2a5a7a', river: '#3a6a8a',
  };

  const biomeGlowColors: Record<string, string> = {
    forest: '#2a5a1e', plains: '#4a8a3a', mountains: '#5a7a5a',
    swamp: '#3a5a2a', desert: '#b09a5a', tundra: '#8a9a8a',
    cave: '#3a3a3a', ruins: '#7a6a5a', village: '#6a9a5a',
    lake: '#3a7aaa', river: '#4a80aa',
  };

  // 🔒 Biome level requirements (areas unlock as player levels up)
  const biomeLevelRequirements: Record<string, number> = {
    plains: 1, forest: 1, village: 1, lake: 1, river: 1,
    swamp: 5, cave: 6, mountains: 10, ruins: 12, desert: 15, tundra: 20,
  };

  const biomeDesc: Record<string, string> = {
    forest: 'Floresta densa e sombria. Lobos e aranhas.',
    plains: 'Planícies abertas. Slimes e javalis.',
    mountains: 'Picos gelados. Golems de pedra.',
    swamp: 'Pântano venenoso. Aranhas e morcegos.',
    desert: 'Deserto escaldante. Criaturas da areia.',
    tundra: 'Tundra congelada. Bestas polares.',
    cave: 'Cavernas profundas. Minérios raros.',
    ruins: 'Ruínas antigas. Cavaleiros das trevas.',
    village: 'Vila segura. NPCs amigáveis.',
    lake: 'Lago sereno. Ótimo para pesca.',
    river: 'Rio cristalino. Água fresca.',
  };

  // Find biome region centers for label placement
  const biomeCenters: Record<string, { x: number; y: number; count: number }> = {};

  // Draw static map layer
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

    // ── Dark parchment background ──
    ctx.fillStyle = '#1a1410';
    ctx.fillRect(0, 0, MAP_W, MAP_H);

    // ── Parchment border ──
    ctx.strokeStyle = '#8a7a5a';
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, MAP_W - 4, MAP_H - 4);
    ctx.strokeStyle = '#6a5a3a';
    ctx.lineWidth = 1;
    ctx.strokeRect(5, 5, MAP_W - 10, MAP_H - 10);

    // ── Draw biome map ──
    // Reset biome centers
    Object.keys(biomeColors).forEach(k => { biomeCenters[k] = { x: 0, y: 0, count: 0 }; });

    ctx.save();
    ctx.translate(10, 10);

    for (let y = 0; y < worldH; y++) {
      for (let x = 0; x < worldW; x++) {
        const biome = biomeMap[y][x];
        const baseColor = biomeColors[biome] || '#2a2a2a';
        const glowColor = biomeGlowColors[biome] || '#3a3a3a';

        // Multi-layer rendering for richer look
        const px = x * scaleX;
        const py = y * scaleY;
        const sw = scaleX + 0.5;
        const sh = scaleY + 0.5;

        // Base color
        ctx.fillStyle = baseColor;
        ctx.fillRect(px, py, sw, sh);

        // Subtle texture noise overlay
        const noise = Math.sin(x * 3.7 + y * 5.1) * 0.04 + 0.04;
        ctx.fillStyle = `rgba(255,255,255,${noise})`;
        ctx.fillRect(px, py, sw, sh);

        // Edge highlights for biome transitions
        if (x > 0 && biomeMap[y][x - 1] !== biome) {
          ctx.fillStyle = 'rgba(255,255,200,0.03)';
          ctx.fillRect(px, py, 1, sh);
        }
        if (y > 0 && biomeMap[y - 1][x] !== biome) {
          ctx.fillStyle = 'rgba(255,255,200,0.03)';
          ctx.fillRect(px, py, sw, 1);
        }

        // 🔒 Level-based fog of war — lock areas above player's level
        const reqLevel = biomeLevelRequirements[biome] || 1;
        const playerLevel = state.player.stats.level;
        if (playerLevel < reqLevel) {
          // Check if this area is animating (just unlocked)
          const animStart = fogAnimations.current[biome];
          let fogAlpha = 0.55;
          if (animStart !== undefined) {
            const elapsed = performance.now() - animStart;
            const progress = Math.min(1, elapsed / FOG_DURATION);
            // Smooth ease-out: fog fades quickly at first, then slows
            const eased = 1 - Math.pow(1 - progress, 3);
            fogAlpha = 0.55 * (1 - eased);
          }
          // Dark fog overlay
          ctx.fillStyle = `rgba(0,0,0,${fogAlpha})`;
          ctx.fillRect(px, py, sw, sh);
          // Subtle lock noise texture (only visible when fog is still there)
          if (fogAlpha > 0.05) {
            const lockNoise = Math.sin(x * 17.3 + y * 13.7) * 0.08 + 0.08;
            ctx.fillStyle = `rgba(40,20,10,${lockNoise * (fogAlpha / 0.55)})`;
            ctx.fillRect(px, py, sw, sh);
          }
          // Draw level requirement number (fades with fog)
          if (x % 4 === 0 && y % 4 === 0 && fogAlpha > 0.05) {
            ctx.font = `${Math.max(4, Math.min(7, scaleX * 0.3))}px monospace`;
            ctx.fillStyle = `rgba(255,100,50,${0.25 * (fogAlpha / 0.55)})`;
            ctx.textAlign = 'center';
            ctx.fillText(`Nv.${reqLevel}`, px + sw / 2, py + sh / 2 + 2);
            ctx.textAlign = 'left';
          }
        }

        // Track center
        if (biomeCenters[biome]) {
          biomeCenters[biome].x += x;
          biomeCenters[biome].y += y;
          biomeCenters[biome].count++;
        }
      }
    }

    // ✨ Draw reveal particles (sparkles when fog dissipates)
    const activeParticles = particlesRef.current;
    for (let i = activeParticles.length - 1; i >= 0; i--) {
      const p = activeParticles[i];
      p.x += p.vx * 0.02;
      p.y += p.vy * 0.02;
      p.vy += 1.5 * 0.02; // gentle gravity
      p.life -= 0.016 / p.maxLife; // ~1.7s lifespan
      if (p.life <= 0) { activeParticles.splice(i, 1); continue; }
      const alpha = p.life < 0.3 ? p.life / 0.3 : Math.min(1, p.life * 2);
      // Glow halo
      ctx.shadowColor = p.color;
      ctx.shadowBlur = p.size * 3;
      ctx.fillStyle = `rgba(255,255,255,${alpha * 0.6})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 0.4, 0, Math.PI * 2);
      ctx.fill();
      // Colored sparkle
      ctx.shadowBlur = p.size * 2;
      ctx.fillStyle = `rgba(${parseInt(p.color.slice(1,3),16)},${parseInt(p.color.slice(3,5),16)},${parseInt(p.color.slice(5,7),16)},${alpha})`;
      ctx.beginPath();
      // Star shape (diamond cross)
      ctx.arc(p.x, p.y, p.size * (0.3 + 0.7 * p.life), 0, Math.PI * 2);
      ctx.fill();
      // Bright center dot
      ctx.shadowBlur = 0;
      ctx.fillStyle = `rgba(255,255,255,${alpha * 0.8})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 0.15, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // ── Rivers (thin winding lines over water tiles) ──
    ctx.strokeStyle = 'rgba(60, 120, 180, 0.4)';
    ctx.lineWidth = 1.5;
    for (let y = 5; y < worldH - 5; y++) {
      for (let x = 5; x < worldW - 5; x++) {
        if (biomeMap[y][x] === 'river' || biomeMap[y][x] === 'lake') {
          // Draw small segments connecting water tiles
          ctx.beginPath();
          ctx.arc(x * scaleX + scaleX / 2, y * scaleY + scaleY / 2, scaleX * 0.4, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }

    // ── Village marker ──
    const cx = Math.floor(worldW / 2);
    const cy = Math.floor(worldH / 2);
    const vx = cx * scaleX;
    const vy = cy * scaleY;
    // Village icon
    ctx.fillStyle = '#ffdd44';
    ctx.shadowColor = 'rgba(255,220,80,0.3)';
    ctx.shadowBlur = 8;
    ctx.font = '18px serif';
    ctx.textAlign = 'center';
    ctx.fillText('🏘️', vx, vy + 6);
    ctx.shadowBlur = 0;
    ctx.font = '9px monospace';
    ctx.fillStyle = '#ffe066';
    ctx.fillText('Vila', vx, vy + 20);

    // ── Cave entrance markers ──
    ctx.textAlign = 'center';
    for (const res of resources) {
      if (res.type === 'cave_entrance') {
        const rx = (res.x / TILE_SIZE / worldW) * (MAP_W - 20);
        const ry = (res.y / TILE_SIZE / worldH) * (MAP_H - 20);
        ctx.fillStyle = '#ff6644';
        ctx.shadowColor = 'rgba(255,100,50,0.3)';
        ctx.shadowBlur = 6;
        ctx.font = '12px serif';
        ctx.fillText('🕳️', rx, ry + 4);
        ctx.shadowBlur = 0;
        ctx.font = '7px monospace';
        ctx.fillStyle = '#ff8844';
        ctx.fillText('Caverna', rx, ry + 14);
      }
    }

    // ── NPC markers ──
    for (const npc of npcs) {
      const nx = ((npc.x / TILE_SIZE) / worldW) * (MAP_W - 20);
      const ny = ((npc.y / TILE_SIZE) / worldH) * (MAP_H - 20);
      ctx.font = '10px serif';
      ctx.fillStyle = '#88ffaa';
      ctx.fillText(npc.definition.icon, nx, ny + 4);
    }

    // ── Boss markers from enemy data ──
    const bossTypes = ['SlimeKing', 'ShadowLord', 'Dragon', 'DarkKnight'];
    for (const enemy of game.enemies) {
      if (bossTypes.includes(enemy.type)) {
        const ex = ((enemy.x / TILE_SIZE) / worldW) * (MAP_W - 20);
        const ey = ((enemy.y / TILE_SIZE) / worldH) * (MAP_H - 20);
        ctx.fillStyle = '#ff2244';
        ctx.shadowColor = 'rgba(255,0,0,0.4)';
        ctx.shadowBlur = 10;
        ctx.font = '14px serif';
        ctx.fillText('💀', ex, ey + 5);
        ctx.shadowBlur = 0;
        ctx.font = '7px monospace';
        ctx.fillStyle = '#ff4444';
        ctx.fillText('BOSS', ex, ey + 15);
      }
    }

    // ── Player position ──
    const px = (state.player.x / TILE_SIZE / worldW) * (MAP_W - 20);
    const py = (state.player.y / TILE_SIZE / worldH) * (MAP_H - 20);
    ctx.shadowColor = 'rgba(255,255,100,0.5)';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#ffee44';
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(px, py, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.restore();

    // ── Compass Rose (top-right) ──
    const crx = MAP_W - 40;
    const cry = 30;
    ctx.save();
    ctx.translate(crx, cry);
    ctx.fillStyle = '#c4b07a';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // N
    ctx.fillStyle = '#d4c08a';
    ctx.font = 'bold 11px serif';
    ctx.fillText('N', 0, -10);
    ctx.font = '8px serif';
    ctx.fillStyle = '#8a7a5a';
    ctx.fillText('S', 0, 10);
    ctx.fillText('O', -10, 0);
    ctx.fillText('L', 10, 0);
    // Cross lines
    ctx.strokeStyle = '#8a7a5a';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, -8); ctx.lineTo(0, 8);
    ctx.moveTo(-8, 0); ctx.lineTo(8, 0);
    ctx.stroke();
    // Arrow head
    ctx.fillStyle = '#d4c08a';
    ctx.beginPath();
    ctx.moveTo(0, -10); ctx.lineTo(-3, -6); ctx.lineTo(3, -6); ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.textBaseline = 'alphabetic';

    // ── Title ──
    ctx.textAlign = 'center';
    ctx.fillStyle = '#d4c08a';
    ctx.font = 'bold 18px serif';
    ctx.fillText('TERRAS SOMBRIAS', MAP_W / 2, 22);
    ctx.fillStyle = '#8a7a5a';
    ctx.font = '9px monospace';
    ctx.fillText('UM MUNDO DE AVENTURAS E PERIGOS', MAP_W / 2, 34);

    // ── Bottom banner ──
    ctx.fillStyle = '#2a1a0a';
    ctx.fillRect(0, MAP_H - 18, MAP_W, 18);
    ctx.strokeStyle = '#5a4a2a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, MAP_H - 18); ctx.lineTo(MAP_W, MAP_H - 18);
    ctx.stroke();
    ctx.fillStyle = '#a08860';
    ctx.font = 'bold 10px serif';
    ctx.textAlign = 'center';
    ctx.fillText('✧  EXPLORE  ·  SOBREVIVA  ·  EVOLUA  ✧', MAP_W / 2, MAP_H - 5);

    // 🎬 Detect newly unlocked biomes and start fog dissipation animation
    const currentUnlockedSet = new Set(
      Object.entries(biomeLevelRequirements)
        .filter(([_, req]) => state.player.stats.level >= req)
        .map(([biome]) => biome)
    );

    for (const biome of currentUnlockedSet) {
      if (!prevUnlocked.current.has(biome) && !(biome in fogAnimations.current)) {
        fogAnimations.current[biome] = performance.now();
        // ✨ Spawn reveal particles for this biome
        const center = biomeCenters[biome];
        if (center && center.count > 0) {
          const avgX = (center.x / center.count) * scaleX;
          const avgY = (center.y / center.count) * scaleY;
          const radius = Math.sqrt(center.count) * scaleX * 1.2;
          const color = particleColors[biome] || '#ffee88';
          const count = Math.min(40, Math.max(20, Math.floor(center.count * 0.03)));
          for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * radius;
            particlesRef.current.push({
              x: avgX + Math.cos(angle) * dist,
              y: avgY + Math.sin(angle) * dist,
              vx: (Math.random() - 0.5) * 12,
              vy: -Math.random() * 15 - 3,
              life: 1,
              maxLife: 1 + Math.random() * 0.2,
              size: 1.5 + Math.random() * 2.5,
              color,
            });
          }
        }
      }
    }
    prevUnlocked.current = currentUnlockedSet;

    // Clean up completed animations and start rAF loop if needed
    const now = performance.now();
    let hasActive = false;
    for (const [biome, startTime] of Object.entries(fogAnimations.current)) {
      if (now - startTime >= FOG_DURATION) {
        delete fogAnimations.current[biome];
      } else {
        hasActive = true;
      }
    }

    // Start/continue animation loop
    if (hasActive) {
      if (!animFrameRef.current) {
        const animate = () => {
          setAnimTick(t => t + 1);
          animFrameRef.current = requestAnimationFrame(animate);
        };
        animFrameRef.current = requestAnimationFrame(animate);
      }
    } else if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = 0;
      }
    };

  }, [game, game.state.player.x, game.state.player.y, animTick]);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 pointer-events-auto">
      <div className="relative flex gap-4">
        {/* Map Canvas */}
        <div className="rounded-lg overflow-hidden border-2 border-amber-800/60 shadow-2xl shadow-black/80">
          <canvas
            ref={canvasRef}
            className="block cursor-crosshair"
            onMouseMove={(e) => {
              const canvas = canvasRef.current;
              if (!canvas) return;
              const rect = canvas.getBoundingClientRect();
              const mouseX = e.clientX - rect.left;
              const mouseY = e.clientY - rect.top;

              const { biomeMap } = game;
              const worldW = biomeMap[0]?.length || 1;
              const worldH = biomeMap.length || 1;

              // Reverse canvas transform (translate 10,10 then scale)
              const relX = mouseX - 10;
              const relY = mouseY - 10;
              const tileX = Math.floor(relX / ((MAP_W - 20) / worldW));
              const tileY = Math.floor(relY / ((MAP_H - 20) / worldH));

              if (tileX >= 0 && tileX < worldW && tileY >= 0 && tileY < worldH) {
                const biome = biomeMap[tileY][tileX];
                setHoveredBiome({ biome, x: e.clientX, y: e.clientY, tileX, tileY });
              } else {
                setHoveredBiome(null);
              }
            }}
            onMouseLeave={() => setHoveredBiome(null)}
          />
        </div>

        {/* Legend Panel */}
        <div className="w-56 bg-[#1a1410] border-2 border-amber-800/60 rounded-lg p-3 text-white/80 shadow-2xl shadow-black/80">
          {/* Tabs */}
          <div className="flex gap-0.5 mb-3 border-b border-amber-900/40 pb-2">
            <button
              onClick={() => setActiveTab('legends')}
              className={`text-[9px] px-2 py-1 rounded-t ${activeTab === 'legends' ? 'bg-amber-900/40 text-amber-300' : 'text-white/40 hover:text-white/60'}`}
            >
              📜 Lendas
            </button>
            <button
              onClick={() => setActiveTab('monsters')}
              className={`text-[9px] px-2 py-1 rounded-t ${activeTab === 'monsters' ? 'bg-amber-900/40 text-amber-300' : 'text-white/40 hover:text-white/60'}`}
            >
              👹 Monstros
            </button>
            <button
              onClick={() => setActiveTab('npcs')}
              className={`text-[9px] px-2 py-1 rounded-t ${activeTab === 'npcs' ? 'bg-amber-900/40 text-amber-300' : 'text-white/40 hover:text-white/60'}`}
            >
              🧙 NPCs
            </button>
          </div>

          {activeTab === 'legends' && (
            <div className="space-y-2">
              <div className="text-[10px] font-bold text-amber-400/80 border-b border-amber-900/30 pb-1">📍 Legenda do Mapa</div>
              <div className="space-y-1.5">
                {[
                  { icon: '🏘️', label: 'Vila de Pedra', desc: 'Centro de comércio' },
                  { icon: '🕳️', label: 'Caverna', desc: 'Nv.6+ | Mitril & Rubi' },
                  { icon: '💀', label: 'BOSS', desc: 'Inimigos lendários' },
                  { icon: '🟡', label: 'Jogador', desc: 'Sua posição' },
                  { icon: '⚒️', label: 'Ferreiro', desc: 'Upgrade de itens' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-sm">{item.icon}</span>
                    <div className="flex-1">
                      <div className="text-[10px] text-white/80">{item.label}</div>
                      <div className="text-[8px] text-white/30">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-2 border-t border-amber-900/30">
                <div className="text-[10px] font-bold text-green-400/70 mb-1">🌿 Biomas</div>
                <div className="grid grid-cols-1 gap-0.5">
                  {Object.entries(biomeLabels).slice(0, 6).map(([key, label]) => (
                    <div key={key} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: biomeColors[key] }} />
                      <span className="text-[8px] text-white/50">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'monsters' && (
            <div className="space-y-2">
              <div className="text-[10px] font-bold text-red-400/80 border-b border-amber-900/30 pb-1">👹 Monstros</div>
              <div className="space-y-1.5">
                {[
                  { icon: '🐺', label: 'Lobo', desc: 'Floresta' },
                  { icon: '🐗', label: 'Javali', desc: 'Planícies' },
                  { icon: '🟢', label: 'Slime', desc: 'Planícies' },
                  { icon: '🕷️', label: 'Aranha', desc: 'Floresta/Pântano' },
                  { icon: '💀', label: 'Esqueleto', desc: 'Cavernas/Ruínas' },
                  { icon: '🗿', label: 'Golem', desc: 'Montanhas' },
                  { icon: '🧌', label: 'Troll', desc: 'Cavernas' },
                  { icon: '🦇', label: 'Morcego Gigante', desc: 'Cavernas' },
                  { icon: '🐉', label: 'Dragão', desc: '🔥 Lendário' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span className="text-xs">{item.icon}</span>
                    <div className="flex-1">
                      <span className="text-[9px] text-white/70">{item.label}</span>
                      <span className="text-[7px] text-white/30 ml-1">— {item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'npcs' && (
            <div className="space-y-2">
              <div className="text-[10px] font-bold text-blue-400/80 border-b border-amber-900/30 pb-1">🧙 NPCs da Vila</div>
              <div className="space-y-1.5">
                {[
                  { icon: '🧔', label: 'Mercador', desc: 'Compra e vende' },
                  { icon: '⚒️', label: 'Ferreiro', desc: 'Forja & Upgrade' },
                  { icon: '👨‍🌾', label: 'Fazendeiro', desc: 'Sementes' },
                  { icon: '🧙', label: 'Alquimista', desc: 'Poções' },
                  { icon: '🏹', label: 'Caçador', desc: 'Armas' },
                  { icon: '👴', label: 'Ancião', desc: 'Missões' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span className="text-xs">{item.icon}</span>
                    <div className="flex-1">
                      <span className="text-[9px] text-white/70">{item.label}</span>
                      <span className="text-[7px] text-white/30 ml-1">— {item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-2 border-t border-amber-900/30">
                <div className="text-[9px] font-bold text-amber-400/60 mb-1">💡 Dicas de Sobrevivência</div>
                <div className="text-[8px] text-white/40 space-y-1">
                  <p>• Colete madeira e pedra para ferramentas básicas</p>
                  <p>• Nv.6 para entrar na caverna</p>
                  <p>• Mitril e Rubi para upgrades na forja</p>
                  <p>• Tochas iluminam cavernas escuras</p>
                  <p>• Coma regularmente para não morrer de fome</p>
                </div>
              </div>
            </div>
          )}

          {/* Close button */}
          <button
            onClick={() => game.closeMap()}
            className="w-full mt-3 py-1.5 rounded text-[10px] font-bold bg-amber-900/40 hover:bg-amber-800/50 text-amber-300/80 border border-amber-800/40"
          >
            ✕ Fechar Mapa [M]
          </button>
        </div>
      </div>

      {/* 🔍 Biome Preview Tooltip */}
      {hoveredBiome && (() => {
        const biome = hoveredBiome.biome;
        const reqLevel = biomeLevelRequirements[biome] || 1;
        const playerLevel = game.state.player.stats.level;
        const unlocked = playerLevel >= reqLevel;
        return (
          <div
            className="fixed z-[60] pointer-events-none"
            style={{ left: Math.min(hoveredBiome.x + 16, window.innerWidth - 200), top: Math.min(hoveredBiome.y - 8, window.innerHeight - 120) }}
          >
            <div className="bg-[#1a1410]/95 backdrop-blur-sm border border-amber-800/60 rounded-lg p-2.5 shadow-2xl shadow-black/60 w-44">
              {/* Header with biome color */}
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: biomeColors[biome] || '#2a2a2a' }} />
                <span className="text-[10px] font-bold text-amber-300">{biomeLabels[biome] || biome}</span>
              </div>
              {/* Description */}
              <div className="text-[8px] text-white/50 leading-tight mb-1.5">
                {biomeDesc[biome] || ''}
              </div>
              {/* Level requirement */}
              <div className={`text-[9px] font-bold flex items-center gap-1 ${unlocked ? 'text-green-400' : 'text-red-400'}`}>
                {unlocked ? '✅' : '🔒'} {unlocked ? 'Desbloqueado' : `Requer Nível ${reqLevel}`}
              </div>
              {/* Player level indicator */}
              <div className="text-[7px] text-white/30 mt-0.5">
                Seu nível: {playerLevel}
              </div>
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

  const handleDragStart = (pool: 'inventory' | 'hotbar' | 'equipment', index: string | number) => {
    setDragSource({ pool, index });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (pool: 'inventory' | 'hotbar' | 'equipment', index: string | number) => {
    if (!dragSource) return;
    if (dragSource.pool === pool && dragSource.index === index) return;
    game.swapSlots(dragSource, { pool, index });
    setDragSource(null);
    refresh();
  };

  const handleDragEnd = () => setDragSource(null);

  const equipLabels: Record<string, string> = {
    helmet: '🪖 Capacete', chest: '🦺 Peitoral', boots: '👢 Botas', gloves: '🧤 Luvas',
    weapon: '⚔️ Arma', tool: '🔧 Ferramenta', ring: '💍 Anel', amulet: '📿 Amuleto',
  };

  return (
    <Panel title="🎒 Inventário" onClose={() => game.setActivePanel('none')}>
      {/* Equipment */}
      <div className="mb-3">
        <div className="text-white/60 text-xs mb-1">Equipamento</div>
        <div className="grid grid-cols-4 gap-1">
          {(['helmet', 'chest', 'boots', 'gloves', 'weapon', 'tool', 'ring', 'amulet'] as const).map(equipSlot => {
            const equipped = state.player.equipment[equipSlot];
            const isDropTarget = dragSource && dragSource.pool !== 'equipment';
            const isDragging = dragSource?.pool === 'equipment' && dragSource.index === equipSlot;

            return (
              <div
                key={equipSlot}
                draggable={!!equipped?.item}
                onDragStart={() => handleDragStart('equipment', equipSlot)}
                onDragOver={handleDragOver}
                onDrop={(e) => { e.stopPropagation(); handleDrop('equipment', equipSlot); }}
                onDragEnd={handleDragEnd}
                onMouseEnter={(e) => {
                  if (equipped?.item) {
                    setHoveredSlot({ pool: 'equipment', index: equipSlot });
                    setTooltipPos({ x: e.clientX, y: e.clientY });
                  }
                }}
                onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
                onMouseLeave={() => setHoveredSlot(null)}
                className={`w-12 h-12 rounded border flex items-center justify-center relative cursor-pointer transition-all ${
                  isDragging ? 'opacity-30 scale-90' : ''
                } ${
                  isDropTarget ? 'border-blue-400/60 bg-blue-900/20' : 'border-white/20 bg-black/40'
                } hover:border-white/40`}
                title={equipSlot}
              >
                {equipped?.item ? (
                  <>
                    <span className="text-lg" style={{ color: RARITY_COLORS[equipped.item.rarity] }}>
                      {equipped.item.icon}
                    </span>
                    <span className="absolute -top-1 -right-1 text-[7px] bg-white/20 rounded px-0.5">
                      {equipLabels[equipSlot]?.split(' ')[0] || equipSlot.slice(0, 3)}
                    </span>
                  </>
                ) : (
                  <span className="text-white/20 text-[9px] uppercase">{equipLabels[equipSlot]?.split(' ')[1] || equipSlot}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Hotbar (in inventory panel) */}
      <div className="text-white/60 text-xs mb-1">Hotbar</div>
      <div className="flex gap-1 mb-3">
        {state.player.hotbar.map((slot, i) => {
          const isDropTarget = dragSource && dragSource.pool !== 'hotbar';
          const isDragging = dragSource?.pool === 'hotbar' && dragSource.index === i;
          const isSelected = state.player.currentTool === i;

          return (
            <div
              key={i}
              draggable={!!slot?.item}
              onDragStart={() => handleDragStart('hotbar', i)}
              onDragOver={handleDragOver}
              onDrop={(e) => { e.stopPropagation(); handleDrop('hotbar', i); }}
              onDragEnd={handleDragEnd}
              onClick={() => { state.player.currentTool = i; refresh(); }}
              onMouseEnter={(e) => {
                if (slot?.item) {
                  setHoveredSlot({ pool: 'hotbar', index: i });
                  setTooltipPos({ x: e.clientX, y: e.clientY });
                }
              }}
              onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
              onMouseLeave={() => setHoveredSlot(null)}
              className={`w-10 h-10 rounded border-2 flex items-center justify-center relative cursor-pointer transition-all ${
                isDragging ? 'opacity-30 scale-90' : ''
              } ${
                isSelected ? 'border-yellow-400 bg-yellow-400/15' : ''
              } ${
                isDropTarget ? 'border-blue-400/60 bg-blue-900/20' : 'border-white/15 bg-black/40'
              } hover:border-white/40`}
            >
              {slot?.item && (
                <>
                  <span className="text-sm" style={{ color: RARITY_COLORS[slot.item.rarity] }}>
                    {slot.item.icon}
                  </span>
                  {slot.count > 1 && (
                    <span className="absolute bottom-0 right-0.5 text-[8px] text-white font-bold">{slot.count}</span>
                  )}
                  {slot.durability !== undefined && slot.item.maxDurability && (
                    <div className="absolute bottom-0 left-0.5 right-0.5 h-1 bg-black/50 rounded-full">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(slot.durability / slot.item.maxDurability) * 100}%`,
                          backgroundColor: slot.durability / slot.item.maxDurability > 0.5 ? '#4caf50' : '#ff9800',
                        }}
                      />
                    </div>
                  )}
                </>
              )}
              <span className="absolute top-0 left-0.5 text-[7px] text-white/40">{i + 1}</span>
            </div>
          );
        })}
      </div>

      {/* Backpack */}
      <div className="text-white/60 text-xs mb-1">Mochila</div>
      <div className="grid grid-cols-9 gap-1 mb-3">
        {state.player.inventory.map((slot, i) => {
          const isDropTarget = dragSource && dragSource.pool !== 'inventory';
          const isDragging = dragSource?.pool === 'inventory' && dragSource.index === i;

          return (
            <div
              key={i}
              draggable={!!slot?.item}
              onDragStart={() => handleDragStart('inventory', i)}
              onDragOver={handleDragOver}
              onDrop={(e) => { e.stopPropagation(); handleDrop('inventory', i); }}
              onDragEnd={handleDragEnd}
              onDoubleClick={() => {
                if (!slot?.item) return;                  const validSlot = game.getValidEquipSlot(slot.item);
                if (validSlot) {
                  game.equipFromInventory(i, validSlot);
                  refresh();
                } else {
                  game.moveToHotbar(i, state.player.currentTool);
                  refresh();
                }
              }}
              onMouseEnter={(e) => {
                if (slot?.item) {
                  setHoveredSlot({ pool: 'inventory', index: i });
                  setTooltipPos({ x: e.clientX, y: e.clientY });
                }
              }}
              onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
              onMouseLeave={() => setHoveredSlot(null)}
              className={`w-10 h-10 rounded border flex items-center justify-center cursor-pointer transition-all ${
                isDragging ? 'opacity-30 scale-90' : ''
              } ${
                isDropTarget ? 'border-blue-400/60 bg-blue-900/20' : 'border-white/15 bg-black/40'
              } hover:border-white/30 hover:bg-white/10`}
            >
              {slot?.item && (
                <>
                  <span className="text-sm" style={{ color: RARITY_COLORS[slot.item.rarity] }}>
                    {slot.item.icon}
                  </span>
                  {slot.count > 1 && (
                    <span className="absolute bottom-0 right-0.5 text-[8px] text-white font-bold">{slot.count}</span>
                  )}
                  {slot.durability !== undefined && slot.item.maxDurability && (
                    <div className="absolute bottom-0 left-0.5 right-0.5 h-1 bg-black/50 rounded-full">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(slot.durability / slot.item.maxDurability) * 100}%`,
                          backgroundColor: slot.durability / slot.item.maxDurability > 0.5 ? '#4caf50' : '#ff9800',
                        }}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Tooltip */}
      {hoveredSlot && (() => {
        const slotData = (() => {
          if (hoveredSlot.pool === 'inventory') return state.player.inventory[hoveredSlot.index as number];
          if (hoveredSlot.pool === 'hotbar') return state.player.hotbar[hoveredSlot.index as number];
          if (hoveredSlot.pool === 'equipment') return state.player.equipment[hoveredSlot.index as keyof typeof state.player.equipment];
          return null;
        })();
        if (!slotData?.item) return null;
        return (
          <ItemTooltip
            item={slotData.item}
            durability={slotData.durability}
            position={tooltipPos}
            compareWith={hoveredSlot.pool === 'inventory' || hoveredSlot.pool === 'hotbar'
              ? (() => {
                  const eqKey = slotData.item.armorSlot || (slotData.item.toolType === 'sword' || slotData.item.toolType === 'bow' ? 'weapon' : slotData.item.toolType ? 'tool' : null);
                  return eqKey ? state.player.equipment[eqKey as keyof typeof state.player.equipment] : null;
                })()
              : null}
            playerStats={state.player.stats}
          />
        );
      })()}

      {/* Gold */}
      <div className="text-yellow-400 text-sm">🪙 {state.player.stats.gold} ouro</div>
      <div className="text-white/30 text-[9px] mt-1">Clique duplo = equipar | Arrastar = reorganizar</div>
    </Panel>
  );
}

// ── Crafting Panel ────────────────────────────────────────────────
function CraftingPanel({ game, uiState }: { game: Game; uiState: GameUIState }) {
  const [, forceUpdate] = useState(0);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const refresh = () => forceUpdate(n => n + 1);
  const state = game.state;

  const categories = [
    { cat: ItemCategory.Tool, icon: '🔧', label: 'Ferramentas' },
    { cat: ItemCategory.Weapon, icon: '⚔️', label: 'Armas' },
    { cat: ItemCategory.Armor, icon: '🛡️', label: 'Armaduras' },
    { cat: ItemCategory.Consumable, icon: '🧪', label: 'Consumíveis' },
    { cat: ItemCategory.Material, icon: '📦', label: 'Materiais' },
    { cat: ItemCategory.Furniture, icon: '🏗️', label: 'Construção' },
    { cat: ItemCategory.Ring, icon: '💍', label: 'Joias' },
  ];

  const selectedCat = uiState.craftingCategory;
  const recipes = RECIPES.filter(r => r.category === selectedCat);

  return (
    <Panel title="🔨 Crafting" onClose={() => game.setActivePanel('none')}>
      {/* Category tabs */}
      <div className="flex gap-1 mb-3 flex-wrap">
        {categories.map(c => (
          <button
            key={c.cat}
            onClick={() => { game.setCraftingCategory(c.cat); refresh(); }}
            className={`px-2 py-1 rounded text-xs ${
              selectedCat === c.cat ? 'bg-amber-600 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'
            }`}
          >
            {c.icon} {c.label}
          </button>
        ))}
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

          return (
            <div
              key={recipe.id}
              className={`flex items-center gap-2 p-2 rounded border ${
                canCraft ? 'border-green-500/50 bg-green-900/20 hover:bg-green-800/30' : 'border-white/10 bg-white/5'
              }`}
              onMouseEnter={(e) => {
                if (resultItem) {
                  setHoveredItem(recipe.result);
                  setTooltipPos({ x: e.clientX, y: e.clientY });
                }
              }}
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
                    return (
                      <span key={ing.itemId} className={`mr-2 ${have >= ing.count ? 'text-green-400' : 'text-red-400'}`}>
                        {item?.icon} {have}/{ing.count}
                      </span>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-x-2 text-[9px] mt-0.5">
                  {recipe.requiredLevel > 1 && (
                    <span className="text-yellow-400/60">Nv.{recipe.requiredLevel}</span>
                  )}
                  {resultItem?.damage && (
                    <span className="text-red-400/60">⚔️ {resultItem.damage}</span>
                  )}
                  {resultItem?.defense && (
                    <span className="text-blue-400/60">🛡️ {resultItem.defense}</span>
                  )}
                  {resultItem?.healAmount && (
                    <span className="text-green-400/60">❤️ +{resultItem.healAmount}</span>
                  )}
                  {resultItem?.foodValue && (
                    <span className="text-orange-400/60">🍖 +{resultItem.foodValue}</span>
                  )}
                  {resultItem?.maxDurability && (
                    <span className="text-white/40">🔧 {resultItem.maxDurability}</span>
                  )}
                </div>
                {recipe.station && (
                  <div className="text-cyan-400/60 text-[9px]">
                    🏗️ Requer {(recipe.station === 'furnace' ? 'Fornalha' : recipe.station === 'workbench' ? 'Bancada de Trabalho' : recipe.station)}
                  </div>
                )}
              </div>
              <button
                disabled={!canCraft}
                onClick={() => { game.craftRecipe(recipe.id); refresh(); }}
                className={`px-2 py-1 rounded text-xs font-bold ${
                  canCraft ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-white/10 text-white/30 cursor-not-allowed'
                }`}
              >
                Craftar
              </button>
            </div>
          );
        })}
      </div>

      {/* Crafting Tooltip */}
      {hoveredItem && (() => {
        const item = getItem(hoveredItem);
        if (!item) return null;
        return (
          <ItemTooltip
            item={item}
            position={tooltipPos}
            playerStats={state.player.stats}
          />
        );
      })()}
    </Panel>
  );
}

// ── Skills Panel ──────────────────────────────────────────────────
function SkillsPanel({ game }: { game: Game }) {
  const [, forceUpdate] = useState(0);
  const refresh = () => forceUpdate(n => n + 1);
  const state = game.state;

  const trees = [
    { name: 'Sobrevivência', icon: '🏕️', tree: 'survival' as const },
    { name: 'Combate', icon: '⚔️', tree: 'combat' as const },
    { name: 'Coleta', icon: '⛏️', tree: 'gathering' as const },
    { name: 'Craft', icon: '🔧', tree: 'crafting' as const },
    { name: 'Exploração', icon: '🧭', tree: 'exploration' as const },
  ];

  const [selectedTree, setSelectedTree] = useState(trees[0].tree);
  const skills = getSkillsByTree(selectedTree);

  return (
    <Panel title="🌟 Habilidades" onClose={() => game.setActivePanel('none')}>
      <div className="mb-2 text-yellow-400 text-xs">
        Pontos disponíveis: {state.player.stats.skillPoints}
      </div>

      {/* Tree tabs */}
      <div className="flex gap-1 mb-3">
        {trees.map(t => (
          <button
            key={t.tree}
            onClick={() => setSelectedTree(t.tree)}
            className={`px-2 py-1 rounded text-xs ${
              selectedTree === t.tree ? 'bg-purple-600 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'
            }`}
          >
            {t.icon} {t.name}
          </button>
        ))}
      </div>

      {/* Skills */}
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {skills.map(skill => {
          const level = state.skills[skill.id] || 0;
          const canUpgrade = level < skill.maxLevel &&
            state.player.stats.skillPoints >= skill.cost;
          const bonuses = skill.effect(level);

          return (
            <div key={skill.id} className="p-2 rounded border border-white/10 bg-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{skill.icon}</span>
                  <div>
                    <div className="text-white text-xs font-bold">{skill.name}</div>
                    <div className="text-white/40 text-[10px]">{skill.description}</div>
                    <div className="text-white/30 text-[9px]">
                      Nv.{level}/{skill.maxLevel} | Custo: {skill.cost} pts
                    </div>
                  </div>
                </div>
                <button
                  disabled={!canUpgrade}
                  onClick={() => { game.upgradeSkill(skill.id); refresh(); }}
                  className={`px-3 py-1 rounded text-xs font-bold ${
                    canUpgrade ? 'bg-purple-600 hover:bg-purple-500 text-white' : 'bg-white/10 text-white/30'
                  }`}
                >
                  +
                </button>
              </div>
              {/* Level pips */}
              <div className="flex gap-0.5 mt-1">
                {Array.from({ length: skill.maxLevel }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full ${i < level ? 'bg-purple-400' : 'bg-white/10'}`}
                  />
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
    if (q.prerequisiteQuests) {
      return q.prerequisiteQuests.every(pq =>
        state.quests.some(q => q.definition.id === pq && q.status === 'completed')
      );
    }
    return true;
  });

  return (
    <Panel title="📜 Missões" onClose={() => game.setActivePanel('none')}>
      {/* Active */}
      <div className="text-white/60 text-xs mb-1">Ativas</div>
      <div className="space-y-1 mb-3">
        {activeQuests.length === 0 && <div className="text-white/30 text-xs">Nenhuma missão ativa</div>}
        {activeQuests.map(q => (
          <div key={q.definition.id} className="p-2 rounded border border-amber-500/30 bg-amber-900/20">
            <div className="text-white text-xs font-bold">{q.definition.name}</div>
            <div className="text-white/50 text-[10px]">{q.definition.description}</div>
            {q.definition.objectives.map((obj, i) => {
              const key = `${obj.type}_${obj.target}`;
              const progress = q.progress[key] || 0;
              return (
                <div key={i} className="text-[10px] mt-1">
                  <span className={progress >= obj.count ? 'text-green-400' : 'text-white/60'}>
                    {progress >= obj.count ? '✅' : '⬜'} {obj.description}: {Math.min(progress, obj.count)}/{obj.count}
                  </span>
                </div>
              );
            })}
            <div className="text-yellow-400/60 text-[9px] mt-1">
              Recompensas: {q.definition.rewards.xp} XP, {q.definition.rewards.gold} 🪙
            </div>
          </div>
        ))}
      </div>

      {/* Available */}
      {availableQuests.length > 0 && (
        <>
          <div className="text-white/60 text-xs mb-1">Disponíveis</div>
          <div className="space-y-1 mb-3">
            {availableQuests.map(q => (
              <div key={q.id} className="p-2 rounded border border-white/10 bg-white/5 flex justify-between items-center">
                <div>
                  <div className="text-white text-xs">{q.name} <span className="text-yellow-400/50">[Nv.{q.requiredLevel}]</span></div>
                  <div className="text-white/40 text-[10px]">{q.description}</div>
                </div>
                <button
                  onClick={() => { game.acceptQuest(q.id); refresh(); }}
                  className="px-2 py-1 rounded bg-green-600 hover:bg-green-500 text-white text-xs"
                >
                  Aceitar
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Completed */}
      {completedQuests.length > 0 && (
        <>
          <div className="text-white/60 text-xs mb-1">Completas</div>
          <div className="space-y-1">
            {completedQuests.map(q => (
              <div key={q.definition.id} className="p-1 rounded bg-white/5 text-white/30 text-xs">
                ✅ {q.definition.name}
              </div>
            ))}
          </div>
        </>
      )}
    </Panel>
  );
}

// ── Shop Panel ────────────────────────────────────────────────────
function ShopPanel({ game, uiState }: { game: Game; uiState: GameUIState }) {
  const [, forceUpdate] = useState(0);
  const refresh = () => forceUpdate(n => n + 1);
  const state = game.state;
  const npc = uiState.activeShopNpc;
  if (!npc) return null;

  const shopItems = (npc.definition.shopItems || []).map(id => getItem(id)).filter(Boolean) as any[];

  return (
    <Panel title={`🏪 ${npc.definition.name}`} onClose={() => game.setActivePanel('none')}>
      <div className="text-yellow-400 text-xs mb-2">Seu ouro: {state.player.stats.gold} 🪙</div>

      <div className="space-y-1 max-h-80 overflow-y-auto">
        {shopItems.map((item: any) => {
          const price = Math.floor(item.value * 1.5);
          const canBuy = state.player.stats.gold >= price;

          return (
            <div key={item.id} className="flex items-center gap-2 p-2 rounded border border-white/10 bg-white/5">
              <span className="text-lg">{item.icon}</span>
              <div className="flex-1">
                <div className="text-white text-xs">{item.name}</div>
                <div className="text-white/40 text-[10px]">{item.description}</div>
              </div>
              <div className="text-right">
                <div className="text-yellow-400 text-xs">{price} 🪙</div>
                <button
                  disabled={!canBuy}
                  onClick={() => { game.buyItem(item.id); refresh(); }}
                  className={`px-2 py-0.5 rounded text-[10px] ${
                    canBuy ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-white/10 text-white/30'
                  }`}
                >
                  Comprar
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-white/10 mt-2 pt-2">
        <div className="text-white/60 text-xs mb-1">Vender Itens</div>
        <div className="grid grid-cols-9 gap-1">
          {[...state.player.inventory, ...state.player.hotbar].filter(s => s.item).map((slot, i) => (
            <button
              key={i}
              onClick={() => { game.sellItem(slot.item!.id); refresh(); }}
              className="w-10 h-10 rounded border border-white/10 bg-red-900/20 flex items-center justify-center hover:border-red-400/50 relative group"
            >
              <span className="text-sm">{slot.item!.icon}</span>
              <div className="absolute -bottom-0.5 right-0 text-[8px] text-white/50">{slot.count}</div>
            </button>
          ))}
        </div>
      </div>
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
      // Open shop or quest log
      if (npc.definition.type === 'blacksmith' && npc.definition.shopItems && npc.definition.shopItems.length > 0) {
        game.ui.activeShopNpc = npc;
        game.ui.activePanel = 'shop';
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

  const handleOpenForge = () => {
    game.openForge();
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
            <button
              onClick={handleOpenForge}
              className="px-4 py-1.5 rounded bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold"
            >
              ⚒️ Forja (Upgrade)
            </button>
          )}
          <button
            onClick={handleNext}
            className="px-4 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold"
          >
            {isLastDialogue ? 'Fechar' : 'Próximo'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Reusable Panel ────────────────────────────────────────────────
function Panel({ title, onClose, children }: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/50 pointer-events-auto z-50">
      <div className="bg-gray-900/95 backdrop-blur-md rounded-2xl border border-white/10 p-4 w-[520px] max-w-[95vw] max-h-[85vh] flex flex-col">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-white font-bold text-lg">{title}</h2>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white text-xl leading-none"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
        <div className="text-white/20 text-[10px] text-center mt-2">Pressione ESC ou I/C/K/J para fechar</div>
      </div>
    </div>
  );
}

// ── Item Tooltip ──────────────────────────────────────────────────
function ItemTooltip({ item, durability, position, compareWith, playerStats, affixes }: {
  item: { id: string; name: string; description: string; icon: string; rarity: string; category: string; damage?: number; defense?: number; speed?: number; range?: number; maxDurability?: number; toolType?: string; armorSlot?: string; bonuses?: Record<string, number>; effects?: { type: string; value: number }[]; foodValue?: number; healAmount?: number; value: number; weight: number };
  durability?: number;
  position: { x: number; y: number };
  compareWith?: { item: { damage?: number; defense?: number; bonuses?: Record<string, number>; affixes?: { stat: string; value: number }[] } | null } | null;
  playerStats: GameState['player']['stats'];
  affixes?: { name: string; stat: string; value: number; tier: number }[];
}) {
  const rarityColor = RARITY_COLORS[item.rarity as Rarity] || '#fff';
  const rarityLabel = item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1);

  // Stat labels
  const statLabels: Record<string, string> = {
    maxHp: '❤️ Vida Max', strength: '⚔️ Força', defense: '🛡️ Defesa', speed: '🏃 Velocidade',
    mining: '⛏️ Mineração', woodcutting: '🪓 Corte', farming: '🌾 Fazenda', fishing: '🎣 Pesca',
    luck: '🍀 Sorte', maxHunger: '🍖 Fome Max',
  };

  // Calculate effective stats with affixes
  const getEffectiveStat = (base: number | undefined, statKey: string): number => {
    let total = base || 0;
    if (affixes) {
      for (const affix of affixes) {
        if (affix.stat === statKey) total += affix.value;
      }
    }
    return total;
  };

  // Get current equipped value for comparison
  const getEquippedValue = (statKey: string): number => {
    if (!compareWith?.item) return 0;
    const base = compareWith.item[statKey as keyof typeof compareWith.item] as number | undefined || 0;
    let total = base;
    if (compareWith.item.affixes) {
      for (const aff of compareWith.item.affixes) {
        if (aff.stat === statKey) total += aff.value;
      }
    }
    if (compareWith.item.bonuses?.[statKey as keyof typeof compareWith.item.bonuses]) {
      total += compareWith.item.bonuses[statKey as keyof typeof compareWith.item.bonuses]!;
    }
    return total;
  };

  const affixTextColors: Record<string, string> = {
    damage: '#ff6b35', defense: '#4fc3f7', maxHp: '#e53935',
    speed: '#66bb6a', strength: '#ff8a65', luck: '#ffd54f',
    mining: '#a1887f', woodcutting: '#8d6e63', farming: '#81c784', fishing: '#4dd0e1',
  };

  // Calculate total power score
  const calcPowerScore = (): number => {
    let score = 0;
    if (item.damage) score += item.damage * 2;
    if (item.defense) score += item.defense * 2;
    if (item.speed) score += item.speed;
    if (affixes) {
      for (const aff of affixes) {
        if (aff.stat === 'damage') score += aff.value * 2;
        else if (aff.stat === 'defense') score += aff.value * 2;
        else if (aff.stat === 'strength') score += aff.value * 1.5;
        else if (aff.stat === 'maxHp') score += aff.value * 0.5;
        else score += aff.value;
      }
    }
    return Math.round(score);
  };

  const getEquippedPowerScore = (): number => {
    if (!compareWith?.item) return 0;
    const ci = compareWith.item;
    let score = 0;
    if (ci.damage) score += ci.damage * 2;
    if (ci.defense) score += ci.defense * 2;
    if (ci.bonuses?.strength) score += ci.bonuses.strength * 1.5;
    if (ci.bonuses?.maxHp) score += ci.bonuses.maxHp * 0.5;
    if (ci.affixes) {
      for (const aff of ci.affixes) {
        if (aff.stat === 'damage') score += aff.value * 2;
        else if (aff.stat === 'defense') score += aff.value * 2;
        else if (aff.stat === 'strength') score += aff.value * 1.5;
        else if (aff.stat === 'maxHp') score += aff.value * 0.5;
        else score += aff.value;
      }
    }
    return Math.round(score);
  };

  const powerScore = calcPowerScore();
  const equippedPower = getEquippedPowerScore();
  const powerDiff = compareWith?.item ? powerScore - equippedPower : null;

  return (
    <div
      className="fixed z-[100] pointer-events-none"
      style={{ left: position.x + 16, top: position.y - 8 }}
    >
      <div className="bg-gray-900/95 backdrop-blur-md rounded-xl border border-white/10 p-3 w-60 shadow-2xl shadow-black/50">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">{item.icon}</span>
          <div>
            <div className="text-sm font-bold" style={{ color: rarityColor }}>{item.name}</div>
            <div className="text-[10px]" style={{ color: rarityColor }}>{rarityLabel} {item.category}</div>
          </div>
        </div>

        {/* Affix banner */}
        {affixes && affixes.length > 0 && (
          <div className="mb-1.5 flex flex-wrap gap-1">
            {affixes.map((aff, i) => (
              <span
                key={i}
                className="text-[9px] px-1.5 py-0.5 rounded-sm font-bold"
                style={{
                  color: affixTextColors[aff.stat] || '#aaa',
                  backgroundColor: `${affixTextColors[aff.stat] || '#aaa'}18`,
                  border: `1px solid ${affixTextColors[aff.stat] || '#aaa'}40`,
                }}
              >
                {aff.name}
              </span>
            ))}
          </div>
        )}

        {/* Description */}
        <div className="text-white/50 text-[10px] mb-2 border-b border-white/10 pb-2">{item.description}</div>

        {/* Stats */}
        <div className="space-y-0.5">
          {item.damage && (
            <StatLine
              label="⚔️ Dano"
              value={getEffectiveStat(item.damage, 'damage')}
              baseValue={item.damage}
              compare={compareWith ? getEquippedValue('damage') : undefined}
            />
          )}
          {item.defense && (
            <StatLine
              label="🛡️ Defesa"
              value={getEffectiveStat(item.defense, 'defense')}
              baseValue={item.defense}
              compare={compareWith ? getEquippedValue('defense') : undefined}
            />
          )}
          {item.speed && (
            <StatLine label="⚡ Velocidade" value={item.speed} />
          )}
          {item.range && (
            <StatLine label="📏 Alcance" value={item.range} />
          )}

          {/* Affix stat bonuses */}
          {affixes && affixes.map((aff, i) => {
            if (aff.stat === 'damage' && item.damage) return null;
            if (aff.stat === 'defense' && item.defense) return null;
            const label = statLabels[aff.stat];
            if (!label) return null;
            const eqVal = compareWith ? getEquippedValue(aff.stat) : undefined;
            return (
              <StatLine
                key={i}
                label={label}
                value={aff.value}
                isAffix={true}
                compare={eqVal}
              />
            );
          })}

          {item.toolType && (
            <div className="text-[9px] text-white/40">Tipo: {item.toolType}</div>
          )}
          {item.armorSlot && (
            <div className="text-[9px] text-white/40">Slot: {item.armorSlot}</div>
          )}

          {/* Item bonuses */}
          {item.bonuses && Object.entries(item.bonuses).map(([key, val]) => {
            if (!val) return null;
            const eqVal = compareWith ? getEquippedValue(key) : undefined;
            return (
              <StatLine
                key={key}
                label={statLabels[key] || key}
                value={val}
                compare={eqVal !== undefined ? eqVal - val : undefined}
              />
            );
          })}

          {/* Effects */}
          {item.effects && item.effects.map((eff, i) => (
            <div key={i} className="text-[9px] text-green-400/80">
              +{eff.value} {eff.type === 'heal' ? '❤️ Vida' : eff.type === 'hunger' ? '🍖 Fome' : eff.type === 'energy' ? '⚡ Energia' : eff.type === 'xp' ? '✨ XP' : eff.type}
            </div>
          ))}

          {/* Durability */}
          {durability !== undefined && item.maxDurability && (
            <div className="mt-1">
              <div className="flex justify-between text-[9px] text-white/40 mb-0.5">
                <span>Durabilidade</span>
                <span>{durability}/{item.maxDurability}</span>
              </div>
              <div className="h-1.5 bg-black/50 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(durability / item.maxDurability) * 100}%`,
                    backgroundColor: durability / item.maxDurability > 0.5 ? '#4caf50' : '#ff9800',
                  }}
                />
              </div>
            </div>
          )}

          {/* Food value */}
          {item.foodValue && (
            <div className="text-[9px] text-orange-400/80">+{item.foodValue} 🍖 Fome</div>
          )}
          {item.healAmount && (
            <div className="text-[9px] text-red-400/80">+{item.healAmount} ❤️ Vida</div>
          )}
        </div>

        {/* Power Score & Comparison */}
        <div className="mt-2 pt-2 border-t border-white/10">
          <div className="flex items-center justify-between text-[9px]">
            <span className="text-white/40">⚡ Poder</span>
            <span className="text-white/70 font-bold">{powerScore}</span>
          </div>
          {powerDiff !== null && powerDiff !== 0 && (
            <div className={`text-[9px] font-bold mt-0.5 ${powerDiff > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {powerDiff > 0 ? '▲' : '▼'} {Math.abs(powerDiff)} comparado ao equipado
            </div>
          )}
        </div>

        {/* Value/Weight */}
        <div className="mt-1.5 pt-1.5 border-t border-white/10 flex justify-between text-[9px] text-white/30">
          <span>💰 {item.value} 🪙</span>
          <span>⚖️ {item.weight}kg</span>
        </div>
      </div>
    </div>
  );
}

function StatLine({ label, value, compare, baseValue, isAffix }: {
  label: string;
  value: number;
  compare?: number;
  baseValue?: number;
  isAffix?: boolean;
}) {
  const diff = compare !== undefined ? value - compare : null;
  const showValue = baseValue !== undefined ? `${baseValue}${value > baseValue ? `+${value - baseValue}` : ''}` : `${isAffix ? '+' : ''}${value}`;
  return (
    <div className="flex items-center justify-between text-[9px]">
      <span className={isAffix ? 'text-purple-300/80 font-bold' : 'text-white/50'}>
        {isAffix ? '✨ ' : ''}{label}
      </span>
      <span className={
        isAffix ? 'text-purple-300 font-bold' :
        diff !== null ? (diff > 0 ? 'text-green-400' : diff < 0 ? 'text-red-400' : 'text-white/70') : 'text-white/70'
      }>
        {diff !== null && diff !== 0 ? `${diff > 0 ? '▲ +' : '▼ '}${Math.abs(diff)}` : showValue}
      </span>
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
              <div className="text-white text-xs font-bold">
                Slot {slot.slot + 1} {slot.slot === 0 ? '(Auto)' : ''}
              </div>
              {slot.exists ? (
                <div className="text-white/50 text-[10px]">
                  Nv.{slot.playerLevel} | {slot.playTime} | {formatSaveDate(slot.timestamp)}
                </div>
              ) : (
                <div className="text-white/30 text-[10px]">Vazio</div>
              )}
            </div>
            <div className="flex gap-1">
              {slot.exists && (
                <button
                  onClick={() => { game.loadFromSlot(slot.slot); refresh(); game.setActivePanel('none'); }}
                  className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[10px]"
                >
                  Carregar
                </button>
              )}
              <button
                onClick={() => { game.saveToSlot(slot.slot); refresh(); }}
                className="px-2 py-1 rounded bg-green-600 hover:bg-green-500 text-white text-[10px]"
              >
                Salvar
              </button>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

// ── Farming Bar ──────────────────────────────────────────────────
// ── Storage Panel ────────────────────────────────────────────────
function StoragePanel({ game }: { game: Game }) {
  const [, forceUpdate] = useState(0);
  const refresh = () => forceUpdate(n => n + 1);
  const chestId = game.state.activeStorageChestId;
  const chestIdSafe = chestId || '';
  const chest = chestIdSafe ? game.state.storageChests.find(c => c.id === chestIdSafe) : null;
  if (!chest || !chestIdSafe) return null;

  return (
    <div className="absolute right-4 top-1/2 -translate-y-1/2 z-50 pointer-events-auto">
      <div className="bg-gray-900/95 backdrop-blur-md rounded-2xl border border-amber-800/40 p-3 w-64 shadow-2xl shadow-black/60">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-white font-bold text-sm">🗄️ {chest.name}</h3>
          <button
            onClick={() => {
              game.state.activeStorageChestId = null;
              game.ui.activePanel = 'none';
              refresh();
            }}
            className="text-white/40 hover:text-white text-sm"
          >
            ✕
          </button>
        </div>
        <div className="text-white/40 text-[10px] mb-2">
          {chest.slots.filter(s => s.item).length}/{chest.maxSlots} slots usados
        </div>
        <div className="grid grid-cols-5 gap-1">
          {chest.slots.map((slot, i) => (
            <div
              key={i}
              onDoubleClick={() => {
                if (slot.item) {                    game.takeFromStorage(i, chestIdSafe!, slot.count);
                  refresh();
                }
              }}
              className="w-10 h-10 rounded border border-white/10 bg-black/40 flex items-center justify-center relative cursor-pointer hover:border-white/30 group"
            >
              {slot.item && (
                <>
                  <span className="text-sm" style={{ color: RARITY_COLORS[slot.item.rarity as Rarity] }}>
                    {slot.item.icon}
                  </span>
                  {slot.count > 1 && (
                    <span className="absolute bottom-0 right-0.5 text-[8px] text-white font-bold">{slot.count}</span>
                  )}
                  <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/20 rounded transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <span className="text-[8px] text-blue-300 font-bold">⇧</span>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="text-white/20 text-[9px] mt-2 text-center">Clique duplo para pegar do baú</div>
        {/* Inventory items to move to chest */}
        <div className="border-t border-white/10 mt-2 pt-2">
          <div className="text-white/40 text-[10px] mb-1">Seu inventário:</div>
          <div className="grid grid-cols-5 gap-1">
            {game.state.player.inventory.slice(0, 15).map((slot, i) => (
              <div
                key={i}
                onDoubleClick={() => {
                  if (slot.item) {
                    game.moveToStorage(i, chestIdSafe!, slot.count);
                    refresh();
                  }
                }}
                className="w-10 h-10 rounded border border-white/10 bg-black/40 flex items-center justify-center relative cursor-pointer hover:border-green-400/50 group"
              >
                {slot.item && (
                  <>
                    <span className="text-sm" style={{ color: RARITY_COLORS[slot.item.rarity as Rarity] }}>
                      {slot.item.icon}
                    </span>
                    {slot.count > 1 && (
                      <span className="absolute bottom-0 right-0.5 text-[8px] text-white font-bold">{slot.count}</span>
                    )}
                    <div className="absolute inset-0 bg-green-500/0 group-hover:bg-green-500/20 rounded transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <span className="text-[8px] text-green-300 font-bold">⇩</span>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FarmingBar({ game }: { game: Game }) {
  const state = game.state;

  // Check if player is near a farm plot
  const px = Math.floor((state.player.x + 12 + state.player.facing.x * 32) / 32);
  const py = Math.floor((state.player.y + 12 + state.player.facing.y * 32) / 32);
  const nearPlot = state.farmPlots.find(p => p.x === px && p.y === py);

  // Check if player has seeds
  const seedIds = ['wheat_seed', 'carrot_seed', 'potato_seed', 'berry_seed', 'pumpkin_seed'];
  const hasSeeds = seedIds.some(id => game.countInInventory(id) > 0);

  return (
    <div className="absolute bottom-4 left-4 pointer-events-auto">
      <div className="bg-black/60 backdrop-blur-sm rounded-lg p-2 border border-white/10">
        <div className="flex gap-1">
          {/* Till soil */}
          <button
            onClick={() => game.tillSoil()}
            className="w-8 h-8 rounded bg-amber-900/50 hover:bg-amber-800/50 flex items-center justify-center text-xs"
            title="Preparar solo (Hoe)"
          >
            🌱
          </button>
          {/* Plant seed */}
          <button
            onClick={() => {
              if (nearPlot && !nearPlot.seedId && hasSeeds) {
                // Find first available seed
                for (const id of seedIds) {
                  if (game.countInInventory(id) > 0) {
                    game.plantSeed(id);
                    break;
                  }
                }
              }
            }}
            className={`w-8 h-8 rounded flex items-center justify-center text-xs ${nearPlot && !nearPlot.seedId && hasSeeds ? 'bg-green-900/50 hover:bg-green-800/50' : 'bg-white/5'}`}
            title="Plantar semente"
          >
            🌿
          </button>
          {/* Water */}
          <button
            onClick={() => game.waterPlot()}
            className={`w-8 h-8 rounded flex items-center justify-center text-xs ${nearPlot && nearPlot.seedId && !nearPlot.watered ? 'bg-blue-900/50 hover:bg-blue-800/50' : 'bg-white/5'}`}
            title="Regar"
          >
            💧
          </button>
          {/* Harvest */}
          <button
            onClick={() => game.harvestPlot()}
            className={`w-8 h-8 rounded flex items-center justify-center text-xs ${nearPlot && nearPlot.growthStage >= 3 ? 'bg-yellow-900/50 hover:bg-yellow-800/50' : 'bg-white/5'}`}
            title="Colher"
          >
            🌾
          </button>
          {/* Fish */}
          <button
            onClick={() => game.tryFish()}
            className="w-8 h-8 rounded bg-cyan-900/50 hover:bg-cyan-800/50 flex items-center justify-center text-xs"
            title="Pescar"
          >
            🎣
          </button>
          {/* Build */}
          <button
            onClick={() => {
              // Place first placeable item from hotbar
              const slot = state.player.hotbar[state.player.currentTool];
              if (slot?.item?.placeable) {
                game.placeStructure(slot.item.id);
              }
            }}
            className="w-8 h-8 rounded bg-stone-900/50 hover:bg-stone-800/50 flex items-center justify-center text-xs"
            title="Construir (com item selecionado)"
          >
            🏗️
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Forge Panel (Upgrade System) ──────────────────────────────────
function ForgePanel({ game }: { game: Game }) {
  const [, forceUpdate] = useState(0);
  const refresh = () => forceUpdate(n => n + 1);
  const state = game.state;

  const forgeableSlots = game.getForgeableSlots();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const selectedSlot = selectedIndex !== null ? forgeableSlots[selectedIndex] : null;
  const upgradeCost = selectedSlot ? game.getUpgradeCost(selectedSlot.slot) : null;
  const upgLevel = selectedSlot?.slot.upgradeLevel ?? 0;

  const getSlotLabel = (pool: string, index: string | number): string => {
    if (pool === 'hotbar') return `Hotbar ${(index as number) + 1}`;
    if (pool === 'equipment') {
      const eqLabels: Record<string, string> = {
        weapon: 'Arma', tool: 'Ferramenta',
        helmet: 'Capacete', chest: 'Peitoral', boots: 'Botas', gloves: 'Luvas',
        ring: 'Anel', amulet: 'Amuleto',
      };
      return eqLabels[index as string] || 'Equip';
    }
    return `Mochila ${(index as number) + 1}`;
  };

  const getStatBonus = (slot: { slot: { item: any; upgradeLevel?: number }; pool: string }): { damage: number; defense: number } => {
    const item = slot.slot.item;
    const level = slot.slot.upgradeLevel ?? 0;
    const dmgBonus = item?.damage ? Math.floor(item.damage * (0.08 + level * 0.02)) : 0;
    const defBonus = item?.defense ? Math.floor(item.defense * (0.08 + level * 0.02)) : 0;
    return { damage: dmgBonus, defense: defBonus };
  };

  return (
    <Panel title="⚒️ Forja do Ferreiro" onClose={() => game.setActivePanel('none')}>
      <div className="text-white/60 text-xs mb-2">
        Selecione um equipamento para melhorar com minérios da caverna.
      </div>

      <div className="text-yellow-400 text-xs mb-2">🪙 {state.player.stats.gold} ouro</div>

      {/* Forgeable items list */}
      <div className="max-h-48 overflow-y-auto mb-3 border border-white/10 rounded p-1">
        {forgeableSlots.length === 0 ? (
          <div className="text-white/40 text-xs text-center py-4">
            Nenhum equipamento forjável no inventário.
            <div className="text-[9px] mt-1 text-white/30">(Armas, ferramentas e armaduras)</div>
          </div>
        ) : (
          <div className="space-y-1">
            {forgeableSlots.map((fs, i) => {
              const item = fs.slot.item!;
              const level = fs.slot.upgradeLevel ?? 0;
              const isSelected = i === selectedIndex;
              return (
                <div
                  key={`${fs.pool}-${fs.index}`}
                  onClick={() => setSelectedIndex(i)}
                  className={`flex items-center gap-2 p-1.5 rounded cursor-pointer border transition-all ${
                    isSelected
                      ? 'border-orange-400 bg-orange-900/30'
                      : 'border-white/10 bg-white/5 hover:border-white/30'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-xs font-bold truncate" style={{ color: RARITY_COLORS[item.rarity as Rarity] }}>
                      {item.name}
                    </div>
                    <div className="text-white/40 text-[9px]">
                      {getSlotLabel(fs.pool, fs.index)} | Nv.{level}/5
                    </div>
                  </div>
                  {level > 0 && (
                    <span className="text-orange-400 text-[10px] font-bold">+{level}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected item upgrade details */}
      {selectedSlot && upgradeCost && (
        <div className="border border-white/10 rounded p-2 bg-white/5 mb-2">
          <div className="text-white text-xs font-bold mb-1">
            {selectedSlot.slot.item!.icon} {selectedSlot.slot.item!.name}
            <span className="text-orange-400 ml-1">+{upgLevel}/{upgLevel + 1}</span>
          </div>

          {/* Current stats */}
          <div className="text-[10px] text-white/60 mb-1">
            {selectedSlot.slot.item!.damage && (
              <span className="mr-2">⚔️ {selectedSlot.slot.item!.damage + (selectedSlot.slot.damageBonus ?? 0)}</span>
            )}
            {selectedSlot.slot.item!.defense && (
              <span>🛡️ {selectedSlot.slot.item!.defense + (selectedSlot.slot.defenseBonus ?? 0)}</span>
            )}
          </div>

          {/* Next level preview */}
          <div className="text-[10px] text-green-400/70 mb-2">
            {selectedSlot.slot.item!.damage && (
              <span className="mr-2">→ ⚔️ +{Math.floor(selectedSlot.slot.item!.damage * (0.08 + (upgLevel + 1) * 0.02))}</span>
            )}
            {selectedSlot.slot.item!.defense && (
              <span>→ 🛡️ +{Math.floor(selectedSlot.slot.item!.defense * (0.08 + (upgLevel + 1) * 0.02))}</span>
            )}
          </div>

          {/* Cost breakdown */}
          <div className="border-t border-white/10 pt-1 mb-2">
            <div className="text-white/50 text-[9px] mb-1">Custo:</div>
            <div className="text-yellow-400 text-[10px]">💰 {upgradeCost.gold} 🪙</div>
            {upgradeCost.materials.map(mat => {
              const item = getItem(mat.itemId);
              const have = game.countInInventory(mat.itemId);
              return (
                <div key={mat.itemId} className={`text-[10px] ${have >= mat.count ? 'text-green-400' : 'text-red-400'}`}>
                  {item?.icon} {item?.name || mat.itemId}: {have}/{mat.count}
                </div>
              );
            })}
          </div>

          <button
            onClick={() => {
              const upgraded = game.upgradeItem(selectedSlot.pool, selectedSlot.index);
              refresh();
              if (upgraded) {
                // After upgrading, reselect the slot to show new cost
                setSelectedIndex(null);
              }
            }}
            className="w-full py-1.5 rounded text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white"
          >
            ⚒️ Melhorar (+{upgLevel + 1})
          </button>
        </div>
      )}

      {selectedSlot && !upgradeCost && (
        <div className="text-white/40 text-xs text-center py-2">Item no nível máximo (5)!</div>
      )}

      {/* Materials info */}
      <div className="text-white/20 text-[9px] mt-2 border-t border-white/10 pt-2">
        Minérios da caverna (mitril, rubi) são necessários para níveis avançados.
      </div>
    </Panel>
  );
}

// ── Helpers ───────────────────────────────────────────────────────
function getNotificationClass(type: string): string {
  switch (type) {
    case 'success': return 'bg-green-600/80 text-white';
    case 'warning': return 'bg-amber-600/80 text-white';
    case 'error': return 'bg-red-600/80 text-white';
    case 'item': return 'bg-blue-600/80 text-white';
    case 'quest': return 'bg-purple-600/80 text-white';
    default: return 'bg-black/60 text-white/80';
  }
}
