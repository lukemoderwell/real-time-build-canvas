'use client';

import { cn } from '@/lib/utils';

interface ResizeHandleProps {
  direction: 'left' | 'right';
  onMouseDown: (e: React.MouseEvent) => void;
  isResizing?: boolean;
}

export function ResizeHandle({ direction, onMouseDown, isResizing }: ResizeHandleProps) {
  return (
    <div
      onMouseDown={onMouseDown}
      className={cn(
        'absolute top-0 bottom-0 w-1 cursor-col-resize z-30 group',
        'hover:bg-primary/50 transition-colors',
        direction === 'left' ? 'left-0 -translate-x-1/2' : 'right-0 translate-x-1/2',
        isResizing && 'bg-primary/50'
      )}
    >
      {/* Wider hit area */}
      <div className="absolute inset-y-0 -inset-x-1" />
    </div>
  );
}
