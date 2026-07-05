// ═══════════════════════════════════════════════════════════════════
// Farm Survival - Main Game Page
// ═══════════════════════════════════════════════════════════════════

import { useRef, useEffect, useState } from 'react';
import { Game } from './Game';
import { GameState, GameUIState, PanelType, ItemCategory, RARITY_COLORS, Rarity } from './core/Types';
import { getItem } from './data/Items';
import { RECIPES } from './data/Recipes';
import { SKILLS, getSkillsByTree } from './data/Skills';
import { QUESTS } from './data/Quests';
import { NPCS } from './data/Npcs';
import { formatTime } from './core/Utils';

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
  if (!game || !gameState || !uiState) {
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl animate-pulse">Carregando Farm Survival...</div>
      </div>
    );
  }

  const { player, gameTime, notifications } = gameState;
  const stats = player.stats;

  return (
    <div className="w-screen h-screen bg-black overflow-hidden relative select-none" style={{ fontFamily: 'monospace' }}>
      {/* Game Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        tabIndex={0}
      />

      {/* HUD Overlay */}
      <HUD
        stats={stats}
        gameTime={gameTime}
        selectedTool={player.currentTool}
        hotbar={player.hotbar}
        notifications={notifications}
      />

      {/* Minimap */}
      {gameState.settings.showMinimap && (
        <MiniMap game={game} />
      )}

      {/* Hotbar */}
      <Hotbar
        hotbar={player.hotbar}
        selected={player.currentTool}
        onSelect={(i) => { player.currentTool = i; setSelectedHotbar(i); }}
      />

      {/* Bottom Info Bar */}
      <BottomBar stats={stats} />

      {/* Panels */}
      {uiState.activePanel === 'inventory' && (
        <InventoryPanel game={game} />
      )}
      {uiState.activePanel === 'crafting' && (
        <CraftingPanel game={game} uiState={uiState} />
      )}
      {uiState.activePanel === 'skills' && (
        <SkillsPanel game={game} />
      )}
      {uiState.activePanel === 'quests' && (
        <QuestsPanel game={game} />
      )}
      {uiState.activePanel === 'shop' && (
        <ShopPanel game={game} uiState={uiState} />
      )}
      {uiState.activePanel === 'dialogue' && (
        <DialoguePanel game={game} uiState={uiState} />
      )}

      {/* Controls Help */}
      <div className="absolute bottom-16 left-4 text-white/30 text-xs pointer-events-none">
        WASD=Mover | E=Interagir | Q/Espaço=Atacar | F=Usar | G=Soltar | I=Inventário | C=Craft | K=Habilidades | J=Missões | M=Mapa
      </div>
    </div>
  );
}

// ── HUD Component ─────────────────────────────────────────────────
function HUD({ stats, gameTime, selectedTool, hotbar, notifications }: {
  stats: GameState['player']['stats'];
  gameTime: GameState['gameTime'];
  selectedTool: number;
  hotbar: GameState['player']['hotbar'];
  notifications: GameState['notifications'];
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
        <BarBar label="⚡ Energia" current={stats.energy} max={stats.maxEnergy} color="#2196f3" />
        <div className="flex gap-3 text-xs text-white/70 mt-1">
          <span>⚔️ {stats.strength}</span>
          <span>🛡️ {stats.defense}</span>
          <span>🍀 {stats.luck}</span>
          <span>🪙 {stats.gold}</span>
        </div>
        <div className="text-xs text-yellow-400">
          Lv.{stats.level} | XP: {stats.xp}/{stats.xpToNext}
        </div>
      </div>

      {/* Top-right: Time & Weather */}
      <div className="absolute top-4 right-4 text-right pointer-events-none">
        <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 space-y-1">
          <div className="text-white font-bold text-sm">
            {formatTime(gameTime.hour, gameTime.minute)}
          </div>
          <div className="text-white/70 text-xs">
            Dia {gameTime.day} {seasonIcon} {gameTime.weather !== 'clear' ? weatherIcon : ''}
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
function Hotbar({ hotbar, selected, onSelect }: {
  hotbar: GameState['player']['hotbar'];
  selected: number;
  onSelect: (i: number) => void;
}) {
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1 pointer-events-auto">
      {hotbar.map((slot, i) => (
        <button
          key={i}
          onClick={() => onSelect(i)}
          className={`w-12 h-12 rounded border-2 flex items-center justify-center relative transition-all ${
            i === selected
              ? 'border-yellow-400 bg-yellow-400/20 scale-110'
              : 'border-white/20 bg-black/60 hover:border-white/40'
          }`}
        >
          {slot?.item && (
            <>
              <span className="text-xl">{slot.item.icon}</span>
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
        </button>
      ))}
    </div>
  );
}

// ── Bottom Bar ────────────────────────────────────────────────────
function BottomBar({ stats }: { stats: GameState['player']['stats'] }) {
  return (
    <div className="absolute bottom-16 right-4 pointer-events-none">
      <div className="bg-black/50 backdrop-blur-sm rounded px-3 py-1 text-xs text-white/60 flex gap-3">
        <span>⭐ Nv.{stats.level}</span>
        <span>⛏️ Min:{stats.mining}</span>
        <span>🪓 Madeira:{stats.woodcutting}</span>
        <span>🌾 Farm:{stats.farming}</span>
        <span>🎣 Pesca:{stats.fishing}</span>
      </div>
    </div>
  );
}

// ── Minimap ───────────────────────────────────────────────────────
function MiniMap({ game }: { game: Game }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const biomeImageRef = useRef<ImageData | null>(null);
  const size = 160;

  // Draw static biome layer once and cache as ImageData
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = size;
    canvas.height = size;

    const { biomeMap } = game;
    const worldW = biomeMap[0]?.length || 0;
    const worldH = biomeMap.length;
    if (!worldW || !worldH) return;

    const scaleX = size / worldW;
    const scaleY = size / worldH;

    const biomeColors: Record<string, string> = {
      forest: '#2d5a1e', plains: '#5a9a4a', mountains: '#6a7a6a',
      swamp: '#4a6a2a', desert: '#c4a862', tundra: '#a8b8b0',
      cave: '#3a3a3a', ruins: '#7a6a5a', village: '#8ab070',
      lake: '#3a8ab0', river: '#4a90c2',
    };

    for (let y = 0; y < worldH; y++) {
      for (let x = 0; x < worldW; x++) {
        const biome = biomeMap[y][x];
        ctx.fillStyle = biomeColors[biome] || '#555';
        ctx.fillRect(x * scaleX, y * scaleY, scaleX + 0.5, scaleY + 0.5);
      }
    }

    biomeImageRef.current = ctx.getImageData(0, 0, size, size);
  }, [game]);

  // Animate player dot: restore cached biome then draw dot on top
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const biomeImage = biomeImageRef.current;
    if (!biomeImage) return;

    const { biomeMap, state } = game;
    const worldW = biomeMap[0]?.length || 1;
    const worldH = biomeMap.length || 1;

    ctx.putImageData(biomeImage, 0, 0);

    const px = (state.player.x / 32 / worldW) * size;
    const py = (state.player.y / 32 / worldH) * size;
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.stroke();
  });

  return (
    <div className="absolute top-4 right-4 mt-24 pointer-events-none">
      <div className="bg-black/70 backdrop-blur-sm rounded-lg p-1 border border-white/10">
        <canvas ref={canvasRef} className="rounded" />
      </div>
    </div>
  );
}

