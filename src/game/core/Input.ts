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

  // ── Touch / Mobile Controls ──────────────────────────────────────
  /** Movement vector from touch (virtual joystick), normalized */
  touchMovement: Vec2 = { x: 0, y: 0 };
  /** Virtual keys set by the MobileHUD (simulate keyboard presses) */
  private virtualKeys: Set<string> = new Set();
  /** Virtual keys that were just pressed this frame */
  private virtualKeysPressed: Set<string> = new Set();
  /** Queue of virtual key presses that persist across frames until consumed */
  private virtualKeyQueue: string[] = [];

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
    // Refill virtualKeysPressed from the persistent queue,
    // ensuring triggerVirtualKeyPress() calls are never missed
    this.virtualKeysPressed.clear();
    for (const k of this.virtualKeyQueue) {
      this.virtualKeysPressed.add(k);
    }
    this.virtualKeyQueue.length = 0;
  }

  isKeyDown(key: string): boolean {
    const k = key.toLowerCase();
    return this.keys.has(k) || this.virtualKeys.has(k);
  }

  isKeyPressed(key: string): boolean {
    const k = key.toLowerCase();
    return this.keysPressed.has(k) || this.virtualKeysPressed.has(k);
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

    // Keyboard movement
    const k = this.keys;
    if (k.has('w') || k.has('arrowup')) dy -= 1;
    if (k.has('s') || k.has('arrowdown')) dy += 1;
    if (k.has('a') || k.has('arrowleft')) dx -= 1;
    if (k.has('d') || k.has('arrowright')) dx += 1;

    // Touch movement (overrides keyboard if active)
    if (this.touchMovement.x !== 0 || this.touchMovement.y !== 0) {
      dx = this.touchMovement.x;
      dy = this.touchMovement.y;
    }

    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
      const inv = 1 / Math.sqrt(2);
      dx *= inv;
      dy *= inv;
    }

    return { x: dx, y: dy };
  }

  // ── Touch Control API ───────────────────────────────────────────
  /** Set the virtual movement direction from a touch joystick (values -1..1) */
  setTouchMovement(x: number, y: number): void {
    // Clamp and normalize
    const len = Math.sqrt(x * x + y * y);
    if (len > 1) {
      this.touchMovement.x = x / len;
      this.touchMovement.y = y / len;
    } else {
      this.touchMovement.x = x;
      this.touchMovement.y = y;
    }
  }

  /** Clear touch movement (finger lifted) */
  clearTouchMovement(): void {
    this.touchMovement.x = 0;
    this.touchMovement.y = 0;
  }

  /** Simulate pressing a virtual key (will be held until released) */
  setVirtualKey(key: string, pressed: boolean): void {
    const k = key.toLowerCase();
    if (pressed) {
      if (!this.virtualKeys.has(k)) {
        this.virtualKeysPressed.add(k);
      }
      this.virtualKeys.add(k);
    } else {
      this.virtualKeys.delete(k);
    }
  }

  /** Trigger a single press-release of a virtual key (for taps) */
  triggerVirtualKeyPress(key: string): void {
    const k = key.toLowerCase();
    // Add to both immediate set (for same-frame checks)
    // and persistent queue (survives update() clear cycle)
    this.virtualKeysPressed.add(k);
    this.virtualKeys.add(k);
    this.virtualKeyQueue.push(k);
  }

  /** Check if this is a touch-enabled device */
  static isMobileDevice(): boolean {
    return ('maxTouchPoints' in navigator && navigator.maxTouchPoints > 0) ||
      /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  destroy(): void {
    // Listeners are cleaned up when canvas is removed
    this.keys.clear();
    this.mouseDown.clear();
    this.virtualKeys.clear();
  }
}
