// ═══════════════════════════════════════════════════════════════════
// Farm Survival - World Generation & Tile Definitions
// ═══════════════════════════════════════════════════════════════════

import {
  Biome, TileType, TILE_SIZE, WORLD_WIDTH, WORLD_HEIGHT,
  EnemyType, Weather, Season, GameTime,
  Vec2,
} from '../game/core/Types';
import { fractalNoise, SeededRandom } from '../game/core/Utils';

// ── Tile Colors ───────────────────────────────────────────────────
export const TILE_COLORS: Record<TileType, string> = {
  [TileType.Grass]: '#4a7c3f',
  [TileType.Dirt]: '#8d6e4a',
  [TileType.Sand]: '#e8d68e',
  [TileType.Water]: '#3a90c8',
  [TileType.DeepWater]: '#1a4f7a',
  [TileType.Stone]: '#7a7a7a',
  [TileType.Snow]: '#e8ecf0',
  [TileType.SwampWater]: '#4a7a2a',
  [TileType.Path]: '#b09a7a',
  [TileType.Wall]: '#5a5a5a',
  [TileType.Floor]: '#a08060',
  [TileType.CaveFloor]: '#3a3a3a',
  [TileType.CaveWall]: '#1a1a2a',
  [TileType.Lava]: '#e44400',
};

/** Biome-specific secondary ground detail colors */
export const BIOME_DETAIL_COLORS: Partial<Record<Biome, { color: string; type: string; chance: number }[]>> = {
  [Biome.Forest]: [
    { color: '#3a7a2a', type: 'leaf', chance: 0.04 },
    { color: '#5a3a1a', type: 'twig', chance: 0.03 },
  ],
  [Biome.Plains]: [
    { color: '#7aaa5a', type: 'grass_clump', chance: 0.05 },
    { color: '#c4a862', type: 'dry_patch', chance: 0.02 },
  ],
  [Biome.Desert]: [
    { color: '#d4b878', type: 'sand_dune', chance: 0.04 },
    { color: '#b09858', type: 'crack', chance: 0.02 },
  ],
  [Biome.Swamp]: [
    { color: '#3a5a1a', type: 'mud', chance: 0.04 },
    { color: '#4a7a2a', type: 'algae', chance: 0.03 },
  ],
  [Biome.Tundra]: [
    { color: '#c8d0d8', type: 'ice_crack', chance: 0.04 },
    { color: '#a0b0b0', type: 'frost', chance: 0.03 },
  ],
  [Biome.Mountains]: [
    { color: '#8a8a8a', type: 'gravel', chance: 0.04 },
  ],
};

// ── Biome Map Colors (for terrain variation) ──────────────────────
const BIOME_GRASS_COLORS: Record<Biome, string> = {
  [Biome.Forest]: '#2d6a1e',       // Deep forest green
  [Biome.Plains]: '#5a9a4a',       // Bright grassland
  [Biome.Mountains]: '#6a7a6a',    // Stone-grey green
  [Biome.Swamp]: '#3a5a1a',        // Dark murky green
  [Biome.Desert]: '#c4a862',       // Sandy yellow
  [Biome.Tundra]: '#b0b8b8',       // Pale icy grey
  [Biome.Cave]: '#3a3a3a',         // Dark stone
  [Biome.Ruins]: '#7a6a5a',        // Worn stone
  [Biome.Village]: '#6a9a5a',      // Healthy farmland
  [Biome.Lake]: '#2a7aa8',         // Blue water
  [Biome.River]: '#3a88b8',        // River blue
  [Biome.Coast]: '#7aae8a',        // Sandy coast green
  [Biome.Volcanic]: '#5a4a3a',     // Ash-dark ground
};

// ── Decorative Element Types ──────────────────────────────────────
export type DecorationType = 'flower' | 'mushroom' | 'tall_grass' | 'lily_pad' | 'dead_log' | 'small_rock' | 'fern' | 'cave_moss' | 'glowing_shroom' | 'cactus' | 'dry_bush' | 'mossy_rock' | 'snowy_rock' | 'flower_patch' | 'pine_sapling' | 'berry_bush';

export interface DecorationDef {
  x: number;
  y: number;
  type: DecorationType;
}

// ── Cave data: generated separately from surface ──────────────────
export interface CaveData {
  tileMap: TileType[][];
  resources: { x: number; y: number; type: string; itemId: string }[];
  enemies: { x: number; y: number; type: EnemyType }[];
  entranceX: number;
  entranceY: number;
}

