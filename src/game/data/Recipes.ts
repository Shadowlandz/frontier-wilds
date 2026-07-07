// ═══════════════════════════════════════════════════════════════════
// Farm Survival - Crafting Recipes
// ═══════════════════════════════════════════════════════════════════

import { CraftingRecipe, ItemCategory } from '../core/Types';

export const RECIPES: CraftingRecipe[] = [
  // ── Basic Tools ───────────────────────────────────────────────
  {
    id: 'craft_wood_axe', name: 'Machado de Madeira', category: ItemCategory.Tool,
    result: 'wood_axe', resultCount: 1,
    ingredients: [{ itemId: 'wood', count: 5 }, { itemId: 'fiber', count: 2 }],
    requiredLevel: 1, craftTime: 2000,
  },
  {
    id: 'craft_wood_pickaxe', name: 'Picareta de Madeira', category: ItemCategory.Tool,
    result: 'wood_pickaxe', resultCount: 1,
    ingredients: [{ itemId: 'wood', count: 5 }, { itemId: 'fiber', count: 2 }],
    requiredLevel: 1, craftTime: 2000,
  },
  {
    id: 'craft_wood_sword', name: 'Espada de Madeira', category: ItemCategory.Weapon,
    result: 'wood_sword', resultCount: 1,
    ingredients: [{ itemId: 'wood', count: 8 }, { itemId: 'fiber', count: 3 }],
    requiredLevel: 1, craftTime: 2000,
  },
  {
    id: 'craft_torch', name: 'Tocha', category: ItemCategory.Tool,
    result: 'torch', resultCount: 3,
    ingredients: [{ itemId: 'wood', count: 2 }, { itemId: 'coal', count: 1 }],
    requiredLevel: 1, craftTime: 1000,
  },
  {
    id: 'craft_wood_bow', name: 'Arco de Madeira', category: ItemCategory.Weapon,
    result: 'wood_bow', resultCount: 1,
    ingredients: [{ itemId: 'wood', count: 6 }, { itemId: 'fiber', count: 4 }],
    requiredLevel: 2, craftTime: 3000,
  },
  {
    id: 'craft_arrows', name: 'Flechas', category: ItemCategory.Material,
    result: 'arrows', resultCount: 10,
    ingredients: [{ itemId: 'wood', count: 3 }, { itemId: 'stone', count: 2 }],
    requiredLevel: 2, craftTime: 2000,
  },
  {
    id: 'craft_rope', name: 'Corda', category: ItemCategory.Material,
    result: 'rope', resultCount: 2,
    ingredients: [{ itemId: 'fiber', count: 6 }],
    requiredLevel: 1, craftTime: 1500,
  },
  {
    id: 'craft_bandage', name: 'Bandagem', category: ItemCategory.Consumable,
    result: 'bandage', resultCount: 2,
    ingredients: [{ itemId: 'fiber', count: 3 }],
    requiredLevel: 1, craftTime: 1500,
  },
  {
    id: 'craft_scythe', name: 'Foice', category: ItemCategory.Tool,
    result: 'scythe', resultCount: 1,
    ingredients: [{ itemId: 'wood', count: 4 }, { itemId: 'stone', count: 3 }],
    requiredLevel: 2, craftTime: 2000,
  },
  {
    id: 'craft_hoe', name: 'Enxada', category: ItemCategory.Tool,
    result: 'hoe', resultCount: 1,
    ingredients: [{ itemId: 'wood', count: 4 }, { itemId: 'stone', count: 2 }],
    requiredLevel: 2, craftTime: 2000,
  },
  {
    id: 'craft_hammer', name: 'Martelo', category: ItemCategory.Tool,
    result: 'hammer', resultCount: 1,
    ingredients: [{ itemId: 'wood', count: 4 }, { itemId: 'stone', count: 4 }],
    requiredLevel: 2, craftTime: 2500,
  },
  {
    id: 'craft_fishing_rod', name: 'Vara de Pesca', category: ItemCategory.Tool,
    result: 'fishing_rod', resultCount: 1,
    ingredients: [{ itemId: 'wood', count: 4 }, { itemId: 'fiber', count: 4 }],
    requiredLevel: 3, craftTime: 2000,
  },

  // ── Stone Tools ───────────────────────────────────────────────
  {
    id: 'craft_stone_axe', name: 'Machado de Pedra', category: ItemCategory.Tool,
    result: 'stone_axe', resultCount: 1,
    ingredients: [{ itemId: 'wood', count: 4 }, { itemId: 'stone', count: 6 }, { itemId: 'fiber', count: 2 }],
    requiredLevel: 3, craftTime: 3000,
  },
  {
    id: 'craft_stone_pickaxe', name: 'Picareta de Pedra', category: ItemCategory.Tool,
    result: 'stone_pickaxe', resultCount: 1,
    ingredients: [{ itemId: 'wood', count: 4 }, { itemId: 'stone', count: 6 }, { itemId: 'fiber', count: 2 }],
    requiredLevel: 3, craftTime: 3000,
  },
  {
    id: 'craft_stone_sword', name: 'Espada de Pedra', category: ItemCategory.Weapon,
    result: 'stone_sword', resultCount: 1,
    ingredients: [{ itemId: 'wood', count: 4 }, { itemId: 'stone', count: 8 }, { itemId: 'fiber', count: 3 }],
    requiredLevel: 3, craftTime: 3000,
  },

  // ── Iron Tools & Equipment ────────────────────────────────────
  {
    id: 'craft_iron_axe', name: 'Machado de Ferro', category: ItemCategory.Tool,
    result: 'iron_axe', resultCount: 1,
    ingredients: [{ itemId: 'wood', count: 3 }, { itemId: 'iron_ingot', count: 5 }, { itemId: 'leather', count: 2 }],
    requiredLevel: 5, craftTime: 4000, station: 'furnace',
  },
  {
    id: 'craft_iron_pickaxe', name: 'Picareta de Ferro', category: ItemCategory.Tool,
    result: 'iron_pickaxe', resultCount: 1,
    ingredients: [{ itemId: 'wood', count: 3 }, { itemId: 'iron_ingot', count: 5 }, { itemId: 'leather', count: 2 }],
    requiredLevel: 5, craftTime: 4000, station: 'furnace',
  },
  {
    id: 'craft_iron_sword', name: 'Espada de Ferro', category: ItemCategory.Weapon,
    result: 'iron_sword', resultCount: 1,
    ingredients: [{ itemId: 'wood', count: 3 }, { itemId: 'iron_ingot', count: 8 }],
    requiredLevel: 5, craftTime: 5000, station: 'furnace',
  },
  {
    id: 'craft_iron_helmet', name: 'Capacete de Ferro', category: ItemCategory.Armor,
    result: 'iron_helmet', resultCount: 1,
    ingredients: [{ itemId: 'iron_ingot', count: 5 }],
    requiredLevel: 5, craftTime: 4000, station: 'furnace',
  },
  {
    id: 'craft_iron_chest', name: 'Peitoral de Ferro', category: ItemCategory.Armor,
    result: 'iron_chest', resultCount: 1,
    ingredients: [{ itemId: 'iron_ingot', count: 8 }, { itemId: 'leather', count: 3 }],
    requiredLevel: 6, craftTime: 5000, station: 'furnace',
  },
  {
    id: 'craft_iron_boots', name: 'Botas de Ferro', category: ItemCategory.Armor,
    result: 'iron_boots', resultCount: 1,
    ingredients: [{ itemId: 'iron_ingot', count: 4 }, { itemId: 'leather', count: 2 }],
    requiredLevel: 5, craftTime: 4000, station: 'furnace',
  },
  {
    id: 'craft_iron_gloves', name: 'Luvas de Ferro', category: ItemCategory.Armor,
    result: 'iron_gloves', resultCount: 1,
    ingredients: [{ itemId: 'iron_ingot', count: 3 }, { itemId: 'leather', count: 2 }],
    requiredLevel: 5, craftTime: 3000, station: 'furnace',
  },

  // ── Leather Armor ─────────────────────────────────────────────
  {
    id: 'craft_leather_helmet', name: 'Capacete de Couro', category: ItemCategory.Armor,
    result: 'leather_helmet', resultCount: 1,
    ingredients: [{ itemId: 'leather', count: 4 }],
    requiredLevel: 2, craftTime: 2000, station: 'workbench',
  },
  {
    id: 'craft_leather_chest', name: 'Peitoral de Couro', category: ItemCategory.Armor,
    result: 'leather_chest', resultCount: 1,
    ingredients: [{ itemId: 'leather', count: 6 }, { itemId: 'fiber', count: 4 }],
    requiredLevel: 2, craftTime: 3000, station: 'workbench',
  },
  {
    id: 'craft_leather_boots', name: 'Botas de Couro', category: ItemCategory.Armor,
    result: 'leather_boots', resultCount: 1,
    ingredients: [{ itemId: 'leather', count: 3 }, { itemId: 'fiber', count: 2 }],
    requiredLevel: 2, craftTime: 2000, station: 'workbench',
  },

  // ── Gold Equipment ────────────────────────────────────────────
  {
    id: 'craft_gold_sword', name: 'Espada de Ouro', category: ItemCategory.Weapon,
    result: 'gold_sword', resultCount: 1,
    ingredients: [{ itemId: 'gold_ingot', count: 10 }, { itemId: 'crystal', count: 2 }],
    requiredLevel: 8, craftTime: 6000, station: 'furnace',
  },
  {
    id: 'craft_ring_of_power', name: 'Anel do Poder', category: ItemCategory.Ring,
    result: 'ring_of_power', resultCount: 1,
    ingredients: [{ itemId: 'gold_ingot', count: 5 }, { itemId: 'ruby', count: 1 }],
    requiredLevel: 8, craftTime: 5000, station: 'furnace',
  },
  {
    id: 'craft_ring_of_speed', name: 'Anel da Velocidade', category: ItemCategory.Ring,
    result: 'ring_of_speed', resultCount: 1,
    ingredients: [{ itemId: 'gold_ingot', count: 5 }, { itemId: 'gem_sapphire', count: 1 }],
    requiredLevel: 8, craftTime: 5000, station: 'furnace',
  },
  {
    id: 'craft_amulet_of_life', name: 'Amuleto da Vida', category: ItemCategory.Amulet,
    result: 'amulet_of_life', resultCount: 1,
    ingredients: [{ itemId: 'gold_ingot', count: 5 }, { itemId: 'gem_emerald', count: 1 }, { itemId: 'crystal', count: 3 }],
    requiredLevel: 10, craftTime: 6000, station: 'furnace',
  },

  // ── Crystal Sword ─────────────────────────────────────────────
  {
    id: 'craft_crystal_sword', name: 'Espada de Cristal', category: ItemCategory.Weapon,
    result: 'crystal_sword', resultCount: 1,
    ingredients: [{ itemId: 'crystal', count: 10 }, { itemId: 'magic_dust', count: 5 }, { itemId: 'iron_ingot', count: 5 }],
    requiredLevel: 12, craftTime: 8000, station: 'furnace',
  },

  // ── Consumables ───────────────────────────────────────────────
  {
    id: 'craft_bread', name: 'Pão', category: ItemCategory.Consumable,
    result: 'bread', resultCount: 2,
    ingredients: [{ itemId: 'wheat', count: 3 }],
    requiredLevel: 1, craftTime: 2000, station: 'furnace',
  },
  {
    id: 'craft_cooked_meat', name: 'Carne Cozida', category: ItemCategory.Consumable,
    result: 'cooked_meat', resultCount: 1,
    ingredients: [{ itemId: 'raw_meat', count: 1 }, { itemId: 'coal', count: 1 }],
    requiredLevel: 1, craftTime: 2000, station: 'furnace',
  },
  {
    id: 'craft_potion_hp', name: 'Poção de Vida', category: ItemCategory.Consumable,
    result: 'potion_hp', resultCount: 1,
    ingredients: [{ itemId: 'berry', count: 3 }, { itemId: 'slime_gel', count: 2 }],
    requiredLevel: 4, craftTime: 3000, station: 'workbench',
  },
  {
    id: 'craft_potion_energy', name: 'Poção de Energia', category: ItemCategory.Consumable,
    result: 'potion_energy', resultCount: 1,
    ingredients: [{ itemId: 'apple', count: 3 }, { itemId: 'crystal', count: 1 }],
    requiredLevel: 5, craftTime: 3000, station: 'workbench',
  },
  {
    id: 'craft_health_stew', name: 'Ensopado Restaurador', category: ItemCategory.Consumable,
    result: 'health_stew', resultCount: 1,
    ingredients: [{ itemId: 'carrot', count: 2 }, { itemId: 'potato', count: 2 }, { itemId: 'raw_meat', count: 1 }],
    requiredLevel: 4, craftTime: 4000, station: 'furnace',
  },

  // ── Building ──────────────────────────────────────────────────
  {
    id: 'craft_workbench', name: 'Bancada de Trabalho', category: ItemCategory.Furniture,
    result: 'workbench', resultCount: 1,
    ingredients: [{ itemId: 'wood', count: 15 }, { itemId: 'stone', count: 5 }],
    requiredLevel: 1, craftTime: 3000,
  },
  {
    id: 'craft_furnace', name: 'Fornalha', category: ItemCategory.Furniture,
    result: 'furnace', resultCount: 1,
    ingredients: [{ itemId: 'stone', count: 20 }, { itemId: 'coal', count: 5 }],
    requiredLevel: 3, craftTime: 4000,
  },
  {
    id: 'craft_chest', name: 'Baú', category: ItemCategory.Furniture,
    result: 'chest', resultCount: 1,
    ingredients: [{ itemId: 'wood', count: 12 }],
    requiredLevel: 2, craftTime: 2000,
  },
  {
    id: 'craft_fence', name: 'Cerca', category: ItemCategory.Furniture,
    result: 'fence', resultCount: 4,
    ingredients: [{ itemId: 'wood', count: 4 }],
    requiredLevel: 1, craftTime: 1500,
  },
  {
    id: 'craft_torch_item', name: 'Tocha (Decoração)', category: ItemCategory.Furniture,
    result: 'torch_item', resultCount: 3,
    ingredients: [{ itemId: 'wood', count: 2 }, { itemId: 'coal', count: 1 }],
    requiredLevel: 1, craftTime: 1000,
  },
  {
    id: 'craft_house', name: 'Casa 🏡', category: ItemCategory.Furniture,
    result: 'house', resultCount: 1,
    ingredients: [
      { itemId: 'wood', count: 50 },
      { itemId: 'stone', count: 30 },
      { itemId: 'fiber', count: 20 },
      { itemId: 'iron_ingot', count: 5 },
      { itemId: 'leather', count: 10 },
    ],
    requiredLevel: 5, craftTime: 10000,
  },
  {
    id: 'craft_storage_chest', name: 'Baú Reforçado', category: ItemCategory.Furniture,
    result: 'storage_chest', resultCount: 1,
    ingredients: [
      { itemId: 'wood', count: 20 },
      { itemId: 'iron_ingot', count: 3 },
    ],
    requiredLevel: 3, craftTime: 5000,
  },
  {
    id: 'craft_wooden_wall', name: 'Cerca de Madeira', category: ItemCategory.Furniture,
    result: 'wooden_wall', resultCount: 4,
    ingredients: [{ itemId: 'wood', count: 8 }, { itemId: 'fiber', count: 2 }],
    requiredLevel: 2, craftTime: 2000,
  },
  {
    id: 'craft_gate', name: 'Portão', category: ItemCategory.Furniture,
    result: 'gate', resultCount: 1,
    ingredients: [{ itemId: 'wood', count: 12 }, { itemId: 'iron_ingot', count: 2 }],
    requiredLevel: 3, craftTime: 3000,
  },
  {
    id: 'craft_workbench_advanced', name: 'Bancada Avançada', category: ItemCategory.Furniture,
    result: 'workbench_advanced', resultCount: 1,
    ingredients: [
      { itemId: 'wood', count: 25 },
      { itemId: 'stone', count: 15 },
      { itemId: 'iron_ingot', count: 5 },
    ],
    requiredLevel: 5, craftTime: 5000,
  },
  {
    id: 'craft_campfire', name: 'Fogueira', category: ItemCategory.Furniture,
    result: 'campfire', resultCount: 1,
    ingredients: [{ itemId: 'wood', count: 10 }, { itemId: 'stone', count: 5 }],
    requiredLevel: 2, craftTime: 2000,
  },
  {
    id: 'craft_bed', name: 'Cama', category: ItemCategory.Furniture,
    result: 'bed', resultCount: 1,
    ingredients: [
      { itemId: 'wood', count: 20 },
      { itemId: 'fiber', count: 15 },
      { itemId: 'leather', count: 5 },
    ],
    requiredLevel: 4, craftTime: 6000,
  },

  // ── Furnace Smelting ──────────────────────────────────────────
  {
    id: 'smelt_iron', name: 'Barra de Ferro', category: ItemCategory.Material,
    result: 'iron_ingot', resultCount: 1,
    ingredients: [{ itemId: 'iron_ore', count: 2 }, { itemId: 'coal', count: 1 }],
    requiredLevel: 3, craftTime: 3000, station: 'furnace',
  },
  {
    id: 'smelt_gold', name: 'Barra de Ouro', category: ItemCategory.Material,
    result: 'gold_ingot', resultCount: 1,
    ingredients: [{ itemId: 'gold_ore', count: 2 }, { itemId: 'coal', count: 1 }],
    requiredLevel: 5, craftTime: 4000, station: 'furnace',
  },

  // ── New Weapon Recipes ───────────────────────────────────────
  {
    id: 'craft_spear', name: 'Lança', category: ItemCategory.Weapon,
    result: 'spear', resultCount: 1,
    ingredients: [{ itemId: 'wood', count: 6 }, { itemId: 'iron_ingot', count: 4 }, { itemId: 'fiber', count: 3 }],
    requiredLevel: 4, craftTime: 3000, station: 'workbench',
  },
  {
    id: 'craft_long_bow', name: 'Arco Longo', category: ItemCategory.Weapon,
    result: 'long_bow', resultCount: 1,
    ingredients: [{ itemId: 'enchanted_wood', count: 3 }, { itemId: 'fiber', count: 6 }, { itemId: 'rope', count: 2 }],
    requiredLevel: 6, craftTime: 4000, station: 'workbench',
  },
  {
    id: 'craft_war_hammer', name: 'Martelo de Guerra', category: ItemCategory.Weapon,
    result: 'war_hammer', resultCount: 1,
    ingredients: [{ itemId: 'iron_ingot', count: 8 }, { itemId: 'wood', count: 4 }, { itemId: 'leather', count: 2 }],
    requiredLevel: 7, craftTime: 5000, station: 'furnace',
  },
  {
    id: 'craft_steel_axe', name: 'Machado de Aço', category: ItemCategory.Tool,
    result: 'steel_axe', resultCount: 1,
    ingredients: [{ itemId: 'iron_ingot', count: 6 }, { itemId: 'wood', count: 3 }, { itemId: 'coal', count: 3 }],
    requiredLevel: 8, craftTime: 4500, station: 'furnace',
  },
  {
    id: 'craft_gold_pickaxe', name: 'Picareta de Ouro', category: ItemCategory.Tool,
    result: 'gold_pickaxe', resultCount: 1,
    ingredients: [{ itemId: 'gold_ingot', count: 5 }, { itemId: 'wood', count: 3 }],
    requiredLevel: 8, craftTime: 4000, station: 'furnace',
  },

  // ── Cave Ore Smelting ─────────────────────────────────────────
  {
    id: 'smelt_mithril', name: 'Barra de Mitril', category: ItemCategory.Material,
    result: 'mithril_ingot', resultCount: 1,
    ingredients: [{ itemId: 'mithril_ore', count: 3 }, { itemId: 'coal', count: 2 }],
    requiredLevel: 10, craftTime: 6000, station: 'furnace',
  },
  {
    id: 'forge_upgrade_stone', name: 'Pedra de Afiação', category: ItemCategory.Material,
    result: 'upgrade_stone', resultCount: 1,
    ingredients: [{ itemId: 'stone', count: 5 }, { itemId: 'coal', count: 2 }, { itemId: 'iron_ore', count: 2 }],
    requiredLevel: 4, craftTime: 3000, station: 'furnace',
  },
  {
    id: 'forge_forge_core', name: 'Núcleo de Forja', category: ItemCategory.Material,
    result: 'forge_core', resultCount: 1,
    ingredients: [{ itemId: 'crystal', count: 3 }, { itemId: 'mithril_ore', count: 2 }, { itemId: 'lava_crystal', count: 1 }],
    requiredLevel: 10, craftTime: 6000, station: 'furnace',
  },

  // ── Mithril Equipment ─────────────────────────────────────────
  {
    id: 'craft_mithril_sword', name: 'Espada de Mitril', category: ItemCategory.Weapon,
    result: 'mithril_sword', resultCount: 1,
    ingredients: [{ itemId: 'mithril_ingot', count: 8 }, { itemId: 'crystal', count: 4 }, { itemId: 'forge_core', count: 1 }],
    requiredLevel: 12, craftTime: 8000, station: 'furnace',
  },
  {
    id: 'craft_mithril_pickaxe', name: 'Picareta de Mitril', category: ItemCategory.Tool,
    result: 'mithril_pickaxe', resultCount: 1,
    ingredients: [{ itemId: 'mithril_ingot', count: 6 }, { itemId: 'wood', count: 2 }, { itemId: 'forge_core', count: 1 }],
    requiredLevel: 11, craftTime: 7000, station: 'furnace',
  },
  {
    id: 'craft_mithril_axe', name: 'Machado de Mitril', category: ItemCategory.Tool,
    result: 'mithril_axe', resultCount: 1,
    ingredients: [{ itemId: 'mithril_ingot', count: 6 }, { itemId: 'wood', count: 2 }, { itemId: 'forge_core', count: 1 }],
    requiredLevel: 11, craftTime: 7000, station: 'furnace',
  },
];

export function getRecipesByCategory(category: ItemCategory): CraftingRecipe[] {
  return RECIPES.filter(r => r.category === category);
}

export function getRecipesForItem(itemId: string): CraftingRecipe | undefined {
  return RECIPES.find(r => r.result === itemId);
}
