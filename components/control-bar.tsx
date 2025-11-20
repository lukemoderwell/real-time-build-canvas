"use client"
import { Mic, StopCircle, Terminal, Wifi } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface ControlBarProps {
  isRecording: boolean
  onToggleRecording: () => void
  onSendToAgent: () => void
  selectedCount: number
  transcript: string
}

export function ControlBar({
  isRecording,
  onToggleRecording,
  onSendToAgent,
  selectedCount,
  transcript,
}: ControlBarProps) {
  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 w-full max-w-3xl px-4">
      <div className="bg-card/90 backdrop-blur-xl border border-border rounded-2xl shadow-2xl p-2 flex items-center gap-3 relative overflow-hidden">
        {/* Recording Button */}
        <button
          onClick={onToggleRecording}
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 shrink-0 relative z-10",
            isRecording
              ? "bg-red-500/10 text-red-500 hover:bg-red-500/20 ring-1 ring-red-500/20"
              : "bg-primary text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/20",
          )}
        >
          {isRecording ? (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.5 }}
            >
              <StopCircle size={24} />
            </motion.div>
          ) : (
            <Mic size={24} />
          )}
        </button>

        {/* Transcript / Input Area */}
        <div className="flex-1 h-12 bg-secondary/50 rounded-xl px-4 flex items-center overflow-hidden relative group border border-transparent focus-within:border-primary/20 transition-colors">
          {isRecording && (
            <div className="absolute left-4 flex gap-1 items-center h-full">
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
          <div
            className={cn(
              "w-full text-sm truncate transition-all duration-300 font-mono",
              isRecording ? "pl-12 text-foreground" : "text-muted-foreground",
            )}
          >
            {transcript || "Start speaking to generate nodes..."}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 min-w-[40px] justify-end">
          <AnimatePresence mode="wait">
            {selectedCount > 0 ? (
              <motion.button
                key="send-btn"
                initial={{ opacity: 0, scale: 0.9, width: 0 }}
                animate={{ opacity: 1, scale: 1, width: "auto" }}
                exit={{ opacity: 0, scale: 0.9, width: 0 }}
                onClick={onSendToAgent}
                className="h-12 px-5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl flex items-center gap-2.5 font-medium text-sm whitespace-nowrap overflow-hidden shadow-lg shadow-blue-600/20"
              >
                <Terminal size={18} />
                <span>Send to Cursor ({selectedCount})</span>
              </motion.button>
            ) : (
              <motion.div
                key="status"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="pr-2"
              >
                
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
