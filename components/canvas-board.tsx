"use client"

import type React from "react"
import { useState, useRef } from "react"
import type { NodeData, NodeGroup, Agent } from "@/lib/types"
import { NodeCard } from "./node-card"
import { Move, ZoomIn, ZoomOut, Edit2, Check, Settings } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

interface CanvasBoardProps {
  nodes: NodeData[]
  selectedNodes: string[]
  onNodeSelect: (id: string) => void
  onCanvasClick: () => void
  onNodePositionUpdate: (id: string, x: number, y: number) => void
  groups: NodeGroup[]
  onGroupRename: (groupId: string, newName: string) => void
  onGroupDrag: (groupId: string, dx: number, dy: number) => void // Added prop
  agents: Agent[]
  onToggleAgent: (id: string) => void
}

export function CanvasBoard({
  nodes,
  selectedNodes,
  onNodeSelect,
  onCanvasClick,
  onNodePositionUpdate,
  groups,
  onGroupRename,
  onGroupDrag, // Destructure prop
  agents,
  onToggleAgent,
}: CanvasBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 })
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")

  const [draggingGroup, setDraggingGroup] = useState<{ id: string; hasMoved: boolean } | null>(null)

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const s = Math.exp(-e.deltaY * 0.001)
      setScale((prev) => Math.min(Math.max(prev * s, 0.1), 3))
    } else {
      setPosition((prev) => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }))
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      // Middle click or Alt+Click to pan
      setIsDragging(true)
      setLastMousePos({ x: e.clientX, y: e.clientY })
      e.preventDefault()
    } else {
      onCanvasClick()
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingGroup) {
      const dx = (e.clientX - lastMousePos.x) / scale
      const dy = (e.clientY - lastMousePos.y) / scale

      if (dx !== 0 || dy !== 0) {
        onGroupDrag(draggingGroup.id, dx, dy)
        setDraggingGroup((prev) => (prev ? { ...prev, hasMoved: true } : null))
        setLastMousePos({ x: e.clientX, y: e.clientY })
      }
      return
    }

    if (isDragging) {
      const dx = e.clientX - lastMousePos.x
      const dy = e.clientY - lastMousePos.y
      setPosition((prev) => ({ x: prev.x + dx, y: prev.y + dy }))
      setLastMousePos({ x: e.clientX, y: e.clientY })
    }
  }

  const handleMouseUp = () => {
    if (draggingGroup) {
      if (!draggingGroup.hasMoved) {
        // It was a click, start renaming
        const group = groups.find((g) => g.id === draggingGroup.id)
        if (group) {
          setEditingGroupId(group.id)
          setEditingName(group.name)
        }
      }
      setDraggingGroup(null)
    }
    setIsDragging(false)
  }

  const handleNodeDragMove = (id: string, dx: number, dy: number) => {
    const node = nodes.find((n) => n.id === id)
    if (node) {
      onNodePositionUpdate(id, node.x + dx, node.y + dy)
    }
  }

  const getNodeGroupColor = (nodeId: string): string | undefined => {
    const group = groups.find((g) => g.nodeIds.includes(nodeId))
    return group?.color
  }

  const handleGroupRenameSubmit = (groupId: string) => {
    if (editingName.trim()) {
      onGroupRename(groupId, editingName.trim())
    }
    setEditingGroupId(null)
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden bg-background relative cursor-crosshair"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Grid Background */}
      <div
        className="absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none"
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          transformOrigin: "0 0",
        }}
      />

      {/* Canvas Content */}
      <div
        className="absolute inset-0 origin-top-left transition-transform duration-75 ease-out"
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
        }}
      >
        {groups.map((group) => {
          const groupNodes = nodes.filter((n) => group.nodeIds.includes(n.id))
          if (groupNodes.length === 0) return null

          const minX = Math.min(...groupNodes.map((n) => n.x))
          const minY = Math.min(...groupNodes.map((n) => n.y))
          const maxX = Math.max(...groupNodes.map((n) => n.x + n.width))
          const maxY = Math.max(...groupNodes.map((n) => n.y + n.height))

          return (
            <div
              key={group.id}
              className="absolute rounded-2xl border-2 border-dashed transition-all duration-500 group"
              style={{
                left: minX - 20,
                top: minY - 40,
                width: maxX - minX + 40,
                height: maxY - minY + 60,
                borderColor: group.color,
                backgroundColor: `${group.color}05`,
                pointerEvents: "none", // Allow clicking through to canvas, but enable for children
              }}
            >
              <div className="absolute -top-6 left-4 flex items-center gap-2 pointer-events-auto">
                {editingGroupId === group.id ? (
                  <div className="flex items-center gap-1 bg-background border rounded-md shadow-sm overflow-hidden">
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="px-2 py-1 text-xs outline-none w-32 bg-transparent"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleGroupRenameSubmit(group.id)
                        if (e.key === "Escape") setEditingGroupId(null)
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                    />
                    <button
                      onClick={() => handleGroupRenameSubmit(group.id)}
                      className="p-1 hover:bg-secondary text-green-500"
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <Check size={12} />
                    </button>
                  </div>
                ) : (
                  <div
                    className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-2 cursor-grab active:cursor-grabbing hover:brightness-110 transition-all shadow-sm"
                    style={{
                      backgroundColor: group.color,
                      color: "#fff",
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation()
                      setLastMousePos({ x: e.clientX, y: e.clientY })
                      setDraggingGroup({ id: group.id, hasMoved: false })
                    }}
                  >
                    {group.name}
                    <Edit2 size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {nodes.map((node) => (
          <NodeCard
            key={node.id}
            node={node}
            isSelected={selectedNodes.includes(node.id)}
            onSelect={onNodeSelect}
            onDragMove={handleNodeDragMove}
            scale={scale}
            groupColor={getNodeGroupColor(node.id)}
          />
        ))}
      </div>

      {/* Controls Overlay */}
      <div className="absolute bottom-8 left-8 flex flex-col gap-2 z-10">
        <div className="bg-card/80 backdrop-blur border border-border rounded-lg p-1 flex flex-col gap-1 shadow-xl">
          <button
            onClick={() => setScale((s) => Math.min(s + 0.1, 3))}
            className="p-2 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground transition-colors"
          >
            <ZoomIn size={18} />
          </button>
          <button
            onClick={() => setScale((s) => Math.max(s - 0.1, 0.1))}
            className="p-2 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground transition-colors"
          >
            <ZoomOut size={18} />
          </button>
          <div className="h-px bg-border mx-2 my-1" />
          <button
            onClick={() => {
              setScale(1)
              setPosition({ x: 0, y: 0 })
            }}
            className="p-2 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground transition-colors"
          >
            <Move size={18} />
          </button>
        </div>

        {/* Settings Popover for Agent Configuration */}
        <Popover>
          <PopoverTrigger asChild>
            <button className="h-10 w-10 bg-card/80 backdrop-blur border border-border rounded-lg flex items-center justify-center shadow-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
              <Settings size={18} />
            </button>
          </PopoverTrigger>
          <PopoverContent side="right" align="end" className="w-64 p-4 ml-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium leading-none">Expert Agents</h4>
                <p className="text-xs text-muted-foreground">Configure which agents are active in the session.</p>
              </div>
              <div className="space-y-3">
                {agents.map((agent) => (
                  <div key={agent.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: agent.color }} />
                      <Label htmlFor={`agent-${agent.id}`} className="text-sm font-medium cursor-pointer">
                        {agent.name}
                      </Label>
                    </div>
                    <Switch
                      id={`agent-${agent.id}`}
                      checked={agent.isEnabled}
                      onCheckedChange={() => onToggleAgent(agent.id)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="absolute top-8 left-8 z-10 pointer-events-none">
        <h1 className="text-2xl font-bold tracking-tight text-foreground/80">Product Canvas</h1>
        <p className="text-sm text-muted-foreground font-mono mt-1">v0.1.0-beta</p>
      </div>
    </div>
  )
}
