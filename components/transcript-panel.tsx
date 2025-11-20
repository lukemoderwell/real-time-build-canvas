"use client"

import { motion } from "framer-motion"
import { useEffect, useRef } from "react"

interface TranscriptPanelProps {
  fullTranscript: string
  currentSessionText: string
  isRecording: boolean
}

export function TranscriptPanel({ fullTranscript, currentSessionText, isRecording }: TranscriptPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new text is added (but only if user is near bottom)
  useEffect(() => {
    if (scrollRef.current && isRecording) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
      
      if (isNearBottom) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      }
    }
  }, [fullTranscript, currentSessionText, isRecording])

  const displayText = fullTranscript + (currentSessionText ? (fullTranscript ? ' ' : '') + currentSessionText : '')

  return (
    <div className="w-80 h-full border-r border-border bg-card/50 backdrop-blur-xl flex flex-col z-20 absolute left-0 top-0 shadow-2xl">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Transcript</h2>
        {isRecording && (
          <div className="flex gap-1 items-center">
            {[1, 2, 3, 4, 5].map((i) => (
              <motion.div
                key={i}
                animate={{ height: [4, 12 + Math.random() * 12, 4] }}
                transition={{ repeat: Number.POSITIVE_INFINITY, duration: 0.5 + Math.random() * 0.5, delay: i * 0.1 }}
                className="w-1 bg-red-500/50 rounded-full"
              />
            ))}
          </div>
        )}
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 custom-scrollbar"
      >
        {!displayText ? (
          <div className="text-muted-foreground text-sm">Start speaking to generate transcript...</div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">me</div>
              <div className="text-[14px] leading-relaxed text-foreground whitespace-pre-wrap">
                {displayText}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

