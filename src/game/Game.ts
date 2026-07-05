// ═══════════════════════════════════════════════════════════════════
// Farm Survival - Main Game Engine
// ═══════════════════════════════════════════════════════════════════

import {
  GameState, PlayerState, WorldState, GameTime, InventorySlot,
  Vec2, TileType, TILE_SIZE, PLAYER_SPEED, PLAYER_SIZE, DAY_LENGTH,
  TICK_RATE, INTERACT_RANGE, ATTACK_RANGE, PANEL_TYPE, PanelType,
  Weather, Season, Biome, EnemyEntity, NpcEntity, DroppedItem,
  DamageNumber, Particle, GameUIState, Notification, ItemCategory,
  GameSettings, Rarity, NpcType, ItemDefinition, ArmorSlot, HotbarIndex,
} from '../core/Types';
import { Input } from '../core/Input';
import { Camera } from '../core/Camera';
import {
  clamp, distance, normalize, addVec, scaleVec, generateId,
  SeededRandom, fractalNoise, RARITY_COLORS,
} from '../core/Utils';
import { WorldGenerator, TILE_COLORS, getSkyColor, getSeasonTint, getSeasonForDay } from '../world/WorldGenerator';
import { ITEMS, getItem } from '../data/Items';
import { RECIPES } from '../data/Recipes';
import { ENEMIES } from '../data/Enemies';
import { NPCS } from '../data/Npcs';
import { QUESTS, getQuestById } from '../data/Quests';
import { SKILLS, getSkillsByTree } from '../data/Skills';

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

  // World data
  biomeMap: Biome[][] = [];
  tileMap: TileType[][] = [];
  heightMap: number[][] = [];
  resources: { x: number; y: number; type: string; itemId: string; hp: number; id: string }[] = [];

  // Resource sizes for collision
  private resourceSizes: Record<string, { w: number; h: number; hp: number }> = {
    tree: { w: 24, h: 40, hp: 20 },
    bush: { w: 16, h: 16, hp: 8 },
    rock: { w: 20, h: 18, hp: 25 },
    iron_rock: { w: 20, h: 18, hp: 35 },
    gold_rock: { w: 18, h: 16, hp: 40 },
    coal_rock: { w: 18, h: 18, hp: 30 },
    crystal_node: { w: 16, h: 20, hp: 45 },
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

    // Generate resources
    const resourceDefs = generator.generateResources(biomeMap);
    this.resources = resourceDefs.map(r => ({
      ...r,
      hp: this.resourceSizes[r.type]?.hp ?? 10,
      id: generateId(),
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
          hp: 100, hunger: 100, energy: 100,
          maxHp: 100, maxHunger: 100, maxEnergy: 100,
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

    // E to interact
    if (input.isKeyPressed('e')) {
      this.tryInteract();
    }

    // Q to attack
    if (input.isKeyPressed('q') || input.isKeyPressed(' ')) {
      this.tryAttack();
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

    // Escape to close panels
    if (input.isKeyPressed('escape')) {
      this.ui.activePanel = 'none';
      this.ui.showMap = false;
    }

    // F to use item from hotbar
    if (input.isKeyPressed('f')) {
      this.useHotbarItem();
    }

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
      const worldW = WORLD_WIDTH * TILE_SIZE;
      const worldH = WORLD_HEIGHT * TILE_SIZE;

      // Check tile collision
      const tileX = Math.floor((newX + PLAYER_SIZE / 2) / TILE_SIZE);
      const tileY = Math.floor((newY + PLAYER_SIZE / 2) / TILE_SIZE);

      if (tileX >= 0 && tileX < WORLD_WIDTH && tileY >= 0 && tileY < WORLD_HEIGHT) {
        const tile = this.tileMap[tileY]?.[tileX];
        const walkable = tile !== TileType.Water && tile !== TileType.DeepWater &&
          tile !== TileType.Wall && tile !== TileType.CaveWall && tile !== TileType.Lava;

        if (walkable) {
          // Check resource collision
          let blocked = false;
          for (const res of this.resources) {
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

    // Discover biome
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

  private tryInteract(): void {
    const { player } = this.state;
    const px = player.x + PLAYER_SIZE / 2;
    const py = player.y + PLAYER_SIZE / 2;

    // Check NPCs
    for (const npc of this.npcs) {
      const dist = distance({ x: px, y: py }, { x: npc.x + 12, y: npc.y + 12 });
      if (dist < INTERACT_RANGE) {
        // Start dialogue
        this.ui.activeDialogueNpc = npc;
        this.ui.activePanel = 'dialogue';
        return;
      }
    }

    // Check resources
    for (let i = this.resources.length - 1; i >= 0; i--) {
      const res = this.resources[i];
      const size = this.resourceSizes[res.type];
      if (!size) continue;
      const dist = distance({ x: px, y: py }, { x: res.x + size.w / 2, y: res.y + size.h / 2 });
      if (dist < INTERACT_RANGE) {
        this.gatherResource(res, i);
        return;
      }
    }

    // Pick up dropped items
    for (let i = this.droppedItems.length - 1; i >= 0; i--) {
      const di = this.droppedItems[i];
      const dist = distance({ x: px, y: py }, { x: di.x, y: di.y });
      if (dist < INTERACT_RANGE) {
        if (this.addToInventory(di.itemId, di.count)) {
          this.droppedItems.splice(i, 1);
          this.addNotification(`+${di.count} ${getItem(di.itemId)?.name || di.itemId}`, 'item');
        }
      }
    }
  }

  private gatherResource(res: { x: number; y: number; type: string; itemId: string; hp: number; id: string }, index: number): void {
    const { player } = this.state;
    const tool = this.getCurrentItem();

    let power = 1;
    if (tool?.toolType === 'axe' || tool?.toolType === 'sword') power = tool.choppingPower ?? 3;
    if (tool?.toolType === 'pickaxe') power = tool.miningPower ?? 3;

    // Skill bonus
    if (res.type.includes('rock') || res.type.includes('iron') || res.type.includes('gold') || res.type.includes('coal') || res.type.includes('crystal')) {
      power += this.state.skills['miner'] || 0;
    }
    if (res.type === 'tree' || res.type === 'bush') {
      power += this.state.skills['lumberjack'] || 0;
    }

    res.hp -= power;
    this.spawnParticles(res.x + 10, res.y + 10, '#8B4513', 3);

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

    // Gain XP
    this.gainXp(2);

    // Double yield chance from skill
    let count = 1;
    if (this.state.skills['double_yield'] && Math.random() < 0.2) count = 2;

    if (res.hp <= 0) {
      this.addToInventory(res.itemId, count);
      this.addNotification(`+${count} ${getItem(res.itemId)?.name || res.itemId}`, 'item');
      this.spawnParticles(res.x + 10, res.y + 10, '#8B4513', 8);
      this.resources.splice(index, 1);

      // Drop extra loot sometimes
      if (res.type === 'tree' && Math.random() < 0.15) {
        this.addToInventory('fiber', 1);
      }
      if ((res.type === 'iron_rock' || res.type === 'gold_rock') && Math.random() < 0.1) {
        this.addToInventory('coal', 1);
      }
      if (res.type === 'crystal_node' && Math.random() < 0.05) {
        this.addToInventory('magic_dust', 1);
      }
    }
  }

  private tryAttack(): void {
    const { player } = this.state;
    if (player.attackTimer > 0 || player.stamina < 10) return;

    const tool = this.getCurrentItem();
    const damage = (tool?.damage ?? 3) + player.stats.strength;
    const range = tool?.range ?? ATTACK_RANGE;
    const speed = tool?.speed ?? 1;

    player.isAttacking = true;
    player.attackTimer = 0.4 / speed;
    player.stamina -= 10;

    // Check enemy hits
    const px = player.x + PLAYER_SIZE / 2;
    const py = player.y + PLAYER_SIZE / 2;
    const attackX = px + player.facing.x * range;
    const attackY = py + player.facing.y * range;

    for (const enemy of this.enemies) {
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
        this.spawnParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#ff4444', 5);

        if (enemy.hp <= 0) {
          this.killEnemy(enemy);
        }
      }
    }

    // Attack animation particles
    this.spawnParticles(attackX, attackY, '#ffffff', 3);
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
            this.state.player.stats.energy = Math.min(
              this.state.player.stats.maxEnergy,
              this.state.player.stats.energy + effect.value
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
  private updateEnemies(dt: number): void {
    const playerPos = {
      x: this.state.player.x + PLAYER_SIZE / 2,
      y: this.state.player.y + PLAYER_SIZE / 2,
    };

    for (const enemy of this.enemies) {
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
        if (tileX >= 0 && tileX < WORLD_WIDTH && tileY >= 0 && tileY < WORLD_HEIGHT) {
          const tile = this.tileMap[tileY][tileX];
          if (tile !== TileType.Water && tile !== TileType.DeepWater && tile !== TileType.Wall) {
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

        if (tX >= 0 && tX < WORLD_WIDTH && tY >= 0 && tY < WORLD_HEIGHT) {
          const tile = this.tileMap[tY][tX];
          if (tile !== TileType.Water && tile !== TileType.DeepWater && tile !== TileType.Wall) {
            enemy.x = px;
            enemy.y = py;
          }
        }
      }
    }

    // Remove fully dead enemies
    this.enemies = this.enemies.filter(e => !(e.state === 'dead' && e.deathTimer <= 0));
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

    // Respawn at village center
    const cx = (WORLD_WIDTH * TILE_SIZE) / 2;
    const cy = (WORLD_HEIGHT * TILE_SIZE) / 2;
    this.state.player.x = cx;
    this.state.player.y = cy;

    this.addNotification('Você morreu! Perdeu 20% do ouro.', 'error');
  }

  // ── Survival & Time ─────────────────────────────────────────────
  private updateSurvival(dt: number): void {
    const { stats } = this.state.player;

    // Hunger decreases over time
    const ironStomachLevel = this.state.skills['iron_stomach'] || 0;
    const hungerRate = 0.8 - ironStomachLevel * 0.15;
    stats.hunger -= hungerRate * dt;

    if (stats.hunger <= 0) {
      stats.hunger = 0;
      stats.hp -= 2 * dt;
      if (stats.hp <= 0) this.playerDeath();
    }
  }

  private updateRegeneration(dt: number): void {
    const { stats } = this.state.player;
    const quickHealLevel = this.state.skills['quick_heal'] || 0;

    // Regen HP when well-fed
    if (stats.hunger > stats.maxHunger * 0.5) {
      const regenRate = 1 + quickHealLevel * 0.5;
      stats.hp = Math.min(stats.maxHp, stats.hp + regenRate * dt);
    }

    // Energy regen
    const secondWindLevel = this.state.skills['second_wind'] || 0;
    stats.energy = Math.min(stats.maxEnergy, stats.energy + (5 + secondWindLevel * 2) * dt);
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
      const weathers = [Weather.Clear, Weather.Clear, Weather.Clear, Weather.Rain, Weather.Fog];
      if (gt.season === Season.Winter) weathers.push(Weather.Snow);
      if (gt.season === Season.Autumn) weathers.push(Weather.Rain, Weather.HeavyRain);

      gt.weather = rng.pick(weathers);
      gt.weatherTimer = 300 + rng.range(0, 600);
    }
  }

  private updateCamera(dt: number): void {
    this.camera.follow({ x: this.state.player.x, y: this.state.player.y });
    this.camera.update(dt);
    this.camera.clampToWorld(WORLD_WIDTH * TILE_SIZE, WORLD_HEIGHT * TILE_SIZE);
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
    this.damageNumbers = this.damageNumbers.filter(dn => d.timer > 0);
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

  private completeQuest(quest: { definition: any; progress: any; status: string }): void {
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
    stats.maxEnergy += 5;
    stats.energy = stats.maxEnergy;
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
    ctx.fillStyle = getSkyColor(gameTime);
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.scale(camera.zoom, camera.zoom);

    // Calculate visible tile range
    const startTileX = Math.max(0, Math.floor(camera.x / TILE_SIZE) - 1);
    const startTileY = Math.max(0, Math.floor(camera.y / TILE_SIZE) - 1);
    const endTileX = Math.min(WORLD_WIDTH, Math.ceil((camera.x + canvas.width / camera.zoom) / TILE_SIZE) + 1);
    const endTileY = Math.min(WORLD_HEIGHT, Math.ceil((camera.y + canvas.height / camera.zoom) / TILE_SIZE) + 1);

    // Draw tiles
    for (let y = startTileY; y < endTileY; y++) {
      for (let x = startTileX; x < endTileX; x++) {
        const tile = this.tileMap[y]?.[x];
        if (tile === undefined) continue;

        const sx = x * TILE_SIZE;
        const sy = y * TILE_SIZE;
        const screenPos = camera.worldToScreen(sx, sy);

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

        // Grid lines (subtle)
        ctx.strokeStyle = 'rgba(0,0,0,0.05)';
        ctx.strokeRect(screenPos.x, screenPos.y, TILE_SIZE, TILE_SIZE);
      }
    }

    // Draw resources (trees, rocks, etc.)
    for (const res of this.resources) {
      if (!camera.isVisible(res.x, res.y, 24, 40)) continue;
      this.drawResource(res);
    }

    // Draw dropped items
    for (const di of this.droppedItems) {
      const item = getItem(di.itemId);
      if (!item) continue;
      const pos = camera.worldToScreen(di.x, di.y);
      ctx.font = '16px serif';
      ctx.fillText(item.icon, pos.x - 8, pos.y + 5);
    }

    // Draw NPCs
    for (const npc of this.npcs) {
      if (!camera.isVisible(npc.x, npc.y, npc.width, npc.height)) continue;
      this.drawNpc(npc);
    }

    // Draw enemies
    for (const enemy of this.enemies) {
      if (!camera.isVisible(enemy.x, enemy.y, enemy.width, enemy.height)) continue;
      this.drawEnemy(enemy);
    }

    // Draw player
    this.drawPlayer();

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

    // Night overlay
    if (gameTime.isNight) {
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

    // Weather effects
    this.drawWeather();

    // Season tint
    const seasonTint = getSeasonTint(gameTime.season);
    ctx.fillStyle = seasonTint;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  private drawResource(res: { x: number; y: number; type: string; itemId: string }): void {
    const { ctx, camera } = this;
    const pos = camera.worldToScreen(res.x, res.y);

    switch (res.type) {
      case 'tree': {
        // Trunk
        ctx.fillStyle = '#5a3a1a';
        ctx.fillRect(pos.x + 8, pos.y + 20, 8, 20);
        // Leaves
        ctx.fillStyle = '#2d5a1e';
        ctx.beginPath();
        ctx.arc(pos.x + 12, pos.y + 12, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#3d7a2e';
        ctx.beginPath();
        ctx.arc(pos.x + 10, pos.y + 8, 10, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'bush': {
        ctx.fillStyle = '#4a8a3a';
        ctx.beginPath();
        ctx.arc(pos.x + 8, pos.y + 8, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ff4444';
        ctx.beginPath();
        ctx.arc(pos.x + 6, pos.y + 5, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(pos.x + 10, pos.y + 7, 2, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'rock': {
        ctx.fillStyle = '#7a7a7a';
        ctx.beginPath();
        ctx.moveTo(pos.x + 10, pos.y);
        ctx.lineTo(pos.x + 20, pos.y + 8);
        ctx.lineTo(pos.x + 18, pos.y + 18);
        ctx.lineTo(pos.x + 2, pos.y + 18);
        ctx.lineTo(pos.x, pos.y + 6);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#9a9a9a';
        ctx.beginPath();
        ctx.arc(pos.x + 8, pos.y + 8, 3, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'iron_rock': {
        ctx.fillStyle = '#6a6a6a';
        ctx.beginPath();
        ctx.moveTo(pos.x + 10, pos.y);
        ctx.lineTo(pos.x + 20, pos.y + 8);
        ctx.lineTo(pos.x + 18, pos.y + 18);
        ctx.lineTo(pos.x + 2, pos.y + 18);
        ctx.lineTo(pos.x, pos.y + 6);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#cd7f32';
        ctx.beginPath();
        ctx.arc(pos.x + 7, pos.y + 9, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(pos.x + 14, pos.y + 12, 2, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'gold_rock': {
        ctx.fillStyle = '#5a5a5a';
        ctx.beginPath();
        ctx.moveTo(pos.x + 10, pos.y);
        ctx.lineTo(pos.x + 18, pos.y + 6);
        ctx.lineTo(pos.x + 16, pos.y + 16);
        ctx.lineTo(pos.x + 4, pos.y + 16);
        ctx.lineTo(pos.x + 2, pos.y + 4);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(pos.x + 8, pos.y + 8, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(pos.x + 12, pos.y + 11, 2, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'coal_rock': {
        ctx.fillStyle = '#4a4a4a';
        ctx.beginPath();
        ctx.moveTo(pos.x + 10, pos.y + 2);
        ctx.lineTo(pos.x + 18, pos.y + 8);
        ctx.lineTo(pos.x + 16, pos.y + 18);
        ctx.lineTo(pos.x + 4, pos.y + 18);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.arc(pos.x + 9, pos.y + 10, 3, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'crystal_node': {
        ctx.fillStyle = '#4a8aaa';
        ctx.beginPath();
        ctx.moveTo(pos.x + 8, pos.y);
        ctx.lineTo(pos.x + 14, pos.y + 6);
        ctx.lineTo(pos.x + 12, pos.y + 18);
        ctx.lineTo(pos.x + 4, pos.y + 18);
        ctx.lineTo(pos.x + 2, pos.y + 6);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#8acaff';
        ctx.beginPath();
        ctx.moveTo(pos.x + 10, pos.y + 4);
        ctx.lineTo(pos.x + 12, pos.y + 8);
        ctx.lineTo(pos.x + 8, pos.y + 8);
        ctx.closePath();
        ctx.fill();
        break;
      }
    }
  }

  private drawNpc(npc: NpcEntity): void {
    const { ctx, camera } = this;
    const pos = camera.worldToScreen(npc.x, npc.y);

    // Body
    ctx.fillStyle = npc.definition.color;
    ctx.fillRect(pos.x + 4, pos.y + 8, 16, 14);

    // Head
    ctx.fillStyle = '#ffcc99';
    ctx.fillRect(pos.x + 6, pos.y, 12, 10);

    // Hat/feature
    ctx.fillStyle = npc.definition.color;
    ctx.fillRect(pos.x + 4, pos.y - 2, 16, 4);

    // Name
    ctx.font = '10px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(npc.definition.name, pos.x + 12, pos.y - 6);

    // Interaction indicator
    const dist = distance(
      { x: this.state.player.x + PLAYER_SIZE / 2, y: this.state.player.y + PLAYER_SIZE / 2 },
      { x: npc.x + 12, y: npc.y + 12 }
    );
    if (dist < INTERACT_RANGE) {
      ctx.font = '12px monospace';
      ctx.fillStyle = '#ffdd00';
      ctx.fillText('[E] Falar', pos.x + 12, pos.y - 18);
    }

    ctx.textAlign = 'left';
  }

  private drawEnemy(enemy: EnemyEntity): void {
    const { ctx, camera } = this;
    const pos = camera.worldToScreen(enemy.x, enemy.y);

    // Body
    ctx.fillStyle = enemy.definition.color;
    if (enemy.state === 'dead') {
      ctx.globalAlpha = Math.max(0, enemy.deathTimer * 2);
    }
    ctx.fillRect(pos.x, pos.y, enemy.width, enemy.height);

    // Eyes
    if (enemy.state !== 'dead') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(pos.x + 4, pos.y + 4, 4, 4);
      ctx.fillRect(pos.x + enemy.width - 8, pos.y + 4, 4, 4);
      ctx.fillStyle = '#000000';
      ctx.fillRect(pos.x + 5, pos.y + 5, 2, 2);
      ctx.fillRect(pos.x + enemy.width - 7, pos.y + 5, 2, 2);
    }

    // HP bar
    if (enemy.state !== 'dead' && enemy.hp < enemy.maxHp) {
      const barWidth = enemy.width;
      const barHeight = 3;
      const hpRatio = enemy.hp / enemy.maxHp;

      ctx.fillStyle = '#333';
      ctx.fillRect(pos.x, pos.y - 6, barWidth, barHeight);
      ctx.fillStyle = hpRatio > 0.5 ? '#4caf50' : hpRatio > 0.25 ? '#ff9800' : '#f44336';
      ctx.fillRect(pos.x, pos.y - 6, barWidth * hpRatio, barHeight);
    }

    // Level indicator
    if (enemy.state !== 'dead') {
      ctx.font = '8px monospace';
      ctx.fillStyle = '#ffcc00';
      ctx.textAlign = 'center';
      ctx.fillText(`Lv.${enemy.definition.level}`, pos.x + enemy.width / 2, pos.y - 10);
      ctx.textAlign = 'left';
    }

    ctx.globalAlpha = 1;
  }

  private drawPlayer(): void {
    const { ctx, camera } = this;
    const { player } = this.state;
    const pos = camera.worldToScreen(player.x, player.y);

    // Flash when invincible
    if (player.invincibleTimer > 0 && Math.floor(player.invincibleTimer * 10) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    // Body
    ctx.fillStyle = '#2196f3';
    ctx.fillRect(pos.x + 4, pos.y + 8, PLAYER_SIZE - 8, PLAYER_SIZE - 10);

    // Head
    ctx.fillStyle = '#ffcc99';
    ctx.fillRect(pos.x + 6, pos.y, PLAYER_SIZE - 12, 10);

    // Hair
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(pos.x + 5, pos.y - 2, PLAYER_SIZE - 10, 4);

    // Eyes based on facing
    ctx.fillStyle = '#000';
    const eyeOffsetX = player.facing.x > 0.3 ? 2 : player.facing.x < -0.3 ? -2 : 0;
    ctx.fillRect(pos.x + 8 + eyeOffsetX, pos.y + 3, 2, 2);
    ctx.fillRect(pos.x + 14 + eyeOffsetX, pos.y + 3, 2, 2);

    // Attack animation
    if (player.isAttacking) {
      const tool = this.getCurrentItem();
      ctx.fillStyle = '#888';
      const attackX = pos.x + PLAYER_SIZE / 2 + player.facing.x * 20;
      const attackY = pos.y + PLAYER_SIZE / 2 + player.facing.y * 20;
      ctx.fillRect(attackX - 2, attackY - 2, 4, 4);
    }

    // Equipment visual
    if (player.equipment.helmet) {
      ctx.fillStyle = '#666';
      ctx.fillRect(pos.x + 5, pos.y - 3, PLAYER_SIZE - 10, 3);
    }

    ctx.globalAlpha = 1;
  }

  private getBiomeGrassColor(biome: Biome): string {
    const colors: Record<Biome, string> = {
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

  private drawWeather(): void {
    const { ctx, canvas, gameTime } = this;
    const weather = gameTime.weather;

    if (weather === Weather.Rain || weather === Weather.HeavyRain) {
      const intensity = weather === Weather.HeavyRain ? 100 : 50;
      ctx.strokeStyle = 'rgba(150, 180, 255, 0.3)';
      ctx.lineWidth = 1;
      for (let i = 0; i < intensity; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 2, y + 10);
        ctx.stroke();
      }
    }

    if (weather === Weather.Fog) {
      ctx.fillStyle = 'rgba(200, 200, 220, 0.15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (weather === Weather.Snow) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      for (let i = 0; i < 40; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        ctx.beginPath();
        ctx.arc(x, y, 1 + Math.random() * 2, 0, Math.PI * 2);
        ctx.fill();
      }
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

  equipItem(slotIndex: number, from: 'hotbar' | 'inventory'): boolean {
    const sourceSlots = from === 'hotbar' ? this.state.player.hotbar : this.state.player.inventory;
    const slot = sourceSlots[slotIndex];
    if (!slot?.item) return false;

    const item = slot.item;

    // Determine equipment slot
    let equipSlot: keyof typeof this.state.player.equipment | null = null;

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
}

function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}
