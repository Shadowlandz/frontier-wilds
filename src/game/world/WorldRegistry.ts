// ═══════════════════════════════════════════════════════════════════
// Farm Survival - World Registry (Levels + Portals)
// ═══════════════════════════════════════════════════════════════════
// Central registry for all dungeon/level configs and portal links.
// Adding a new dungeon = adding one LevelConfig + optional PortalLinks.
// No code changes to DungeonGenerator, Game.ts, or Types.ts needed.
// ═══════════════════════════════════════════════════════════════════

import {
  LevelConfig,
  PortalLink,
  GeneratedLevel,
  TileType,
  EnemyType,
  EntrancePolicy,
  DungeonGeneratorMode,
  DungeonTheme,
  levelSeed,
} from '../core/Types';
import { DungeonGenerator } from './DungeonGenerator';

/**
 * WorldRegistry holds all level definitions and portal links.
 * It is the single source of truth for "what levels exist" and
 * "how they connect to each other."
 */
export class WorldRegistry {
  /** All registered level configs, keyed by level ID */
  readonly levels: Map<string, LevelConfig> = new Map();
  /** All portal links between levels */
  readonly portals: PortalLink[] = [];

  /** The DungeonGenerator instance used to generate levels */
  private generator = new DungeonGenerator();

  /** Cached generated levels (cleared on reset) */
  private cache: Map<string, GeneratedLevel> = new Map();

  constructor() {
    this.registerDefaults();
  }

  // ── Registration ────────────────────────────────────────────────

  registerLevel(config: LevelConfig): void {
    this.levels.set(config.id, config);
  }

  addPortal(link: PortalLink): void {
    this.portals.push(link);
  }

  // ── Generation ──────────────────────────────────────────────────

  /**
   * Generate (or retrieve cached) a level.
   * @param id         - Level config ID.
   * @param baseSeed   - World seed for deterministic generation.
   * @param forceFresh - If true, ignores cache (used for re-entry randomization).
   */
  generateLevel(id: string, baseSeed: number, forceFresh = false): GeneratedLevel | null {
    const config = this.levels.get(id);
    if (!config) return null;

    const cacheKey = `${id}_${forceFresh ? Math.random().toString(36).slice(2, 8) : 'default'}`;

    // Use cache unless forcing fresh
    if (!forceFresh) {
      const cached = this.cache.get(id);
      if (cached) return cached;
    }

    const randomSeed = forceFresh ? levelSeed(baseSeed, `fresh_${Date.now()}`) : undefined;
    const result = this.generator.generate(config, baseSeed, randomSeed);

    // Cache the default (non-fresh) version
    if (!forceFresh) {
      this.cache.set(id, result);
    }

    return result;
  }

  /** Get a cached generated level (for use during gameplay) */
  getGeneratedLevel(id: string): GeneratedLevel | null {
    return this.cache.get(id) ?? null;
  }

  /** Get the LevelConfig for a level ID */
  getConfig(id: string): LevelConfig | null {
    return this.levels.get(id) ?? null;
  }

  /** Find all portal links that originate from a given level */
  getPortalsFrom(levelId: string): PortalLink[] {
    return this.portals.filter(p => p.fromLevel === levelId);
  }

  /** Find all portal links that target a given level */
  getPortalsTo(levelId: string): PortalLink[] {
    return this.portals.filter(p => p.toLevel === levelId);
  }

  /** Find a specific portal link by ID */
  getPortal(id: string): PortalLink | null {
    return this.portals.find(p => p.id === id) ?? null;
  }

  /** Clear all cached generated levels (used on world reset) */
  clearCache(): void {
    this.cache.clear();
  }

  // ── Default Level Configs ───────────────────────────────────────
  // These mirror the original hardcoded generateCaveData() and
  // generateCursedLands() behaviors exactly, but as data.

