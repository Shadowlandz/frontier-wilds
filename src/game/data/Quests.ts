// ═══════════════════════════════════════════════════════════════════
// Farm Survival - Quest Definitions
// ═══════════════════════════════════════════════════════════════════

import { QuestDefinition, QuestType } from '../core/Types';

export const QUESTS: QuestDefinition[] = [
  // ── Main Quests ───────────────────────────────────────────────
  {
    id: 'quest_wolf_hunt', name: 'Caça ao Lobo', type: QuestType.Main,
    description: 'Derrote 5 lobos que atacam a vila.',
    objectives: [{ type: 'kill', target: 'wolf', count: 5, description: 'Derrote lobos' }],
    rewards: { xp: 100, gold: 50, items: [{ itemId: 'iron_ore', count: 5 }] },
    requiredLevel: 1,
  },
  {
    id: 'quest_cave_exploration', name: 'Explorando as Cavernas', type: QuestType.Main,
    description: 'Explore a caverna e colete 10 minérios de ferro.',
    objectives: [
      { type: 'gather', target: 'iron_ore', count: 10, description: 'Colete minério de ferro' },
    ],
    rewards: { xp: 200, gold: 100, items: [{ itemId: 'iron_pickaxe', count: 1 }] },
    requiredLevel: 3, prerequisiteQuests: ['quest_wolf_hunt'],
  },
  {
    id: 'quest_slime_king', name: 'O Rei Slime', type: QuestType.Main,
    description: 'Derrote o Rei Slime na floresta profunda.',
    objectives: [{ type: 'kill', target: 'slimeKing', count: 1, description: 'Derrote o Rei Slime' }],
    rewards: { xp: 500, gold: 200, items: [{ itemId: 'ring_of_speed', count: 1 }] },
    requiredLevel: 5, prerequisiteQuests: ['quest_cave_exploration'],
  },
  {
    id: 'quest_ruins', name: 'Segredos das Ruínas', type: QuestType.Main,
    description: 'Explore as ruínas e recupere a Relíquia Perdida.',
    objectives: [
      { type: 'gather', target: 'lost_relic', count: 1, description: 'Encontre a Relíquia Perdida' },
      { type: 'kill', target: 'darkKnight', count: 3, description: 'Derrote Cavaleiros Negros' },
    ],
    rewards: { xp: 600, gold: 300, items: [{ itemId: 'crystal', count: 5 }, { itemId: 'gold_ingot', count: 3 }] },
    requiredLevel: 7, prerequisiteQuests: ['quest_slime_king'],
  },
  {
    id: 'quest_dragon', name: 'O Dragão das Montanhas', type: QuestType.Main,
    description: 'Enfrente o dragão nas montanhas e traga suas escamas.',
    objectives: [{ type: 'kill', target: 'dragon', count: 1, description: 'Derrote o Dragão' }],
    rewards: { xp: 1500, gold: 1000, items: [{ itemId: 'dragon_scale', count: 3 }, { itemId: 'gem_ruby', count: 2 }] },
    requiredLevel: 12, prerequisiteQuests: ['quest_ruins'],
  },

  // ── Side Quests ───────────────────────────────────────────────
  {
    id: 'quest_gather_wood', name: 'Coleta de Madeira', type: QuestType.Side,
    description: 'Colete 30 madeiras para a vila.',
    objectives: [{ type: 'gather', target: 'wood', count: 30, description: 'Colete madeira' }],
    rewards: { xp: 50, gold: 20, items: [{ itemId: 'stone_axe', count: 1 }] },
    requiredLevel: 1,
  },
  {
    id: 'quest_fishing_trip', name: 'Pescaria', type: QuestType.Side,
    description: 'Pesque 5 peixes no rio.',
    objectives: [{ type: 'fish', target: 'fish', count: 5, description: 'Pesque peixes' }],
    rewards: { xp: 80, gold: 40, items: [{ itemId: 'bread', count: 5 }] },
    requiredLevel: 2,
  },
  {
    id: 'quest_farm_help', name: 'Ajuda no Campo', type: QuestType.Side,
    description: 'Cultive e colha 10 trigos.',
    objectives: [{ type: 'farm', target: 'wheat', count: 10, description: 'Colha trigo' }],
    rewards: { xp: 100, gold: 50, items: [{ itemId: 'carrot_seed', count: 10 }] },
    requiredLevel: 2,
  },
  {
    id: 'quest_spider_nest', name: 'Ninho de Aranhas', type: QuestType.Side,
    description: 'Elimine 8 aranhas nas cavernas.',
    objectives: [{ type: 'kill', target: 'spider', count: 8, description: 'Derrote aranhas' }],
    rewards: { xp: 120, gold: 60, items: [{ itemId: 'spider_silk', count: 5 }] },
    requiredLevel: 3,
  },
  {
    id: 'quest_miner_delight', name: 'Sonho do Minerador', type: QuestType.Side,
    description: 'Colete 5 cristais das cavernas.',
    objectives: [{ type: 'gather', target: 'crystal', count: 5, description: 'Colete cristais' }],
    rewards: { xp: 200, gold: 100, items: [{ itemId: 'iron_ingot', count: 5 }] },
    requiredLevel: 5,
  },
  {
    id: 'quest_golem_guardian', name: 'Guardião de Pedra', type: QuestType.Side,
    description: 'Derrote 3 Golems nas montanhas.',
    objectives: [{ type: 'kill', target: 'golem', count: 3, description: 'Derrote golems' }],
    rewards: { xp: 250, gold: 150, items: [{ itemId: 'crystal', count: 3 }, { itemId: 'gold_ore', count: 5 }] },
    requiredLevel: 7,
  },

  // ── Daily Quests ──────────────────────────────────────────────
  {
    id: 'daily_hunt', name: 'Caça Diária', type: QuestType.Daily,
    description: 'Derrote 3 qualquer criatura.',
    objectives: [{ type: 'kill', target: 'any', count: 3, description: 'Derrote criaturas' }],
    rewards: { xp: 50, gold: 30 },
    requiredLevel: 1,
  },
  {
    id: 'daily_gather', name: 'Coleta Diária', type: QuestType.Daily,
    description: 'Colete 20 de qualquer recurso.',
    objectives: [{ type: 'gather', target: 'any', count: 20, description: 'Colete recursos' }],
    rewards: { xp: 40, gold: 25 },
    requiredLevel: 1,
  },

  // ── Weekly Quests ─────────────────────────────────────────────
  {
    id: 'weekly_explorer', name: 'Explorador Semanal', type: QuestType.Weekly,
    description: 'Visite 5 biomas diferentes.',
    objectives: [{ type: 'explore', target: 'any_biome', count: 5, description: 'Visite biomas' }],
    rewards: { xp: 500, gold: 300, items: [{ itemId: 'potion_speed', count: 3 }] },
    requiredLevel: 3,
  },
];

export function getQuestById(id: string): QuestDefinition | undefined {
  return QUESTS.find(q => q.id === id);
}

export function getQuestsByType(type: QuestType): QuestDefinition[] {
  return QUESTS.filter(q => q.type === type);
}
