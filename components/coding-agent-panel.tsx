'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Copy, Check, Terminal } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

interface CodingAgentPanelProps {
  prompt: string | null;
  isGenerating?: boolean;
  onClose: () => void;
  onCopy: () => void;
  copied: boolean;
  x: number;
  y: number;
  scale: number;
  onPositionUpdate: (x: number, y: number) => void;
}

export function CodingAgentPanel({
  prompt,
  isGenerating = false,
  onClose,
  onCopy,
  copied,
  x,
  y,
  scale,
  onPositionUpdate,
}: CodingAgentPanelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const panelStartPos = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && !e.altKey) {
      setIsDragging(true);
      dragStartPos.current = { x: e.clientX, y: e.clientY };
      panelStartPos.current = { x, y };
      e.stopPropagation();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const dx = (e.clientX - dragStartPos.current.x) / scale;
      const dy = (e.clientY - dragStartPos.current.y) / scale;
      const newX = panelStartPos.current.x + dx;
      const newY = panelStartPos.current.y + dy;
      onPositionUpdate(newX, newY);
      e.stopPropagation();
    }
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
    }
  };

  if (!prompt && !isGenerating) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className={cn(
        'absolute w-[600px] max-w-[90vw] bg-card/95 border rounded-xl shadow-2xl backdrop-blur-md z-50 flex flex-col overflow-hidden',
        isDragging && 'cursor-grabbing transition-none',
        !isDragging && 'cursor-grab'
      )}
      style={{
        left: `${x}px`,
        top: `${y}px`,
        willChange: isDragging ? 'transform' : 'auto',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Header - draggable area */}
      <div
        className="flex items-center justify-between p-4 border-b border-border bg-background/50"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget || (e.target as HTMLElement).closest('button') === null) {
            handleMouseDown(e);
          }
        }}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Terminal className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Coding Agent</h2>
            <p className="text-xs text-muted-foreground">Build prompt ready</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="flex-shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 bg-secondary/30 min-h-[300px] max-h-[500px]">
        {isGenerating ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-sm text-muted-foreground">Generating prompt...</p>
            </div>
          </div>
        ) : (
          <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed text-foreground">
            {prompt}
          </pre>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 p-4 border-t border-border bg-background/50">
        <Button
          variant="outline"
          onClick={onCopy}
          className="flex items-center gap-2"
          disabled={isGenerating || !prompt}
        >
          {copied ? (
            <>
              <Check size={16} />
              Copied!
            </>
          ) : (
            <>
              <Copy size={16} />
              Copy Prompt
            </>
          )}
        </Button>
        <Button onClick={onClose}>Close</Button>
      </div>
    </motion.div>
  );
}

