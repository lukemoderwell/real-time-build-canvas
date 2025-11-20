"use client"

import type React from "react"

import { motion } from "framer-motion"
import type { NodeData } from "@/lib/types"
import { cn } from "@/lib/utils"
import { CheckCircle2, Circle, Clock, Loader2, FileText, Bug, Zap } from "lucide-react"
import { useState, useRef } from "react"

interface NodeCardProps {
  node: NodeData
  isSelected: boolean
  onSelect: (id: string) => void
  onDragStart?: (id: string) => void
  onDragMove?: (id: string, dx: number, dy: number) => void
  onDragEnd?: (id: string) => void
  scale: number
  groupColor?: string
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
  const [isDragging, setIsDragging] = useState(false)
  const dragStartPos = useRef({ x: 0, y: 0 })

  const statusColor = {
    pending: "text-muted-foreground",
    processing: "text-blue-400",
    coded: "text-green-400",
    review: "text-yellow-400",
  }

  const StatusIcon = {
    pending: Circle,
    processing: Loader2,
    coded: CheckCircle2,
    review: Clock,
  }[node.status]

  const TypeIcon =
    {
      feature: Zap,
      requirement: FileText,
      bug: Bug,
      note: FileText,
    }[node.type] || FileText

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && !e.altKey) {
      setIsDragging(true)
      dragStartPos.current = { x: e.clientX, y: e.clientY }
      onDragStart?.(node.id)
      e.stopPropagation()
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const dx = (e.clientX - dragStartPos.current.x) / scale
      const dy = (e.clientY - dragStartPos.current.y) / scale
      dragStartPos.current = { x: e.clientX, y: e.clientY }
      onDragMove?.(node.id, dx, dy)
      e.stopPropagation()
    }
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isDragging) {
      setIsDragging(false)
      onDragEnd?.(node.id)
      e.stopPropagation()
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className={cn(
        "absolute w-72 bg-card/95 border rounded-xl shadow-lg backdrop-blur-md transition-all duration-200 cursor-pointer group overflow-hidden",
        isDragging && "cursor-grabbing z-20 shadow-2xl",
        !isDragging && "cursor-grab",
        isSelected
          ? "border-primary ring-1 ring-primary shadow-primary/20 z-10"
          : groupColor
            ? `border-[${groupColor}] hover:border-primary/50 hover:shadow-xl`
            : "border-border hover:border-primary/50 hover:shadow-xl",
      )}
      style={{
        left: node.x,
        top: node.y,
        boxShadow: groupColor ? `0 0 20px ${groupColor}40` : undefined,
      }}
      onClick={(e) => {
        if (!isDragging) {
          e.stopPropagation()
          onSelect(node.id)
        }
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      whileHover={{ y: isDragging ? 0 : -4 }}
    >
      {groupColor && <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: groupColor }} />}

      {/* Header */}
      <div className="p-3 border-b border-border/50 flex items-center justify-between bg-secondary/30">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "p-1 rounded-md",
              node.type === "feature"
                ? "bg-blue-500/10 text-blue-500"
                : node.type === "requirement"
                  ? "bg-purple-500/10 text-purple-500"
                  : node.type === "bug"
                    ? "bg-red-500/10 text-red-500"
                    : "bg-gray-500/10 text-gray-500",
            )}
          >
            <TypeIcon size={12} />
          </div>
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider font-semibold">
            {node.type}
          </span>
        </div>
        <div className="flex items-center gap-1.5 bg-background/50 px-2 py-0.5 rounded-full border border-border/50">
          <StatusIcon
            size={10}
            className={cn(statusColor[node.status], node.status === "processing" && "animate-spin")}
          />
          <span className="text-[10px] font-medium capitalize text-muted-foreground">{node.status}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-sm mb-2 text-foreground leading-tight">{node.title}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-none">{node.content}</p>
      </div>

      {/* Footer / Agent Feedback Indicators */}
      {node.agentFeedback && node.agentFeedback.length > 0 && (
        <div className="px-3 py-2 border-t border-border/50 bg-blue-500/5 flex items-center gap-2">
          <div className="flex -space-x-1.5">
            {/* Mock avatars for feedback */}
            <div className="w-4 h-4 rounded-full bg-blue-500 border border-background" />
          </div>
          <span className="text-[10px] text-blue-400 font-medium">Agent feedback available</span>
        </div>
      )}

      {/* Selection Indicator */}
      {isSelected && (
        <div className="absolute top-0 right-0 p-2">
          <div className="w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-sm">
            <CheckCircle2 size={12} />
          </div>
        </div>
      )}
    </motion.div>
  )
}
