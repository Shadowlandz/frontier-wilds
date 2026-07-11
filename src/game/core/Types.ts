// ═══════════════════════════════════════════════════════════════════
// Farm Survival - Core Type Definitions
// ═══════════════════════════════════════════════════════════════════

// ── Vector & Geometry ─────────────────────────────────────────────
export interface Vec2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

// ── Const Enums (erasableSyntaxOnly compatible) ───────────────────
export const Biome = {
  Forest: 'forest',
  Plains: 'plains',
  Mountains: 'mountains',
  Swamp: 'swamp',
  Desert: 'desert',
  Tundra: 'tundra',
  Cave: 'cave',
  Ruins: 'ruins',
  Village: 'village',
  Lake: 'lake',
  River: 'river',
} as const;
export type Biome = typeof Biome[keyof typeof Biome];

export const TileType = {
  Grass: 0,
  Dirt: 1,
  Sand: 2,
  Water: 3,
  DeepWater: 4,
  Stone: 5,
  Snow: 6,
  SwampWater: 7,
  Path: 8,
  Wall: 9,
  Floor: 10,
  CaveFloor: 11,
  CaveWall: 12,
  Lava: 13,
} as const;
export type TileType = typeof TileType[keyof typeof TileType];

export const Season = {
  Spring: 'spring',
  Summer: 'summer',
  Autumn: 'autumn',
  Winter: 'winter',
} as const;
export type Season = typeof Season[keyof typeof Season];

export const Weather = {
  Clear: 'clear',
  Rain: 'rain',
  HeavyRain: 'heavyRain',
  Fog: 'fog',
  Snow: 'snow',
  Storm: 'storm',
} as const;
export type Weather = typeof Weather[keyof typeof Weather];

export const Rarity = {
  Common: 'common',
  Uncommon: 'uncommon',
  Rare: 'rare',
  Epic: 'epic',
  Legendary: 'legendary',
} as const;
export type Rarity = typeof Rarity[keyof typeof Rarity];

export const ResourceType = {
  Wood: 'wood',
  Stone: 'stone',
  IronOre: 'ironOre',
  GoldOre: 'goldOre',
  Coal: 'coal',
  Crystal: 'crystal',
  Plant: 'plant',
  Fruit: 'fruit',
  Leather: 'leather',
  Bone: 'bone',
  Gem: 'gem',
  Fiber: 'fiber',
  Clay: 'clay',
  // ── Cave Resources ──
  MithrilOre: 'mithrilOre',
  RubyOre: 'rubyOre',
} as const;
export type ResourceType = typeof ResourceType[keyof typeof ResourceType];

export const ItemCategory = {
  Tool: 'tool',
  Weapon: 'weapon',
  Armor: 'armor',
  Consumable: 'consumable',
  Material: 'material',
  Quest: 'quest',
  Seed: 'seed',
  Fish: 'fish',
  Furniture: 'furniture',
  Ring: 'ring',
  Amulet: 'amulet',
} as const;
export type ItemCategory = typeof ItemCategory[keyof typeof ItemCategory];

export const ToolType = {
  Axe: 'axe',
  Pickaxe: 'pickaxe',
  Sword: 'sword',
  Bow: 'bow',
  Spear: 'spear',
  Torch: 'torch',
  Scythe: 'scythe',
  Hammer: 'hammer',
  FishingRod: 'fishingRod',
  Hoe: 'hoe',
} as const;
export type ToolType = typeof ToolType[keyof typeof ToolType];

export const ArmorSlot = {
  Helmet: 'helmet',
  Chest: 'chest',
  Boots: 'boots',
  Gloves: 'gloves',
  Ring: 'ring',
  Amulet: 'amulet',
} as const;
export type ArmorSlot = typeof ArmorSlot[keyof typeof ArmorSlot];

export const EnemyType = {
  Wolf: 'wolf',
  Boar: 'boar',
  Slime: 'slime',
  Skeleton: 'skeleton',
  Spider: 'spider',
  Golem: 'golem',
  Bat: 'bat',
  DarkKnight: 'darkKnight',
  Dragon: 'dragon',
  SlimeKing: 'slimeKing',
  ShadowLord: 'shadowLord',
  // ── Cave Exclusives ──
  CaveTroll: 'caveTroll',
  GiantBat: 'giantBat',
  CrystalGolem: 'crystalGolem',
  LavaSpider: 'lavaSpider',
  // ── Cursed Lands Boss ──
  VoidWarden: 'voidWarden',
} as const;
export type EnemyType = typeof EnemyType[keyof typeof EnemyType];

export const NpcType = {
  Merchant: 'merchant',
  Blacksmith: 'blacksmith',
  Farmer: 'farmer',
  Alchemist: 'alchemist',
  Hunter: 'hunter',
  QuestGiver: 'questGiver',
  Identifier: 'identifier',
} as const;
export type NpcType = typeof NpcType[keyof typeof NpcType];

