// ═══════════════════════════════════════════════════════════════════
// Farm Survival - Input System
// ═══════════════════════════════════════════════════════════════════

import { Vec2 } from './Types';

export class Input {
  private keys: Set<string> = new Set();
  private keysPressed: Set<string> = new Set();
  private keysReleased: Set<string> = new Set();
  private mousePos: Vec2 = { x: 0, y: 0 };
  private mouseDown: Set<number> = new Set();
  private mouseClicked: Set<number> = new Set();
  private mouseReleased: Set<number> = new Set();
  private canvas: HTMLCanvasElement | null = null;
  private scrollDelta = 0;

  init(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;

    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      this.keys.add(e.key.toLowerCase());
      this.keysPressed.add(e.key.toLowerCase());
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
      this.keysReleased.add(e.key.toLowerCase());
    });

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      this.mousePos = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    });

    canvas.addEventListener('mousedown', (e) => {
      this.mouseDown.add(e.button);
      this.mouseClicked.add(e.button);
    });

    canvas.addEventListener('mouseup', (e) => {
      this.mouseDown.delete(e.button);
      this.mouseReleased.add(e.button);
    });

    canvas.addEventListener('wheel', (e) => {
      this.scrollDelta += Math.sign(e.deltaY);
    });

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  update(): void {
    this.keysPressed.clear();
    this.keysReleased.clear();
    this.mouseClicked.clear();
    this.mouseReleased.clear();
    this.scrollDelta = 0;
  }

  isKeyDown(key: string): boolean {
    return this.keys.has(key.toLowerCase());
  }

  isKeyPressed(key: string): boolean {
    return this.keysPressed.has(key.toLowerCase());
  }

  isKeyReleased(key: string): boolean {
    return this.keysReleased.has(key.toLowerCase());
  }

  isMouseDown(button: number = 0): boolean {
    return this.mouseDown.has(button);
  }

  isMouseClicked(button: number = 0): boolean {
    return this.mouseClicked.has(button);
  }

  getMousePos(): Vec2 {
    return { ...this.mousePos };
  }

  getScrollDelta(): number {
    return this.scrollDelta;
  }

  getMovementVector(): Vec2 {
    let dx = 0;
    let dy = 0;

    if (this.isKeyDown('w') || this.isKeyDown('arrowup')) dy -= 1;
    if (this.isKeyDown('s') || this.isKeyDown('arrowdown')) dy += 1;
    if (this.isKeyDown('a') || this.isKeyDown('arrowleft')) dx -= 1;
    if (this.isKeyDown('d') || this.isKeyDown('arrowright')) dx += 1;

    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
      const inv = 1 / Math.sqrt(2);
      dx *= inv;
      dy *= inv;
    }

    return { x: dx, y: dy };
  }

  destroy(): void {
    // Listeners are cleaned up when canvas is removed
    this.keys.clear();
    this.mouseDown.clear();
  }
}