export interface CursedLandsData {
  tileMap: TileType[][];
  resources: { x: number; y: number; type: string; itemId: string }[];
  enemies: { x: number; y: number; type: EnemyType }[];
  entranceX: number;
  entranceY: number;
}

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

  /**
   * Generate decorations — purely visual elements on the surface
   */
  generateDecorations(biomeMap: Biome[][]): DecorationDef[] {
    const decorations: DecorationDef[] = [];
    const w = WORLD_WIDTH;
    const h = WORLD_HEIGHT;
    const rng = new SeededRandom(this.seed + 11111);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const biome = biomeMap[y][x];
        const n = rng.next();

        // Forest: richer undergrowth
        if (biome === Biome.Forest) {
          if (n < 0.04) {
            decorations.push({ x: x * TILE_SIZE + rng.range(4, TILE_SIZE - 4), y: y * TILE_SIZE + rng.range(4, TILE_SIZE - 4), type: 'fern' });
          } else if (n < 0.06) {
            decorations.push({ x: x * TILE_SIZE + rng.range(4, TILE_SIZE - 4), y: y * TILE_SIZE + rng.range(4, TILE_SIZE - 4), type: 'flower' });
          } else if (n < 0.075) {
            decorations.push({ x: x * TILE_SIZE + rng.range(4, TILE_SIZE - 4), y: y * TILE_SIZE + rng.range(4, TILE_SIZE - 4), type: 'mushroom' });
          } else if (n < 0.09) {
            decorations.push({ x: x * TILE_SIZE + rng.range(4, TILE_SIZE - 4), y: y * TILE_SIZE + rng.range(4, TILE_SIZE - 4), type: 'tall_grass' });
          } else if (n < 0.1) {
            decorations.push({ x: x * TILE_SIZE + rng.range(4, TILE_SIZE - 4), y: y * TILE_SIZE + rng.range(4, TILE_SIZE - 4), type: 'dead_log' });
          } else if (n < 0.105) {
            decorations.push({ x: x * TILE_SIZE + rng.range(4, TILE_SIZE - 4), y: y * TILE_SIZE + rng.range(4, TILE_SIZE - 4), type: 'flower_patch' });
          } else if (n < 0.11) {
            decorations.push({ x: x * TILE_SIZE + rng.range(4, TILE_SIZE - 4), y: y * TILE_SIZE + rng.range(4, TILE_SIZE - 4), type: 'mossy_rock' });
          }
        }

        // Plains: flowers, tall grass, berry bushes
        if (biome === Biome.Plains) {
          if (n < 0.05) {
            decorations.push({ x: x * TILE_SIZE + rng.range(4, TILE_SIZE - 4), y: y * TILE_SIZE + rng.range(4, TILE_SIZE - 4), type: 'tall_grass' });
          } else if (n < 0.07) {
            decorations.push({ x: x * TILE_SIZE + rng.range(4, TILE_SIZE - 4), y: y * TILE_SIZE + rng.range(4, TILE_SIZE - 4), type: 'flower' });
          } else if (n < 0.08) {
            decorations.push({ x: x * TILE_SIZE + rng.range(4, TILE_SIZE - 4), y: y * TILE_SIZE + rng.range(4, TILE_SIZE - 4), type: 'small_rock' });
          } else if (n < 0.085) {
            decorations.push({ x: x * TILE_SIZE + rng.range(4, TILE_SIZE - 4), y: y * TILE_SIZE + rng.range(4, TILE_SIZE - 4), type: 'berry_bush' });
          } else if (n < 0.09) {
            decorations.push({ x: x * TILE_SIZE + rng.range(4, TILE_SIZE - 4), y: y * TILE_SIZE + rng.range(4, TILE_SIZE - 4), type: 'flower_patch' });
          }
        }

        // Desert: cacti, dry bushes, small rocks
        if (biome === Biome.Desert) {
          if (n < 0.03) {
            decorations.push({ x: x * TILE_SIZE + rng.range(4, TILE_SIZE - 4), y: y * TILE_SIZE + rng.range(4, TILE_SIZE - 4), type: 'cactus' });
          } else if (n < 0.05) {
            decorations.push({ x: x * TILE_SIZE + rng.range(4, TILE_SIZE - 4), y: y * TILE_SIZE + rng.range(4, TILE_SIZE - 4), type: 'dry_bush' });
          } else if (n < 0.06) {
            decorations.push({ x: x * TILE_SIZE + rng.range(4, TILE_SIZE - 4), y: y * TILE_SIZE + rng.range(4, TILE_SIZE - 4), type: 'small_rock' });
          }
        }

        // Swamp: mushrooms, dead logs, mossy rocks
        if (biome === Biome.Swamp) {
          if (n < 0.05) {
            decorations.push({ x: x * TILE_SIZE + rng.range(4, TILE_SIZE - 4), y: y * TILE_SIZE + rng.range(4, TILE_SIZE - 4), type: 'mushroom' });
          } else if (n < 0.07) {
            decorations.push({ x: x * TILE_SIZE + rng.range(4, TILE_SIZE - 4), y: y * TILE_SIZE + rng.range(4, TILE_SIZE - 4), type: 'dead_log' });
          } else if (n < 0.08) {
            decorations.push({ x: x * TILE_SIZE + rng.range(4, TILE_SIZE - 4), y: y * TILE_SIZE + rng.range(4, TILE_SIZE - 4), type: 'mossy_rock' });
          } else if (n < 0.085) {
            decorations.push({ x: x * TILE_SIZE + rng.range(4, TILE_SIZE - 4), y: y * TILE_SIZE + rng.range(4, TILE_SIZE - 4), type: 'tall_grass' });
          }
        }

        // Water: lily pads
        if (biome === Biome.Lake || biome === Biome.River) {
          if (n < 0.05 && biome === Biome.Lake) {
            decorations.push({ x: x * TILE_SIZE + rng.range(4, TILE_SIZE - 4), y: y * TILE_SIZE + rng.range(4, TILE_SIZE - 4), type: 'lily_pad' });
          }
        }

        // Mountains: rocks, mossy rocks, flowers
        if (biome === Biome.Mountains) {
          if (n < 0.04) {
            decorations.push({ x: x * TILE_SIZE + rng.range(4, TILE_SIZE - 4), y: y * TILE_SIZE + rng.range(4, TILE_SIZE - 4), type: 'small_rock' });
          } else if (n < 0.05) {
            decorations.push({ x: x * TILE_SIZE + rng.range(4, TILE_SIZE - 4), y: y * TILE_SIZE + rng.range(4, TILE_SIZE - 4), type: 'flower' });
          } else if (n < 0.06) {
            decorations.push({ x: x * TILE_SIZE + rng.range(4, TILE_SIZE - 4), y: y * TILE_SIZE + rng.range(4, TILE_SIZE - 4), type: 'mossy_rock' });
          }
        }

        // Tundra: snowy rocks, sparse grass
        if (biome === Biome.Tundra) {
          if (n < 0.03) {
            decorations.push({ x: x * TILE_SIZE + rng.range(4, TILE_SIZE - 4), y: y * TILE_SIZE + rng.range(4, TILE_SIZE - 4), type: 'snowy_rock' });
          } else if (n < 0.04) {
            decorations.push({ x: x * TILE_SIZE + rng.range(4, TILE_SIZE - 4), y: y * TILE_SIZE + rng.range(4, TILE_SIZE - 4), type: 'tall_grass' });
          }
        }

        // Village: flowers, berry bushes, flower patches
        if (biome === Biome.Village) {
          if (n < 0.04) {
            decorations.push({ x: x * TILE_SIZE + rng.range(4, TILE_SIZE - 4), y: y * TILE_SIZE + rng.range(4, TILE_SIZE - 4), type: 'flower' });
          } else if (n < 0.06) {
            decorations.push({ x: x * TILE_SIZE + rng.range(4, TILE_SIZE - 4), y: y * TILE_SIZE + rng.range(4, TILE_SIZE - 4), type: 'tall_grass' });
          } else if (n < 0.07) {
            decorations.push({ x: x * TILE_SIZE + rng.range(4, TILE_SIZE - 4), y: y * TILE_SIZE + rng.range(4, TILE_SIZE - 4), type: 'flower_patch' });
          } else if (n < 0.075) {
            decorations.push({ x: x * TILE_SIZE + rng.range(4, TILE_SIZE - 4), y: y * TILE_SIZE + rng.range(4, TILE_SIZE - 4), type: 'berry_bush' });
          }
        }
      }
    }
    return decorations;
  }

  /**
   * Generate the underground cave layer with exclusive enemies and resources
   */
  generateCaveData(): CaveData {
    const caveW = 80; // Smaller than surface — feels like a dungeon
    const caveH = 80;
    const caveRng = new SeededRandom(this.seed + 55555);

    // Generate cave tiles — rooms and corridors using simple noise
    const caveTileMap: TileType[][] = Array.from({ length: caveH }, () => Array(caveW).fill(TileType.CaveWall));

    // Carve out open areas
    for (let y = 0; y < caveH; y++) {
      for (let x = 0; x < caveW; x++) {
        const noise = fractalNoise(x, y, this.seed + 77777, 4, 16, 0.6);
        if (noise > 0.35) {
          caveTileMap[y][x] = TileType.CaveFloor;
        }
      }
    }

    // Carve guaranteed paths (horizontal + vertical corridors)
    // Entrance at top-center of cave
    const entranceX = Math.floor(caveW / 2);
    const entranceY = 0;

    // Vertical corridor from entrance
    for (let y = 0; y < caveH; y++) {
      for (let dx = -1; dx <= 1; dx++) {
        const cx = entranceX + dx;
        if (cx >= 0 && cx < caveW) {
          caveTileMap[y][cx] = TileType.CaveFloor;
        }
      }
    }

    // Horizontal corridors at various depths
    const corridorYs = [20, 40, 60];
    for (const cy of corridorYs) {
      for (let x = 0; x < caveW; x++) {
        if (caveTileMap[cy] && (caveTileMap[cy][x] === TileType.CaveWall)) {
          // 30% chance to carve a horizontal path
          if (caveRng.next() < 0.3) {
            caveTileMap[cy][x] = TileType.CaveFloor;
            if (cy + 1 < caveH) caveTileMap[cy + 1][x] = TileType.CaveFloor;
          }
        }
      }
    }

    // Add lava pools in deeper areas (y > 50)
    for (let y = 50; y < caveH; y++) {
      for (let x = 0; x < caveW; x++) {
        const noise = fractalNoise(x, y, this.seed + 88888, 2, 40);
        if (noise > 0.45 && caveTileMap[y][x] === TileType.CaveFloor) {
          // Check surroundings
          let floorNeighbors = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              const nx = x + dx, ny = y + dy;
              if (nx >= 0 && nx < caveW && ny >= 0 && ny < caveH && caveTileMap[ny][nx] === TileType.CaveFloor) {
                floorNeighbors++;
              }
            }
          }
          if (floorNeighbors >= 3 && caveRng.chance(0.15)) {
            // Create a small lava pool (3x3)
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                const lx = x + dx, ly = y + dy;
                if (lx >= 0 && lx < caveW && ly >= 0 && ly < caveH) {
                  caveTileMap[ly][lx] = TileType.Lava;
                }
              }
            }
          }
        }
      }
    }

    // Generate cave resources
    const caveResources: { x: number; y: number; type: string; itemId: string }[] = [];
    for (let y = 0; y < caveH; y++) {
      for (let x = 0; x < caveW; x++) {
        if (caveTileMap[y][x] !== TileType.CaveFloor) continue;
        const n = caveRng.next();
        const px = x * TILE_SIZE + caveRng.range(0, TILE_SIZE);
        const py = y * TILE_SIZE + caveRng.range(0, TILE_SIZE);

        // Upper cave (y < 30): iron, coal, crystal
        if (y < 30) {
          if (n < 0.03) {
            caveResources.push({ x: px, y: py, type: 'iron_rock', itemId: 'iron_ore' });
          } else if (n < 0.05) {
            caveResources.push({ x: px, y: py, type: 'coal_rock', itemId: 'coal' });
          } else if (n < 0.065) {
            caveResources.push({ x: px, y: py, type: 'crystal_node', itemId: 'crystal' });
          }
        }
        // Middle cave (y 30-55): mithril, crystal, gold
        else if (y < 55) {
          if (n < 0.025) {
            caveResources.push({ x: px, y: py, type: 'mithril_rock', itemId: 'mithril_ore' });
          } else if (n < 0.04) {
            caveResources.push({ x: px, y: py, type: 'crystal_node', itemId: 'crystal' });
          } else if (n < 0.05) {
            caveResources.push({ x: px, y: py, type: 'gold_rock', itemId: 'gold_ore' });
          } else if (n < 0.065) {
            caveResources.push({ x: px, y: py, type: 'coal_rock', itemId: 'coal' });
          }
        }
        // Deep cave (y >= 55): ruby, lava crystal, mithril
        else {
          if (n < 0.02) {
            caveResources.push({ x: px, y: py, type: 'ruby_rock', itemId: 'ruby_ore' });
          } else if (n < 0.035) {
            caveResources.push({ x: px, y: py, type: 'mithril_rock', itemId: 'mithril_ore' });
          } else if (n < 0.045) {
            caveResources.push({ x: px, y: py, type: 'crystal_node', itemId: 'crystal' });
          } else if (n < 0.06) {
            caveResources.push({ x: px, y: py, type: 'iron_rock', itemId: 'iron_ore' });
          }
        }
      }
    }

    // Generate cave enemies
    const caveEnemies: { x: number; y: number; type: EnemyType }[] = [];
    for (let y = 0; y < caveH; y++) {
      for (let x = 0; x < caveW; x++) {
        if (caveTileMap[y][x] !== TileType.CaveFloor && caveTileMap[y][x] !== TileType.Lava) continue;
        if (caveRng.next() > 0.005) continue;

        const px = x * TILE_SIZE + caveRng.range(0, TILE_SIZE);
        const py = y * TILE_SIZE + caveRng.range(0, TILE_SIZE);

        // Upper cave: bat, skeleton, spider
        if (y < 30) {
          const types: EnemyType[] = [EnemyType.Bat, EnemyType.Skeleton, EnemyType.Spider];
          caveEnemies.push({ x: px, y: py, type: caveRng.pick(types) });
        }
        // Middle cave: cave troll, giant bat, skeleton
        else if (y < 55) {
          const types: EnemyType[] = [EnemyType.CaveTroll, EnemyType.GiantBat, EnemyType.Skeleton];
          caveEnemies.push({ x: px, y: py, type: caveRng.pick(types) });
        }
        // Deep cave: lava spider, crystal golem, cave troll
        else {
          const types: EnemyType[] = [EnemyType.LavaSpider, EnemyType.CrystalGolem, EnemyType.CaveTroll];
          caveEnemies.push({ x: px, y: py, type: caveRng.pick(types) });
        }
      }
    }

    // Place the Shadow Lord boss in deep cave
    caveEnemies.push({ x: 60 * TILE_SIZE, y: 70 * TILE_SIZE, type: EnemyType.ShadowLord });

    return {
      tileMap: caveTileMap,
      resources: caveResources,
      enemies: caveEnemies,
      entranceX: entranceX * TILE_SIZE,
      entranceY: entranceY * TILE_SIZE,
    };
  }

  /** Generate a cursed underground dimension — accessible via portal (level 6+) */
  generateCursedLands(): CursedLandsData {
    const cw = 60; // 60x60 tiles — small, dense dungeon
    const ch = 60;
    const rng = new SeededRandom(this.seed + 99999);

    const tileMap: TileType[][] = Array.from({ length: ch }, () => Array(cw).fill(TileType.CaveWall));

    // Carve rooms and corridors using noise
    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        const noise = fractalNoise(x, y, this.seed + 11111, 5, 12, 0.55);
        if (noise > 0.30) {
          tileMap[y][x] = TileType.CaveFloor;
        }
      }
    }

    // Entrance at center-top
    const entranceX = Math.floor(cw / 2);
    const entranceY = 0;

    // Vertical corridor from entrance
    for (let y = 0; y < ch; y++) {
      for (let dx = -2; dx <= 2; dx++) {
        const cx = entranceX + dx;
        if (cx >= 0 && cx < cw) {
          tileMap[y][cx] = TileType.CaveFloor;
        }
      }
    }

    // Circular hub room at center
    const hubX = Math.floor(cw / 2);
    const hubY = Math.floor(ch / 2);
    for (let dy = -6; dy <= 6; dy++) {
      for (let dx = -6; dx <= 6; dx++) {
        if (dx * dx + dy * dy <= 36) {
          const hx = hubX + dx, hy = hubY + dy;
          if (hx >= 0 && hx < cw && hy >= 0 && hy < ch) {
            tileMap[hy][hx] = TileType.CaveFloor;
          }
        }
      }
    }

    // Horizontal corridors
    const corrYs = [15, 30, 45];
    for (const cy of corrYs) {
      for (let x = 0; x < cw; x++) {
        if (rng.next() < 0.25) {
          tileMap[cy][x] = TileType.CaveFloor;
          if (cy + 1 < ch) tileMap[cy + 1][x] = TileType.CaveFloor;
        }
      }
    }

    // Generate cursed resources — dark crystals, void essence deposits, etc.
    const resources: { x: number; y: number; type: string; itemId: string }[] = [];
    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        if (tileMap[y][x] !== TileType.CaveFloor) continue;
        const n = rng.next();
        const px = x * TILE_SIZE + rng.range(0, TILE_SIZE);
        const py = y * TILE_SIZE + rng.range(0, TILE_SIZE);

        if (n < 0.015) {
          resources.push({ x: px, y: py, type: 'crystal_node', itemId: 'void_crystal' });
        } else if (n < 0.025) {
          resources.push({ x: px, y: py, type: 'crystal_node', itemId: 'abyssal_gem' });
        } else if (n < 0.04) {
          resources.push({ x: px, y: py, type: 'crystal_node', itemId: 'dark_essence' });
        } else if (n < 0.055) {
          resources.push({ x: px, y: py, type: 'iron_rock', itemId: 'void_ore' });
        } else if (n < 0.07) {
          resources.push({ x: px, y: py, type: 'iron_rock', itemId: 'shadow_ore' });
        } else if (n < 0.08) {
          resources.push({ x: px, y: py, type: 'iron_rock', itemId: 'mithril_ore' });
        } else if (n < 0.09) {
          resources.push({ x: px, y: py, type: 'crystal_node', itemId: 'crystal' });
        }
      }
    }

    // Generate cursed enemies — shadow knights, wraiths, etc.
    const enemies: { x: number; y: number; type: EnemyType }[] = [];
    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        if (tileMap[y][x] !== TileType.CaveFloor) continue;
        if (rng.next() > 0.008) continue;

        const enemyTypes = ['Skeleton', 'DarkKnight', 'ShadowLord'];
        const weights = [0.4, 0.35, 0.25];
        let roll = rng.next();
        let eType = enemyTypes[0];
        for (let i = 0; i < enemyTypes.length; i++) {
          if (roll < weights[i]) { eType = enemyTypes[i]; break; }
          roll -= weights[i];
        }

        enemies.push({
          x: x * TILE_SIZE + rng.range(4, TILE_SIZE - 4),
          y: y * TILE_SIZE + rng.range(4, TILE_SIZE - 4),
          type: eType as EnemyType,
        });
      }
    }

    // ── Place VoidWarden boss at the center hub ──
    enemies.push({
      x: hubX * TILE_SIZE + TILE_SIZE / 2,
      y: hubY * TILE_SIZE + TILE_SIZE / 2,
      type: EnemyType.VoidWarden,
    });

    return { tileMap, resources, enemies, entranceX, entranceY };
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

        // Forest: trees, bushes, rocks (increased density)
        if (biome === Biome.Forest) {
          if (n < 0.05) {
            resources.push({ x: x * TILE_SIZE + rng.range(0, TILE_SIZE), y: y * TILE_SIZE + rng.range(0, TILE_SIZE), type: 'tree', itemId: 'wood' });
          } else if (n < 0.075) {
            resources.push({ x: x * TILE_SIZE + rng.range(0, TILE_SIZE), y: y * TILE_SIZE + rng.range(0, TILE_SIZE), type: 'bush', itemId: 'apple' });
          } else if (n < 0.085) {
            resources.push({ x: x * TILE_SIZE + rng.range(0, TILE_SIZE), y: y * TILE_SIZE + rng.range(0, TILE_SIZE), type: 'rock', itemId: 'stone' });
          } else if (n < 0.09) {
            resources.push({ x: x * TILE_SIZE + rng.range(0, TILE_SIZE), y: y * TILE_SIZE + rng.range(0, TILE_SIZE), type: 'bush', itemId: 'berry' });
          }
        }

        // Plains: fewer trees, berry bushes
        if (biome === Biome.Plains) {
          if (n < 0.025) {
            resources.push({ x: x * TILE_SIZE + rng.range(0, TILE_SIZE), y: y * TILE_SIZE + rng.range(0, TILE_SIZE), type: 'tree', itemId: 'wood' });
          } else if (n < 0.04) {
            resources.push({ x: x * TILE_SIZE + rng.range(0, TILE_SIZE), y: y * TILE_SIZE + rng.range(0, TILE_SIZE), type: 'bush', itemId: 'berry' });
          } else if (n < 0.048) {
            resources.push({ x: x * TILE_SIZE + rng.range(0, TILE_SIZE), y: y * TILE_SIZE + rng.range(0, TILE_SIZE), type: 'rock', itemId: 'stone' });
          }
        }

        // Mountains: iron, gold, crystal, stone
        if (biome === Biome.Mountains) {
          if (n < 0.035) {
            resources.push({ x: x * TILE_SIZE + rng.range(0, TILE_SIZE), y: y * TILE_SIZE + rng.range(0, TILE_SIZE), type: 'iron_rock', itemId: 'iron_ore' });
          } else if (n < 0.045) {
            resources.push({ x: x * TILE_SIZE + rng.range(0, TILE_SIZE), y: y * TILE_SIZE + rng.range(0, TILE_SIZE), type: 'gold_rock', itemId: 'gold_ore' });
          } else if (n < 0.052) {
            resources.push({ x: x * TILE_SIZE + rng.range(0, TILE_SIZE), y: y * TILE_SIZE + rng.range(0, TILE_SIZE), type: 'crystal_node', itemId: 'crystal' });
          } else if (n < 0.075) {
            resources.push({ x: x * TILE_SIZE + rng.range(0, TILE_SIZE), y: y * TILE_SIZE + rng.range(0, TILE_SIZE), type: 'rock', itemId: 'stone' });
          }
        }

        // Swamp: trees like forest but fewer
        if (biome === Biome.Swamp) {
          if (n < 0.03) {
            resources.push({ x: x * TILE_SIZE + rng.range(0, TILE_SIZE), y: y * TILE_SIZE + rng.range(0, TILE_SIZE), type: 'tree', itemId: 'wood' });
          } else if (n < 0.04) {
            resources.push({ x: x * TILE_SIZE + rng.range(0, TILE_SIZE), y: y * TILE_SIZE + rng.range(0, TILE_SIZE), type: 'bush', itemId: 'berry' });
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
          if (n < 0.025) {
            resources.push({ x: x * TILE_SIZE + rng.range(0, TILE_SIZE), y: y * TILE_SIZE + rng.range(0, TILE_SIZE), type: 'gold_rock', itemId: 'gold_ore' });
          } else if (n < 0.04) {
            resources.push({ x: x * TILE_SIZE + rng.range(0, TILE_SIZE), y: y * TILE_SIZE + rng.range(0, TILE_SIZE), type: 'crystal_node', itemId: 'crystal' });
          }
        }
      }
    }

    // Add cave entrances on mountains (surface-level resource that player interacts with)
    const caveEntrances = this.findCaveEntranceLocations(biomeMap, rng);
    for (const entrance of caveEntrances) {
      resources.push(entrance);
    }

    // ── Portal to Cursed Lands — place far from village (mountains/ruins area) ──
    const portalPlaced = resources.some(r => r.type === 'portal');
    if (!portalPlaced) {
      // Find a suitable location: far from village, preferably mountains or ruins
      const cx = Math.floor(WORLD_WIDTH / 2);
      const cy = Math.floor(WORLD_HEIGHT / 2);
      let bestX = 0, bestY = 0, bestDist = 0;
      for (let y = 0; y < biomeMap.length; y++) {
        for (let x = 0; x < biomeMap[0].length; x++) {
          const biome = biomeMap[y][x];
          // Mountains, ruins, or desert — far from village
          if (biome === 'mountains' || biome === 'ruins' || biome === 'desert') {
            const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
            if (dist > bestDist) {
              bestDist = dist;
              bestX = x * TILE_SIZE + TILE_SIZE / 2;
              bestY = y * TILE_SIZE + TILE_SIZE / 2;
            }
          }
        }
      }
      // Fallback: place at max distance
      if (bestDist === 0) {
        const angle = 3.5;
        const dist = 85;
        bestX = Math.floor(cx + Math.cos(angle) * dist) * TILE_SIZE;
        bestY = Math.floor(cy + Math.sin(angle) * dist) * TILE_SIZE;
      }
      resources.push({ x: bestX, y: bestY, type: 'portal', itemId: 'portal' });
    }

    return resources;
  }

  /**
   * Find good locations for cave entrances — in mountain biomes and near village
   */
  private findCaveEntranceLocations(biomeMap: Biome[][], rng: SeededRandom): { x: number; y: number; type: string; itemId: string }[] {
    const entrances: { x: number; y: number; type: string; itemId: string }[] = [];
    const w = WORLD_WIDTH;
    const h = WORLD_HEIGHT;
    const candidates: { x: number; y: number }[] = [];

    for (let y = 10; y < h - 10; y++) {
      for (let x = 10; x < w - 10; x++) {
        if (biomeMap[y][x] === Biome.Mountains) {
          // Check that surrounding tiles are also mountains
          let mountainCount = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (biomeMap[y + dy]?.[x + dx] === Biome.Mountains) mountainCount++;
            }
          }
          if (mountainCount >= 7) {
            candidates.push({ x, y });
          }
        }
      }
    }

    // Place 2-3 cave entrances in mountains
    const entranceCount = 2 + Math.floor(candidates.length > 20 ? 1 : 0);
    const shuffled = rng.shuffle(candidates);
    for (let i = 0; i < Math.min(entranceCount, shuffled.length); i++) {
      const c = shuffled[i];
      entrances.push({
        x: c.x * TILE_SIZE + rng.range(0, TILE_SIZE),
        y: c.y * TILE_SIZE + rng.range(0, TILE_SIZE),
        type: 'cave_entrance',
        itemId: 'cave_entrance',
      });
    }

    // ── Guaranteed entrance near village ──
    const cx = Math.floor(w / 2);
    const cy = Math.floor(h / 2);
    // Search in a ring around the village (radius 11-17 tiles from center)
    // This ensures it's visible from the village but not inside buildings/paths
    let villageEntrancePlaced = false;
    for (let radius = 11; radius <= 17 && !villageEntrancePlaced; radius++) {
      // Check tiles on the perimeter of this radius
      const perimeterPositions: { x: number; y: number }[] = [];
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          // Only check the outer ring
          if (Math.abs(dx) < radius && Math.abs(dy) < radius) continue;
          const tx = cx + dx;
          const ty = cy + dy;
          if (tx < 0 || tx >= w || ty < 0 || ty >= h) continue;
          const tile = this.tileMap[ty][tx];
          // Place on walkable ground tiles — grass, dirt, or path are good
          if (tile === TileType.Grass || tile === TileType.Dirt || tile === TileType.Path) {
            // Avoid placing right next to another entrance
            const tooClose = entrances.some(e => {
              const ex = Math.floor(e.x / TILE_SIZE);
              const ey = Math.floor(e.y / TILE_SIZE);
              return Math.abs(ex - tx) < 8 && Math.abs(ey - ty) < 8;
            });
            if (!tooClose) {
              perimeterPositions.push({ x: tx, y: ty });
            }
          }
        }
      }
      if (perimeterPositions.length > 0) {
        const pos = rng.pick(perimeterPositions);
        entrances.push({
          x: pos.x * TILE_SIZE + rng.range(0, TILE_SIZE),
          y: pos.y * TILE_SIZE + rng.range(0, TILE_SIZE),
          type: 'cave_entrance',
          itemId: 'cave_entrance',
        });
        villageEntrancePlaced = true;
      }
    }

    // If we still couldn't place one near the village, place at the village edge
    if (!villageEntrancePlaced) {
      const edgeX = cx + 11;
      const edgeY = cy + 8;
      if (edgeX < w && edgeY < h) {
        entrances.push({
          x: edgeX * TILE_SIZE,
          y: edgeY * TILE_SIZE,
          type: 'cave_entrance',
          itemId: 'cave_entrance',
        });
      }
    }

    return entrances;
  }

  generateEnemies(biomeMap: Biome[][]): { x: number; y: number; type: EnemyType }[] {
    const enemies: { x: number; y: number; type: EnemyType }[] = [];
    const w = WORLD_WIDTH;
    const h = WORLD_HEIGHT;
    const rng = new SeededRandom(this.seed + 7777);
    const villageCx = Math.floor(w / 2);
    const villageCy = Math.floor(h / 2);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const biome = biomeMap[y][x];
        // Distance from village center (tiles)
        const distFromVillage = Math.sqrt((x - villageCx) ** 2 + (y - villageCy) ** 2);
        
        // Biome-specific spawn rates (higher = more enemies)
        let spawnRate = 0.003;
        switch (biome) {
          case Biome.Forest: spawnRate = 0.005; break;
          case Biome.Plains: spawnRate = 0.0035; break;
          case Biome.Mountains: spawnRate = 0.004; break;
          case Biome.Swamp: spawnRate = 0.0045; break;
          case Biome.Desert: spawnRate = 0.003; break;
          case Biome.Ruins: spawnRate = 0.005; break;
          case Biome.Cave: spawnRate = 0.006; break;
          case Biome.Village: case Biome.Lake: spawnRate = 0.0005; break;
          default: spawnRate = 0.003;
        }
        
        // No enemies in the village itself
        if (spawnRate === 0) continue;
        
        // Scale by distance from village: more enemies farther out
        // At distance < 15 tiles: 50% reduction (safe near village)
        // At distance 15-40: normal rate
        // At distance > 40: up to 2x rate
        let distanceMultiplier = 1.0;
        if (distFromVillage < 15) distanceMultiplier = 0.5;
        else if (distFromVillage > 40) distanceMultiplier = 1.5 + Math.min(0.5, (distFromVillage - 40) / 80);
        else if (distFromVillage > 25) distanceMultiplier = 1.2;
        
        const finalRate = spawnRate * distanceMultiplier;
        if (rng.next() > finalRate) continue;

        let enemyType: EnemyType | null = null;

        switch (biome) {
          case Biome.Forest:
            enemyType = (rng.chance(0.35) ? EnemyType.Wolf :
              rng.chance(0.5) ? EnemyType.Spider : EnemyType.Slime);
            break;
          case Biome.Plains:
            enemyType = rng.chance(0.45) ? EnemyType.Slime :
              rng.chance(0.5) ? EnemyType.Boar : EnemyType.Wolf;
            break;
          case Biome.Mountains:
            if (distFromVillage > 50 && rng.chance(0.05)) {
              enemyType = EnemyType.Dragon;
            } else {
              enemyType = rng.chance(0.5) ? EnemyType.Golem :
                rng.chance(0.6) ? EnemyType.Wolf : EnemyType.Boar;
            }
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
            if (distFromVillage > 35 && rng.chance(0.15)) {
              enemyType = EnemyType.ShadowLord;
            } else {
              enemyType = rng.chance(0.5) ? EnemyType.DarkKnight :
                rng.chance(0.5) ? EnemyType.Skeleton : EnemyType.Golem;
            }
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

    return [
      { x: cx - 60, y: cy - 40, npcId: 'merchant' },
      { x: cx + 60, y: cy - 40, npcId: 'blacksmith' },
      { x: cx - 60, y: cy + 40, npcId: 'farmer' },
      { x: cx + 60, y: cy + 40, npcId: 'alchemist' },
      { x: cx - 50, y: cy - 80, npcId: 'hunter' },
      { x: cx, y: cy - 60, npcId: 'quest_giver' },
      { x: cx - 100, y: cy - 40, npcId: 'identifier' },
    ];
  }

  /** Generate fishing spots near water tiles on the surface */
  generateFishingSpots(biomeMap: Biome[][], tileMap: TileType[][]): { x: number; y: number; type: string; itemId: string }[] {
    const spots: { x: number; y: number; type: string; itemId: string }[] = [];
    const h = tileMap.length;
    const w = tileMap[0].length;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (tileMap[y][x] === 3 || tileMap[y][x] === 4) { // Water/DeepWater
          const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
          for (const [dx, dy] of dirs) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
              const lt = tileMap[ny][nx];
              if (lt === 0 || lt === 1 || lt === 2) { // Grass, Dirt, Sand
                if (Math.random() < 0.35) {
                  spots.push({
                    x: nx * 32 + 16,
                    y: ny * 32 + 16,
                    type: 'fishing_spot',
                    itemId: 'fishing_spot',
                  });
                  break;
                }
              }
            }
          }
        }
      }
    }
    return spots;
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

  // Night:   0.000-0.166 = 00:00-04:00 (deep night)
  // Pre-dawn:0.166-0.208 = 04:00-05:00 (subtle transition)
  // Dawn:   0.208-0.333 = 05:00-08:00 (sunrise brightening)
  // Morning:0.333-0.416 = 08:00-10:00
  // Day:    0.416-0.583 = 10:00-14:00 (peak)
  // Aftern: 0.583-0.625 = 14:00-15:00
  // Sunset: 0.625-0.791 = 15:00-19:00 (golden hour → dusk)
  // Eve:    0.791-0.833 = 19:00-20:00 (twilight)
  // Night:  0.833-1.000 = 20:00-24:00 (darkening)
  
  if (progress < 0.166) return '#0a0a2a';  // Deep night
  if (progress < 0.208) {
    // Pre-dawn: very subtle lightening (04:00-05:00)
    const t = (progress - 0.166) / 0.042;
    return lerpHex('#0a0a2a', '#151540', t);
  }
  if (progress < 0.292) {
    // Dawn phase 1: dark → warm orange (05:00-07:00)
    const t = (progress - 0.208) / 0.084;
    return lerpHex('#151540', '#ff8844', t);
  }
  if (progress < 0.333) {
    // Dawn phase 2: orange → blue sky (07:00-08:00)
    const t = (progress - 0.292) / 0.041;
    return lerpHex('#ff8844', '#87ceeb', t);
  }
  if (progress < 0.625) return '#87ceeb';  // Full daylight
  if (progress < 0.75) {
    // Sunset phase 1: blue → golden (15:00-18:00)
    const t = (progress - 0.625) / 0.125;
    return lerpHex('#87ceeb', '#ff9933', t);
  }
  if (progress < 0.792) {
    // Sunset phase 2: golden → dusk (18:00-19:00)
    const t = (progress - 0.75) / 0.042;
    return lerpHex('#ff9933', '#cc4466', t);
  }
  if (progress < 0.833) {
    // Evening twilight (19:00-20:00)
    const t = (progress - 0.792) / 0.041;
    return lerpHex('#cc4466', '#1a0a3a', t);
  }
  if (progress < 0.958) {
    // Night settling (20:00-23:00)
    const t = (progress - 0.833) / 0.125;
    return lerpHex('#1a0a3a', '#0a0a2a', t);
  }
  return '#0a0a2a';  // Deep night (23:00-04:00)
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
    default: return 'rgba(200, 200, 200, 0.05)';
  }
}