export const SkillTree = {
  Survival: 'survival',
  Combat: 'combat',
  Gathering: 'gathering',
  Crafting: 'crafting',
  Exploration: 'exploration',
} as const;
export type SkillTree = typeof SkillTree[keyof typeof SkillTree];

export const AttackType = {
  Light: 'light',
  Heavy: 'heavy',
  Ranged: 'ranged',
} as const;
export type AttackType = typeof AttackType[keyof typeof AttackType];

export const QuestType = {
  Main: 'main',
  Side: 'side',
  Daily: 'daily',
  Weekly: 'weekly',
} as const;
export type QuestType = typeof QuestType[keyof typeof QuestType];

export const QuestStatus = {
  Available: 'available',
  Active: 'active',
  Completed: 'completed',
  Failed: 'failed',
} as const;
export type QuestStatus = typeof QuestStatus[keyof typeof QuestStatus];

// ── Interfaces ────────────────────────────────────────────────────
export interface ItemDefinition {
  id: string;
  name: string;
  description: string;
  category: ItemCategory;
  rarity: Rarity;
  stackSize: number;
  weight: number;
  value: number;
  icon: string;
  toolType?: ToolType;
  armorSlot?: ArmorSlot;
  damage?: number;
  defense?: number;
  durability?: number;
  maxDurability?: number;
  speed?: number;
  range?: number;
  miningPower?: number;
  choppingPower?: number;
  bonuses?: Partial<PlayerAttributes>;
  effects?: ItemEffect[];
  placeable?: boolean;
  foodValue?: number;
  healAmount?: number;
  foodQuality?: 'fresh' | 'normal' | 'old' | 'spoiled';
}

export interface ItemEffect {
  type: 'heal' | 'buff' | 'damage' | 'speed' | 'hunger' | 'energy' | 'xp';
  value: number;
  duration?: number;
}

export interface PlayerAttributes {
  maxHp: number;
  maxHunger: number;
  maxStamina: number;
  strength: number;
  defense: number;
  speed: number;
  mining: number;
  woodcutting: number;
  farming: number;
  fishing: number;
  luck: number;
}

export interface PlayerStats {
  level: number;
  xp: number;
  xpToNext: number;
  hp: number;
  hunger: number;
  maxHp: number;
  maxHunger: number;
  strength: number;
  defense: number;
  speed: number;
  mining: number;
  woodcutting: number;
  farming: number;
  fishing: number;
  luck: number;
  gold: number;
  skillPoints: number;
}

export interface InventorySlot {
  item: ItemDefinition | null;
  count: number;
  durability?: number;
  upgradeLevel?: number;
  damageBonus?: number;
  defenseBonus?: number;
  affixes?: ItemAffix[];
  /** If true, item stats/affixes are hidden until identified at a workbench */
  unidentified?: boolean;
}

export interface Equipment {
  helmet: InventorySlot | null;
  chest: InventorySlot | null;
  boots: InventorySlot | null;
  gloves: InventorySlot | null;
  ring: InventorySlot | null;
  amulet: InventorySlot | null;
  weapon: InventorySlot | null;
  tool: InventorySlot | null;
}

export interface CraftingRecipe {
  id: string;
  name: string;
  category: ItemCategory;
  result: string;
  resultCount: number;
  ingredients: { itemId: string; count: number }[];
  requiredLevel: number;
  craftTime: number;
  station?: string;
}

export interface EnemyDefinition {
  type: EnemyType;
  name: string;
  hp: number;
  damage: number;
  defense: number;
  speed: number;
  xpReward: number;
  level: number;
  aggroRange: number;
  attackRange: number;
  attackSpeed: number;
  loot: { itemId: string; chance: number; minCount: number; maxCount: number }[];
  color: string;
  icon: string;
  size: number;
  behavior: 'patrol' | 'chase' | 'ranged' | 'stationary';
  biomes: Biome[];
}

export interface NpcDefinition {
  type: NpcType;
  name: string;
  dialogue: string[];
  shopItems?: string[];
  /** Items this NPC buys from the player — mapped to buy price per item */
  buysItems?: Record<string, number>;
  questIds?: string[];
  color: string;
  icon: string;
}

export interface QuestDefinition {
  id: string;
  name: string;
  description: string;
  type: QuestType;
  objectives: QuestObjective[];
  rewards: QuestReward;
  requiredLevel: number;
  prerequisiteQuests?: string[];
}

export interface QuestObjective {
  type: 'kill' | 'gather' | 'craft' | 'explore' | 'talk' | 'fish' | 'farm';
  target: string;
  count: number;
  description: string;
}

export interface QuestReward {
  xp: number;
  gold: number;
  items?: { itemId: string; count: number }[];
  unlocks?: string[];
}

export interface ActiveQuest {
  definition: QuestDefinition;
  progress: { [key: string]: number };
  status: QuestStatus;
  startedAt: number;
}

export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  tree: SkillTree;
  maxLevel: number;
  cost: number;
  effect: (level: number) => Partial<PlayerAttributes>;
  prerequisites?: string[];
  icon: string;
}

