// ═══════════════════════════════════════════════════════════════════
// Farm Survival - Utility Functions
// ═══════════════════════════════════════════════════════════════════

import { Vec2, Rarity } from './Types';

// ── Math ──────────────────────────────────────────────────────────
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

export function distance(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function distanceSq(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

export function normalize(v: Vec2): Vec2 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

export function addVec(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function subVec(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scaleVec(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s };
}

export function dotVec(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

export function length(v: Vec2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

// ── Random ────────────────────────────────────────────────────────
export class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 16807 + 0) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  intRange(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  chance(probability: number): boolean {
    return this.next() < probability;
  }

  pick<T>(array: T[]): T {
    return array[Math.floor(this.next() * array.length)];
  }

  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}

// Perlin-like noise (simple implementation)
export function simpleNoise(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed * 43758.5453) * 43758.5453;
  return n - Math.floor(n);
}

export function smoothNoise(x: number, y: number, seed: number, scale: number = 1): number {
  const sx = x / scale;
  const sy = y / scale;
  const ix = Math.floor(sx);
  const iy = Math.floor(sy);
  const fx = sx - ix;
  const fy = sy - iy;

  const a = simpleNoise(ix, iy, seed);
  const b = simpleNoise(ix + 1, iy, seed);
  const c = simpleNoise(ix, iy + 1, seed);
  const d = simpleNoise(ix + 1, iy + 1, seed);

  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);

  return lerp(lerp(a, b, ux), lerp(c, d, ux), uy);
}

export function fractalNoise(
  x: number,
  y: number,
  seed: number,
  octaves: number = 4,
  baseScale: number = 64,
  persistence: number = 0.5
): number {
  let total = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    total += smoothNoise(x * frequency, y * frequency, seed + i * 1000, baseScale) * amplitude;
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= 2;
  }

  return total / maxValue;
}

// ── Collision ─────────────────────────────────────────────────────
export function rectIntersect(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function pointInRect(px: number, py: number, r: { x: number; y: number; w: number; h: number }): boolean {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

// ── Color ─────────────────────────────────────────────────────────
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 0, g: 0, b: 0 };
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => Math.round(x).toString(16).padStart(2, '0')).join('');
}

export function lerpColor(a: string, b: string, t: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return rgbToHex(
    lerp(ca.r, cb.r, t),
    lerp(ca.g, cb.g, t),
    lerp(ca.b, cb.b, t)
  );
}

export function darkenColor(hex: string, amount: number): string {
  const c = hexToRgb(hex);
  return rgbToHex(c.r * (1 - amount), c.g * (1 - amount), c.b * (1 - amount));
}

export function lightenColor(hex: string, amount: number): string {
  const c = hexToRgb(hex);
  return rgbToHex(
    c.r + (255 - c.r) * amount,
    c.g + (255 - c.g) * amount,
    c.b + (255 - c.b) * amount
  );
}

// ── ID Generation ─────────────────────────────────────────────────
let _nextId = 0;
export function generateId(): string {
  return `e${++_nextId}_${Date.now().toString(36)}`;
}

// ── Rarity Helpers ────────────────────────────────────────────────
export const RARITY_COLORS: Record<Rarity, string> = {
  [Rarity.Common]: '#b0b0b0',
  [Rarity.Uncommon]: '#4caf50',
  [Rarity.Rare]: '#2196f3',
  [Rarity.Epic]: '#9c27b0',
  [Rarity.Legendary]: '#ff9800',
};

export const RARITY_WEIGHTS: Record<Rarity, number> = {
  [Rarity.Common]: 50,
  [Rarity.Uncommon]: 30,
  [Rarity.Rare]: 14,
  [Rarity.Epic]: 5,
  [Rarity.Legendary]: 1,
};

// ── Formatting ────────────────────────────────────────────────────
export function formatTime(hour: number, minute: number): string {
  const h = Math.floor(hour);
  const m = Math.floor(minute);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return Math.floor(n).toString();
}

export function xpForLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.15, level - 1));
}
