// ═══════════════════════════════════════════════════════════════════
// Farm Survival - World Generation & Tile Definitions
// ═══════════════════════════════════════════════════════════════════

import {
  Biome, TileType, TILE_SIZE, WORLD_WIDTH, WORLD_HEIGHT,
  EnemyType, Weather, Season, GameTime,
  Vec2,
} from '../core/Types';
import { fractalNoise, SeededRandom } from '../core/Utils';

// ── Tile Colors ───────────────────────────────────────────────────
export const TILE_COLORS: Record<TileType, string> = {
  [TileType.Grass]: '#4a7c3f',
  [TileType.Dirt]: '#8d6e4a',
  [TileType.Sand]: '#e8d68e',
  [TileType.Water]: '#4a90c2',
  [TileType.DeepWater]: '#2c5f8a',
  [TileType.Stone]: '#8a8a8a',
  [TileType.Snow]: '#e8ecf0',
  [TileType.SwampWater]: '#5a7a3a',
  [TileType.Path]: '#b09a7a',
  [TileType.Wall]: '#5a5a5a',
  [TileType.Floor]: '#a08060',
  [TileType.CaveFloor]: '#4a4a4a',
  [TileType.CaveWall]: '#2a2a2a',
  [TileType.Lava]: '#d44400',
};

// ── Biome Map Colors (for terrain variation) ──────────────────────
const BIOME_GRASS_COLORS: Record<Biome, string> = {
  [Biome.Forest]: '#3d6b34',
  [Biome.Plains]: '#5a9a4a',
  [Biome.Mountains]: '#6a7a6a',
  [Biome.Swamp]: '#4a6a2a',
  [Biome.Desert]: '#c4a862',
  [Biome.Tundra]: '#a8b8b0',
  [Biome.Cave]: '#3a3a3a',
  [Biome.Ruins]: '#7a6a5a',
  [Biome.Village]: '#6a9a5a',
  [Biome.Lake]: '#3a8ab0',
  [Biome.River]: '#4a90c2',
};

// ── World Generator ───────────────────────────────────────────────
export class WorldGenerator {
  private seed: number;
  private rng: SeededRandom;
  private biomeMap: Biome[][] = [];
  private tileMap: TileType[][] = [];
  private heightMap: number[][] = [];
  private moistureMap: number[][] = [];

  constructor(seed: number) {
    this.seed = seed;
    this.rng = new SeededRandom(seed);
  }