/** Furnace smelting state */
export interface FurnaceData {
  /** Item being smelted (input slot) */
  input: InventorySlot | null;
  /** Fuel slot */
  fuel: InventorySlot | null;
  /** Result slot (output) */
  output: InventorySlot | null;
  /** Smelting progress (0-1) */
  progress: number;
  /** Current smelt time requirement (ms) */
  smeltTime: number;
  /** Remaining fuel time (seconds) */
  fuelTime: number;
  /** Max fuel capacity (seconds) */
  maxFuelTime: number;
  /** Whether the furnace is actively burning */
  lit: boolean;
  /** Current recipe being smelted (if any) */
  currentRecipeId: string | null;
}

export interface PlacedStructure {
  id: string;
  itemId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  health: number;
  maxHealth: number;
  /** If this structure is a house/safe-zone anchor */
  isSafeZone?: boolean;
  /** Furnace data (only if itemId === 'furnace') */
  furnaceData?: FurnaceData;
}

/** Safe zone defined by a house placement */
export interface SafeZone {
  /** Center position (world coords) */
  centerX: number;
  centerY: number;
  /** Radius in tiles */
  radius: number;
  /** House structure id that created this zone */
  structureId: string;
}

/** Storage chest inventory — extra container beyond player inventory */
export interface StorageChest {
  id: string;
  structureId: string;
  name: string;
  slots: InventorySlot[];
  maxSlots: number;
}

/** Building recipe definition — like CraftingRecipe but for placeable buildings */
export interface BuildingDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  itemId: string;
  requiredLevel: number;
  width: number;
  height: number;
  health: number;
  /** If true, this building creates a safe zone */
  createsSafeZone?: boolean;
  /** Safe zone radius in tiles (only if createsSafeZone) */
  safeZoneRadius?: number;
  /** If true, this is a storage container */
  isStorage?: boolean;
  /** Number of storage slots (only if isStorage) */
  storageSlots?: number;
  ingredients: { itemId: string; count: number }[];
}

export interface FarmPlot {
  x: number;
  y: number;
  seedId: string | null;
  growthStage: number;
  growthProgress: number;
  watered: boolean;
  plantedAt: number;
  /** Name of the crop for display */
  cropName?: string;
  /** Whether this plot is inside a safe zone (grows faster) */
  inSafeZone?: boolean;
}

export interface WorldEntity {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

// ── Game State ────────────────────────────────────────────────────
export interface GameState {
  player: PlayerState;
  world: WorldState;
  quests: ActiveQuest[];
  skills: { [skillId: string]: number };
  structures: PlacedStructure[];
  safeZones: SafeZone[];
  storageChests: StorageChest[];
  activeStorageChestId: string | null;
  farmPlots: FarmPlot[];
  discoveredAreas: string[];
  gameTime: GameTime;
  settings: GameSettings;
  notifications: Notification[];
  achievements: AchievementProgress[];
}

export interface PlayerState {
  x: number;
  y: number;
  facing: Vec2;
  stats: PlayerStats;
  inventory: InventorySlot[];
  hotbar: InventorySlot[];
  equipment: Equipment;
  isAttacking: boolean;
  attackTimer: number;
  invincibleTimer: number;
  currentTool: number;
  stamina: number;
  maxStamina: number;
  exhaustionTimer: number;
  isExhausted: boolean;
}

export interface WorldState {
  seed: number;
  chunks: Map<string, number[]>;
  resources: WorldEntity[];
  enemies: EnemyEntity[];
  npcs: NpcEntity[];
  droppedItems: DroppedItem[];
}

export interface GameTime {
  totalTicks: number;
  dayTicks: number;
  dayLength: number;
  hour: number;
  minute: number;
  day: number;
  season: Season;
  weather: Weather;
  weatherTimer: number;
  isNight: boolean;
}

export interface GameSettings {
  musicVolume: number;
  sfxVolume: number;
  showMinimap: boolean;
  showDamageNumbers: boolean;
}

export interface Notification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'item' | 'quest';
  timestamp: number;
  duration: number;
}

// ── Runtime Entity Types ──────────────────────────────────────────
export interface EnemyEntity extends WorldEntity {
  definition: EnemyDefinition;
  hp: number;
  maxHp: number;
  state: 'idle' | 'patrol' | 'chase' | 'attack' | 'hurt' | 'dead';
  direction: Vec2;
  targetId: string | null;
  attackCooldown: number;
  patrolTimer: number;
  patrolDirection: Vec2;
  knockback: Vec2;
  deathTimer: number;
}

export interface NpcEntity extends WorldEntity {
  definition: NpcDefinition;
  dialogueIndex: number;
}

export interface DroppedItem {
  id: string;
  itemId: string;
  count: number;
  x: number;
  y: number;
  velocity: Vec2;
  lifetime: number;
  /** Rarity override (if boosted by weapon power on kill) */
  rarity?: Rarity;
}

export interface DamageNumber {
  x: number;
  y: number;
  value: number;
  isCrit: boolean;
  isHeal: boolean;
  timer: number;
  velocity: Vec2;
}

