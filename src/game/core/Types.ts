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

// ── Enums ─────────────────────────────────────────────────────────
export enum Biome {
  Forest = 'forest',
  Plains = 'plains',
  Mountains = 'mountains',
  Swamp = 'swamp',
  Desert = 'desert',
  Tundra = 'tundra',
  Cave = 'cave',
  Ruins = 'ruins',
  Village = 'village',
  Lake = 'lake',
  River = 'river',
}

export enum TileType {
  Grass = 0,
  Dirt = 1,
  Sand = 2,
  Water = 3,
  DeepWater = 4,
  Stone = 5,
  Snow = 6,
  SwampWater = 7,
  Path = 8,
  Wall = 9,
  Floor = 10,
  CaveFloor = 11,
  CaveWall = 12,
  Lava = 13,
}

export enum Season {
  Spring = 'spring',
  Summer = 'summer',
  Autumn = 'autumn',
  Winter = 'winter',
}

export enum Weather {
  Clear = 'clear',
  Rain = 'rain',
  HeavyRain = 'heavyRain',
  Fog = 'fog',
  Snow = 'snow',
  Storm = 'storm',
}

export enum Rarity {
  Common = 'common',
  Uncommon = 'uncommon',
  Rare = 'rare',
  Epic = 'epic',
  Legendary = 'legendary',
}

export enum ResourceType {
  Wood = 'wood',
  Stone = 'stone',
  IronOre = 'ironOre',
  GoldOre = 'goldOre',
  Coal = 'coal',
  Crystal = 'crystal',
  Plant = 'plant',
  Fruit = 'fruit',
  Leather = 'leather',
  Bone = 'bone',
  Gem = 'gem',
  Fiber = 'fiber',
  Clay = 'clay',
}

export enum ItemCategory {
  Tool = 'tool',
  Weapon = 'weapon',
  Armor = 'armor',
  Consumable = 'consumable',
  Material = 'material',
  Quest = 'quest',
  Seed = 'seed',
  Fish = 'fish',
  Furniture = 'furniture',
  Ring = 'ring',
  Amulet = 'amulet',
}

export enum ToolType {
  Axe = 'axe',
  Pickaxe = 'pickaxe',
  Sword = 'sword',
  Bow = 'bow',
  Torch = 'torch',
  Scythe = 'scythe',
  Hammer = 'hammer',
  FishingRod = 'fishingRod',
  Hoe = 'hoe',
}

export enum ArmorSlot {
  Helmet = 'helmet',
  Chest = 'chest',
  Boots = 'boots',
  Gloves = 'gloves',
  Ring = 'ring',
  Amulet = 'amulet',
}

export enum EnemyType {
  Wolf = 'wolf',
  Boar = 'boar',
  Slime = 'slime',
  Skeleton = 'skeleton',
  Spider = 'spider',
  Golem = 'golem',
  Bat = 'bat',
  DarkKnight = 'darkKnight',
  Dragon = 'dragon',
  SlimeKing = 'slimeKing',
  ShadowLord = 'shadowLord',
}

export enum NpcType {
  Merchant = 'merchant',
  Blacksmith = 'blacksmith',
  Farmer = 'farmer',
  Alchemist = 'alchemist',
  Hunter = 'hunter',
  QuestGiver = 'questGiver',
}

export enum SkillTree {
  Survival = 'survival',
  Combat = 'combat',
  Gathering = 'gathering',
  Crafting = 'crafting',
  Exploration = 'exploration',
}

export enum AttackType {
  Light = 'light',
  Heavy = 'heavy',
  Ranged = 'ranged',
}

export enum QuestType {
  Main = 'main',
  Side = 'side',
  Daily = 'daily',
  Weekly = 'weekly',
}

export enum QuestStatus {
  Available = 'available',
  Active = 'active',
  Completed = 'completed',
  Failed = 'failed',
}

// ── Interfaces ────────────────────────────────────────────────────
export interface ItemDefinition {
  id: string;
  name: string;
  description: string;
  category: ItemCategory;
  rarity: Rarity;
  stackSize: number;
  weight: number;
  value: number; // gold value
  icon: string; // emoji icon
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
  result: string; // item id
  resultCount: number;
  ingredients: { itemId: string; count: number }[];
  requiredLevel: number;
  craftTime: number; // ms
  station?: string; // required station item id
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
  attackSpeed: number; // ms between attacks
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
  shopItems?: string[]; // item ids
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
  cost: number; // skill points per level
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
  growthStage: number; // 0-4
  growthProgress: number; // 0-1
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
  skills: { [skillId: string]: number }; // skill id -> level
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
  currentTool: number; // hotbar index
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
  dayLength: number; // ticks per day
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
export type PanelType = 'inventory' | 'crafting' | 'skills' | 'quests' | 'shop' | 'dialogue' | 'none';

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
export const CHUNK_SIZE = 16; // tiles per chunk
export const WORLD_WIDTH = 200; // tiles
export const WORLD_HEIGHT = 200; // tiles
export const PLAYER_SPEED = 120; // pixels per second
export const PLAYER_SIZE = 24;
export const DAY_LENGTH = 24000; // ticks per full day (about 10 real minutes at 4 ticks/sec)
export const TICK_RATE = 60; // ticks per second
export const INVENTORY_SIZE = 36; // 9 hotbar + 27 main
export const HOTBAR_SIZE = 9;
export const INTERACT_RANGE = 48;
export const ATTACK_RANGE = 40;
