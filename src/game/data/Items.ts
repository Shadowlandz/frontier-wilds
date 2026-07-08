// ═══════════════════════════════════════════════════════════════════
// Farm Survival - Item Definitions
// ═══════════════════════════════════════════════════════════════════

import { ItemDefinition, ItemCategory, Rarity, ToolType, ArmorSlot } from '../core/Types';

export const ITEMS: Record<string, ItemDefinition> = {
  // ── Tools ─────────────────────────────────────────────────────
  wood_axe: {
    id: 'wood_axe', name: 'Machado de Madeira', description: 'Um machado básico para cortar árvores.',
    category: ItemCategory.Tool, rarity: Rarity.Common, stackSize: 1, weight: 2, value: 10,
    icon: '🪓', toolType: ToolType.Axe, damage: 5, durability: 100, maxDurability: 100,
    speed: 1, range: 32, miningPower: 1, choppingPower: 3,
  },
  stone_axe: {
    id: 'stone_axe', name: 'Machado de Pedra', description: 'Um machado resistente de pedra.',
    category: ItemCategory.Tool, rarity: Rarity.Common, stackSize: 1, weight: 3, value: 25,
    icon: '⛏️', toolType: ToolType.Axe, damage: 8, durability: 200, maxDurability: 200,
    speed: 1.1, range: 34, miningPower: 1, choppingPower: 5,
  },
  iron_axe: {
    id: 'iron_axe', name: 'Machado de Ferro', description: 'Um machado forte de ferro.',
    category: ItemCategory.Tool, rarity: Rarity.Uncommon, stackSize: 1, weight: 3, value: 60,
    icon: '⛏️', toolType: ToolType.Axe, damage: 12, durability: 400, maxDurability: 400,
    speed: 1.2, range: 36, miningPower: 2, choppingPower: 8,
  },
  wood_pickaxe: {
    id: 'wood_pickaxe', name: 'Picareta de Madeira', description: 'Uma picareta básica para minerar.',
    category: ItemCategory.Tool, rarity: Rarity.Common, stackSize: 1, weight: 2, value: 10,
    icon: '⛏️', toolType: ToolType.Pickaxe, damage: 4, durability: 100, maxDurability: 100,
    speed: 1, range: 32, miningPower: 3, choppingPower: 1,
  },
  stone_pickaxe: {
    id: 'stone_pickaxe', name: 'Picareta de Pedra', description: 'Uma picareta resistente.',
    category: ItemCategory.Tool, rarity: Rarity.Common, stackSize: 1, weight: 3, value: 25,
    icon: '⛏️', toolType: ToolType.Pickaxe, damage: 6, durability: 200, maxDurability: 200,
    speed: 1.1, range: 34, miningPower: 5, choppingPower: 1,
  },
  iron_pickaxe: {
    id: 'iron_pickaxe', name: 'Picareta de Ferro', description: 'Uma picareta forte de ferro.',
    category: ItemCategory.Tool, rarity: Rarity.Uncommon, stackSize: 1, weight: 3, value: 60,
    icon: '⛏️', toolType: ToolType.Pickaxe, damage: 8, durability: 400, maxDurability: 400,
    speed: 1.2, range: 36, miningPower: 8, choppingPower: 1,
  },
  wood_sword: {
    id: 'wood_sword', name: 'Espada de Madeira', description: 'Uma espada básica.',
    category: ItemCategory.Weapon, rarity: Rarity.Common, stackSize: 1, weight: 2, value: 15,
    icon: '🗡️', toolType: ToolType.Sword, damage: 8, durability: 80, maxDurability: 80,
    speed: 1.3, range: 36,
  },
  stone_sword: {
    id: 'stone_sword', name: 'Espada de Pedra', description: 'Uma espada resistente.',
    category: ItemCategory.Weapon, rarity: Rarity.Common, stackSize: 1, weight: 3, value: 35,
    icon: '🗡️', toolType: ToolType.Sword, damage: 12, durability: 160, maxDurability: 160,
    speed: 1.2, range: 38,
  },
  iron_sword: {
    id: 'iron_sword', name: 'Espada de Ferro', description: 'Uma espada forte de ferro.',
    category: ItemCategory.Weapon, rarity: Rarity.Uncommon, stackSize: 1, weight: 4, value: 80,
    icon: '⚔️', toolType: ToolType.Sword, damage: 18, durability: 320, maxDurability: 320,
    speed: 1.1, range: 40,
  },
  gold_sword: {
    id: 'gold_sword', name: 'Espada de Ouro', description: 'Uma espada reluzente e poderosa.',
    category: ItemCategory.Weapon, rarity: Rarity.Rare, stackSize: 1, weight: 5, value: 200,
    icon: '⚔️', toolType: ToolType.Sword, damage: 25, durability: 250, maxDurability: 250,
    speed: 1.4, range: 42,
  },
  crystal_sword: {
    id: 'crystal_sword', name: 'Espada de Cristal', description: 'Uma espada mágica brilhante.',
    category: ItemCategory.Weapon, rarity: Rarity.Epic, stackSize: 1, weight: 3, value: 500,
    icon: '⚔️', toolType: ToolType.Sword, damage: 35, durability: 200, maxDurability: 200,
    speed: 1.5, range: 44,
  },
  wood_bow: {
    id: 'wood_bow', name: 'Arco de Madeira', description: 'Um arco básico de alcance médio.',
    category: ItemCategory.Weapon, rarity: Rarity.Common, stackSize: 1, weight: 2, value: 20,
    icon: '🏹', toolType: ToolType.Bow, damage: 6, durability: 80, maxDurability: 80,
    speed: 0.8, range: 160,
  },
  torch: {
    id: 'torch', name: 'Tocha', description: 'Ilumina as cavernas escuras.',
    category: ItemCategory.Tool, rarity: Rarity.Common, stackSize: 20, weight: 0.5, value: 3,
    icon: '🔥', toolType: ToolType.Torch, damage: 2, durability: 60, maxDurability: 60,
    speed: 1, range: 24,
  },
  scythe: {
    id: 'scythe', name: 'Foice', description: 'Perfeita para colher plantações.',
    category: ItemCategory.Tool, rarity: Rarity.Common, stackSize: 1, weight: 2, value: 20,
    icon: '🌾', toolType: ToolType.Scythe, damage: 4, durability: 120, maxDurability: 120,
    speed: 1.2, range: 36,
  },
  hammer: {
    id: 'hammer', name: 'Martelo', description: 'Usado para construir e reparar.',
    category: ItemCategory.Tool, rarity: Rarity.Common, stackSize: 1, weight: 3, value: 20,
    icon: '🔨', toolType: ToolType.Hammer, damage: 6, durability: 150, maxDurability: 150,
    speed: 0.9, range: 32,
  },
  fishing_rod: {
    id: 'fishing_rod', name: 'Vara de Pesca', description: 'Pesque em rios e lagos.',
    category: ItemCategory.Tool, rarity: Rarity.Common, stackSize: 1, weight: 1, value: 15,
    icon: '🎣', toolType: ToolType.FishingRod, damage: 1, durability: 80, maxDurability: 80,
    speed: 0.5, range: 64,
  },
  hoe: {
    id: 'hoe', name: 'Enxada', description: 'Prepara o solo para plantio.',
    category: ItemCategory.Tool, rarity: Rarity.Common, stackSize: 1, weight: 2, value: 15,
    icon: '🌱', toolType: ToolType.Hoe, damage: 2, durability: 100, maxDurability: 100,
    speed: 1, range: 32,
  },

  // ── Armor ─────────────────────────────────────────────────────
  leather_helmet: {
    id: 'leather_helmet', name: 'Capacete de Couro', description: 'Proteção básica para a cabeça.',
    category: ItemCategory.Armor, rarity: Rarity.Common, stackSize: 1, weight: 1, value: 20,
    icon: '⛑️', armorSlot: ArmorSlot.Helmet, defense: 2, durability: 100, maxDurability: 100,
  },
  leather_chest: {
    id: 'leather_chest', name: 'Peitoral de Couro', description: 'Proteção básica para o corpo.',
    category: ItemCategory.Armor, rarity: Rarity.Common, stackSize: 1, weight: 3, value: 30,
    icon: '🦺', armorSlot: ArmorSlot.Chest, defense: 4, durability: 120, maxDurability: 120,
  },
  leather_boots: {
    id: 'leather_boots', name: 'Botas de Couro', description: 'Botas confortáveis.',
    category: ItemCategory.Armor, rarity: Rarity.Common, stackSize: 1, weight: 1, value: 15,
    icon: '👢', armorSlot: ArmorSlot.Boots, defense: 1, durability: 80, maxDurability: 80,
    bonuses: { speed: 5 },
  },
  iron_helmet: {
    id: 'iron_helmet', name: 'Capacete de Ferro', description: 'Proteção sólida para a cabeça.',
    category: ItemCategory.Armor, rarity: Rarity.Uncommon, stackSize: 1, weight: 2, value: 60,
    icon: '⛑️', armorSlot: ArmorSlot.Helmet, defense: 5, durability: 200, maxDurability: 200,
  },
  iron_chest: {
    id: 'iron_chest', name: 'Peitoral de Ferro', description: 'Armadura resistente de ferro.',
    category: ItemCategory.Armor, rarity: Rarity.Uncommon, stackSize: 1, weight: 5, value: 80,
    icon: '🦺', armorSlot: ArmorSlot.Chest, defense: 8, durability: 250, maxDurability: 250,
  },
  iron_boots: {
    id: 'iron_boots', name: 'Botas de Ferro', description: 'Botas resistentes.',
    category: ItemCategory.Armor, rarity: Rarity.Uncommon, stackSize: 1, weight: 2, value: 40,
    icon: '👢', armorSlot: ArmorSlot.Boots, defense: 3, durability: 180, maxDurability: 180,
    bonuses: { speed: 3 },
  },
  iron_gloves: {
    id: 'iron_gloves', name: 'Luvas de Ferro', description: 'Luvas protetoras.',
    category: ItemCategory.Armor, rarity: Rarity.Uncommon, stackSize: 1, weight: 1, value: 40,
    icon: '🧤', armorSlot: ArmorSlot.Gloves, defense: 3, durability: 160, maxDurability: 160,
    bonuses: { mining: 2 },
  },
  ring_of_power: {
    id: 'ring_of_power', name: 'Anel do Poder', description: 'Aumenta o dano de ataque.',
    category: ItemCategory.Ring, rarity: Rarity.Rare, stackSize: 1, weight: 0.1, value: 150,
    icon: '💍', armorSlot: ArmorSlot.Ring, defense: 1, durability: 999, maxDurability: 999,
    bonuses: { strength: 5 },
  },
  ring_of_speed: {
    id: 'ring_of_speed', name: 'Anel da Velocidade', description: 'Aumenta a velocidade.',
    category: ItemCategory.Ring, rarity: Rarity.Rare, stackSize: 1, weight: 0.1, value: 150,
    icon: '💍', armorSlot: ArmorSlot.Ring, defense: 0, durability: 999, maxDurability: 999,
    bonuses: { speed: 15 },
  },
  amulet_of_life: {
    id: 'amulet_of_life', name: 'Amuleto da Vida', description: 'Aumenta a vida máxima.',
    category: ItemCategory.Amulet, rarity: Rarity.Rare, stackSize: 1, weight: 0.2, value: 200,
    icon: '📿', armorSlot: ArmorSlot.Amulet, defense: 2, durability: 999, maxDurability: 999,
    bonuses: { maxHp: 30 },
  },

  // ── Materials ─────────────────────────────────────────────────
  wood: {
    id: 'wood', name: 'Madeira', description: 'Material básico de construção.',
    category: ItemCategory.Material, rarity: Rarity.Common, stackSize: 99, weight: 1, value: 2,
    icon: '🪵',
  },
  stone: {
    id: 'stone', name: 'Pedra', description: 'Material básico resistente.',
    category: ItemCategory.Material, rarity: Rarity.Common, stackSize: 99, weight: 2, value: 2,
    icon: '🪨',
  },
  iron_ore: {
    id: 'iron_ore', name: 'Minério de Ferro', description: 'Minério para forjar equipamentos.',
    category: ItemCategory.Material, rarity: Rarity.Uncommon, stackSize: 99, weight: 3, value: 8,
    icon: '⛰️',
  },
  gold_ore: {
    id: 'gold_ore', name: 'Minério de Ouro', description: 'Minério valioso e raro.',
    category: ItemCategory.Material, rarity: Rarity.Rare, stackSize: 99, weight: 4, value: 25,
    icon: '🥇',
  },
  coal: {
    id: 'coal', name: 'Carvão', description: 'Usado como combustível e em crafting.',
    category: ItemCategory.Material, rarity: Rarity.Common, stackSize: 99, weight: 1, value: 3,
    icon: '🖤',
  },
  crystal: {
    id: 'crystal', name: 'Cristal', description: 'Cristal brilhante e mágico.',
    category: ItemCategory.Material, rarity: Rarity.Rare, stackSize: 50, weight: 1, value: 40,
    icon: '💎',
  },
  fiber: {
    id: 'fiber', name: 'Fibra', description: 'Fibra de plantas para cordas e tecidos.',
    category: ItemCategory.Material, rarity: Rarity.Common, stackSize: 99, weight: 0.5, value: 1,
    icon: '🧵',
  },
  leather: {
    id: 'leather', name: 'Couro', description: 'Couro de animais para armaduras.',
    category: ItemCategory.Material, rarity: Rarity.Common, stackSize: 50, weight: 1, value: 5,
    icon: '🟤',
  },
  bone: {
    id: 'bone', name: 'Osso', description: 'Ossos de criaturas para crafting.',
    category: ItemCategory.Material, rarity: Rarity.Common, stackSize: 50, weight: 1, value: 3,
    icon: '🦴',
  },
  iron_ingot: {
    id: 'iron_ingot', name: 'Barra de Ferro', description: 'Barra de ferro forjado.',
    category: ItemCategory.Material, rarity: Rarity.Uncommon, stackSize: 99, weight: 3, value: 15,
    icon: '🔩',
  },
  gold_ingot: {
    id: 'gold_ingot', name: 'Barra de Ouro', description: 'Barra de ouro reluzente.',
    category: ItemCategory.Material, rarity: Rarity.Rare, stackSize: 99, weight: 4, value: 50,
    icon: '🥇',
  },
  clay: {
    id: 'clay', name: 'Argila', description: 'Argila moldável para cerâmicas.',
    category: ItemCategory.Material, rarity: Rarity.Common, stackSize: 99, weight: 1, value: 3,
    icon: '🏺',
  },
  gem_ruby: {
    id: 'gem_ruby', name: 'Rubi', description: 'Uma gema vermelha preciosa.',
    category: ItemCategory.Material, rarity: Rarity.Epic, stackSize: 20, weight: 0.5, value: 100,
    icon: '❤️',
  },
  gem_sapphire: {
    id: 'gem_sapphire', name: 'Safira', description: 'Uma gema azul preciosa.',
    category: ItemCategory.Material, rarity: Rarity.Epic, stackSize: 20, weight: 0.5, value: 100,
    icon: '💙',
  },
  gem_emerald: {
    id: 'gem_emerald', name: 'Esmeralda', description: 'Uma gema verde preciosa.',
    category: ItemCategory.Material, rarity: Rarity.Epic, stackSize: 20, weight: 0.5, value: 100,
    icon: '💚',
  },
  slime_gel: {
    id: 'slime_gel', name: 'Gosma', description: 'Gosma pegajosa de slimes.',
    category: ItemCategory.Material, rarity: Rarity.Common, stackSize: 99, weight: 0.5, value: 2,
    icon: '🟢',
  },
  spider_silk: {
    id: 'spider_silk', name: 'Seda de Aranha', description: 'Fio forte e resistente.',
    category: ItemCategory.Material, rarity: Rarity.Uncommon, stackSize: 50, weight: 0.3, value: 8,
    icon: '🕸️',
  },
  dark_essence: {
    id: 'dark_essence', name: 'Essência Sombria', description: 'Essência de criaturas das trevas.',
    category: ItemCategory.Material, rarity: Rarity.Rare, stackSize: 30, weight: 0.5, value: 30,
    icon: '💜',
  },

  // ── Consumables ───────────────────────────────────────────────
  apple: {
    id: 'apple', name: 'Maçã', description: 'Restaura um pouco de vida e fome.',
    category: ItemCategory.Consumable, rarity: Rarity.Common, stackSize: 30, weight: 0.5, value: 3,
    icon: '🍎', foodValue: 10, healAmount: 5, effects: [{ type: 'hunger', value: 10 }, { type: 'heal', value: 5 }],
  },
  bread: {
    id: 'bread', name: 'Pão', description: 'Pão caseiro nutritivo.',
    category: ItemCategory.Consumable, rarity: Rarity.Common, stackSize: 20, weight: 0.5, value: 8,
    icon: '🍞', foodValue: 25, healAmount: 10, effects: [{ type: 'hunger', value: 25 }, { type: 'heal', value: 10 }],
  },
  cooked_meat: {
    id: 'cooked_meat', name: 'Carne Cozida', description: 'Carne saborosa e nutritiva.',
    category: ItemCategory.Consumable, rarity: Rarity.Common, stackSize: 20, weight: 1, value: 12,
    icon: '🥩', foodValue: 35, healAmount: 15, effects: [{ type: 'hunger', value: 35 }, { type: 'heal', value: 15 }],
  },
  raw_meat: {
    id: 'raw_meat', name: 'Carne Crua', description: 'Comer crua pode ser perigoso.',
    category: ItemCategory.Consumable, rarity: Rarity.Common, stackSize: 20, weight: 1, value: 5,
    icon: '🍖', foodValue: 10, healAmount: 0, effects: [{ type: 'hunger', value: 10 }],
  },
  fish: {
    id: 'fish', name: 'Peixe', description: 'Peixe fresco do rio.',
    category: ItemCategory.Fish, rarity: Rarity.Common, stackSize: 20, weight: 1, value: 6,
    icon: '🐟', foodValue: 15, healAmount: 5, effects: [{ type: 'hunger', value: 15 }, { type: 'heal', value: 5 }],
  },
  golden_fish: {
    id: 'golden_fish', name: 'Peixe Dourado', description: 'Um peixe raro e valioso.',
    category: ItemCategory.Fish, rarity: Rarity.Rare, stackSize: 10, weight: 1, value: 50,
    icon: '🐠', foodValue: 30, healAmount: 20, effects: [{ type: 'hunger', value: 30 }, { type: 'heal', value: 20 }, { type: 'xp', value: 25 }],
  },
  potion_hp: {
    id: 'potion_hp', name: 'Poção de Vida', description: 'Restaura 50 HP.',
    category: ItemCategory.Consumable, rarity: Rarity.Uncommon, stackSize: 20, weight: 0.5, value: 30,
    icon: '🧪', healAmount: 50, effects: [{ type: 'heal', value: 50 }],
  },
  potion_energy: {
    id: 'potion_energy', name: 'Poção de Energia', description: 'Restaura 40 energia.',
    category: ItemCategory.Consumable, rarity: Rarity.Uncommon, stackSize: 20, weight: 0.5, value: 30,
    icon: '⚗️', effects: [{ type: 'energy', value: 40 }],
  },
  potion_speed: {
    id: 'potion_speed', name: 'Poção de Velocidade', description: 'Aumenta velocidade por 30s.',
    category: ItemCategory.Consumable, rarity: Rarity.Uncommon, stackSize: 10, weight: 0.5, value: 40,
    icon: '💨', effects: [{ type: 'speed', value: 50, duration: 30000 }],
  },
  health_stew: {
    id: 'health_stew', name: 'Ensopado Restaurador', description: 'Ensopado quente que cura muito.',
    category: ItemCategory.Consumable, rarity: Rarity.Uncommon, stackSize: 10, weight: 1, value: 25,
    icon: '🍲', foodValue: 40, healAmount: 30, effects: [{ type: 'hunger', value: 40 }, { type: 'heal', value: 30 }],
  },
  antidote: {
    id: 'antidote', name: 'Antídoto', description: 'Cura veneno e envenenamento.',
    category: ItemCategory.Consumable, rarity: Rarity.Uncommon, stackSize: 10, weight: 0.3, value: 20,
    icon: '💊',
  },

  // ── Seeds ─────────────────────────────────────────────────────
  wheat_seed: {
    id: 'wheat_seed', name: 'Semente de Trigo', description: 'Plante para cultivar trigo.',
    category: ItemCategory.Seed, rarity: Rarity.Common, stackSize: 50, weight: 0.1, value: 2,
    icon: '🌾',
  },
  carrot_seed: {
    id: 'carrot_seed', name: 'Semente de Cenoura', description: 'Plante para cultivar cenouras.',
    category: ItemCategory.Seed, rarity: Rarity.Common, stackSize: 50, weight: 0.1, value: 3,
    icon: '🥕',
  },
  potato_seed: {
    id: 'potato_seed', name: 'Semente de Batata', description: 'Plante para cultivar batatas.',
    category: ItemCategory.Seed, rarity: Rarity.Common, stackSize: 50, weight: 0.1, value: 3,
    icon: '🥔',
  },
  berry_seed: {
    id: 'berry_seed', name: 'Semente de Framboesa', description: 'Plante para cultivar frutas.',
    category: ItemCategory.Seed, rarity: Rarity.Uncommon, stackSize: 50, weight: 0.1, value: 5,
    icon: '🫐',
  },
  pumpkin_seed: {
    id: 'pumpkin_seed', name: 'Semente de Abóbora', description: 'Plante para cultivar abóboras.',
    category: ItemCategory.Seed, rarity: Rarity.Uncommon, stackSize: 30, weight: 0.1, value: 8,
    icon: '🎃',
  },

  // ── Crops ─────────────────────────────────────────────────────
  wheat: {
    id: 'wheat', name: 'Trigo', description: 'Trigo fresco para fazer pão.',
    category: ItemCategory.Material, rarity: Rarity.Common, stackSize: 99, weight: 0.5, value: 3,
    icon: '🌾',
  },
  carrot: {
    id: 'carrot', name: 'Cenoura', description: 'Cenoura nutritiva.',
    category: ItemCategory.Consumable, rarity: Rarity.Common, stackSize: 50, weight: 0.5, value: 4,
    icon: '🥕', foodValue: 15, healAmount: 5, effects: [{ type: 'hunger', value: 15 }, { type: 'heal', value: 5 }],
  },
  potato: {
    id: 'potato', name: 'Batata', description: 'Batata-versátil para cozinha.',
    category: ItemCategory.Consumable, rarity: Rarity.Common, stackSize: 50, weight: 0.5, value: 3,
    icon: '🥔', foodValue: 12, healAmount: 3, effects: [{ type: 'hunger', value: 12 }],
  },
  berry: {
    id: 'berry', name: 'Framboesa', description: 'Fruta doce e energética.',
    category: ItemCategory.Consumable, rarity: Rarity.Common, stackSize: 50, weight: 0.2, value: 5,
    icon: '🫐', foodValue: 8, healAmount: 8, effects: [{ type: 'hunger', value: 8 }, { type: 'heal', value: 8 }],
  },
  pumpkin: {
    id: 'pumpkin', name: 'Abóbora', description: 'Abóbora grande e saborosa.',
    category: ItemCategory.Consumable, rarity: Rarity.Uncommon, stackSize: 20, weight: 2, value: 10,
    icon: '🎃', foodValue: 25, healAmount: 10, effects: [{ type: 'hunger', value: 25 }, { type: 'heal', value: 10 }],
  },

  // ── Building ──────────────────────────────────────────────────
  workbench: {
    id: 'workbench', name: 'Bancada de Trabalho', description: 'Bancada para crafting avançado.',
    category: ItemCategory.Furniture, rarity: Rarity.Common, stackSize: 5, weight: 5, value: 30,
    icon: '🔧', placeable: true,
  },
  furnace: {
    id: 'furnace', name: 'Fornalha', description: 'Forja minérios em barras.',
    category: ItemCategory.Furniture, rarity: Rarity.Common, stackSize: 5, weight: 10, value: 50,
    icon: '🔥', placeable: true,
  },
  chest: {
    id: 'chest', name: 'Baú', description: 'Armazene seus itens.',
    category: ItemCategory.Furniture, rarity: Rarity.Common, stackSize: 10, weight: 5, value: 20,
    icon: '📦', placeable: true,
  },
  fence: {
    id: 'fence', name: 'Cerca', description: 'Cerca para delimitar áreas.',
    category: ItemCategory.Furniture, rarity: Rarity.Common, stackSize: 50, weight: 1, value: 3,
    icon: '🚧', placeable: true,
  },
  torch_item: {
    id: 'torch_item', name: 'Tocha (Decoração)', description: 'Ilumina a área ao colocar.',
    category: ItemCategory.Furniture, rarity: Rarity.Common, stackSize: 50, weight: 0.5, value: 3,
    icon: '🕯️', placeable: true,
  },
  house: {
    id: 'house', name: 'Casa', description: 'Uma casa aconchegante. Cria uma área segura contra inimigos.',
    category: ItemCategory.Furniture, rarity: Rarity.Uncommon, stackSize: 1, weight: 20, value: 200,
    icon: '🏠', placeable: true,
  },
  storage_chest: {
    id: 'storage_chest', name: 'Baú Reforçado', description: 'Baú grande para armazenar itens extras. 30 slots.',
    category: ItemCategory.Furniture, rarity: Rarity.Uncommon, stackSize: 5, weight: 10, value: 50,
    icon: '🗄️', placeable: true,
  },
  wooden_wall: {
    id: 'wooden_wall', name: 'Cerca de Madeira', description: 'Cerca resistente para delimitar sua base.',
    category: ItemCategory.Furniture, rarity: Rarity.Common, stackSize: 50, weight: 2, value: 5,
    icon: '🧱', placeable: true,
  },
  gate: {
    id: 'gate', name: 'Portão', description: 'Portão de madeira para entrada da base.',
    category: ItemCategory.Furniture, rarity: Rarity.Common, stackSize: 10, weight: 5, value: 15,
    icon: '🚪', placeable: true,
  },
  workbench_advanced: {
    id: 'workbench_advanced', name: 'Bancada Avançada', description: 'Bancada de trabalho melhorada com mais receitas.',
    category: ItemCategory.Furniture, rarity: Rarity.Uncommon, stackSize: 1, weight: 8, value: 80,
    icon: '⚙️', placeable: true,
  },
  campfire: {
    id: 'campfire', name: 'Fogueira', description: 'Fogueira para cozinhar e se aquecer à noite.',
    category: ItemCategory.Furniture, rarity: Rarity.Common, stackSize: 10, weight: 3, value: 10,
    icon: '🔥', placeable: true,
  },
  bed: {
    id: 'bed', name: 'Cama', description: 'Cama confortável. Descanse para recuperar stamina rapidamente.',
    category: ItemCategory.Furniture, rarity: Rarity.Uncommon, stackSize: 1, weight: 10, value: 60,
    icon: '🛏️', placeable: true,
  },

  // ── Quest Items ───────────────────────────────────────────────
  ancient_key: {
    id: 'ancient_key', name: 'Chave Antiga', description: 'Uma chave misteriosa e antiga.',
    category: ItemCategory.Quest, rarity: Rarity.Rare, stackSize: 1, weight: 0.5, value: 0,
    icon: '🗝️',
  },
  dragon_scale: {
    id: 'dragon_scale', name: 'Escama de Dragão', description: 'Escama rara de um dragão.',
    category: ItemCategory.Quest, rarity: Rarity.Legendary, stackSize: 5, weight: 1, value: 0,
    icon: '🐉',
  },
  lost_relic: {
    id: 'lost_relic', name: 'Relíquia Perdida', description: 'Uma relíquia das ruínas antigas.',
    category: ItemCategory.Quest, rarity: Rarity.Epic, stackSize: 3, weight: 1, value: 0,
    icon: '🏺',
  },
  gold_coin: {
    id: 'gold_coin', name: 'Moeda de Ouro', description: 'Moeda valiosa.',
    category: ItemCategory.Material, rarity: Rarity.Common, stackSize: 9999, weight: 0.1, value: 1,
    icon: '🪙',
  },

  // ── New Weapons ──────────────────────────────────────────────
  steel_axe: {
    id: 'steel_axe', name: 'Machado de Aço', description: 'Um machado de aço super resistente.',
    category: ItemCategory.Tool, rarity: Rarity.Uncommon, stackSize: 1, weight: 4, value: 120,
    icon: '⛏️', toolType: ToolType.Axe, damage: 16, durability: 700, maxDurability: 700,
    speed: 1.3, range: 36, miningPower: 3, choppingPower: 14,
  },
  long_bow: {
    id: 'long_bow', name: 'Arco Longo', description: 'Um arco longo de grande alcance.',
    category: ItemCategory.Weapon, rarity: Rarity.Uncommon, stackSize: 1, weight: 3, value: 80,
    icon: '🏹', toolType: ToolType.Bow, damage: 10, durability: 200, maxDurability: 200,
    speed: 1.0, range: 200,
  },
  gold_pickaxe: {
    id: 'gold_pickaxe', name: 'Picareta de Ouro', description: 'Picareta dourada ultra-rápida.',
    category: ItemCategory.Tool, rarity: Rarity.Rare, stackSize: 1, weight: 3, value: 150,
    icon: '⛏️', toolType: ToolType.Pickaxe, damage: 10, durability: 350, maxDurability: 350,
    speed: 1.6, range: 36, miningPower: 14, choppingPower: 1,
  },
  spear: {
    id: 'spear', name: 'Lança', description: 'Lança de longo alcance para perfurar inimigos.',
    category: ItemCategory.Weapon, rarity: Rarity.Uncommon, stackSize: 1, weight: 3, value: 60,
    icon: '🔱', toolType: ToolType.Spear, damage: 14, durability: 250, maxDurability: 250,
    speed: 1.2, range: 48,
  },
  war_hammer: {
    id: 'war_hammer', name: 'Martelo de Guerra', description: 'Martelo pesado que esmaga inimigos.',
    category: ItemCategory.Weapon, rarity: Rarity.Rare, stackSize: 1, weight: 6, value: 120,
    icon: '🔨', toolType: ToolType.Hammer, damage: 22, durability: 500, maxDurability: 500,
    speed: 0.7, range: 36,
  },
  rope: {
    id: 'rope', name: 'Corda', description: 'Corda resistente feita de fibra.',
    category: ItemCategory.Material, rarity: Rarity.Common, stackSize: 30, weight: 0.5, value: 5,
    icon: '🪢',
  },
  bandage: {
    id: 'bandage', name: 'Bandagem', description: 'Cura ferimentos leves.',
    category: ItemCategory.Consumable, rarity: Rarity.Common, stackSize: 20, weight: 0.2, value: 8,
    icon: '🩹', healAmount: 20, effects: [{ type: 'heal', value: 20 }],
  },
  arrows: {
    id: 'arrows', name: 'Flechas', description: 'Munição para arcos.',
    category: ItemCategory.Material, rarity: Rarity.Common, stackSize: 99, weight: 0.1, value: 1,
    icon: '➡️',
  },
  magic_dust: {
    id: 'magic_dust', name: 'Pó Mágico', description: 'Pó brilhante com propriedades mágicas.',
    category: ItemCategory.Material, rarity: Rarity.Rare, stackSize: 50, weight: 0.2, value: 20,
    icon: '✨',
  },
  enchanted_wood: {
    id: 'enchanted_wood', name: 'Madeira Encantada', description: 'Madeira com poderes mágicos.',
    category: ItemCategory.Material, rarity: Rarity.Rare, stackSize: 30, weight: 1, value: 35,
    icon: '🪵',
  },
  shadow_fragment: {
    id: 'shadow_fragment', name: 'Fragmento Sombrio', description: 'Fragmento de energia sombria.',
    category: ItemCategory.Material, rarity: Rarity.Epic, stackSize: 20, weight: 0.3, value: 50,
    icon: '🖤',
  },

  // ── Cave Resources ────────────────────────────────────────────
  mithril_ore: {
    id: 'mithril_ore', name: 'Minério de Mitril', description: 'Minério lendário das profundezas.',
    category: ItemCategory.Material, rarity: Rarity.Epic, stackSize: 50, weight: 3, value: 80,
    icon: '🔮',
  },
  ruby_ore: {
    id: 'ruby_ore', name: 'Minério de Rubi', description: 'Rubi bruto das cavernas vulcânicas.',
    category: ItemCategory.Material, rarity: Rarity.Epic, stackSize: 30, weight: 2, value: 60,
    icon: '🔴',
  },
  mithril_ingot: {
    id: 'mithril_ingot', name: 'Barra de Mitril', description: 'Barra do metal mais resistente.',
    category: ItemCategory.Material, rarity: Rarity.Epic, stackSize: 30, weight: 4, value: 160,
    icon: '💠',
  },
  lava_crystal: {
    id: 'lava_crystal', name: 'Cristal de Lava', description: 'Cristal pulsando com calor vulcânico.',
    category: ItemCategory.Material, rarity: Rarity.Legendary, stackSize: 10, weight: 1, value: 200,
    icon: '🌋',
  },
  troll_skin: {
    id: 'troll_skin', name: 'Pele de Troll', description: 'Pele grossa e resistente de troll.',
    category: ItemCategory.Material, rarity: Rarity.Rare, stackSize: 20, weight: 2, value: 40,
    icon: '🧌',
  },

  // ── Upgradeable Crafted Items ─────────────────────────────────
  mithril_sword: {
    id: 'mithril_sword', name: 'Espada de Mitril', description: 'Espada forjada com o lendário mitril.',
    category: ItemCategory.Weapon, rarity: Rarity.Epic, stackSize: 1, weight: 3, value: 600,
    icon: '⚔️', toolType: ToolType.Sword, damage: 45, durability: 600, maxDurability: 600,
    speed: 1.4, range: 44,
  },
  mithril_pickaxe: {
    id: 'mithril_pickaxe', name: 'Picareta de Mitril', description: 'Picareta indestrutível de mitril.',
    category: ItemCategory.Tool, rarity: Rarity.Epic, stackSize: 1, weight: 3, value: 500,
    icon: '⛏️', toolType: ToolType.Pickaxe, damage: 15, durability: 1200, maxDurability: 1200,
    speed: 1.5, range: 38, miningPower: 20, choppingPower: 1,
  },
  mithril_axe: {
    id: 'mithril_axe', name: 'Machado de Mitril', description: 'Machado lendário de mitril.',
    category: ItemCategory.Tool, rarity: Rarity.Epic, stackSize: 1, weight: 3, value: 500,
    icon: '⛏️', toolType: ToolType.Axe, damage: 22, durability: 1200, maxDurability: 1200,
    speed: 1.4, range: 38, miningPower: 5, choppingPower: 22,
  },

  // ── Upgrade Forge Items ───────────────────────────────────────
  upgrade_stone: {
    id: 'upgrade_stone', name: 'Pedra de Afiação', description: 'Melhora armas de metal.',
    category: ItemCategory.Material, rarity: Rarity.Uncommon, stackSize: 10, weight: 1, value: 30,
    icon: '🪨',
  },
  forge_core: {
    id: 'forge_core', name: 'Núcleo de Forja', description: 'Núcleo energético para melhorias avançadas.',
    category: ItemCategory.Material, rarity: Rarity.Rare, stackSize: 5, weight: 2, value: 100,
    icon: '💎',
  },
};

export function getItem(id: string): ItemDefinition | undefined {
  return ITEMS[id];
}

export function getItemsByCategory(category: ItemCategory): ItemDefinition[] {
  return Object.values(ITEMS).filter(item => item.category === category);
}

export function getItemsByRarity(rarity: Rarity): ItemDefinition[] {
  return Object.values(ITEMS).filter(item => item.rarity === rarity);
}