export type ParticleEffectType = 'spark' | 'leaf' | 'wood_chip' | 'dust' | 'firefly' | 'magic' | 'hit_flash' | 'heal' | 'smoke' | 'debris' | 'water_splash' | 'harvest' | 'craft_sparkle' | 'level_up' | 'blood' | 'ember' | 'sawdust';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  /** Effect type for visual variety */
  effectType?: ParticleEffectType;
  /** Base Y for ambient particles to float around */
  baseY?: number;
  /** Phase for periodic effects */
  phase?: number;
  /** Secondary color for gradient particles */
  color2?: string;
}

/** Ambient light level (0=dark, 1=bright) */
export function getAmbientLightLevel(gameTime: GameTime, inCave: boolean): number {
  if (inCave) return 0.08; // Very dark underground
  const { hour } = gameTime;
  if (hour >= 8 && hour <= 18) return 1.0;
  if (hour >= 6 && hour < 8) {
    // Dawn transition
    return 0.3 + (hour - 6) / 2 * 0.7;
  }
  if (hour > 18 && hour <= 20) {
    // Dusk transition
    return 0.3 + (20 - hour) / 2 * 0.7;
  }
  // Night (20-24, 0-6)
  return 0.15 + Math.sin((hour < 6 ? hour + 24 : hour) / 24 * Math.PI * 2) * 0.08;
}

/** Get the color overlay for current time of day — subtle color temperature only */
export function getDayNightColor(hour: number): string {
  if (hour >= 8 && hour <= 18) return 'rgba(0,0,0,0)'; // Day — no tint
  if (hour >= 4 && hour < 8) {
    // Dawn: warm orange tint fading out (04:00-08:00)
    const t = (hour - 4) / 4;
    return `rgba(255, 120, 50, ${0.04 * (1 - t)})`;
  }
  if (hour > 18 && hour <= 22) {
    // Dusk: warm orange tint growing in (18:00-22:00)
    const t = (hour - 18) / 4;
    return `rgba(255, 100, 40, ${t * 0.05})`;
  }
  // Night (22:00-04:00): very subtle cool blue tint
  return 'rgba(20, 30, 60, 0.06)';
}

/** Get warm interior lighting overlay */
export function getInteriorLight(): string {
  return 'rgba(255,180,60,0.12)';
}

// ── UI State ──────────────────────────────────────────────────────
export type PanelType = 'inventory' | 'crafting' | 'skills' | 'quests' | 'shop' | 'dialogue' | 'forge' | 'save' | 'achievements' | 'furnace' | 'sleep' | 'none';

export interface GameUIState {
  activePanel: PanelType;
  activeShopNpc: NpcEntity | null;
  activeDialogueNpc: NpcEntity | null;
  craftingCategory: ItemCategory;
  showMap: boolean;
  dragItem: { slot: number; inventory: 'main' | 'hotbar' | 'equipment' } | null;
  hoveredItem: ItemDefinition | null;
  tooltipPosition: Vec2;
  /** ID of the currently active furnace structure */
  activeFurnaceId: string | null;
  /** If true, show identification panel in crafting (set by Identifier NPC) */
  showIdentify?: boolean;
}

// ── Constants ─────────────────────────────────────────────────────
export const TILE_SIZE = 32;
export const CHUNK_SIZE = 16;
export const WORLD_WIDTH = 200;
export const WORLD_HEIGHT = 200;
export const PLAYER_SPEED = 120;
export const PLAYER_SIZE = 24;
export const DAY_LENGTH = 24000;
export const TICK_RATE = 60;
export const INVENTORY_SIZE = 36;
export const HOTBAR_SIZE = 9;
export const INTERACT_RANGE = 48;
export const ATTACK_RANGE = 40;

// ── Rarity Colors ─────────────────────────────────────────────────
export const RARITY_COLORS: Record<Rarity, string> = {
  [Rarity.Common]: '#b0b0b0',
  [Rarity.Uncommon]: '#4caf50',
  [Rarity.Rare]: '#2196f3',
  [Rarity.Epic]: '#9c27b0',
  [Rarity.Legendary]: '#ff9800',
};

export const RARITY_WEIGHTS: Record<Rarity, number> = {
  [Rarity.Common]: 50,
  [Rarity.Uncommon]: 30,
  [Rarity.Rare]: 14,
  [Rarity.Epic]: 5,
  [Rarity.Legendary]: 1,
};

