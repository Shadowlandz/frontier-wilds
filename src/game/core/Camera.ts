// ═══════════════════════════════════════════════════════════════════
// Farm Survival - Camera System
// ═══════════════════════════════════════════════════════════════════

import { Vec2, TILE_SIZE } from './Types';
import { lerp, clamp } from './Utils';

export class Camera {
  x = 0;
  y = 0;
  targetX = 0;
  targetY = 0;
  zoom = 1;
  width = 0;
  height = 0;
  shakeX = 0;
  shakeY = 0;
  shakeIntensity = 0;
  shakeDuration = 0;
  followSpeed = 5;

  resize(w: number, h: number): void {
    this.width = w;
    this.height = h;
  }

  follow(target: Vec2): void {
    this.targetX = target.x - this.width / (2 * this.zoom);
    this.targetY = target.y - this.height / (2 * this.zoom);
  }

  update(dt: number): void {
    // Smooth follow
    this.x = lerp(this.x, this.targetX, this.followSpeed * dt);
    this.y = lerp(this.y, this.targetY, this.followSpeed * dt);

    // Camera shake
    if (this.shakeDuration > 0) {
      this.shakeX = (Math.random() - 0.5) * this.shakeIntensity * 2;
      this.shakeY = (Math.random() - 0.5) * this.shakeIntensity * 2;
      this.shakeDuration -= dt;
      this.shakeIntensity *= 0.95;
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
    }
  }

  shake(intensity: number, duration: number): void {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
  }

  worldToScreen(wx: number, wy: number): Vec2 {
    return {
      x: (wx - this.x) * this.zoom + this.shakeX,
      y: (wy - this.y) * this.zoom + this.shakeY,
    };
  }

  screenToWorld(sx: number, sy: number): Vec2 {
    return {
      x: sx / this.zoom + this.x,
      y: sy / this.zoom + this.y,
    };
  }

  isVisible(wx: number, wy: number, w: number, h: number): boolean {
    const margin = TILE_SIZE * 2;
    return (
      wx + w > this.x - margin &&
      wx < this.x + this.width / this.zoom + margin &&
      wy + h > this.y - margin &&
      wy < this.y + this.height / this.zoom + margin
    );
  }

  clampToWorld(worldWidth: number, worldHeight: number): void {
    this.x = clamp(this.x, 0, Math.max(0, worldWidth - this.width / this.zoom));
    this.y = clamp(this.y, 0, Math.max(0, worldHeight - this.height / this.zoom));
  }
}
