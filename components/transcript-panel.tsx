'use client';

import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Sparkles, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

interface TranscriptPanelProps {
  fullTranscript: string;
  currentSessionText: string;
  isRecording: boolean;
  onManualAnalyze?: () => void;
  hasBufferedTranscript?: boolean;
  isAnalyzing?: boolean;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
}

export function TranscriptPanel({
  fullTranscript,
  currentSessionText,
  isRecording,
  onManualAnalyze,
  hasBufferedTranscript = false,
  isAnalyzing = false,
  isMinimized = false,
  onToggleMinimize,
}: TranscriptPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

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
      <div className='w-12 h-full border-r border-sidebar-border bg-sidebar flex flex-col z-20 absolute left-0 top-0 shadow-2xl'>
        <div className='p-4 border-b border-sidebar-border flex items-center justify-center'>
          {onToggleMinimize && (
            <button
              onClick={onToggleMinimize}
              className='p-1.5 hover:bg-sidebar-accent rounded-md text-sidebar-foreground hover:text-white transition-colors'
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
                duration: 1.5,
                ease: 'easeInOut',
              }}
              className='w-2 h-2 bg-red-500 rounded-full'
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className='w-80 h-full border-r border-sidebar-border bg-sidebar flex flex-col z-20 absolute left-0 top-0 shadow-2xl'>
      <div className='p-4 border-b border-sidebar-border flex items-center justify-between'>
        <h2 className='text-xs font-medium text-sidebar-foreground uppercase tracking-wider'>
          Transcript
        </h2>
        <div className='flex items-center gap-2'>
          {isRecording && (
            <div className='flex items-center gap-1.5'>
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{
                  repeat: Number.POSITIVE_INFINITY,
                  duration: 1.5,
                  ease: 'easeInOut',
                }}
                className='w-2 h-2 bg-red-500 rounded-full'
              />
              <span className='text-[10px] text-sidebar-foreground/70'>Recording</span>
            </div>
          )}
          {onToggleMinimize && (
            <button
              onClick={onToggleMinimize}
              className='p-1.5 hover:bg-sidebar-accent rounded-md text-sidebar-foreground hover:text-white transition-colors'
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
          <div className='text-sidebar-foreground/70 text-sm'>
            Start speaking to generate transcript...
          </div>
        ) : (
          <div className='space-y-4'>
            <div className='space-y-1'>
              <div className='text-xs font-medium text-sidebar-foreground/80'>
                me
              </div>
              <div className='text-[14px] leading-relaxed text-sidebar-foreground whitespace-pre-wrap'>
                {displayText}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Manual Analysis Button */}
      {onManualAnalyze && (
        <div className='p-4 border-t border-sidebar-border bg-sidebar-accent/20'>
          <Button
            onClick={onManualAnalyze}
            disabled={!hasBufferedTranscript || isAnalyzing}
            className='w-full flex items-center justify-center gap-2 bg-sidebar-primary hover:bg-sidebar-primary/90 text-sidebar-primary-foreground'
            variant={hasBufferedTranscript && !isAnalyzing ? 'default' : 'outline'}
            size='sm'
          >
            {isAnalyzing ? (
              <>
                <Loader2 className='h-4 w-4 animate-spin' />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className='h-4 w-4' />
                {hasBufferedTranscript ? 'Analyze' : 'No new transcript'}
              </>
            )}
          </Button>
          {hasBufferedTranscript && !isAnalyzing && (
            <p className='text-xs text-sidebar-foreground/70 text-center mt-2'>
              Click to analyze and create features
            </p>
          )}
        </div>
      )}
    </div>
  );
}
