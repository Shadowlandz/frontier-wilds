// ═══════════════════════════════════════════════════════════════════
// Farm Survival - Generic Config-Driven Dungeon Generator
// ═══════════════════════════════════════════════════════════════════
// Generates any dungeon/level layout from a LevelConfig:
//   - Noise: fractal noise threshold carving
//   - Cellular: cellular automata for organic caves
//   - BSP: binary space partition for structured rooms + corridors
//   - Flood fill: ensures all floor tiles are reachable from entrance
//   - Depth-band resources & enemies
//   - Boss & special placements (portals, chests, etc.)
// ═══════════════════════════════════════════════════════════════════

import {
  TileType,
  TILE_SIZE,
  EnemyType,
  Vec2,
  LevelConfig,
  GeneratedLevel,
  EntrancePolicy,
  DungeonGeneratorMode,
  levelSeed,
} from '../core/Types';
import { fractalNoise, SeededRandom } from '../core/Utils';

export class DungeonGenerator {
  /**
   * Generate a dungeon/level from a config.
   * @param config     - LevelConfig describing the dungeon.
   * @param baseSeed   - World seed used to derive the dungeon seed.
   * @param randomSeed - Optional override seed. If provided, each call produces
   *                     a different layout (used for re-entry randomization).
   */
  generate(config: LevelConfig, baseSeed: number, randomSeed?: number): GeneratedLevel {
    const seed = randomSeed ?? levelSeed(baseSeed, config.id);
    const rng = new SeededRandom(seed);
    const w = config.width;
    const h = config.height;

    // Step 1: Carve the base tile map using the configured mode
    let tileMap = this.carveLayout(config, seed, rng, w, h);

    // Step 2: Carve guaranteed paths from entrance
    this.carveEntrancePath(config, tileMap, w, h);

    // Step 3: Apply flood fill to ensure connectivity
    if (config.ensureConnectivity) {
      this.floodFillConnect(tileMap, w, h, config.floorTile);
    }

    // Step 4: Place boss
    const { entranceX, entranceY } = this.getEntrancePosition(config, w, h);
    const bossPlacement = this.placeBoss(config, w, h, rng);

    // Step 5: Place resources by depth bands
    const resources = this.placeResources(config, tileMap, w, h, rng);

    // Step 6: Place enemies by depth bands
    const enemies = this.placeEnemies(config, tileMap, w, h, rng);

    // Step 7: Add boss enemy
    if (bossPlacement) {
      enemies.push(bossPlacement);
    }

    // Step 8: Place special items (portals, chests, etc.)
    this.placeSpecialItems(config, tileMap, w, h, resources, rng);

    return {
      configId: config.id,
      tileMap,
      resources,
      enemies,
      entranceX: entranceX * TILE_SIZE,
      entranceY: entranceY * TILE_SIZE,
      width: w,
      height: h,
    };
  }

  // ── Layout Carving ──────────────────────────────────────────────

  private carveLayout(config: LevelConfig, seed: number, rng: SeededRandom, w: number, h: number): TileType[][] {
    switch (config.mode) {
      case DungeonGeneratorMode.Noise:
        return this.carveNoise(config, seed, w, h);
      case DungeonGeneratorMode.Cellular:
        return this.carveCellular(config, rng, w, h);
      case DungeonGeneratorMode.BSP:
        return this.carveBSP(config, rng, w, h);
      default:
        return this.carveNoise(config, seed, w, h);
    }
  }