  private registerDefaults(): void {
    // ── Underground Cave ──
    this.registerLevel({
      id: 'cave',
      name: 'Caverna Sombria',
      width: 80,
      height: 80,
      theme: DungeonTheme.Cave,
      mode: DungeonGeneratorMode.Noise,
      floorTile: TileType.CaveFloor,
      wallTile: TileType.CaveWall,
      hazardTile: {
        tileType: TileType.Lava,
        minDepthRatio: 0.625, // y > 50 out of 80
        chance: 0.15,
        poolSize: 3,
      },
      noiseParams: {
        threshold: 0.35,
        octaves: 4,
        scale: 16,
        persistence: 0.6,
      },
      entrancePolicy: EntrancePolicy.TopCenter,
      resourceBands: [
        // Upper cave (y < 30 / 80 = 0.375)
        {
          minDepthRatio: 0,
          maxDepthRatio: 0.375,
          items: [
            { itemId: 'iron_ore', resourceType: 'iron_rock', chance: 0.03 },
            { itemId: 'coal', resourceType: 'coal_rock', chance: 0.02 },
            { itemId: 'crystal', resourceType: 'crystal_node', chance: 0.015 },
          ],
          enemies: [
            { type: EnemyType.Bat, weight: 1 },
            { type: EnemyType.Skeleton, weight: 1 },
            { type: EnemyType.Spider, weight: 1 },
          ],
        },
        // Middle cave (y 30-55 / 80 = 0.375-0.6875)
        {
          minDepthRatio: 0.375,
          maxDepthRatio: 0.6875,
          items: [
            { itemId: 'mithril_ore', resourceType: 'mithril_rock', chance: 0.025 },
            { itemId: 'crystal', resourceType: 'crystal_node', chance: 0.015 },
            { itemId: 'gold_ore', resourceType: 'gold_rock', chance: 0.01 },
            { itemId: 'coal', resourceType: 'coal_rock', chance: 0.015 },
          ],
          enemies: [
            { type: EnemyType.CaveTroll, weight: 1 },
            { type: EnemyType.GiantBat, weight: 1 },
            { type: EnemyType.Skeleton, weight: 1 },
          ],
        },
        // Deep cave (y >= 55 / 80 = 0.6875)
        {
          minDepthRatio: 0.6875,
          maxDepthRatio: 1.0,
          items: [
            { itemId: 'ruby_ore', resourceType: 'ruby_rock', chance: 0.02 },
            { itemId: 'mithril_ore', resourceType: 'mithril_rock', chance: 0.015 },
            { itemId: 'crystal', resourceType: 'crystal_node', chance: 0.01 },
            { itemId: 'iron_ore', resourceType: 'iron_rock', chance: 0.015 },
          ],
          enemies: [
            { type: EnemyType.LavaSpider, weight: 1 },
            { type: EnemyType.CrystalGolem, weight: 1 },
            { type: EnemyType.CaveTroll, weight: 1 },
          ],
        },
      ],
      enemyBands: [
        // Enemies use the same DepthBands as resources (the bands define both)
        // Copy the bands but only enemies matter here
        {
          minDepthRatio: 0,
          maxDepthRatio: 0.375,
          items: [],
          enemies: [
            { type: EnemyType.Bat, weight: 1 },
            { type: EnemyType.Skeleton, weight: 1 },
            { type: EnemyType.Spider, weight: 1 },
          ],
        },
        {
          minDepthRatio: 0.375,
          maxDepthRatio: 0.6875,
          items: [],
          enemies: [
            { type: EnemyType.CaveTroll, weight: 1 },
            { type: EnemyType.GiantBat, weight: 1 },
            { type: EnemyType.Skeleton, weight: 1 },
          ],
        },
        {
          minDepthRatio: 0.6875,
          maxDepthRatio: 1.0,
          items: [],
          enemies: [
            { type: EnemyType.LavaSpider, weight: 1 },
            { type: EnemyType.CrystalGolem, weight: 1 },
            { type: EnemyType.CaveTroll, weight: 1 },
          ],
        },
      ],
      boss: {
        type: EnemyType.ShadowLord,
        position: 'deepest',
      },
      specialPlacements: [
        {
          type: 'portal',
          itemId: 'portal',
          tileX: 40,
          tileY: 72,
          carveRadius: 3,
        },
      ],
      ensureConnectivity: true,
    });

    // ── Cursed Lands ──
    this.registerLevel({
      id: 'cursed_lands',
      name: 'Terras Amaldiçoadas',
      width: 60,
      height: 60,
      theme: DungeonTheme.Cursed,
      mode: DungeonGeneratorMode.Noise,
      floorTile: TileType.CaveFloor,
      wallTile: TileType.CaveWall,
      noiseParams: {
        threshold: 0.30,
        octaves: 5,
        scale: 12,
        persistence: 0.55,
      },
      entrancePolicy: EntrancePolicy.TopCenter,
      resourceBands: [
        {
          minDepthRatio: 0,
          maxDepthRatio: 1.0,
          items: [
            { itemId: 'void_crystal', resourceType: 'crystal_node', chance: 0.015 },
            { itemId: 'abyssal_gem', resourceType: 'crystal_node', chance: 0.01 },
            { itemId: 'dark_essence', resourceType: 'crystal_node', chance: 0.015 },
            { itemId: 'void_ore', resourceType: 'iron_rock', chance: 0.015 },
            { itemId: 'shadow_ore', resourceType: 'iron_rock', chance: 0.015 },
            { itemId: 'mithril_ore', resourceType: 'iron_rock', chance: 0.01 },
            { itemId: 'crystal', resourceType: 'crystal_node', chance: 0.01 },
          ],
          enemies: [
            { type: EnemyType.Skeleton, weight: 4 },
            { type: EnemyType.DarkKnight, weight: 3.5 },
            { type: EnemyType.ShadowLord, weight: 2.5 },
          ],
        },
      ],
      enemyBands: [
        {
          minDepthRatio: 0,
          maxDepthRatio: 1.0,
          items: [],
          enemies: [
            { type: EnemyType.Skeleton, weight: 4 },
            { type: EnemyType.DarkKnight, weight: 3.5 },
            { type: EnemyType.ShadowLord, weight: 2.5 },
          ],
        },
      ],
      boss: {
        type: EnemyType.VoidWarden,
        position: 'center',
      },
      specialPlacements: [
        {
          type: 'cave_entrance',
          itemId: 'cave_entrance',
          tileX: 30,
          tileY: 1,
          carveRadius: 2,
        },
      ],
      ensureConnectivity: true,
    });

    // ── Ice Caves ──
    this.registerLevel({
      id: 'ice_caves',
      name: 'Cavernas de Gelo',
      width: 70,
      height: 70,
      theme: DungeonTheme.Ice,
      mode: DungeonGeneratorMode.Noise,
      floorTile: TileType.CaveFloor,
      wallTile: TileType.CaveWall,
      noiseParams: {
        threshold: 0.32,
        octaves: 4,
        scale: 14,
        persistence: 0.55,
      },
      entrancePolicy: EntrancePolicy.TopCenter,
      resourceBands: [
        {
          minDepthRatio: 0,
          maxDepthRatio: 1.0,
          items: [
            { itemId: 'crystal', resourceType: 'crystal_node', chance: 0.03 },
            { itemId: 'mithril_ore', resourceType: 'mithril_rock', chance: 0.02 },
            { itemId: 'coal', resourceType: 'coal_rock', chance: 0.025 },
            { itemId: 'iron_ore', resourceType: 'iron_rock', chance: 0.02 },
          ],
          enemies: [
            { type: EnemyType.CrystalGolem, weight: 2 },
            { type: EnemyType.Bat, weight: 1.5 },
            { type: EnemyType.Skeleton, weight: 1 },
          ],
        },
      ],
      enemyBands: [
        {
          minDepthRatio: 0,
          maxDepthRatio: 1.0,
          items: [],
          enemies: [
            { type: EnemyType.CrystalGolem, weight: 2 },
            { type: EnemyType.Bat, weight: 1.5 },
            { type: EnemyType.Skeleton, weight: 1 },
          ],
        },
      ],
      boss: {
        type: EnemyType.CrystalGolem,
        position: 'deepest',
      },
      specialPlacements: [
        {
          type: 'cave_entrance',
          itemId: 'cave_entrance',
          tileX: 35,
          tileY: 1,
          carveRadius: 2,
        },
      ],
      ensureConnectivity: true,
    });

    // ── Volcanic Mine ──
    this.registerLevel({
      id: 'volcanic_mine',
      name: 'Mina Vulcânica',
      width: 75,
      height: 75,
      theme: DungeonTheme.Volcanic,
      mode: DungeonGeneratorMode.Noise,
      floorTile: TileType.CaveFloor,
      wallTile: TileType.CaveWall,
      hazardTile: {
        tileType: TileType.Lava,
        minDepthRatio: 0.5,
        chance: 0.2,
        poolSize: 4,
      },
      noiseParams: {
        threshold: 0.38,
        octaves: 4,
        scale: 18,
        persistence: 0.5,
      },
      entrancePolicy: EntrancePolicy.TopCenter,
      resourceBands: [
        {
          minDepthRatio: 0,
          maxDepthRatio: 0.5,
          items: [
            { itemId: 'lava_crystal', resourceType: 'crystal_node', chance: 0.025 },
            { itemId: 'gold_ore', resourceType: 'gold_rock', chance: 0.02 },
            { itemId: 'coal', resourceType: 'coal_rock', chance: 0.03 },
          ],
          enemies: [
            { type: EnemyType.LavaSpider, weight: 2 },
            { type: EnemyType.CaveTroll, weight: 1.5 },
            { type: EnemyType.GiantBat, weight: 1 },
          ],
        },
        {
          minDepthRatio: 0.5,
          maxDepthRatio: 1.0,
          items: [
            { itemId: 'lava_crystal', resourceType: 'crystal_node', chance: 0.035 },
            { itemId: 'ruby_ore', resourceType: 'ruby_rock', chance: 0.025 },
            { itemId: 'gold_ore', resourceType: 'gold_rock', chance: 0.015 },
            { itemId: 'mithril_ore', resourceType: 'mithril_rock', chance: 0.01 },
          ],
          enemies: [
            { type: EnemyType.LavaSpider, weight: 2.5 },
            { type: EnemyType.CaveTroll, weight: 1.5 },
            { type: EnemyType.GiantBat, weight: 0.5 },
          ],
        },
      ],
      enemyBands: [
        {
          minDepthRatio: 0,
          maxDepthRatio: 0.5,
          items: [],
          enemies: [
            { type: EnemyType.LavaSpider, weight: 2 },
            { type: EnemyType.CaveTroll, weight: 1.5 },
            { type: EnemyType.GiantBat, weight: 1 },
          ],
        },
        {
          minDepthRatio: 0.5,
          maxDepthRatio: 1.0,
          items: [],
          enemies: [
            { type: EnemyType.LavaSpider, weight: 2.5 },
            { type: EnemyType.CaveTroll, weight: 1.5 },
            { type: EnemyType.GiantBat, weight: 0.5 },
          ],
        },
      ],
      boss: {
        type: EnemyType.LavaSpider,
        position: 'deepest',
      },
      specialPlacements: [
        {
          type: 'cave_entrance',
          itemId: 'cave_entrance',
          tileX: 37,
          tileY: 1,
          carveRadius: 2,
        },
      ],
      ensureConnectivity: true,
    });

    // ── Crystal Depths ──
    this.registerLevel({
      id: 'crystal_depths',
      name: 'Profundezas de Cristal',
      width: 65,
      height: 65,
      theme: DungeonTheme.Crystal,
      mode: DungeonGeneratorMode.Cellular,
      floorTile: TileType.CaveFloor,
      wallTile: TileType.CaveWall,
      cellularParams: {
        initialFillChance: 0.42,
        iterations: 5,
        birthLimit: 4,
        deathLimit: 3,
      },
      entrancePolicy: EntrancePolicy.TopCenter,
      resourceBands: [
        {
          minDepthRatio: 0,
          maxDepthRatio: 1.0,
          items: [
            { itemId: 'crystal', resourceType: 'crystal_node', chance: 0.04 },
            { itemId: 'ruby_ore', resourceType: 'ruby_rock', chance: 0.025 },
            { itemId: 'mithril_ore', resourceType: 'mithril_rock', chance: 0.02 },
            { itemId: 'gold_ore', resourceType: 'gold_rock', chance: 0.015 },
          ],
          enemies: [
            { type: EnemyType.CrystalGolem, weight: 2.5 },
            { type: EnemyType.CaveTroll, weight: 1.5 },
            { type: EnemyType.Bat, weight: 0.5 },
          ],
        },
      ],
      enemyBands: [
        {
          minDepthRatio: 0,
          maxDepthRatio: 1.0,
          items: [],
          enemies: [
            { type: EnemyType.CrystalGolem, weight: 2.5 },
            { type: EnemyType.CaveTroll, weight: 1.5 },
            { type: EnemyType.Bat, weight: 0.5 },
          ],
        },
      ],
      boss: {
        type: EnemyType.CrystalGolem,
        position: 'center',
      },
      specialPlacements: [
        {
          type: 'cave_entrance',
          itemId: 'cave_entrance',
          tileX: 32,
          tileY: 1,
          carveRadius: 2,
        },
      ],
      ensureConnectivity: true,
    });

    // ── Portal Links ────────────────────────────────────────────────
    // These define how levels connect to each other.

    // Surface portal (in mountains/ruins) → Cursed Lands
    this.addPortal({
      id: 'surface_to_cursed',
      fromLevel: 'surface',
      fromPos: { x: 0, y: 0 }, // Placed dynamically by WorldGenerator
      toLevel: 'cursed_lands',
      toEntrance: { x: 30, y: 1 },
      requiredLevel: 6,
    });

    // Cave portal (deep inside cave) → Cursed Lands
    this.addPortal({
      id: 'cave_to_cursed',
      fromLevel: 'cave',
      fromPos: { x: 40, y: 72 }, // Matches specialPlacement in cave config
      toLevel: 'cursed_lands',
      toEntrance: { x: 30, y: 1 },
      requiredLevel: 6,
    });

    // Cursed Lands return portal → Surface
    this.addPortal({
      id: 'cursed_to_surface',
      fromLevel: 'cursed_lands',
      fromPos: { x: 30, y: 1 }, // Near entrance
      toLevel: 'surface',
      toEntrance: { x: 0, y: 0 }, // Restore saved surface position
      requiredLevel: undefined,
    });

    // Cave exit → Surface
    this.addPortal({
      id: 'cave_to_surface',
      fromLevel: 'cave',
      fromPos: { x: 40, y: 0 }, // Near entrance (top-center)
      toLevel: 'surface',
      toEntrance: { x: 0, y: 0 }, // Restore saved surface position
      requiredLevel: undefined,
    });

    // ── New Dungeons Portal Links ───────────────────────────────────

    // Surface (Tundra) → Ice Caves
    this.addPortal({
      id: 'surface_to_ice_caves',
      fromLevel: 'surface',
      fromPos: { x: 0, y: 0 }, // Placed dynamically by WorldGenerator in Tundra biomes
      toLevel: 'ice_caves',
      toEntrance: { x: 35, y: 1 },
      requiredLevel: 8,
    });

    // Ice Caves exit → Surface
    this.addPortal({
      id: 'ice_caves_to_surface',
      fromLevel: 'ice_caves',
      fromPos: { x: 35, y: 0 },
      toLevel: 'surface',
      toEntrance: { x: 0, y: 0 },
      requiredLevel: undefined,
    });

    // Surface (Volcanic biome) → Volcanic Mine
    this.addPortal({
      id: 'surface_to_volcanic_mine',
      fromLevel: 'surface',
      fromPos: { x: 0, y: 0 }, // Placed dynamically by WorldGenerator in Volcanic biomes
      toLevel: 'volcanic_mine',
      toEntrance: { x: 37, y: 1 },
      requiredLevel: 10,
    });

    // Volcanic Mine exit → Surface
    this.addPortal({
      id: 'volcanic_mine_to_surface',
      fromLevel: 'volcanic_mine',
      fromPos: { x: 37, y: 0 },
      toLevel: 'surface',
      toEntrance: { x: 0, y: 0 },
      requiredLevel: undefined,
    });

    // Surface (Mountains/Ruins) → Crystal Depths
    this.addPortal({
      id: 'surface_to_crystal_depths',
      fromLevel: 'surface',
      fromPos: { x: 0, y: 0 },
      toLevel: 'crystal_depths',
      toEntrance: { x: 32, y: 1 },
      requiredLevel: 12,
    });

    // Crystal Depths exit → Surface
    this.addPortal({
      id: 'crystal_depths_to_surface',
      fromLevel: 'crystal_depths',
      fromPos: { x: 32, y: 0 },
      toLevel: 'surface',
      toEntrance: { x: 0, y: 0 },
      requiredLevel: undefined,
    });
  }
}

/** Singleton instance for the entire game session */
export const worldRegistry = new WorldRegistry();
