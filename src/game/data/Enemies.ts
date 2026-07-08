// ═══════════════════════════════════════════════════════════════════
// Farm Survival - Enemy Definitions
// ═══════════════════════════════════════════════════════════════════

import { EnemyDefinition, EnemyType, Biome } from '../core/Types';

export const ENEMIES: Record<EnemyType, EnemyDefinition> = {
  [EnemyType.Slime]: {
    type: EnemyType.Slime, name: 'Slime', hp: 20, damage: 3, defense: 1,
    speed: 40, xpReward: 10, level: 1, aggroRange: 120, attackRange: 24,
    attackSpeed: 1500, color: '#4caf50', icon: '🟢', size: 20, behavior: 'chase',
    biomes: [Biome.Forest, Biome.Plains],
    loot: [
      { itemId: 'slime_gel', chance: 0.8, minCount: 1, maxCount: 3 },
      { itemId: 'apple', chance: 0.2, minCount: 1, maxCount: 1 },
    ],
  },
  [EnemyType.Wolf]: {
    type: EnemyType.Wolf, name: 'Lobo', hp: 40, damage: 8, defense: 2,
    speed: 70, xpReward: 25, level: 3, aggroRange: 160, attackRange: 28,
    attackSpeed: 1200, color: '#6d4c41', icon: '🐺', size: 24, behavior: 'chase',
    biomes: [Biome.Forest, Biome.Mountains],
    loot: [
      { itemId: 'leather', chance: 0.6, minCount: 1, maxCount: 2 },
      { itemId: 'bone', chance: 0.4, minCount: 1, maxCount: 2 },
      { itemId: 'raw_meat', chance: 0.7, minCount: 1, maxCount: 2 },
    ],
  },
  [EnemyType.Boar]: {
    type: EnemyType.Boar, name: 'Javali', hp: 60, damage: 10, defense: 4,
    speed: 55, xpReward: 30, level: 4, aggroRange: 140, attackRange: 30,
    attackSpeed: 1400, color: '#5d4037', icon: '🐗', size: 28, behavior: 'chase',
    biomes: [Biome.Forest, Biome.Plains],
    loot: [
      { itemId: 'raw_meat', chance: 0.8, minCount: 1, maxCount: 3 },
      { itemId: 'leather', chance: 0.5, minCount: 1, maxCount: 3 },
      { itemId: 'bone', chance: 0.3, minCount: 1, maxCount: 2 },
    ],
  },
  [EnemyType.Spider]: {
    type: EnemyType.Spider, name: 'Aranha', hp: 25, damage: 6, defense: 1,
    speed: 60, xpReward: 15, level: 2, aggroRange: 130, attackRange: 24,
    attackSpeed: 1000, color: '#212121', icon: '🕷️', size: 18, behavior: 'chase',
    biomes: [Biome.Forest, Biome.Cave, Biome.Swamp],
    loot: [
      { itemId: 'spider_silk', chance: 0.6, minCount: 1, maxCount: 2 },
      { itemId: 'bone', chance: 0.3, minCount: 1, maxCount: 1 },
    ],
  },
  [EnemyType.Skeleton]: {
    type: EnemyType.Skeleton, name: 'Esqueleto', hp: 35, damage: 7, defense: 3,
    speed: 45, xpReward: 20, level: 3, aggroRange: 150, attackRange: 32,
    attackSpeed: 1300, color: '#e0e0e0', icon: '💀', size: 24, behavior: 'chase',
    biomes: [Biome.Cave, Biome.Ruins],
    loot: [
      { itemId: 'bone', chance: 0.7, minCount: 1, maxCount: 3 },
      { itemId: 'dark_essence', chance: 0.1, minCount: 1, maxCount: 1 },
      { itemId: 'iron_ore', chance: 0.15, minCount: 1, maxCount: 2 },
    ],
  },
  [EnemyType.Bat]: {
    type: EnemyType.Bat, name: 'Morcego', hp: 15, damage: 4, defense: 0,
    speed: 80, xpReward: 12, level: 2, aggroRange: 100, attackRange: 20,
    attackSpeed: 800, color: '#4a148c', icon: '🦇', size: 14, behavior: 'chase',
    biomes: [Biome.Cave, Biome.Swamp],
    loot: [
      { itemId: 'bone', chance: 0.3, minCount: 1, maxCount: 1 },
      { itemId: 'dark_essence', chance: 0.1, minCount: 1, maxCount: 1 },
    ],
  },
  [EnemyType.Golem]: {
    type: EnemyType.Golem, name: 'Golem', hp: 120, damage: 15, defense: 10,
    speed: 30, xpReward: 60, level: 7, aggroRange: 100, attackRange: 36,
    attackSpeed: 2000, color: '#78909c', icon: '🗿', size: 36, behavior: 'patrol',
    biomes: [Biome.Mountains, Biome.Ruins],
    loot: [
      { itemId: 'stone', chance: 0.8, minCount: 3, maxCount: 6 },
      { itemId: 'iron_ore', chance: 0.4, minCount: 1, maxCount: 3 },
      { itemId: 'crystal', chance: 0.15, minCount: 1, maxCount: 1 },
    ],
  },
  [EnemyType.DarkKnight]: {
    type: EnemyType.DarkKnight, name: 'Cavaleiro Negro', hp: 80, damage: 14, defense: 8,
    speed: 50, xpReward: 50, level: 6, aggroRange: 160, attackRange: 34,
    attackSpeed: 1400, color: '#1a1a2e', icon: '⚫', size: 28, behavior: 'chase',
    biomes: [Biome.Ruins, Biome.Cave],
    loot: [
      { itemId: 'iron_ingot', chance: 0.5, minCount: 1, maxCount: 2 },
      { itemId: 'dark_essence', chance: 0.3, minCount: 1, maxCount: 2 },
      { itemId: 'shadow_fragment', chance: 0.1, minCount: 1, maxCount: 1 },
    ],
  },
  [EnemyType.Dragon]: {
    type: EnemyType.Dragon, name: 'Dragão', hp: 500, damage: 35, defense: 15,
    speed: 60, xpReward: 500, level: 15, aggroRange: 200, attackRange: 60,
    attackSpeed: 2500, color: '#b71c1c', icon: '🐉', size: 48, behavior: 'ranged',
    biomes: [Biome.Mountains],
    loot: [
      { itemId: 'dragon_scale', chance: 1, minCount: 1, maxCount: 3 },
      { itemId: 'gold_ore', chance: 0.8, minCount: 3, maxCount: 6 },
      { itemId: 'crystal', chance: 0.5, minCount: 2, maxCount: 4 },
      { itemId: 'gem_ruby', chance: 0.3, minCount: 1, maxCount: 2 },
    ],
  },
  // Mini Bosses
  [EnemyType.SlimeKing]: {
    type: EnemyType.SlimeKing, name: 'Rei Slime', hp: 200, damage: 12, defense: 5,
    speed: 45, xpReward: 100, level: 5, aggroRange: 180, attackRange: 40,
    attackSpeed: 1600, color: '#1b5e20', icon: '👑', size: 40, behavior: 'patrol',
    biomes: [Biome.Forest],
    loot: [
      { itemId: 'slime_gel', chance: 1, minCount: 5, maxCount: 10 },
      { itemId: 'potion_hp', chance: 0.5, minCount: 1, maxCount: 2 },
      { itemId: 'ring_of_speed', chance: 0.1, minCount: 1, maxCount: 1 },
      { itemId: 'gold_coin', chance: 1, minCount: 10, maxCount: 25 },
    ],
  },
  [EnemyType.ShadowLord]: {
    type: EnemyType.ShadowLord, name: 'Lorde das Sombras', hp: 400, damage: 25, defense: 12,
    speed: 55, xpReward: 300, level: 12, aggroRange: 200, attackRange: 50,
    attackSpeed: 1800, color: '#0d0d2b', icon: '🌑', size: 44, behavior: 'ranged',
    biomes: [Biome.Cave],
    loot: [
      { itemId: 'shadow_fragment', chance: 1, minCount: 3, maxCount: 5 },
      { itemId: 'dark_essence', chance: 1, minCount: 3, maxCount: 6 },
      { itemId: 'crystal', chance: 0.6, minCount: 2, maxCount: 4 },
      { itemId: 'gem_sapphire', chance: 0.2, minCount: 1, maxCount: 1 },
      { itemId: 'gold_coin', chance: 1, minCount: 25, maxCount: 50 },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // Cave Exclusive Enemies
  // ═══════════════════════════════════════════════════════════════
  [EnemyType.CaveTroll]: {
    type: EnemyType.CaveTroll, name: 'Troll das Cavernas', hp: 180, damage: 20, defense: 12,
    speed: 35, xpReward: 80, level: 8, aggroRange: 140, attackRange: 36,
    attackSpeed: 2000, color: '#5d4a3a', icon: '🧌', size: 36, behavior: 'chase',
    biomes: [Biome.Cave],
    loot: [
      { itemId: 'troll_skin', chance: 0.8, minCount: 1, maxCount: 2 },
      { itemId: 'bone', chance: 0.7, minCount: 2, maxCount: 4 },
      { itemId: 'mithril_ore', chance: 0.2, minCount: 1, maxCount: 2 },
      { itemId: 'gold_coin', chance: 0.5, minCount: 5, maxCount: 15 },
    ],
  },
  [EnemyType.GiantBat]: {
    type: EnemyType.GiantBat, name: 'Morcego Gigante', hp: 40, damage: 8, defense: 2,
    speed: 90, xpReward: 25, level: 5, aggroRange: 120, attackRange: 24,
    attackSpeed: 700, color: '#6a1b6a', icon: '🦇', size: 20, behavior: 'chase',
    biomes: [Biome.Cave],
    loot: [
      { itemId: 'dark_essence', chance: 0.4, minCount: 1, maxCount: 2 },
      { itemId: 'leather', chance: 0.3, minCount: 1, maxCount: 1 },
    ],
  },
  [EnemyType.CrystalGolem]: {
    type: EnemyType.CrystalGolem, name: 'Golem de Cristal', hp: 250, damage: 18, defense: 18,
    speed: 25, xpReward: 120, level: 10, aggroRange: 100, attackRange: 40,
    attackSpeed: 2200, color: '#4a8aaa', icon: '💎', size: 40, behavior: 'patrol',
    biomes: [Biome.Cave],
    loot: [
      { itemId: 'crystal', chance: 0.9, minCount: 3, maxCount: 6 },
      { itemId: 'forge_core', chance: 0.3, minCount: 1, maxCount: 2 },
      { itemId: 'lava_crystal', chance: 0.1, minCount: 1, maxCount: 1 },
      { itemId: 'mithril_ore', chance: 0.4, minCount: 1, maxCount: 3 },
    ],
  },
  [EnemyType.LavaSpider]: {
    type: EnemyType.LavaSpider, name: 'Aranha de Lava', hp: 60, damage: 14, defense: 5,
    speed: 65, xpReward: 45, level: 7, aggroRange: 150, attackRange: 28,
    attackSpeed: 900, color: '#d44400', icon: '🕷️', size: 22, behavior: 'chase',
    biomes: [Biome.Cave],
    loot: [
      { itemId: 'spider_silk', chance: 0.5, minCount: 1, maxCount: 2 },
      { itemId: 'lava_crystal', chance: 0.3, minCount: 1, maxCount: 2 },
      { itemId: 'ruby_ore', chance: 0.2, minCount: 1, maxCount: 1 },
    ],
  },
};

export function getEnemiesForBiome(biome: Biome, minLevel?: number, maxLevel?: number): EnemyDefinition[] {
  return Object.values(ENEMIES).filter(e => {
    if (!e.biomes.includes(biome)) return false;
    if (minLevel && e.level < minLevel) return false;
    if (maxLevel && e.level > maxLevel) return false;
    return true;
  });
}