  generate(): { biomeMap: Biome[][]; tileMap: TileType[][]; heightMap: number[][] } {
    const w = WORLD_WIDTH;
    const h = WORLD_HEIGHT;

    // Initialize maps
    this.biomeMap = Array.from({ length: h }, () => Array(w).fill(Biome.Plains));
    this.tileMap = Array.from({ length: h }, () => Array(w).fill(TileType.Grass));
    this.heightMap = Array.from({ length: h }, () => Array(w).fill(0.5));
    this.moistureMap = Array.from({ length: h }, () => Array(w).fill(0.5));

    // Generate height and moisture maps
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        this.heightMap[y][x] = fractalNoise(x, y, this.seed, 4, 80);
        this.moistureMap[y][x] = fractalNoise(x, y, this.seed + 5000, 3, 60);
      }
    }

    // Assign biomes based on height and moisture
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        this.biomeMap[y][x] = this.getBiomeForTile(x, y);
      }
    }

    // Force village in the center area
    const cx = Math.floor(w / 2);
    const cy = Math.floor(h / 2);
    for (let dy = -8; dy <= 8; dy++) {
      for (let dx = -10; dx <= 10; dx++) {
        const tx = cx + dx;
        const ty = cy + dy;
        if (tx >= 0 && tx < w && ty >= 0 && ty < h) {
          this.biomeMap[ty][tx] = Biome.Village;
        }
      }
    }

    // Assign tiles based on biome
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        this.tileMap[y][x] = this.getTileForBiome(this.biomeMap[y][x], x, y);
      }
    }

    return { biomeMap: this.biomeMap, tileMap: this.tileMap, heightMap: this.heightMap };
  }

  private getBiomeForTile(x: number, y: number): Biome {
    const height = this.heightMap[y][x];
    const moisture = this.moistureMap[y][x];

    if (height < 0.28) return Biome.Lake;
    if (height < 0.35) {
      return moisture > 0.6 ? Biome.Swamp : Biome.Plains;
    }
    if (height > 0.78) return Biome.Mountains;
    if (height > 0.7) return Biome.Ruins;
    if (moisture > 0.65) return Biome.Forest;
    if (moisture < 0.3) return Biome.Desert;
    return Biome.Plains;
  }

  private getTileForBiome(biome: Biome, x: number, y: number): TileType {
    const noise = fractalNoise(x, y, this.seed + 1000, 2, 20);

    if (biome === Biome.Lake) return noise > 0.4 ? TileType.Water : TileType.DeepWater;
    if (biome === Biome.River) return TileType.Water;
    if (biome === Biome.Desert) return noise > 0.7 ? TileType.Stone : TileType.Sand;
    if (biome === Biome.Mountains) return noise > 0.5 ? TileType.Stone : TileType.Snow;
    if (biome === Biome.Swamp) return noise > 0.6 ? TileType.SwampWater : TileType.Grass;
    if (biome === Biome.Cave) return TileType.CaveFloor;
    if (biome === Biome.Ruins) return noise > 0.4 ? TileType.Floor : TileType.Stone;
    if (biome === Biome.Village) return noise > 0.7 ? TileType.Path : TileType.Grass;
    if (biome === Biome.Tundra) return noise > 0.5 ? TileType.Snow : TileType.Dirt;
    return noise > 0.8 ? TileType.Dirt : TileType.Grass;
  }

  generateResources(biomeMap: Biome[][]): { x: number; y: number; type: string; itemId: string }[] {
    const resources: { x: number; y: number; type: string; itemId: string }[] = [];
    const w = WORLD_WIDTH;
    const h = WORLD_HEIGHT;
    const rng = new SeededRandom(this.seed + 9999);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const biome = biomeMap[y][x];
        const n = rng.next();

        // Forest: trees, bushes, rocks
        if (biome === Biome.Forest) {
          if (n < 0.04) {
            resources.push({ x: x * TILE_SIZE + rng.range(0, TILE_SIZE), y: y * TILE_SIZE + rng.range(0, TILE_SIZE), type: 'tree', itemId: 'wood' });
          } else if (n < 0.06) {
            resources.push({ x: x * TILE_SIZE + rng.range(0, TILE_SIZE), y: y * TILE_SIZE + rng.range(0, TILE_SIZE), type: 'bush', itemId: 'apple' });
          } else if (n < 0.065) {
            resources.push({ x: x * TILE_SIZE + rng.range(0, TILE_SIZE), y: y * TILE_SIZE + rng.range(0, TILE_SIZE), type: 'rock', itemId: 'stone' });
          }
        }

        // Plains: fewer trees, berry bushes
        if (biome === Biome.Plains) {
          if (n < 0.02) {
            resources.push({ x: x * TILE_SIZE + rng.range(0, TILE_SIZE), y: y * TILE_SIZE + rng.range(0, TILE_SIZE), type: 'tree', itemId: 'wood' });
          } else if (n < 0.035) {
            resources.push({ x: x * TILE_SIZE + rng.range(0, TILE_SIZE), y: y * TILE_SIZE + rng.range(0, TILE_SIZE), type: 'bush', itemId: 'berry' });
          } else if (n < 0.04) {
            resources.push({ x: x * TILE_SIZE + rng.range(0, TILE_SIZE), y: y * TILE_SIZE + rng.range(0, TILE_SIZE), type: 'rock', itemId: 'stone' });
          }
        }

        // Mountains: iron, gold, crystal, stone
        if (biome === Biome.Mountains) {
          if (n < 0.03) {
            resources.push({ x: x * TILE_SIZE + rng.range(0, TILE_SIZE), y: y * TILE_SIZE + rng.range(0, TILE_SIZE), type: 'iron_rock', itemId: 'iron_ore' });
          } else if (n < 0.038) {
            resources.push({ x: x * TILE_SIZE + rng.range(0, TILE_SIZE), y: y * TILE_SIZE + rng.range(0, TILE_SIZE), type: 'gold_rock', itemId: 'gold_ore' });
          } else if (n < 0.045) {
            resources.push({ x: x * TILE_SIZE + rng.range(0, TILE_SIZE), y: y * TILE_SIZE + rng.range(0, TILE_SIZE), type: 'crystal_node', itemId: 'crystal' });
          } else if (n < 0.07) {
            resources.push({ x: x * TILE_SIZE + rng.range(0, TILE_SIZE), y: y * TILE_SIZE + rng.range(0, TILE_SIZE), type: 'rock', itemId: 'stone' });
          }
        }

        // Cave: iron, crystal, coal
        if (biome === Biome.Cave) {
          if (n < 0.03) {
            resources.push({ x: x * TILE_SIZE + rng.range(0, TILE_SIZE), y: y * TILE_SIZE + rng.range(0, TILE_SIZE), type: 'iron_rock', itemId: 'iron_ore' });
          } else if (n < 0.05) {
            resources.push({ x: x * TILE_SIZE + rng.range(0, TILE_SIZE), y: y * TILE_SIZE + rng.range(0, TILE_SIZE), type: 'crystal_node', itemId: 'crystal' });
          } else if (n < 0.07) {
            resources.push({ x: x * TILE_SIZE + rng.range(0, TILE_SIZE), y: y * TILE_SIZE + rng.range(0, TILE_SIZE), type: 'coal_rock', itemId: 'coal' });
          }
        }

        // Ruins: gold, crystal
        if (biome === Biome.Ruins) {
          if (n < 0.02) {
            resources.push({ x: x * TILE_SIZE + rng.range(0, TILE_SIZE), y: y * TILE_SIZE + rng.range(0, TILE_SIZE), type: 'gold_rock', itemId: 'gold_ore' });
          } else if (n < 0.035) {
            resources.push({ x: x * TILE_SIZE + rng.range(0, TILE_SIZE), y: y * TILE_SIZE + rng.range(0, TILE_SIZE), type: 'crystal_node', itemId: 'crystal' });
          }
        }
      }
    }

    return resources;
  }

  generateEnemies(biomeMap: Biome[][]): { x: number; y: number; type: EnemyType }[] {
    const enemies: { x: number; y: number; type: EnemyType }[] = [];
    const w = WORLD_WIDTH;
    const h = WORLD_HEIGHT;
    const rng = new SeededRandom(this.seed + 7777);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (rng.next() > 0.003) continue;

        const biome = biomeMap[y][x];
        let enemyType: EnemyType | null = null;

        switch (biome) {
          case Biome.Forest:
            enemyType = rng.chance(0.4) ? EnemyType.Wolf :
              rng.chance(0.5) ? EnemyType.Spider : EnemyType.Slime;
            break;
          case Biome.Plains:
            enemyType = rng.chance(0.5) ? EnemyType.Slime :
              rng.chance(0.5) ? EnemyType.Boar : EnemyType.Wolf;
            break;
          case Biome.Mountains:
            enemyType = rng.chance(0.6) ? EnemyType.Golem :
              EnemyType.Wolf;
            break;
          case Biome.Swamp:
            enemyType = rng.chance(0.5) ? EnemyType.Spider :
              EnemyType.Bat;
            break;
          case Biome.Cave:
            enemyType = rng.chance(0.3) ? EnemyType.Bat :
              rng.chance(0.4) ? EnemyType.Skeleton :
              rng.chance(0.5) ? EnemyType.Spider : EnemyType.DarkKnight;
            break;
          case Biome.Ruins:
            enemyType = rng.chance(0.6) ? EnemyType.DarkKnight : EnemyType.Skeleton;
            break;
        }

        if (enemyType !== null) {
          enemies.push({
            x: x * TILE_SIZE + rng.range(0, TILE_SIZE),
            y: y * TILE_SIZE + rng.range(0, TILE_SIZE),
            type: enemyType,
          });
        }
      }
    }

    // Place bosses in specific locations
    enemies.push({ x: 30 * TILE_SIZE, y: 30 * TILE_SIZE, type: EnemyType.SlimeKing });
    enemies.push({ x: 80 * TILE_SIZE, y: 80 * TILE_SIZE, type: EnemyType.ShadowLord });
    enemies.push({ x: 150 * TILE_SIZE, y: 20 * TILE_SIZE, type: EnemyType.Dragon });

    return enemies;
  }

  generateNpcs(): { x: number; y: number; npcId: string }[] {
    const cx = WORLD_WIDTH * TILE_SIZE / 2;
    const cy = WORLD_HEIGHT * TILE_SIZE / 2;
    const rng = new SeededRandom(this.seed + 3333);

    return [
      { x: cx - 60, y: cy - 40, npcId: 'merchant' },
      { x: cx + 60, y: cy - 40, npcId: 'blacksmith' },
      { x: cx - 60, y: cy + 40, npcId: 'farmer' },
      { x: cx + 60, y: cy + 40, npcId: 'alchemist' },
      { x: cx - 30, y: cy - 80, npcId: 'hunter' },
      { x: cx, y: cy - 60, npcId: 'quest_giver' },
    ];
  }

  getTileAt(tileMap: TileType[][], x: number, y: number): TileType {
    if (y < 0 || y >= tileMap.length || x < 0 || x >= tileMap[0].length) {
      return TileType.Water;
    }
    return tileMap[y][x];
  }

  isWalkable(tileMap: TileType[][], x: number, y: number): boolean {
    const tile = this.getTileAt(tileMap, x, y);
    return tile !== TileType.Water && tile !== TileType.DeepWater &&
      tile !== TileType.Wall && tile !== TileType.CaveWall && tile !== TileType.Lava;
  }
}

