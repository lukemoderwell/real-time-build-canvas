'use client';

import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { Loader2, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import Image from 'next/image';
import { useResizable } from '@/hooks/use-resizable';
import { ResizeHandle } from '@/components/resize-handle';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { TranscriptSegment } from '@/lib/types';

interface TranscriptPanelProps {
  transcriptSegments: TranscriptSegment[];
  currentSessionText: string;
  sessionStartTime: number | null;
  isRecording: boolean;
  recordingMode?: 'idle' | 'ptt' | 'toggle';
  isAnalyzing?: boolean;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
  width: number;
  onWidthChange: (width: number) => void;
}

function formatDuration(startTime: number, segmentTime: number): string {
  const diffMs = segmentTime - startTime;
  const totalSeconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function TranscriptPanel({
  transcriptSegments,
  currentSessionText,
  sessionStartTime,
  isRecording,
  recordingMode = 'idle',
  isAnalyzing = false,
  isMinimized = false,
  onToggleMinimize,
  width,
  onWidthChange,
}: TranscriptPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const {
    width: resizeWidth,
    isResizing,
    handleMouseDown,
  } = useResizable({
    initialWidth: width,
    minWidth: 200,
    maxWidth: 500,
    direction: 'right',
  });

  // Sync resize width changes back to parent
  useEffect(() => {
    if (resizeWidth !== width) {
      onWidthChange(resizeWidth);
    }
  }, [resizeWidth, width, onWidthChange]);

  // Auto-scroll to bottom when new text is added (but only if user is near bottom)
  useEffect(() => {
    if (scrollRef.current && isRecording) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

      if (isNearBottom) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }
  }, [transcriptSegments, currentSessionText, isRecording]);

  const hasContent = transcriptSegments.length > 0 || currentSessionText;

  if (isMinimized) {
    return (
      <div 
        style={{ backgroundColor: 'var(--primary-dark)' }}
        className='w-12 h-full border-r border-white/10 flex flex-col z-20 absolute left-0 top-0 shadow-2xl'
      >
        <div className='p-4 border-b border-border flex items-center justify-center'>
          {onToggleMinimize && (
            <button
              onClick={onToggleMinimize}
              className='p-1.5 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground transition-colors'
              title='Expand transcript panel'
            >
              <ChevronRight size={16} />
            </button>
          )}
        </div>
        {isRecording && (
          <div className='flex flex-col items-center gap-2 p-2'>
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{
                repeat: Number.POSITIVE_INFINITY,
                duration: recordingMode === 'ptt' ? 0.5 : 1.5,
                ease: 'easeInOut',
              }}
              className={`w-2 h-2 rounded-full ${
                recordingMode === 'ptt' ? 'bg-orange-500' : 'bg-red-500'
              }`}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      style={{ width: `${resizeWidth}px`, backgroundColor: 'var(--primary-dark)' }}
      className='h-full flex flex-col z-20 absolute left-0 top-0 shadow-2xl'
    >
      <ResizeHandle
        direction='right'
        onMouseDown={handleMouseDown}
        isResizing={isResizing}
      />
      <div className='p-4 border-b border-white/10 flex items-center justify-between'>
        <h2 className='text-xs font-medium text-zinc-400 uppercase tracking-wider'>
          Transcript
        </h2>
        <div className='flex items-center gap-2'>
          {isRecording && (
            <div className='flex items-center gap-1.5'>
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{
                  repeat: Number.POSITIVE_INFINITY,
                  duration: recordingMode === 'ptt' ? 0.5 : 1.5,
                  ease: 'easeInOut',
                }}
                className={`w-2 h-2 rounded-full ${
                  recordingMode === 'ptt' ? 'bg-orange-500' : 'bg-red-500'
                }`}
              />
              <span className='text-[10px] text-zinc-400'>
                {recordingMode === 'ptt' ? 'Push-to-Talk' : 'Recording'}
              </span>
            </div>
          )}
          {onToggleMinimize && (
            <button
              onClick={onToggleMinimize}
              className='p-1.5 hover:bg-white/10 rounded-md text-zinc-400 hover:text-zinc-200 transition-colors'
              title='Minimize transcript panel'
            >
              <ChevronLeft size={16} />
            </button>
          )}
        </div>
      </div>

      <div
        ref={scrollRef}
        className='flex-1 overflow-y-auto p-4 custom-scrollbar'
      >
        {!hasContent ? (
          <div className='text-zinc-500 text-sm'>
            Start speaking to generate transcript...
          </div>
        ) : (
          <div className='space-y-4'>
            {transcriptSegments.map((segment, index) => (
              <div key={segment.id}>
                {index > 0 && <div className='border-t border-white/10 my-4' />}
                <div className='space-y-1'>
                  <div className='text-xs font-medium text-zinc-500'>
                    {sessionStartTime
                      ? formatDuration(sessionStartTime, segment.timestamp)
                      : '0:00'}
                  </div>
                  <div className='text-[14px] leading-relaxed text-zinc-200 whitespace-pre-wrap'>
                    {segment.text}
                  </div>
                </div>
              </div>
            ))}

            {/* Currently streaming segment - no timestamp until recording stops */}
            {currentSessionText && (
              <div>
                {transcriptSegments.length > 0 && (
                  <div className='border-t border-white/10 my-4' />
                )}
                <div className='text-[14px] leading-relaxed text-zinc-200 whitespace-pre-wrap'>
                  {currentSessionText}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Analyzing Indicator */}
      {isAnalyzing && (
        <div className='p-3 border-t border-white/10'>
          <div className='flex items-center justify-center gap-2 text-sm text-zinc-400'>
            <Loader2 className='h-4 w-4 animate-spin' />
            <span>Analyzing transcript...</span>
          </div>
        </div>
      )}

      {/* Branding Footer */}
      <div className='p-4 border-t border-white/10 flex items-center justify-between'>
        <Image
          src='/logo.svg'
          alt='Product Forge'
          width={120}
          height={24}
          className='opacity-60 hover:opacity-100 transition-opacity'
        />
        <Popover>
          <PopoverTrigger asChild>
            <button className='p-1 hover:bg-white/10 rounded text-zinc-400 hover:text-zinc-200 transition-colors'>
              <Info size={14} />
            </button>
          </PopoverTrigger>
          <PopoverContent side='right' align='end' className='w-72 p-4'>
            <div className='space-y-3'>
              <div>
                <p className='text-sm font-medium text-foreground'>
                  Product Forge
                </p>
                <p className='text-sm text-muted-foreground'>
                  Turn Customer Insights into Valuable Products, fast.
                </p>
              </div>
              <p className='text-xs text-muted-foreground'>
                Software that surfaces insights and helps you turn it into
                prototypes and features in no time flat.
              </p>
              <a
                href='https://productforge.ai'
                target='_blank'
                rel='noopener noreferrer'
                className='text-sm text-primary hover:underline inline-block'
              >
                Sign up for free →
              </a>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
