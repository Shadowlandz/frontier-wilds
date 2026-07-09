// ═══════════════════════════════════════════════════════════════════
// Farm Survival - Main Game Engine
// ═══════════════════════════════════════════════════════════════════

import {
  GameState, PlayerState, WorldState, GameTime, InventorySlot,
  Vec2, TileType, TILE_SIZE, PLAYER_SPEED, PLAYER_SIZE, DAY_LENGTH,
  TICK_RATE, INTERACT_RANGE, ATTACK_RANGE, PanelType,
  Weather, Season, Biome, EnemyEntity, NpcEntity, DroppedItem,
  DamageNumber, Particle, ParticleEffectType, GameUIState, Notification, ItemCategory,
  Rarity, ItemDefinition, WORLD_WIDTH, WORLD_HEIGHT, PlayerAttributes,
  EnemyType, SafeZone, StorageChest, PlacedStructure,
  generateItemAffixes, computeItemPowerScore, getAffixedItemName, getAffixSlotTypes, ACHIEVEMENTS, AchievementProgress,
} from './core/Types';
import { getAmbientLightLevel, getDayNightColor, getInteriorLight } from './core/Types';
import { Input } from './core/Input';
import { Camera } from './core/Camera';
import {
  clamp, distance, normalize, scaleVec, generateId,
  SeededRandom, fractalNoise, darkenColor,
} from './core/Utils';
import { WorldGenerator, TILE_COLORS, BIOME_DETAIL_COLORS, getSkyColor, getSeasonTint, getSeasonForDay, getCaveSkyColor } from './world/WorldGenerator';
import type { CaveData, DecorationDef } from './world/WorldGenerator';
import { getItem } from './data/Items';
import { RECIPES } from './data/Recipes';
import { ENEMIES } from './data/Enemies';
import { NPCS } from './data/Npcs';
import { getQuestById } from './data/Quests';
import { SKILLS } from './data/Skills';
import { saveGame, loadGame, loadAutoSave, autoSave } from './systems/SaveSystem';
import { AudioEngine } from './core/AudioEngine';

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
  ambientParticles: Particle[] = [];
  ambientParticleTimer = 0;
  npcBlinkTimer = 2 + Math.random() * 3;
  npcBlinkDuration = 0;
  npcIsBlinking = false;

  // ── Achievement tracking ──
  achievementStats = {
    enemiesKilled: 0,
    woodGathered: 0,
    oreGathered: 0,
    cropsHarvested: 0,
    itemsCrafted: 0,
    goldEarned: 0,
    daysSurvived: 0,
    biomesDiscovered: 0,
    hasEnteredCave: false,
    hasBuiltHouse: false,
    hasDied: false,
    fishCaught: 0,
    structuresBuilt: 0,
    totalXpGained: 0,
  };
  achievementQueue: string[] = []; // IDs of newly unlocked achievements to show as popups
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

  /** Procedural audio engine */
  audio: AudioEngine;

  constructor() {
    this.input = new Input();
    this.camera = new Camera();
    this.audio = new AudioEngine();
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
        hp: Math.floor(def.hp * (1 + (0) * 0.02)),
        maxHp: Math.floor(def.hp * (1 + (0) * 0.02)),
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
      achievements: ACHIEVEMENTS.map(a => ({ id: a.id, unlocked: false, unlockedAt: 0 })),
      skills: {},
      structures: [],
      safeZones: [],
      storageChests: [],
      activeStorageChestId: null,
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

    // Create village safe zone (NPC area — enemies won't enter)
    const villageZone: SafeZone = {
      centerX: cx,
      centerY: cy,
      radius: 18,
      structureId: 'village_default',
    };
    this.state.safeZones.push(villageZone);

    // Give starting items
    this.addToInventory('wood_axe', 1);
    this.addToInventory('wood_pickaxe', 1);
    this.addToInventory('wood_sword', 1);
    this.addToInventory('apple', 10);
    this.addToInventory('torch', 5);

    this.addNotification('Bem-vindo ao Farm Survival! Use WASD para mover.', 'info');
    this.addNotification('🔊 Pressione M no menu de saves para mutar sons.', 'info');
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
      this.updateAmbientParticles(dt);
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
    this.checkAchievements();
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
      const opening_inv = this.ui.activePanel !== 'inventory';
      this.ui.activePanel = this.ui.activePanel === 'inventory' ? 'none' : 'inventory';
      if (opening_inv && this.ui.activePanel === 'inventory') this.audio.playUIOpen();
      else if (!opening_inv) this.audio.playUIClose();
    }

    // C for crafting
    if (input.isKeyPressed('c')) {
      const opening_craft = this.ui.activePanel !== 'crafting';
      this.ui.activePanel = this.ui.activePanel === 'crafting' ? 'none' : 'crafting';
      if (opening_craft && this.ui.activePanel === 'crafting') this.audio.playUIOpen();
      else if (!opening_craft) this.audio.playUIClose();
    }

    // K for skills
    if (input.isKeyPressed('k')) {
      const opening_skill = this.ui.activePanel !== 'skills';
      this.ui.activePanel = this.ui.activePanel === 'skills' ? 'none' : 'skills';
      if (opening_skill && this.ui.activePanel === 'skills') this.audio.playUIOpen();
      else if (!opening_skill) this.audio.playUIClose();
    }

    // L for achievements
    if (input.isKeyPressed('l')) {
      const opening_ach = this.ui.activePanel !== 'achievements';
      this.ui.activePanel = this.ui.activePanel === 'achievements' ? 'none' : 'achievements';
      if (opening_ach && this.ui.activePanel === 'achievements') this.audio.playUIOpen();
      else if (!opening_ach) this.audio.playUIClose();
    }

    // J for quests
    if (input.isKeyPressed('j')) {
      const opening_quest = this.ui.activePanel !== 'quests';
      this.ui.activePanel = this.ui.activePanel === 'quests' ? 'none' : 'quests';
      if (opening_quest && this.ui.activePanel === 'quests') this.audio.playUIOpen();
      else if (!opening_quest) this.audio.playUIClose();
    }

    // M for map
    if (input.isKeyPressed('m')) {
      this.ui.showMap = !this.ui.showMap;
    }

    // N for minimap toggle
    if (input.isKeyPressed('n')) {
      this.state.settings.showMinimap = !this.state.settings.showMinimap;
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
      // Determine surface for footsteps
      const footX = Math.floor((player.x + PLAYER_SIZE / 2) / TILE_SIZE);
      const footY = Math.floor((player.y + PLAYER_SIZE / 2) / TILE_SIZE);
      const worldTileW = this.inCave && this.caveData ? this.caveData.tileMap[0].length : WORLD_WIDTH;
      const worldTileH = this.inCave && this.caveData ? this.caveData.tileMap.length : WORLD_HEIGHT;
      const tileMap = this.inCave && this.caveData ? this.caveData.tileMap : this.tileMap;
            const footTile = (footY >= 0 && footY < worldTileH && footX >= 0 && footX < worldTileW)
        ? tileMap[footY][footX]
        : 0;
      const isRunning = (this.input.isKeyDown('shift') || this.input.isKeyDown('control'));
      this.audio.updateFootsteps(true, isRunning, this.getSurfaceName(footTile), dt);
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

    // 1.5 Harvest ready crops with E (interact key)
    if (!this.inCave) {
      const tileX = Math.floor((px + player.facing.x * 16) / TILE_SIZE);
      const tileY = Math.floor((py + player.facing.y * 16) / TILE_SIZE);
      const harvestPlot = this.state.farmPlots.find(p => p.x === tileX && p.y === tileY && p.seedId && p.growthStage >= 3);
      if (harvestPlot) {
        const plotIndex = this.state.farmPlots.findIndex(p => p === harvestPlot);
        if (plotIndex >= 0) {
          // Inline harvest logic to avoid duplicating harvestPlot
          const plot = this.state.farmPlots[plotIndex];
          const seedToCrop: Record<string, string> = {
            wheat_seed: 'wheat',
            carrot_seed: 'carrot',
            potato_seed: 'potato',
            berry_seed: 'berry',
            pumpkin_seed: 'pumpkin',
          };
          const cropId = seedToCrop[plot.seedId!];
          if (cropId) {
            const harvestCount = 2 + Math.floor(Math.random() * 3) + Math.floor(this.state.player.stats.farming / 5);
            if (this.addToInventory(cropId, harvestCount)) {
              this.gainXp(10 + Math.floor(this.state.player.stats.farming * 2));
              this.updateQuestProgress('farm', cropId);
              this.achievementStats.cropsHarvested += harvestCount;
              this.spawnParticles(tileX * TILE_SIZE + TILE_SIZE / 2, tileY * TILE_SIZE + TILE_SIZE / 2, '#ffcc44', 6, 'harvest', { spread: 100, speed: 80, sizeRange: [2, 5], lifeRange: [0.4, 0.8] });
              this.spawnParticles(tileX * TILE_SIZE + TILE_SIZE / 2, tileY * TILE_SIZE + TILE_SIZE / 2, '#4a8a3a', 5, 'leaf', { spread: 80, speed: 60, sizeRange: [3, 5], lifeRange: [0.5, 0.9] });
              this.audio.playHarvest();
              this.addNotification(`+${harvestCount} ${getItem(cropId)?.name || cropId} colhido!`, 'item');
            } else {
              this.addNotification('Inventário cheio!', 'warning');
            }
            // Reset plot regardless
            plot.seedId = null;
            plot.growthStage = 0;
            plot.growthProgress = 0;
            plot.watered = false;
          }
          return;
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
        // Generate affixes for equippable items dropped by enemies
        const added = this.addToInventory(di.itemId, di.count, true);
        if (added) {
          this.droppedItems.splice(i, 1);
        }
        return;
      }
    }

    // 3. Try to open nearby storage chest
    if (this.toggleStorageChest()) return;

    // 4. Eat/drink current hotbar item
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
    this.achievementStats.hasEnteredCave = true;
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
      this.audio.playError();
      this.addNotification('Use um machado para cortar!', 'warning');
      return;
    }
    if (isOre && tool?.toolType !== 'pickaxe' && tool?.toolType !== 'hammer') {
      this.audio.playError();
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

    // Play gather sound
    if (isOre) {
      this.audio.playMineStone();
    } else if (isVegetation) {
      this.audio.playChopWood();
    }

    // Particles based on resource type
    const particleColor = this.resourceColors[res.type] || '#8B4513';
    if (isVegetation) {
      // Wood chips and leaves
      this.spawnParticles(res.x + 10, res.y + 15, '#6b4423', 3, 'wood_chip', { spread: 80, speed: 60, sizeRange: [2, 4] });
      this.spawnParticles(res.x + 10, res.y + 10, '#4a8a3a', 2, 'leaf', { spread: 60, speed: 40, sizeRange: [3, 5], lifeRange: [0.4, 0.7] });
    } else if (isOre) {
      // Sparks and dust for mining
      this.spawnParticles(res.x + 10, res.y + 10, '#ffcc44', 5, 'spark', { spread: 100, speed: 90, sizeRange: [1, 3], lifeRange: [0.3, 0.6] });
      this.spawnParticles(res.x + 10, res.y + 10, particleColor, 3, 'dust', { spread: 60, speed: 40, sizeRange: [3, 6], lifeRange: [0.5, 1.0] });
    } else {
      this.spawnParticles(res.x + 10, res.y + 10, particleColor, 4);
    }

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
        this.audio.playError();
    this.addNotification('Inventário cheio!', 'warning');
        res.hp = 1; // Reset so they can try later
        return;
      }

      const itemName = getItem(res.itemId)?.name || res.itemId;
      this.addNotification(`+${count} ${itemName}`, 'item');
      // Track for achievements
      if (res.type === 'tree' || res.type === 'bush') {
        this.achievementStats.woodGathered += count;
      } else if (res.type.includes('rock') || res.type.includes('ore') || res.type === 'crystal_node') {
        this.achievementStats.oreGathered += count;
      }
      if (isVegetation) {
        this.spawnParticles(res.x + 10, res.y + 15, '#4a6a2a', 8, 'leaf', { spread: 120, speed: 80, sizeRange: [3, 6], lifeRange: [0.5, 1.0] });
        this.spawnParticles(res.x + 10, res.y + 10, '#6b4423', 5, 'wood_chip', { spread: 100, speed: 70, sizeRange: [2, 5] });
      } else if (isOre) {
        this.spawnParticles(res.x + 10, res.y + 10, '#ffcc44', 10, 'spark', { spread: 150, speed: 100, sizeRange: [1, 3], lifeRange: [0.3, 0.7] });
        this.spawnParticles(res.x + 10, res.y + 10, particleColor, 8, 'dust', { spread: 100, speed: 60, sizeRange: [3, 7], lifeRange: [0.6, 1.2] });
      } else {
        this.spawnParticles(res.x + 10, res.y + 10, particleColor, 12);
      }

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

    // Play swing sound based on weapon type
    this.audio.playSwing(tool?.toolType || 'sword');
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

      this.audio.playArrowShot();
      this.spawnParticles(px + player.facing.x * 20, py + player.facing.y * 20, '#c8a060', 3, 'dust', { spread: 30, speed: 40, sizeRange: [2, 4], lifeRange: [0.2, 0.5] });
      this.spawnParticles(px + player.facing.x * 20, py + player.facing.y * 20, '#8B4513', 2, 'wood_chip', { spread: 40, speed: 30, sizeRange: [1, 3] });
      return;
    }

    // ── Melee Attack ──
    const attackX = px + player.facing.x * range;
    const attackY = py + player.facing.y * range;

    // Weapon trail particles
    const trailColor = tool?.toolType === 'sword' ? '#ddd' : '#888';
    if (tool?.toolType === 'sword' || tool?.toolType === 'spear' || tool?.toolType === 'hammer') {
      this.spawnParticles(attackX, attackY, '#ffddaa', 4, 'spark', { spread: 60, speed: 50, sizeRange: [1, 2], lifeRange: [0.2, 0.4] });
      this.spawnParticles(attackX, attackY, trailColor, 3, 'dust', { spread: 40, speed: 30, sizeRange: [2, 4], lifeRange: [0.3, 0.5] });
    } else {
      this.spawnParticles(attackX, attackY, trailColor, 3);
    }

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

        // Play hit sound
        if (crit) {
          this.audio.playCriticalHit();
        } else {
          this.audio.playHit();
        }
        const mitigated = Math.max(1, finalDamage - enemy.definition.defense);
        enemy.hp -= mitigated;
        enemy.state = 'hurt';
        enemy.knockback = scaleVec(player.facing, 100);

        // Hit particles per weapon type
        const hitColor = tool?.toolType === 'sword' ? '#fff' : '#ff8844';
        this.spawnParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#ffddaa', 6, 'hit_flash', { spread: 80, speed: 60, sizeRange: [2, 4], lifeRange: [0.2, 0.4] });
        if (crit) {
          this.spawnParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#ff4400', 5, 'spark', { spread: 150, speed: 100, sizeRange: [2, 4], lifeRange: [0.3, 0.6] });
          this.spawnParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#ffaa00', 3, 'magic', { spread: 80, speed: 60, sizeRange: [3, 5], lifeRange: [0.4, 0.7], color2: '#ffdd44' });
        } else {
          this.spawnParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, hitColor, 6);
        }

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

    // Death particles based on enemy type
    const deathColor = enemy.definition.color || '#ff4444';
    this.spawnParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, deathColor, 8, 'debris', { spread: 150, speed: 100, sizeRange: [2, 5], lifeRange: [0.4, 0.8] });
    this.spawnParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#ff8844', 4, 'ember', { spread: 100, speed: 60, sizeRange: [2, 4], lifeRange: [0.5, 1.0] });

    // Death sound
    this.audio.playEnemyDeath(enemy.definition.type);
    // Update achievement tracking
    this.achievementStats.enemiesKilled++;
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
    this.achievementStats.goldEarned += gold;
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
      // Healing/green sparkle when using items
      if (item.effects?.some(e => e.type === 'heal' || e.type === 'hunger')) {
        this.spawnParticles(this.state.player.x + PLAYER_SIZE / 2, this.state.player.y, '#44ff44', 5, 'heal', { spread: 60, speed: 50, sizeRange: [2, 4], lifeRange: [0.4, 0.8] });
      }
      this.audio.playUseItem();
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
      // Night bonus: enemies are more aggressive at night (50% larger aggro range)
      const nightBonus = (this.state.gameTime.isNight && !this.inCave) ? 1.5 : 1.0;
      if (distToPlayer < enemy.definition.aggroRange * nightBonus) {
        enemy.state = 'chase';
        enemy.targetId = 'player';

        // Move toward player
        const dir = normalize(sub(playerPos, { x: ex, y: ey }));
        // Level-based speed bonus: stronger enemies chase faster
        const levelSpeedMult = 1 + Math.max(0, enemy.definition.level - 3) * 0.03;
        const speed = enemy.definition.speed * levelSpeedMult;

        const newX = enemy.x + dir.x * speed * dt;
        const newY = enemy.y + dir.y * speed * dt;

        // 🛡️ Safe zone check: enemies cannot enter safe zones
        const isTargetInSafeZone = this.isInSafeZone(playerPos.x, playerPos.y);
        const wouldEnterSafeZone = this.isInSafeZone(newX, newY);

        // If player is in safe zone, enemies stop at the edge
        if (wouldEnterSafeZone || (isTargetInSafeZone && distToPlayer < enemy.definition.aggroRange * 0.6)) {
          // Don't move into safe zone — hover at edge
          // Instead, try moving perpendicular to the player
          const perpX = enemy.x + dir.y * speed * 0.3 * dt;
          const perpY = enemy.y - dir.x * speed * 0.3 * dt;
          if (!this.isInSafeZone(perpX, perpY)) {
            enemy.x = perpX;
            enemy.y = perpY;
          }
        } else {
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
        }

        enemy.direction = dir;

        // Attack player (only if not in safe zone)
        if (!this.isInSafeZone(this.state.player.x + PLAYER_SIZE / 2, this.state.player.y + PLAYER_SIZE / 2)) {
          if (distToPlayer < enemy.definition.attackRange) {
            enemy.attackCooldown -= dt;
            if (enemy.attackCooldown <= 0) {
              this.enemyAttackPlayer(enemy);
              enemy.attackCooldown = enemy.definition.attackSpeed / 1000;
            }
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

    // Enemy damage scales slightly with their level vs player level
    const levelDiff = Math.max(0, enemy.definition.level - player.stats.level);
    const levelBonus = 1 + levelDiff * 0.05;
    const damage = Math.max(1, Math.floor((enemy.definition.damage - player.stats.defense * 0.5) * levelBonus));
    player.stats.hp -= damage;
    player.invincibleTimer = 0.5;

    this.audio.playPlayerHurt();
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
    this.spawnParticles(player.x + PLAYER_SIZE / 2, player.y + PLAYER_SIZE / 2, '#ff2222', 6, 'blood', { spread: 80, speed: 60, sizeRange: [2, 4], lifeRange: [0.5, 1.0] });
    this.spawnParticles(player.x + PLAYER_SIZE / 2, player.y + PLAYER_SIZE / 2, '#ff4444', 3, 'hit_flash', { spread: 50, speed: 40, sizeRange: [3, 5], lifeRange: [0.2, 0.4] });

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

    this.audio.playPlayerDeath();
    this.achievementStats.hasDied = true;
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

    // Safe Zone passive regen — slow heal regardless of hunger/stamina
    if (this.isInSafeZone(this.state.player.x + PLAYER_SIZE / 2, this.state.player.y + PLAYER_SIZE / 2)) {
      const safeRegenBase = 3; // 3 HP/s inside safe zone
      const safeRegenRate = safeRegenBase + quickHealLevel * 0.5;
      stats.hp = Math.min(stats.maxHp, stats.hp + safeRegenRate * dt);
      // Also restore stamina faster in safe zone
      this.state.player.stamina = Math.min(
        this.state.player.maxStamina,
        this.state.player.stamina + 8 * dt
      );
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

  private updateAmbientParticles(dt: number): void {
    // Ambient particles: fireflies at dusk/night, dust/leaves during day
    if (this.inCave) {
      // Cave ambient: only tiny dust motes
      for (const ap of this.ambientParticles) {
        if (ap.effectType === 'firefly') continue; // No fireflies in caves
        ap.x += ap.vx * dt;
        ap.y += ap.vy * dt;
        ap.life -= dt;
        ap.vx += (Math.random() - 0.5) * 8 * dt;
        ap.vy += (Math.random() - 0.5) * 8 * dt;
        ap.vx *= 0.98;
        ap.vy *= 0.98;
      }
    } else {
      const isNight = this.state.gameTime.isNight;
      const hour = this.state.gameTime.hour;

      // Spawn new ambient particles based on time and season
      this.ambientParticleTimer -= dt;
      if (this.ambientParticleTimer <= 0) {
        this.ambientParticleTimer = 0.5 + Math.random() * 1.0;

        // Get camera bounds for spawning
        const camX = this.camera.x;
        const camY = this.camera.y;
        const cw = this.canvas.width / this.camera.zoom;
        const ch = this.canvas.height / this.camera.zoom;

        if (isNight || (hour >= 18 || hour < 6)) {
          // Night: spawn fireflies
          if (Math.random() < 0.4) { // 40% chance per tick
            const fx = camX + Math.random() * cw;
            const fy = camY + Math.random() * ch;
            this.ambientParticles.push({
              x: fx, y: fy,
              vx: (Math.random() - 0.5) * 15,
              vy: (Math.random() - 0.5) * 15,
              life: 5 + Math.random() * 10,
              maxLife: 12,
              color: '#aaff66',
              size: 1.5 + Math.random() * 2,
              effectType: 'firefly',
              phase: Math.random() * Math.PI * 2,
              baseY: fy,
            });
          }
        } else {
          // Day: dust motes in forest, leaves in forest/plains
          if (Math.random() < 0.2 && !this.inCave) {
            const fx = camX + Math.random() * cw;
            const fy = camY + Math.random() * ch;
            const type = Math.random() < 0.5 ? 'dust' : 'leaf';
            this.ambientParticles.push({
              x: fx, y: fy,
              vx: (Math.random() - 0.5) * 10,
              vy: -Math.random() * 8 - 2,
              life: 4 + Math.random() * 4,
              maxLife: 6,
              color: type === 'dust' ? 'rgba(200,180,160,0.5)' : '#5a8a3a',
              size: type === 'dust' ? 1 : 2,
              effectType: type as 'dust' | 'leaf',
              phase: Math.random() * Math.PI * 2,
            });
          }
        }
      }

      // Update all ambient particles
      for (const ap of this.ambientParticles) {
        ap.life -= dt;

        if (ap.effectType === 'firefly') {
          ap.vx += (Math.random() - 0.5) * 10 * dt;
          ap.vy += (Math.random() - 0.5) * 10 * dt;
          ap.vx *= 0.96;
          ap.vy *= 0.96;
        } else if (ap.effectType === 'dust') {
          ap.vx += (Math.random() - 0.5) * 5 * dt;
          ap.vy += (Math.random() - 0.5) * 5 * dt;
          ap.vx *= 0.97;
          ap.vy *= 0.97;
        } else if (ap.effectType === 'leaf') {
          ap.vy += Math.sin(ap.phase! + performance.now() * 0.001) * 5 * dt;
          ap.vx += Math.cos(ap.phase! + performance.now() * 0.001) * 3 * dt;
        }

        ap.x += ap.vx * dt;
        ap.y += ap.vy * dt;
      }
    }

    this.ambientParticles = this.ambientParticles.filter(ap => ap.life > 0);
    // Cap ambient particles to prevent memory leaks
    if (this.ambientParticles.length > 150) {
      this.ambientParticles = this.ambientParticles.slice(this.ambientParticles.length - 150);
    }
  }

  private updateParticles(dt: number): void {
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;

      // Per-type physics
      const type = p.effectType;
      if (type === 'dust' || type === 'smoke') {
        p.vx *= 0.97;
        p.vy *= 0.97;
        p.vy -= 15 * dt; // Float upward
        p.size *= 0.998; // Fade out
      } else if (type === 'firefly') {
        // Fireflies: gentle floating with sine wave
        p.vx += (Math.random() - 0.5) * 30 * dt;
        p.vy += (Math.random() - 0.5) * 30 * dt;
        p.vx *= 0.95;
        p.vy *= 0.95;
        // Stay near base Y
        if (p.baseY !== undefined) {
          p.vy += (p.baseY - p.y) * 0.1 * dt;
        }
      } else if (type === 'leaf') {
        // Leaves: drift with wind, slow fall
        p.vx += Math.sin(p.phase! + p.y * 0.01) * 20 * dt;
        p.vy += 30 * dt;
        p.vx *= 0.99;
        p.vy *= 0.99;
        p.phase = (p.phase ?? 0) + dt * 2;
      } else if (type === 'level_up' || type === 'magic' || type === 'craft_sparkle') {
        // Bright particles: float up, shimmer
        p.vy -= 30 * dt;
        p.vx *= 0.98;
        p.size = Math.max(0.5, p.size - 0.3 * dt);
      } else if (type === 'blood') {
        p.vy += 80 * dt;
        p.vx *= 0.98;
      } else if (type === 'hit_flash') {
        // Flash: expand outward
        p.vx *= 1.05;
        p.vy *= 1.05;
        p.size += 0.5 * dt;
      } else {
        // Default: gravity
        p.vy += 120 * dt;
        p.vx *= 0.99;
      }
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

          this.spawnParticles(p.x, p.y, '#8B4513', 3, 'wood_chip', { spread: 60, speed: 50, sizeRange: [2, 4] });
          this.spawnParticles(p.x, p.y, '#c8a060', 3, 'dust', { spread: 50, speed: 40, sizeRange: [3, 5], lifeRange: [0.3, 0.6] });
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
  addToInventory(itemId: string, count: number, generateAffixes = false): boolean {
    const item = getItem(itemId);
    if (!item) return false;

    // Generate affixes if this is an equippable item
    const affixes = generateAffixes ? generateItemAffixes(item) : undefined;
    const affixedName = affixes && affixes.length > 0 ? getAffixedItemName(item, affixes) : undefined;

    // Try stacking first
    for (const slot of this.state.player.inventory) {
      if (slot.item?.id === itemId && slot.count < item.stackSize) {
        // Only stack with non-affixed items or same-affix items
        const canStack = !slot.affixes || slot.affixes.length === 0;
        if (canStack) {
          const canAdd = Math.min(count, item.stackSize - slot.count);
          slot.count += canAdd;
          count -= canAdd;
          if (count <= 0) {
            if (affixedName) this.addNotification(`✨ ${affixedName}`, 'item');
            return true;
          }
        }
      }
    }

    // Try hotbar
    for (const slot of this.state.player.hotbar) {
      if (slot.item?.id === itemId && slot.count < item.stackSize) {
        const canStack = !slot.affixes || slot.affixes.length === 0;
        if (canStack) {
          const canAdd = Math.min(count, item.stackSize - slot.count);
          slot.count += canAdd;
          count -= canAdd;
          if (count <= 0) {
            if (affixedName) this.addNotification(`✨ ${affixedName}`, 'item');
            return true;
          }
        }
      }
    }

    // Find empty slot
    for (const slot of this.state.player.inventory) {
      if (!slot.item) {
        slot.item = item;
        slot.count = Math.min(count, item.stackSize);
        slot.durability = item.maxDurability;
        slot.affixes = affixes;
        count -= slot.count;
        if (count <= 0) {
          this.audio.playPickup();
      if (affixedName) this.addNotification(`✨ Pegou ${affixedName}`, 'item');
          return true;
        }
      }
    }

    for (const slot of this.state.player.hotbar) {
      if (!slot.item) {
        slot.item = item;
        slot.count = Math.min(count, item.stackSize);
        slot.durability = item.maxDurability;
        slot.affixes = affixes;
        count -= slot.count;
        if (count <= 0) {
          if (affixedName) this.addNotification(`✨ Pegou ${affixedName}`, 'item');
          return true;
        }
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
      // Map recipe station string to structure itemId
      const stationItemId = recipe.station === 'furnace' ? 'furnace' : recipe.station;
      if (!this.isNearbyStructure(stationItemId, 3)) {
        const stationName = recipe.station.charAt(0).toUpperCase() + recipe.station.slice(1);
        this.audio.playCraftFail();
        this.addNotification("Precisa estar perto de uma " + stationName + "!", 'warning');
        return false;
      }
    }

    // Remove ingredients
    for (const ing of recipe.ingredients) {
      this.removeFromInventory(ing.itemId, ing.count);
    }

    // Add result with affixes (for equippable crafted items)
    this.addToInventory(recipe.result, recipe.resultCount, true);

    // XP for crafting
    this.gainXp(5 + recipe.requiredLevel * 2);
    // Track for achievements
    this.achievementStats.itemsCrafted += recipe.resultCount;

    // ── Craft Visual Effects by Station ──
    const cx = this.state.player.x + PLAYER_SIZE / 2;
    const cy = this.state.player.y;
    
    if (recipe.station === 'furnace') {
      // 🔥 Furnace: hot sparks, embers, smoke — metal forging
      this.spawnParticles(cx, cy, '#ff6600', 10, 'spark', { spread: 160, speed: 120, sizeRange: [2, 5], lifeRange: [0.3, 0.7], color2: '#ffcc00' });
      this.spawnParticles(cx, cy, '#ff4400', 6, 'ember', { spread: 100, speed: 80, sizeRange: [2, 4], lifeRange: [0.4, 1.0] });
      this.spawnParticles(cx, cy - 10, 'rgba(100,80,70,0.5)', 5, 'smoke', { spread: 30, speed: 25, sizeRange: [5, 10], lifeRange: [0.5, 1.0] });
      // Also spawn particles from the furnace structure itself
      const furnaceStruct = this.state.structures.find(s => s.itemId === 'furnace' &&
        Math.abs(s.x + s.width / 2 - cx) < 80 && Math.abs(s.y + s.height / 2 - cy) < 80);
      if (furnaceStruct) {
        const fx = furnaceStruct.x + furnaceStruct.width / 2;
        const fy = furnaceStruct.y;
        this.spawnParticles(fx, fy, '#ff8800', 6, 'spark', { spread: 80, speed: 100, sizeRange: [2, 4], lifeRange: [0.4, 0.8], color2: '#ffcc44' });
        this.spawnParticles(fx, fy - 5, 'rgba(80,60,40,0.4)', 4, 'smoke', { spread: 40, speed: 30, sizeRange: [4, 8], lifeRange: [0.6, 1.2] });
      }
    } else if (recipe.station === 'workbench') {
      // 🔧 Workbench: wood chips, blue sparkles, sawdust
      this.spawnParticles(cx, cy, '#88ccff', 8, 'spark', { spread: 130, speed: 90, sizeRange: [1, 3], lifeRange: [0.3, 0.7], color2: '#aaddff' });
      this.spawnParticles(cx, cy, '#c49a6c', 6, 'sawdust', { spread: 80, speed: 60, sizeRange: [2, 4], lifeRange: [0.6, 1.2] });
      this.spawnParticles(cx, cy - 8, 'rgba(180,140,100,0.4)', 4, 'smoke', { spread: 50, speed: 20, sizeRange: [3, 6], lifeRange: [0.4, 0.9] });
      // Also spawn particles from the workbench itself
      const benchStruct = this.state.structures.find(s => 
        (s.itemId === 'workbench' || s.itemId === 'workbench_advanced') &&
        Math.abs(s.x + s.width / 2 - cx) < 80 && Math.abs(s.y + s.height / 2 - cy) < 80
      );
      if (benchStruct) {
        const bx = benchStruct.x + benchStruct.width / 2;
        const by = benchStruct.y;
        // Sparks flying up from bench surface
        this.spawnParticles(bx, by, '#ffdd44', 5, 'spark', { spread: 60, speed: 80, sizeRange: [1, 3], lifeRange: [0.3, 0.6], color2: '#ffaa00' });
        // Sawdust flying sideways
        this.spawnParticles(bx - 8, by, '#c49a6c', 4, 'sawdust', { spread: 40, speed: 50, sizeRange: [2, 4], lifeRange: [0.5, 1.0] });
        // Blue craft sparkles
        this.spawnParticles(bx + 6, by - 4, '#66bbff', 4, 'craft_sparkle', { spread: 50, speed: 40, sizeRange: [1, 3], lifeRange: [0.4, 0.8], color2: '#aaddff' });
      }
    } else {
      // 🙌 Hand craft: green sparkles, gentle puff — natural/organic
      this.spawnParticles(cx, cy, '#66dd88', 6, 'spark', { spread: 100, speed: 60, sizeRange: [1, 3], lifeRange: [0.3, 0.6], color2: '#88ffaa' });
      this.spawnParticles(cx, cy, '#44cc66', 4, 'craft_sparkle', { spread: 80, speed: 50, sizeRange: [2, 4], lifeRange: [0.5, 1.0], color2: '#66ee88' });
      this.spawnParticles(cx, cy - 5, 'rgba(150,180,130,0.3)', 3, 'smoke', { spread: 30, speed: 15, sizeRange: [3, 5], lifeRange: [0.4, 0.8] });
    }
    this.audio.playCraft();
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
    this.achievementStats.totalXpGained += amount;
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

    // Level up burst particles
    const lx = this.state.player.x + PLAYER_SIZE / 2;
    const ly = this.state.player.y + PLAYER_SIZE / 2;
    this.spawnParticles(lx, ly, '#ffdd44', 12, 'level_up', { spread: 200, speed: 120, sizeRange: [3, 6], lifeRange: [0.8, 1.5], color2: '#ffff88' });
    this.spawnParticles(lx, ly, '#44ddff', 8, 'magic', { spread: 150, speed: 100, sizeRange: [2, 4], lifeRange: [0.6, 1.2] });
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

    // Check if inside a safe zone
    const centerX = px * TILE_SIZE + TILE_SIZE / 2;
    const centerY = py * TILE_SIZE + TILE_SIZE / 2;
    if (!this.isInSafeZone(centerX, centerY)) {
      this.addNotification('Solo seguro só pode ser preparado em área segura!', 'warning');
      return false;
    }

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

    this.spawnParticles(px * TILE_SIZE + TILE_SIZE / 2, py * TILE_SIZE, '#6b4a2a', 5, 'dust', { spread: 80, speed: 50, sizeRange: [3, 6], lifeRange: [0.4, 0.8] });
    this.audio.playTillSoil();
    this.addNotification('Solo preparado para plantio!', 'success');
    this.state.player.stats.farming += 0.1;
    return true;
  }

  plantSeed(seedId: string): boolean {
    const px = Math.floor((this.state.player.x + PLAYER_SIZE / 2 + this.state.player.facing.x * TILE_SIZE) / TILE_SIZE);
    const py = Math.floor((this.state.player.y + PLAYER_SIZE / 2 + this.state.player.facing.y * TILE_SIZE) / TILE_SIZE);

    const plot = this.state.farmPlots.find(p => p.x === px && p.y === py);
    if (!plot || plot.seedId) return false;

    // Check if inside a safe zone
    const centerX = px * TILE_SIZE + TILE_SIZE / 2;
    const centerY = py * TILE_SIZE + TILE_SIZE / 2;
    if (!this.isInSafeZone(centerX, centerY)) {
      this.addNotification('Só pode plantar em área segura!', 'warning');
      return false;
    }

    if (!this.removeFromInventory(seedId, 1)) {
      this.addNotification('Sem sementes!', 'warning');
      return false;
    }

    plot.seedId = seedId;
    plot.growthStage = 0;
    plot.growthProgress = 0;
    plot.watered = false;
    plot.plantedAt = this.state.gameTime.totalTicks;

    this.spawnParticles(px * TILE_SIZE + TILE_SIZE / 2, py * TILE_SIZE + TILE_SIZE / 2, '#4a8a3a', 3, 'leaf', { spread: 40, speed: 30, sizeRange: [2, 3], lifeRange: [0.3, 0.6] });
    this.audio.playPlantSeed();
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
    // Track for achievements
    this.achievementStats.cropsHarvested += harvestCount;

    this.spawnParticles(px * TILE_SIZE + TILE_SIZE / 2, py * TILE_SIZE + TILE_SIZE / 2, '#ffcc44', 6, 'harvest', { spread: 100, speed: 80, sizeRange: [2, 5], lifeRange: [0.4, 0.8] });
    this.spawnParticles(px * TILE_SIZE + TILE_SIZE / 2, py * TILE_SIZE + TILE_SIZE / 2, '#4a8a3a', 5, 'leaf', { spread: 80, speed: 60, sizeRange: [3, 5], lifeRange: [0.5, 0.9] });
    this.audio.playHarvest();
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

    // Check stamina
    if (this.state.player.stamina < 10) {
      this.addNotification('Sem stamina para pescar!', 'warning');
      return false;
    }

    this.state.player.stamina -= 10;

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
    // Track for achievements
    this.achievementStats.fishCaught += count;

    const fishName = getItem(fishId)?.name || fishId;
    this.addNotification(`Pescou ${count}x ${fishName}!`, 'item');
    return true;
  }

    /** Check if a structure with given itemId exists within range tiles of the player */
  // Public helper for UI to check station proximity (Lote 8)
  isNearbyStation(station: string): boolean {
    return this.isNearbyStructure(station, 3);
  }

  isNearbyStructure(itemId: string, range: number): boolean {
    const px = this.state.player.x + PLAYER_SIZE / 2;
    const py = this.state.player.y + PLAYER_SIZE / 2;
    const rangePx = range * TILE_SIZE;

    for (const struct of this.state.structures) {
      if (struct.itemId !== itemId) continue;
      const sx = struct.x + struct.width / 2;
      const sy = struct.y + struct.height / 2;
      const dx = px - sx;
      const dy = py - sy;
      if (dx * dx + dy * dy <= rangePx * rangePx) return true;
    }
    return false;
  }

// ── Building System ────────────────────────────────────────────

  /** Check if a position is inside any safe zone */
  isInSafeZone(x: number, y: number): boolean {
    for (const zone of this.state.safeZones) {
      const dx = x - zone.centerX;
      const dy = y - zone.centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < zone.radius * TILE_SIZE) return true;
    }
    return false;
  }

  /** Get the nearest safe zone center (for building restrictions) */
  getNearestSafeZoneDist(x: number, y: number): { dist: number; zone: SafeZone | null } {
    let nearest = Infinity;
    let nearestZone: SafeZone | null = null;
    for (const zone of this.state.safeZones) {
      const dx = x - zone.centerX;
      const dy = y - zone.centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearest) {
        nearest = dist;
        nearestZone = zone;
      }
    }
    return { dist: nearest, zone: nearestZone };
  }

  /** Check if a tile position is valid for building (walkable, no overlap) */
  canPlaceStructureAt(tileX: number, tileY: number, itemId: string): string | null {
    const item = getItem(itemId);
    if (!item) return 'Item inválido';

    // Check tile is walkable
    if (tileY < 0 || tileY >= this.tileMap.length || tileX < 0 || tileX >= this.tileMap[0].length) {
      return 'Fora do mundo!';
    }
    const tile = this.tileMap[tileY]?.[tileX];
    if (tile === TileType.Water || tile === TileType.DeepWater || tile === TileType.Wall || tile === TileType.CaveWall) {
      return 'Não pode construir aqui!';
    }

    // Check for existing structure at this position
    const existing = this.state.structures.find(s =>
      Math.floor(s.x / TILE_SIZE) === tileX && Math.floor(s.y / TILE_SIZE) === tileY
    );
    if (existing) {
      return 'Já existe uma construção aqui!';
    }

    // House must be placed within safe zone radius of another house,
    // OR if first house, anywhere valid
    if (itemId === 'house' && this.state.safeZones.length > 0) {
      // Houses can be placed anywhere valid, but subsequent houses must
      // be at least 10 tiles away from existing safe zones
      const { dist } = this.getNearestSafeZoneDist(tileX * TILE_SIZE, tileY * TILE_SIZE);
      if (dist < 10 * TILE_SIZE) {
        return 'Muito perto de outra casa!';
      }
    }

    return null; // Valid placement
  }

  placeStructure(itemId: string): boolean {
    const item = getItem(itemId);
    if (!item || !item.placeable) return false;

    if (!this.removeFromInventory(itemId, 1)) return false;

    const px = Math.floor((this.state.player.x + PLAYER_SIZE / 2 + this.state.player.facing.x * TILE_SIZE) / TILE_SIZE);
    const py = Math.floor((this.state.player.y + PLAYER_SIZE / 2 + this.state.player.facing.y * TILE_SIZE) / TILE_SIZE);

    const error = this.canPlaceStructureAt(px, py, itemId);
    if (error) {
      this.addToInventory(itemId, 1);
      this.addNotification(error, 'warning');
      return false;
    }

    const structId = `struct_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newStruct: PlacedStructure = {
      id: structId,
      itemId,
      x: px * TILE_SIZE,
      y: py * TILE_SIZE,
      width: TILE_SIZE,
      height: TILE_SIZE,
      health: 100,
      maxHealth: 100,
    };

    // ── House: creates a safe zone ──
    if (itemId === 'house') {
      newStruct.isSafeZone = true;
      const safeZone: SafeZone = {
        centerX: px * TILE_SIZE + TILE_SIZE / 2,
        centerY: py * TILE_SIZE + TILE_SIZE / 2,
        radius: 15, // 15 tiles radius = ~480px safe zone
        structureId: structId,
      };
      this.state.safeZones.push(safeZone);
      this.addNotification('🏡 Casa construída! Área segura criada! Inimigos não entram aqui.', 'success');
    }

    // ── Storage Chest: creates a storage container ──
    if (itemId === 'storage_chest') {
      const chest: StorageChest = {
        id: `chest_${structId}`,
        structureId: structId,
        name: 'Baú Reforçado',
        slots: Array(30).fill(null).map(() => ({ item: null, count: 0 })),
        maxSlots: 30,
      };
      this.state.storageChests.push(chest);
      this.addNotification('🗄️ Baú criado! Aperte E para abrir.', 'success');
    }

    this.state.structures.push(newStruct);
    this.achievementStats.structuresBuilt++;
    // Check for house achievement
    if (itemId === 'house') {
      this.achievementStats.hasBuiltHouse = true;
    }
    this.gainXp(3);
    this.audio.playBuild();
    this.addNotification(`${item.name} construído!`, 'success');
    return true;
  }

  /** Try to open/close a nearby storage chest */
  toggleStorageChest(): boolean {
    const px = this.state.player.x + PLAYER_SIZE / 2;
    const py = this.state.player.y + PLAYER_SIZE / 2;

    // If a chest is already open, close it
    if (this.ui.activePanel === 'inventory' && this.state.activeStorageChestId) {
      this.state.activeStorageChestId = null;
      this.ui.activePanel = 'none';
      return true;
    }

    // Find nearest chest structure
    for (const chest of this.state.storageChests) {
      const struct = this.state.structures.find(s => s.id === chest.structureId);
      if (!struct) continue;
      const dist = distance({ x: px, y: py }, { x: struct.x + TILE_SIZE / 2, y: struct.y + TILE_SIZE / 2 });
      if (dist < INTERACT_RANGE) {
        this.state.activeStorageChestId = chest.id;
        this.ui.activePanel = 'inventory';
        this.addNotification('📦 Baú aberto! Arraste itens para guardar.', 'info');
        return true;
      }
    }
    return false;
  }

  /** Move items between player inventory and storage chest */
  moveToStorage(inventoryIndex: number, chestId: string, count: number): boolean {
    const chest = this.state.storageChests.find(c => c.id === chestId);
    if (!chest) return false;

    const invSlot = this.state.player.inventory[inventoryIndex];
    if (!invSlot?.item) return false;

    const moveCount = Math.min(count, invSlot.count);

    // Find stack first
    for (const chestSlot of chest.slots) {
      if (chestSlot.item?.id === invSlot.item.id && chestSlot.count < (chestSlot.item.stackSize || 99)) {
        const canAdd = Math.min(moveCount, (chestSlot.item.stackSize || 99) - chestSlot.count);
        chestSlot.count += canAdd;
        invSlot.count -= canAdd;
        if (invSlot.count <= 0) {
          invSlot.item = null;
        }
        if (canAdd >= moveCount) return true;
        return this.moveToStorage(inventoryIndex, chestId, moveCount - canAdd);
      }
    }

    // Find empty slot
    for (const chestSlot of chest.slots) {
      if (!chestSlot.item) {
        chestSlot.item = invSlot.item;
        chestSlot.count = moveCount;
        invSlot.count -= moveCount;
        if (invSlot.count <= 0) {
          invSlot.item = null;
        }
        return true;
      }
    }

    return false;
  }

  /** Move items from storage chest to player inventory */
  takeFromStorage(chestSlotIndex: number, chestId: string, count: number): boolean {
    const chest = this.state.storageChests.find(c => c.id === chestId);
    if (!chest) return false;

    const slot = chest.slots[chestSlotIndex];
    if (!slot?.item) return false;

    const takeCount = Math.min(count, slot.count);
    if (this.addToInventory(slot.item.id, takeCount)) {
      slot.count -= takeCount;
      if (slot.count <= 0) {
        slot.item = null;
      }
      return true;
    }
    this.addNotification('Inventário cheio!', 'warning');
    return false;
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

  private spawnParticles(x: number, y: number, color: string, count: number, effectType?: ParticleEffectType, extra?: { spread?: number; speed?: number; gravity?: number; sizeRange?: [number, number]; color2?: string; lifeRange?: [number, number] }): void {
    const spread = extra?.spread ?? 120;
    const speed = extra?.speed ?? 80;
    const sizeMin = extra?.sizeRange?.[0] ?? 2;
    const sizeMax = extra?.sizeRange?.[1] ?? 5;
    const lifeMin = extra?.lifeRange?.[0] ?? 0.4;
    const lifeMax = extra?.lifeRange?.[1] ?? 0.8;

    for (let i = 0; i < count; i++) {
      const vx = (Math.random() - 0.5) * spread;
      const vy = effectType === 'dust' || effectType === 'smoke'
        ? -Math.random() * speed * 0.5 - 10
        : effectType === 'firefly'
          ? (Math.random() - 0.5) * 20
          : -Math.random() * speed - 20;

      this.particles.push({
        x, y,
        vx,
        vy,
        life: lifeMin + Math.random() * (lifeMax - lifeMin),
        maxLife: lifeMax,
        color,
        size: sizeMin + Math.random() * (sizeMax - sizeMin),
        effectType: effectType || undefined,
        phase: Math.random() * Math.PI * 2,
        baseY: effectType === 'firefly' ? y : undefined,
        color2: extra?.color2,
      });
    }
  }

  /** Get surface name for footstep audio based on tile type */
  private getSurfaceName(tile: number): string {
    if (this.inCave) return 'stone';
    switch (tile) {
      case 0: return 'grass';      // Grass
      case 1: return 'dirt';       // Dirt
      case 2: return 'sand';       // Sand
      case 3: case 4: return 'water';  // Water
      case 5: return 'stone';      // Stone
      case 6: return 'grass';      // Snow (footstep on grass for simplicity)
      case 7: return 'water';      // SwampWater
      case 8: return 'stone';      // Path
      case 9: return 'stone';      // Wall
      case 10: return 'wood';      // Floor
      default: return 'grass';
    }
  }

  private getWindPhase(): number {
    return performance.now() / 4000;
  }

  private getWindStrength(): number {
    return Math.sin(this.getWindPhase()) * 0.3 + 0.3;
  }

  private getWindAt(x: number, y: number): number {
    const phase = this.getWindPhase();
    const strength = this.getWindStrength();
    return Math.sin(phase + x * 0.01 + y * 0.02) * strength;
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

  private checkAchievements(): void {
    const { player, gameTime } = this.state;
    const stats = this.achievementStats;

    const checkState = {
      playerLevel: player.stats.level,
      stats: player.stats,
      enemiesKilled: stats.enemiesKilled,
      woodGathered: stats.woodGathered,
      oreGathered: stats.oreGathered,
      cropsHarvested: stats.cropsHarvested,
      itemsCrafted: stats.itemsCrafted,
      goldEarned: stats.goldEarned,
      daysSurvived: gameTime.day,
      biomesDiscovered: this.state.discoveredAreas.length,
      hasEnteredCave: stats.hasEnteredCave,
      hasBuiltHouse: stats.hasBuiltHouse,
      hasDied: stats.hasDied,
      fishCaught: stats.fishCaught,
      structuresBuilt: stats.structuresBuilt,
      totalXpGained: stats.totalXpGained,
    };

    for (const achievement of ACHIEVEMENTS) {
      const progress = this.state.achievements.find(a => a.id === achievement.id);
      if (!progress || progress.unlocked) continue;

      if (achievement.condition(checkState)) {
        progress.unlocked = true;
        progress.unlockedAt = Date.now();
        this.achievementQueue.push(achievement.id);
        this.addNotification(`🏆 ${achievement.icon} ${achievement.name}: ${achievement.description}`, 'success');
        this.spawnParticles(player.x + 12, player.y, '#ffd700', 8, 'level_up', { spread: 150, speed: 100, sizeRange: [3, 6], lifeRange: [1, 2] });
        this.camera.shake(3, 0.2);
        this.audio.playCraft(); // Reuse craft sound for achievement
      }
    }

    // Process achievement queue for UI (keep up to 5 in queue)
    if (this.achievementQueue.length > 5) {
      this.achievementQueue = this.achievementQueue.slice(this.achievementQueue.length - 5);
    }
  }

  private updateNpcBlink(): { isBlinking: boolean } {
    this.npcBlinkTimer -= 0.016; // Approximate dt of 16ms
    if (this.npcIsBlinking) {
      this.npcBlinkDuration += 0.016;
      if (this.npcBlinkDuration >= 0.12) { // Blink lasts ~120ms
        this.npcIsBlinking = false;
        this.npcBlinkDuration = 0;
        this.npcBlinkTimer = 2 + Math.random() * 4; // Next blink in 2-6 seconds
      }
    } else if (this.npcBlinkTimer <= 0) {
      this.npcIsBlinking = true;
      this.npcBlinkDuration = 0;
    }
    return { isBlinking: this.npcIsBlinking };
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

        // Water shimmer animation — flowing waves
        if (tile === TileType.Water || tile === TileType.DeepWater) {
          const wave1 = Math.sin(performance.now() / 1500 + x * 1.5 + y * 2.5) * 0.5 + 0.5;
          const wave2 = Math.sin(performance.now() / 2200 + x * 2.5 + y * 1.8 + 1.5) * 0.4 + 0.4;
          const shimmer = (wave1 * 0.4 + wave2 * 0.3) * 0.2 + 0.97;
          ctx.fillStyle = tile === TileType.Water
            ? `rgba(74, 144, 194, ${shimmer * 0.15})`
            : `rgba(44, 95, 138, ${shimmer * 0.2})`;
          ctx.fillRect(screenPos.x, screenPos.y, TILE_SIZE, TILE_SIZE);
          // Foam on edges — white band where water meets land
          if (tile === TileType.Water) {
            const isEdge = y > 0 && x > 0 && y < curTileH - 1 && x < curTileW - 1 && (
              curTileMap[y-1][x] !== 3 && curTileMap[y-1][x] !== 4 ||
              curTileMap[y+1][x] !== 3 && curTileMap[y+1][x] !== 4 ||
              curTileMap[y][x-1] !== 3 && curTileMap[y][x-1] !== 4 ||
              curTileMap[y][x+1] !== 3 && curTileMap[y][x+1] !== 4
            );
            if (isEdge) {
              const foamWave = Math.sin(performance.now() / 1000 + x * 3 + y * 4) * 0.2 + 0.3;
              ctx.fillStyle = `rgba(200, 230, 255, ${foamWave * 0.15})`;
              ctx.fillRect(screenPos.x, screenPos.y, TILE_SIZE, 2);
              ctx.fillRect(screenPos.x, screenPos.y + TILE_SIZE - 2, TILE_SIZE, 2);
            }
          }
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

        // ── Biome-specific ground detail ──
        if (!this.inCave && tile !== TileType.Water && tile !== TileType.DeepWater && tile !== TileType.SwampWater) {
          const biome = this.biomeMap[y]?.[x];
          if (biome) {
            const details = BIOME_DETAIL_COLORS[biome];
            if (details) {
              for (const detail of details) {
                const detailNoise = fractalNoise(x + 700, y + 700, this.state.world.seed + 9000 + details.indexOf(detail), 1, 5);
                if (detailNoise > 1 - detail.chance * 8) {
                  ctx.fillStyle = detail.color + '40';  // 25% opacity
                  if (detail.type === 'leaf' || detail.type === 'sand_dune') {
                    ctx.fillRect(screenPos.x + (detailNoise * 20) % 28, screenPos.y + (detailNoise * 15) % 28, 4, 2);
                  } else if (detail.type === 'twig' || detail.type === 'crack') {
                    ctx.fillRect(screenPos.x + (detailNoise * 20) % 28, screenPos.y + (detailNoise * 15) % 24, 3, 1);
                  } else if (detail.type === 'ice_crack') {
                    ctx.fillStyle = '#ffffff20';
                    ctx.fillRect(screenPos.x + (detailNoise * 20) % 28, screenPos.y + (detailNoise * 15) % 28, 2, 3);
                  } else {
                    ctx.fillRect(screenPos.x + (detailNoise * 20) % 28, screenPos.y + (detailNoise * 15) % 26, 2, 2);
                  }
                }
              }
            }
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
        cactus: '#4a8a3a', dry_bush: '#8a7a4a', mossy_rock: '#6a7a5a',
        snowy_rock: '#b0b8c0', flower_patch: '#ffaadd', pine_sapling: '#3a7a3a',
        berry_bush: '#cc4466',
      };
      const windPhase = performance.now() / 4000;
      const windStrength = Math.sin(windPhase) * 0.3 + 0.3;
      for (const dec of this.decorations) {
        if (!camera.isVisible(dec.x, dec.y, 8, 8)) continue;
        const dPos = camera.worldToScreen(dec.x, dec.y);
        const swayOffset = Math.sin(windPhase + dec.x * 0.01 + dec.y * 0.02) * windStrength;
        ctx.fillStyle = decorationColors[dec.type] || '#888';
        if (dec.type === 'flower' || dec.type === 'mushroom') {
          ctx.save();
          ctx.translate(dPos.x + 2 + swayOffset, dPos.y + 2);
          ctx.rotate(swayOffset * 0.1);
          ctx.beginPath();
          ctx.arc(0, 0, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillRect(-1, 1, 2, 3);
          ctx.restore();
          ctx.beginPath();
          ctx.arc(dPos.x + 2, dPos.y + 2, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillRect(dPos.x + 1, dPos.y + 3, 2, 3);
        } else if (dec.type === 'tall_grass' || dec.type === 'fern') {
          ctx.save();
          ctx.translate(dPos.x + swayOffset, dPos.y);
          ctx.fillRect(0, 0, 1, 6);
          ctx.fillRect(2 + swayOffset * 0.5, 1, 1, 5);
          ctx.restore();
        } else if (dec.type === 'lily_pad') {
          ctx.beginPath();
          ctx.ellipse(dPos.x + 3, dPos.y + 1, 4, 2, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (dec.type === 'dead_log') {
          ctx.fillRect(dPos.x, dPos.y + 1, 6, 2);
          ctx.fillRect(dPos.x + 1, dPos.y, 4, 1);
        } else if (dec.type === 'cactus') {
          // Cactus body
          ctx.fillRect(dPos.x + 1, dPos.y, 3, 7);
          ctx.fillRect(dPos.x - 1, dPos.y + 2, 2, 2);
          ctx.fillRect(dPos.x + 4, dPos.y + 3, 2, 2);
        } else if (dec.type === 'dry_bush') {
          ctx.fillRect(dPos.x, dPos.y, 3, 3);
          ctx.fillRect(dPos.x - 1, dPos.y + 1, 1, 2);
          ctx.fillRect(dPos.x + 3, dPos.y + 1, 1, 2);
        } else if (dec.type === 'mossy_rock') {
          ctx.fillStyle = '#6a7a5a';
          ctx.fillRect(dPos.x, dPos.y, 4, 3);
          ctx.fillStyle = '#4a6a3a';
          ctx.fillRect(dPos.x, dPos.y, 2, 1);
        } else if (dec.type === 'snowy_rock') {
          ctx.fillStyle = '#8a9aa8';
          ctx.fillRect(dPos.x, dPos.y + 1, 4, 3);
          ctx.fillStyle = '#e0e8f0';
          ctx.fillRect(dPos.x, dPos.y, 4, 2);
        } else if (dec.type === 'flower_patch') {
          ctx.fillStyle = '#ffaadd';
          ctx.beginPath();
          ctx.arc(dPos.x + 1, dPos.y + 1, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ff88bb';
          ctx.beginPath();
          ctx.arc(dPos.x + 4, dPos.y + 2, 1.5, 0, Math.PI * 2);
          ctx.fill();
        } else if (dec.type === 'pine_sapling') {
          ctx.fillStyle = '#5a3a1a';
          ctx.fillRect(dPos.x + 1, dPos.y + 4, 2, 2);
          ctx.fillStyle = '#3a7a3a';
          ctx.beginPath();
          ctx.moveTo(dPos.x + 2, dPos.y);
          ctx.lineTo(dPos.x, dPos.y + 4);
          ctx.lineTo(dPos.x + 4, dPos.y + 4);
          ctx.closePath();
          ctx.fill();
        } else if (dec.type === 'berry_bush') {
          ctx.fillStyle = '#5a7a3a';
          ctx.fillRect(dPos.x, dPos.y + 1, 4, 3);
          ctx.fillStyle = '#cc4466';
          ctx.fillRect(dPos.x, dPos.y, 2, 2);
          ctx.fillRect(dPos.x + 2, dPos.y + 2, 2, 2);
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
    // Without a torch at night, enemies are hidden in darkness
    const enemiesHiddenInDark = !this.inCave && this.state.gameTime.isNight && this.getCurrentItem()?.toolType !== 'torch';
    for (const enemy of drawEnemies) {
      if (!camera.isVisible(enemy.x, enemy.y, enemy.width, enemy.height)) continue;
      if (enemiesHiddenInDark) continue;
      this.drawEnemy(enemy);
    }

    // 🛡️ Draw safe zone boundaries (visible circles on ground)
    for (const zone of this.state.safeZones) {
      if (!camera.isVisible(zone.centerX - zone.radius * TILE_SIZE, zone.centerY - zone.radius * TILE_SIZE, zone.radius * TILE_SIZE * 2, zone.radius * TILE_SIZE * 2)) continue;
      this.drawSafeZone(zone);
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

    // Highlight workbench when player is nearby and crafting panel is open
    if (this.ui.activePanel === 'crafting' && !this.inCave) {
      const nearbyBench = this.state.structures.find(s => 
        (s.itemId === 'workbench' || s.itemId === 'workbench_advanced') &&
        Math.abs(s.x - this.state.player.x) < 80 &&
        Math.abs(s.y - this.state.player.y) < 80
      );
      if (nearbyBench) {
        const bp = camera.worldToScreen(nearbyBench.x, nearbyBench.y);
        const bPulse = 0.5 + Math.sin(performance.now() / 500) * 0.3;
        ctx.strokeStyle = `rgba(100, 220, 255, ${bPulse * 0.3})`;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 6]);
        ctx.strokeRect(bp.x - 2, bp.y - 2, 36, 34);
        ctx.setLineDash([]);
      }
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
      const pPos = camera.worldToScreen(p.x, p.y);
      const alpha = Math.max(0, Math.min(1, p.life / Math.max(0.001, p.maxLife)));
      ctx.globalAlpha = alpha;

      const type = p.effectType;
      if (type === 'spark' || type === 'hit_flash') {
        // Sparks: bright diamond-shaped
        ctx.fillStyle = p.color;
        ctx.save();
        ctx.translate(pPos.x, pPos.y);
        ctx.rotate(p.phase! + p.life * 5);
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.fillRect(-p.size / 4, -p.size / 2, p.size / 2, p.size);
        ctx.restore();
        // Glow
        ctx.globalAlpha = alpha * 0.3;
        ctx.beginPath();
        ctx.arc(pPos.x, pPos.y, p.size * 1.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (type === 'firefly') {
        // Fireflies: soft glowing circles with pulse
        const pulse = Math.sin(p.phase! + performance.now() / 500 + p.y * 0.02) * 0.3 + 0.7;
        ctx.globalAlpha = alpha * pulse;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(pPos.x, pPos.y, p.size * pulse, 0, Math.PI * 2);
        ctx.fill();
        // Outer glow
        ctx.globalAlpha = alpha * 0.2 * pulse;
        ctx.beginPath();
        ctx.arc(pPos.x, pPos.y, p.size * 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (type === 'magic' || type === 'craft_sparkle' || type === 'level_up') {
        // Magic/sparkle: star shape with glow
        ctx.fillStyle = p.color;
        ctx.save();
        ctx.translate(pPos.x, pPos.y);
        ctx.rotate(p.phase! + performance.now() / 300);
        const s = p.size;
        ctx.fillRect(-s / 4, -s, s / 2, s * 2);
        ctx.fillRect(-s, -s / 4, s * 2, s / 2);
        ctx.restore();
        // Glow
        if (p.color2) {
          ctx.globalAlpha = alpha * 0.25;
          ctx.beginPath();
          ctx.arc(pPos.x, pPos.y, p.size * 2, 0, Math.PI * 2);
          ctx.fillStyle = p.color2;
          ctx.fill();
        }
      } else if (type === 'leaf') {
        // Leaves: small rotating rectangles
        ctx.fillStyle = p.color;
        ctx.save();
        ctx.translate(pPos.x, pPos.y);
        ctx.rotate(p.phase! + p.life * 2);
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      } else if (type === 'smoke' || type === 'dust') {
        // Smoke: soft circles that fade
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha * 0.4;
        ctx.beginPath();
        ctx.arc(pPos.x, pPos.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (type === 'blood') {
        // Blood: small filled circles
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(pPos.x, pPos.y, Math.max(1, p.size * alpha), 0, Math.PI * 2);
        ctx.fill();
      } else if (type === 'heal') {
        // Heal: green cross
        ctx.fillStyle = p.color;
        ctx.save();
        ctx.translate(pPos.x, pPos.y);
        const s = p.size * alpha;
        ctx.fillRect(-s / 4, -s, s / 2, s * 2);
        ctx.fillRect(-s, -s / 4, s * 2, s / 2);
        ctx.restore();
      } else if (type === 'ember') {
        // Embers: small triangles with orange glow
        ctx.fillStyle = p.color;
        ctx.beginPath();
        const s = p.size * alpha;
        ctx.moveTo(pPos.x, pPos.y - s);
        ctx.lineTo(pPos.x - s, pPos.y + s);
        ctx.lineTo(pPos.x + s, pPos.y + s);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = alpha * 0.2;
        ctx.beginPath();
        ctx.arc(pPos.x, pPos.y, s * 2, 0, Math.PI * 2);
        ctx.fillStyle = '#ffa500';
        ctx.fill();
      } else {
        // Default: simple filled rectangle
        ctx.fillStyle = p.color;
        ctx.fillRect(pPos.x - p.size / 2, pPos.y - p.size / 2, p.size, p.size);
      }
    }
    ctx.globalAlpha = 1;

    // Draw ambient particles
    if (!this.inCave) {
      const isNight = this.state.gameTime.isNight;
      for (const ap of this.ambientParticles) {
        if (!camera.isVisible(ap.x, ap.y, 10, 10)) continue;
        const apPos = camera.worldToScreen(ap.x, ap.y);
        const alpha = Math.max(0, Math.min(1, ap.life / ap.maxLife));
        ctx.globalAlpha = alpha;

        if (ap.effectType === 'firefly') {
          const pulse = Math.sin(ap.phase! + performance.now() / 400 + ap.y) * 0.3 + 0.7;
          ctx.globalAlpha = alpha * pulse * (isNight ? 0.9 : 0.15);
          ctx.fillStyle = '#aaff66';
          ctx.beginPath();
          ctx.arc(apPos.x, apPos.y, ap.size * pulse, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = alpha * 0.2 * pulse * (isNight ? 0.6 : 0.05);
          ctx.beginPath();
          ctx.arc(apPos.x, apPos.y, ap.size * 4, 0, Math.PI * 2);
          ctx.fillStyle = '#ccff88';
          ctx.fill();
        } else if (ap.effectType === 'dust') {
          ctx.globalAlpha = alpha * 0.3;
          ctx.fillStyle = ap.color;
          ctx.fillRect(apPos.x, apPos.y, 1, 1);
        } else if (ap.effectType === 'leaf') {
          ctx.globalAlpha = alpha * 0.5;
          ctx.fillStyle = ap.color;
          ctx.save();
          ctx.translate(apPos.x, apPos.y);
          ctx.rotate(ap.phase! + ap.y * 0.02);
          ctx.fillRect(-2, -1, 4, 2);
          ctx.restore();
        }
      }
    }
    ctx.globalAlpha = 1;
    // Draw damage numbers
    for (const dn of this.damageNumbers) {
      const dnPos = camera.worldToScreen(dn.x, dn.y);
      const alpha = Math.max(0, Math.min(1, dn.timer * 2));
      ctx.globalAlpha = alpha;
      ctx.textAlign = 'center';

      // Bounce effect: numbers start higher and settle
      const bounceOffset = (1 - dn.timer) * 15;
      const screenY = dnPos.y - 10 - bounceOffset;

      if (dn.isCrit) {
        // Critical hit: larger, orange, bold with shadow
        ctx.font = 'bold 18px monospace';
        ctx.fillStyle = '#ff6600';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.strokeText(`💥 ${dn.value}`, dnPos.x, screenY);
        ctx.fillText(`💥 ${dn.value}`, dnPos.x, screenY);
        // Extra glow
        ctx.globalAlpha = alpha * 0.3;
        ctx.fillStyle = '#ffcc00';
        ctx.font = 'bold 20px monospace';
        ctx.fillText(`💥 ${dn.value}`, dnPos.x, screenY);
      } else if (dn.isHeal) {
        // Heal: green
        ctx.font = 'bold 14px monospace';
        ctx.fillStyle = '#44ff44';
        ctx.strokeStyle = '#003300';
        ctx.lineWidth = 2;
        ctx.strokeText(`+${dn.value}`, dnPos.x, screenY);
        ctx.fillText(`+${dn.value}`, dnPos.x, screenY);
      } else {
        // Normal damage: white with dark outline
        ctx.font = 'bold 13px monospace';
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.strokeText(`${dn.value}`, dnPos.x, screenY);
        ctx.fillText(`${dn.value}`, dnPos.x, screenY);
      }
    }
    ctx.globalAlpha = 1;


    // ── Day/Night ambient overlay (surface only, before restore so it's in world space) ──
    if (!this.inCave) {
      const nightOverlay = getDayNightColor(this.state.gameTime.hour);
      if (nightOverlay !== 'rgba(0,0,0,0)') {
        ctx.fillStyle = nightOverlay;
        ctx.fillRect(0, 0, canvas.width / camera.zoom + 100, canvas.height / camera.zoom + 100);
      }
    }

    ctx.restore();

    // ── Cave darkness overlay (always dark underground) ──
    if (this.inCave) {
      // Deep cave darkness with torch light around player
      ctx.fillStyle = 'rgba(0, 0, 10, 0.75)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Dynamic torch light around player - gradient circle
      const playerScreen = camera.worldToScreen(
        player.x + PLAYER_SIZE / 2,
        player.y + PLAYER_SIZE / 2
      );
      const hasTorch = this.getCurrentItem()?.toolType === 'torch';
      // Torch: intense warm light + noticeable flicker | Hands: tiny dim glow
      const flicker = hasTorch ? Math.sin(performance.now() / 120 + player.x * 0.1) * 25 : 0;
      const lightRadius = hasTorch ? 400 + flicker : 80;
      const gradient = ctx.createRadialGradient(
        playerScreen.x, playerScreen.y, hasTorch ? 10 : 20,
        playerScreen.x, playerScreen.y, lightRadius
      );

      if (hasTorch) {
        // Warm torch glow - stronger in center, fades to dark
        gradient.addColorStop(0, 'rgba(255, 180, 60, 0.15)');
        gradient.addColorStop(0.15, 'rgba(255, 180, 60, 0.05)');
        gradient.addColorStop(0.5, 'rgba(255, 160, 40, 0.02)');
        gradient.addColorStop(1, 'rgba(0, 0, 10, 0.75)');
        // Warm glow overlay on the scene
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = 'destination-out';
        // Punch hole for visibility with warm gradient
        const holeGradient = ctx.createRadialGradient(
          playerScreen.x, playerScreen.y, 15,
          playerScreen.x, playerScreen.y, lightRadius - 30
        );
        holeGradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
        holeGradient.addColorStop(0.6, 'rgba(0, 0, 0, 0.8)');
        holeGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = holeGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else {
        // No torch - small dim visibility circle
        gradient.addColorStop(0, 'rgba(0, 0, 10, 0)');
        gradient.addColorStop(1, 'rgba(0, 0, 10, 0.75)');
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
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

      // Torch light around player (stronger at night)
      if (this.getCurrentItem()?.toolType === 'torch') {
        const playerScreen = camera.worldToScreen(
          player.x + PLAYER_SIZE / 2,
          player.y + PLAYER_SIZE / 2
        );
        const torchFlicker = Math.sin(performance.now() / 120) * 20;
        // Bright visible circle — clears the darkness overlay
        const gradient = ctx.createRadialGradient(
          playerScreen.x, playerScreen.y, 3,
          playerScreen.x, playerScreen.y, 320 + torchFlicker
        );
        gradient.addColorStop(0, 'rgba(0, 0, 30, 0)');
        gradient.addColorStop(0.3, 'rgba(0, 0, 30, 0)');
        gradient.addColorStop(0.7, `rgba(0, 0, 30, ${nightAlpha * 0.4})`);
        gradient.addColorStop(1, `rgba(0, 0, 30, ${nightAlpha})`);
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = 'source-over';

        // Warm amber glow overlay on the visible area
        const warmGlow = ctx.createRadialGradient(
          playerScreen.x, playerScreen.y, 0,
          playerScreen.x, playerScreen.y, 300 + torchFlicker * 0.5
        );
        warmGlow.addColorStop(0, 'rgba(255, 200, 80, 0.18)');
        warmGlow.addColorStop(0.3, 'rgba(255, 160, 40, 0.08)');
        warmGlow.addColorStop(0.6, 'rgba(255, 120, 20, 0.03)');
        warmGlow.addColorStop(1, 'rgba(255, 80, 10, 0)');
        ctx.fillStyle = warmGlow;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
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

    // Wind-based sway for vegetation
    const windPhase = this.getWindPhase();
    const windStrength = this.getWindStrength();
    const treeSway = Math.sin(windPhase + res.x * 0.08 + res.y * 0.05) * 2.0 + 
                     Math.sin(performance.now() / 2000 + res.x * 0.1) * 0.8;
    const bushSway = Math.sin(windPhase + res.x * 0.12 + res.y * 0.07) * 3.0 +
                     Math.sin(performance.now() / 1500 + res.x * 0.15) * 1.0;

    switch (res.type) {
      case 'tree': {
        // Tree shadow
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.beginPath();
        ctx.ellipse(pos.x + 12, pos.y + 38, 12, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.save();
        ctx.translate(pos.x + 12, pos.y + 30);
        ctx.rotate(treeSway * 0.015);
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
        ctx.rotate(bushSway * 0.03);
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
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath();
        ctx.ellipse(pos.x + 12, pos.y + 18, 14, 5, 0, 0, Math.PI * 2);
        ctx.fill();
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
        ctx.fillStyle = `rgba(80, 255, 80, ${glowPulse})`;
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
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(cx, by - 2, 12, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Idle animations ──
    // Breathing: subtle body lift
    const breathe = Math.sin(performance.now() / 1200 + npc.x * 2) * 0.6;
    // Idle bob (walk/stand animation)
    const bob = Math.sin(performance.now() / 800 + npc.x) * 1.2;
    // Combine: breathing adds subtle motion on top of bob
    const animY = bob + breathe;

    // ── Blink system ──
    // Update blink timer (only one NPC's draw call triggers blink timing)
    // We track global blink state so all NPCs blink at roughly the same time
    const blinkState = this.updateNpcBlink();
    const isBlinking = blinkState.isBlinking;

    // Subtle head looking direction (slowly looks left/right)
    const headLook = Math.sin(performance.now() / 5000 + npc.x * 0.5) * 1.5;

    // Body
    ctx.fillStyle = npc.definition.color;
    ctx.fillRect(cx - 7, by - 14 + animY, 14, 11);

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
    ctx.fillRect(cx - 9, by - 13 + animY, 3, 8);
    ctx.fillRect(cx + 6, by - 13 + animY, 3, 8);

    // Legs
    ctx.fillStyle = '#3a3a5a';
    const legSwing = Math.sin(performance.now() / 400) * 1.5;
    ctx.fillRect(cx - 5 + legSwing, by - 4 + animY, 4, 4);
    ctx.fillRect(cx + 1 - legSwing, by - 4 + animY, 4, 4);

    // Head (with subtle head movement)
    ctx.fillStyle = '#ffcc99';
    ctx.beginPath();
    ctx.arc(cx + headLook * 0.3, by - 18 + animY, 6, 0, Math.PI * 2);
    ctx.fill();

    // Eyes (with blink)
    if (isBlinking) {
      // Eyes closed during blink
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 3 + headLook * 0.3, by - 18.5 + animY);
      ctx.lineTo(cx - 0.5 + headLook * 0.3, by - 18.5 + animY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + 0.5 + headLook * 0.3, by - 18.5 + animY);
      ctx.lineTo(cx + 3 + headLook * 0.3, by - 18.5 + animY);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#000';
      ctx.fillRect(cx - 2.5 + headLook * 0.3, by - 19 + animY, 1.5, 1.5);
      ctx.fillRect(cx + 1 + headLook * 0.3, by - 19 + animY, 1.5, 1.5);
    }

    // Icon above head
    ctx.font = '12px serif';
    ctx.textAlign = 'center';
    ctx.fillText(npc.definition.icon, cx, by - 28 + animY);

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
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(pos.x + 16, pos.y + 32, 16, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hurt flash
    if (enemy.state === 'hurt') {
      ctx.globalAlpha = 0.4 + Math.sin(performance.now() / 50) * 0.3;
    }

    // Idle animations: bob + breathing
    const isAlive = enemy.state !== 'dead' && enemy.state !== 'hurt';
    const bob = isAlive
      ? Math.sin(performance.now() / 600 + enemy.x) * 1.5
      : 0;
    const breathe = isAlive
      ? Math.sin(performance.now() / 1000 + enemy.x * 1.5 + enemy.y * 0.5) * 0.5
      : 0;
    const breatheScale = isAlive
      ? 1 + Math.sin(performance.now() / 1000 + enemy.x * 1.5) * 0.03
      : 1;
    const animY = bob + breathe;

    // Aggro glow (when chasing)
    if (enemy.state === 'chase') {
      ctx.shadowColor = 'rgba(255, 0, 0, 0.3)';
      ctx.shadowBlur = 8;
    }

    // ── Health bar ──
    if (enemy.state !== 'dead' && enemy.hp < enemy.maxHp) {
      const barWidth = enemy.width + 4;
      const barHeight = 3;
      const barX = pos.x + (enemy.width - barWidth) / 2;
      const barY = pos.y - 4;
      const hpPct = Math.max(0, enemy.hp / enemy.maxHp);
      // Background
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(barX, barY, barWidth, barHeight);
      // Health fill (green -> yellow -> red)
      const hpColor = hpPct > 0.6 ? '#4caf50' : hpPct > 0.3 ? '#ff9800' : '#e53935';
      ctx.fillStyle = hpColor;
      ctx.fillRect(barX, barY, barWidth * hpPct, barHeight);
      // Border
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(barX, barY, barWidth, barHeight);
      ctx.lineWidth = 1;
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
        const slimePulse = isAlive
          ? (Math.sin(performance.now() / 600) * 1.5 + 1.5)
          : 0;
        const slimeSquash = isAlive
          ? Math.sin(performance.now() / 400) * 0.15 + 0.85
          : 1;
        ctx.ellipse(cx, by + slimeBob + slimePulse * 0.5, w / 2 * slimeSquash, (h / 2.5 + slimeBob * 0.3) / slimeSquash, 0, 0, Math.PI * 2);
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
        // Body (with wind sway and breathing)
        ctx.fillStyle = def.color;
        ctx.beginPath();
        const windSway = Math.sin(this.getWindPhase() + enemy.x * 0.05) * 2 * breatheScale;
        ctx.ellipse(cx, by - 4 + animY, w / 2 * breatheScale, h / 3 + 1, 0, 0, Math.PI * 2);
        ctx.fill();
        // Head
        ctx.beginPath();
        const headDir = enemy.direction.x > 0 ? 1 : -1;
        ctx.arc(cx + headDir * (w / 2 - 2), by - 6 + animY, 6, 0, Math.PI * 2);
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
          ctx.moveTo(cx - 4, by - 11 + i * 2 + animY);
          ctx.lineTo(cx + 4, by - 11 + i * 2 + animY);
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
          ctx.moveTo(cx - 4, by - 5 + animY);
          ctx.lineTo(cx - 10 - i * 2, by - 3 + i * 2 + animY);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(cx + 4, by - 5 + animY);
          ctx.lineTo(cx + 10 + i * 2, by - 3 + i * 2 + animY);
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
        ctx.moveTo(cx - 4, by - 14 + animY);
        ctx.lineTo(cx + 3, by - 8 + animY);
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
        ctx.moveTo(cx, by - 6 + animY);
        ctx.lineTo(cx - 12, by - 10 + animY);
        ctx.lineTo(cx - 10, by - 4 + animY);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx, by - 6 + animY);
        ctx.lineTo(cx + 12, by - 10 + animY);
        ctx.lineTo(cx + 10, by - 4 + animY);
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
        ctx.moveTo(cx - 14, by - 10 + animY);
        ctx.lineTo(cx - 24, by - 6 + animY);
        ctx.lineTo(cx - 22, by - 12 + animY);
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
        ctx.moveTo(cx - 2, by - 14 + animY);
        ctx.lineTo(cx - 16, by - 28 + dfWing + animY);
        ctx.lineTo(cx - 8, by - 18 + animY);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx + 2, by - 14 + animY);
        ctx.lineTo(cx + 16, by - 28 + dfWing + animY);
        ctx.lineTo(cx + 8, by - 18 + animY);
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
        ctx.moveTo(cx, by - 24 + animY);
        ctx.lineTo(cx + 12, by - 4 + animY);
        ctx.lineTo(cx - 12, by - 4 + animY);
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
        ctx.moveTo(cx - 14, by - 4 + animY);
        ctx.lineTo(cx - 18, by + 2 + animY);
        ctx.lineTo(cx + 18, by + 2 + animY);
        ctx.lineTo(cx + 14, by - 4 + animY);
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
      ctx.fillText(`Lv.${def.level}`, cx, by - 32 + animY);
      ctx.textAlign = 'left';
    }

    ctx.globalAlpha = 1;


    // ── Draw enemy emoji icon above the body ──
    if (enemy.state !== 'dead') {
      const iconY = by - h / 2 - 14 + bob;
      ctx.font = '14px serif';
      ctx.textAlign = 'center';
      ctx.fillText(enemy.definition.icon, cx, iconY);
      ctx.textAlign = 'left';
    }
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

    // ── Torch Fire Effect ──
    if (tool?.toolType === 'torch') {
      const torchX = cx + player.facing.x * 12;
      const torchY = bodyTop + 2 + player.facing.y * 12;
      const time = performance.now() / 1000;

      // Flickering flame size and position
      const flameSize = 3 + Math.sin(time * 15) * 0.6;
      const flickerX = Math.sin(time * 20) * 0.5;
      const flickerY = Math.abs(Math.cos(time * 17)) * 1.5;

      // Warm glow halo
      const gradient = ctx.createRadialGradient(
        torchX + flickerX, torchY - 3 - flickerY, 0,
        torchX + flickerX, torchY - 3 - flickerY, flameSize * 4
      );
      gradient.addColorStop(0, 'rgba(255, 200, 50, 0.8)');
      gradient.addColorStop(0.3, 'rgba(255, 150, 20, 0.5)');
      gradient.addColorStop(0.6, 'rgba(255, 80, 10, 0.2)');
      gradient.addColorStop(1, 'rgba(255, 50, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(torchX + flickerX, torchY - 3 - flickerY, flameSize * 4, 0, Math.PI * 2);
      ctx.fill();

      // Flame body
      ctx.fillStyle = 'rgba(255, 180, 30, 0.85)';
      ctx.beginPath();
      ctx.arc(torchX + flickerX, torchY - 4 - flickerY, flameSize, 0, Math.PI * 2);
      ctx.fill();

      // Bright inner core
      ctx.fillStyle = 'rgba(255, 255, 200, 0.9)';
      ctx.beginPath();
      ctx.arc(torchX + flickerX * 0.5, torchY - 4 - flickerY * 0.5, flameSize * 0.5, 0, Math.PI * 2);
      ctx.fill();

      // Rising embers
      for (let i = 0; i < 5; i++) {
        const phase = time * 2.5 + i * 1.3;
        const ex = torchX + Math.sin(phase) * (4 + Math.sin(time + i * 0.7) * 2);
        const ey = torchY - 5 - Math.abs(Math.cos(phase * 0.6)) * 8 - i;
        const alpha = Math.max(0.1, Math.sin(phase * 2.5 + i) * 0.5 + 0.3);
        const size = 0.6 + Math.sin(phase * 1.8 + i * 0.5) * 0.3;
        ctx.fillStyle = `rgba(255, ${160 + Math.floor(Math.sin(phase * 3 + i) * 30)}, 40, ${alpha})`;
        ctx.beginPath();
        ctx.arc(ex, ey, Math.max(0.3, size), 0, Math.PI * 2);
        ctx.fill();
      }

      // Ground glow
      const groundGlow = ctx.createRadialGradient(torchX, by, 0, torchX, by, 10);
      groundGlow.addColorStop(0, 'rgba(255, 180, 50, 0.12)');
      groundGlow.addColorStop(1, 'rgba(255, 100, 20, 0)');
      ctx.fillStyle = groundGlow;
      ctx.beginPath();
      ctx.arc(torchX, by, 10, 0, Math.PI * 2);
      ctx.fill();
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

  /** Get luminosity percentage (0-100) by hour, following the sun cycle */
  private getLuminosity(hour: number): number {
    // 00:00–04:00: deep night (15–18%)
    if (hour < 4) return 15 + (hour / 4) * 3;
    // 04:00–05:00: pre-dawn transition (18% → 25%)
    if (hour < 5) return 18 + (hour - 4) * 7;
    // 05:00–08:00: gradual dawn (25% → 80%)
    if (hour < 8) return 25 + (hour - 5) * (55 / 3);
    // 08:00–10:00: morning brightening (80% → 100%)
    if (hour < 10) return 80 + (hour - 8) * 10;
    // 10:00–14:00: maximum luminosity (100%)
    if (hour < 14) return 100;
    // 14:00–15:00: afternoon slight dim (100% → 95%)
    if (hour < 15) return 100 - (hour - 14) * 5;
    // 15:00–19:00: gradual sunset (95% → 35%)
    if (hour < 19) return 95 - (hour - 15) * 15;
    // 19:00–20:00: evening transition (35% → 25%)
    if (hour < 20) return 35 - (hour - 19) * 10;
    // 20:00–23:00: early night (25% → 15%)
    if (hour < 23) return 25 - (hour - 20) * (10 / 3);
    // 23:00–00:00: late night stabilizing
    return 15 + (hour - 23) * 3;
  }

  private getNightAlpha(time: GameTime): number {
    const luminosity = this.getLuminosity(time.hour);
    return 1 - (luminosity / 100);
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

    // Wind influence for crop sway
    const windPhase = this.getWindPhase();
    const plantSway = Math.sin(windPhase + plot.x * 0.2 + plot.y * 0.15) * 1.5 +
                      Math.sin(performance.now() / 1800 + plot.x * 0.3) * 0.8;

    // ── Tilled soil (visible even without crops) ──
    // Darker brown than regular grass — clearly shows prepared ground
    if (plot.watered) {
      // Watered soil: darker, richer
      ctx.fillStyle = '#4a2a0a';
      ctx.fillRect(pos.x + 1, pos.y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
      // Moisture patch
      ctx.fillStyle = '#3a1a00';
      ctx.fillRect(pos.x + 4, pos.y + 4, TILE_SIZE - 8, TILE_SIZE - 8);
    } else {
      // Dry tilled soil: light brown with furrow lines
      ctx.fillStyle = '#7a5a3a';
      ctx.fillRect(pos.x + 1, pos.y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
      ctx.fillStyle = '#8d6e4a';
      ctx.fillRect(pos.x + 2, pos.y + 8, TILE_SIZE - 4, 3);
      ctx.fillRect(pos.x + 2, pos.y + 18, TILE_SIZE - 4, 3);
    }

    // Border (distinct edge vs regular grass)
    ctx.strokeStyle = '#5a3a1a';
    ctx.lineWidth = 1;
    ctx.strokeRect(pos.x + 1, pos.y + 1, TILE_SIZE - 2, TILE_SIZE - 2);

    // Furrow grid lines
    ctx.strokeStyle = plot.watered ? '#3a1a00' : '#6d4e3a';
    ctx.lineWidth = 0.5;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(pos.x + 2 + i * 7, pos.y + 2);
      ctx.lineTo(pos.x + 2 + i * 7, pos.y + TILE_SIZE - 2);
      ctx.stroke();
    }

    // ── Growth progress bar (always visible for seeded plots) ──
    if (plot.seedId) {
      const barWidth = TILE_SIZE - 4;
      const barHeight = 3;
      const barX = pos.x + 2;
      const barY = pos.y - 6;

      // Background
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(barX, barY, barWidth, barHeight);

      // Fill: green → yellow based on total progress (0 → 1)
      const totalProgress = Math.min(1, (plot.growthStage + plot.growthProgress) / 3);
      const fillWidth = Math.max(1, barWidth * totalProgress);
      const green = Math.floor(180 + 75 * (1 - totalProgress));
      const red = Math.floor(60 + 100 * totalProgress);
      ctx.fillStyle = `rgb(${red}, ${green}, 40)`;
      ctx.fillRect(barX, barY, fillWidth, barHeight);

      // Watered indicator (small blue dot next to bar)
      if (plot.watered) {
        ctx.fillStyle = '#44aaff';
        ctx.beginPath();
        ctx.arc(barX + barWidth + 3, barY + barHeight / 2, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ── Plant growth (with wind sway) ──
    if (plot.seedId && plot.growthStage > 0) {
      const stageColors = ['#4a7a2a', '#5a9a3a', '#6ab040', '#8ac050'];
      const stageSizes = [4, 6, 8, 10];
      const stage = Math.min(plot.growthStage, 3);
      const size = stageSizes[stage];
      const color = stageColors[stage];

      ctx.save();
      ctx.translate(pos.x + TILE_SIZE / 2 + plantSway * 0.3, pos.y + TILE_SIZE / 2);
      ctx.rotate(plantSway * 0.03);

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, size, 0, Math.PI * 2);
      ctx.fill();

      // Stem
      if (size > 4) {
        ctx.strokeStyle = '#3a6a1a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -size + 3);
        ctx.stroke();
      }

      ctx.restore();

      // Ready indicator (with pulse)
      if (plot.growthStage >= 3) {
        const pulse = Math.sin(performance.now() / 400) * 0.3 + 0.7;
        ctx.globalAlpha = pulse;
        ctx.fillStyle = '#ffdd00';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('✓', pos.x + TILE_SIZE / 2 + plantSway * 0.3, pos.y - 2);
        ctx.globalAlpha = 1;
        ctx.textAlign = 'left';
      }
    }

    // Watered shimmer overlay
    if (plot.watered) {
      const shimmer = Math.sin(performance.now() / 1200 + plot.x + plot.y) * 0.15 + 0.25;
      ctx.fillStyle = `rgba(100, 150, 255, ${shimmer})`;
      ctx.fillRect(pos.x + 2, pos.y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
    }
  }

  private drawStructure(struct: { itemId: string; x: number; y: number; width: number; height: number }): void {
    const { ctx, camera } = this;
    const pos = camera.worldToScreen(struct.x, struct.y);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(pos.x + 16, pos.y + 32, 16, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(pos.x + 16, pos.y + 30, 14, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    switch (struct.itemId) {
      case 'workbench':
        // ── Detailed Workbench ──
        const wTime = performance.now() / 1000;
        
        // Shadow under the workbench
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(pos.x + 16, pos.y + 30, 18, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Table legs (4 legs)
        ctx.fillStyle = '#6a3410';
        ctx.fillRect(pos.x + 5, pos.y + 18, 3, 12);  // Front-left
        ctx.fillRect(pos.x + 24, pos.y + 18, 3, 12); // Front-right
        ctx.fillRect(pos.x + 5, pos.y + 18, 3, 8);   // Back-left (shorter, perspective)
        ctx.fillRect(pos.x + 24, pos.y + 18, 3, 8);  // Back-right
        
        // Table top (main surface)
        ctx.fillStyle = '#A0522D';
        ctx.fillRect(pos.x + 3, pos.y + 12, 26, 8);
        
        // Table top highlight edge
        ctx.fillStyle = '#B8653A';
        ctx.fillRect(pos.x + 3, pos.y + 12, 26, 2);
        
        // Wood plank lines on surface
        ctx.strokeStyle = '#7a3a15';
        ctx.lineWidth = 0.5;
        for (let plank = 0; plank < 4; plank++) {
          const plankX = pos.x + 5 + plank * 6;
          ctx.beginPath();
          ctx.moveTo(plankX, pos.y + 14);
          ctx.lineTo(plankX, pos.y + 19);
          ctx.stroke();
        }
        
        // Cross-brace detail
        ctx.fillStyle = '#5a2a0a';
        ctx.fillRect(pos.x + 6, pos.y + 20, 20, 2);
        
        // ── Animated Vise on the left side ──
        const viseClamp = Math.sin(wTime * 1.2 + pos.x * 0.1) * 0.3 + 0.5;
        ctx.fillStyle = '#555';
        ctx.fillRect(pos.x + 2, pos.y + 10, 3, 10);  // Vise base
        ctx.fillStyle = '#777';
        ctx.fillRect(pos.x + 1, pos.y + 10 + viseClamp * 5, 2, 8);  // Sliding jaw
        ctx.fillStyle = '#333';
        ctx.fillRect(pos.x, pos.y + 14, 1, 4);  // Screw rod
        
        // ── Animated Hammer (right side, pendulum swing) ──
        const hammerAngle = Math.sin(wTime * 1.5 + pos.x) * 0.4;
        ctx.save();
        ctx.translate(pos.x + 14, pos.y + 8);
        ctx.rotate(hammerAngle);
        // Handle
        ctx.fillStyle = '#8B6914';
        ctx.fillRect(-1, 0, 2, 7);
        // Head
        ctx.fillStyle = '#777';
        ctx.fillRect(-4, -2, 8, 3);
        ctx.fillStyle = '#999';
        ctx.fillRect(-3, -1, 6, 1);  // Highlight
        ctx.restore();
        
        // ── Saw (reciprocating motion) ──
        const sawSlide = Math.sin(wTime * 2.0 + pos.x * 0.5) * 1.5;
        ctx.save();
        ctx.translate(pos.x + 24 + sawSlide, pos.y + 7);
        // Saw handle
        ctx.fillStyle = '#8B6914';
        ctx.fillRect(-2, 0, 5, 2);
        // Saw blade
        ctx.strokeStyle = '#aaa';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let t = 0; t < 6; t++) {
          const sx = t * 1.2;
          const sy = 2 + Math.sin(t * 2) * 0.8;
          if (t === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
        ctx.restore();
        
        // ── Chisel / Plane (center) ──
        const chiselAngle = Math.sin(wTime * 1.0 + pos.x * 0.3) * 0.1;
        ctx.save();
        ctx.translate(pos.x + 18, pos.y + 9);
        ctx.rotate(chiselAngle);
        ctx.fillStyle = '#888';
        ctx.fillRect(-1, -3, 2, 5);  // Metal rod
        ctx.fillStyle = '#666';
        ctx.fillRect(-2, -4, 4, 1);  // Flat head
        ctx.restore();
        
        // ── Wood shavings / particles falling ──
        const particleCount = 3;
        for (let i = 0; i < particleCount; i++) {
          const pPhase = wTime * 0.8 + i * 2.1 + pos.x * 0.2;
          const px = pos.x + 8 + Math.sin(pPhase * 1.3) * 5 + i * 4;
          const py = pos.y + 8 + (pPhase % 3) * 2;
          const pAlpha = 0.3 - ((pPhase % 3) / 3) * 0.25;
          const pSize = 1.5 + Math.sin(pPhase) * 0.5;
          ctx.fillStyle = `rgba(200, 160, 100, ${pAlpha})`;
          ctx.beginPath();
          ctx.arc(px, py, pSize, 0, Math.PI * 2);
          ctx.fill();
        }
        
        // ── Subtle warm glow around the workbench ──
        const wGlowAlpha = 0.06 + Math.sin(wTime * 0.8) * 0.02;
        ctx.fillStyle = `rgba(255, 200, 120, ${wGlowAlpha})`;
        ctx.beginPath();
        ctx.arc(pos.x + 16, pos.y + 16, 28, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'furnace':
        // Animated furnace body
        ctx.fillStyle = '#555';
        ctx.fillRect(pos.x + 6, pos.y + 8, 20, 20);
        ctx.fillStyle = '#444';
        ctx.fillRect(pos.x + 8, pos.y + 12, 16, 14);
        
        // Animated fire with glow
        const fGlow = Math.sin(performance.now() / 300 + pos.x) * 0.15 + 0.5;
        const fHeight = Math.sin(performance.now() / 200 + pos.x * 0.5) * 2 + 4;
        
        // Fire glow aura
        ctx.save();
        ctx.shadowColor = 'rgba(255, 120, 20, 0.5)';
        ctx.shadowBlur = 12 * (fGlow + 0.3);
        ctx.fillStyle = '#ff4400';
        ctx.beginPath();
        ctx.arc(pos.x + 16, pos.y + 18, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        
        // Main fire
        ctx.fillStyle = '#ff6600';
        ctx.fillRect(pos.x + 12, pos.y + 20 - fHeight, 8, 4 + fHeight);
        ctx.fillStyle = '#ffaa00';
        ctx.fillRect(pos.x + 14, pos.y + 16 - fHeight * 0.5, 4, 4 + fHeight * 0.5);
        // Hot core
        ctx.fillStyle = '#ffdd44';
        ctx.beginPath();
        ctx.arc(pos.x + 16, pos.y + 18 - fHeight * 0.3, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Ember particles rising
        const emberCount = 2 + Math.floor(fGlow * 2);
        for (let i = 0; i < emberCount; i++) {
          const eX = pos.x + 12 + Math.sin(performance.now() / 150 + i * 2 + pos.x) * 4 + 4;
          const eY = pos.y + 8 + Math.sin(performance.now() / 100 + i * 3 + pos.x * 0.7) * 2 + (i * 3);
          const eSize = 1 + Math.sin(performance.now() / 50 + i) * 0.5;
          ctx.fillStyle = `rgba(255, ${150 + Math.floor(Math.sin(performance.now() / 80 + i) * 50)}, 0, ${0.4 + Math.sin(performance.now() / 60 + i) * 0.2})`;
          ctx.beginPath();
          ctx.arc(eX, eY, eSize, 0, Math.PI * 2);
          ctx.fill();
        }
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
        // Torch flame glow
        const tGlow = Math.sin(performance.now() / 400 + pos.x + pos.y) * 0.2 + 0.6;
        ctx.fillStyle = `rgba(255, 200, 80, ${tGlow * 0.2})`;
        ctx.beginPath();
        ctx.arc(pos.x + 16, pos.y + 8, 24, 0, Math.PI * 2);
        ctx.fill();
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
      case 'workbench_advanced':
        // ── Advanced Workbench ──
        const awTime = performance.now() / 1000;
        
        // Shadow underneath
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath();
        ctx.ellipse(pos.x + 16, pos.y + 32, 22, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Iron-banded legs
        ctx.fillStyle = '#5a2a0a';
        ctx.fillRect(pos.x + 4, pos.y + 18, 4, 13);  // Front-left
        ctx.fillRect(pos.x + 24, pos.y + 18, 4, 13); // Front-right
        ctx.fillRect(pos.x + 4, pos.y + 18, 4, 9);   // Back-left
        ctx.fillRect(pos.x + 24, pos.y + 18, 4, 9);  // Back-right
        
        // Iron bands on legs
        ctx.fillStyle = '#666';
        ctx.fillRect(pos.x + 4, pos.y + 22, 4, 2);
        ctx.fillRect(pos.x + 24, pos.y + 22, 4, 2);
        ctx.fillRect(pos.x + 4, pos.y + 27, 4, 2);
        ctx.fillRect(pos.x + 24, pos.y + 27, 4, 2);
        
        // Main table surface (larger, thicker)
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(pos.x + 2, pos.y + 10, 28, 9);
        // Surface trim (iron edge)
        ctx.fillStyle = '#777';
        ctx.fillRect(pos.x + 2, pos.y + 10, 28, 1.5);
        ctx.fillRect(pos.x + 2, pos.y + 10, 1.5, 9);
        ctx.fillRect(pos.x + 28.5, pos.y + 10, 1.5, 9);
        
        // Cross-braces
        ctx.fillStyle = '#5a2a0a';
        ctx.fillRect(pos.x + 8, pos.y + 20, 16, 2);
        ctx.fillStyle = '#666';
        ctx.fillRect(pos.x + 7, pos.y + 20, 1, 3);
        ctx.fillRect(pos.x + 24, pos.y + 20, 1, 3);
        
        // Wood plank texture
        ctx.strokeStyle = '#6a3410';
        ctx.lineWidth = 0.5;
        for (let p = 0; p < 6; p++) {
          const px2 = pos.x + 4 + p * 4.5;
          ctx.beginPath();
          ctx.moveTo(px2, pos.y + 12);
          ctx.lineTo(px2, pos.y + 18);
          ctx.stroke();
        }
        
        // ── Iron Gear decoration (spinning slowly) ──
        const gearAngle = awTime * 0.5;
        ctx.save();
        ctx.translate(pos.x + 6, pos.y + 6);
        ctx.rotate(gearAngle);
        ctx.fillStyle = '#777';
        // Gear teeth
        for (let g = 0; g < 6; g++) {
          const ga = (g / 6) * Math.PI * 2;
          ctx.save();
          ctx.rotate(ga);
          ctx.fillRect(-1, 2, 2, 3);
          ctx.restore();
        }
        // Gear center
        ctx.fillStyle = '#999';
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#555';
        ctx.beginPath();
        ctx.arc(0, 0, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        
        // ── Second gear (smaller, opposite rotation) ──
        ctx.save();
        ctx.translate(pos.x + 26, pos.y + 6);
        ctx.rotate(-gearAngle * 1.3);
        ctx.fillStyle = '#888';
        for (let g = 0; g < 5; g++) {
          const ga = (g / 5) * Math.PI * 2;
          ctx.save();
          ctx.rotate(ga);
          ctx.fillRect(-0.8, 1.5, 1.5, 2.5);
          ctx.restore();
        }
        ctx.fillStyle = '#aaa';
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#666';
        ctx.beginPath();
        ctx.arc(0, 0, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        
        // ── Blueprint paper on the table ──
        ctx.fillStyle = '#d4c8a0';
        ctx.fillRect(pos.x + 20, pos.y + 14, 7, 5);
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(pos.x + 20, pos.y + 14, 7, 5);
        // Blueprint lines
        ctx.strokeStyle = '#335';
        ctx.beginPath();
        ctx.moveTo(pos.x + 21, pos.y + 15.5);
        ctx.lineTo(pos.x + 26, pos.y + 15.5);
        ctx.moveTo(pos.x + 22, pos.y + 16.5);
        ctx.lineTo(pos.x + 25, pos.y + 16.5);
        ctx.moveTo(pos.x + 21, pos.y + 17.5);
        ctx.lineTo(pos.x + 24, pos.y + 17.5);
        ctx.stroke();
        
        // ── Animated Crosscut saw (larger) ──
        const awSawSlide = Math.sin(awTime * 1.8 + pos.x) * 2;
        ctx.save();
        ctx.translate(pos.x + 12 + awSawSlide, pos.y + 7);
        ctx.fillStyle = '#8B6914';
        ctx.fillRect(-2, 0, 6, 2);
        ctx.strokeStyle = '#bbb';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let t2 = 0; t2 < 8; t2++) {
          const sx2 = t2 * 1.3;
          const sy2 = 2 + Math.sin(t2 * 2.5) * 1;
          if (t2 === 0) ctx.moveTo(sx2, sy2);
          else ctx.lineTo(sx2, sy2);
        }
        ctx.stroke();
        ctx.restore();
        
        // ── Hammer (faster swing, more pronounced) ──
        const awHammerAngle = Math.sin(awTime * 2.0 + pos.x) * 0.5;
        ctx.save();
        ctx.translate(pos.x + 18, pos.y + 6);
        ctx.rotate(awHammerAngle);
        ctx.fillStyle = '#8B6914';
        ctx.fillRect(-1, 0, 2, 8);
        ctx.fillStyle = '#888';
        ctx.fillRect(-4, -3, 8, 4);
        ctx.fillStyle = '#aaa';
        ctx.fillRect(-3, -2, 6, 2);
        ctx.restore();
        
        // ── Wrench (static, leaning) ──
        ctx.save();
        ctx.translate(pos.x + 23, pos.y + 6);
        ctx.rotate(0.2);
        ctx.fillStyle = '#777';
        ctx.fillRect(-0.5, 0, 1, 7);
        ctx.fillRect(-2.5, -1, 5, 3);  // Wrench head
        ctx.fillStyle = '#999';
        ctx.fillRect(-0.5, -1, 1, 2);
        ctx.restore();
        
        // ── Metal shavings / spark particles ──
        for (let i = 0; i < 4; i++) {
          const phase = awTime * 0.6 + i * 1.7 + pos.x * 0.3;
          const sx = pos.x + 6 + Math.sin(phase * 1.5) * 8 + i * 3;
          const sy = pos.y + 7 + (phase % 4) * 1.8;
          const sAlpha = 0.35 - ((phase % 4) / 4) * 0.3;
          ctx.fillStyle = `rgba(200, 180, 160, ${sAlpha})`;
          ctx.beginPath();
          ctx.arc(sx, sy, 1.5 + Math.sin(phase) * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
        
        // ── Blue glow aura (tech/crafting aura) ──
        const awGlow = 0.08 + Math.sin(awTime * 0.6) * 0.03;
        ctx.fillStyle = `rgba(100, 180, 255, ${awGlow})`;
        ctx.beginPath();
        ctx.arc(pos.x + 16, pos.y + 15, 32, 0, Math.PI * 2);
        ctx.fill();
        break;
      default:
        ctx.fillStyle = '#666';
        ctx.fillRect(pos.x + 4, pos.y + 4, struct.width - 8, struct.height - 8);
        break;
    }
  }

  /** Draw the safe zone boundary visual effect */
  private drawSafeZone(zone: SafeZone): void {
    const { ctx, camera } = this;
    const pos = camera.worldToScreen(zone.centerX, zone.centerY);
    const radius = zone.radius * TILE_SIZE * camera.zoom;

    // Outer glow ring (pulsing)
    const pulse = 0.85 + 0.15 * Math.sin(this.state.gameTime.totalTicks * 0.02);
    const gradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, radius);
    gradient.addColorStop(0, `rgba(80, 255, 80, ${0.05 * pulse})`);
    gradient.addColorStop(0.5, `rgba(80, 255, 80, ${0.1 * pulse})`);
    gradient.addColorStop(1, `rgba(80, 255, 80, 0)`);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Boundary ring
    ctx.strokeStyle = `rgba(80, 255, 80, ${0.4 * pulse})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Corner markers at cardinal directions
    const markers = [
      { angle: 0, dx: 1, dy: 0 },
      { angle: Math.PI / 2, dx: 0, dy: 1 },
      { angle: Math.PI, dx: -1, dy: 0 },
      { angle: Math.PI * 1.5, dx: 0, dy: -1 },
    ];
    ctx.fillStyle = `rgba(80, 255, 80, ${0.6 * pulse})`;
    for (const m of markers) {
      const mx = pos.x + Math.cos(m.angle) * radius;
      const my = pos.y + Math.sin(m.angle) * radius;
      ctx.beginPath();
      ctx.arc(mx, my, 3, 0, Math.PI * 2);
      ctx.fill();
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
    // Weapons: sword, bow → equipment 'weapon' slot
    if (item.toolType === 'sword' || item.toolType === 'bow') return 'weapon';
    // Tools (axe, pickaxe, etc.) → go to hotbar on double-click, not equipment
    if (item.armorSlot) return item.armorSlot;
    return null;
  }



}

function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}
