// ═══════════════════════════════════════════════════════════════════
// Farm Survival - Sprite Animator System
// ═══════════════════════════════════════════════════════════════════
//
// Gerencia animações por spritesheet com fallback procedural.
// Coloque os PNGs em public/assets/player/ e o sistema detecta
// automaticamente. Enquanto não há sprites, usa renderização
// procedural existente (legada).
//
// Spritesheets esperados (frames lado a lado, horizontal):
//   Player_idle.png         (1 quadro,  32×48)
//   Player_walk.png         (4 quadros, 128×48)
//   Player_run.png          (4 quadros, 128×48)
//   Player_axe_chop.png     (3 quadros,  96×48)
//   Player_pickaxe_mine.png (3 quadros,  96×48)
//   Player_sword_attack.png (3 quadros,  96×48)
//   Player_bow_shoot.png    (3 quadros,  96×48)
//   Player_spear_thrust.png (2 quadros,  64×48)
//   Player_hoe_till.png     (2 quadros,  64×48)
//   Player_scythe_swing.png (3 quadros,  96×48)
//   Player_hammer_smash.png (3 quadros,  96×48)
//   Player_hurt.png         (1 quadro,  32×48)
//   Player_death.png        (2 quadros,  64×48)
//
// ═══════════════════════════════════════════════════════════════════

interface AnimConfig {
  /** Número de quadros no spritesheet */
  frames: number;
  /** Segundos por quadro (0 = sem animação, quadro único) */
  duration: number;
  /** Se verdadeiro, repete; se falso, para no último quadro */
  loop: boolean;
}

/** Definições de todas as animações suportadas */
const ANIMATIONS: Record<string, AnimConfig> = {
  idle:          { frames: 1, duration: 0,    loop: true },
  walk:          { frames: 4, duration: 0.15, loop: true },
  run:           { frames: 4, duration: 0.10, loop: true },
  axe_chop:      { frames: 3, duration: 0.12, loop: false },
  pickaxe_mine:  { frames: 3, duration: 0.12, loop: false },
  sword_attack:  { frames: 3, duration: 0.10, loop: false },
  bow_shoot:     { frames: 3, duration: 0.13, loop: false },
  spear_thrust:  { frames: 2, duration: 0.10, loop: false },
  hoe_till:      { frames: 2, duration: 0.12, loop: false },
  scythe_swing:  { frames: 3, duration: 0.12, loop: false },
  hammer_smash:  { frames: 3, duration: 0.14, loop: false },
  hurt:          { frames: 1, duration: 0,    loop: true },
  death:         { frames: 2, duration: 0.20, loop: false },
};

export class SpriteAnimator {
  /** Imagens carregadas por nome de animação */
  private spritesheets = new Map<string, HTMLImageElement>();
  /** Conjunto de animações que foram carregadas com sucesso */
  private loadedAnims = new Set<string>();
  /** Se true, ao menos uma animação essencial foi carregada */
  private loaded = false;
  private loadingPromise: Promise<void> | null = null;

  // ── Estado de animação em execução ──────────────────────────────
  private currentAnim = 'idle';
  private currentFrame = 0;
  private frameTimer = 0;

  /** Configs de animação (pode ser sobrescrito por subclasse) */
  protected animConfigs: Record<string, AnimConfig>;

  constructor() {
    this.animConfigs = ANIMATIONS;
  }

  // ── Preload ─────────────────────────────────────────────────────

  /**
   * Carrega todos os spritesheets de /assets/player/.
   * Pode ser chamado múltiplas vezes — só executa uma vez.
   */
  preload(): Promise<void> {
    if (this.loaded) return Promise.resolve();
    if (this.loadingPromise) return this.loadingPromise;
    this.loadingPromise = this._loadAll();
    return this.loadingPromise;
  }

