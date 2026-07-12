// ═══════════════════════════════════════════════════════════════════
// Farm Survival - Save/Load System
// ═══════════════════════════════════════════════════════════════════

import { GameState, InventorySlot, ItemDefinition } from '../core/Types';
import { getItem } from '../data/Items';

const SAVE_PREFIX = 'farm_survival_';
const AUTO_SAVE_KEY = 'farm_survival_auto';
const MAX_SAVE_SLOTS = 5;

export interface SaveData {
  version: number;
  timestamp: number;
  gameState: SerializedGameState;
}

interface SerializedGameState {
  player: {
    x: number;
    y: number;
    facing: { x: number; y: number };
    stats: GameState['player']['stats'];
    inventory: SerializedSlot[];
    hotbar: SerializedSlot[];
    equipment: Record<string, SerializedSlot | null>;
    currentTool: number;
    stamina: number;
    maxStamina: number;
    mana: number;
    maxMana: number;
    selectedSpell: number;
    spellCooldown: number;
  };
  quests: GameState['quests'];
  skills: GameState['skills'];
  structures: GameState['structures'];
  safeZones: GameState['safeZones'];
  storageChests: GameState['storageChests'];
  activeStorageChestId: string | null;
  farmPlots: GameState['farmPlots'];
  discoveredAreas: string[];
  gameTime: GameState['gameTime'];
  settings: GameState['settings'];
  worldSeed: number;
}

interface SerializedSlot {
  itemId: string | null;
  count: number;
  durability?: number;
}

const SAVE_VERSION = 1;

// ── Serialization ─────────────────────────────────────────────────
function serializeSlot(slot: InventorySlot): SerializedSlot {
  return {
    itemId: slot.item?.id ?? null,
    count: slot.count,
    durability: slot.durability,
  };
}

function deserializeSlot(data: SerializedSlot): InventorySlot {
  const item = data.itemId ? getItem(data.itemId) ?? null : null;
  return {
    item,
    count: data.count,
    durability: data.durability,
  };
}

function serializeState(state: GameState): SerializedGameState {
  return {
    player: {
      x: state.player.x,
      y: state.player.y,
      facing: { ...state.player.facing },
      stats: { ...state.player.stats },
      inventory: state.player.inventory.map(serializeSlot),
      hotbar: state.player.hotbar.map(serializeSlot),
      equipment: {
        helmet: state.player.equipment.helmet ? serializeSlot(state.player.equipment.helmet) : null,
        chest: state.player.equipment.chest ? serializeSlot(state.player.equipment.chest) : null,
        boots: state.player.equipment.boots ? serializeSlot(state.player.equipment.boots) : null,
        gloves: state.player.equipment.gloves ? serializeSlot(state.player.equipment.gloves) : null,
        ring: state.player.equipment.ring ? serializeSlot(state.player.equipment.ring) : null,
        amulet: state.player.equipment.amulet ? serializeSlot(state.player.equipment.amulet) : null,
        weapon: state.player.equipment.weapon ? serializeSlot(state.player.equipment.weapon) : null,
        tool: state.player.equipment.tool ? serializeSlot(state.player.equipment.tool) : null,
      },
      currentTool: state.player.currentTool,
      stamina: state.player.stamina,
      maxStamina: state.player.maxStamina,
      mana: state.player.mana,
      maxMana: state.player.maxMana,
      selectedSpell: state.player.selectedSpell,
      spellCooldown: state.player.spellCooldown,
    },
    quests: state.quests.map(q => ({
      ...q,
      progress: { ...q.progress },
    })),
    skills: { ...state.skills },
    structures: state.structures.map(s => ({ ...s })),
    safeZones: state.safeZones.map(z => ({ ...z })),
    storageChests: state.storageChests.map(c => ({ id: c.id, structureId: c.structureId, name: c.name, slots: c.slots.map(s => ({ ...s })), maxSlots: c.maxSlots })),
    activeStorageChestId: state.activeStorageChestId,
    farmPlots: state.farmPlots.map(p => ({ ...p })),
    discoveredAreas: [...state.discoveredAreas],
    gameTime: { ...state.gameTime },
    settings: { ...state.settings },
    worldSeed: state.world.seed,
  };
}

function deserializeState(data: SerializedGameState): Partial<GameState> {
  return {
    player: {
      x: data.player.x,
      y: data.player.y,
      facing: data.player.facing,
      stats: data.player.stats,
      mana: data.player.mana ?? 100,
      maxMana: data.player.maxMana ?? 100,
      selectedSpell: data.player.selectedSpell ?? 0,
      spellCooldown: data.player.spellCooldown ?? 0,
      statusEffects: (data.player as any).statusEffects || [],
      inventory: data.player.inventory.map(deserializeSlot),
      hotbar: data.player.hotbar.map(deserializeSlot),
      equipment: {
        helmet: data.player.equipment.helmet ? deserializeSlot(data.player.equipment.helmet) : null,
        chest: data.player.equipment.chest ? deserializeSlot(data.player.equipment.chest) : null,
        boots: data.player.equipment.boots ? deserializeSlot(data.player.equipment.boots) : null,
        gloves: data.player.equipment.gloves ? deserializeSlot(data.player.equipment.gloves) : null,
        ring: data.player.equipment.ring ? deserializeSlot(data.player.equipment.ring) : null,
        amulet: data.player.equipment.amulet ? deserializeSlot(data.player.equipment.amulet) : null,
        weapon: data.player.equipment.weapon ? deserializeSlot(data.player.equipment.weapon) : null,
        tool: data.player.equipment.tool ? deserializeSlot(data.player.equipment.tool) : null,
      },
      isAttacking: false,
      attackTimer: 0,
      invincibleTimer: 0,
      currentTool: data.player.currentTool,
      stamina: data.player.stamina,
      maxStamina: data.player.maxStamina,
      exhaustionTimer: 0,
      isExhausted: false,
    },
    quests: data.quests,
    skills: data.skills,
    structures: data.structures,
    safeZones: data.safeZones,
    storageChests: data.storageChests,
    activeStorageChestId: data.activeStorageChestId,
    farmPlots: data.farmPlots,
    discoveredAreas: data.discoveredAreas,
    gameTime: data.gameTime,
    settings: data.settings,
  };
}

