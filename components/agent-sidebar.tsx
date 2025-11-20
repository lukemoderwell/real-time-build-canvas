"use client"

import { motion, AnimatePresence } from "framer-motion"
import type { Agent } from "@/lib/types"
import { Icons } from "@/components/icons"
import { cn } from "@/lib/utils"
import { Sparkles, Book, Clock } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"

interface AgentSidebarProps {
  agents: Agent[]
  activeFeedback: { agentId: string; message: string } | null
  onMarkAsRead: (agentId: string) => void
}

export function AgentSidebar({ agents, activeFeedback, onMarkAsRead }: AgentSidebarProps) {
  const enabledAgents = agents.filter((a) => a.isEnabled)

  return (
    <div className="w-80 h-full border-l border-border bg-card/50 backdrop-blur-xl flex flex-col z-20 absolute right-0 top-0 shadow-2xl">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Expert Agents</h2>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          <span className="text-[10px] text-muted-foreground">Online</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {enabledAgents.map((agent) => {
          const Icon = Icons[agent.role as keyof typeof Icons] || Icons.product
          const isFeedbackActive = activeFeedback?.agentId === agent.id

          return (
            <Sheet key={agent.id} onOpenChange={(open) => open && onMarkAsRead(agent.id)}>
              <SheetTrigger asChild>
                <div className="relative group cursor-pointer">
                  <div
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border transition-all duration-300",
                      agent.isActive
                        ? "bg-secondary/80 border-primary/20 shadow-lg shadow-primary/5"
                        : "bg-background/20 border-transparent hover:bg-secondary/40 hover:border-border/50",
                    )}
                  >
                    <div className="relative">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center border shadow-sm transition-transform duration-300",
                          agent.isActive ? "scale-110" : "group-hover:scale-105",
                          `bg-${agent.color}-500/10 border-${agent.color}-500/20 text-${agent.color}-500`,
                        )}
                        style={{
                          backgroundColor: `${agent.color}1a`,
                          borderColor: `${agent.color}33`,
                          color: agent.color,
                        }}
                      >
                        <Icon size={18} />
                      </div>
                      {agent.unreadCount > 0 && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center border-2 border-background z-10">
                          <span className="text-[10px] font-bold text-white">{agent.unreadCount}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-sm truncate">{agent.name}</div>
                        {agent.isActive && (
                          <motion.div layoutId="speaking-indicator" className="flex gap-0.5 items-center">
                            {[1, 2, 3].map((i) => (
                              <motion.div
                                key={i}
                                animate={{ height: [2, 8, 2] }}
                                transition={{ repeat: Number.POSITIVE_INFINITY, duration: 0.6, delay: i * 0.1 }}
                                className="w-0.5 bg-primary rounded-full"
                              />
                            ))}
                          </motion.div>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground capitalize truncate">{agent.role} Architect</div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isFeedbackActive && (
                      <motion.div
                        initial={{ opacity: 0, x: -20, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -10, scale: 0.95 }}
                        className="absolute top-0 right-full mr-4 w-64 z-30 pointer-events-none"
                      >
                        <div className="bg-popover/95 backdrop-blur border border-border rounded-xl p-4 shadow-2xl text-xs leading-relaxed relative">
                          <div className="absolute top-6 -right-1.5 w-3 h-3 bg-popover border-t border-r border-border transform rotate-45" />
                          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border/50">
                            <Icon size={12} style={{ color: agent.color }} />
                            <span className="font-medium text-foreground">{agent.name} suggests:</span>
                          </div>
                          <p className="text-muted-foreground">{activeFeedback.message}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader className="mb-6">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center border"
                      style={{
                        backgroundColor: `${agent.color}1a`,
                        borderColor: `${agent.color}33`,
                        color: agent.color,
                      }}
                    >
                      <Icon size={18} />
                    </div>
                    <div>
                      <SheetTitle>{agent.name}'s Diary</SheetTitle>
                      <p className="text-xs text-muted-foreground">Private thoughts & questions</p>
                    </div>
                  </div>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-8rem)] pr-4">
                  <div className="space-y-4">
                    {agent.diaryEntries.length === 0 ? (
                      <div className="text-center py-10 text-muted-foreground text-sm">
                        <Book className="w-8 h-8 mx-auto mb-3 opacity-20" />
                        <p>No thoughts recorded yet.</p>
                      </div>
                    ) : (
                      agent.diaryEntries
                        .slice()
                        .reverse()
                        .map((entry) => (
                          <div key={entry.id} className="bg-secondary/30 rounded-lg p-4 border border-border/50">
                            <p className="text-sm leading-relaxed mb-2">{entry.content}</p>
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                              <Clock size={10} />
                              <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>
          )
        })}
      </div>

      
    </div>
  )
}
