// ═══════════════════════════════════════════════════════════════════
// Farm Survival - Long Press Hook
// Detects long presses for item tooltips, context menus on mobile
// ═══════════════════════════════════════════════════════════════════

import { useRef, useCallback } from 'react';

interface LongPressOptions {
  duration?: number;      // ms to hold before firing (default 400)
  onLongPress: () => void;
  onTap?: () => void;
  vibrateOnPress?: boolean;
}

export function useLongPress({
  duration = 400,
  onLongPress,
  onTap,
  vibrateOnPress = false,
}: LongPressOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);
  const startPos = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    isLongPress.current = false;
    const touch = e.changedTouches[0];
    startPos.current = { x: touch.clientX, y: touch.clientY };

    timerRef.current = setTimeout(() => {
      isLongPress.current = true;
      if (vibrateOnPress && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try { navigator.vibrate(15); } catch {}
      }
      onLongPress();
    }, duration);
  }, [duration, onLongPress, vibrateOnPress]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!startPos.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - startPos.current.x;
    const dy = touch.clientY - startPos.current.y;
    // Cancel if moved more than 15px (scrolling, not long-pressing)
    if (Math.sqrt(dx * dx + dy * dy) > 15) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    // Only fire tap if it wasn't a long press
    if (!isLongPress.current) {
      onTap?.();
    }
    isLongPress.current = false;
    startPos.current = null;
  }, [onTap]);

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
}
