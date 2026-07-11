// ═══════════════════════════════════════════════════════════════════
// Farm Survival - Touch Drag & Drop Hook
// Reusable hook for mobile-friendly inventory drag-and-drop
// ═══════════════════════════════════════════════════════════════════

import { useState, useRef, useCallback } from 'react';

export interface DragSource {
  pool: 'inventory' | 'hotbar' | 'equipment' | 'chest' | 'furnace_input' | 'furnace_fuel' | 'furnace_output';
  index: string | number;
}

export function useTouchDrag() {
  const [dragSource, setDragSource] = useState<DragSource | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragOrigin = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = useCallback((source: DragSource, e: React.TouchEvent) => {
    const touch = e.changedTouches[0];
    dragOrigin.current = { x: touch.clientX, y: touch.clientY };
    // Start long-press detection for drag
    longPressTimer.current = setTimeout(() => {
      setDragSource(source);
      vibrate(20);
    }, 250);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragOrigin.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - dragOrigin.current.x;
    const dy = touch.clientY - dragOrigin.current.y;
    // Cancel long-press if moved too far (>10px)
    if (Math.sqrt(dx * dx + dy * dy) > 10) {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      setDragSource(null);
    }
  }, []);

  const onTouchEnd = useCallback((target: DragSource | null) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (dragSource && target) {
      // If drag source exists, perform swap
      vibrate(10);
      setDragSource(null);
      setDragOverIndex(null);
      return { source: dragSource, target };
    }
    setDragSource(null);
    setDragOverIndex(null);
    dragOrigin.current = null;
    return null;
  }, [dragSource]);

  const cancelDrag = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setDragSource(null);
    setDragOverIndex(null);
    dragOrigin.current = null;
  }, []);

  return {
    dragSource,
    dragOverIndex,
    setDragOverIndex,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    cancelDrag,
  };
}

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate(pattern); } catch {}
  }
}