// ── Random Affix System ──────────────────────────────────────────
export const AffixType = {
  // Weapon prefixes
  Sharp: 'sharp',        // +dano
  Mighty: 'mighty',      // +força
  Swift: 'swift',        // +velocidade
  Precise: 'precise',    // +precisão/crit
  Flaming: 'flaming',    // +dano fogo
  Icy: 'icy',           // +dano gelo
  Venomous: 'venomous',  // +dano veneno
  Arcane: 'arcane',      // +dano mágico
  // Armor prefixes
  Sturdy: 'sturdy',      // +defesa
  Guarding: 'guarding',  // +defesa
  Resilient: 'resilient',// +vida máxima
  Vital: 'vital',        // +vida máxima
  Nimble: 'nimble',      // +velocidade/esquiva
  Fortified: 'fortified',// +defesa +vida
  // Universal suffixes
  OfPower: 'ofPower',       // +dano
  OfProtection: 'ofProtection', // +defesa
  OfVitality: 'ofVitality',    // +vida
  OfSpeed: 'ofSpeed',         // +velocidade
  OfLuck: 'ofLuck',           // +sorte
  OfMining: 'ofMining',       // +mineração
  OfWoodcutting: 'ofWoodcutting', // +corte
  OfFarming: 'ofFarming',     // +fazenda
  OfFishing: 'ofFishing',     // +pesca
  OfTheBear: 'ofTheBear',     // +força +defesa
  OfTheWolf: 'ofTheWolf',     // +dano +velocidade
} as const;
export type AffixType = typeof AffixType[keyof typeof AffixType];

export interface ItemAffix {
  type: AffixType;
  name: string;
  stat: keyof PlayerAttributes | 'damage' | 'defense';
  value: number;
  tier: number; // 1-5, higher = better
}

export interface AffixDefinition {
  type: AffixType;
  name: string;
  stat: keyof PlayerAttributes | 'damage' | 'defense';
  slotTypes: ('weapon' | 'armor' | 'tool' | 'ring' | 'amulet' | 'boots' | 'chest' | 'helmet' | 'gloves' | 'pickaxe' | 'axe' | 'hoe' | 'fishingRod' | 'sword' | 'bow' | 'spear' | 'hammer')[];
  minTier: number;
  maxTier: number;
  baseValue: number; // value per tier
}

export const AFFIX_DEFINITIONS: AffixDefinition[] = [
  // ── Weapon Prefixes ──
  { type: AffixType.Sharp, name: 'Afiado', stat: 'damage', slotTypes: ['weapon', 'tool'], minTier: 1, maxTier: 5, baseValue: 2 },
  { type: AffixType.Mighty, name: 'Possante', stat: 'strength', slotTypes: ['weapon'], minTier: 1, maxTier: 5, baseValue: 2 },
  { type: AffixType.Swift, name: 'Ágil', stat: 'speed', slotTypes: ['weapon', 'tool'], minTier: 1, maxTier: 5, baseValue: 3 },
  { type: AffixType.Precise, name: 'Preciso', stat: 'damage', slotTypes: ['weapon'], minTier: 2, maxTier: 5, baseValue: 3 },
  { type: AffixType.Flaming, name: 'Chamejante', stat: 'damage', slotTypes: ['weapon'], minTier: 3, maxTier: 5, baseValue: 4 },
  { type: AffixType.Icy, name: 'Gélido', stat: 'defense', slotTypes: ['weapon', 'armor'], minTier: 3, maxTier: 5, baseValue: 3 },
  { type: AffixType.Venomous, name: 'Venenoso', stat: 'damage', slotTypes: ['weapon'], minTier: 2, maxTier: 4, baseValue: 3 },
  { type: AffixType.Arcane, name: 'Arcano', stat: 'damage', slotTypes: ['weapon', 'ring', 'amulet'], minTier: 4, maxTier: 5, baseValue: 5 },

  // ── Armor Prefixes ──
  { type: AffixType.Sturdy, name: 'Robusto', stat: 'defense', slotTypes: ['armor'], minTier: 1, maxTier: 5, baseValue: 2 },
  { type: AffixType.Guarding, name: 'Protetor', stat: 'defense', slotTypes: ['armor', 'ring', 'amulet'], minTier: 2, maxTier: 5, baseValue: 3 },
  { type: AffixType.Resilient, name: 'Resistente', stat: 'maxHp', slotTypes: ['armor'], minTier: 1, maxTier: 5, baseValue: 8 },
  { type: AffixType.Vital, name: 'Vital', stat: 'maxHp', slotTypes: ['armor', 'ring', 'amulet'], minTier: 2, maxTier: 5, baseValue: 12 },
  { type: AffixType.Nimble, name: 'Ágil', stat: 'speed', slotTypes: ['armor', 'boots'], minTier: 1, maxTier: 5, baseValue: 3 },
  { type: AffixType.Fortified, name: 'Fortificado', stat: 'defense', slotTypes: ['armor'], minTier: 3, maxTier: 5, baseValue: 4 },

  // ── Universal Suffixes ──
  { type: AffixType.OfPower, name: 'do Poder', stat: 'damage', slotTypes: ['weapon', 'tool'], minTier: 1, maxTier: 5, baseValue: 2 },
  { type: AffixType.OfProtection, name: 'da Proteção', stat: 'defense', slotTypes: ['armor', 'ring', 'amulet'], minTier: 1, maxTier: 5, baseValue: 2 },
  { type: AffixType.OfVitality, name: 'da Vitalidade', stat: 'maxHp', slotTypes: ['armor', 'ring', 'amulet'], minTier: 1, maxTier: 5, baseValue: 10 },
  { type: AffixType.OfSpeed, name: 'da Velocidade', stat: 'speed', slotTypes: ['boots', 'ring'], minTier: 1, maxTier: 5, baseValue: 3 },
  { type: AffixType.OfLuck, name: 'da Sorte', stat: 'luck', slotTypes: ['ring', 'amulet', 'armor'], minTier: 1, maxTier: 5, baseValue: 2 },
  { type: AffixType.OfMining, name: 'da Mineração', stat: 'mining', slotTypes: ['tool', 'pickaxe'], minTier: 1, maxTier: 5, baseValue: 2 },
  { type: AffixType.OfWoodcutting, name: 'do Corte', stat: 'woodcutting', slotTypes: ['tool', 'axe'], minTier: 1, maxTier: 5, baseValue: 2 },
  { type: AffixType.OfFarming, name: 'da Fazenda', stat: 'farming', slotTypes: ['tool', 'hoe'], minTier: 1, maxTier: 4, baseValue: 2 },
  { type: AffixType.OfFishing, name: 'da Pesca', stat: 'fishing', slotTypes: ['tool', 'fishingRod'], minTier: 1, maxTier: 4, baseValue: 2 },
  { type: AffixType.OfTheBear, name: 'do Urso', stat: 'strength', slotTypes: ['weapon', 'armor'], minTier: 3, maxTier: 5, baseValue: 3 },
  { type: AffixType.OfTheWolf, name: 'do Lobo', stat: 'damage', slotTypes: ['weapon'], minTier: 3, maxTier: 5, baseValue: 3 },
];