  /** Noise-based carving: fractal noise threshold → open areas */
  private carveNoise(config: LevelConfig, seed: number, w: number, h: number): TileType[][] {
    const params = config.noiseParams ?? { threshold: 0.35, octaves: 4, scale: 16, persistence: 0.6 };
    const noiseSeed = levelSeed(seed, 'noise');
    const tileMap = this.createEmptyMap(w, h, config.wallTile);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const n = fractalNoise(x, y, noiseSeed, params.octaves, params.scale, params.persistence);
        if (n > params.threshold) {
          tileMap[y][x] = config.floorTile;
        }
      }
    }

    // Add hazards if configured
    if (config.hazardTile) {
      this.addHazards(config, tileMap, seed, w, h);
    }

    return tileMap;
  }

  /** Cellular automata carving: start random, iterate birth/death rules */
  private carveCellular(config: LevelConfig, rng: SeededRandom, w: number, h: number): TileType[][] {
    const params = config.cellularParams ?? { initialFillChance: 0.45, iterations: 4, birthLimit: 4, deathLimit: 3 };
    let tileMap = this.createEmptyMap(w, h, config.wallTile);

    // Random initial fill
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        tileMap[y][x] = rng.next() < params.initialFillChance ? config.floorTile : config.wallTile;
      }
    }

    // Iterate automata rules
    for (let iter = 0; iter < params.iterations; iter++) {
      const next = this.createEmptyMap(w, h, config.wallTile);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const floorNeighbors = this.countNeighborType(tileMap, x, y, w, h, config.floorTile);
          if (tileMap[y][x] === config.wallTile) {
            // Birth: wall becomes floor if enough floor neighbors
            next[y][x] = floorNeighbors >= params.birthLimit ? config.floorTile : config.wallTile;
          } else {
            // Death: floor becomes wall if too few floor neighbors
            next[y][x] = floorNeighbors >= params.deathLimit ? config.floorTile : config.wallTile;
          }
        }
      }
      tileMap = next;
    }

    // Add hazards if configured
    if (config.hazardTile) {
      this.addHazards(config, tileMap, 0, w, h);
    }

    return tileMap;
  }

  /** BSP carving: partition space into rooms + corridors */
  private carveBSP(config: LevelConfig, rng: SeededRandom, w: number, h: number): TileType[][] {
    const params = config.bspParams ?? { minRoomSize: 6, maxRoomSize: 12, corridorWidth: 2, maxIterations: 8 };
    const tileMap = this.createEmptyMap(w, h, config.wallTile);

    // BSP tree: recursively partition space
    interface BSPNode {
      x: number; y: number; w: number; h: number;
      childA?: BSPNode;
      childB?: BSPNode;
      room?: { x: number; y: number; w: number; h: number };
    }

    function split(node: BSPNode, depth: number, maxDepth: number, minSize: number, _rng: SeededRandom): void {
      if (depth >= maxDepth || (node.w < minSize * 2 && node.h < minSize * 2)) return;

      // Choose split direction: prefer the longer axis
      const splitH = node.w >= node.h && (node.w >= minSize * 2 || node.h < minSize * 2);
      if (splitH) {
        const splitPoint = Math.floor(node.w * (0.3 + _rng.next() * 0.4));
        const leftW = Math.max(minSize, splitPoint);
        const rightW = Math.max(minSize, node.w - splitPoint);
        node.childA = { x: node.x, y: node.y, w: leftW, h: node.h };
        node.childB = { x: node.x + leftW, y: node.y, w: rightW, h: node.h };
      } else {
        const splitPoint = Math.floor(node.h * (0.3 + _rng.next() * 0.4));
        const topH = Math.max(minSize, splitPoint);
        const botH = Math.max(minSize, node.h - splitPoint);
        node.childA = { x: node.x, y: node.y, w: node.w, h: topH };
        node.childB = { x: node.x, y: node.y + topH, w: node.w, h: botH };
      }
      split(node.childA!, depth + 1, maxDepth, minSize, _rng);
      split(node.childB!, depth + 1, maxDepth, minSize, _rng);
    }

    function createRooms(node: BSPNode, _rng: SeededRandom, floorTile: TileType, _tileMap: TileType[][]): void {
      if (node.childA && node.childB) {
        createRooms(node.childA, _rng, floorTile, _tileMap);
        createRooms(node.childB, _rng, floorTile, _tileMap);
        // Carve corridor connecting the two children
        const roomA = node.childA.room ?? { x: node.childA.x + 1, y: node.childA.y + 1, w: Math.max(2, node.childA.w - 2), h: Math.max(2, node.childA.h - 2) };
        const roomB = node.childB.room ?? { x: node.childB.x + 1, y: node.childB.y + 1, w: Math.max(2, node.childB.w - 2), h: Math.max(2, node.childB.h - 2) };
        const ax = Math.floor(roomA.x + roomA.w / 2);
        const ay = Math.floor(roomA.y + roomA.h / 2);
        const bx = Math.floor(roomB.x + roomB.w / 2);
        const by = Math.floor(roomB.y + roomB.h / 2);
        // L-shaped corridor
        const cw = params.corridorWidth;
        for (let dy = -cw; dy <= cw; dy++) {
          for (let dx = -cw; dx <= cw; dx++) {
            // Horizontal then vertical
            for (let cx = Math.min(ax, bx); cx <= Math.max(ax, bx); cx++) {
              const cy = ay + dy;
              if (cy >= 0 && cy < _tileMap.length && cx >= 0 && cx < _tileMap[0].length) {
                _tileMap[cy][cx] = floorTile;
              }
            }
            for (let cy = Math.min(ay, by); cy <= Math.max(ay, by); cy++) {
              const cx = bx + dx;
              if (cy >= 0 && cy < _tileMap.length && cx >= 0 && cx < _tileMap[0].length) {
                _tileMap[cy][cx] = floorTile;
              }
            }
          }
        }
      } else {
        // Leaf node: create a room
        const margin = 1;
        const room = {
          x: node.x + margin,
          y: node.y + margin,
          w: Math.max(3, node.w - margin * 2),
          h: Math.max(3, node.h - margin * 2),
        };
        node.room = room;
        // Cap room size
        const maxSize = config.bspParams?.maxRoomSize ?? 12;
        if (room.w > maxSize) { room.w = maxSize; }
        if (room.h > maxSize) { room.h = maxSize; }
        for (let ry = room.y; ry < room.y + room.h && ry < _tileMap.length; ry++) {
          for (let rx = room.x; rx < room.x + room.w && rx < _tileMap[0].length; rx++) {
            _tileMap[ry][rx] = floorTile;
          }
        }
      }
    }

    const root: BSPNode = { x: 0, y: 0, w, h };
    split(root, 0, params.maxIterations, params.minRoomSize, rng);
    createRooms(root, rng, config.floorTile, tileMap);

    return tileMap;
  }

  // ── Hazards ──────────────────────────────────────────────────────

  private addHazards(config: LevelConfig, tileMap: TileType[][], seed: number, w: number, h: number): void {
    if (!config.hazardTile) return;
    const { tileType: hazardType, minDepthRatio, chance, poolSize } = config.hazardTile;
    const hazardSeed = seed !== 0 ? levelSeed(seed, 'hazards') : (levelSeed(0, 'hazards'));
    const minDepthY = Math.floor(h * minDepthRatio);

    for (let y = minDepthY; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const noise = fractalNoise(x, y, hazardSeed, 2, 40);
        if (noise > 0.45 && tileMap[y][x] === config.floorTile) {
          let floorNeighbors = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              const nx = x + dx, ny = y + dy;
              if (nx >= 0 && nx < w && ny >= 0 && ny < h && tileMap[ny][nx] === config.floorTile) {
                floorNeighbors++;
              }
            }
          }
          if (floorNeighbors >= 3 && Math.random() < chance) {
            const halfPool = Math.floor(poolSize / 2);
            for (let dy = -halfPool; dy <= halfPool; dy++) {
              for (let dx = -halfPool; dx <= halfPool; dx++) {
                const lx = x + dx, ly = y + dy;
                if (lx >= 0 && lx < w && ly >= 0 && ly < h) {
                  tileMap[ly][lx] = hazardType;
                }
              }
            }
          }
        }
      }
    }
  }

  // ── Entrance Paths ──────────────────────────────────────────────

  private carveEntrancePath(config: LevelConfig, tileMap: TileType[][], w: number, h: number): void {
    let entranceX: number, entranceY: number;

    switch (config.entrancePolicy) {
      case EntrancePolicy.TopCenter:
        entranceX = Math.floor(w / 2);
        entranceY = 0;
        break;
      case EntrancePolicy.BottomCenter:
        entranceX = Math.floor(w / 2);
        entranceY = h - 1;
        break;
      case EntrancePolicy.RandomEdge: {
        const side = Math.floor(Math.random() * 4);
        switch (side) {
          case 0: entranceX = Math.floor(Math.random() * w); entranceY = 0; break;
          case 1: entranceX = w - 1; entranceY = Math.floor(Math.random() * h); break;
          case 2: entranceX = Math.floor(Math.random() * w); entranceY = h - 1; break;
          default: entranceX = 0; entranceY = Math.floor(Math.random() * h); break;
        }
        break;
      }
      case EntrancePolicy.Specific:
        if (config.specificEntrance) {
          entranceX = config.specificEntrance.x;
          entranceY = config.specificEntrance.y;
        } else {
          entranceX = Math.floor(w / 2);
          entranceY = 0;
        }
        break;
      default:
        entranceX = Math.floor(w / 2);
        entranceY = 0;
    }

    // Carve vertical corridor from entrance
    for (let y = 0; y < h; y++) {
      for (let offsetX = -1; offsetX <= 1; offsetX++) {
        const cx = entranceX + offsetX;
        if (cx >= 0 && cx < w) {
          tileMap[y][cx] = config.floorTile;
        }
      }
    }

    // Additional horizontal corridors at depth intervals
    const corridorYs = [
      Math.floor(h * 0.25),
      Math.floor(h * 0.5),
      Math.floor(h * 0.75),
    ];
    for (const cy of corridorYs) {
      for (let x = 0; x < w; x++) {
        if (tileMap[cy] && tileMap[cy][x] === config.wallTile) {
          if (Math.random() < 0.3) {
            tileMap[cy][x] = config.floorTile;
            if (cy + 1 < h) tileMap[cy + 1][x] = config.floorTile;
          }
        }
      }
    }
  }

  // ── Flood Fill Connectivity ─────────────────────────────────────

  private floodFillConnect(tileMap: TileType[][], w: number, h: number, floorTile: TileType): void {
    // Find entrance point (first floor tile at top)
    let startX = -1, startY = -1;
    for (let x = 0; x < w; x++) {
      if (tileMap[0][x] === floorTile) {
        startX = x;
        startY = 0;
        break;
      }
    }
    if (startX === -1) return;

    // BFS flood fill from entrance to mark reachable tiles
    const visited: boolean[][] = Array.from({ length: h }, () => Array(w).fill(false));
    const queue: Vec2[] = [{ x: startX, y: startY }];
    visited[startY][startX] = true;

    while (queue.length > 0) {
      const { x, y } = queue.shift()!;
      const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
      for (const [dx, dy] of dirs) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && nx < w && ny >= 0 && ny < h && !visited[ny][nx] && tileMap[ny][nx] === floorTile) {
          visited[ny][nx] = true;
          queue.push({ x: nx, y: ny });
        }
      }
    }

    // Convert unreachable floor tiles back to wall
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (tileMap[y][x] === floorTile && !visited[y][x]) {
          tileMap[y][x] = findDefaultWallTile(tileMap, w, h);
        }
      }
    }
  }

  // ── Boss Placement ──────────────────────────────────────────────

  private placeBoss(
    config: LevelConfig, w: number, h: number, rng: SeededRandom
  ): { x: number; y: number; type: EnemyType } | null {
    if (!config.boss) return null;
    const { type, position } = config.boss;

    let bx: number, by: number;
    if (typeof position === 'object' && 'x' in position) {
      // Specific Vec2
      bx = position.x * TILE_SIZE;
      by = position.y * TILE_SIZE;
    } else if (position === 'deepest') {
      // Place at deepest reachable area (bottom-center)
      bx = Math.floor(w / 2) * TILE_SIZE;
      by = (h - 3) * TILE_SIZE;
    } else {
      // Center
      bx = Math.floor(w / 2) * TILE_SIZE;
      by = Math.floor(h / 2) * TILE_SIZE;
    }

    // Add some randomness to boss position
    bx += Math.floor(rng.range(-TILE_SIZE / 2, TILE_SIZE / 2));
    by += Math.floor(rng.range(-TILE_SIZE / 2, TILE_SIZE / 2));

    return { x: bx, y: by, type };
  }

  // ── Resource Placement ──────────────────────────────────────────

  private placeResources(
    config: LevelConfig, tileMap: TileType[][], w: number, h: number, rng: SeededRandom
  ): { x: number; y: number; type: string; itemId: string }[] {
    const resources: { x: number; y: number; type: string; itemId: string }[] = [];

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (tileMap[y][x] !== config.floorTile) continue;

        const yRatio = y / h;
        for (const band of config.resourceBands) {
          if (yRatio >= band.minDepthRatio && yRatio <= band.maxDepthRatio) {
            const n = rng.next();
            for (const item of band.items) {
              if (n < item.chance) {
                resources.push({
                  x: x * TILE_SIZE + rng.range(0, TILE_SIZE),
                  y: y * TILE_SIZE + rng.range(0, TILE_SIZE),
                  type: item.resourceType,
                  itemId: item.itemId,
                });
                break; // Only place one resource per tile
              }
            }
            break; // Only check the first matching band
          }
        }
      }
    }

    return resources;
  }

  // ── Enemy Placement ─────────────────────────────────────────────

  private placeEnemies(
    config: LevelConfig, tileMap: TileType[][], w: number, h: number, rng: SeededRandom
  ): { x: number; y: number; type: EnemyType }[] {
    const enemies: { x: number; y: number; type: EnemyType }[] = [];

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (tileMap[y][x] !== config.floorTile) continue;

        // Check for hazard tiles too (enemies can spawn on lava adjacent)
        if (config.hazardTile && tileMap[y][x] === config.hazardTile.tileType) continue;

        const yRatio = y / h;
        for (const band of config.enemyBands) {
          if (yRatio >= band.minDepthRatio && yRatio <= band.maxDepthRatio && band.enemies) {
            if (rng.next() > 0.005) continue; // ~0.5% spawn rate per floor tile

            const px = x * TILE_SIZE + rng.range(0, TILE_SIZE);
            const py = y * TILE_SIZE + rng.range(0, TILE_SIZE);

            // Weighted random enemy pick
            const totalWeight = band.enemies.reduce((sum, e) => sum + e.weight, 0);
            let roll = rng.next() * totalWeight;
            for (const e of band.enemies) {
              roll -= e.weight;
              if (roll <= 0) {
                enemies.push({ x: px, y: py, type: e.type });
                break;
              }
            }
            break;
          }
        }
      }
    }

    return enemies;
  }

  // ── Special Placements (portals, chests, etc.) ──────────────────

  private placeSpecialItems(
    config: LevelConfig, tileMap: TileType[][], w: number, h: number,
    resources: { x: number; y: number; type: string; itemId: string }[], rng: SeededRandom
  ): void {
    if (!config.specialPlacements) return;

    for (const spec of config.specialPlacements) {
      // Carve open area around the placement
      const radius = spec.carveRadius ?? 0;
      if (radius > 0) {
        for (let deltaY = -radius; deltaY <= radius; deltaY++) {
          for (let deltaX = -radius; deltaX <= radius; deltaX++) {
            const px = spec.tileX + deltaX;
            const py = spec.tileY + deltaY;
            if (px >= 0 && px < w && py >= 0 && py < h) {
              tileMap[py][px] = config.floorTile;
            }
          }
        }
      }

      resources.push({
        x: spec.tileX * TILE_SIZE + Math.floor(TILE_SIZE / 2),
        y: spec.tileY * TILE_SIZE + Math.floor(TILE_SIZE / 2),
        type: spec.type,
        itemId: spec.itemId,
      });
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────

  private createEmptyMap(w: number, h: number, fillTile: TileType): TileType[][] {
    return Array.from({ length: h }, () => Array(w).fill(fillTile));
  }

  private getEntrancePosition(config: LevelConfig, w: number, h: number): { entranceX: number; entranceY: number } {
    switch (config.entrancePolicy) {
      case EntrancePolicy.TopCenter:
        return { entranceX: Math.floor(w / 2), entranceY: 0 };
      case EntrancePolicy.BottomCenter:
        return { entranceX: Math.floor(w / 2), entranceY: h - 1 };
      case EntrancePolicy.Specific:
        if (config.specificEntrance) return { entranceX: config.specificEntrance.x, entranceY: config.specificEntrance.y };
        return { entranceX: Math.floor(w / 2), entranceY: 0 };
      case EntrancePolicy.RandomEdge:
        return { entranceX: Math.floor(w / 2), entranceY: 0 };
      default:
        return { entranceX: Math.floor(w / 2), entranceY: 0 };
    }
  }

  private countNeighborType(tileMap: TileType[][], x: number, y: number, w: number, h: number, tileType: TileType): number {
    let count = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && nx < w && ny >= 0 && ny < h && tileMap[ny][nx] === tileType) {
          count++;
        }
      }
    }
    return count;
  }
}

/** When flood fill finds unreachable floor tiles, convert them to a suitable wall type */
function findDefaultWallTile(tileMap: TileType[][], w: number, h: number): TileType {
  // Try to find the most common non-floor tile type
  const counts = new Map<number, number>();
  for (let y = 0; y < h && y < 10; y++) {
    for (let x = 0; x < w && x < 10; x++) {
      const t = tileMap[y][x];
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  let bestTile: TileType = TileType.CaveWall;
  let bestCount = 0;
  for (const [tile, count] of counts) {
    const tileType = tile as TileType;
    if (count > bestCount && tileType !== TileType.CaveFloor) {
      bestCount = count;
      bestTile = tileType;
    }
  }
  return bestTile;
}