// ── Inventory Panel ───────────────────────────────────────────────
function InventoryPanel({ game }: { game: Game }) {
  const [, forceUpdate] = useState(0);
  const state = game.state;

  const refresh = () => forceUpdate(n => n + 1);

  return (
    <Panel title="🎒 Inventário" onClose={() => game.setActivePanel('none')}>
      {/* Equipment */}
      <div className="mb-3">
        <div className="text-white/60 text-xs mb-1">Equipamento</div>
        <div className="grid grid-cols-4 gap-1">
          {(['helmet', 'chest', 'boots', 'gloves', 'weapon', 'tool', 'ring', 'amulet'] as const).map(slot => {
            const equipped = state.player.equipment[slot];
            return (
              <button
                key={slot}
                onClick={() => { game.unequipItem(slot); refresh(); }}
                className="w-12 h-12 rounded border border-white/20 bg-black/40 flex items-center justify-center relative group hover:border-white/40"
                title={slot}
              >
                {equipped?.item ? (
                  <>
                    <span className="text-lg">{equipped.item.icon}</span>
                    <span className="absolute -top-1 -right-1 text-[7px] bg-white/20 rounded px-0.5">{slot.slice(0, 3)}</span>
                  </>
                ) : (
                  <span className="text-white/20 text-[9px] uppercase">{slot.slice(0, 3)}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Backpack */}
      <div className="text-white/60 text-xs mb-1">Mochila</div>
      <div className="grid grid-cols-9 gap-1 mb-3">
        {state.player.inventory.map((slot, i) => (
          <SlotButton key={i} slot={slot} onClick={() => {
            if (slot.item) {
              // Right click = equip, left click = move to hotbar
              if (slot.item.category === 'armor' || slot.item.category === 'weapon' || slot.item.toolType || slot.item.armorSlot || slot.item.category === 'ring' || slot.item.category === 'amulet') {
                game.equipItem(i, 'inventory');
              } else {
                game.moveToHotbar(i, state.player.currentTool);
              }
              refresh();
            }
          }} />
        ))}
      </div>

      {/* Gold */}
      <div className="text-yellow-400 text-sm">🪙 {state.player.stats.gold} ouro</div>
    </Panel>
  );
}

// ── Crafting Panel ────────────────────────────────────────────────
function CraftingPanel({ game, uiState }: { game: Game; uiState: GameUIState }) {
  const [, forceUpdate] = useState(0);
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
                {recipe.requiredLevel > 1 && (
                  <div className="text-yellow-400/60 text-[9px]">Nv.{recipe.requiredLevel}</div>
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

  const handleNext = () => {
    npc.dialogueIndex++;
    if (npc.dialogueIndex >= npc.definition.dialogue.length) {
      // Open shop or quest log
      if (npc.definition.shopItems && npc.definition.shopItems.length > 0) {
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
        <div className="flex justify-end mt-3">
          <button
            onClick={handleNext}
            className="px-4 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold"
          >
            {npc.dialogueIndex >= npc.definition.dialogue.length - 1 ? 'Fechar' : 'Próximo'}
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

// ── Slot Button (reusable) ────────────────────────────────────────
function SlotButton({ slot, onClick }: { slot: { item: { icon: string; rarity: Rarity } | null; count: number }; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-10 h-10 rounded border border-white/15 bg-black/40 flex items-center justify-center hover:border-white/30 hover:bg-white/10 transition-colors relative"
    >
      {slot?.item && (
        <>
          <span className="text-sm" style={{ color: RARITY_COLORS[slot.item.rarity] || '#fff' }}>
            {slot.item.icon}
          </span>
          {slot.count > 1 && (
            <span className="absolute bottom-0 right-0.5 text-[8px] text-white font-bold">{slot.count}</span>
          )}
        </>
      )}
    </button>
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
