import { AssetLoader } from './AssetLoader';
import { RARITY_COLORS } from './Types';

interface ItemIconProps {
  item: {
    id: string;
    icon: string;
    name: string;
    rarity: string;
  };
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  className?: string;
  showRarityGlow?: boolean;
  unidentified?: boolean;
}

const SIZE_MAP: Record<string, string> = {
  xs: 'text-xs w-4 h-4',
  sm: 'text-sm w-5 h-5',
  md: 'text-base w-6 h-6',
  lg: 'text-lg w-7 h-7',
  xl: 'text-xl w-8 h-8',
  '2xl': 'text-2xl w-10 h-10',
  '3xl': 'text-3xl w-12 h-12',
};

/**
 * ItemIcon — Renderiza o sprite customizado se disponível,
 * ou cai para o emoji original. Fallback silencioso.
 */
export function ItemIcon({ item, size = 'xl', className = '', showRarityGlow = true, unidentified = false }: ItemIconProps) {
  const sizeClass = SIZE_MAP[size] || SIZE_MAP.xl;
  const rarityColor = RARITY_COLORS[item.rarity as keyof typeof RARITY_COLORS] || '#b0b0b0';

  if (unidentified) {
    return (
      <span
        className={`inline-flex items-center justify-center ${sizeClass} ${className}`}
        style={{ color: rarityColor }}
      >
        ❓
      </span>
    );
  }

  if (AssetLoader.hasSprite(item.id)) {
    const glowFilter = showRarityGlow
      ? { filter: `drop-shadow(0 0 3px ${rarityColor}60)` }
      : {};
    return (
      <img
        src={AssetLoader.getSprite(item.id)!}
        alt={item.name}
        className={`inline-block object-contain ${sizeClass} ${className}`}
        style={glowFilter}
        loading="lazy"
      />
    );
  }

  // Fallback: emoji original
  return (
    <span
      className={`inline-flex items-center justify-center ${sizeClass} ${className}`}
      style={{ color: rarityColor }}
    >
      {item.icon}
    </span>
  );
}
