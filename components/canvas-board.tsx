'use client';

import type React from 'react';
import { useState, useRef } from 'react';
import type { NodeData, NodeGroup } from '@/lib/types';
import { NodeCard } from './node-card';
import {
  Move,
  ZoomIn,
  ZoomOut,
  Edit2,
  Check,
  Mic,
  StopCircle,
  MessageSquare,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CanvasBoardProps {
  nodes: NodeData[];
  selectedNodes: string[];
  onNodeSelect: (id: string) => void;
  onCanvasClick: () => void;
  onNodePositionUpdate: (id: string, x: number, y: number) => void;
  groups: NodeGroup[];
  onGroupRename: (groupId: string, newName: string) => void;
  onGroupDrag: (groupId: string, dx: number, dy: number) => void;
  onGroupClick: (groupId: string) => void;
  isRecording: boolean;
  onToggleRecording: () => void;
  isTranscriptPanelOpen: boolean;
  onToggleTranscriptPanel: () => void;
  isAgentSidebarOpen: boolean;
  isFeaturePanelOpen?: boolean;
  codingAgentPanel?: React.ReactNode;
}

export function CanvasBoard({
  nodes,
  selectedNodes,
  onNodeSelect,
  onCanvasClick,
  onNodePositionUpdate,
  groups,
  onGroupRename,
  onGroupDrag,
  onGroupClick,
  isRecording,
  onToggleRecording,
  isTranscriptPanelOpen,
  onToggleTranscriptPanel,
  isAgentSidebarOpen,
  isFeaturePanelOpen = false,
  codingAgentPanel,
}: CanvasBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const [draggingGroup, setDraggingGroup] = useState<{
    id: string;
    hasMoved: boolean;
  } | null>(null);

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const s = Math.exp(-e.deltaY * 0.001);
      setScale((prev) => Math.min(Math.max(prev * s, 0.1), 3));
    } else {
      setPosition((prev) => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }));
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      // Middle click or Alt+Click to pan
      setIsDragging(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
      e.preventDefault();
    } else {
      onCanvasClick();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingGroup) {
      const dx = (e.clientX - lastMousePos.x) / scale;
      const dy = (e.clientY - lastMousePos.y) / scale;

      if (dx !== 0 || dy !== 0) {
        onGroupDrag(draggingGroup.id, dx, dy);
        setDraggingGroup((prev) => (prev ? { ...prev, hasMoved: true } : null));
        setLastMousePos({ x: e.clientX, y: e.clientY });
      }
      return;
    }

    if (isDragging) {
      const dx = e.clientX - lastMousePos.x;
      const dy = e.clientY - lastMousePos.y;
      setPosition((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    if (draggingGroup) {
      if (!draggingGroup.hasMoved) {
        // It was a click, open feature details
        onGroupClick(draggingGroup.id);
      }
      setDraggingGroup(null);
    }
    setIsDragging(false);
  };

  const handleNodeDragMove = (id: string, dx: number, dy: number) => {
    const node = nodes.find((n) => n.id === id);
    if (node) {
      onNodePositionUpdate(id, node.x + dx, node.y + dy);
    }
  };

  const getNodeGroupColor = (nodeId: string): string | undefined => {
    const group = groups.find((g) => g.nodeIds.includes(nodeId));
    return group?.color;
  };

  const handleGroupRenameSubmit = (groupId: string) => {
    if (editingName.trim()) {
      onGroupRename(groupId, editingName.trim());
    }
    setEditingGroupId(null);
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'h-full overflow-hidden bg-background relative cursor-crosshair transition-all duration-200',
        isTranscriptPanelOpen ? 'ml-80' : 'ml-12',
        isAgentSidebarOpen && !isFeaturePanelOpen ? 'mr-80' : isFeaturePanelOpen ? 'mr-96' : 'mr-12'
      )}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Grid Background */}
      <div
        className='absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none'
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          transformOrigin: '0 0',
        }}
      />

      {/* Canvas Content */}
      <div
        className={cn(
          'absolute inset-0 origin-top-left',
          isDragging ? 'transition-none' : 'transition-transform duration-75 ease-out'
        )}
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          willChange: isDragging ? 'transform' : 'auto',
        }}
      >
        {groups.map((group) => {
          const groupNodes = nodes.filter((n) => group.nodeIds.includes(n.id));

          // Calculate bounds - use defaults for empty groups
          let minX, minY, maxX, maxY, width, height;

          if (groupNodes.length === 0) {
            // Empty group - show at centroid position with default size
            minX = group.centroid.x;
            minY = group.centroid.y;
            width = 250;
            height = 150;
          } else {
            // Group has nodes - calculate bounds from nodes
            minX = Math.min(...groupNodes.map((n) => n.x));
            minY = Math.min(...groupNodes.map((n) => n.y));
            maxX = Math.max(...groupNodes.map((n) => n.x + n.width));
            maxY = Math.max(...groupNodes.map((n) => n.y + n.height));
            width = maxX - minX + 40;
            height = maxY - minY + 60;
          }

          const isBeingDragged = draggingGroup?.id === group.id;

          return (
            <div
              key={group.id}
              className={cn(
                'absolute rounded-2xl border-2 border-dashed group',
                isBeingDragged ? 'transition-none' : 'transition-all duration-200'
              )}
              style={{
                left: minX - 20,
                top: minY - 40,
                width,
                height,
                borderColor: group.color,
                backgroundColor: `${group.color}05`,
                pointerEvents: 'none', // Allow clicking through to canvas, but enable for children
                willChange: isBeingDragged ? 'transform' : 'auto',
              }}
            >
              <div className='absolute -top-6 left-4 flex items-center gap-2 pointer-events-auto'>
                {editingGroupId === group.id ? (
                  <div className='flex items-center gap-1 bg-background border rounded-md shadow-sm overflow-hidden'>
                    <input
                      type='text'
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className='px-2 py-1 text-xs outline-none w-32 bg-transparent'
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter')
                          handleGroupRenameSubmit(group.id);
                        if (e.key === 'Escape') setEditingGroupId(null);
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                    />
                    <button
                      onClick={() => handleGroupRenameSubmit(group.id)}
                      className='p-1 hover:bg-secondary text-green-500'
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <Check size={12} />
                    </button>
                  </div>
                ) : (
                  <div
                    className='px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-2 cursor-grab active:cursor-grabbing hover:brightness-110 transition-all shadow-sm'
                    style={{
                      backgroundColor: group.color,
                      color: '#fff',
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setLastMousePos({ x: e.clientX, y: e.clientY });
                      setDraggingGroup({ id: group.id, hasMoved: false });
                    }}
                  >
                    {group.name}
                    <Edit2
                      size={10}
                      className='opacity-0 group-hover:opacity-100 transition-opacity'
                    />
                  </div>
                )}
              </div>

              {/* Empty group placeholder */}
              {groupNodes.length === 0 && (
                <div
                  className='absolute inset-0 flex items-center justify-center pointer-events-auto cursor-pointer'
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setLastMousePos({ x: e.clientX, y: e.clientY });
                    setDraggingGroup({ id: group.id, hasMoved: false });
                  }}
                >
                  <div className='text-xs text-muted-foreground text-center px-4'>
                    <div className='font-medium mb-1'>Feature created</div>
                    <div className='text-[10px]'>Click to view details</div>
                  </div>
                </div>
              )}
            </div>
          );
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

        {/* Coding Agent Panel */}
        {codingAgentPanel}
      </div>

        {/* Controls Overlay */}
      <div className='absolute bottom-8 left-8 flex flex-col gap-2 z-10 items-center'>
        <div className='bg-card/90 backdrop-blur border border-border rounded-lg p-1 flex flex-col gap-1 shadow-xl'>
          <button
            onClick={() => setScale((s) => Math.min(s + 0.1, 3))}
            className='p-2 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground transition-colors'
          >
            <ZoomIn size={18} />
          </button>
          <button
            onClick={() => setScale((s) => Math.max(s - 0.1, 0.1))}
            className='p-2 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground transition-colors'
          >
            <ZoomOut size={18} />
          </button>
          <div className='h-px bg-border mx-2 my-1' />
          <button
            onClick={() => {
              setScale(1);
              setPosition({ x: 0, y: 0 });
            }}
            className='p-2 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground transition-colors'
          >
            <Move size={18} />
          </button>
          <button
            onClick={onToggleTranscriptPanel}
            className={cn(
              'p-2 hover:bg-secondary rounded-md transition-colors',
              isTranscriptPanelOpen
                ? 'bg-secondary text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <MessageSquare size={18} />
          </button>
        </div>

        {/* Microphone Button */}
        <button
          onClick={onToggleRecording}
          className={cn(
            'size-10 rounded-lg flex items-center justify-center transition-all duration-300 shadow-xl',
            isRecording
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-primary text-primary-foreground hover:bg-primary/90 border border-border'
          )}
        >
          {isRecording ? (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.5 }}
            >
              <StopCircle size={20} />
            </motion.div>
          ) : (
            <Mic size={20} />
          )}
        </button>
      </div>
    </div>
  );
}