// Get affixes for a specific slot type
const slotCategoryMap: Record<string, string[]> = {
  weapon: ['weapon'],
  tool: ['tool'],
  armor: ['armor'],
  ring: ['ring'],
  amulet: ['amulet'],
  boots: ['armor', 'boots'],
  chest: ['armor'],
  helmet: ['armor'],
  gloves: ['armor'],
  pickaxe: ['tool', 'pickaxe'],
  axe: ['tool', 'axe'],
  hoe: ['tool', 'hoe'],
  fishingRod: ['tool', 'fishingRod'],
  sword: ['weapon'],
  bow: ['weapon'],
  spear: ['weapon'],
  hammer: ['weapon', 'tool'],
};

// Get affix definitions compatible with a given item category
const categoryToSlotType: Record<string, string> = {
  weapon: 'weapon', tool: 'tool',
  armor: 'armor', ring: 'ring', amulet: 'amulet',
};

const toolToSlotType: Record<string, string> = {
  sword: 'sword', bow: 'bow', spear: 'spear', hammer: 'hammer',
  pickaxe: 'pickaxe', axe: 'axe', hoe: 'hoe', fishingRod: 'fishingRod',
};

// Get valid affix slot types for an item
export function getAffixSlotTypes(item: ItemDefinition): string[] {
  if (item.category === 'weapon') return ['weapon', item.toolType ? toolToSlotType[item.toolType] || 'weapon' : 'weapon'];
  if (item.category === 'tool') return ['tool', item.toolType ? toolToSlotType[item.toolType] || 'tool' : 'tool'];
  if (item.category === 'armor') return ['armor', item.armorSlot || 'armor'];
  if (item.category === 'ring') return ['ring'];
  if (item.category === 'amulet') return ['amulet'];
  return [];
}

export function getAffixStatValue(affix: AffixDefinition, tier: number): number {
  return affix.baseValue * tier + Math.floor(affix.baseValue * (tier - 1) * 0.3);
}

// Calculate total power score for an item with affixes
export function computeItemPowerScore(item: ItemDefinition, affixes: ItemAffix[] = []): number {
  let score = 0;
  if (item.damage) score += item.damage * 2;
  if (item.defense) score += item.defense * 2;
  if (item.speed) score += item.speed;
  if (item.miningPower) score += item.miningPower;
  if (item.choppingPower) score += item.choppingPower;

  // Add affix contributions
  for (const affix of affixes) {
    if (affix.stat === 'damage') score += affix.value * 2;
    else if (affix.stat === 'defense') score += affix.value * 2;
    else if (affix.stat === 'maxHp') score += affix.value * 0.5;
    else if (affix.stat === 'speed') score += affix.value;
    else if (affix.stat === 'strength') score += affix.value * 1.5;
    else if (affix.stat === 'luck') score += affix.value;
    else if (affix.stat === 'mining') score += affix.value * 0.8;
    else if (affix.stat === 'woodcutting') score += affix.value * 0.8;
    else if (affix.stat === 'farming') score += affix.value * 0.5;
    else if (affix.stat === 'fishing') score += affix.value * 0.5;
    else score += affix.value;
  }

  return Math.round(score);
}

