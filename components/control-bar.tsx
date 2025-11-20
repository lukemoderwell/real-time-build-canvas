"use client"
import { Terminal } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface ControlBarProps {
  onSendToAgent: () => void
  selectedCount: number
}

export function ControlBar({
  onSendToAgent,
  selectedCount,
}: ControlBarProps) {
  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20">
      <AnimatePresence mode="wait">
        {selectedCount > 0 && (
          <motion.button
            key="send-btn"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={onSendToAgent}
            className="h-12 px-5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl flex items-center gap-2.5 font-medium text-sm whitespace-nowrap shadow-lg shadow-blue-600/20"
          >
            <Terminal size={18} />
            <span>Send to Cursor ({selectedCount})</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
