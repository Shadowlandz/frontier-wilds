// ═══════════════════════════════════════════════════════════════════
// Farm Survival - NPC Definitions
// ═══════════════════════════════════════════════════════════════════

import { NpcDefinition, NpcType } from '../core/Types';

export const NPCS: Record<string, NpcDefinition> = {
  merchant: {
    type: NpcType.Merchant, name: 'Mercador Geraldo',
    dialogue: [
      'Bem-vindo à minha loja! Tenho de tudo um pouco.',
      'Procurando algo especial? Dê uma olhada no estoque!',
      'Volte sempre! Sempre tenho novidades.',
    ],
    shopItems: [
      'apple', 'bread', 'bandage', 'torch', 'arrows',
      'wheat_seed', 'carrot_seed', 'potato_seed',
      'rope', 'potion_hp', 'potion_energy',
    ],
    color: '#8d6e63', icon: '🧔',
  },
  blacksmith: {
    type: NpcType.Blacksmith, name: 'Ferreiro Marcos',
    dialogue: [
      'Precisa de equipamentos? Forjei tudo com minhas próprias mãos!',
      'Traga minérios e eu faço o resto!',
      'Seus equipamentos estão prontos!',
    ],
    shopItems: [
      'iron_sword', 'iron_pickaxe', 'iron_axe',
      'iron_helmet', 'iron_chest', 'iron_boots', 'iron_gloves',
      'stone_sword', 'stone_pickaxe', 'stone_axe',
    ],
    color: '#424242', icon: '⚒️',
  },
  farmer: {
    type: NpcType.Farmer, name: 'Fazendeiro João',
    dialogue: [
      'A terra é a melhor amiga de um homem!',
      'Quer aprender sobre agricultura? É simples!',
      'Plante, regue, colha. A vida é um ciclo!',
    ],
    shopItems: [
      'wheat_seed', 'carrot_seed', 'potato_seed', 'berry_seed', 'pumpkin_seed',
      'hoe', 'scythe', 'fence',
    ],
    color: '#558b2f', icon: '👨‍🌾',
  },
  alchemist: {
    type: NpcType.Alchemist, name: 'Alquimista Elena',
    dialogue: [
      'Mistérios da natureza... posso transformar em poções!',
      'Cristais e gemas... fontes de poder!',
      'Cuidado com poções fortes! Use com responsabilidade.',
    ],
    shopItems: [
      'potion_hp', 'potion_energy', 'potion_speed', 'antidote',
      'magic_dust', 'crystal',
    ],
    color: '#7b1fa2', icon: '🧙',
  },
  hunter: {
    type: NpcType.Hunter, name: 'Caçador Pedro',
    dialogue: [
      'As florestas são perigosas, mas recompensadoras.',
      'Trouxe couro? Compro por bons preços!',
      'Cuidado com os lobos à noite...',
    ],
    shopItems: [
      'wood_bow', 'arrows', 'leather', 'leather_helmet',
      'leather_chest', 'leather_boots', 'raw_meat',
    ],
    color: '#bf360c', icon: '🏹',
  },
  quest_giver: {
    type: NpcType.QuestGiver, name: 'Ancião Vilmar',
    dialogue: [
      'Jovem aventureiro! Preciso da sua ajuda!',
      'A vila está em perigo. Monstros aparecem cada vez mais!',
      'Derrote os monstros e traga os materiais que preciso!',
    ],
    questIds: ['tutorial_first_steps', 'quest_wolf_hunt', 'quest_cave_exploration', 'quest_slime_king', 'quest_ruins', 'quest_dragon'],
    color: '#f57f17', icon: '👴',
  },
  identifier: {
    type: NpcType.Identifier, name: 'Sábio Eron',
    dialogue: [
      'Ah, itens misteriosos! Posso revelar seus segredos... por um preço, é claro.',
      'Traga seus itens não identificados que eu revelo seus verdadeiros atributos!',
      'Cada item tem um custo de identificação baseado em sua raridade. Quanto mais raro, mais caro.',
      'Volte sempre que encontrar itens misteriosos!',
    ],
    color: '#7c4dff', icon: '🧙',
  },
};

export function getNpcShopItems(npcId: string): string[] {
  return NPCS[npcId]?.shopItems ?? [];
}
