'use client';

import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Sparkles, Loader2 } from 'lucide-react';

interface TranscriptPanelProps {
  fullTranscript: string;
  currentSessionText: string;
  isRecording: boolean;
  onManualAnalyze?: () => void;
  hasBufferedTranscript?: boolean;
  isAnalyzing?: boolean;
}

export function TranscriptPanel({
  fullTranscript,
  currentSessionText,
  isRecording,
  onManualAnalyze,
  hasBufferedTranscript = false,
  isAnalyzing = false,
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

  return (
    <div className='w-80 h-full border-r border-border bg-card/50 backdrop-blur-xl flex flex-col z-20 absolute left-0 top-0 shadow-2xl'>
      <div className='p-4 border-b border-border flex items-center justify-between'>
        <h2 className='text-xs font-medium text-muted-foreground uppercase tracking-wider'>
          Transcript
        </h2>
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
            <span className='text-[10px] text-muted-foreground'>Recording</span>
          </div>
        )}
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

      {/* Manual Analysis Button */}
      {onManualAnalyze && (
        <div className='p-4 border-t border-border bg-background/50'>
          <Button
            onClick={onManualAnalyze}
            disabled={!hasBufferedTranscript || isAnalyzing}
            className='w-full flex items-center justify-center gap-2'
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
            <p className='text-xs text-muted-foreground text-center mt-2'>
              Click to analyze and create features
            </p>
          )}
        </div>
      )}
    </div>
  );
}