export function getCaveSkyColor(): string {
  return '#0a0a0a'; // Caves are always pitch black
}

// ── Landing Page Component ────────────────────────────────────────
import React from 'react';

const LandingPage: React.FC = () => {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #87ceeb 0%, #4a9e6e 50%, #2d6a1e 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontFamily: '"Press Start 2P", "VT323", monospace',
      textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Sky gradient overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at 50% 30%, rgba(255,200,100,0.3) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />
      
      {/* Decorative mountains */}
      <svg style={{ position: 'absolute', bottom: '40%', width: '100%', height: '30%' }} viewBox="0 0 100 30" preserveAspectRatio="none">
        <polygon points="0,30 10,5 20,15 30,0 40,10 50,3 60,12 70,2 80,8 90,0 100,10 100,30" fill="#3a6a3a" opacity="0.6" />
        <polygon points="0,30 15,10 25,18 35,5 45,15 55,8 65,18 75,6 85,14 95,4 100,12 100,30" fill="#2a5a2a" opacity="0.8" />
      </svg>
      
      {/* Foreground ground */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '40%',
        background: 'linear-gradient(180deg, #4a7c3f 0%, #2d6a1e 50%, #1a4a0e 100%)',
      }} />
      
      {/* Content */}
      <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', padding: '2rem' }}>
        <h1 style={{
          fontSize: 'clamp(2rem, 6vw, 4rem)',
          marginBottom: '0.5rem',
          letterSpacing: '4px',
          color: '#FFD700',
          textShadow: '3px 3px 6px rgba(0,0,0,0.6)',
        }}>
          🌾 Farm Survival
        </h1>
        <p style={{
          fontSize: 'clamp(0.8rem, 2vw, 1.2rem)',
          marginBottom: '2rem',
          opacity: 0.9,
        }}>
          Cultivate. Explore. Survive.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/auth" style={{
            padding: '12px 32px',
            background: 'linear-gradient(135deg, #4CAF50, #2E7D32)',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: '8px',
            fontSize: 'clamp(0.7rem, 1.5vw, 1rem)',
            border: '2px solid rgba(255,255,255,0.2)',
            transition: 'all 0.3s',
            cursor: 'pointer',
          }}>
            Start Farming
          </a>
          <a href="/game" style={{
            padding: '12px 32px',
            background: 'linear-gradient(135deg, #FF7043, #E64A19)',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: '8px',
            fontSize: 'clamp(0.7rem, 1.5vw, 1rem)',
            border: '2px solid rgba(255,255,255,0.2)',
            transition: 'all 0.3s',
            cursor: 'pointer',
          }}>
            Play Now
          </a>
        </div>
      </div>
      
      {/* Decorative trees */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{
          position: 'absolute',
          bottom: '38%',
          left: `${10 + i * 20}%`,
          width: '20px',
          height: '40px',
        }}>
          <div style={{
            width: 0, height: 0,
            borderLeft: '15px solid transparent',
            borderRight: '15px solid transparent',
            borderBottom: '25px solid #2d6a1e',
            marginBottom: '-2px',
          }} />
          <div style={{
            width: '6px',
            height: '15px',
            background: '#8d6e4a',
            margin: '0 auto',
          }} />
        </div>
      ))}
    </div>
  );
};

export default LandingPage;