// ── Time System ───────────────────────────────────────────────────
export function getDayProgress(time: GameTime): number {
  return time.dayTicks / time.dayLength;
}

export function getSeasonForDay(day: number): Season {
  const cycle = day % 120; // 120 days per year
  if (cycle < 30) return Season.Spring;
  if (cycle < 60) return Season.Summer;
  if (cycle < 90) return Season.Autumn;
  return Season.Winter;
}

export function getSkyColor(time: GameTime): string {
  const progress = getDayProgress(time);

  // Dawn: 0.2 - 0.3
  // Day: 0.3 - 0.7
  // Dusk: 0.7 - 0.8
  // Night: 0.8 - 1.0 and 0.0 - 0.2
  if (progress < 0.2) return '#0a0a2a';
  if (progress < 0.3) {
    const t = (progress - 0.2) / 0.1;
    return lerpHex('#0a0a2a', '#ff8844', t);
  }
  if (progress < 0.4) {
    const t = (progress - 0.3) / 0.1;
    return lerpHex('#ff8844', '#87ceeb', t);
  }
  if (progress < 0.6) return '#87ceeb';
  if (progress < 0.7) return '#87ceeb';
  if (progress < 0.8) {
    const t = (progress - 0.7) / 0.1;
    return lerpHex('#87ceeb', '#ff6633', t);
  }
  if (progress < 0.9) {
    const t = (progress - 0.8) / 0.1;
    return lerpHex('#ff6633', '#1a0a3a', t);
  }
  return '#0a0a2a';
}

function lerpHex(a: string, b: string, t: number): string {
  const parse = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const bb = parseInt(hex.slice(5, 7), 16);
    return [r, g, bb];
  };
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb2] = parse(b);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const b2 = Math.round(ab + (bb2 - ab) * t);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b2.toString(16).padStart(2, '0')}`;
}

export function getSeasonTint(season: Season): string {
  switch (season) {
    case Season.Spring: return 'rgba(100, 200, 100, 0.05)';
    case Season.Summer: return 'rgba(255, 200, 50, 0.05)';
    case Season.Autumn: return 'rgba(200, 120, 50, 0.1)';
    case Season.Winter: return 'rgba(150, 180, 220, 0.1)';
  }
}
