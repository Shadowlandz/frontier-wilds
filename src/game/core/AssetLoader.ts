/**
 * AssetLoader — Carrega assets PNG de public/assets/, redimensiona para 48×48,
 * e cacheia para uso na UI (hotbar, inventário).
 */
export class AssetLoader {
  private static cache = new Map<string, string>(); // itemId → dataURL
  private static loaded = false;
  private static loadingPromise: Promise<void> | null = null;

  /**
   * Mapeamento: nome do arquivo (sem .png) → IDs dos itens que usam esse sprite.
   */
  static readonly ASSET_MAP: Record<string, string[]> = {
    Arco_comum: ['wood_bow', 'long_bow', 'void_bow'],
    Bancada_de_trabalho: ['workbench', 'workbench_advanced'],
    Bau: ['chest', 'storage_chest'],
    Bota_Couro: ['leather_boots', 'old_boot', 'iron_boots', 'void_boots'],
    Capacete_Couro: ['leather_helmet', 'iron_helmet', 'void_helmet'],
    Corda: ['rope'],
    Espada_Ferro: ['iron_sword', 'stone_sword', 'gold_sword', 'crystal_sword', 'mithril_sword', 'void_sword'],
    Flecha: ['arrows'],
    Fornalha: ['furnace'],
    Luva_Couro: ['iron_gloves'],
    Peitoral_Couro: ['leather_chest', 'iron_chest', 'void_chestplate'],
    Tocha: ['torch', 'torch_item'],
  };

  /** Tamanho alvo dos sprites na hotbar */
  static readonly SPRITE_SIZE = 48;

  /**
   * Carrega e redimensiona todos os assets de uma vez.
   * Pode ser chamado várias vezes — só executa uma vez.
   */
  static preloadAll(): Promise<void> {
    if (this.loaded) return Promise.resolve();
    if (this.loadingPromise) return this.loadingPromise;

    this.loadingPromise = this._loadAll();
    return this.loadingPromise;
  }

  private static async _loadAll(): Promise<void> {
    const entries = Object.entries(this.ASSET_MAP);
    const promises = entries.map(([fileName, itemIds]) =>
      this.loadAndResize(fileName, itemIds),
    );
    await Promise.allSettled(promises);
    this.loaded = true;
  }

  /**
   * Carrega um PNG e redimensiona para SPRITE_SIZE×SPRITE_SIZE,
   * depois associa o dataURL a cada itemId no cache.
   */
  private static loadAndResize(
    fileName: string,
    itemIds: string[],
  ): Promise<void> {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          // Cria canvas para redimensionar
          const canvas = document.createElement('canvas');
          canvas.width = this.SPRITE_SIZE;
          canvas.height = this.SPRITE_SIZE;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve();
            return;
          }

          // Desenha a imagem redimensionada com qualidade
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Centraliza o sprite no canvas mantendo proporção
          const scale = Math.min(
            this.SPRITE_SIZE / img.width,
            this.SPRITE_SIZE / img.height,
          );
          const w = img.width * scale;
          const h = img.height * scale;
          const ox = (this.SPRITE_SIZE - w) / 2;
          const oy = (this.SPRITE_SIZE - h) / 2;

          ctx.drawImage(img, ox, oy, w, h);
          const dataUrl = canvas.toDataURL('image/png');

          // Associa o dataURL a cada itemId
          for (const itemId of itemIds) {
            this.cache.set(itemId, dataUrl);
          }
        } catch {
          // Silencia erros de resize
        }
        resolve();
      };
      img.onerror = () => resolve();
      img.src = `/assets/${fileName}.png`;
    });
  }

  /** Retorna o dataURL do sprite para um itemId, ou null se não existir */
  static getSprite(itemId: string): string | null {
    return this.cache.get(itemId) ?? null;
  }

  /** Verifica se um item tem sprite disponível */
  static hasSprite(itemId: string): boolean {
    return this.cache.has(itemId);
  }

  /** Retorna true se todos os assets já foram carregados */
  static isLoaded(): boolean {
    return this.loaded;
  }
}
