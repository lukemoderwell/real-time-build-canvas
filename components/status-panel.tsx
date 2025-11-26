'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { NodeData } from '@/lib/types';
import { CheckCircle2, Clock, Loader2 } from 'lucide-react';

interface StatusPanelProps {
  nodes: NodeData[];
}

export function StatusPanel({ nodes }: StatusPanelProps) {
  const activeTasks = nodes.filter((n) => n.status !== 'pending');

  // Always show the panel if there are active tasks, or if it was just empty (handled by parent usually, but here we just render)
  // We'll use AnimatePresence in the parent or just hide content.

  if (activeTasks.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className='absolute top-8 right-[340px] w-72 bg-card/80 backdrop-blur-xl border border-border rounded-xl shadow-2xl overflow-hidden z-10'
    >
      <div className='p-3 border-b border-border bg-secondary/30 flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <div className='w-2 h-2 rounded-full bg-green-500 animate-pulse' />
          <h3 className='text-xs font-medium uppercase tracking-wider text-muted-foreground'>
            Coding Agent
          </h3>
        </div>
        <span className='text-[10px] font-mono text-muted-foreground bg-background/50 px-1.5 py-0.5 rounded border border-border/50'>
          {activeTasks.length} Active
        </span>
      </div>

      <div className='max-h-[calc(100vh-200px)] overflow-y-auto p-2 space-y-1 custom-scrollbar'>
        <AnimatePresence mode='popLayout'>
          {activeTasks.map((task) => (
            <motion.div
              key={task.id}
              layout
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className='group flex items-start gap-3 p-2.5 rounded-lg bg-background/40 border border-border/40 hover:bg-background/60 hover:border-border/60 transition-colors'
            >
              <div className='shrink-0 mt-0.5'>
                {task.status === 'processing' && (
                  <Loader2 size={14} className='text-blue-400 animate-spin' />
                )}
                {task.status === 'coded' && (
                  <CheckCircle2 size={14} className='text-green-400' />
                )}
                {task.status === 'review' && (
                  <Clock size={14} className='text-yellow-400' />
                )}
              </div>

              <div className='flex-1 min-w-0'>
                <div className='truncate font-medium text-xs text-foreground mb-0.5'>
                  {task.title}
                </div>
                <div className='flex items-center justify-between'>
                  <span className='text-[10px] text-muted-foreground capitalize'>
                    {task.status}
                  </span>
                  {task.status === 'processing' && (
                    <span className='text-[10px] text-blue-400 font-mono'>
                      Compiling...
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