// ── Save/Load Operations ──────────────────────────────────────────
export function saveGame(state: GameState, slotIndex: number): boolean {
  try {
    const saveData: SaveData = {
      version: SAVE_VERSION,
      timestamp: Date.now(),
      gameState: serializeState(state),
    };
    const json = JSON.stringify(saveData);
    localStorage.setItem(`${SAVE_PREFIX}slot_${slotIndex}`, json);
    return true;
  } catch (e) {
    console.error('Failed to save game:', e);
    return false;
  }
}

export function loadGame(slotIndex: number): Partial<GameState> | null {
  try {
    const json = localStorage.getItem(`${SAVE_PREFIX}slot_${slotIndex}`);
    if (!json) return null;

    const saveData: SaveData = JSON.parse(json);
    if (saveData.version !== SAVE_VERSION) {
      console.warn('Save version mismatch, attempting migration...');
    }

    return deserializeState(saveData.gameState);
  } catch (e) {
    console.error('Failed to load game:', e);
    return null;
  }
}

export function deleteSave(slotIndex: number): boolean {
  try {
    localStorage.removeItem(`${SAVE_PREFIX}slot_${slotIndex}`);
    return true;
  } catch (e) {
    console.error('Failed to delete save:', e);
    return false;
  }
}

export function autoSave(state: GameState): boolean {
  try {
    const saveData: SaveData = {
      version: SAVE_VERSION,
      timestamp: Date.now(),
      gameState: serializeState(state),
    };
    const json = JSON.stringify(saveData);
    localStorage.setItem(AUTO_SAVE_KEY, json);
    return true;
  } catch (e) {
    console.error('Auto-save failed:', e);
    return false;
  }
}

export function loadAutoSave(): Partial<GameState> | null {
  try {
    const json = localStorage.getItem(AUTO_SAVE_KEY);
    if (!json) return null;

    const saveData: SaveData = JSON.parse(json);
    return deserializeState(saveData.gameState);
  } catch (e) {
    console.error('Failed to load auto-save:', e);
    return null;
  }
}

// ── Save Slot Info ────────────────────────────────────────────────
export interface SaveSlotInfo {
  slot: number;
  exists: boolean;
  timestamp: number;
  playerName?: string;
  playerLevel?: number;
  playTime?: string;
  preview?: string;
}

export function getSaveSlotInfo(slotIndex: number): SaveSlotInfo {
  const info: SaveSlotInfo = {
    slot: slotIndex,
    exists: false,
    timestamp: 0,
  };

  try {
    const json = localStorage.getItem(`${SAVE_PREFIX}slot_${slotIndex}`);
    if (!json) return info;

    const saveData: SaveData = JSON.parse(json);
    info.exists = true;
    info.timestamp = saveData.timestamp;

    const gs = saveData.gameState;
    if (gs?.player?.stats) {
      info.playerLevel = gs.player.stats.level;
    }
    if (gs?.gameTime) {
      const days = gs.gameTime.day;
      info.playTime = `${days} dias`;
    }
    if (gs?.player) {
      const px = Math.floor(gs.player.x / 32);
      const py = Math.floor(gs.player.y / 32);
      info.preview = `Pos: ${px},${py}`;
    }
  } catch (e) {
    // Ignore parse errors
  }

  return info;
}

export function getAllSaveSlots(): SaveSlotInfo[] {
  const slots: SaveSlotInfo[] = [];
  for (let i = 0; i < MAX_SAVE_SLOTS; i++) {
    slots.push(getSaveSlotInfo(i));
  }
  return slots;
}

export function getMaxSaveSlots(): number {
  return MAX_SAVE_SLOTS;
}

export function hasAnySaveData(): boolean {
  try {
    if (localStorage.getItem(AUTO_SAVE_KEY)) return true;
    for (let i = 0; i < MAX_SAVE_SLOTS; i++) {
      if (localStorage.getItem(`${SAVE_PREFIX}slot_${i}`)) return true;
    }
    return false;
  } catch {
    return false;
  }
}

// ── Format helpers ────────────────────────────────────────────────
export function formatSaveDate(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function formatPlayTime(ticks: number, dayLength: number): string {
  const totalSeconds = (ticks / dayLength) * 600; // 10 min per day
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
