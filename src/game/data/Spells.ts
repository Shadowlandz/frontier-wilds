// ═══════════════════════════════════════════════════════════════════
// Farm Survival - Spell Definitions
// ═══════════════════════════════════════════════════════════════════

export type SpellEffectType = 'projectile' | 'instant_damage' | 'heal' | 'aoe_damage' | 'buff';

export interface SpellDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  manaCost: number;
  damage: number;
  cooldown: number; // seconds
  range: number;
  effectType: SpellEffectType;
  projectileSpeed?: number;
  aoeRadius?: number;
  healAmount?: number;
  particleColor: string;
  particleColor2?: string;
  /** Id of the item (tome) that unlocks this spell */
  tomeId: string;
  /** Status effect type applied on hit */
  statusEffect?: string;
  /** Duration of the status effect in seconds */
  statusDuration?: number;
  /** Damage per tick for DoT effects */
  statusDamagePerTick?: number;
  /** Slow multiplier for slow effects (0-1) */
  statusSlowAmount?: number;
  /** Chance to apply the status effect (0-1) */
  statusChance?: number;
}

export const SPELLS: Record<string, SpellDefinition> = {
  magic_missile: {
    id: 'magic_missile',
    name: 'Míssil Mágico',
    description: 'Dispara um projétil arcano básico que causa dano médio.',
    icon: '✨',
    manaCost: 10,
    damage: 15,
    cooldown: 0.8,
    range: 200,
    effectType: 'projectile',
    projectileSpeed: 350,
    particleColor: '#88ddff',
    particleColor2: '#aaffee',
    tomeId: 'magic_missile_tome',
  },
  fireball: {
    id: 'fireball',
    name: 'Bola de Fogo',
    description: 'Dispara uma bola de fogo que explode ao impacto, causando dano em área.',
    icon: '🔥',
    manaCost: 25,
    damage: 35,
    cooldown: 1.5,
    range: 180,
    effectType: 'aoe_damage',
    projectileSpeed: 280,
    aoeRadius: 40,
    particleColor: '#ff4400',
    particleColor2: '#ffaa00',
    tomeId: 'fireball_tome',
    statusEffect: 'burn',
    statusDuration: 4,
    statusDamagePerTick: 3,
    statusChance: 0.7,
  },
  ice_blast: {
    id: 'ice_blast',
    name: 'Explosão de Gelo',
    description: 'Lança um fragmento de gelo que congela e danifica inimigos.',
    icon: '❄️',
    manaCost: 20,
    damage: 25,
    cooldown: 1.2,
    range: 190,
    effectType: 'projectile',
    projectileSpeed: 320,
    particleColor: '#66ddff',
    particleColor2: '#cceeff',
    tomeId: 'ice_blast_tome',
    statusEffect: 'slow',
    statusDuration: 3,
    statusSlowAmount: 0.5,
    statusChance: 0.9,
  },
  lightning: {
    id: 'lightning',
    name: 'Relâmpago',
    description: 'Invoca um relâmpago do céu que causa dano massivo em um alvo.',
    icon: '⚡',
    manaCost: 35,
    damage: 50,
    cooldown: 2.0,
    range: 200,
    effectType: 'instant_damage',
    particleColor: '#ffee44',
    particleColor2: '#ffffff',
    tomeId: 'lightning_tome',
    statusEffect: 'stun',
    statusDuration: 0.5,
    statusChance: 0.6,
  },
  heal: {
    id: 'heal',
    name: 'Cura Arcana',
    description: 'Cura o jogador com energia mágica restauradora.',
    icon: '💚',
    manaCost: 20,
    damage: 0,
    cooldown: 3.0,
    range: 0,
    effectType: 'heal',
    healAmount: 40,
    particleColor: '#44ff88',
    particleColor2: '#88ffbb',
    tomeId: 'heal_tome',
  },
};

export function getSpell(id: string): SpellDefinition | undefined {
  return SPELLS[id];
}

export function getSpellByTomeId(tomeId: string): SpellDefinition | undefined {
  return Object.values(SPELLS).find(s => s.tomeId === tomeId);
}
