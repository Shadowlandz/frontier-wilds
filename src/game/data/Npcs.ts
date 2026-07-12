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
      'Compro suas colheitas por um preço justo!',
      'Traga suas plantações que eu pago bem!',
    ],
    shopItems: [
      'wheat_seed', 'carrot_seed', 'potato_seed', 'berry_seed', 'pumpkin_seed',
      'corn_seed', 'tomato_seed', 'magic_bean_seed',
      'hoe', 'scythe', 'fence',
    ],
    buysItems: {
      'wheat': 5,
      'carrot': 8,
      'potato': 6,
      'berry': 10,
      'pumpkin': 18,
      'corn': 7,
      'tomato': 8,
      'magic_bean': 50,
      'fish': 8,
      'salmon': 14,
      'catfish': 22,
      'piranha': 18,
      'eel': 40,
      'tropical_fish': 55,
      'pufferfish': 10,
      'golden_fish': 80,
      'seaweed': 4,
    },
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
    questIds: ['tutorial_first_steps', 'quest_wolf_hunt', 'quest_cave_exploration', 'quest_slime_king', 'quest_ruins', 'quest_dragon', 'quest_cursed_portal'],
    color: '#f57f17', icon: '👴',
  },
  mage: {
    type: NpcType.Mage, name: 'Mago Arcângelo',
    dialogue: [
      'Ah, um aventureiro interessado em magia! Sinto uma centelha em você.',
      'O conhecimento arcano não é para qualquer um. Mas vejo potencial!',
      'Tenho tomos raros à venda. Compre um e estude em seu grimório.',
      'Pressione T para abrir seu Grimório e aprender as magias dos tomos!',
      'Que a luz arcana ilumine seu caminho, jovem mago.',
    ],
    shopItems: [
      'magic_missile_tome', 'heal_tome', 'ice_blast_tome',
      'fireball_tome', 'lightning_tome',
      'potion_hp', 'potion_energy', 'magic_dust', 'crystal',
    ],
    buysItems: {
      'crystal': 60,
      'magic_dust': 30,
      'enchanted_wood': 45,
      'polished_ruby': 300,
      'polished_sapphire': 300,
      'polished_emerald': 300,
      'diamond': 700,
      'shadow_fragment': 80,
    },
    color: '#5e35b1', icon: '🔮',
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
