// ═══════════════════════════════════════════════════════════════════
// Farm Survival - Skill Tree Definitions
// ═══════════════════════════════════════════════════════════════════

import { SkillDefinition, SkillTree } from '../core/Types';

export const SKILLS: Record<string, SkillDefinition> = {
  // ── Survival Tree ─────────────────────────────────────────────
  tough_skin: {
    id: 'tough_skin', name: 'Pele Dura', description: 'Aumenta HP máximo.',
    tree: SkillTree.Survival, maxLevel: 5, cost: 1,
    effect: (l) => ({ maxHp: l * 10 }),
    icon: '🛡️',
  },
  iron_stomach: {
    id: 'iron_stomach', name: 'Estômago de Ferro', description: 'Reduz perda de fome.',
    tree: SkillTree.Survival, maxLevel: 3, cost: 1,
    effect: () => ({}), // handled in survival system
    icon: '🍖',
  },
  quick_heal: {
    id: 'quick_heal', name: 'Cura Rápida', description: 'Regenera HP mais rápido.',
    tree: SkillTree.Survival, maxLevel: 3, cost: 2,
    effect: () => ({}),
    icon: '💚',
  },
  marathon: {
    id: 'marathon', name: 'Maratona', description: 'Aumenta velocidade de movimento.',
    tree: SkillTree.Survival, maxLevel: 3, cost: 2,
    effect: (l) => ({ speed: l * 5 }),
    icon: '🏃',
  },
  second_wind: {
    id: 'second_wind', name: 'Segundo Fôlego', description: 'Recupera energia mais rápido.',
    tree: SkillTree.Survival, maxLevel: 3, cost: 2,
    effect: () => ({}),
    icon: '💨',
  },

  // ── Combat Tree ───────────────────────────────────────────────
  power_strike: {
    id: 'power_strike', name: 'Golpe Poderoso', description: 'Aumenta dano de ataque.',
    tree: SkillTree.Combat, maxLevel: 5, cost: 1,
    effect: (l) => ({ strength: l * 3 }),
    icon: '⚔️',
  },
  thick_armor: {
    id: 'thick_armor', name: 'Armadura Grossa', description: 'Aumenta defesa.',
    tree: SkillTree.Combat, maxLevel: 5, cost: 1,
    effect: (l) => ({ defense: l * 2 }),
    icon: '🛡️',
  },
  critical_hit: {
    id: 'critical_hit', name: 'Golpe Crítico', description: 'Chance de crítico aumentada.',
    tree: SkillTree.Combat, maxLevel: 3, cost: 2,
    effect: () => ({}),
    icon: '💥',
  },
  dual_wield: {
    id: 'dual_wield', name: 'Ataque Duplo', description: 'Ataca mais rápido.',
    tree: SkillTree.Combat, maxLevel: 3, cost: 3,
    effect: () => ({}),
    icon: '🗡️',
  },
  berserker: {
    id: 'berserker', name: 'Berserker', description: 'Mais dano quando com pouca vida.',
    tree: SkillTree.Combat, maxLevel: 3, cost: 3,
    effect: () => ({}),
    icon: '😡',
  },

  // ── Gathering Tree ────────────────────────────────────────────
  lumberjack: {
    id: 'lumberjack', name: 'Lenhador', description: 'Corta madeira mais rápido.',
    tree: SkillTree.Gathering, maxLevel: 5, cost: 1,
    effect: (l) => ({ woodcutting: l * 2 }),
    icon: '🪓',
  },
  miner: {
    id: 'miner', name: 'Minerador', description: 'Minera mais rápido e eficiente.',
    tree: SkillTree.Gathering, maxLevel: 5, cost: 1,
    effect: (l) => ({ mining: l * 2 }),
    icon: '⛏️',
  },
  fortune: {
    id: 'fortune', name: 'Fortuna', description: 'Mais chance de drops raros.',
    tree: SkillTree.Gathering, maxLevel: 3, cost: 2,
    effect: (l) => ({ luck: l * 5 }),
    icon: '🍀',
  },
  double_yield: {
    id: 'double_yield', name: 'Produção Dupla', description: 'Chance de obter recursos extras.',
    tree: SkillTree.Gathering, maxLevel: 3, cost: 2,
    effect: () => ({}),
    icon: '📦',
  },

  // ── Crafting Tree ─────────────────────────────────────────────
  efficient_craft: {
    id: 'efficient_craft', name: 'Craft Eficiente', description: 'Usa menos materiais.',
    tree: SkillTree.Crafting, maxLevel: 3, cost: 2,
    effect: () => ({}),
    icon: '🔧',
  },
  master_smith: {
    id: 'master_smith', name: 'Mestre Ferreiro', description: 'Equipamentos têm mais durabilidade.',
    tree: SkillTree.Crafting, maxLevel: 3, cost: 2,
    effect: () => ({}),
    icon: '🔨',
  },
  alchemy: {
    id: 'alchemy', name: 'Alquimia', description: 'Poções são mais eficazes.',
    tree: SkillTree.Crafting, maxLevel: 3, cost: 2,
    effect: () => ({}),
    icon: '⚗️',
  },

  // ── Exploration Tree ──────────────────────────────────────────
  pathfinder: {
    id: 'pathfinder', name: 'Abre-caminho', description: 'Move mais rápido em terrenos difíceis.',
    tree: SkillTree.Exploration, maxLevel: 3, cost: 1,
    effect: () => ({}),
    icon: '🧭',
  },
  treasure_hunter: {
    id: 'treasure_hunter', name: 'Caçador de Tesouros', description: 'Encontra mais baús.',
    tree: SkillTree.Exploration, maxLevel: 3, cost: 2,
    effect: (l) => ({ luck: l * 3 }),
    icon: '🗺️',
  },
  night_vision: {
    id: 'night_vision', name: 'Visão Noturna', description: 'Enxerga melhor à noite.',
    tree: SkillTree.Exploration, maxLevel: 3, cost: 2,
    effect: () => ({}),
    icon: '👁️',
  },
  farmer_hand: {
    id: 'farmer_hand', name: 'Mão de Fazendeiro', description: 'Plantas crescem mais rápido.',
    tree: SkillTree.Exploration, maxLevel: 3, cost: 1,
    effect: () => ({}),
    icon: '🌾',
  },
  fisher_luck: {
    id: 'fisher_luck', name: 'Sorte de Pescador', description: 'Mais chance de peixes raros.',
    tree: SkillTree.Exploration, maxLevel: 3, cost: 1,
    effect: (l) => ({ fishing: l * 2 }),
    icon: '🎣',
  },
};

export function getSkillsByTree(tree: SkillTree): SkillDefinition[] {
  return Object.values(SKILLS).filter(s => s.tree === tree);
}