// Generate random affixes for an item based on its rarity
export function generateItemAffixes(item: ItemDefinition, seed?: number): ItemAffix[] {
  const affixes: ItemAffix[] = [];
  const slotTypes = getAffixSlotTypes(item);
  if (slotTypes.length === 0) return affixes;

  // Determine number of affixes based on rarity
  let numAffixes = 0;
  switch (item.rarity) {
    case 'common': numAffixes = 0; break;
    case 'uncommon': numAffixes = (Math.random() < 0.5) ? 1 : 0; break; // 50% chance of 1 affix
    case 'rare': numAffixes = 1 + Math.floor(Math.random() * 2); break; // 1-2 affixes
    case 'epic': numAffixes = 2 + Math.floor(Math.random() * 2); break; // 2-3 affixes
    case 'legendary': numAffixes = 3 + Math.floor(Math.random() * 2); break; // 3-4 affixes
  }

  if (numAffixes === 0) return affixes;

  // Filter available affixes for this item
  const available = AFFIX_DEFINITIONS.filter(def =>
    def.slotTypes.some(st => slotTypes.includes(st)) &&
    def.minTier <= Math.max(1, Math.floor(item.rarity === 'rare' ? 2 : item.rarity === 'epic' ? 3 : item.rarity === 'legendary' ? 4 : 1))
  );

  if (available.length === 0) return affixes;

  // Select random affixes (no duplicates)
  const usedTypes = new Set<string>();
  const maxAttempts = Math.min(numAffixes, available.length);
  let attempts = 0;

  while (affixes.length < maxAttempts && attempts < 15) {
    attempts++;
    const def = available[Math.floor(Math.random() * available.length)];
    if (usedTypes.has(def.type)) continue;
    usedTypes.add(def.type);

    // Determine tier based on rarity
    const maxTier = item.rarity === 'common' ? 1 : item.rarity === 'uncommon' ? 2 : item.rarity === 'rare' ? 3 : item.rarity === 'epic' ? 4 : 5;
    const tier = Math.min(def.maxTier, Math.max(def.minTier, 1 + Math.floor(Math.random() * maxTier)));
    const value = getAffixStatValue(def, tier);

    affixes.push({
      type: def.type,
      name: def.name,
      stat: def.stat,
      value,
      tier,
    });
  }

  return affixes;
}

// Get affix display string (prefix + name + suffix)
export function getAffixedItemName(item: ItemDefinition, affixes: ItemAffix[]): string {
  if (affixes.length === 0) return item.name;

  const prefixes = affixes.filter(a => !a.name.startsWith('do '));
  const suffixes = affixes.filter(a => a.name.startsWith('do '));

  let name = item.name;
  if (prefixes.length > 0) {
    name = `${prefixes[0].name} ${name}`;
  }
  if (suffixes.length > 0) {
    name = `${name} ${suffixes[0].name}`;
  }

  return name;
}

// ── Achievement System ────────────────────────────────────────────
export type AchievementCategory = 'exploration' | 'combat' | 'gathering' | 'farming' | 'crafting' | 'progression' | 'special';

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  condition: (state: { playerLevel: number; stats: PlayerStats; enemiesKilled: number; woodGathered: number; oreGathered: number; cropsHarvested: number; itemsCrafted: number; goldEarned: number; daysSurvived: number; biomesDiscovered: number; hasEnteredCave: boolean; hasBuiltHouse: boolean; hasDied: boolean; fishCaught: number; structuresBuilt: number; totalXpGained: number }) => boolean;
}

export interface AchievementProgress {
  id: string;
  unlocked: boolean;
  unlockedAt: number;
}

// ── Achievement Definitions ──
export type AchievementCheckState = {
  playerLevel: number;
  stats: PlayerStats;
  enemiesKilled: number;
  woodGathered: number;
  oreGathered: number;
  cropsHarvested: number;
  itemsCrafted: number;
  goldEarned: number;
  daysSurvived: number;
  biomesDiscovered: number;
  hasEnteredCave: boolean;
  hasBuiltHouse: boolean;
  hasDied: boolean;
  fishCaught: number;
  structuresBuilt: number;
  totalXpGained: number;
};

