'use client';

import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useResizable } from '@/hooks/use-resizable';
import { ResizeHandle } from '@/components/resize-handle';

interface TranscriptPanelProps {
  fullTranscript: string;
  currentSessionText: string;
  isRecording: boolean;
  recordingMode?: 'idle' | 'ptt' | 'toggle';
  isAnalyzing?: boolean;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
  width: number;
  onWidthChange: (width: number) => void;
}

export function TranscriptPanel({
  fullTranscript,
  currentSessionText,
  isRecording,
  recordingMode = 'idle',
  isAnalyzing = false,
  isMinimized = false,
  onToggleMinimize,
  width,
  onWidthChange,
}: TranscriptPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { width: resizeWidth, isResizing, handleMouseDown } = useResizable({
    initialWidth: width,
    minWidth: 200,
    maxWidth: 500,
    direction: 'right',
    storageKey: 'transcript-panel-width',
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
  }, [fullTranscript, currentSessionText, isRecording]);

  const displayText =
    fullTranscript +
    (currentSessionText
      ? (fullTranscript ? ' ' : '') + currentSessionText
      : '');

  if (isMinimized) {
    return (
      <div className='w-12 h-full border-r border-border bg-card/50 backdrop-blur-xl flex flex-col z-20 absolute left-0 top-0 shadow-2xl'>
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
      style={{ width: `${resizeWidth}px` }}
      className='h-full border-r border-border bg-card/50 backdrop-blur-xl flex flex-col z-20 absolute left-0 top-0 shadow-2xl'
    >
      <ResizeHandle direction="right" onMouseDown={handleMouseDown} isResizing={isResizing} />
      <div className='p-4 border-b border-border flex items-center justify-between'>
        <h2 className='text-xs font-medium text-muted-foreground uppercase tracking-wider'>
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
              <span className='text-[10px] text-muted-foreground'>
                {recordingMode === 'ptt' ? 'Push-to-Talk' : 'Recording'}
              </span>
            </div>
          )}
          {onToggleMinimize && (
            <button
              onClick={onToggleMinimize}
              className='p-1.5 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground transition-colors'
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
        {!displayText ? (
          <div className='text-muted-foreground text-sm'>
            Start speaking to generate transcript...
          </div>
        ) : (
          <div className='space-y-4'>
            <div className='space-y-1'>
              <div className='text-xs font-medium text-muted-foreground'>
                me
              </div>
              <div className='text-[14px] leading-relaxed text-foreground whitespace-pre-wrap'>
                {displayText}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Analyzing Indicator */}
      {isAnalyzing && (
        <div className='p-3 border-t border-border bg-background/50'>
          <div className='flex items-center justify-center gap-2 text-sm text-muted-foreground'>
            <Loader2 className='h-4 w-4 animate-spin' />
            <span>Analyzing transcript...</span>
          </div>
        </div>
      )}
    </div>
  );
}
