'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Agent } from '@/lib/types';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import {
  Book,
  Clock,
  ChevronDown,
  Settings,
  X,
  Check,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useResizable } from '@/hooks/use-resizable';
import { ResizeHandle } from '@/components/resize-handle';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  type ModelSettings,
  type ModelTier,
  getModelsByTier,
  getModelName,
} from '@/lib/models';

interface AgentSidebarProps {
  agents: Agent[];
  activeFeedback: { agentId: string; message: string } | null;
  onMarkAsRead: (agentId: string) => void;
  onToggleAgent: (agentId: string) => void;
  onDeleteDiaryEntry: (agentId: string, entryId: string) => void;
  onCrossOffDiaryEntry: (agentId: string, entryId: string) => void;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
  modelSettings?: ModelSettings;
  onModelChange?: (tier: ModelTier, modelId: string) => void;
}

export function AgentSidebar({
  agents,
  activeFeedback,
  onMarkAsRead,
  onToggleAgent,
  onDeleteDiaryEntry,
  onCrossOffDiaryEntry,
  isMinimized = false,
  onToggleMinimize,
  modelSettings,
  onModelChange,
}: AgentSidebarProps) {
  const enabledAgents = agents.filter((a) => a.isEnabled);
  const { width, isResizing, handleMouseDown } = useResizable({
    initialWidth: 320,
    minWidth: 200,
    maxWidth: 500,
    direction: 'left',
  });

  if (isMinimized) {
    return (
      <div className='w-12 h-full border-l border-border bg-card/50 backdrop-blur-xl flex flex-col z-20 absolute right-0 top-0 shadow-2xl'>
        <div className='p-4 border-b border-border flex items-center justify-center'>
          {onToggleMinimize && (
            <button
              onClick={onToggleMinimize}
              className='p-1.5 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground transition-colors'
              title='Expand agent sidebar'
            >
              <ChevronLeft size={16} />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{ width: `${width}px` }}
      className='h-full border-l border-border bg-card/50 backdrop-blur-xl flex flex-col z-20 absolute right-0 top-0 shadow-2xl'
    >
      <ResizeHandle
        direction='left'
        onMouseDown={handleMouseDown}
        isResizing={isResizing}
      />
      <div className='p-4 border-b border-border flex items-center justify-between'>
        <h2 className='text-xs font-medium text-muted-foreground uppercase tracking-wider'>
          Expert Agents
        </h2>

        <div className='flex items-center gap-1'>
          <ThemeToggle />
          <Popover>
            <PopoverTrigger asChild>
              <button className='p-1.5 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground transition-colors'>
                <Settings size={14} />
              </button>
            </PopoverTrigger>
            <PopoverContent side='left' align='start' className='w-64 p-4 mr-2'>
              <div className='space-y-4'>
                <div className='space-y-2'>
                  <h4 className='font-medium leading-none'>Expert Agents</h4>
                  <p className='text-xs text-muted-foreground'>
                    Configure which agents are active in the session.
                  </p>
                </div>
                <div className='space-y-3'>
                  {agents.map((agent) => (
                    <div
                      key={agent.id}
                      className='flex items-center justify-between'
                    >
                      <div className='flex items-center gap-2'>
                        <div
                          className='w-2 h-2 rounded-full'
                          style={{ backgroundColor: agent.color }}
                        />
                        <Label
                          htmlFor={`agent-${agent.id}`}
                          className='text-sm font-medium cursor-pointer'
                        >
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

                {modelSettings && onModelChange && (
                  <>
                    <Separator className='my-4' />
                    <div className='space-y-2'>
                      <h4 className='font-medium leading-none'>AI Models</h4>
                      <p className='text-xs text-muted-foreground'>
                        Select models for different task types.
                      </p>
                    </div>
                    <div className='space-y-3 mt-3'>
                      {(['small', 'medium', 'large'] as const).map((tier) => (
                        <div key={tier} className='space-y-1'>
                          <Label className='text-xs capitalize'>{tier} Tasks</Label>
                          <Select
                            value={modelSettings[tier]}
                            onValueChange={(value) => onModelChange(tier, value)}
                          >
                            <SelectTrigger className='h-8 text-xs'>
                              <SelectValue>
                                {getModelName(modelSettings[tier])}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {getModelsByTier(tier).map((model) => (
                                <SelectItem key={model.id} value={model.id}>
                                  {model.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </PopoverContent>
          </Popover>
          {onToggleMinimize && (
            <button
              onClick={onToggleMinimize}
              className='p-1.5 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground transition-colors'
              title='Minimize agent sidebar'
            >
              <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>

      <div className='flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar'>
        {enabledAgents.map((agent) => (
          <AgentItem
            key={agent.id}
            agent={agent}
            activeFeedback={activeFeedback}
            onMarkAsRead={onMarkAsRead}
            onDeleteDiaryEntry={onDeleteDiaryEntry}
            onCrossOffDiaryEntry={onCrossOffDiaryEntry}
          />
        ))}
      </div>
    </div>
  );
}

function AgentItem({
  agent,
  activeFeedback,
  onMarkAsRead,
  onDeleteDiaryEntry,
  onCrossOffDiaryEntry,
}: {
  agent: Agent;
  activeFeedback: { agentId: string; message: string } | null;
  onMarkAsRead: (agentId: string) => void;
  onDeleteDiaryEntry: (agentId: string, entryId: string) => void;
  onCrossOffDiaryEntry: (agentId: string, entryId: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const Icon = Icons[agent.role as keyof typeof Icons] || Icons.product;
  const isFeedbackActive = activeFeedback?.agentId === agent.id;

  const toggleOpen = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    if (newState) {
      onMarkAsRead(agent.id);
    }
  };

  return (
    <div className='space-y-1'>
      <div className='relative group'>
        <div
          onClick={toggleOpen}
          className={cn(
            'flex items-center gap-3 p-3 rounded-lg border transition-all duration-300 cursor-pointer w-full text-left select-none',
            agent.isActive
              ? 'bg-secondary/80 border-primary/20 shadow-lg shadow-primary/5'
              : 'bg-background/20 border-transparent hover:bg-secondary/40 hover:border-border/50',
            isOpen && 'bg-secondary/40 border-border/50'
          )}
        >
          <div className='relative'>
            <div
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center border shadow-sm transition-transform duration-300',
                agent.isActive ? 'scale-110' : 'group-hover:scale-105',
                `bg-${agent.color}-500/10 border-${agent.color}-500/20 text-${agent.color}-500`
              )}
              style={{
                backgroundColor: `${agent.color}1a`,
                borderColor: `${agent.color}33`,
                color: agent.color,
              }}
            >
              <Icon size={18} />
            </div>
            {agent.unreadCount > 0 && !isOpen && (
              <div className='absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center border-2 border-background z-10'>
                <span className='text-[10px] font-bold text-white'>
                  {agent.unreadCount}
                </span>
              </div>
            )}
          </div>
          <div className='flex-1 min-w-0'>
            <div className='flex items-center justify-between'>
              <div className='font-medium text-sm truncate'>{agent.name}</div>
              {agent.isActive && (
                <motion.div
                  layoutId='speaking-indicator'
                  className='flex gap-0.5 items-center'
                >
                  {[1, 2, 3].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ height: [2, 8, 2] }}
                      transition={{
                        repeat: Number.POSITIVE_INFINITY,
                        duration: 0.6,
                        delay: i * 0.1,
                      }}
                      className='w-0.5 bg-primary rounded-full'
                    />
                  ))}
                </motion.div>
              )}
            </div>
            <div className='text-xs text-muted-foreground capitalize truncate'>
              {agent.role}{' '}
            </div>
          </div>
          <ChevronDown
            className={cn(
              'w-4 h-4 text-muted-foreground/50 transition-transform duration-300',
              isOpen && 'rotate-180'
            )}
          />
        </div>

        <AnimatePresence>
          {isFeedbackActive && !isOpen && (
            <motion.div
              initial={{ opacity: 0, x: -20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -10, scale: 0.95 }}
              className='absolute top-0 right-full mr-4 w-64 z-30 pointer-events-none'
            >
              <div className='bg-popover/95 backdrop-blur border border-border rounded-xl p-4 shadow-2xl text-xs leading-relaxed relative'>
                <div className='absolute top-6 -right-1.5 w-3 h-3 bg-popover border-t border-r border-border transform rotate-45' />
                <div className='flex items-center gap-2 mb-2 pb-2 border-b border-border/50'>
                  <Icon size={12} style={{ color: agent.color }} />
                  <span className='font-medium text-foreground'>
                    {agent.name} suggests:
                  </span>
                </div>
                <p className='text-muted-foreground'>
                  {activeFeedback.message}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className='overflow-hidden'
          >
            <div className='pt-1 pb-3 px-3 space-y-3 border-x border-b border-border/50 rounded-b-lg mx-1 bg-background/30'>
              {agent.diaryEntries.length === 0 &&
              agent.crossedOffEntries.length === 0 ? (
                <div className='text-center py-4 text-muted-foreground text-xs'>
                  <Book className='w-4 h-4 mx-auto mb-2 opacity-20' />
                  <p>No thoughts yet.</p>
                </div>
              ) : (
                <>
                  {agent.diaryEntries.length > 0 && (
                    <>
                      {agent.diaryEntries
                        .slice()
                        .reverse()
                        .map((entry) => (
                          <div
                            key={entry.id}
                            className='flex items-start gap-2 group/entry'
                          >
                            <div
                              className='w-5 h-5 rounded-full flex items-center justify-center border flex-shrink-0 mt-0.5'
                              style={{
                                backgroundColor: `${agent.color}1a`,
                                borderColor: `${agent.color}33`,
                                color: agent.color,
                              }}
                            >
                              <Icon size={10} />
                            </div>
                            <div className='flex-1 min-w-0'>
                              <div
                                className='rounded-2xl rounded-tl-none px-3 py-2 inline-block max-w-full'
                                style={{
                                  backgroundColor: `${agent.color}10`,
                                }}
                              >
                                <p className='text-xs leading-relaxed text-foreground/90'>
                                  {entry.content}
                                </p>
                              </div>
                              <div className='flex items-center gap-2 mt-1 ml-1'>
                                <div className='flex items-center gap-1 text-[9px] text-muted-foreground opacity-0 group-hover/entry:opacity-100 transition-opacity'>
                                  <Clock size={8} />
                                  <span>
                                    {new Date(
                                      entry.timestamp
                                    ).toLocaleTimeString()}
                                  </span>
                                </div>
                                <div className='flex items-center gap-1 opacity-0 group-hover/entry:opacity-100 transition-opacity'>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onCrossOffDiaryEntry(agent.id, entry.id);
                                    }}
                                    className='p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors'
                                    title='Cross off'
                                  >
                                    <Check size={12} />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDeleteDiaryEntry(agent.id, entry.id);
                                    }}
                                    className='p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive transition-colors'
                                    title='Delete'
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                    </>
                  )}
                  {agent.crossedOffEntries.length > 0 && (
                    <>
                      {agent.diaryEntries.length > 0 && (
                        <div className='border-t border-border/30 my-2' />
                      )}
                      {agent.crossedOffEntries
                        .slice()
                        .reverse()
                        .map((entry) => (
                          <div
                            key={entry.id}
                            className='flex items-start gap-2 opacity-60'
                          >
                            <div
                              className='w-5 h-5 rounded-full flex items-center justify-center border flex-shrink-0 mt-0.5'
                              style={{
                                backgroundColor: `${agent.color}1a`,
                                borderColor: `${agent.color}33`,
                                color: agent.color,
                              }}
                            >
                              <Icon size={10} />
                            </div>
                            <div className='flex-1 min-w-0'>
                              <div
                                className='rounded-2xl rounded-tl-none px-3 py-2 inline-block max-w-full line-through'
                                style={{
                                  backgroundColor: `${agent.color}10`,
                                }}
                              >
                                <p className='text-xs leading-relaxed text-foreground/60'>
                                  {entry.content}
                                </p>
                              </div>
                              <div className='flex items-center gap-1 mt-1 ml-1 text-[9px] text-muted-foreground'>
                                <Clock size={8} />
                                <span>
                                  {new Date(
                                    entry.timestamp
                                  ).toLocaleTimeString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                    </>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
