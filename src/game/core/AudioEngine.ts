// ═══════════════════════════════════════════════════════════════════
// Farm Survival - Procedural Audio Engine
// Generates all game sounds using Web Audio API (no audio files needed)
// ═══════════════════════════════════════════════════════════════════

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;

  private stepTimer = 0;
  private stepInterval = 0.38; // seconds between steps
  private lastSurface = 'grass';
  private musicPlaying = false;
  private ambientPlaying = false;
  private ambientNodes: OscillatorNode[] = [];
  private currentBiome: string = 'plains';
  private muted = false;
  private volume = 0.7;

  // Cache for buffer-based sounds
  private bufferCache: Map<string, AudioBuffer> = new Map();

  constructor() {
    // AudioContext is created lazily on first user interaction
  }

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 1;
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.3;
      this.musicGain.connect(this.masterGain);

      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.value = 0.15;
      this.ambientGain.connect(this.masterGain);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.masterGain) this.masterGain.gain.value = this.volume;
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.masterGain) this.masterGain.gain.value = this.muted ? 0 : this.volume;
  }

  toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  // ── Utility: create white noise buffer ──────────────────────
  private createNoiseBuffer(ctx: AudioContext, duration: number): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  // ── Utility: play a tone (oscillator) ───────────────────────
  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    gainValue = 0.3,
    decay = true,
    detune = 0,
  ): void {
    const ctx = this.ensureContext();
    if (!this.sfxGain) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;
    gain.gain.value = gainValue;

    if (decay) {
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    }

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration + 0.1);
  }

  // ── Utility: play noise burst ───────────────────────────────
  private playNoise(duration: number, gainValue = 0.3, highpass = 0, lowpass = 22000): void {
    const ctx = this.ensureContext();
    if (!this.sfxGain) return;

    const buffer = this.createNoiseBuffer(ctx, duration);
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const gain = ctx.createGain();
    gain.gain.value = gainValue;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    let node: AudioNode = source;
    if (highpass > 0) {
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = highpass;
      node.connect(hp);
      node = hp;
    }
    if (lowpass < 22000) {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = lowpass;
      node.connect(lp);
      node = lp;
    }

    node.connect(gain);
    gain.connect(this.sfxGain);
    source.start(ctx.currentTime);
  }

  // ── Utility: play two-toned sound ───────────────────────────
  private playDoubleTone(freq1: number, freq2: number, duration: number, type: OscillatorType = 'square', gain = 0.2): void {
    this.playTone(freq1, duration, type, gain);
    setTimeout(() => this.playTone(freq2, duration * 0.7, type, gain * 0.8), duration * 0.4 * 1000);
  }

  // ═══════════════════════════════════════════════════════════════
  // SOUND EFFECTS
  // ═══════════════════════════════════════════════════════════════

  /** Footstep sound — changes based on surface type */
  playFootstep(surface: string = 'grass'): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!this.sfxGain) return;

    // Surface-based sound parameters
    let freq = 80;
    let duration = 0.08;
    let gain = 0.12;
    let highpass = 60;

    switch (surface) {
      case 'grass':
      case 'dirt':
        freq = 70 + Math.random() * 20;
        highpass = 50;
        gain = 0.10;
        break;
      case 'stone':
      case 'path':
        freq = 120 + Math.random() * 30;
        highpass = 200;
        gain = 0.15;
        break;
      case 'sand':
        freq = 50 + Math.random() * 15;
        highpass = 30;
        gain = 0.08;
        duration = 0.06;
        break;
      case 'water':
        freq = 200 + Math.random() * 100;
        highpass = 400;
        gain = 0.06;
        duration = 0.1;
        break;
      case 'cave':
        freq = 90 + Math.random() * 15;
        highpass = 80;
        gain = 0.14;
        duration = 0.1;
        break;
      case 'wood':
        freq = 150 + Math.random() * 40;
        highpass = 300;
        gain = 0.12;
        break;
      default:
        break;
    }

    // Short noise burst with EQ
    const buffer = this.createNoiseBuffer(ctx, duration);
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const gainNode = ctx.createGain();
    gainNode.gain.value = gain;
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = highpass;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = highpass + 400 + Math.random() * 200;

    source.connect(hp);
    hp.connect(lp);
    lp.connect(gainNode);
    gainNode.connect(this.sfxGain);
    source.start(ctx.currentTime);

    // Low thud
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    oscGain.gain.value = gain * 0.5;
    oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration * 1.5);
    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration + 0.05);
  }

  /** Player should call this each frame with movement info */
  updateFootsteps(isMoving: boolean, isRunning: boolean, surface: string, dt: number): void {
    if (!isMoving || this.muted) {
      this.stepTimer = 0;
      return;
    }

    const interval = isRunning ? this.stepInterval * 0.6 : this.stepInterval;
    this.stepTimer += dt;

    if (this.stepTimer >= interval) {
      this.stepTimer = 0;
      this.playFootstep(surface);
    }
  }

  /** Melee weapon swing whoosh */
  playSwing(weaponType: string = 'sword'): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!this.sfxGain) return;

    const duration = 0.15;
    let lowFreq = 200;
    let highFreq = 600;
    let gain = 0.15;

    switch (weaponType) {
      case 'sword':
        lowFreq = 400;
        highFreq = 1200;
        gain = 0.2;
        break;
      case 'axe':
        lowFreq = 200;
        highFreq = 800;
        gain = 0.25;
        break;
      case 'pickaxe':
        lowFreq = 300;
        highFreq = 900;
        gain = 0.22;
        break;
      case 'hammer':
        lowFreq = 100;
        highFreq = 500;
        gain = 0.3;
        break;
      case 'bow':
        lowFreq = 500;
        highFreq = 1500;
        gain = 0.1;
        break;
      case 'spear':
        lowFreq = 300;
        highFreq = 1000;
        gain = 0.18;
        break;
      default:
        break;
    }

    // Whoosh: filtered noise sweep
    const buffer = this.createNoiseBuffer(ctx, duration);
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const gainNode = ctx.createGain();
    gainNode.gain.value = gain;
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = lowFreq;
    bp.Q.value = 0.5;
    // Sweep frequency up
    bp.frequency.linearRampToValueAtTime(highFreq, ctx.currentTime + duration);

    source.connect(bp);
    bp.connect(gainNode);
    gainNode.connect(this.sfxGain);
    source.start(ctx.currentTime);
  }

  /** Arrow / projectile whoosh */
  playArrowShot(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!this.sfxGain) return;

    const duration = 0.12;
    const buffer = this.createNoiseBuffer(ctx, duration);
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const gainNode = ctx.createGain();
    gainNode.gain.value = 0.12;
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 800;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3000;

    source.connect(hp);
    hp.connect(lp);
    lp.connect(gainNode);
    gainNode.connect(this.sfxGain);
    source.start(ctx.currentTime);

    // String pluck
    this.playTone(800 + Math.random() * 200, 0.08, 'triangle', 0.08);
  }

  /** Hit impact sound */
  playHit(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!this.sfxGain) return;

    const duration = 0.1;
    const buffer = this.createNoiseBuffer(ctx, duration);
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const gainNode = ctx.createGain();
    gainNode.gain.value = 0.25;
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 100;

    source.connect(hp);
    hp.connect(gainNode);
    gainNode.connect(this.sfxGain);
    source.start(ctx.currentTime);

    // Thump
    this.playTone(60 + Math.random() * 30, 0.08, 'sine', 0.2);
  }

  /** Critical hit sound */
  playCriticalHit(): void {
    if (this.muted) return;
    this.playHit();
    this.playTone(800, 0.15, 'square', 0.15);
    setTimeout(() => this.playTone(1200, 0.1, 'square', 0.1), 50);
  }

  /** Enemy death sound */
  playEnemyDeath(enemyType: string = 'slime'): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!this.sfxGain) return;

    let freq = 200;
    let duration = 0.5;

    switch (enemyType) {
      case 'slime':
      case 'slimeKing':
        freq = 150;
        duration = 0.6;
        break;
      case 'wolf':
      case 'boar':
        freq = 100;
        duration = 0.4;
        break;
      case 'spider':
        freq = 300;
        duration = 0.3;
        break;
      case 'skeleton':
        freq = 400;
        duration = 0.35;
        break;
      case 'golem':
      case 'crystalGolem':
        freq = 60;
        duration = 0.7;
        break;
      case 'dragon':
        freq = 40;
        duration = 1.0;
        break;
      default:
        break;
    }

    // Descending tone (death whine)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    osc.frequency.exponentialRampToValueAtTime(freq * 0.3, ctx.currentTime + duration);
    gain.gain.value = 0.15;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration + 0.1);

    // Pop
    this.playNoise(0.08, 0.15, 200);
  }

  /** Player hurt sound */
  playPlayerHurt(): void {
    if (this.muted) return;
    this.playTone(150, 0.2, 'sawtooth', 0.12);
    this.playNoise(0.1, 0.1, 100);
  }

  /** Player death sound */
  playPlayerDeath(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!this.sfxGain) return;

    const duration = 1.2;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 300;
    osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + duration);
    gain.gain.value = 0.2;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration + 0.1);
  }

  /** Gather/chop wood */
  playChopWood(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!this.sfxGain) return;

    const duration = 0.15;
    // Wood crack
    const buffer = this.createNoiseBuffer(ctx, duration);
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const gain = ctx.createGain();
    gain.gain.value = 0.25;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 300;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2000;

    source.connect(hp);
    hp.connect(lp);
    lp.connect(gain);
    gain.connect(this.sfxGain);
    source.start(ctx.currentTime);

    // Thud
    this.playTone(150 + Math.random() * 50, 0.06, 'sine', 0.2);
  }

  /** Mine stone/ore */
  playMineStone(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!this.sfxGain) return;

    const duration = 0.15;
    // Sharp rock crack
    const buffer = this.createNoiseBuffer(ctx, duration);
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const gain = ctx.createGain();
    gain.gain.value = 0.3;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 800;

    source.connect(hp);
    hp.connect(gain);
    gain.connect(this.sfxGain);
    source.start(ctx.currentTime);

    // Metallic ping
    this.playTone(800 + Math.random() * 400, 0.08, 'square', 0.12);
  }

  /** Pick up item */
  playPickup(): void {
    if (this.muted) return;
    this.playTone(600, 0.08, 'sine', 0.1);
    setTimeout(() => this.playTone(900, 0.08, 'sine', 0.08), 60);
  }

  /** Drop item */
  playDrop(): void {
    if (this.muted) return;
    this.playTone(200, 0.1, 'sine', 0.08);
    this.playNoise(0.06, 0.06, 100);
  }

  /** Craft item success */
  playCraft(): void {
    if (this.muted) return;
    this.playTone(400, 0.1, 'sine', 0.15);
    setTimeout(() => this.playTone(600, 0.1, 'sine', 0.12), 100);
    setTimeout(() => this.playTone(800, 0.15, 'sine', 0.1), 200);
  }

  /** Craft failed (not enough materials, etc.) */
  playCraftFail(): void {
    if (this.muted) return;
    this.playTone(200, 0.15, 'square', 0.12);
    setTimeout(() => this.playTone(150, 0.2, 'square', 0.1), 100);
  }

  /** Level up fanfare */
  playLevelUp(): void {
    if (this.muted) return;
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.3, 'sine', 0.2), i * 120);
    });
    // Sparkle
    setTimeout(() => {
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          this.playTone(1200 + Math.random() * 800, 0.15, 'sine', 0.08);
        }, i * 80);
      }
    }, 500);
  }

  /** Quest complete */
  playQuestComplete(): void {
    if (this.muted) return;
    this.playTone(523, 0.15, 'sine', 0.18);
    setTimeout(() => this.playTone(659, 0.15, 'sine', 0.15), 100);
    setTimeout(() => this.playTone(784, 0.15, 'sine', 0.12), 200);
    setTimeout(() => this.playTone(1047, 0.3, 'sine', 0.15), 300);
  }

  /** Quest accepted */
  playQuestAccept(): void {
    if (this.muted) return;
    this.playTone(440, 0.1, 'sine', 0.12);
    setTimeout(() => this.playTone(660, 0.15, 'sine', 0.1), 80);
  }

  /** UI click / button press */
  playUIClick(): void {
    if (this.muted) return;
    this.playTone(800, 0.04, 'sine', 0.06);
  }

  /** UI panel open */
  playUIOpen(): void {
    if (this.muted) return;
    this.playTone(500, 0.06, 'sine', 0.08);
    setTimeout(() => this.playTone(700, 0.06, 'sine', 0.06), 60);
  }

  /** UI panel close */
  playUIClose(): void {
    if (this.muted) return;
    this.playTone(600, 0.05, 'sine', 0.06);
    setTimeout(() => this.playTone(400, 0.05, 'sine', 0.05), 50);
  }

  /** Error / warning sound */
  playError(): void {
    if (this.muted) return;
    this.playTone(200, 0.15, 'square', 0.12);
    setTimeout(() => this.playTone(180, 0.2, 'square', 0.1), 100);
  }

  /** Equip item sound */
  playEquip(): void {
    if (this.muted) return;
    this.playTone(500, 0.06, 'square', 0.1);
    setTimeout(() => this.playTone(700, 0.08, 'sine', 0.08), 60);
  }

  /** Use item (eat/drink) sound */
  playUseItem(): void {
    if (this.muted) return;
    this.playTone(300, 0.06, 'sine', 0.08);
    setTimeout(() => this.playTone(400, 0.08, 'sine', 0.06), 80);
    this.playNoise(0.08, 0.05, 500);
  }

  /** Fish catch */
  playFishCatch(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!this.sfxGain) return;

    // Water splash
    const duration = 0.2;
    const buffer = this.createNoiseBuffer(ctx, duration);
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const gain = ctx.createGain();
    gain.gain.value = 0.2;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 200;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1500;

    source.connect(hp);
    hp.connect(lp);
    lp.connect(gain);
    gain.connect(this.sfxGain);
    source.start(ctx.currentTime);

    // Success chime
    setTimeout(() => this.playTone(700, 0.12, 'sine', 0.1), 150);
    setTimeout(() => this.playTone(900, 0.15, 'sine', 0.08), 250);
  }

  /** Till soil (hoe use) */
  playTillSoil(): void {
    if (this.muted) return;
    this.playNoise(0.12, 0.15, 100, 800);
    this.playTone(120 + Math.random() * 30, 0.1, 'sine', 0.12);
  }

  /** Plant seed */
  playPlantSeed(): void {
    if (this.muted) return;
    this.playTone(400, 0.06, 'sine', 0.06);
    this.playNoise(0.06, 0.04, 300);
  }

  /** Harvest crop */
  playHarvest(): void {
    if (this.muted) return;
    this.playTone(500, 0.08, 'sine', 0.1);
    setTimeout(() => this.playTone(700, 0.1, 'sine', 0.08), 80);
    setTimeout(() => this.playTone(900, 0.12, 'sine', 0.06), 160);
  }

  /** Water plot */
  playWater(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!this.sfxGain) return;

    const duration = 0.2;
    const buffer = this.createNoiseBuffer(ctx, duration);
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const gain = ctx.createGain();
    gain.gain.value = 0.1;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 500;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3000;

    source.connect(hp);
    hp.connect(lp);
    lp.connect(gain);
    gain.connect(this.sfxGain);
    source.start(ctx.currentTime);
  }

  /** Build / place structure */
  playBuild(): void {
    if (this.muted) return;
    this.playNoise(0.12, 0.2, 150, 1200);
    this.playTone(200, 0.08, 'sine', 0.15);
    setTimeout(() => this.playTone(300, 0.1, 'sine', 0.1), 80);
  }

  /** Forge / upgrade item */
  playForge(): void {
    if (this.muted) return;
    this.playNoise(0.3, 0.2, 100, 1000);
    setTimeout(() => this.playTone(400, 0.1, 'square', 0.12), 150);
    setTimeout(() => this.playTone(600, 0.1, 'square', 0.1), 250);
    setTimeout(() => this.playTone(800, 0.2, 'sine', 0.15), 350);
  }

  /** Shop buy/sell */
  playShop(): void {
    if (this.muted) return;
    this.playTone(500, 0.06, 'sine', 0.08);
    setTimeout(() => this.playTone(700, 0.06, 'sine', 0.06), 60);
    setTimeout(() => this.playTone(900, 0.1, 'sine', 0.05), 120);
  }

  /** Door open (gate/chest) */
  playDoorOpen(): void {
    if (this.muted) return;
    this.playNoise(0.1, 0.1, 200, 1200);
    this.playTone(300, 0.08, 'sine', 0.06);
  }

  /** Door close */
  playDoorClose(): void {
    if (this.muted) return;
    this.playNoise(0.08, 0.08, 200, 1000);
    this.playTone(250, 0.06, 'sine', 0.05);
    setTimeout(() => this.playTone(200, 0.06, 'sine', 0.04), 50);
  }

  /** Safe zone pulse (subtle ambient chime when entering safe zone) */
  playSafeZoneEnter(): void {
    if (this.muted) return;
    this.playTone(400, 0.3, 'sine', 0.06);
    setTimeout(() => this.playTone(500, 0.3, 'sine', 0.04), 150);
  }

  /** Night time ambient owl/cricket */
  playNightAmbient(): void {
    if (this.muted) return;
    // Cricket
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        const ctx = this.ensureContext();
        if (!this.ambientGain) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = 4000 + Math.random() * 2000;
        gain.gain.value = 0.02;
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        osc.connect(gain);
        gain.connect(this.ambientGain);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.06);
      }, i * 2000 + Math.random() * 1000);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // AMBIENT / MUSIC
  // ═══════════════════════════════════════════════════════════════

  /** Start ambient sound based on biome/time */
  startAmbient(biome: string, isNight: boolean, inCave: boolean): void {
    this.currentBiome = biome;
    if (this.ambientPlaying) return;
    this.ambientPlaying = true;
    this.updateAmbient(biome, isNight, inCave);
  }

  updateAmbient(biome: string, isNight: boolean, inCave: boolean): void {
    if (!this.ambientPlaying) return;
    const ctx = this.ensureContext();
    if (!this.ambientGain) return;

    // Stop old ambient
    this.stopAmbient();

    if (inCave) {
      // Cave drip ambience
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 60;
      gain.gain.value = 0.03;
      osc.connect(gain);
      gain.connect(this.ambientGain);
      osc.start();
      this.ambientNodes.push(osc);

      // Periodic drip sounds
      this.scheduleCaveDrips();
    } else if (isNight) {
      // Night ambience: low hum
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 50;
      gain.gain.value = 0.02;
      osc.connect(gain);
      gain.connect(this.ambientGain);
      osc.start();
      this.ambientNodes.push(osc);
    } else {
      // Day ambience: wind / birds depending on biome
      if (biome === 'forest' || biome === 'plains') {
        // Wind noise
        const bufferSize = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * 0.3;
        }
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        const gain = ctx.createGain();
        gain.gain.value = 0.04;

        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 200;

        source.connect(lp);
        lp.connect(gain);
        gain.connect(this.ambientGain);
        source.start();
        (source as any)._isAmbient = true;
        (gain as any)._isAmbient = true;
      }
    }
  }

  private scheduleCaveDrips(): void {
    if (!this.ambientPlaying) return;
    const dripDelay = 2000 + Math.random() * 4000;
    setTimeout(() => {
      if (!this.ambientPlaying) return;
      this.playCaveDrip();
      this.scheduleCaveDrips();
    }, dripDelay);
  }

  private playCaveDrip(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!this.ambientGain) return;

    const duration = 0.05;
    const buffer = this.createNoiseBuffer(ctx, duration);
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const gain = ctx.createGain();
    gain.gain.value = 0.04;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1000;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 4000;

    source.connect(hp);
    hp.connect(lp);
    lp.connect(gain);
    gain.connect(this.ambientGain);
    source.start(ctx.currentTime);

    // Water drop tone
    this.playTone(2000 + Math.random() * 1000, 0.03, 'sine', 0.02);
  }

  stopAmbient(): void {
    for (const node of this.ambientNodes) {
      try { node.stop(); } catch (e) { /* already stopped */ }
    }
    this.ambientNodes = [];
  }

  /** Start background music (simple calm procedural melody) */
  startMusic(): void {
    if (this.musicPlaying) return;
    this.musicPlaying = true;
    this.playMusicLoop();
  }

  private playMusicLoop(): void {
    if (!this.musicPlaying) return;

    // Gentle pentatonic melody
    const pentatonic = [262, 294, 330, 392, 440, 524, 588];
    const notes: { freq: number; dur: number; delay: number }[] = [];

    // Generate a simple random melody
    let time = 0;
    for (let i = 0; i < 8; i++) {
      const freq = pentatonic[Math.floor(Math.random() * pentatonic.length)];
      const dur = 0.4 + Math.random() * 0.6;
      notes.push({ freq, dur, delay: time });
      time += dur + 0.1;
    }

    for (const note of notes) {
      setTimeout(() => {
        if (!this.musicPlaying) return;
        this.playTone(note.freq, note.dur, 'sine', 0.06);
        // Soft octave harmony
        setTimeout(() => {
          if (!this.musicPlaying) return;
          this.playTone(note.freq * 2, note.dur * 0.5, 'sine', 0.03);
        }, note.dur * 0.3 * 1000);
      }, note.delay * 1000);
    }

    // Loop
    const totalDuration = time * 1000 + 2000;
    setTimeout(() => this.playMusicLoop(), totalDuration);
  }

  stopMusic(): void {
    this.musicPlaying = false;
  }

  /** Cleanup */
  dispose(): void {
    this.stopAmbient();
    this.stopMusic();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}
