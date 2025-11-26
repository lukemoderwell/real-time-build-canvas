'use client';

import type React from 'react';

import { motion } from 'framer-motion';
import type { NodeData } from '@/lib/types';
import { cn } from '@/lib/utils';
import { CheckCircle2 } from 'lucide-react';
import { useState, useRef } from 'react';

interface NodeCardProps {
  node: NodeData;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDragStart?: (id: string) => void;
  onDragMove?: (id: string, dx: number, dy: number) => void;
  onDragEnd?: (id: string) => void;
  scale: number;
  groupColor?: string;
}

export function NodeCard({
  node,
  isSelected,
  onSelect,
  onDragStart,
  onDragMove,
  onDragEnd,
  scale,
  groupColor,
}: NodeCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && !e.altKey) {
      setIsDragging(true);
      dragStartPos.current = { x: e.clientX, y: e.clientY };
      onDragStart?.(node.id);
      e.stopPropagation();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const dx = (e.clientX - dragStartPos.current.x) / scale;
      const dy = (e.clientY - dragStartPos.current.y) / scale;
      dragStartPos.current = { x: e.clientX, y: e.clientY };
      onDragMove?.(node.id, dx, dy);
      e.stopPropagation();
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isDragging) {
      setIsDragging(false);
      onDragEnd?.(node.id);
      e.stopPropagation();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className={cn(
        'absolute w-72 bg-card/90 border rounded-xl shadow-sm backdrop-blur-sm cursor-pointer group overflow-hidden',
        isDragging &&
          'cursor-grabbing z-20 shadow-2xl scale-105 transition-none',
        !isDragging && 'cursor-grab transition-all duration-200',
        isSelected
          ? 'ring-2 ring-primary shadow-lg z-10'
          : 'hover:shadow-md hover:-translate-y-1'
      )}
      style={{
        left: node.x,
        top: node.y,
        borderColor: groupColor ? `${groupColor}66` : undefined, // ~40% opacity
        background: groupColor
          ? `linear-gradient(to bottom right, ${groupColor}1A, var(--card))` // ~10% opacity start
          : undefined,
        willChange: isDragging ? 'transform' : 'auto',
      }}
      onClick={(e) => {
        if (!isDragging) {
          e.stopPropagation();
          onSelect(node.id);
        }
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Content */}
      <div className='p-5'>
        <h3 className='font-semibold text-sm mb-2 text-foreground leading-tight pr-6'>
          {node.title}
        </h3>
        <p className='text-xs text-muted-foreground leading-relaxed line-clamp-4'>
          {node.description}
        </p>
      </div>

      {/* Selection Indicator */}
      {isSelected && (
        <div className='absolute top-3 right-3'>
          <div className='w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-sm'>
            <CheckCircle2 size={12} />
          </div>
        </div>
      )}
    </motion.div>
  );
}
