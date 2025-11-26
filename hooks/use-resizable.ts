'use client';

import { useState, useCallback, useEffect, useRef, useSyncExternalStore } from 'react';

interface UseResizableOptions {
  initialWidth: number;
  minWidth?: number;
  maxWidth?: number;
  direction: 'left' | 'right'; // Which side the resize handle is on
  storageKey?: string; // Optional key for localStorage persistence
}

interface UseResizableReturn {
  width: number;
  isResizing: boolean;
  handleMouseDown: (e: React.MouseEvent) => void;
}

// Helper to read from localStorage with validation
function getStoredWidth(
  storageKey: string | undefined,
  minWidth: number,
  maxWidth: number,
  fallback: number
): number {
  if (!storageKey) return fallback;
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed) && parsed >= minWidth && parsed <= maxWidth) {
        return parsed;
      }
    }
  } catch {
    // localStorage not available
  }
  return fallback;
}

export function useResizable({
  initialWidth,
  minWidth = 200,
  maxWidth = 600,
  direction,
  storageKey,
}: UseResizableOptions): UseResizableReturn {
  // Use useSyncExternalStore to safely read from localStorage
  // This prevents hydration mismatches by returning initialWidth on server
  const storedWidth = useSyncExternalStore(
    // Subscribe - localStorage doesn't have events, so we just return a no-op
    () => () => {},
    // getSnapshot (client) - read from localStorage
    () => getStoredWidth(storageKey, minWidth, maxWidth, initialWidth),
    // getServerSnapshot - always return initialWidth on server
    () => initialWidth
  );

  const [width, setWidth] = useState(storedWidth);
  const [isResizing, setIsResizing] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;
  }, [width]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      // direction = which side the handle is on
      // 'right' handle (left panel): drag right = wider, drag left = narrower
      // 'left' handle (right panel): drag left = wider, drag right = narrower
      const delta = direction === 'right'
        ? e.clientX - startXRef.current
        : startXRef.current - e.clientX;

      const newWidth = Math.min(maxWidth, Math.max(minWidth, startWidthRef.current + delta));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      if (storageKey) {
        localStorage.setItem(storageKey, width.toString());
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // Prevent text selection while resizing
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing, direction, minWidth, maxWidth, storageKey, width]);

  // Save to localStorage on width change (debounced via mouseup)
  useEffect(() => {
    if (storageKey && !isResizing) {
      localStorage.setItem(storageKey, width.toString());
    }
  }, [width, storageKey, isResizing]);

  return { width, isResizing, handleMouseDown };
}
