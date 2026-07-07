// ═══════════════════════════════════════════════════════════════════
// Farm Survival - Main Game Engine
// ═══════════════════════════════════════════════════════════════════

import {
  GameState, PlayerState, WorldState, GameTime, InventorySlot,
  Vec2, TileType, TILE_SIZE, PLAYER_SPEED, PLAYER_SIZE, DAY_LENGTH,
  TICK_RATE, INTERACT_RANGE, ATTACK_RANGE, PanelType,
  Weather, Season, Biome, EnemyEntity, NpcEntity, DroppedItem,
  DamageNumber, Particle, GameUIState, Notification, ItemCategory,
  Rarity, ItemDefinition, WORLD_WIDTH, WORLD_HEIGHT, PlayerAttributes,
  EnemyType,
} from './core/Types';
import { Input } from './core/Input';
import { Camera } from './core/Camera';
import {
  clamp, distance, normalize, scaleVec, generateId,
  SeededRandom, fractalNoise, darkenColor,
} from './core/Utils';
import { WorldGenerator, TILE_COLORS, getSkyColor, getSeasonTint, getSeasonForDay, getCaveSkyColor } from './world/WorldGenerator';
import type { CaveData, DecorationDef } from './world/WorldGenerator';
import { getItem } from './data/Items';
import { RECIPES } from './data/Recipes';
import { ENEMIES } from './data/Enemies';
import { NPCS } from './data/Npcs';
import { getQuestById } from './data/Quests';
import { SKILLS } from './data/Skills';
import { saveGame, loadGame, loadAutoSave, autoSave } from './systems/SaveSystem';

type GameUpdateCallback = (state: GameState, ui: GameUIState) => void;

export class Game {
  canvas!: HTMLCanvasElement;
  ctx!: CanvasRenderingContext2D;
  input: Input;
  camera: Camera;

  state!: GameState;
  ui: GameUIState;
  running = false;
  lastTime = 0;
  accumulator = 0;
  tickRate = 1 / TICK_RATE;

  private onUpdate?: GameUpdateCallback;
  private animationFrameId = 0;

  // Runtime entities
  enemies: EnemyEntity[] = [];
  npcs: NpcEntity[] = [];
  droppedItems: DroppedItem[] = [];
  damageNumbers: DamageNumber[] = [];
  particles: Particle[] = [];
  projectiles: { x: number; y: number; vx: number; vy: number; damage: number; lifetime: number; speed: number }[] = [];

  // World data
  biomeMap: Biome[][] = [];
  tileMap: TileType[][] = [];
  heightMap: number[][] = [];
  resources: { x: number; y: number; type: string; itemId: string; hp: number; id: string; maxHp: number; shakeTimer: number }[] = [];
  resourceRespawnQueue: { type: string; x: number; y: number; itemId: string; respawnTime: number }[] = [];
  private gatherCooldown = 0;

  // ── Cave System ─────────────────────────────────────────────────
  inCave = false;
  caveData: CaveData | null = null;
  caveEnemies: EnemyEntity[] = [];
  caveResources: { x: number; y: number; type: string; itemId: string; hp: number; id: string; maxHp: number; shakeTimer: number }[] = [];
  caveResourceRespawnQueue: { type: string; x: number; y: number; itemId: string; respawnTime: number }[] = [];
  surfacePosition: { x: number; y: number } = { x: 0, y: 0 };
  decorations: DecorationDef[] = [];

  // Resource colors per type for particles
  private resourceColors: Record<string, string> = {
    tree: '#2d5a1e', bush: '#4a8a3a',
    rock: '#8a8a8a', iron_rock: '#cd7f32',
    gold_rock: '#ffd700', coal_rock: '#4a4a4a',
    crystal_node: '#8acaff',
    mithril_rock: '#4ae0c0',
    ruby_rock: '#ff2244',
    cave_entrance: '#2a1a0a',
  };

  // Resource sizes for collision
  private resourceSizes: Record<string, { w: number; h: number; hp: number }> = {
    tree: { w: 24, h: 40, hp: 20 },
    bush: { w: 16, h: 16, hp: 8 },
    rock: { w: 20, h: 18, hp: 25 },
    iron_rock: { w: 20, h: 18, hp: 35 },
    gold_rock: { w: 18, h: 16, hp: 40 },
    coal_rock: { w: 18, h: 18, hp: 30 },
    crystal_node: { w: 16, h: 20, hp: 45 },
    mithril_rock: { w: 20, h: 18, hp: 60 },
    ruby_rock: { w: 18, h: 16, hp: 70 },
    cave_entrance: { w: 32, h: 32, hp: 99999 },
  };

  constructor() {
    this.input = new Input();
    this.camera = new Camera();
    this.ui = {
      activePanel: 'none',
      activeShopNpc: null,
      activeDialogueNpc: null,
      craftingCategory: ItemCategory.Tool,
      showMap: false,
      dragItem: null,
      hoveredItem: null,
      tooltipPosition: { x: 0, y: 0 },
    };
  }

  init(canvas: HTMLCanvasElement, onUpdate?: GameUpdateCallback): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.onUpdate = onUpdate;

    this.input.init(canvas);
    this.resize();

    window.addEventListener('resize', () => this.resize());

    // Generate world
    const seed = Math.floor(Math.random() * 999999);
    const generator = new WorldGenerator(seed);
    const { biomeMap, tileMap, heightMap } = generator.generate();

    this.biomeMap = biomeMap;
    this.tileMap = tileMap;
    this.heightMap = heightMap;

    // Generate decorations (purely visual)
    this.decorations = generator.generateDecorations(biomeMap);

    // Generate cave data (underground layer)
    this.caveData = generator.generateCaveData();
    this.inCave = false;

    // Generate surface resources
    const resourceDefs = generator.generateResources(biomeMap);
    this.resources = resourceDefs.map(r => ({
      ...r,
      hp: this.resourceSizes[r.type]?.hp ?? 10,
      maxHp: this.resourceSizes[r.type]?.hp ?? 10,
      id: generateId(),
      shakeTimer: 0,
    }));

    // Generate enemies
    const enemyDefs = generator.generateEnemies(biomeMap);
    this.enemies = enemyDefs.map(e => {
      const def = ENEMIES[e.type];
      return {
        id: generateId(), type: e.type,
        x: e.x, y: e.y,
        width: def.size, height: def.size,
        definition: def,
        hp: def.hp, maxHp: def.hp,
        state: 'idle' as const,
        direction: { x: 0, y: 0 },
        targetId: null,
        attackCooldown: 0,
        patrolTimer: 0,
        patrolDirection: { x: Math.random() - 0.5, y: Math.random() - 0.5 },
        knockback: { x: 0, y: 0 },
        deathTimer: 0,
      };
    });

    // Generate NPCs
    const npcDefs = generator.generateNpcs();
    this.npcs = npcDefs.map(n => {
      const def = NPCS[n.npcId];
      return {
        id: generateId(), type: 'npc',
        x: n.x, y: n.y,
        width: 24, height: 24,
        definition: def,
        dialogueIndex: 0,
      };
    });

    // Init player state at village center
    const cx = (WORLD_WIDTH * TILE_SIZE) / 2;
    const cy = (WORLD_HEIGHT * TILE_SIZE) / 2;

    this.state = {
      player: {
        x: cx, y: cy,
        facing: { x: 0, y: 1 },
        stats: {
          level: 1, xp: 0, xpToNext: 100,
          hp: 100, hunger: 100,
          maxHp: 100, maxHunger: 100,
          strength: 5, defense: 2, speed: PLAYER_SPEED,
          mining: 1, woodcutting: 1, farming: 1, fishing: 1,
          luck: 0, gold: 50, skillPoints: 0,
        },
        inventory: Array(27).fill(null).map(() => ({ item: null, count: 0 })),
        hotbar: Array(9).fill(null).map(() => ({ item: null, count: 0 })),
        equipment: {
          helmet: null, chest: null, boots: null, gloves: null,
          ring: null, amulet: null, weapon: null, tool: null,
        },
        isAttacking: false,
        attackTimer: 0,
        invincibleTimer: 0,
        currentTool: 0,
        stamina: 100,
        maxStamina: 100,
        exhaustionTimer: 0,
        isExhausted: false,
      },
      world: { seed, chunks: new Map(), resources: [], enemies: [], npcs: [], droppedItems: [] },
      quests: [],
      skills: {},
      structures: [],
      farmPlots: [],
      discoveredAreas: [],
      gameTime: {
        totalTicks: 0,
        dayTicks: 0,
        dayLength: DAY_LENGTH,
        hour: 8,
        minute: 0,
        day: 1,
        season: Season.Spring,
        weather: Weather.Clear,
        weatherTimer: 600,
        isNight: false,
      },
      settings: { musicVolume: 0.5, sfxVolume: 0.7, showMinimap: true, showDamageNumbers: true },
      notifications: [],
    };

    // Give starting items
    this.addToInventory('wood_axe', 1);
    this.addToInventory('wood_pickaxe', 1);
    this.addToInventory('wood_sword', 1);
    this.addToInventory('apple', 10);
    this.addToInventory('torch', 5);

    this.addNotification('Bem-vindo ao Farm Survival! Use WASD para mover.', 'info');
    this.addNotification('Colete recursos, faça craft e sobreviva!', 'info');