export const ACHIEVEMENTS: AchievementDefinition[] = [
  // ── Progression ──
  { id: 'first_steps', name: 'Primeiros Passos', description: 'Atingir o nível 3', icon: '🌱', category: 'progression',
    condition: (s) => s.playerLevel >= 3 },
  { id: 'survivor', name: 'Sobrevivente', description: 'Atingir o nível 10', icon: '⭐', category: 'progression',
    condition: (s) => s.playerLevel >= 10 },
  { id: 'veteran', name: 'Veterano', description: 'Atingir o nível 25', icon: '⚡', category: 'progression',
    condition: (s) => s.playerLevel >= 25 },
  { id: 'legend', name: 'Lenda Viva', description: 'Atingir o nível 50', icon: '👑', category: 'progression',
    condition: (s) => s.playerLevel >= 50 },
  { id: 'rich', name: 'Rico', description: 'Acumular 1000 de ouro', icon: '💰', category: 'progression',
    condition: (s) => s.goldEarned >= 1000 },
  { id: 'millionaire', name: 'Milionário', description: 'Acumular 10000 de ouro', icon: '💎', category: 'progression',
    condition: (s) => s.goldEarned >= 10000 },
  { id: 'xp_master', name: 'Mestre da Experiência', description: 'Ganhar 5000 XP total', icon: '✨', category: 'progression',
    condition: (s) => s.totalXpGained >= 5000 },
  
  // ── Combat ──
  { id: 'hunter', name: 'Caçador', description: 'Derrotar 10 inimigos', icon: '🏹', category: 'combat',
    condition: (s) => s.enemiesKilled >= 10 },
  { id: 'slayer', name: 'Exterminador', description: 'Derrotar 50 inimigos', icon: '⚔️', category: 'combat',
    condition: (s) => s.enemiesKilled >= 50 },
  { id: 'berserker', name: 'Berserker', description: 'Derrotar 200 inimigos', icon: '💀', category: 'combat',
    condition: (s) => s.enemiesKilled >= 200 },
  { id: 'first_blood', name: 'Primeira Morte', description: 'Morrer pela primeira vez', icon: '😵', category: 'combat',
    condition: (s) => s.hasDied },

  // ── Gathering ──
  { id: 'lumberjack', name: 'Lenhador', description: 'Coletar 100 madeiras', icon: '🪓', category: 'gathering',
    condition: (s) => s.woodGathered >= 100 },
  { id: 'wood_baron', name: 'Barão da Madeira', description: 'Coletar 1000 madeiras', icon: '🌲', category: 'gathering',
    condition: (s) => s.woodGathered >= 1000 },
  { id: 'miner', name: 'Minerador', description: 'Coletar 50 minérios', icon: '⛏️', category: 'gathering',
    condition: (s) => s.oreGathered >= 50 },
  { id: 'deep_miner', name: 'Minerador Profundo', description: 'Coletar 500 minérios', icon: '🪨', category: 'gathering',
    condition: (s) => s.oreGathered >= 500 },
  { id: 'fisher', name: 'Pescador', description: 'Pegar 20 peixes', icon: '🎣', category: 'gathering',
    condition: (s) => s.fishCaught >= 20 },
  { id: 'master_fisher', name: 'Mestre Pescador', description: 'Pegar 100 peixes', icon: '🐟', category: 'gathering',
    condition: (s) => s.fishCaught >= 100 },
  
  // ── Farming ──
  { id: 'farmer', name: 'Fazendeiro', description: 'Colher 30 plantações', icon: '🌾', category: 'farming',
    condition: (s) => s.cropsHarvested >= 30 },
  { id: 'master_farmer', name: 'Mestre Agricultor', description: 'Colher 200 plantações', icon: '🌿', category: 'farming',
    condition: (s) => s.cropsHarvested >= 200 },

  // ── Crafting ──
  { id: 'crafter', name: 'Artesão', description: 'Craftar 20 itens', icon: '🔨', category: 'crafting',
    condition: (s) => s.itemsCrafted >= 20 },
  { id: 'master_crafter', name: 'Mestre Artesão', description: 'Craftar 100 itens', icon: '🔧', category: 'crafting',
    condition: (s) => s.itemsCrafted >= 100 },
  { id: 'builder', name: 'Construtor', description: 'Construir 5 estruturas', icon: '🏗️', category: 'crafting',
    condition: (s) => s.structuresBuilt >= 5 },

  // ── Exploration ──
  { id: 'explorer', name: 'Explorador', description: 'Descobrir 5 áreas', icon: '🧭', category: 'exploration',
    condition: (s) => s.biomesDiscovered >= 5 },
  { id: 'adventurer', name: 'Aventureiro', description: 'Descobrir 15 áreas', icon: '🗺️', category: 'exploration',
    condition: (s) => s.biomesDiscovered >= 15 },
  { id: 'cave_diver', name: 'Explorador de Cavernas', description: 'Entrar na caverna', icon: '🕳️', category: 'exploration',
    condition: (s) => s.hasEnteredCave },
  { id: 'survivor_week', name: 'Uma Semana', description: 'Sobreviver por 7 dias', icon: '📅', category: 'exploration',
    condition: (s) => s.daysSurvived >= 7 },
  { id: 'survivor_month', name: 'Um Mês', description: 'Sobreviver por 30 dias', icon: '🗓️', category: 'exploration',
    condition: (s) => s.daysSurvived >= 30 },

  // ── Special ──
  { id: 'home_sweet_home', name: 'Lar Doce Lar', description: 'Construir uma casa', icon: '🏠', category: 'special',
    condition: (s) => s.hasBuiltHouse },
  { id: 'first_craft', name: 'Primeiro Craft', description: 'Craftar seu primeiro item', icon: '🔨', category: 'special',
    condition: (s) => s.itemsCrafted >= 1 },
  { id: 'golden_fish', name: 'Pescador Sortudo', description: 'Pegar um peixe dourado', icon: '🐠', category: 'special',
    condition: (s) => s.fishCaught >= 1 }, // Will be tracked separately in fishing
];