  private async _loadAll(): Promise<void> {
    const animNames = Object.keys(this.animConfigs);
    const results = await Promise.allSettled(
      animNames.map((name) => this._loadOne(name)),
    );

    let successCount = 0;
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) successCount++;
    }

    // Considera "carregado" se ao menos idle + walk carregaram,
    // OU se pelo menos 5 animações foram carregadas
    const hasIdle = this.loadedAnims.has('idle');
    const hasWalk = this.loadedAnims.has('walk');
    this.loaded = (hasIdle && hasWalk) || successCount >= 5;
  }

  /** Tenta carregar um spritesheet individual */
  private _loadOne(name: string): Promise<boolean> {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.spritesheets.set(name, img);
        this.loadedAnims.add(name);
        resolve(true);
      };
      img.onerror = () => resolve(false);
      img.src = `/assets/player/Player_${name}.png`;
    });
  }

  // ── Consulta de estado ──────────────────────────────────────────

  /** Retorna true se sprites estão disponíveis para uso */
  hasSprites(): boolean {
    return this.loaded;
  }

  /** Retorna true se uma animação específica está carregada */
  hasAnimation(name: string): boolean {
    return this.loadedAnims.has(name);
  }

  /** Força recarregamento (útil para hot-reload) */
  reset(): void {
    this.spritesheets.clear();
    this.loadedAnims.clear();
    this.loaded = false;
    this.loadingPromise = null;
    this.currentAnim = 'idle';
    this.currentFrame = 0;
    this.frameTimer = 0;
  }

  // ── Máquina de estados de animação ───────────────────────────────

  /**
   * Determina qual animação tocar com base no estado do jogador.
   *
   * @param isMoving   Se o jogador está se movendo (dx/dy != 0)
   * @param isRunning  Se o jogador está correndo (shift/ctrl)
   * @param isAttacking Se o jogador está atacando
   * @param weaponType ToolType da arma atual (ex: 'sword', 'axe')
   * @param isHurt     Se o jogador tomou dano recentemente
   */
  getAnimation(
    isMoving: boolean,
    isRunning: boolean,
    isAttacking: boolean,
    weaponType: string | null,
    isHurt: boolean,
  ): string {
    if (isAttacking) {
      switch (weaponType) {
        case 'bow':        return 'bow_shoot';
        case 'axe':        return 'axe_chop';
        case 'pickaxe':    return 'pickaxe_mine';
        case 'sword':      return 'sword_attack';
        case 'spear':      return 'spear_thrust';
        case 'hoe':        return 'hoe_till';
        case 'scythe':     return 'scythe_swing';
        case 'hammer':     return 'hammer_smash';
        default:           return 'sword_attack';
      }
    }

    if (isMoving) {
      return isRunning ? 'run' : 'walk';
    }

    return 'idle';
  }

  // ── Tick de animação ────────────────────────────────────────────

  /**
   * Avança o quadro da animação. Chame a cada frame com o dt real.
   * @param dt       Delta time em segundos desde o último frame
   * @param animName Nome da animação desejada (de getAnimation)
   * @returns O índice do quadro atual (0-based)
   */
  update(dt: number, animName: string): number {
    const config = this.animConfigs[animName];
    if (!config || config.frames <= 1) {
      this.currentFrame = 0;
      return 0;
    }

    // Se a animação mudou, reinicia o contador
    if (animName !== this.currentAnim) {
      this.currentAnim = animName;
      this.currentFrame = 0;
      this.frameTimer = 0;
    }

    this.frameTimer += dt;

    if (config.duration > 0 && this.frameTimer >= config.duration) {
      const steps = Math.floor(this.frameTimer / config.duration);
      this.frameTimer -= steps * config.duration;
      this.currentFrame += steps;

      if (this.currentFrame >= config.frames) {
        if (config.loop) {
          this.currentFrame = this.currentFrame % config.frames;
        } else {
          this.currentFrame = config.frames - 1; // segura no último
        }
      }
    }

    return this.currentFrame;
  }

  // ── Renderização ─────────────────────────────────────────────────

  /**
   * Desenha o quadro atual do sprite na tela.
   * Se a animação desejada não tiver spritesheet carregado,
   * tenta fallback para 'idle'. Se nada estiver carregado, não desenha.
   *
   * @param ctx      Contexto 2D do canvas
   * @param x        Screen X (top-left)
   * @param y        Screen Y (top-left)
   * @param w        Largura de renderização
   * @param h        Altura de renderização
   * @param facingX  Direção X do jogador (-1, 0, 1) — flip horizontal
   * @param alpha    Opacidade (1 = normal, 0.5 = flash)
   */
  draw(
    ctx: CanvasRenderingContext2D,
    x: number, y: number,
    w: number, h: number,
    facingX: number,
    alpha: number,
  ): void {
    const spriteAnim = this._resolveSprite();
    if (!spriteAnim) return; // nenhum sprite disponível

    const img = this.spritesheets.get(spriteAnim);
    if (!img || !img.complete) return;

    const config = this.animConfigs[spriteAnim];
    const frameW = img.width / config.frames;
    const frameH = img.height;

    // Se a animação atual é a que queremos, usa o frame atual;
    // senão (fallback para idle), usa frame 0
    const frame = spriteAnim === this.currentAnim ? this.currentFrame : 0;

    ctx.save();
    ctx.globalAlpha = alpha;

    if (facingX < 0) {
      // Flip horizontal
      ctx.translate(x + w, y);
      ctx.scale(-1, 1);
      ctx.drawImage(img, frame * frameW, 0, frameW, frameH, 0, 0, w, h);
    } else {
      ctx.drawImage(img, frame * frameW, 0, frameW, frameH, x, y, w, h);
    }

    ctx.restore();
  }

  /**
   * Resolve qual sprite realmente desenhar.
   * Se a animação atual não está carregada, tenta fallback.
   */
  private _resolveSprite(): string | null {
    if (this.loadedAnims.has(this.currentAnim)) {
      return this.currentAnim;
    }
    // Fallback: idle
    if (this.loadedAnims.has('idle')) {
      return 'idle';
    }
    // Fallback: qualquer animação carregada
    for (const name of this.loadedAnims) {
      return name;
    }
    return null;
  }
}
