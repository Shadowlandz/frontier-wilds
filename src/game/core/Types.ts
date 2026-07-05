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
} as const;
export type EnemyType = typeof EnemyType[keyof typeof EnemyType];

export const NpcType = {
  Merchant: 'merchant',
  Blacksmith: 'blacksmith',
  Farmer: 'farmer',
  Alchemist: 'alchemist',
  Hunter: 'hunter',
  QuestGiver: 'questGiver',
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
}

export interface ItemEffect {
  type: 'heal' | 'buff' | 'damage' | 'speed' | 'hunger' | 'energy' | 'xp';
  value: number;
  duration?: number;
}

export interface PlayerAttributes {
  maxHp: number;
  maxHunger: number;
  maxEnergy: number;
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
  energy: number;
  maxHp: number;
  maxHunger: number;
  maxEnergy: number;
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
  size: number;
  behavior: 'patrol' | 'chase' | 'ranged' | 'stationary';
  biomes: Biome[];
}

export interface NpcDefinition {
  type: NpcType;
  name: string;
  dialogue: string[];
  shopItems?: string[];
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

export interface PlacedStructure {
  id: string;
  itemId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  health: number;
  maxHealth: number;
}

export interface FarmPlot {
  x: number;
  y: number;
  seedId: string | null;
  growthStage: number;
  growthProgress: number;
  watered: boolean;
  plantedAt: number;
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
  farmPlots: FarmPlot[];
  discoveredAreas: string[];
  gameTime: GameTime;
  settings: GameSettings;
  notifications: Notification[];
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

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

// ── UI State ──────────────────────────────────────────────────────
export type PanelType = 'inventory' | 'crafting' | 'skills' | 'quests' | 'shop' | 'dialogue' | 'save' | 'none';

export interface GameUIState {
  activePanel: PanelType;
  activeShopNpc: NpcEntity | null;
  activeDialogueNpc: NpcEntity | null;
  craftingCategory: ItemCategory;
  showMap: boolean;
  dragItem: { slot: number; inventory: 'main' | 'hotbar' | 'equipment' } | null;
  hoveredItem: ItemDefinition | null;
  tooltipPosition: Vec2;
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