    // Auto-accept tutorial quest
    this.acceptQuest('tutorial_first_steps');
  }

  resize(): void {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    this.canvas.width = parent.clientWidth;
    this.canvas.height = parent.clientHeight;
    this.camera.resize(this.canvas.width, this.canvas.height);
  }

  start(): void {
    this.running = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.animationFrameId);
  }

  private loop = (time: number): void => {
    if (!this.running) return;

    const dt = Math.min((time - this.lastTime) / 1000, 0.1);
    this.lastTime = time;

    this.accumulator += dt;

    while (this.accumulator >= this.tickRate) {
      this.update(this.tickRate);
      this.accumulator -= this.tickRate;
    }

    this.render();
    this.input.update();
    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  // ── Update ──────────────────────────────────────────────────────
  private autoSaveTimer = 0;
  private autoSaveInterval = 60; // Auto-save every 60 seconds

  private update(dt: number): void {
    const { player, gameTime } = this.state;

    // Don't update game if a panel is open (except dialogue)
    const panelOpen = this.ui.activePanel !== 'none' && this.ui.activePanel !== 'dialogue';

    if (!panelOpen) {
      this.updatePlayer(dt);
      this.updateEnemies(dt);
      this.updateDroppedItems(dt);
      this.updateParticles(dt);
      this.updateDamageNumbers(dt);
      this.updateProjectiles(dt);
      this.handleInput();
    } else {
      this.handleUIInput();
    }

    // Always update time and camera
    this.updateTime(dt);
    this.updateCamera(dt);
    this.updateWeather(dt);
    this.updateSurvival(dt);
    this.updateRegeneration(dt);
    this.updateNotifications(dt);
    this.updateFarming(dt);
    this.updateResourceRespawn(dt);
    if (this.inCave) this.updateCaveResourceRespawn(dt);

    // Gathering cooldown
    if (this.gatherCooldown > 0) this.gatherCooldown -= dt;

    // Update resource shake timers
    for (const res of this.resources) {
      if (res.shakeTimer > 0) res.shakeTimer -= dt;
    }
    for (const res of this.caveResources) {
      if (res.shakeTimer > 0) res.shakeTimer -= dt;
    }

    // Auto-save
    this.autoSaveTimer += dt;
    if (this.autoSaveTimer >= this.autoSaveInterval) {
      this.autoSaveTimer = 0;
      this.performAutoSave();
    }

    this.onUpdate?.(this.state, this.ui);
  }

  private handleInput(): void {
    const { input, state } = this;

    // Number keys for hotbar
    for (let i = 0; i < 9; i++) {
      if (input.isKeyPressed((i + 1).toString())) {
        state.player.currentTool = i;
      }
    }

    // E: Interact (NPC, pickup items, eat/drink)
    if (input.isKeyPressed('e')) {
      this.tryInteract();
    }

    // Q / Space: keyboard attack
    if (input.isKeyPressed('q') || input.isKeyPressed(' ')) {
      this.tryAttack();
    }

    // Left Click: Primary action (gather resources, attack, shoot)
    if (input.isMouseClicked(0)) {
      this.tryPrimaryAction();
    }

    // I for inventory
    if (input.isKeyPressed('i') || input.isKeyPressed('tab')) {
      this.ui.activePanel = this.ui.activePanel === 'inventory' ? 'none' : 'inventory';
    }

    // C for crafting
    if (input.isKeyPressed('c')) {
      this.ui.activePanel = this.ui.activePanel === 'crafting' ? 'none' : 'crafting';
    }

    // K for skills
    if (input.isKeyPressed('k')) {
      this.ui.activePanel = this.ui.activePanel === 'skills' ? 'none' : 'skills';
    }

    // J for quests
    if (input.isKeyPressed('j')) {
      this.ui.activePanel = this.ui.activePanel === 'quests' ? 'none' : 'quests';
    }

    // M for map
    if (input.isKeyPressed('m')) {
      this.ui.showMap = !this.ui.showMap;
    }

    // H for save/load
    if (input.isKeyPressed('h')) {
      this.ui.activePanel = this.ui.activePanel === 'save' ? 'none' : 'save';
    }

    // P for farm actions (till/plant/harvest)
    if (input.isKeyPressed('p')) {
      this.tryFarmAction();
    }

    // Escape to close panels
    if (input.isKeyPressed('escape')) {
      this.ui.activePanel = 'none';
      this.ui.showMap = false;
    }

    // F removed — eating/drinking is now on E

    // G to drop item
    if (input.isKeyPressed('g')) {
      this.dropHotbarItem();
    }
  }

  private handleUIInput(): void {
    if (this.input.isKeyPressed('escape')) {
      this.ui.activePanel = 'none';
    }
  }

  private updatePlayer(dt: number): void {
    const { player } = this.state;
    const move = this.input.getMovementVector();

    // Apply speed modifiers
    let speed = player.stats.speed;
    if (player.stats.hunger <= 0) speed *= 0.6;

    // Equipment speed bonus
    Object.values(player.equipment).forEach(slot => {
      if (slot?.item?.bonuses?.speed) speed += slot.item.bonuses.speed;
    });

    // Skill speed bonus
    const marathonLevel = this.state.skills['marathon'] || 0;
    speed += marathonLevel * 5;

    const dx = move.x * speed * dt;
    const dy = move.y * speed * dt;

    if (dx !== 0 || dy !== 0) {
      const newX = player.x + dx;
      const newY = player.y + dy;

      // Check collision with world boundaries
      const worldW = this.inCave && this.caveData
        ? this.caveData.tileMap[0].length * TILE_SIZE
        : WORLD_WIDTH * TILE_SIZE;
      const worldH = this.inCave && this.caveData
        ? this.caveData.tileMap.length * TILE_SIZE
        : WORLD_HEIGHT * TILE_SIZE;

      // Check tile collision
      const tileX = Math.floor((newX + PLAYER_SIZE / 2) / TILE_SIZE);
      const tileY = Math.floor((newY + PLAYER_SIZE / 2) / TILE_SIZE);

      const worldTileW = this.inCave && this.caveData ? this.caveData.tileMap[0].length : WORLD_WIDTH;
      const worldTileH = this.inCave && this.caveData ? this.caveData.tileMap.length : WORLD_HEIGHT;
      const tileMap = this.inCave && this.caveData ? this.caveData.tileMap : this.tileMap;

      if (tileX >= 0 && tileX < worldTileW && tileY >= 0 && tileY < worldTileH) {
        const tile = tileMap[tileY]?.[tileX];
        const walkable = tile !== TileType.Water && tile !== TileType.DeepWater &&
          tile !== TileType.Wall && tile !== TileType.CaveWall && tile !== TileType.Lava;

        if (walkable) {
          // Check resource collision
          const checkResources = this.inCave ? this.caveResources : this.resources;
          let blocked = false;
          for (const res of checkResources) {
            const size = this.resourceSizes[res.type];
            if (!size) continue;
            if (newX + PLAYER_SIZE > res.x && newX < res.x + size.w &&
              newY + PLAYER_SIZE > res.y && newY < res.y + size.h) {
              blocked = true;
              break;
            }
          }

          if (!blocked) {
            player.x = clamp(newX, 0, worldW - PLAYER_SIZE);
            player.y = clamp(newY, 0, worldH - PLAYER_SIZE);
          }
        }
      }

      // Update facing direction
      if (move.x !== 0 || move.y !== 0) {
        player.facing = normalize({ x: move.x, y: move.y });
      }
    }

    // Update attack timer
    if (player.attackTimer > 0) {
      player.attackTimer -= dt;
      if (player.attackTimer <= 0) {
        player.isAttacking = false;
      }
    }

    // Update invincibility timer
    if (player.invincibleTimer > 0) {
      player.invincibleTimer -= dt;
    }

    // Stamina regen
    if (!player.isAttacking && player.stamina < player.maxStamina) {
      player.stamina = Math.min(player.maxStamina, player.stamina + 15 * dt);
    }

    // Discover biome (surface only)
    if (!this.inCave) {
      const tileX = Math.floor(player.x / TILE_SIZE);
      const tileY = Math.floor(player.y / TILE_SIZE);
      if (tileY >= 0 && tileY < this.biomeMap.length && tileX >= 0 && tileX < this.biomeMap[0].length) {
        const biome = this.biomeMap[tileY][tileX];
        const areaKey = `${biome}_${Math.floor(tileX / 16)}_${Math.floor(tileY / 16)}`;
        if (!this.state.discoveredAreas.includes(areaKey)) {
          this.state.discoveredAreas.push(areaKey);
          this.addNotification(`Área descoberta: ${biome.charAt(0).toUpperCase() + biome.slice(1)}`, 'info');
        }
      }
    }
  }

  private tryInteract(): void {
    const { player } = this.state;
    const px = player.x + PLAYER_SIZE / 2;
    const py = player.y + PLAYER_SIZE / 2;

    // ── Cave: check for exit (near cave entrance tile) ──
    if (this.inCave && this.caveData) {
      const ex = this.caveData.entranceX;
      const ey = this.caveData.entranceY;
      const dist = distance({ x: px, y: py }, { x: ex + 16, y: ey + 16 });
      if (dist < INTERACT_RANGE) {
        this.exitCave();
        return;
      }
    }

    // ── Surface: check for cave entrance resource ──
    if (!this.inCave) {
      for (const res of this.resources) {
        if (res.type === 'cave_entrance') {
          const size = this.resourceSizes[res.type];
          if (!size) continue;
          const dist = distance({ x: px, y: py }, { x: res.x + size.w / 2, y: res.y + size.h / 2 });
          if (dist < INTERACT_RANGE) {
            if (this.state.player.stats.level < 6) {
              this.addNotification('Precisa de nível 6 para entrar na caverna!', 'warning');
              return;
            }
            this.enterCave(res.x, res.y);
            return;
          }
        }
      }
    }

    // 1. Check NPCs (surface only)
    if (!this.inCave) {
      for (const npc of this.npcs) {
        const dist = distance({ x: px, y: py }, { x: npc.x + 12, y: npc.y + 12 });
        if (dist < INTERACT_RANGE) {
          this.ui.activeDialogueNpc = npc;
          this.ui.activePanel = 'dialogue';
          return;
        }
      }
    }

    // 2. Pick up dropped items
    for (let i = this.droppedItems.length - 1; i >= 0; i--) {
      const di = this.droppedItems[i];
      const dist = distance({ x: px, y: py }, { x: di.x, y: di.y });
      if (dist < INTERACT_RANGE) {
        if (this.addToInventory(di.itemId, di.count)) {
          this.droppedItems.splice(i, 1);
          this.addNotification(`+${di.count} ${getItem(di.itemId)?.name || di.itemId}`, 'item');
        }
        return;
      }
    }

    // 3. Eat/drink current hotbar item
    this.useHotbarItem();
  }

  // ══ Cave Entry / Exit ═══════════════════════════════════════
  private enterCave(entranceX: number, entranceY: number): void {
    if (!this.caveData) return;

    // Save surface position
    this.surfacePosition = { x: this.state.player.x, y: this.state.player.y };

    // Swap surface data out, cave data in
    // Move player to cave entrance
    const cd = this.caveData;
    this.state.player.x = cd.entranceX + TILE_SIZE / 2;
    this.state.player.y = cd.entranceY + TILE_SIZE / 2 + TILE_SIZE;

    // Initialize cave enemies from cave data
    this.caveEnemies = cd.enemies.map(e => {
      const def = ENEMIES[e.type];
      return {
        id: generateId(), type: e.type,
        x: e.x, y: e.y,
        width: def.size, height: def.size,
        definition: def,
        hp: def.hp, maxHp: def.hp,
        state: 'idle' as const,
        direction: { x: 0, y: 0 },
        targetId: null,
        attackCooldown: 0,
        patrolTimer: 0,
        patrolDirection: { x: Math.random() - 0.5, y: Math.random() - 0.5 },
        knockback: { x: 0, y: 0 },
        deathTimer: 0,
      };
    });

    // Initialize cave resources from cave data
    this.caveResources = cd.resources.map(r => ({
      ...r,
      hp: this.resourceSizes[r.type]?.hp ?? 10,
      maxHp: this.resourceSizes[r.type]?.hp ?? 10,
      id: generateId(),
      shakeTimer: 0,
    }));

    this.inCave = true;
    this.addNotification('Você entrou na caverna...', 'info');
    this.addNotification('Pressione [E] perto da entrada para sair.', 'info');
  }

  private exitCave(): void {
    if (!this.inCave) return;

    // Restore surface position
    this.state.player.x = this.surfacePosition.x;
    this.state.player.y = this.surfacePosition.y;

    // Clear cave runtime data
    this.caveEnemies = [];
    this.caveResources = [];
    this.caveResourceRespawnQueue = [];

    this.inCave = false;
    this.addNotification('Você saiu da caverna.', 'info');
  }

  private gatherResource(res: { x: number; y: number; type: string; itemId: string; hp: number; id: string; maxHp: number; shakeTimer: number }, index: number): void {
    const { player } = this.state;
    const tool = this.getCurrentItem();

    // Gathering cooldown
    if (this.gatherCooldown > 0) return;
    this.gatherCooldown = 0.25; // 4 hits per second max

    // Tool requirements
    const isVegetation = res.type === 'tree' || res.type === 'bush';
    const isOre = res.type.includes('rock') || res.type.includes('crystal');

    if (isVegetation && tool?.toolType !== 'axe' && tool?.toolType !== 'sword' && tool?.toolType !== 'scythe') {
      this.addNotification('Use um machado para cortar!', 'warning');
      return;
    }
    if (isOre && tool?.toolType !== 'pickaxe' && tool?.toolType !== 'hammer') {
      this.addNotification('Use uma picareta para minerar!', 'warning');
      return;
    }

    // Stamina cost for gathering
    if (this.state.player.stamina < 5) {
      this.addNotification('Stamina insuficiente para coletar!', 'warning');
      return;
    }
    this.state.player.stamina -= 5;
    // Additional hunger from gathering
    this.state.player.stats.hunger = Math.max(0, this.state.player.stats.hunger - 0.012);

    // Calculate power
    let power = 1;
    if (tool?.toolType === 'axe' || tool?.toolType === 'sword') power = tool.choppingPower ?? 3;
    if (tool?.toolType === 'pickaxe') power = tool.miningPower ?? 3;
    if (tool?.toolType === 'hammer') power = (tool.miningPower ?? 3) + 1;
    if (tool?.toolType === 'scythe') power = tool.choppingPower ?? 2;

    // Skill bonus
    if (isOre) {
      power += this.state.skills['miner'] || 0;
    }
    if (isVegetation) {
      power += this.state.skills['lumberjack'] || 0;
    }

    // Trigger swing animation
    player.isAttacking = true;
    player.attackTimer = 0.3;

    // Apply damage with shake
    res.hp -= power;
    res.shakeTimer = 0.15;

    // Particles based on resource type
    const particleColor = this.resourceColors[res.type] || '#8B4513';
    this.spawnParticles(res.x + 10, res.y + 10, particleColor, 4);

    // Camera micro-shake
    this.camera.shake(1.5, 0.05);

    // Reduce tool durability
    if (tool && tool.durability !== undefined && tool.maxDurability !== undefined) {
      const hotbar = this.state.player.hotbar;
      const slot = hotbar[this.state.player.currentTool];
      if (slot) {
        slot.durability = (slot.durability ?? tool.maxDurability) - 1;
        if (slot.durability! <= 0) {
          hotbar[this.state.player.currentTool] = { item: null, count: 0 };
          this.addNotification(`${tool.name} quebrou!`, 'warning');
        }
      }
    }

    // Gain XP and skill XP
    this.gainXp(2);
    if (isVegetation) {
      player.stats.woodcutting = Math.min(99, player.stats.woodcutting + 0.05);
    }
    if (isOre) {
      player.stats.mining = Math.min(99, player.stats.mining + 0.08);
    }

    // Damage number feedback
    const hitX = res.x + 12;
    const hitY = res.y;
    this.damageNumbers.push({
      x: hitX, y: hitY,
      value: power,
      isCrit: false, isHeal: false,
      timer: 0.6,
      velocity: { x: (Math.random() - 0.5) * 20, y: -40 },
    });

    // Double yield chance from skill
    let count = 1;
    if (this.state.skills['double_yield'] && Math.random() < 0.2) count = 2;

    if (res.hp <= 0) {
      const gathered = this.addToInventory(res.itemId, count);
      if (!gathered) {
        this.addNotification('Inventário cheio!', 'warning');
        res.hp = 1; // Reset so they can try later
        return;
      }

      const itemName = getItem(res.itemId)?.name || res.itemId;
      this.addNotification(`+${count} ${itemName}`, 'item');
      this.spawnParticles(res.x + 10, res.y + 10, particleColor, 12);

      // Schedule respawn
      const respawnDelay = isVegetation ? 30 : 120; // trees: 30s, ores: 120s
      if (this.inCave) {
        this.caveResourceRespawnQueue.push({
          type: res.type,
          x: res.x,
          y: res.y,
          itemId: res.itemId,
          respawnTime: respawnDelay,
        });
        this.caveResources.splice(index, 1);
      } else {
        this.resourceRespawnQueue.push({
          type: res.type,
          x: res.x,
          y: res.y,
          itemId: res.itemId,
          respawnTime: respawnDelay,
        });
        this.resources.splice(index, 1);
      }

      // Drop extra loot
      if (res.type === 'tree' && Math.random() < 0.2) {
        this.addToInventory('fiber', 1);
      }
      if (res.type === 'bush' && Math.random() < 0.3) {
        this.addToInventory('fiber', 1);
      }
      if ((res.type === 'iron_rock' || res.type === 'gold_rock') && Math.random() < 0.15) {
        this.addToInventory('coal', 1);
      }
      if (res.type === 'coal_rock' && Math.random() < 0.2) {
        this.addToInventory('coal', 2);
      }
      if (res.type === 'crystal_node' && Math.random() < 0.1) {
        this.addToInventory('magic_dust', 1);
      }
      if (res.type === 'rock' && Math.random() < 0.1) {
        this.addToInventory('clay', 1);
      }

      // Quest progress
      this.updateQuestProgress('gather', res.itemId);
    }
  }

  private tryAttack(): void {
    const { player } = this.state;
    const hungerState = this.getHungerState(player.stats.hunger, player.stats.maxHunger);
    const stamMult = this.getStaminaCostMult();
    const attackCost = Math.floor(8 * stamMult);
    if (player.attackTimer > 0 || player.stamina < attackCost) return;

    const tool = this.getCurrentItem();
    const damage = Math.floor((tool?.damage ?? 3) * hungerState.damageMult) + player.stats.strength;
    const range = tool?.range ?? ATTACK_RANGE;
    const speed = (tool?.speed ?? 1) * hungerState.attackSpeedMult;

    player.isAttacking = true;
    player.attackTimer = 0.4 / speed;
    player.stamina -= attackCost;

    const px = player.x + PLAYER_SIZE / 2;
    const py = player.y + PLAYER_SIZE / 2;

    // ── Bow / Ranged Attack ──
    if (tool?.toolType === 'bow') {
      // Check ammo (arrows) in inventory or hotbar
      const arrowCount = this.countInInventory('arrows');
      if (arrowCount <= 0) {
        this.addNotification('Sem flechas!', 'warning');
        player.isAttacking = false;
        player.attackTimer = 0;
        player.stamina += 10; // Refund stamina
        return;
      }
      this.removeFromInventory('arrows', 1);

      const projectileSpeed = 300;
      const projDx = player.facing.x * projectileSpeed;
      const projDy = player.facing.y * projectileSpeed;

      this.projectiles.push({
        x: px + player.facing.x * 16,
        y: py + player.facing.y * 16,
        vx: projDx,
        vy: projDy,
        damage: damage,
        lifetime: 1.5,
        speed: projectileSpeed,
      });

      this.spawnParticles(px + player.facing.x * 20, py + player.facing.y * 20, '#8B4513', 2);
      return;
    }

    // ── Melee Attack ──
    const attackX = px + player.facing.x * range;
    const attackY = py + player.facing.y * range;

    // Weapon trail particles
    const trailColor = tool?.toolType === 'sword' ? '#ddd' : '#888';
    this.spawnParticles(attackX, attackY, trailColor, 3);

    const attackEnemies = this.inCave ? this.caveEnemies : this.enemies;
    for (const enemy of attackEnemies) {
      if (enemy.state === 'dead') continue;
      const dist = distance({ x: attackX, y: attackY }, { x: enemy.x + enemy.width / 2, y: enemy.y + enemy.height / 2 });
      if (dist < range + enemy.width / 2) {
        // Critical hit chance
        let crit = false;
        const critLevel = this.state.skills['critical_hit'] || 0;
        if (Math.random() < 0.1 + critLevel * 0.05) crit = true;

        let finalDamage = damage;
        if (crit) finalDamage = Math.floor(damage * 2);

        // Berserker bonus
        const berserkerLevel = this.state.skills['berserker'] || 0;
        if (berserkerLevel > 0 && player.stats.hp < player.stats.maxHp * 0.3) {
          finalDamage = Math.floor(finalDamage * (1 + berserkerLevel * 0.15));
        }

        const mitigated = Math.max(1, finalDamage - enemy.definition.defense);
        enemy.hp -= mitigated;
        enemy.state = 'hurt';
        enemy.knockback = scaleVec(player.facing, 100);

        // Hit particles per weapon type
        const hitColor = tool?.toolType === 'sword' ? '#fff' : '#ff8844';
        this.spawnParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, hitColor, 6);

        this.damageNumbers.push({
          x: enemy.x + enemy.width / 2,
          y: enemy.y - 10,
          value: mitigated,
          isCrit: crit,
          isHeal: false,
          timer: 1,
          velocity: { x: (Math.random() - 0.5) * 30, y: -60 },
        });

        this.camera.shake(crit ? 6 : 3, 0.1);

        if (enemy.hp <= 0) {
          this.killEnemy(enemy);
        }
      }
    }
  }

  // ══ Left Click Primary Action ═════════════════════════════════
  private tryPrimaryAction(): void {
    const { player } = this.state;
    const px = player.x + PLAYER_SIZE / 2;
    const py = player.y + PLAYER_SIZE / 2;

    // 1. Check resources in range → gather (cut/mineral/forage)
    const resources = this.inCave ? this.caveResources : this.resources;
    for (let i = resources.length - 1; i >= 0; i--) {
      const res = resources[i];
      const size = this.resourceSizes[res.type];
      if (!size) continue;
      const dist = distance({ x: px, y: py }, { x: res.x + size.w / 2, y: res.y + size.h / 2 });
      if (dist < INTERACT_RANGE) {
        this.gatherResource(res, i);
        return;
      }
    }

    // 2. Bow → shoot arrow
    const tool = this.getCurrentItem();
    if (tool?.toolType === 'bow') {
      this.tryAttack();
      return;
    }

    // 3. Default → melee attack
    this.tryAttack();
  }

  private killEnemy(enemy: EnemyEntity): void {
    enemy.state = 'dead';
    enemy.deathTimer = 0.5;

    // XP reward
    this.gainXp(enemy.definition.xpReward);

    // Drop loot
    const luckBonus = this.state.skills['treasure_hunter'] || 0;
    for (const loot of enemy.definition.loot) {
      const chance = loot.chance + (luckBonus * 0.02);
      if (Math.random() < chance) {
        const count = Math.floor(Math.random() * (loot.maxCount - loot.minCount + 1)) + loot.minCount;
        this.spawnDroppedItem(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, loot.itemId, count);
      }
    }

    // Update quests
    this.updateQuestProgress('kill', enemy.definition.type);

    // Gold drop
    const gold = Math.floor(Math.random() * enemy.definition.xpReward / 5) + 1;
    this.state.player.stats.gold += gold;
    this.addNotification(`+${gold} 🪙`, 'item');
  }

  private useHotbarItem(): void {
    const slot = this.state.player.hotbar[this.state.player.currentTool];
    if (!slot?.item) return;

    const item = slot.item;
    if (item.effects) {
      for (const effect of item.effects) {
        switch (effect.type) {
          case 'heal':
            this.state.player.stats.hp = Math.min(
              this.state.player.stats.maxHp,
              this.state.player.stats.hp + effect.value
            );
            break;
          case 'hunger':
            this.state.player.stats.hunger = Math.min(
              this.state.player.stats.maxHunger,
              this.state.player.stats.hunger + effect.value
            );
            break;
          case 'energy':
            this.state.player.stamina = Math.min(
              this.state.player.maxStamina,
              this.state.player.stamina + effect.value
            );
            break;
          case 'xp':
            this.gainXp(effect.value);
            break;
        }
      }

      // Consume item
      slot.count--;
      if (slot.count <= 0) {
        this.state.player.hotbar[this.state.player.currentTool] = { item: null, count: 0 };
      }
      this.addNotification(`Usou ${item.name}`, 'item');
    }
  }

  private dropHotbarItem(): void {
    const slot = this.state.player.hotbar[this.state.player.currentTool];
    if (!slot?.item) return;

    this.spawnDroppedItem(
      this.state.player.x + PLAYER_SIZE / 2,
      this.state.player.y + PLAYER_SIZE / 2,
      slot.item.id,
      1
    );

    slot.count--;
    if (slot.count <= 0) {
      this.state.player.hotbar[this.state.player.currentTool] = { item: null, count: 0 };
    }
  }

  private getCurrentItem(): ItemDefinition | null {
    return this.state.player.hotbar[this.state.player.currentTool]?.item ?? null;
  }

  // ── Enemy AI ────────────────────────────────────────────────────
  private updateCaveResourceRespawn(dt: number): void {
    for (let i = this.caveResourceRespawnQueue.length - 1; i >= 0; i--) {
      const entry = this.caveResourceRespawnQueue[i];
      entry.respawnTime -= dt;
      if (entry.respawnTime <= 0) {
        const size = this.resourceSizes[entry.type];
        this.caveResources.push({
          x: entry.x, y: entry.y,
          type: entry.type, itemId: entry.itemId,
          hp: size?.hp ?? 10,
          maxHp: size?.hp ?? 10,
          id: generateId(),
          shakeTimer: 0,
        });
        this.caveResourceRespawnQueue.splice(i, 1);
      }
    }
  }

  private updateEnemies(dt: number): void {
    const playerPos = {
      x: this.state.player.x + PLAYER_SIZE / 2,
      y: this.state.player.y + PLAYER_SIZE / 2,
    };

    const enemies = this.inCave ? this.caveEnemies : this.enemies;
    const tileMap = this.inCave && this.caveData ? this.caveData.tileMap : this.tileMap;
    const worldTileW = this.inCave && this.caveData ? this.caveData.tileMap[0].length : WORLD_WIDTH;
    const worldTileH = this.inCave && this.caveData ? this.caveData.tileMap.length : WORLD_HEIGHT;

    for (const enemy of enemies) {
      if (enemy.state === 'dead') {
        enemy.deathTimer -= dt;
        continue;
      }

      const ex = enemy.x + enemy.width / 2;
      const ey = enemy.y + enemy.height / 2;
      const distToPlayer = distance({ x: ex, y: ey }, playerPos);

      // Apply knockback
      if (enemy.knockback.x !== 0 || enemy.knockback.y !== 0) {
        enemy.x += enemy.knockback.x * dt;
        enemy.y += enemy.knockback.y * dt;
        enemy.knockback.x *= 0.9;
        enemy.knockback.y *= 0.9;
        if (Math.abs(enemy.knockback.x) < 1) enemy.knockback.x = 0;
        if (Math.abs(enemy.knockback.y) < 1) enemy.knockback.y = 0;
      }

      // Reset hurt state
      if (enemy.state === 'hurt') {
        enemy.attackCooldown -= dt;
        if (enemy.attackCooldown <= 0) {
          enemy.state = 'idle';
        }
        continue;
      }

      // AI behavior
      if (distToPlayer < enemy.definition.aggroRange) {
        enemy.state = 'chase';
        enemy.targetId = 'player';

        // Move toward player
        const dir = normalize(sub(playerPos, { x: ex, y: ey }));
        const speed = enemy.definition.speed;

        const newX = enemy.x + dir.x * speed * dt;
        const newY = enemy.y + dir.y * speed * dt;

        // Simple tile collision check
        const tileX = Math.floor((newX + enemy.width / 2) / TILE_SIZE);
        const tileY = Math.floor((newY + enemy.height / 2) / TILE_SIZE);
        if (tileX >= 0 && tileX < worldTileW && tileY >= 0 && tileY < worldTileH) {
          const tile = tileMap[tileY][tileX];
          if (tile !== TileType.Water && tile !== TileType.DeepWater && tile !== TileType.Wall && tile !== TileType.CaveWall && tile !== TileType.Lava) {
            enemy.x = newX;
            enemy.y = newY;
          }
        }

        enemy.direction = dir;

        // Attack player
        if (distToPlayer < enemy.definition.attackRange) {
          enemy.attackCooldown -= dt;
          if (enemy.attackCooldown <= 0) {
            this.enemyAttackPlayer(enemy);
            enemy.attackCooldown = enemy.definition.attackSpeed / 1000;
          }
        }
      } else {
        // Patrol
        enemy.state = 'patrol';
        enemy.targetId = null;
        enemy.patrolTimer -= dt;

        if (enemy.patrolTimer <= 0) {
          enemy.patrolDirection = { x: Math.random() - 0.5, y: Math.random() - 0.5 };
          enemy.patrolTimer = 2 + Math.random() * 3;
        }

        const px = enemy.x + enemy.patrolDirection.x * enemy.definition.speed * 0.3 * dt;
        const py = enemy.y + enemy.patrolDirection.y * enemy.definition.speed * 0.3 * dt;
        const tX = Math.floor((px + enemy.width / 2) / TILE_SIZE);
        const tY = Math.floor((py + enemy.height / 2) / TILE_SIZE);

        if (tX >= 0 && tX < worldTileW && tY >= 0 && tY < worldTileH) {
          const tile = tileMap[tY][tX];
          if (tile !== TileType.Water && tile !== TileType.DeepWater && tile !== TileType.Wall && tile !== TileType.CaveWall && tile !== TileType.Lava) {
            enemy.x = px;
            enemy.y = py;
          }
        }
      }
    }

    // Remove fully dead enemies
    if (this.inCave) {
      this.caveEnemies = this.caveEnemies.filter(e => !(e.state === 'dead' && e.deathTimer <= 0));
    } else {
      this.enemies = this.enemies.filter(e => !(e.state === 'dead' && e.deathTimer <= 0));
    }
  }

  private enemyAttackPlayer(enemy: EnemyEntity): void {
    const { player } = this.state;
    if (player.invincibleTimer > 0) return;

    const damage = Math.max(1, enemy.definition.damage - player.stats.defense);
    player.stats.hp -= damage;
    player.invincibleTimer = 0.5;

    this.damageNumbers.push({
      x: player.x + PLAYER_SIZE / 2,
      y: player.y - 10,
      value: damage,
      isCrit: false,
      isHeal: false,
      timer: 1,
      velocity: { x: (Math.random() - 0.5) * 30, y: -60 },
    });

    this.camera.shake(4, 0.15);
    this.spawnParticles(player.x + PLAYER_SIZE / 2, player.y + PLAYER_SIZE / 2, '#ff0000', 4);

    if (player.stats.hp <= 0) {
      this.playerDeath();
    }
  }

  private playerDeath(): void {
    this.state.player.stats.hp = this.state.player.stats.maxHp;
    this.state.player.stats.hunger = this.state.player.stats.maxHunger;
    this.state.player.stats.gold = Math.floor(this.state.player.stats.gold * 0.8);
    this.state.player.invincibleTimer = 2;

    // If in cave, exit first
    if (this.inCave) {
      this.exitCave();
    }

    // Respawn at village center
    const cx = (WORLD_WIDTH * TILE_SIZE) / 2;
    const cy = (WORLD_HEIGHT * TILE_SIZE) / 2;
    this.state.player.x = cx;
    this.state.player.y = cy;

    this.addNotification('Você morreu! Perdeu 20% do ouro.', 'error');
  }

  // ── Survival & Time ─────────────────────────────────────────────

  /** Hunger states with their effects */
  private getHungerState(hunger: number, maxHunger: number): {
    name: string; emoji: string;
    staminaRegenMult: number;
    speedMult: number;
    damageMult: number;
    attackSpeedMult: number;
    canRun: boolean;
  } {
    const pct = hunger / maxHunger;
    if (pct > 0.8) {
      return { name: 'Saciado', emoji: '😀', staminaRegenMult: 1.05, speedMult: 1, damageMult: 1, attackSpeedMult: 1, canRun: true };
    } else if (pct > 0.6) {
      return { name: 'Normal', emoji: '🙂', staminaRegenMult: 1, speedMult: 1, damageMult: 1, attackSpeedMult: 1, canRun: true };
    } else if (pct > 0.4) {
      return { name: 'Leve Fome', emoji: '😐', staminaRegenMult: 0.9, speedMult: 1, damageMult: 1, attackSpeedMult: 1, canRun: true };
    } else if (pct > 0.2) {
      return { name: 'Com Fome', emoji: '😟', staminaRegenMult: 0.65, speedMult: 0.9, damageMult: 1, attackSpeedMult: 0.9, canRun: true };
    } else if (pct > 0.1) {
      return { name: 'Exausto', emoji: '😫', staminaRegenMult: 0.4, speedMult: 0.85, damageMult: 0.9, attackSpeedMult: 0.8, canRun: true };
    } else {
      return { name: 'Faminto', emoji: '☠️', staminaRegenMult: 0, speedMult: 0.7, damageMult: 0.7, attackSpeedMult: 0.6, canRun: false };
    }
  }

  /** Get equipment stamina cost multiplier */
  private getStaminaCostMult(): number {
    let mult = 1;
    const { equipment } = this.state.player;
    // Heavy armor increases stamina cost
    if (equipment.chest?.item?.id === 'iron_chest') mult += 0.15;
    if (equipment.helmet?.item?.id === 'iron_helmet') mult += 0.1;
    // Light boots reduce running cost (handled in movement)
    if (equipment.boots?.item?.id === 'leather_boots') mult -= 0.05;
    // Constitution skill reduces consumption
    const constitutionLevel = this.state.skills['constitution'] || 0;
    mult -= constitutionLevel * 0.02;
    // Athletics reduces movement costs
    return Math.max(0.5, mult);
  }

  /** Get hunger consumption multiplier based on skills and weather */
  private getHungerRateMult(): number {
    let mult = 1;
    const survivalLevel = this.state.skills['survival'] || 0;
    mult -= survivalLevel * 0.03;
    // Weather effects
    if (this.state.gameTime.weather === 'snow' || this.state.gameTime.weather === 'fog') {
      mult *= 1.3; // Cold increases hunger
    }
    if (this.state.gameTime.weather === 'heavyRain') {
      mult *= 1.15;
    }
    return Math.max(0.3, mult);
  }

  private updateSurvival(dt: number): void {
    const { stats, hotbar } = this.state.player;

    // Base hunger consumption: 0.015 per second
    const hungerMult = this.getHungerRateMult();
    const baseDrain = 0.015 * hungerMult * dt;

    // Additional hunger from movement
    const move = this.input.getMovementVector();
    const isMoving = move.x !== 0 || move.y !== 0;
    const isRunning = isMoving && (this.input.isKeyDown('shift') || this.input.isKeyDown('control'));

    let actionDrain = 0;
    if (isRunning) actionDrain += 0.020 * dt;
    else if (isMoving) actionDrain += 0.004 * dt;

    // Near enemies or attacking adds drain
    if (this.state.player.isAttacking) actionDrain += 0.010 * dt;

    stats.hunger = Math.max(0, stats.hunger - baseDrain - actionDrain);

    // At 0% hunger: lose 1 HP every 4 seconds (no rapid death)
    if (stats.hunger <= 0) {
      stats.hunger = 0;
      stats.hp -= 0.25 * dt; // 1 HP per 4 seconds
      if (stats.hp <= 0) this.playerDeath();
    }
  }

  private updateRegeneration(dt: number): void {
    const { stats, stamina, maxStamina } = this.state.player;
    const quickHealLevel = this.state.skills['quick_heal'] || 0;

    // HP regen only when well-fed AND rested
    const hungerPct = stats.hunger / stats.maxHunger;
    const staminaPct = stamina / maxStamina;
    if (hungerPct > 0.8 && staminaPct > 0.7) {
      const regenRate = 1 + quickHealLevel * 0.5;
      stats.hp = Math.min(stats.maxHp, stats.hp + regenRate * dt);
    }

    // Stamina regen: 12/s when standing still or walking (not attacking)
    // Modified by hunger state
    const { isAttacking } = this.state.player;
    if (!isAttacking && !this.state.player.isExhausted) {
      const hungerState = this.getHungerState(stats.hunger, stats.maxHunger);
      const move = this.input.getMovementVector();
      const isMoving = move.x !== 0 || move.y !== 0;
      const isRunning = isMoving && (this.input.isKeyDown('shift') || this.input.isKeyDown('control'));

      // Full regen only when standing still or walking
      if (!isRunning) {
        const baseRegen = 12;
        const vigorLevel = this.state.skills['vigor'] || 0;
        const vigorBonus = 1 + vigorLevel * 0.03;
        this.state.player.stamina = Math.min(
          maxStamina,
          stamina + baseRegen * hungerState.staminaRegenMult * vigorBonus * dt
        );
      }
    }
  }

  private updateTime(dt: number): void {
    const gt = this.state.gameTime;
    gt.totalTicks++;
    gt.dayTicks++;

    // Update hour/minute
    const progress = gt.dayTicks / gt.dayLength;
    gt.hour = progress * 24;
    gt.minute = (gt.hour % 1) * 60;
    gt.isNight = gt.hour < 6 || gt.hour > 20;

    // New day
    if (gt.dayTicks >= gt.dayLength) {
      gt.dayTicks = 0;
      gt.day++;
      gt.season = getSeasonForDay(gt.day);

      // Reset daily quests
      this.state.quests = this.state.quests.filter(q => {
        if (q.definition.type === 'daily' && q.status === 'completed') return false;
        return true;
      });

      this.addNotification(`Dia ${gt.day} - ${gt.season.charAt(0).toUpperCase() + gt.season.slice(1)}`, 'info');
    }
  }

  private updateWeather(dt: number): void {
    const gt = this.state.gameTime;
    gt.weatherTimer -= dt;

    if (gt.weatherTimer <= 0) {
      const rng = new SeededRandom(Date.now());
      const weathers: Weather[] = [Weather.Clear, Weather.Clear, Weather.Clear, Weather.Rain, Weather.Fog];
      if (gt.season === Season.Winter) weathers.push(Weather.Snow);
      if (gt.season === Season.Autumn) weathers.push(Weather.Rain, Weather.HeavyRain);

      gt.weather = rng.pick(weathers);
      gt.weatherTimer = 300 + rng.range(0, 600);
    }
  }

  private updateCamera(dt: number): void {
    this.camera.follow({ x: this.state.player.x, y: this.state.player.y });
    this.camera.update(dt);
    // Cave has a smaller world (80x80 tiles)
    if (this.inCave && this.caveData) {
      const caveW = this.caveData.tileMap[0].length * TILE_SIZE;
      const caveH = this.caveData.tileMap.length * TILE_SIZE;
      this.camera.clampToWorld(caveW, caveH);
    } else {
      this.camera.clampToWorld(WORLD_WIDTH * TILE_SIZE, WORLD_HEIGHT * TILE_SIZE);
    }
  }

  private updateDroppedItems(dt: number): void {
    for (const di of this.droppedItems) {
      di.lifetime -= dt;
      di.x += di.velocity.x * dt;
      di.y += di.velocity.y * dt;
      di.velocity.x *= 0.95;
      di.velocity.y *= 0.95;
    }
    this.droppedItems = this.droppedItems.filter(d => d.lifetime > 0);
  }

  private updateParticles(dt: number): void {
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      p.vy += 100 * dt;
    }
    this.particles = this.particles.filter(p => p.life > 0);
  }

  private updateDamageNumbers(dt: number): void {
    for (const dn of this.damageNumbers) {
      dn.x += dn.velocity.x * dt;
      dn.y += dn.velocity.y * dt;
      dn.timer -= dt;
      dn.velocity.y += 20 * dt;
    }
    this.damageNumbers = this.damageNumbers.filter(dn => dn.timer > 0);
  }

  private updateProjectiles(dt: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.lifetime -= dt;

      // Check enemy collision
      const projectileEnemies = this.inCave ? this.caveEnemies : this.enemies;
      const worldW = this.inCave && this.caveData ? this.caveData.tileMap[0].length * TILE_SIZE : WORLD_WIDTH * TILE_SIZE;
      const worldH = this.inCave && this.caveData ? this.caveData.tileMap.length * TILE_SIZE : WORLD_HEIGHT * TILE_SIZE;
      let hit = false;
      for (const enemy of projectileEnemies) {
        if (enemy.state === 'dead') continue;
        const dist = distance(
          { x: p.x, y: p.y },
          { x: enemy.x + enemy.width / 2, y: enemy.y + enemy.height / 2 }
        );
        if (dist < enemy.width / 2 + 6) {
          // Apply damage
          let finalDamage = p.damage;
          const mitigated = Math.max(1, finalDamage - enemy.definition.defense);
          enemy.hp -= mitigated;
          enemy.state = 'hurt';
          const knockDir = normalize({ x: p.vx, y: p.vy });
          enemy.knockback = scaleVec(knockDir, 60);

          this.damageNumbers.push({
            x: enemy.x + enemy.width / 2,
            y: enemy.y - 10,
            value: mitigated,
            isCrit: false,
            isHeal: false,
            timer: 1,
            velocity: { x: (Math.random() - 0.5) * 30, y: -60 },
          });

          this.spawnParticles(p.x, p.y, '#8B4513', 4);
          this.camera.shake(2, 0.08);

          if (enemy.hp <= 0) {
            this.killEnemy(enemy);
          }

          hit = true;
          break;
        }
      }

      // Remove if hit, expired, or out of bounds
      if (hit || p.lifetime <= 0 || p.x < 0 || p.x > worldW || p.y < 0 || p.y > worldH) {
        this.projectiles.splice(i, 1);
      }
    }
  }

  private updateNotifications(dt: number): void {
    this.state.notifications = this.state.notifications.filter(
      n => Date.now() - n.timestamp < n.duration
    );
  }

  // ── Inventory & Crafting ────────────────────────────────────────
  addToInventory(itemId: string, count: number): boolean {
    const item = getItem(itemId);
    if (!item) return false;

    // Try stacking first
    for (const slot of this.state.player.inventory) {
      if (slot.item?.id === itemId && slot.count < item.stackSize) {
        const canAdd = Math.min(count, item.stackSize - slot.count);
        slot.count += canAdd;
        count -= canAdd;
        if (count <= 0) return true;
      }
    }

    // Try hotbar
    for (const slot of this.state.player.hotbar) {
      if (slot.item?.id === itemId && slot.count < item.stackSize) {
        const canAdd = Math.min(count, item.stackSize - slot.count);
        slot.count += canAdd;
        count -= canAdd;
        if (count <= 0) return true;
      }
    }

    // Find empty slot
    for (const slot of this.state.player.inventory) {
      if (!slot.item) {
        slot.item = item;
        slot.count = Math.min(count, item.stackSize);
        slot.durability = item.maxDurability;
        count -= slot.count;
        if (count <= 0) return true;
      }
    }

    for (const slot of this.state.player.hotbar) {
      if (!slot.item) {
        slot.item = item;
        slot.count = Math.min(count, item.stackSize);
        slot.durability = item.maxDurability;
        count -= slot.count;
        if (count <= 0) return true;
      }
    }

    return count <= 0;
  }

  removeFromInventory(itemId: string, count: number): boolean {
    let remaining = count;

    for (const slot of [...this.state.player.inventory, ...this.state.player.hotbar]) {
      if (slot.item?.id === itemId && slot.count > 0) {
        const remove = Math.min(remaining, slot.count);
        slot.count -= remove;
        remaining -= remove;
        if (slot.count <= 0) {
          slot.item = null;
          slot.durability = undefined;
        }
        if (remaining <= 0) return true;
      }
    }

    return remaining <= 0;
  }

  countInInventory(itemId: string): number {
    let total = 0;
    for (const slot of [...this.state.player.inventory, ...this.state.player.hotbar]) {
      if (slot.item?.id === itemId) total += slot.count;
    }
    return total;
  }

  craftRecipe(recipeId: string): boolean {
    const recipe = RECIPES.find(r => r.id === recipeId);
    if (!recipe) return false;

    // Check level
    if (this.state.player.stats.level < recipe.requiredLevel) return false;

    // Check ingredients
    for (const ing of recipe.ingredients) {
      if (this.countInInventory(ing.itemId) < ing.count) return false;
    }

    // Check for required station
    if (recipe.station) {
      // Check if station is nearby (within 3 tiles)
      // For now, simplified: just require the item in inventory
    }

    // Remove ingredients
    for (const ing of recipe.ingredients) {
      this.removeFromInventory(ing.itemId, ing.count);
    }

    // Add result
    this.addToInventory(recipe.result, recipe.resultCount);

    // XP for crafting
    this.gainXp(5 + recipe.requiredLevel * 2);

    this.addNotification(`Craftou ${recipe.name}!`, 'success');
    this.updateQuestProgress('craft', recipe.result);

    return true;
  }

  // ── Shop ────────────────────────────────────────────────────────
  buyItem(itemId: string): boolean {
    const item = getItem(itemId);
    if (!item) return false;

    const price = Math.floor(item.value * 1.5);
    if (this.state.player.stats.gold < price) {
      this.addNotification('Ouro insuficiente!', 'warning');
      return false;
    }

    if (this.addToInventory(itemId, 1)) {
      this.state.player.stats.gold -= price;
      this.addNotification(`Comprou ${item.name} por ${price} 🪙`, 'item');
      return true;
    }

    return false;
  }

  sellItem(itemId: string): boolean {
    const item = getItem(itemId);
    if (!item) return false;

    const price = Math.floor(item.value * 0.5);
    if (this.removeFromInventory(itemId, 1)) {
      this.state.player.stats.gold += price;
      this.addNotification(`Vendeu ${item.name} por ${price} 🪙`, 'item');
      return true;
    }

    return false;
  }

  // ── Forge (Upgrade System) ────────────────────────────────────────
  /** Open the forge/upgrade panel (only for blacksmith NPC) */
  openForge(): void {
    this.ui.activePanel = 'forge';
  }

  /** Check if an item can be upgraded (has damage/defense, is not at max level) */
  canUpgrade(slot: InventorySlot): boolean {
    if (!slot.item) return false;
    const upgLevel = slot.upgradeLevel ?? 0;
    if (upgLevel >= 5) return false; // Max upgrade level is 5
    // Only items with damage or defense are forgeable
    if (!slot.item.damage && !slot.item.defense) return false;
    return true;
  }

  /** Get the upgrade cost for a given slot */
  getUpgradeCost(slot: InventorySlot): { gold: number; materials: { itemId: string; count: number }[] } | null {
    if (!this.canUpgrade(slot)) return null;
    const upgLevel = slot.upgradeLevel ?? 0;
    const level = upgLevel + 1; // 1-indexed

    const baseGold = 200;
    const gold = Math.floor(baseGold * Math.pow(1.5, upgLevel));

    const materials: { itemId: string; count: number }[] = [];

    // Levels 1-2: upgrade_stone
    if (level <= 2) {
      materials.push({ itemId: 'upgrade_stone', count: level });
    }
    // Levels 3-4: upgrade_stone + mithril_ore
    if (level >= 3) {
      materials.push({ itemId: 'upgrade_stone', count: level });
      materials.push({ itemId: 'mithril_ore', count: level - 1 });
    }
    // Level 5: needs forge_core
    if (level === 5) {
      materials.push({ itemId: 'forge_core', count: 1 });
      materials.push({ itemId: 'ruby_ore', count: 3 });
    }

    return { gold, materials };
  }

  /** Attempt to upgrade an item slot (inventory, hotbar, or equipment) */
  upgradeItem(pool: 'inventory' | 'hotbar' | 'equipment', index: string | number): boolean {
    let slot: InventorySlot | null = null;

    if (pool === 'inventory') slot = this.state.player.inventory[index as number];
    else if (pool === 'hotbar') slot = this.state.player.hotbar[index as number];
    else if (pool === 'equipment') {
      slot = this.state.player.equipment[index as keyof typeof this.state.player.equipment];
    }

    if (!slot || !slot.item) {
      this.addNotification('Item inválido!', 'warning');
      return false;
    }

    if (!this.canUpgrade(slot)) {
      this.addNotification('Este item não pode ser melhorado!', 'warning');
      return false;
    }

    const cost = this.getUpgradeCost(slot);
    if (!cost) return false;

    const upgLevel = slot.upgradeLevel ?? 0;
    const newLevel = upgLevel + 1;

    // Check gold
    if (this.state.player.stats.gold < cost.gold) {
      this.addNotification(`Ouro insuficiente! Precisa de ${cost.gold} 🪙`, 'warning');
      return false;
    }

    // Check materials
    for (const mat of cost.materials) {
      if (this.countInInventory(mat.itemId) < mat.count) {
        const item = getItem(mat.itemId);
        this.addNotification(`Material insuficiente: ${item?.name || mat.itemId} (${this.countInInventory(mat.itemId)}/${mat.count})`, 'warning');
        return false;
      }
    }

    // Consume gold
    this.state.player.stats.gold -= cost.gold;

    // Consume materials
    for (const mat of cost.materials) {
      this.removeFromInventory(mat.itemId, mat.count);
    }

    // Apply upgrades to the item
    slot.upgradeLevel = newLevel;
    const item = slot.item;

    // Calculate stat increases (diminishing returns)
    const dmgBonus = item.damage ? Math.floor(item.damage * (0.08 + newLevel * 0.02)) : 0;
    const defBonus = item.defense ? Math.floor(item.defense * (0.08 + newLevel * 0.02)) : 0;
    const durBonus = item.maxDurability ? Math.floor(item.maxDurability * 0.05 * newLevel) : 0;

    // Track upgrade bonuses on the slot (persisted via InventorySlot.damageBonus/defenseBonus)
    slot.damageBonus = (slot.damageBonus ?? 0) + dmgBonus;
    slot.defenseBonus = (slot.defenseBonus ?? 0) + defBonus;

    // Repair/boost durability
    if (item.maxDurability) {
      slot.durability = Math.min((slot.durability ?? item.maxDurability) + durBonus, item.maxDurability + durBonus);
    }

    this.addNotification(`⚒️ ${item.name} melhorado para +${newLevel}!`, 'success');
    this.gainXp(20 + newLevel * 15);
    this.camera.shake(3, 0.15);

    return true;
  }

  /** Get all slots that can be upgraded, with pool/index info */
  getForgeableSlots(): { slot: InventorySlot; pool: 'inventory' | 'hotbar' | 'equipment'; index: string | number }[] {
    const results: { slot: InventorySlot; pool: 'inventory' | 'hotbar' | 'equipment'; index: string | number }[] = [];

    // Check inventory
    for (let i = 0; i < this.state.player.inventory.length; i++) {
      const s = this.state.player.inventory[i];
      if (this.canUpgrade(s)) results.push({ slot: s, pool: 'inventory', index: i });
    }

    // Check hotbar
    for (let i = 0; i < this.state.player.hotbar.length; i++) {
      const s = this.state.player.hotbar[i];
      if (this.canUpgrade(s)) results.push({ slot: s, pool: 'hotbar', index: i });
    }

    // Check equipment
    const eqKeys = Object.keys(this.state.player.equipment) as (keyof typeof this.state.player.equipment)[];
    for (const key of eqKeys) {
      const s = this.state.player.equipment[key];
      if (s && this.canUpgrade(s)) results.push({ slot: s, pool: 'equipment', index: key });
    }

    return results;
  }

  // ── Quests ──────────────────────────────────────────────────────
  acceptQuest(questId: string): boolean {
    const def = getQuestById(questId);
    if (!def) return false;

    if (this.state.quests.some(q => q.definition.id === questId && q.status === 'active')) return false;
    if (this.state.player.stats.level < def.requiredLevel) return false;

    this.state.quests.push({
      definition: def,
      progress: {},
      status: 'active',
      startedAt: Date.now(),
    });

    this.addNotification(`Missão aceita: ${def.name}`, 'quest');
    return true;
  }

  private updateQuestProgress(type: string, target: string): void {
    for (const quest of this.state.quests) {
      if (quest.status !== 'active') continue;

      for (const obj of quest.definition.objectives) {
        if (obj.type === type && (obj.target === target || obj.target === 'any')) {
          const key = `${obj.type}_${obj.target}`;
          quest.progress[key] = (quest.progress[key] || 0) + 1;

          if (quest.progress[key] >= obj.count) {
            // Check if all objectives complete
            const allDone = quest.definition.objectives.every(o => {
              const k = `${o.type}_${o.target}`;
              return (quest.progress[k] || 0) >= o.count;
            });

            if (allDone) {
              this.completeQuest(quest);
            }
          }
        }
      }
    }
  }

  private completeQuest(quest: { definition: { rewards: { xp: number; gold: number; items?: { itemId: string; count: number }[] }; name: string }; progress: Record<string, number>; status: string }): void {
    quest.status = 'completed';
    const rewards = quest.definition.rewards;

    this.state.player.stats.xp += rewards.xp;
    this.state.player.stats.gold += rewards.gold;

    if (rewards.items) {
      for (const item of rewards.items) {
        this.addToInventory(item.itemId, item.count);
      }
    }

    // Check for level up
    while (this.state.player.stats.xp >= this.state.player.stats.xpToNext) {
      this.levelUp();
    }

    this.addNotification(`Missão completa: ${quest.definition.name}!`, 'quest');
  }

  // ── Progression ─────────────────────────────────────────────────
  gainXp(amount: number): void {
    this.state.player.stats.xp += amount;
    while (this.state.player.stats.xp >= this.state.player.stats.xpToNext) {
      this.levelUp();
    }
  }

  private levelUp(): void {
    const { stats } = this.state.player;
    stats.level++;
    stats.xp -= stats.xpToNext;
    stats.xpToNext = Math.floor(100 * Math.pow(1.15, stats.level - 1));
    stats.maxHp += 10;
    stats.hp = stats.maxHp;
    // Vigor skill adds max stamina; base gain at level up
    const vigorLevel = this.state.skills['vigor'] || 0;
    this.state.player.maxStamina += 8 + vigorLevel * 2;
    this.state.player.stamina = Math.min(this.state.player.stamina + 20, this.state.player.maxStamina);
    stats.strength += 1;
    stats.defense += 1;
    stats.skillPoints += 2;

    this.addNotification(`Level UP! Agora nível ${stats.level}! (+2 pontos de habilidade)`, 'success');
    this.camera.shake(5, 0.3);
  }

  upgradeSkill(skillId: string): boolean {
    const skill = SKILLS[skillId];
    if (!skill) return false;

    const currentLevel = this.state.skills[skillId] || 0;
    if (currentLevel >= skill.maxLevel) return false;
    if (this.state.player.stats.skillPoints < skill.cost) return false;

    // Check prerequisites
    if (skill.prerequisites) {
      for (const prereq of skill.prerequisites) {
        if ((this.state.skills[prereq] || 0) < 1) return false;
      }
    }

    this.state.player.stats.skillPoints -= skill.cost;
    this.state.skills[skillId] = currentLevel + 1;

    // Apply stat bonuses
    const bonuses = skill.effect(currentLevel + 1);
    if (bonuses.maxHp) this.state.player.stats.maxHp += bonuses.maxHp;
    if (bonuses.speed) this.state.player.stats.speed += bonuses.speed;
    if (bonuses.strength) this.state.player.stats.strength += bonuses.strength;
    if (bonuses.defense) this.state.player.stats.defense += bonuses.defense;
    if (bonuses.mining) this.state.player.stats.mining += bonuses.mining;
    if (bonuses.woodcutting) this.state.player.stats.woodcutting += bonuses.woodcutting;
    if (bonuses.fishing) this.state.player.stats.fishing += bonuses.fishing;
    if (bonuses.luck) this.state.player.stats.luck += bonuses.luck;

    this.addNotification(`Habilidade ${skill.name} melhorada para nível ${currentLevel + 1}!`, 'success');
    return true;
  }

  // ── Farming System ─────────────────────────────────────────────
  tillSoil(): boolean {
    const tool = this.getCurrentItem();
    if (!tool || tool.toolType !== 'hoe') return false;

    const px = Math.floor((this.state.player.x + PLAYER_SIZE / 2 + this.state.player.facing.x * TILE_SIZE) / TILE_SIZE);
    const py = Math.floor((this.state.player.y + PLAYER_SIZE / 2 + this.state.player.facing.y * TILE_SIZE) / TILE_SIZE);

    // Check if already a farm plot
    const existing = this.state.farmPlots.find(p => p.x === px && p.y === py);
    if (existing) return false;

    // Check tile is grass
    const tile = this.tileMap[py]?.[px];
    if (tile !== TileType.Grass) return false;

    this.state.farmPlots.push({
      x: px, y: py,
      seedId: null,
      growthStage: 0,
      growthProgress: 0,
      watered: false,
      plantedAt: 0,
    });

    this.addNotification('Solo preparado para plantio!', 'success');
    this.state.player.stats.farming += 0.1;
    return true;
  }

  plantSeed(seedId: string): boolean {
    const px = Math.floor((this.state.player.x + PLAYER_SIZE / 2 + this.state.player.facing.x * TILE_SIZE) / TILE_SIZE);
    const py = Math.floor((this.state.player.y + PLAYER_SIZE / 2 + this.state.player.facing.y * TILE_SIZE) / TILE_SIZE);

    const plot = this.state.farmPlots.find(p => p.x === px && p.y === py);
    if (!plot || plot.seedId) return false;

    if (!this.removeFromInventory(seedId, 1)) {
      this.addNotification('Sem sementes!', 'warning');
      return false;
    }

    plot.seedId = seedId;
    plot.growthStage = 0;
    plot.growthProgress = 0;
    plot.watered = false;
    plot.plantedAt = this.state.gameTime.totalTicks;

    this.addNotification('Semente plantada!', 'success');
    return true;
  }

  waterPlot(): boolean {
    const px = Math.floor((this.state.player.x + PLAYER_SIZE / 2 + this.state.player.facing.x * TILE_SIZE) / TILE_SIZE);
    const py = Math.floor((this.state.player.y + PLAYER_SIZE / 2 + this.state.player.facing.y * TILE_SIZE) / TILE_SIZE);

    const plot = this.state.farmPlots.find(p => p.x === px && p.y === py);
    if (!plot || !plot.seedId || plot.watered) return false;
    if (plot.growthStage >= 3) return false; // Already fully grown

    plot.watered = true;
    this.addNotification('Plantação regada!', 'success');
    return true;
  }

  harvestPlot(): boolean {
    const px = Math.floor((this.state.player.x + PLAYER_SIZE / 2 + this.state.player.facing.x * TILE_SIZE) / TILE_SIZE);
    const py = Math.floor((this.state.player.y + PLAYER_SIZE / 2 + this.state.player.facing.y * TILE_SIZE) / TILE_SIZE);

    const plotIndex = this.state.farmPlots.findIndex(p => p.x === px && p.y === py);
    if (plotIndex === -1) return false;
    const plot = this.state.farmPlots[plotIndex];
    if (!plot.seedId || plot.growthStage < 3) return false;

    // Determine harvest yield
    const seedToCrop: Record<string, string> = {
      wheat_seed: 'wheat',
      carrot_seed: 'carrot',
      potato_seed: 'potato',
      berry_seed: 'berry',
      pumpkin_seed: 'pumpkin',
    };

    const cropId = seedToCrop[plot.seedId];
    if (!cropId) return false;

    const harvestCount = 2 + Math.floor(Math.random() * 3) + Math.floor(this.state.player.stats.farming / 5);
    if (!this.addToInventory(cropId, harvestCount)) {
      this.addNotification('Inventário cheio!', 'warning');
      return false;
    }
    this.gainXp(10 + Math.floor(this.state.player.stats.farming * 2));
    this.updateQuestProgress('farm', cropId);

    this.addNotification(`+${harvestCount} ${getItem(cropId)?.name || cropId} colhido!`, 'item');

    // Reset plot
    plot.seedId = null;
    plot.growthStage = 0;
    plot.growthProgress = 0;
    plot.watered = false;

    return true;
  }

  private tryFarmAction(): void {
    const px = Math.floor((this.state.player.x + PLAYER_SIZE / 2 + this.state.player.facing.x * TILE_SIZE) / TILE_SIZE);
    const py = Math.floor((this.state.player.y + PLAYER_SIZE / 2 + this.state.player.facing.y * TILE_SIZE) / TILE_SIZE);

    const plot = this.state.farmPlots.find(p => p.x === px && p.y === py);

    if (!plot) {
      const tool = this.getCurrentItem();
      if (tool?.toolType === 'hoe') {
        this.tillSoil();
      } else {
        this.addNotification('Use uma enxada para preparar o solo!', 'warning');
      }
    } else if (!plot.seedId) {
      const seedIds = ['wheat_seed', 'carrot_seed', 'potato_seed', 'berry_seed', 'pumpkin_seed'];
      for (const id of seedIds) {
        if (this.countInInventory(id) > 0) {
          this.plantSeed(id);
          return;
        }
      }
      this.addNotification('Sem sementes!', 'warning');
    } else if (!plot.watered) {
      this.waterPlot();
    } else if (plot.growthStage >= 3) {
      this.harvestPlot();
    } else {
      this.addNotification('Plantação ainda crescendo...', 'info');
    }
  }

  // ── Farming Growth Update ──────────────────────────────────────
  private updateFarming(dt: number): void {
    const farmerLevel = this.state.skills['farmer_hand'] || 0;
    const growthMultiplier = 1 + farmerLevel * 0.3;

    for (const plot of this.state.farmPlots) {
      if (!plot.seedId || plot.growthStage >= 3) continue;

      // Only grow when watered
      if (!plot.watered) continue;

      const growthRate = 0.02 * growthMultiplier * dt;
      plot.growthProgress += growthRate;

      if (plot.growthProgress >= 1) {
        plot.growthProgress = 0;
        plot.growthStage++;
        plot.watered = false;

        if (plot.growthStage >= 3) {
          this.addNotification('Plantação pronta para colheita!', 'success');
        }
      }
    }
  }

  // ── Resource Respawn ──────────────────────────────────────────
  private updateResourceRespawn(dt: number): void {
    for (let i = this.resourceRespawnQueue.length - 1; i >= 0; i--) {
      const entry = this.resourceRespawnQueue[i];
      entry.respawnTime -= dt;
      if (entry.respawnTime <= 0) {
        const size = this.resourceSizes[entry.type];
        this.resources.push({
          x: entry.x, y: entry.y,
          type: entry.type, itemId: entry.itemId,
          hp: size?.hp ?? 10,
          maxHp: size?.hp ?? 10,
          id: generateId(),
          shakeTimer: 0,
        });
        this.resourceRespawnQueue.splice(i, 1);
      }
    }
  }

  // ── Fishing System ─────────────────────────────────────────────
  tryFish(): boolean {
    const tool = this.getCurrentItem();
    if (!tool || tool.toolType !== 'fishingRod') return false;

    // Check if near water
    const px = Math.floor((this.state.player.x + PLAYER_SIZE / 2 + this.state.player.facing.x * TILE_SIZE) / TILE_SIZE);
    const py = Math.floor((this.state.player.y + PLAYER_SIZE / 2 + this.state.player.facing.y * TILE_SIZE) / TILE_SIZE);

    const tile = this.tileMap[py]?.[px];
    if (tile !== TileType.Water && tile !== TileType.DeepWater) {
      this.addNotification('Precisa estar perto de água para pescar!', 'warning');
      return false;
    }

    // Check energy
    if (this.state.player.stats.energy < 10) {
      this.addNotification('Sem energia para pescar!', 'warning');
      return false;
    }

    this.state.player.stats.energy -= 10;

    // Determine catch based on luck, skill, and biome
    const luck = this.state.player.stats.luck;
    const fishingSkill = this.state.player.stats.fishing;
    const fisherLuckLevel = this.state.skills['fisher_luck'] || 0;
    const catchChance = 0.5 + (fishingSkill * 0.05) + (luck * 0.02) + (fisherLuckLevel * 0.1);

    if (Math.random() > catchChance) {
      this.addNotification('Nada mordeu desta vez...', 'info');
      this.gainXp(1);
      return true;
    }

    // Determine fish rarity
    const rarityRoll = Math.random() + (luck * 0.01) + (fisherLuckLevel * 0.05);
    let fishId = 'fish';
    if (rarityRoll > 0.95) fishId = 'golden_fish';

    const count = 1 + Math.floor(Math.random() * 2);
    this.addToInventory(fishId, count);
    this.gainXp(5 + fishingSkill);
    this.updateQuestProgress('fish', fishId);

    const fishName = getItem(fishId)?.name || fishId;
    this.addNotification(`Pescou ${count}x ${fishName}!`, 'item');
    return true;
  }

  // ── Building System ────────────────────────────────────────────
  placeStructure(itemId: string): boolean {
    const item = getItem(itemId);
    if (!item || !item.placeable) return false;

    if (!this.removeFromInventory(itemId, 1)) return false;

    const px = Math.floor((this.state.player.x + PLAYER_SIZE / 2 + this.state.player.facing.x * TILE_SIZE) / TILE_SIZE);
    const py = Math.floor((this.state.player.y + PLAYER_SIZE / 2 + this.state.player.facing.y * TILE_SIZE) / TILE_SIZE);

    // Check tile is walkable
    const tile = this.tileMap[py]?.[px];
    if (tile === TileType.Water || tile === TileType.DeepWater || tile === TileType.Wall || tile === TileType.CaveWall) {
      this.addToInventory(itemId, 1);
      this.addNotification('Não pode construir aqui!', 'warning');
      return false;
    }

    // Check for existing structure
    const existing = this.state.structures.find(s =>
      s.x === px * TILE_SIZE && s.y === py * TILE_SIZE
    );
    if (existing) {
      this.addToInventory(itemId, 1);
      this.addNotification('Já existe uma construção aqui!', 'warning');
      return false;
    }

    this.state.structures.push({
      id: `struct_${Date.now()}`,
      itemId,
      x: px * TILE_SIZE,
      y: py * TILE_SIZE,
      width: TILE_SIZE,
      height: TILE_SIZE,
      health: 100,
      maxHealth: 100,
    });

    this.gainXp(3);
    this.addNotification(`${item.name} construído!`, 'success');
    return true;
  }

  // ── Save/Load ─────────────────────────────────────────────────
  saveToSlot(slot: number): boolean {
    if (saveGame(this.state, slot)) {
      this.addNotification(`Jogo salvo no slot ${slot + 1}!`, 'success');
      return true;
    }
    this.addNotification('Erro ao salvar!', 'error');
    return false;
  }

  loadFromSlot(slot: number): boolean {
    const data = loadGame(slot);
    if (!data) {
      this.addNotification('Nenhum save encontrado!', 'warning');
      return false;
    }
    this.applyLoadedState(data);
    this.addNotification(`Jogo carregado do slot ${slot + 1}!`, 'success');
    return true;
  }

  loadAutoSaveData(): boolean {
    const data = loadAutoSave();
    if (!data) return false;
    this.applyLoadedState(data);
    this.addNotification('Auto-save carregado!', 'success');
    return true;
  }

  performAutoSave(): void {
    autoSave(this.state);
  }

  private applyLoadedState(data: Partial<GameState>): void {
    if (data.player) Object.assign(this.state.player, data.player);
    if (data.quests) this.state.quests = data.quests;
    if (data.skills) this.state.skills = data.skills;
    if (data.structures) this.state.structures = data.structures;
    if (data.farmPlots) this.state.farmPlots = data.farmPlots;
    if (data.discoveredAreas) this.state.discoveredAreas = data.discoveredAreas;
    if (data.gameTime) Object.assign(this.state.gameTime, data.gameTime);
    if (data.settings) Object.assign(this.state.settings, data.settings);
  }

  // ── Helpers ─────────────────────────────────────────────────────
  private spawnDroppedItem(x: number, y: number, itemId: string, count: number): void {
    this.droppedItems.push({
      id: generateId(),
      itemId, count, x, y,
      velocity: { x: (Math.random() - 0.5) * 100, y: -80 },
      lifetime: 30,
    });
  }

  private spawnParticles(x: number, y: number, color: string, count: number): void {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 120,
        vy: -Math.random() * 80 - 20,
        life: 0.5 + Math.random() * 0.5,
        maxLife: 1,
        color,
        size: 2 + Math.random() * 3,
      });
    }
  }

  addNotification(message: string, type: Notification['type']): void {
    this.state.notifications.push({
      id: generateId(),
      message,
      type,
      timestamp: Date.now(),
      duration: 3000,
    });
  }

  // ── Rendering ───────────────────────────────────────────────────
  private render(): void {
    const { ctx, canvas, camera } = this;
    const { player, gameTime } = this.state;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Sky background
    ctx.fillStyle = this.inCave ? getCaveSkyColor() : getSkyColor(gameTime);
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.scale(camera.zoom, camera.zoom);

    // Calculate visible tile range
    const curTileW = this.inCave && this.caveData ? this.caveData.tileMap[0].length : WORLD_WIDTH;
    const curTileH = this.inCave && this.caveData ? this.caveData.tileMap.length : WORLD_HEIGHT;
    const curTileMap = this.inCave && this.caveData ? this.caveData.tileMap : this.tileMap;

    const startTileX = Math.max(0, Math.floor(camera.x / TILE_SIZE) - 1);
    const startTileY = Math.max(0, Math.floor(camera.y / TILE_SIZE) - 1);
    const endTileX = Math.min(curTileW, Math.ceil((camera.x + canvas.width / camera.zoom) / TILE_SIZE) + 1);
    const endTileY = Math.min(curTileH, Math.ceil((camera.y + canvas.height / camera.zoom) / TILE_SIZE) + 1);

    // Draw tiles (no grid lines — cleaner look)
    for (let y = startTileY; y < endTileY; y++) {
      for (let x = startTileX; x < endTileX; x++) {
        const tile = curTileMap[y]?.[x];
        if (tile === undefined) continue;

        const sx = x * TILE_SIZE;
        const sy = y * TILE_SIZE;
        const screenPos = camera.worldToScreen(sx, sy);

        // ── Cave tile rendering ──
        if (this.inCave) {
          let color = TILE_COLORS[tile] || '#1a1a2a';
          // Cave floor variation
          if (tile === TileType.CaveFloor) {
            const n = fractalNoise(x, y, this.state.world.seed + 6000, 1, 8);
            color = n > 0.6 ? '#2a2a3a' : n > 0.3 ? '#222233' : '#1a1a2a';
          }
          // Cave wall with stone texture
          if (tile === TileType.CaveWall) {
            const n = fractalNoise(x + 200, y + 200, this.state.world.seed + 7000, 1, 5);
            color = n > 0.6 ? '#1a1a2a' : '#0d0d1a';
          }
          ctx.fillStyle = color;
          ctx.fillRect(screenPos.x, screenPos.y, TILE_SIZE + 1, TILE_SIZE + 1);

          // Lava glow effect
          if (tile === TileType.Lava) {
            const lavaPulse = Math.sin(performance.now() / 800 + x + y) * 0.3 + 0.7;
            ctx.fillStyle = `rgba(255, 80, 0, ${lavaPulse * 0.4})`;
            ctx.fillRect(screenPos.x, screenPos.y, TILE_SIZE, TILE_SIZE);
            // Lava cracks
            if (fractalNoise(x + 400, y + 400, this.state.world.seed + 8000, 1, 4) > 0.6) {
              ctx.fillStyle = `rgba(255, 200, 50, ${lavaPulse * 0.6})`;
              ctx.fillRect(screenPos.x + 4, screenPos.y + 8, 8, 2);
              ctx.fillRect(screenPos.x + 12, screenPos.y + 4, 2, 6);
            }
          }
          continue;
        }

        // ── Surface tile rendering ──
        // Base tile color
        let color = TILE_COLORS[tile] || '#333';

        // Add biome variation
        if (tile === TileType.Grass) {
          const biome = this.biomeMap[y]?.[x];
          if (biome) {
            const noise = fractalNoise(x, y, this.state.world.seed + 2000, 1, 10);
            const baseColor = this.getBiomeGrassColor(biome);
            color = this.varyColor(baseColor, noise * 0.15);
          }
        }

        ctx.fillStyle = color;
        ctx.fillRect(screenPos.x, screenPos.y, TILE_SIZE + 1, TILE_SIZE + 1);

        // Grass detail — tiny tufts on plains/village
        if (tile === TileType.Grass || tile === TileType.Dirt) {
          const biome = this.biomeMap[y]?.[x];
          if (biome === Biome.Plains || biome === Biome.Village) {
            const n = fractalNoise(x + 500, y + 500, this.state.world.seed + 3000, 1, 5);
            if (n > 0.65) {
              ctx.fillStyle = 'rgba(100, 180, 70, 0.3)';
              ctx.fillRect(screenPos.x + (n * 20) % 28, screenPos.y + 24, 2, 6);
            }
          }
          // Tiny flowers in forest
          if (biome === Biome.Forest) {
            const n = fractalNoise(x + 300, y + 300, this.state.world.seed + 4000, 1, 6);
            if (n > 0.72) {
              const colors = ['rgba(255,100,200,0.4)', 'rgba(255,200,50,0.3)', 'rgba(200,100,255,0.3)'];
              ctx.fillStyle = colors[Math.floor(n * 10) % 3];
              ctx.beginPath();
              ctx.arc(screenPos.x + (n * 15) % 28, screenPos.y + 22, 1.5, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }

        // Water shimmer animation
        if (tile === TileType.Water || tile === TileType.DeepWater) {
          const shimmer = Math.sin(performance.now() / 2000 + x * 2 + y * 3) * 0.03 + 0.97;
          ctx.fillStyle = tile === TileType.Water
            ? `rgba(74, 144, 194, ${shimmer * 0.15})`
            : `rgba(44, 95, 138, ${shimmer * 0.2})`;
          ctx.fillRect(screenPos.x, screenPos.y, TILE_SIZE, TILE_SIZE);
          // Sparkle
          if (fractalNoise(x, y, 99999, 1, 3) > 0.9) {
            ctx.fillStyle = `rgba(255,255,255,${Math.sin(performance.now() / 1000 + x + y) * 0.15 + 0.15})`;
            ctx.fillRect(screenPos.x + 10, screenPos.y + 10, 2, 2);
          }
        }

        // Path edge detail
        if (tile === TileType.Path) {
          const n = fractalNoise(x, y, this.state.world.seed + 5000, 1, 8);
          if (n > 0.6) {
            ctx.fillStyle = 'rgba(255,255,255,0.05)';
            ctx.fillRect(screenPos.x + (n * 20) % 24, screenPos.y + (n * 15) % 24, 3, 2);
          }
        }
      }
    }

    // Draw resources
    const drawResources = this.inCave ? this.caveResources : this.resources;
    for (const res of drawResources) {
      if (!camera.isVisible(res.x, res.y, 24, 40)) continue;
      this.drawResource(res);
    }

    // Draw decorations (purely visual — surface only)
    if (!this.inCave) {
      const decorationColors: Record<string, string> = {
        flower: '#ff88cc', mushroom: '#cc8844', tall_grass: '#5a9a4a',
        lily_pad: '#4a8a3a', dead_log: '#5a3a1a', small_rock: '#7a7a7a',
        fern: '#4aaa4a', cave_moss: '#3a6a3a', glowing_shroom: '#88ffaa',
      };
      for (const dec of this.decorations) {
        if (!camera.isVisible(dec.x, dec.y, 8, 8)) continue;
        const dPos = camera.worldToScreen(dec.x, dec.y);
        ctx.fillStyle = decorationColors[dec.type] || '#888';
        if (dec.type === 'flower' || dec.type === 'mushroom') {
          ctx.beginPath();
          ctx.arc(dPos.x + 2, dPos.y + 2, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillRect(dPos.x + 1, dPos.y + 3, 2, 3);
        } else if (dec.type === 'tall_grass' || dec.type === 'fern') {
          ctx.fillRect(dPos.x, dPos.y, 1, 6);
          ctx.fillRect(dPos.x + 2, dPos.y + 1, 1, 5);
        } else if (dec.type === 'lily_pad') {
          ctx.beginPath();
          ctx.ellipse(dPos.x + 3, dPos.y + 1, 4, 2, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (dec.type === 'dead_log') {
          ctx.fillRect(dPos.x, dPos.y + 1, 6, 2);
          ctx.fillRect(dPos.x + 1, dPos.y, 4, 1);
        } else {
          ctx.fillRect(dPos.x, dPos.y, 3, 3);
        }
      }
    }

    // ── Cave: draw exit indicator near entrance ──
    if (this.inCave && this.caveData && camera.isVisible(this.caveData.entranceX, this.caveData.entranceY, TILE_SIZE, TILE_SIZE)) {
      const ex = this.caveData.entranceX;
      const ey = this.caveData.entranceY;
      const ePos = camera.worldToScreen(ex, ey);
      const exitPulse = Math.sin(performance.now() / 500) * 0.3 + 0.7;
      ctx.globalAlpha = exitPulse;
      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = '#ffdd00';
      ctx.textAlign = 'center';
      ctx.fillText('[E] Sair', ePos.x + TILE_SIZE / 2, ePos.y - 6);
      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
      // Stairs/exit arrow
      ctx.fillStyle = '#8a7a5a';
      ctx.fillRect(ePos.x + 10, ePos.y + 8, 12, 4);
      ctx.fillRect(ePos.x + 14, ePos.y + 4, 4, 8);
      ctx.fillStyle = '#4a3a2a';
      ctx.fillRect(ePos.x + 10, ePos.y + 12, 12, 6);
    }

    // Draw dropped items
    for (const di of this.droppedItems) {
      const item = getItem(di.itemId);
      if (!item) continue;
      const pos = camera.worldToScreen(di.x, di.y);
      ctx.font = '16px serif';
      ctx.fillText(item.icon, pos.x - 8, pos.y + 5);
    }

    // Draw NPCs (surface only)
    if (!this.inCave) {
      for (const npc of this.npcs) {
        if (!camera.isVisible(npc.x, npc.y, npc.width, npc.height)) continue;
        this.drawNpc(npc);
      }
    }

    // Draw enemies
    const drawEnemies = this.inCave ? this.caveEnemies : this.enemies;
    for (const enemy of drawEnemies) {
      if (!camera.isVisible(enemy.x, enemy.y, enemy.width, enemy.height)) continue;
      this.drawEnemy(enemy);
    }

    // Draw farm plots
    for (const plot of this.state.farmPlots) {
      if (!camera.isVisible(plot.x * TILE_SIZE, plot.y * TILE_SIZE, TILE_SIZE, TILE_SIZE)) continue;
      this.drawFarmPlot(plot);
    }

    // Draw structures
    for (const struct of this.state.structures) {
      if (!camera.isVisible(struct.x, struct.y, struct.width, struct.height)) continue;
      this.drawStructure(struct);
    }

    // Draw player
    this.drawPlayer();

    // Draw projectiles (arrows)
    for (const p of this.projectiles) {
      const pos = camera.worldToScreen(p.x, p.y);
      // Arrow shaft
      ctx.save();
      ctx.translate(pos.x, pos.y);
      const angle = Math.atan2(p.vy, p.vx);
      ctx.rotate(angle);
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(-6, -1, 12, 2);
      // Arrowhead
      ctx.fillStyle = '#ddd';
      ctx.beginPath();
      ctx.moveTo(6, 0);
      ctx.lineTo(3, -3);
      ctx.lineTo(3, 3);
      ctx.closePath();
      ctx.fill();
      // Fletching
      ctx.fillStyle = '#ff4444';
      ctx.fillRect(-7, -2, 2, 4);
      ctx.restore();
      // Arrow glow
      ctx.fillStyle = 'rgba(255,255,200,0.15)';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw particles
    for (const p of this.particles) {
      const pos = camera.worldToScreen(p.x, p.y);
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(pos.x - p.size / 2, pos.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    // Draw damage numbers
    for (const dn of this.damageNumbers) {
      const pos = camera.worldToScreen(dn.x, dn.y);
      const alpha = Math.min(1, dn.timer * 2);
      ctx.globalAlpha = alpha;
      ctx.font = dn.isCrit ? 'bold 18px monospace' : '14px monospace';
      ctx.fillStyle = dn.isHeal ? '#4caf50' : dn.isCrit ? '#ff4444' : '#ffffff';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      const text = dn.isHeal ? `+${dn.value}` : `-${dn.value}`;
      ctx.strokeText(text, pos.x, pos.y);
      ctx.fillText(text, pos.x, pos.y);
    }
    ctx.globalAlpha = 1;

    ctx.restore();

    // ── Cave darkness overlay (always dark underground) ──
    if (this.inCave) {
      // Deep cave darkness with torch light around player
      ctx.fillStyle = 'rgba(0, 0, 10, 0.75)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Torch/light source around player
      const playerScreen = camera.worldToScreen(
        player.x + PLAYER_SIZE / 2,
        player.y + PLAYER_SIZE / 2
      );
      const lightRadius = this.getCurrentItem()?.toolType === 'torch' ? 200 : 120;
      const gradient = ctx.createRadialGradient(
        playerScreen.x, playerScreen.y, 20,
        playerScreen.x, playerScreen.y, lightRadius
      );
      gradient.addColorStop(0, 'rgba(0, 0, 10, 0)');
      gradient.addColorStop(1, 'rgba(0, 0, 10, 0.75)');
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'source-over';

      // Subtle lava ambient glow
      if (this.caveData) {
        const lavaGlow = Math.sin(performance.now() / 2000) * 0.03 + 0.05;
        ctx.fillStyle = `rgba(255, 80, 0, ${lavaGlow})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }

    // Night overlay
    if (!this.inCave && gameTime.isNight) {
      const nightAlpha = this.getNightAlpha(gameTime);
      ctx.fillStyle = `rgba(0, 0, 30, ${nightAlpha})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Torch light around player
      if (this.getCurrentItem()?.toolType === 'torch') {
        const playerScreen = camera.worldToScreen(
          player.x + PLAYER_SIZE / 2,
          player.y + PLAYER_SIZE / 2
        );
        const gradient = ctx.createRadialGradient(
          playerScreen.x, playerScreen.y, 30,
          playerScreen.x, playerScreen.y, 180
        );
        gradient.addColorStop(0, 'rgba(0, 0, 30, 0)');
        gradient.addColorStop(1, `rgba(0, 0, 30, ${nightAlpha})`);
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = 'source-over';
      }
    }

    // Weather effects (surface only)
    if (!this.inCave) {
      this.drawWeather();
    }

    // Season tint (surface only)
    if (!this.inCave) {
      const seasonTint = getSeasonTint(gameTime.season);
      ctx.fillStyle = seasonTint;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  private drawResource(res: { x: number; y: number; type: string; itemId: string }): void {
    const { ctx, camera } = this;
    const pos = camera.worldToScreen(res.x, res.y);

    // Gentle sway for vegetation
    const sway = Math.sin(performance.now() / 3000 + res.x * 0.1) * 1.2;

    switch (res.type) {
      case 'tree': {
        // Tree shadow
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.beginPath();
        ctx.ellipse(pos.x + 12, pos.y + 38, 12, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.save();
        ctx.translate(pos.x + 12, pos.y + 30);
        ctx.rotate(sway * 0.01);
        // Trunk
        ctx.fillStyle = '#5a3a1a';
        ctx.fillRect(-4, -10, 8, 20);
        // Trunk details
        ctx.fillStyle = '#4a2a0a';
        ctx.fillRect(-2, -8, 2, 16);
        ctx.fillRect(1, -5, 1, 12);
        // Foliage bottom layer
        ctx.fillStyle = '#2d5a1e';
        ctx.beginPath();
        ctx.arc(0, -16, 16, 0, Math.PI * 2);
        ctx.fill();
        // Foliage mid layer
        ctx.fillStyle = '#3d7a2e';
        ctx.beginPath();
        ctx.arc(-2, -20, 13, 0, Math.PI * 2);
        ctx.fill();
        // Foliage top layer (lighter)
        ctx.fillStyle = '#4a9a3e';
        ctx.beginPath();
        ctx.arc(0, -24, 10, 0, Math.PI * 2);
        ctx.fill();
        // Highlight
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.beginPath();
        ctx.arc(-3, -26, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        break;
      }
      case 'bush': {
        // Bush shadow
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.beginPath();
        ctx.ellipse(pos.x + 8, pos.y + 16, 8, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.save();
        ctx.translate(pos.x + 8, pos.y + 12);
        ctx.rotate(sway * 0.02);
        // Main bush body
        ctx.fillStyle = '#4a8a3a';
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#5a9a4a';
        ctx.beginPath();
        ctx.arc(-2, -3, 7, 0, Math.PI * 2);
        ctx.fill();
        // Berries
        ctx.fillStyle = '#ff4444';
        ctx.beginPath();
        ctx.arc(-3, -2, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(3, 1, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(1, -4, 1.5, 0, Math.PI * 2);
        ctx.fill();
        // Highlight
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.beginPath();
        ctx.arc(-2, -5, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        break;
      }
      case 'rock': {
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(pos.x + 12, pos.y + 18, 12, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        // Rock body
        ctx.fillStyle = '#7a7a7a';
        ctx.beginPath();
        ctx.moveTo(pos.x + 10, pos.y + 2);
        ctx.lineTo(pos.x + 22, pos.y + 8);
        ctx.lineTo(pos.x + 18, pos.y + 18);
        ctx.lineTo(pos.x + 2, pos.y + 18);
        ctx.lineTo(pos.x + 2, pos.y + 6);
        ctx.closePath();
        ctx.fill();
        // Highlight
        ctx.fillStyle = '#9a9a9a';
        ctx.beginPath();
        ctx.arc(pos.x + 8, pos.y + 8, 4, 0, Math.PI * 2);
        ctx.fill();
        // Edge details
        ctx.fillStyle = '#6a6a6a';
        ctx.fillRect(pos.x + 5, pos.y + 12, 3, 2);
        ctx.fillRect(pos.x + 12, pos.y + 10, 3, 2);
        break;
      }
      case 'iron_rock': {
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(pos.x + 12, pos.y + 18, 12, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        // Body
        ctx.fillStyle = '#6a6a6a';
        ctx.beginPath();
        ctx.moveTo(pos.x + 10, pos.y + 2);
        ctx.lineTo(pos.x + 22, pos.y + 8);
        ctx.lineTo(pos.x + 18, pos.y + 18);
        ctx.lineTo(pos.x + 2, pos.y + 18);
        ctx.lineTo(pos.x + 2, pos.y + 6);
        ctx.closePath();
        ctx.fill();
        // Iron veins
        ctx.fillStyle = '#cd7f32';
        ctx.beginPath();
        ctx.arc(pos.x + 7, pos.y + 9, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(pos.x + 14, pos.y + 13, 2.5, 0, Math.PI * 2);
        ctx.fill();
        // Highlight
        ctx.fillStyle = '#8a7a6a';
        ctx.beginPath();
        ctx.arc(pos.x + 9, pos.y + 6, 3, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'gold_rock': {
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(pos.x + 10, pos.y + 16, 10, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        // Body
        ctx.fillStyle = '#5a5a5a';
        ctx.beginPath();
        ctx.moveTo(pos.x + 10, pos.y);
        ctx.lineTo(pos.x + 20, pos.y + 6);
        ctx.lineTo(pos.x + 18, pos.y + 16);
        ctx.lineTo(pos.x + 3, pos.y + 16);
        ctx.lineTo(pos.x + 2, pos.y + 4);
        ctx.closePath();
        ctx.fill();
        // Gold veins (sparkly)
        ctx.fillStyle = '#ffd700';
        const goldSparkle = Math.sin(performance.now() / 500 + res.x) * 0.3 + 0.7;
        ctx.globalAlpha = goldSparkle;
        ctx.beginPath();
        ctx.arc(pos.x + 8, pos.y + 8, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(pos.x + 13, pos.y + 11, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        // Highlight
        ctx.fillStyle = '#8a8a7a';
        ctx.beginPath();
        ctx.arc(pos.x + 10, pos.y + 4, 2, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'coal_rock': {
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(pos.x + 10, pos.y + 16, 10, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        // Body
        ctx.fillStyle = '#4a4a4a';
        ctx.beginPath();
        ctx.moveTo(pos.x + 10, pos.y + 2);
        ctx.lineTo(pos.x + 18, pos.y + 8);
        ctx.lineTo(pos.x + 16, pos.y + 18);
        ctx.lineTo(pos.x + 4, pos.y + 18);
        ctx.closePath();
        ctx.fill();
        // Coal shine
        ctx.fillStyle = '#6a6a6a';
        ctx.beginPath();
        ctx.arc(pos.x + 9, pos.y + 10, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.arc(pos.x + 8, pos.y + 10, 2.5, 0, Math.PI * 2);
        ctx.fill();
        // Highlight
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.beginPath();
        ctx.arc(pos.x + 8, pos.y + 6, 2, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'crystal_node': {
        // Glow
        ctx.shadowColor = 'rgba(74, 138, 170, 0.4)';
        ctx.shadowBlur = 10;
        // Crystal body
        ctx.fillStyle = '#4a8aaa';
        ctx.beginPath();
        ctx.moveTo(pos.x + 8, pos.y + 2);
        ctx.lineTo(pos.x + 16, pos.y + 8);
        ctx.lineTo(pos.x + 14, pos.y + 22);
        ctx.lineTo(pos.x + 4, pos.y + 22);
        ctx.lineTo(pos.x + 2, pos.y + 8);
        ctx.closePath();
        ctx.fill();
        // Inner highlight
        ctx.fillStyle = '#8acaff';
        ctx.beginPath();
        ctx.moveTo(pos.x + 10, pos.y + 6);
        ctx.lineTo(pos.x + 13, pos.y + 10);
        ctx.lineTo(pos.x + 11, pos.y + 14);
        ctx.lineTo(pos.x + 8, pos.y + 10);
        ctx.closePath();
        ctx.fill();
        // Bright core
        ctx.fillStyle = '#b0e0ff';
        ctx.beginPath();
        ctx.arc(pos.x + 8, pos.y + 12, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        break;
      }
      case 'mithril_rock': {
        // Mithril rock — teal-blue crystal ore
        ctx.shadowColor = 'rgba(74, 224, 192, 0.3)';
        ctx.shadowBlur = 6;
        ctx.fillStyle = '#5a5a5a';
        ctx.beginPath();
        ctx.moveTo(pos.x + 10, pos.y + 2);
        ctx.lineTo(pos.x + 22, pos.y + 6);
        ctx.lineTo(pos.x + 20, pos.y + 18);
        ctx.lineTo(pos.x + 4, pos.y + 18);
        ctx.lineTo(pos.x + 2, pos.y + 6);
        ctx.closePath();
        ctx.fill();
        // Mithril veins
        ctx.fillStyle = '#4ae0c0';
        const mithrilSparkle = Math.sin(performance.now() / 600 + res.x) * 0.3 + 0.7;
        ctx.globalAlpha = mithrilSparkle;
        ctx.beginPath();
        ctx.arc(pos.x + 8, pos.y + 8, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(pos.x + 14, pos.y + 11, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        // Inner glow
        ctx.fillStyle = '#8af0e0';
        ctx.beginPath();
        ctx.arc(pos.x + 9, pos.y + 6, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        break;
      }
      case 'ruby_rock': {
        // Ruby rock — deep red glowing crystal
        ctx.shadowColor = 'rgba(255, 34, 68, 0.3)';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#5a3a3a';
        ctx.beginPath();
        ctx.moveTo(pos.x + 10, pos.y);
        ctx.lineTo(pos.x + 20, pos.y + 6);
        ctx.lineTo(pos.x + 18, pos.y + 16);
        ctx.lineTo(pos.x + 3, pos.y + 16);
        ctx.lineTo(pos.x + 2, pos.y + 4);
        ctx.closePath();
        ctx.fill();
        // Ruby crystal
        ctx.fillStyle = '#ff2244';
        const rubyPulse = Math.sin(performance.now() / 500 + res.x) * 0.2 + 0.8;
        ctx.globalAlpha = rubyPulse;
        ctx.beginPath();
        ctx.moveTo(pos.x + 8, pos.y + 4);
        ctx.lineTo(pos.x + 16, pos.y + 8);
        ctx.lineTo(pos.x + 14, pos.y + 14);
        ctx.lineTo(pos.x + 6, pos.y + 14);
        ctx.lineTo(pos.x + 4, pos.y + 6);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
        // Bright core
        ctx.fillStyle = '#ff6688';
        ctx.beginPath();
        ctx.arc(pos.x + 10, pos.y + 8, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        break;
      }
      case 'cave_entrance': {
        // Cave entrance — dark hole in the mountain
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(pos.x + 16, pos.y + 28, 16, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        // Dark arch
        ctx.fillStyle = '#1a0a0a';
        ctx.beginPath();
        ctx.arc(pos.x + 16, pos.y + 18, 14, Math.PI, 0);
        ctx.lineTo(pos.x + 30, pos.y + 32);
        ctx.lineTo(pos.x + 2, pos.y + 32);
        ctx.closePath();
        ctx.fill();
        // Stone rim
        ctx.fillStyle = '#5a4a3a';
        ctx.beginPath();
        ctx.arc(pos.x + 16, pos.y + 18, 16, Math.PI, 0);
        ctx.lineTo(pos.x + 32, pos.y + 32);
        ctx.lineTo(pos.x + 30, pos.y + 27);
        ctx.arc(pos.x + 16, pos.y + 18, 14, 0, Math.PI, true);
        ctx.closePath();
        ctx.fill();
        // Stone details
        ctx.fillStyle = '#7a6a5a';
        ctx.fillRect(pos.x + 6, pos.y + 14, 4, 2);
        ctx.fillRect(pos.x + 22, pos.y + 12, 5, 2);
        // Glow pulse to indicate interactivity
        const glowPulse = Math.sin(performance.now() / 1000) * 0.15 + 0.3;
        ctx.fillStyle = `rgba(100, 200, 255, ${glowPulse})`;
        ctx.beginPath();
        ctx.arc(pos.x + 16, pos.y + 16, 6, 0, Math.PI * 2);
        ctx.fill();
        // Interaction label
        ctx.font = '10px monospace';
        ctx.fillStyle = '#ffdd00';
        ctx.textAlign = 'center';
        ctx.fillText('[E] Entrar (Nv.6)', pos.x + 16, pos.y - 4);
        ctx.textAlign = 'left';
        break;
      }
    }
  }

  private drawNpc(npc: NpcEntity): void {
    const { ctx, camera } = this;
    const pos = camera.worldToScreen(npc.x, npc.y);
    const cx = pos.x + 12;
    const by = pos.y + 24;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(cx, by - 2, 10, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Idle bob animation
    const bob = Math.sin(performance.now() / 800 + npc.x) * 1.2;

    // Body
    ctx.fillStyle = npc.definition.color;
    ctx.fillRect(cx - 7, by - 14 + bob, 14, 11);

    // Distinguishing features per NPC type
    switch (npc.definition.type) {
      case 'merchant':
        // Coin pouch
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(cx - 3, by - 14 + bob, 6, 4);
        break;
      case 'blacksmith':
        // Apron
        ctx.fillStyle = '#4a4a4a';
        ctx.fillRect(cx - 6, by - 12 + bob, 12, 8);
        // Hammer
        ctx.fillStyle = '#888';
        ctx.fillRect(cx + 8, by - 18 + bob, 3, 8);
        ctx.fillRect(cx + 7, by - 20 + bob, 5, 3);
        break;
      case 'farmer':
        // Straw hat
        ctx.fillStyle = '#c4a862';
        ctx.fillRect(cx - 9, by - 22 + bob, 18, 4);
        ctx.fillRect(cx - 6, by - 26 + bob, 12, 5);
        break;
      case 'alchemist':
        // Potion bottle
        ctx.fillStyle = '#9c27b0';
        ctx.fillRect(cx + 5, by - 18 + bob, 5, 7);
        ctx.fillStyle = '#ce93d8';
        ctx.fillRect(cx + 6, by - 16 + bob, 3, 4);
        break;
      case 'hunter':
        // Bow
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(cx - 10, by - 20 + bob, 3, 14);
        ctx.fillStyle = '#8d6e63';
        ctx.fillRect(cx - 11, by - 20 + bob, 5, 2);
        ctx.fillRect(cx - 11, by - 8 + bob, 5, 2);
        break;
      case 'questGiver':
        // Scroll
        ctx.fillStyle = '#fff';
        ctx.fillRect(cx + 6, by - 17 + bob, 4, 6);
        ctx.fillStyle = '#ff5722';
        ctx.fillRect(cx + 7, by - 15 + bob, 2, 3);
        break;
    }

    // Arms
    ctx.fillStyle = '#ffcc99';
    ctx.fillRect(cx - 9, by - 13 + bob, 3, 8);
    ctx.fillRect(cx + 6, by - 13 + bob, 3, 8);

    // Legs
    ctx.fillStyle = '#3a3a5a';
    const legSwing = Math.sin(performance.now() / 400) * 1.5;
    ctx.fillRect(cx - 5 + legSwing, by - 4 + bob, 4, 4);
    ctx.fillRect(cx + 1 - legSwing, by - 4 + bob, 4, 4);

    // Head
    ctx.fillStyle = '#ffcc99';
    ctx.beginPath();
    ctx.arc(cx, by - 18 + bob, 6, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#000';
    ctx.fillRect(cx - 2, by - 19 + bob, 1.5, 1.5);
    ctx.fillRect(cx + 1, by - 19 + bob, 1.5, 1.5);

    // Icon above head
    ctx.font = '12px serif';
    ctx.textAlign = 'center';
    ctx.fillText(npc.definition.icon, cx, by - 28 + bob);

    // Name label
    ctx.font = '10px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(npc.definition.name, cx, by - 34 + bob);

    // Interaction indicator
    const dist = distance(
      { x: this.state.player.x + PLAYER_SIZE / 2, y: this.state.player.y + PLAYER_SIZE / 2 },
      { x: npc.x + 12, y: npc.y + 12 }
    );
    if (dist < INTERACT_RANGE) {
      const pulse = Math.sin(performance.now() / 300) * 0.3 + 0.7;
      ctx.globalAlpha = pulse;
      ctx.font = '11px monospace';
      ctx.fillStyle = '#ffdd00';
      ctx.fillText('[E] Falar', cx, by - 42);
      ctx.globalAlpha = 1;
    }

    ctx.textAlign = 'left';
  }

  private drawEnemy(enemy: EnemyEntity): void {
    const { ctx, camera } = this;
    const pos = camera.worldToScreen(enemy.x, enemy.y);
    const cx = pos.x + enemy.width / 2;
    const by = pos.y + enemy.height;

    // Death fade
    if (enemy.state === 'dead') {
      ctx.globalAlpha = Math.max(0, enemy.deathTimer * 2);
    }

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(cx, by - 2, enemy.width / 2 - 2, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hurt flash
    if (enemy.state === 'hurt') {
      ctx.globalAlpha = 0.4 + Math.sin(performance.now() / 50) * 0.3;
    }

    // Idle bob
    const bob = (enemy.state !== 'dead' && enemy.state !== 'hurt')
      ? Math.sin(performance.now() / 600 + enemy.x) * 1.5
      : 0;

    // Aggro glow (when chasing)
    if (enemy.state === 'chase') {
      ctx.shadowColor = 'rgba(255, 0, 0, 0.3)';
      ctx.shadowBlur = 8;
    }

    const def = enemy.definition;
    const w = enemy.width;
    const h = enemy.height;

    // ── Unique enemy shapes ──
    switch (def.type) {
      case 'slime': {
        ctx.fillStyle = def.color;
        ctx.beginPath();
        const slimeBob = Math.sin(performance.now() / 400) * 2;
        ctx.ellipse(cx, by + slimeBob, w / 2, h / 2.5 + slimeBob * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        // Highlight
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.beginPath();
        ctx.ellipse(cx - 2, by - 4 + slimeBob, 3, 2, 0, 0, Math.PI * 2);
        ctx.fill();
        if (enemy.state !== 'dead') {
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(cx - 3, by - 6 + slimeBob, 2.5, 0, Math.PI * 2);
          ctx.arc(cx + 3, by - 6 + slimeBob, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#000';
          ctx.beginPath();
          ctx.arc(cx - 2, by - 5 + slimeBob, 1.5, 0, Math.PI * 2);
          ctx.arc(cx + 4, by - 5 + slimeBob, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'wolf':
      case 'boar': {
        // Body
        ctx.fillStyle = def.color;
        ctx.beginPath();
        ctx.ellipse(cx, by - 4 + bob, w / 2, h / 3 + 1, 0, 0, Math.PI * 2);
        ctx.fill();
        // Head
        ctx.beginPath();
        const headDir = enemy.direction.x > 0 ? 1 : -1;
        ctx.arc(cx + headDir * (w / 2 - 2), by - 6 + bob, 6, 0, Math.PI * 2);
        ctx.fill();
        if (enemy.state !== 'dead') {
          // Eyes
          ctx.fillStyle = '#ff4444';
          ctx.beginPath();
          ctx.arc(cx + headDir * (w / 2 - 1), by - 7 + bob, 2, 0, Math.PI * 2);
          ctx.arc(cx + headDir * (w / 2 + 3), by - 7 + bob, 2, 0, Math.PI * 2);
          ctx.fill();
          // Ears
          ctx.fillStyle = def.color;
          ctx.beginPath();
          ctx.arc(cx + headDir * (w / 2 - 2), by - 12 + bob, 3, 0, Math.PI * 2);
          ctx.arc(cx + headDir * (w / 2 + 2), by - 12 + bob, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        // Legs
        ctx.fillStyle = darkenColor(def.color, 0.3);
        const legSwing = Math.sin(performance.now() / 200 + enemy.x) * 2;
        ctx.fillRect(cx - w / 4 + legSwing, by - 3, 3, 3);
        ctx.fillRect(cx + w / 4 - legSwing, by - 3, 3, 3);
        break;
      }
      case 'skeleton': {
        // Body
        ctx.fillStyle = def.color;
        ctx.fillRect(cx - 4, by - 14 + bob, 8, 10);
        // Ribs
        ctx.strokeStyle = '#bdbdbd';
        ctx.lineWidth = 0.5;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(cx - 4, by - 11 + i * 2 + bob);
          ctx.lineTo(cx + 4, by - 11 + i * 2 + bob);
          ctx.stroke();
        }
        // Head
        ctx.fillStyle = '#f5f5f5';
        ctx.beginPath();
        ctx.arc(cx, by - 18 + bob, 6, 0, Math.PI * 2);
        ctx.fill();
        if (enemy.state !== 'dead') {
          ctx.fillStyle = '#000';
          ctx.fillRect(cx - 3, by - 20 + bob, 2, 2);
          ctx.fillRect(cx + 1, by - 20 + bob, 2, 2);
          // Mouth
          ctx.fillStyle = '#000';
          ctx.fillRect(cx - 2, by - 14 + bob, 4, 1);
        }
        // Arms
        ctx.fillStyle = '#e0e0e0';
        ctx.fillRect(cx - 8, by - 13 + bob, 3, 8);
        ctx.fillRect(cx + 5, by - 13 + bob, 3, 8);
        // Legs
        ctx.fillStyle = '#e0e0e0';
        ctx.fillRect(cx - 4, by - 4 + bob, 3, 4);
        ctx.fillRect(cx + 1, by - 4 + bob, 3, 4);
        break;
      }
      case 'spider': {
        // Body
        ctx.fillStyle = def.color;
        ctx.beginPath();
        ctx.ellipse(cx, by - 6 + bob, w / 3, h / 3, 0, 0, Math.PI * 2);
        ctx.fill();
        // Abdomen
        ctx.beginPath();
        ctx.ellipse(cx, by - 2 + bob, w / 2.5, h / 3, 0, 0, Math.PI * 2);
        ctx.fill();
        if (enemy.state !== 'dead') {
          ctx.fillStyle = '#ff4444';
          ctx.beginPath();
          ctx.arc(cx - 2, by - 8 + bob, 2, 0, Math.PI * 2);
          ctx.arc(cx + 2, by - 8 + bob, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        // Legs (8 legs!)
        ctx.strokeStyle = '#212121';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 4; i++) {
          const angle = (i - 1.5) * 0.4;
          ctx.beginPath();
          ctx.moveTo(cx - 4, by - 5 + bob);
          ctx.lineTo(cx - 10 - i * 2, by - 3 + i * 2 + bob);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(cx + 4, by - 5 + bob);
          ctx.lineTo(cx + 10 + i * 2, by - 3 + i * 2 + bob);
          ctx.stroke();
        }
        break;
      }
      case 'golem': {
        // Body block
        ctx.fillStyle = def.color;
        ctx.fillRect(cx - w / 2 + 2, by - 18 + bob, w - 4, 14);
        // Head
        ctx.fillRect(cx - 6, by - 24 + bob, 12, 8);
        // Crack lines
        ctx.strokeStyle = '#5a6a6a';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(cx - 4, by - 14 + bob);
        ctx.lineTo(cx + 3, by - 8 + bob);
        ctx.stroke();
        if (enemy.state !== 'dead') {
          ctx.fillStyle = '#ffaa00';
          ctx.fillRect(cx - 3, by - 22 + bob, 2, 3);
          ctx.fillRect(cx + 1, by - 22 + bob, 2, 3);
        }
        // Arms
        ctx.fillStyle = '#6a7a7a';
        ctx.fillRect(cx - w / 2 - 2, by - 12 + bob, 4, 10);
        ctx.fillRect(cx + w / 2 - 2, by - 12 + bob, 4, 10);
        // Legs
        ctx.fillStyle = '#5a6a6a';
        ctx.fillRect(cx - 5, by - 4 + bob, 4, 4);
        ctx.fillRect(cx + 1, by - 4 + bob, 4, 4);
        break;
      }
      case 'bat': {
        // Body
        ctx.fillStyle = def.color;
        ctx.beginPath();
        ctx.ellipse(cx, by - 6 + bob, 5, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        if (enemy.state !== 'dead') {
          ctx.fillStyle = '#ff6666';
          ctx.beginPath();
          ctx.arc(cx - 2, by - 7 + bob, 1.5, 0, Math.PI * 2);
          ctx.arc(cx + 2, by - 7 + bob, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
        // Wings
        ctx.fillStyle = '#3a0a6a';
        const wingFlap = Math.sin(performance.now() / 100) * 0.3 + 0.7;
        ctx.beginPath();
        ctx.moveTo(cx, by - 6 + bob);
        ctx.lineTo(cx - 12, by - 10 + bob);
        ctx.lineTo(cx - 10, by - 4 + bob);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx, by - 6 + bob);
        ctx.lineTo(cx + 12, by - 10 + bob);
        ctx.lineTo(cx + 10, by - 4 + bob);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'darkKnight': {
        // Body
        ctx.fillStyle = def.color;
        ctx.fillRect(cx - 6, by - 16 + bob, 12, 12);
        // Armor plates
        ctx.fillStyle = '#2a2a3e';
        ctx.fillRect(cx - 5, by - 12 + bob, 10, 4);
        // Helmet
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(cx - 7, by - 22 + bob, 14, 8);
        // Visor
        if (enemy.state !== 'dead') {
          ctx.fillStyle = '#ff2222';
          ctx.fillRect(cx - 4, by - 18 + bob, 8, 2);
        }
        // Cape
        ctx.fillStyle = '#0d0d1a';
        ctx.fillRect(cx - 5, by - 4 + bob, 10, 4);
        // Sword
        ctx.fillStyle = '#666';
        ctx.fillRect(cx + 8, by - 14 + bob, 2, 10);
        ctx.fillStyle = '#888';
        ctx.fillRect(cx + 7, by - 15 + bob, 4, 2);
        // Legs
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(cx - 5, by - 4 + bob, 4, 4);
        ctx.fillRect(cx + 1, by - 4 + bob, 4, 4);
        break;
      }
      case 'dragon': {
        // Body
        ctx.fillStyle = def.color;
        ctx.beginPath();
        ctx.ellipse(cx, by - 10 + bob, 14, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        // Tail
        ctx.beginPath();
        ctx.moveTo(cx - 14, by - 10 + bob);
        ctx.lineTo(cx - 24, by - 6 + bob);
        ctx.lineTo(cx - 22, by - 12 + bob);
        ctx.closePath();
        ctx.fill();
        // Head
        ctx.fillStyle = '#b71c1c';
        ctx.beginPath();
        ctx.arc(cx + 14, by - 12 + bob, 8, 0, Math.PI * 2);
        ctx.fill();
        if (enemy.state !== 'dead') {
          // Eyes
          ctx.fillStyle = '#ffee00';
          ctx.beginPath();
          ctx.arc(cx + 16, by - 14 + bob, 2.5, 0, Math.PI * 2);
          ctx.arc(cx + 12, by - 14 + bob, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#000';
          ctx.beginPath();
          ctx.arc(cx + 17, by - 14 + bob, 1.5, 0, Math.PI * 2);
          ctx.arc(cx + 13, by - 14 + bob, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
        // Wings
        ctx.fillStyle = '#8b0000';
        const dfWing = Math.sin(performance.now() / 300) * 4;
        ctx.beginPath();
        ctx.moveTo(cx - 2, by - 14 + bob);
        ctx.lineTo(cx - 16, by - 28 + dfWing + bob);
        ctx.lineTo(cx - 8, by - 18 + bob);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx + 2, by - 14 + bob);
        ctx.lineTo(cx + 16, by - 28 + dfWing + bob);
        ctx.lineTo(cx + 8, by - 18 + bob);
        ctx.closePath();
        ctx.fill();
        // Legs
        ctx.fillStyle = '#8b0000';
        ctx.fillRect(cx - 5, by - 3 + bob, 3, 3);
        ctx.fillRect(cx + 2, by - 3 + bob, 3, 3);
        break;
      }
      case 'slimeKing': {
        // Large slime body with crown
        ctx.fillStyle = def.color;
        ctx.beginPath();
        const skBob = Math.sin(performance.now() / 500) * 3;
        ctx.ellipse(cx, by + skBob, w / 2, h / 2.5 + skBob * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        // Crown
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(cx - 8, by - 16 + skBob, 16, 5);
        ctx.fillRect(cx - 10, by - 18 + skBob, 4, 8);
        ctx.fillRect(cx - 2, by - 20 + skBob, 4, 10);
        ctx.fillRect(cx + 6, by - 18 + skBob, 4, 8);
        if (enemy.state !== 'dead') {
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(cx - 5, by - 6 + skBob, 3, 0, Math.PI * 2);
          ctx.arc(cx + 5, by - 6 + skBob, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#000';
          ctx.beginPath();
          ctx.arc(cx - 4, by - 5 + skBob, 1.5, 0, Math.PI * 2);
          ctx.arc(cx + 6, by - 5 + skBob, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'shadowLord': {
        // Shadowy figure
        ctx.fillStyle = def.color;
        ctx.beginPath();
        ctx.moveTo(cx, by - 24 + bob);
        ctx.lineTo(cx + 12, by - 4 + bob);
        ctx.lineTo(cx - 12, by - 4 + bob);
        ctx.closePath();
        ctx.fill();
        // Dark aura
        ctx.fillStyle = 'rgba(10, 10, 40, 0.3)';
        ctx.beginPath();
        ctx.arc(cx, by - 8 + bob, 20, 0, Math.PI * 2);
        ctx.fill();
        if (enemy.state !== 'dead') {
          ctx.fillStyle = '#ff00ff';
          ctx.beginPath();
          ctx.arc(cx - 4, by - 18 + bob, 2.5, 0, Math.PI * 2);
          ctx.arc(cx + 4, by - 18 + bob, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(cx - 4, by - 18 + bob, 1.5, 0, Math.PI * 2);
          ctx.arc(cx + 4, by - 18 + bob, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
        // Cloak
        ctx.fillStyle = '#1a0a2a';
        ctx.beginPath();
        ctx.moveTo(cx - 14, by - 4 + bob);
        ctx.lineTo(cx - 18, by + 2 + bob);
        ctx.lineTo(cx + 18, by + 2 + bob);
        ctx.lineTo(cx + 14, by - 4 + bob);
        ctx.closePath();
        ctx.fill();
        break;
      }
      default: {
        // Fallback: basic shape
        ctx.fillStyle = def.color;
        ctx.fillRect(pos.x, pos.y + bob, w, h);
        if (enemy.state !== 'dead') {
          ctx.fillStyle = '#fff';
          ctx.fillRect(pos.x + 4, pos.y + 4 + bob, 4, 4);
          ctx.fillRect(pos.x + w - 8, pos.y + 4 + bob, 4, 4);
          ctx.fillStyle = '#000';
          ctx.fillRect(pos.x + 5, pos.y + 5 + bob, 2, 2);
          ctx.fillRect(pos.x + w - 7, pos.y + 5 + bob, 2, 2);
        }
      }
    }

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // HP bar
    // HP bar — always visible for alive enemies
    if (enemy.state !== 'dead') {
      const barW = enemy.width + 8;
      const barH = 3;
      const hpRatio = enemy.hp / enemy.maxHp;
      const barX = cx - barW / 2;
      const barY = by - 28 + bob;

      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

      ctx.fillStyle = '#333';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = hpRatio > 0.5 ? '#4caf50' : hpRatio > 0.25 ? '#ff9800' : '#f44336';
      ctx.fillRect(barX, barY, barW * hpRatio, barH);
    }

    // Level indicator
    if (enemy.state !== 'dead') {
      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = '#ffcc00';
      ctx.textAlign = 'center';
      ctx.fillText(`Lv.${def.level}`, cx, by - 32 + bob);
      ctx.textAlign = 'left';
    }

    ctx.globalAlpha = 1;
  }

  private drawPlayer(): void {
    const { ctx, camera } = this;
    const { player } = this.state;
    const pos = camera.worldToScreen(player.x, player.y);
    const pScale = 1.4;
    const pw = PLAYER_SIZE * pScale;
    const ph = PLAYER_SIZE * pScale;
    const ox = pos.x - (pw - PLAYER_SIZE) / 2;
    const oy = pos.y - (ph - PLAYER_SIZE) / 2;

    // Walking bob
    const bobPhase = player.isAttacking ? 0 : Math.sin(performance.now() / 150 * (Math.abs(player.facing.x) + Math.abs(player.facing.y) || 1)) * 1.5;
    const bob = (player.facing.x !== 0 || player.facing.y !== 0) ? bobPhase : 0;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(ox + pw / 2, oy + ph - 2, pw / 2 - 2, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Flash when invincible
    if (player.invincibleTimer > 0 && Math.floor(player.invincibleTimer * 10) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    const cx = ox + pw / 2;
    const by = oy + ph - (2 + bob); // body bottom
    const headY = by - 16;
    const bodyTop = by - 12;

    // Legs (walking cycle)
    const legSwing = bob * 0.15;
    ctx.fillStyle = '#3a5a8a';
    ctx.fillRect(cx - 5 + legSwing, by - 4, 3, 4);
    ctx.fillRect(cx + 2 - legSwing, by - 4, 3, 4);

    const tool = this.getCurrentItem();
    const weaponType = tool?.toolType ?? 'none';
    const isBowWeapon = weaponType === 'bow';

    // Arms — different poses per weapon during attack
    const attackProgress = player.isAttacking ? (1 - player.attackTimer / 0.4) : 0; // 0..1
    const attackPhase = player.isAttacking ? Math.sin(attackProgress * Math.PI) : 0;

    ctx.fillStyle = '#ffcc99';

    if (player.isAttacking && isBowWeapon) {
      // ── Bow pose: both arms extended forward ──
      // Left arm (holding bow) — extended forward
      ctx.save();
      ctx.translate(cx - 7, bodyTop + 1);
      ctx.rotate(-0.6 + attackPhase * 0.2);
      ctx.fillRect(0, 0, 3, 9);
      ctx.restore();
      // Right arm (pulling string) — drawn back
      ctx.save();
      ctx.translate(cx + 5, bodyTop + 1);
      ctx.rotate(0.6 - attackPhase * 0.3);
      ctx.fillRect(0, 0, 3, 9);
      ctx.restore();
    } else if (player.isAttacking && (weaponType === 'axe' || weaponType === 'pickaxe')) {
      // ── Overhead chop pose: both arms raised ──
      const chopPhase = attackProgress * 2; // 0..2 (up then down)
      const armAngle = chopPhase < 1
        ? -1.2 * chopPhase        // raising arms
        : -1.2 + 2.0 * (chopPhase - 1); // bringing down
      ctx.save();
      ctx.translate(cx - 6, bodyTop + 2);
      ctx.rotate(armAngle - 0.2);
      ctx.fillRect(0, 0, 3, 8);
      ctx.restore();
      ctx.save();
      ctx.translate(cx + 4, bodyTop + 2);
      ctx.rotate(-armAngle + 0.2);
      ctx.fillRect(0, 0, 3, 8);
      ctx.restore();
    } else {
      // ── Default pose ──
      const armSwing = player.isAttacking ? 0.3 : bob * 0.1;
      // Left arm
      ctx.save();
      ctx.translate(cx - 7, bodyTop + 2);
      ctx.rotate(-0.2 + armSwing);
      ctx.fillRect(0, 0, 3, 8);
      ctx.restore();
      // Right arm
      ctx.save();
      ctx.translate(cx + 4, bodyTop + 2);
      ctx.rotate(0.2 - armSwing);
      ctx.fillRect(0, 0, 3, 8);
      ctx.restore();
    }

    // Body / Torso
    ctx.fillStyle = '#2196f3';
    const bodyW = 12;
    ctx.fillRect(cx - bodyW / 2, bodyTop, bodyW, 10);

    // Belt
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(cx - bodyW / 2, bodyTop + 8, bodyW, 2);

    // Chest armor if equipped
    if (player.equipment.chest) {
      ctx.fillStyle = '#7a7a7a';
      ctx.fillRect(cx - bodyW / 2 - 1, bodyTop - 1, bodyW + 2, 12);
      ctx.strokeStyle = '#5a5a5a';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(cx - bodyW / 2 - 1, bodyTop - 1, bodyW + 2, 12);
    }

    // Head
    ctx.fillStyle = '#ffcc99';
    ctx.beginPath();
    ctx.arc(cx, headY + 4, 6, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = '#5d4037';
    ctx.beginPath();
    ctx.arc(cx, headY + 1, 6, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(cx - 6, headY, 12, 2);

    // Eyes based on facing direction
    ctx.fillStyle = '#000';
    const eyeDir = player.facing.x > 0.3 ? 2 : player.facing.x < -0.3 ? -2 : 0;
    const eyeY = headY + 3;
    ctx.fillRect(cx - 3 + eyeDir, eyeY, 2, 2);
    ctx.fillRect(cx + 1 + eyeDir, eyeY, 2, 2);

    // Helmet if equipped
    if (player.equipment.helmet) {
      ctx.fillStyle = '#666';
      ctx.beginPath();
      ctx.arc(cx, headY + 0.5, 6.5, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(cx - 6.5, headY - 2, 13, 3);
      ctx.fillStyle = '#888';
      ctx.fillRect(cx - 4, headY - 4, 8, 3);
    }

    // Boots if equipped
    if (player.equipment.boots) {
      ctx.fillStyle = '#5a3a1a';
      ctx.fillRect(cx - 6, by - 3, 5, 3);
      ctx.fillRect(cx + 1, by - 3, 5, 3);
    }

    // ── Weapon & Attack Animation ──
    if (player.isAttacking) {
      const swingAngle = attackProgress * Math.PI * 0.8 - 0.4; // -0.4 to +1.2 rad

      if (isBowWeapon) {
        // ═══ Bow Draw Animation ═══
        const drawPull = attackPhase; // 0..1..0 pull and release
        const bowHeight = 18;
        const bowWidth = 8;

        ctx.save();
        ctx.translate(cx + player.facing.x * 4, bodyTop + 2);

        // Bow body (curved arc mirroring facing direction)
        ctx.strokeStyle = '#5d4037';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        const bowArcStart = player.facing.x < -0.3 ? Math.PI * 0.3 : -Math.PI * 0.3;
        const bowArcEnd = player.facing.x < -0.3 ? -Math.PI * 0.3 : Math.PI * 0.3;
        if (player.facing.y < -0.5) {
          ctx.arc(0, 2, bowHeight / 2, -Math.PI * 0.6, Math.PI * 0.6);
        } else {
          ctx.arc(0, 2, bowHeight / 2, bowArcStart, bowArcEnd);
        }
        ctx.stroke();

        // Bowstring (flip string side based on facing)
        ctx.strokeStyle = '#c4a862';
        ctx.lineWidth = 1;
        const stringPull = drawPull * 5;
        const strSide = player.facing.x < -0.3 ? 2 : -2; // string on opposite side of bow
        ctx.beginPath();
        ctx.moveTo(strSide, -bowHeight / 2 + 2);
        ctx.lineTo(strSide + (player.facing.x < -0.3 ? stringPull : -stringPull), 2);
        ctx.lineTo(strSide, bowHeight / 2 + 2);
        ctx.stroke();

        // Arrow nocked on string
        if (drawPull > 0.1) {
          const arrowDir = player.facing.x < -0.3 ? -1 : 1;
          ctx.strokeStyle = '#8B4513';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          const strPullX = strSide + (player.facing.x < -0.3 ? stringPull : -stringPull);
          ctx.moveTo(strPullX, 2);
          ctx.lineTo(strPullX + arrowDir * 10, 2);
          ctx.stroke();
          // Arrowhead
          ctx.fillStyle = '#ddd';
          ctx.beginPath();
          const ahX = strPullX + arrowDir * 10;
          ctx.moveTo(ahX, 2);
          ctx.lineTo(ahX - arrowDir * 3, 0);
          ctx.lineTo(ahX - arrowDir * 3, 4);
          ctx.closePath();
          ctx.fill();
        }

        ctx.restore();
      } else if (weaponType === 'sword') {
        // ═══ Sword Swing Animation ═══
        const swordLen = 16;
        const bladeWidth = 3;

        ctx.save();
        ctx.translate(cx + player.facing.x * 2, bodyTop + 2);
        ctx.rotate(swingAngle);

        // Sword handle
        ctx.fillStyle = '#5a3a1a';
        ctx.fillRect(-1, -2, 3, 6);
        // Crossguard
        ctx.fillStyle = '#888';
        ctx.fillRect(-3, -3, 7, 2);
        // Blade
        ctx.fillStyle = '#ccc';
        ctx.fillRect(-1, -18, bladeWidth, 15);
        // Blade shine
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fillRect(0, -18, 1, 15);
        // Tip
        ctx.beginPath();
        ctx.moveTo(-1, -18);
        ctx.lineTo(bladeWidth, -18);
        ctx.lineTo(1, -22);
        ctx.closePath();
        ctx.fill();

        ctx.restore();

        // Wide swing arc trail
        ctx.strokeStyle = 'rgba(200,230,255,0.25)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        const arcStart = swingAngle - 0.3;
        const arcEnd = swingAngle + 0.8;
        ctx.arc(cx + player.facing.x * 4, bodyTop + 6, 16, arcStart, arcEnd);
        ctx.stroke();

        // Sparkle particles on arc
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        for (let i = 0; i < 3; i++) {
          const a = arcStart + (arcEnd - arcStart) * (i / 3);
          const sx = cx + player.facing.x * 4 + Math.cos(a) * 16;
          const sy = bodyTop + 6 + Math.sin(a) * 16;
          ctx.beginPath();
          ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (weaponType === 'axe') {
        // ═══ Axe Overhead Chop ═══
        const chopSwing = swingAngle * 0.8;
        const handleLen = 14;

        ctx.save();
        ctx.translate(cx + player.facing.x * 4, bodyTop + 4);
        ctx.rotate(-0.8 + chopSwing);

        // Handle
        ctx.fillStyle = '#6d4e3a';
        ctx.fillRect(-1.5, -handleLen, 3, handleLen);
        // Axe head
        ctx.fillStyle = '#888';
        ctx.beginPath();
        ctx.moveTo(-5, -handleLen);
        ctx.lineTo(5, -handleLen);
        ctx.lineTo(5, -handleLen - 6);
        ctx.lineTo(0, -handleLen - 8);
        ctx.lineTo(-5, -handleLen - 6);
        ctx.closePath();
        ctx.fill();
        // Edge highlight
        ctx.fillStyle = '#aaa';
        ctx.fillRect(-4, -handleLen - 5, 2, 4);

        ctx.restore();

        // Chop trail
        ctx.strokeStyle = 'rgba(255,200,150,0.2)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        const chopArc = -0.8 + chopSwing;
        ctx.arc(cx + player.facing.x * 4, bodyTop + 16, 14, chopArc - 0.2, chopArc + 0.4);
        ctx.stroke();
      } else if (weaponType === 'pickaxe') {
        // ═══ Pickaxe Overhead Jab ═══
        const jabSwing = swingAngle * 0.6;

        ctx.save();
        ctx.translate(cx + player.facing.x * 6, bodyTop + 3);
        ctx.rotate(-0.3 + jabSwing);

        // Handle
        ctx.fillStyle = '#6d4e3a';
        ctx.fillRect(-1.5, -16, 3, 16);
        // Pick head
        ctx.fillStyle = '#666';
        ctx.beginPath();
        ctx.moveTo(-2, -16);
        ctx.lineTo(4, -12);
        ctx.lineTo(3, -8);
        ctx.lineTo(-3, -12);
        ctx.closePath();
        ctx.fill();
        // Pick point
        ctx.fillStyle = '#999';
        ctx.beginPath();
        ctx.moveTo(4, -12);
        ctx.lineTo(7, -14);
        ctx.lineTo(4, -10);
        ctx.closePath();
        ctx.fill();

        ctx.restore();

        // Jab trail
        ctx.strokeStyle = 'rgba(180,180,180,0.15)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, bodyTop + 6);
        ctx.lineTo(cx + player.facing.x * 20, bodyTop + 2);
        ctx.stroke();
      } else {
        // ═══ Generic Tool Swing ═══
        ctx.save();
        ctx.translate(cx + 4, bodyTop + 3);
        ctx.rotate(1.2 + attackPhase * 0.5);
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(-1, -10, 2, 12);
        ctx.restore();

        // Small arc
        ctx.strokeStyle = 'rgba(200,200,200,0.15)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx + player.facing.x * 8, bodyTop + 4, 10, -0.3, 0.6);
        ctx.stroke();
      }
    }

    ctx.globalAlpha = 1;
  }

  private getBiomeGrassColor(biome: Biome): string {
    const colors: Record<string, string> = {
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
    return colors[biome] || '#5a9a4a';
  }

  private varyColor(hex: string, amount: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const v = (Math.random() - 0.5) * amount * 255;
    return `#${clamp(r + v, 0, 255).toString(16).padStart(2, '0')}${clamp(g + v, 0, 255).toString(16).padStart(2, '0')}${clamp(b + v, 0, 255).toString(16).padStart(2, '0')}`;
  }

  private getNightAlpha(time: GameTime): number {
    const progress = time.dayTicks / time.dayLength;
    if (progress < 0.2) return 0.6;
    if (progress < 0.3) return 0.6 * (1 - (progress - 0.2) / 0.1);
    if (progress < 0.7) return 0;
    if (progress < 0.8) return 0.6 * ((progress - 0.7) / 0.1);
    return 0.6;
  }

  private weatherParticles: { x: number; y: number; speed: number; size: number; opacity: number; wind: number }[] = [];
  private weatherInit = false;
  private stormFlashTimer = 0;
  private stormFlashVisible = 0;

  private drawWeather(): void {
    const { ctx, canvas } = this;
    const gameTime = this.state.gameTime;
    const weather = gameTime.weather;
    const now = performance.now();

    // Initialize weather particles once
    if (!this.weatherInit) {
      this.weatherParticles = [];
      for (let i = 0; i < 120; i++) {
        this.weatherParticles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          speed: 100 + Math.random() * 200,
          size: 2 + Math.random() * 3,
          opacity: 0.2 + Math.random() * 0.5,
          wind: -20 + Math.random() * 15,
        });
      }
      this.weatherInit = true;
    }

    if (weather === Weather.Rain || weather === Weather.HeavyRain) {
      const intensity = weather === Weather.HeavyRain ? 1 : 0.5;
      ctx.lineWidth = 1.5;
      for (const p of this.weatherParticles) {
        // Update rain streak position
        p.x += p.wind * 0.05;
        p.y += p.speed * 0.05;
        if (p.y > canvas.height) { p.y = -10; p.x = Math.random() * canvas.width; }
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;

        ctx.strokeStyle = `rgba(150, 180, 255, ${p.opacity * intensity})`;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - 2 + p.wind * 0.3, p.y + 12);
        ctx.stroke();
      }
      // Splash effect on ground
      ctx.fillStyle = 'rgba(150, 180, 255, 0.05)';
      for (const p of this.weatherParticles) {
        if (p.y > canvas.height - 40 && Math.random() < 0.1) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    if (weather === Weather.Fog) {
      // Layered fog
      const fogLayers = [
        { color: 'rgba(180, 190, 200, 0.06)', speed: 5 },
        { color: 'rgba(190, 200, 210, 0.04)', speed: 3 },
      ];
      for (const layer of fogLayers) {
        ctx.fillStyle = layer.color;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      // Moving fog patches
      for (const p of this.weatherParticles.slice(0, 20)) {
        p.x += 0.3;
        if (p.x > canvas.width + 50) p.x = -50;
        ctx.fillStyle = `rgba(200, 210, 220, ${p.opacity * 0.08})`;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, 60 + p.size * 10, 20 + p.size * 5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (weather === Weather.Snow) {
      for (const p of this.weatherParticles) {
        p.x += Math.sin(now / 1000 + p.x) * 0.3;
        p.y += p.speed * 0.02;
        if (p.y > canvas.height) { p.y = -5; p.x = Math.random() * canvas.width; }

        ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity * 0.8})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Storm/HeavyRain: lightning flashes
    if (weather === Weather.Storm || weather === Weather.HeavyRain) {
      this.stormFlashTimer -= 1;
      if (this.stormFlashTimer <= 0) {
        this.stormFlashTimer = 300 + Math.random() * 600; // 5-15 seconds between flashes
        this.stormFlashVisible = 3; // Visible for 3 frames
      }
      if (this.stormFlashVisible > 0) {
        this.stormFlashVisible--;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }

  private drawFarmPlot(plot: { x: number; y: number; seedId: string | null; growthStage: number; growthProgress: number; watered: boolean }): void {
    const { ctx, camera } = this;
    const pos = camera.worldToScreen(plot.x * TILE_SIZE, plot.y * TILE_SIZE);

    // Soil base
    ctx.fillStyle = plot.watered ? '#5a3a1a' : '#8d6e4a';
    ctx.fillRect(pos.x + 2, pos.y + 2, TILE_SIZE - 4, TILE_SIZE - 4);

    // Grid lines
    ctx.strokeStyle = '#6d4e3a';
    ctx.lineWidth = 0.5;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(pos.x + 2 + i * 7, pos.y + 2);
      ctx.lineTo(pos.x + 2 + i * 7, pos.y + TILE_SIZE - 2);
      ctx.stroke();
    }

    // Plant growth
    if (plot.seedId && plot.growthStage > 0) {
      const stageColors = ['#4a7a2a', '#5a9a3a', '#6ab040', '#8ac050'];
      const stageSizes = [4, 6, 8, 10];
      const stage = Math.min(plot.growthStage, 3);
      const size = stageSizes[stage];
      const color = stageColors[stage];

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(pos.x + TILE_SIZE / 2, pos.y + TILE_SIZE / 2, size, 0, Math.PI * 2);
      ctx.fill();

      // Ready indicator
      if (plot.growthStage >= 3) {
        ctx.fillStyle = '#ffdd00';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('✓', pos.x + TILE_SIZE / 2, pos.y - 2);
        ctx.textAlign = 'left';
      }
    }

    // Watered indicator
    if (plot.watered) {
      ctx.fillStyle = 'rgba(100, 150, 255, 0.3)';
      ctx.fillRect(pos.x + 2, pos.y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
    }
  }

  private drawStructure(struct: { itemId: string; x: number; y: number; width: number; height: number }): void {
    const { ctx, camera } = this;
    const pos = camera.worldToScreen(struct.x, struct.y);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(pos.x + 16, pos.y + 30, 14, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    switch (struct.itemId) {
      case 'workbench':
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(pos.x + 4, pos.y + 12, 24, 16);
        ctx.fillStyle = '#A0522D';
        ctx.fillRect(pos.x + 6, pos.y + 14, 20, 12);
        // Tools on top
        ctx.fillStyle = '#888';
        ctx.fillRect(pos.x + 10, pos.y + 8, 2, 6);
        ctx.fillRect(pos.x + 18, pos.y + 8, 2, 6);
        break;
      case 'furnace':
        ctx.fillStyle = '#555';
        ctx.fillRect(pos.x + 6, pos.y + 8, 20, 20);
        ctx.fillStyle = '#333';
        ctx.fillRect(pos.x + 8, pos.y + 12, 16, 14);
        // Fire
        ctx.fillStyle = '#ff6600';
        ctx.fillRect(pos.x + 12, pos.y + 16, 8, 6);
        ctx.fillStyle = '#ffaa00';
        ctx.fillRect(pos.x + 14, pos.y + 14, 4, 4);
        break;
      case 'chest':
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(pos.x + 6, pos.y + 10, 20, 18);
        ctx.fillStyle = '#A0522D';
        ctx.fillRect(pos.x + 6, pos.y + 18, 20, 2);
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(pos.x + 14, pos.y + 16, 4, 4);
        break;
      case 'fence':
        ctx.fillStyle = '#8B6914';
        ctx.fillRect(pos.x + 4, pos.y + 8, 4, 20);
        ctx.fillRect(pos.x + 24, pos.y + 8, 4, 20);
        ctx.fillRect(pos.x + 4, pos.y + 14, 24, 3);
        ctx.fillRect(pos.x + 4, pos.y + 22, 24, 3);
        break;
      case 'torch_item':
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(pos.x + 14, pos.y + 12, 4, 18);
        ctx.fillStyle = '#ff6600';
        ctx.beginPath();
        ctx.arc(pos.x + 16, pos.y + 10, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffaa00';
        ctx.beginPath();
        ctx.arc(pos.x + 16, pos.y + 8, 3, 0, Math.PI * 2);
        ctx.fill();
        break;
      default:
        ctx.fillStyle = '#666';
        ctx.fillRect(pos.x + 4, pos.y + 4, struct.width - 8, struct.height - 8);
        break;
    }
  }

  // ── Public API for UI ───────────────────────────────────────────
  setActivePanel(panel: PanelType): void {
    this.ui.activePanel = panel;
  }

  setCraftingCategory(cat: ItemCategory): void {
    this.ui.craftingCategory = cat;
  }

  toggleMap(): void {
    this.ui.showMap = !this.ui.showMap;
  }

  closeMap(): void {
    this.ui.showMap = false;
  }

  equipItem(slotIndex: number, from: 'hotbar' | 'inventory'): boolean {
    const sourceSlots = from === 'hotbar' ? this.state.player.hotbar : this.state.player.inventory;
    const slot = sourceSlots[slotIndex];
    if (!slot?.item) return false;

    const item = slot.item;

    // Determine equipment slot
    let equipSlot: 'helmet' | 'chest' | 'boots' | 'gloves' | 'ring' | 'amulet' | 'weapon' | 'tool' | null = null;

    if (item.toolType === 'sword' || item.toolType === 'bow') {
      equipSlot = 'weapon';
    } else if (item.toolType) {
      equipSlot = 'tool';
    } else if (item.armorSlot) {
      equipSlot = item.armorSlot;
    }

    if (!equipSlot) return false;

    // Swap
    const current = this.state.player.equipment[equipSlot];
    this.state.player.equipment[equipSlot] = { ...slot, count: 1 };
    slot.count--;
    if (slot.count <= 0) {
      slot.item = null;
      slot.durability = undefined;
    }

    // Put old item back
    if (current?.item) {
      this.addToInventory(current.item.id, 1);
    }

    this.addNotification(`Equipou ${item.name}`, 'info');
    return true;
  }

  unequipItem(equipSlot: keyof typeof this.state.player.equipment): boolean {
    const slot = this.state.player.equipment[equipSlot];
    if (!slot?.item) return false;

    if (this.addToInventory(slot.item.id, 1)) {
      this.state.player.equipment[equipSlot] = null;
      return true;
    }

    return false;
  }

  moveToHotbar(inventoryIndex: number, hotbarIndex: number): void {
    const invSlot = this.state.player.inventory[inventoryIndex];
    const hbSlot = this.state.player.hotbar[hotbarIndex];

    this.state.player.inventory[inventoryIndex] = hbSlot;
    this.state.player.hotbar[hotbarIndex] = invSlot;
  }

  // ── Drag-and-Drop: swap two inventory slots ─────────────────────
  swapSlots(from: { pool: 'inventory' | 'hotbar' | 'equipment'; index: string | number }, to: { pool: 'inventory' | 'hotbar' | 'equipment'; index: string | number }): boolean {
    const getSlot = (pool: string, index: string | number): InventorySlot | null => {
      if (pool === 'inventory') return this.state.player.inventory[index as number];
      if (pool === 'hotbar') return this.state.player.hotbar[index as number];
      if (pool === 'equipment') return this.state.player.equipment[index as keyof typeof this.state.player.equipment];
      return null;
    };
    const setSlot = (pool: string, index: string | number, slot: InventorySlot | null): void => {
      if (pool === 'inventory') this.state.player.inventory[index as number] = slot!;
      else if (pool === 'hotbar') this.state.player.hotbar[index as number] = slot!;
      else if (pool === 'equipment') (this.state.player.equipment as any)[index] = slot;
    };

    const fromSlot = getSlot(from.pool, from.index);
    const toSlot = getSlot(to.pool, to.index);
    if (!fromSlot || !toSlot) return false;

    // If both have same item id, try to stack
    if (fromSlot.item && toSlot.item && fromSlot.item.id === toSlot.item.id) {
      const maxStack = fromSlot.item.stackSize;
      const canAdd = maxStack - toSlot.count;
      if (canAdd > 0) {
        const transfer = Math.min(fromSlot.count, canAdd);
        toSlot.count += transfer;
        fromSlot.count -= transfer;
        if (fromSlot.count <= 0) {
          fromSlot.item = null;
          fromSlot.durability = undefined;
        }
        return true;
      }
    }

    // Otherwise, swap the slots
    const tempItem = fromSlot.item;
    const tempCount = fromSlot.count;
    const tempDurability = fromSlot.durability;

    fromSlot.item = toSlot.item;
    fromSlot.count = toSlot.count;
    fromSlot.durability = toSlot.durability;

    toSlot.item = tempItem;
    toSlot.count = tempCount;
    toSlot.durability = tempDurability;

    return true;
  }

  // ── Equip from inventory (drag to equipment slot) ────────────────
  equipFromInventory(inventoryIndex: number, equipSlot: string): boolean {
    const invSlot = this.state.player.inventory[inventoryIndex];
    if (!invSlot?.item) return false;

    const item = invSlot.item;
    const validEquipSlot = this.getValidEquipSlot(item);
    if (!validEquipSlot || validEquipSlot !== equipSlot) return false;

    return this.swapSlots(
      { pool: 'inventory', index: inventoryIndex },
      { pool: 'equipment', index: equipSlot }
    );
  }

  // ── Get valid equipment slot for an item ─────────────────────────
  getValidEquipSlot(item: ItemDefinition): string | null {
    if (item.toolType === 'sword' || item.toolType === 'bow') return 'weapon';
    if (item.toolType) return 'tool';
    if (item.armorSlot) return item.armorSlot;
    return null;
  }



}

function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}
