"use client"

import { useState, useCallback, useEffect } from "react"
import { CanvasBoard } from "@/components/canvas-board"
import { AgentSidebar } from "@/components/agent-sidebar"
import { ControlBar } from "@/components/control-bar"
import { StatusPanel } from "@/components/status-panel"
import type { Agent, NodeData, NodeGroup } from "@/lib/types"
import { generateId } from "@/lib/utils"
import { useSpeechRecognition } from "@/hooks/use-speech-recognition"
import { generateNodeTitle, generateAgentThoughts } from "./actions"

// Mock Agents
const INITIAL_AGENTS: Agent[] = [
  {
    id: "1",
    name: "Sarah",
    role: "designer",
    avatar: "",
    color: "#ec4899",
    isActive: false,
    isEnabled: true,
    diaryEntries: [],
    unreadCount: 0,
  },
  {
    id: "2",
    name: "Mike",
    role: "backend",
    avatar: "",
    color: "#3b82f6",
    isActive: false,
    isEnabled: true,
    diaryEntries: [],
    unreadCount: 0,
  },
  {
    id: "3",
    name: "Alex",
    role: "cloud",
    avatar: "",
    color: "#f59e0b",
    isActive: false,
    isEnabled: true,
    diaryEntries: [],
    unreadCount: 0,
  },
]

export default function Page() {
  const [nodes, setNodes] = useState<NodeData[]>([])
  const [groups, setGroups] = useState<NodeGroup[]>([])
  const [selectedNodes, setSelectedNodes] = useState<string[]>([])
  const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS)
  const [activeFeedback, setActiveFeedback] = useState<{ agentId: string; message: string } | null>(null)

  const addAgentThought = (agentId: string, content: string) => {
    setAgents((prev) =>
      prev.map((agent) => {
        if (agent.id === agentId && agent.isEnabled) {
          return {
            ...agent,
            unreadCount: agent.unreadCount + 1,
            diaryEntries: [
              ...agent.diaryEntries,
              {
                id: generateId(),
                content,
                timestamp: Date.now(),
                isRead: false,
              },
            ],
          }
        }
        return agent
      }),
    )
  }

  const handleMarkAsRead = (agentId: string) => {
    setAgents((prev) =>
      prev.map((agent) => {
        if (agent.id === agentId) {
          return {
            ...agent,
            unreadCount: 0,
            diaryEntries: agent.diaryEntries.map((e) => ({ ...e, isRead: true })),
          }
        }
        return agent
      }),
    )
  }

  const processAgentFeedback = useCallback(
    async (text: string) => {
      // We iterate through all enabled agents and ask them to "listen" to the transcript
      agents.forEach(async (agent) => {
        if (!agent.isEnabled) return

        const response = await generateAgentThoughts(text, agent.role, agent.name)

        if (response.message) {
          triggerAgentFeedback(agent.id, response.message)
        }

        if (response.thought) {
          addAgentThought(agent.id, response.thought)
        }
      })
    },
    [agents],
  )

  const triggerAgentFeedback = (agentId: string, message: string) => {
    setAgents((prev) => {
      const agent = prev.find((a) => a.id === agentId)
      if (!agent || !agent.isEnabled) return prev

      // If enabled, set active
      return prev.map((a) => (a.id === agentId ? { ...a, isActive: true } : a))
    })

    setAgents((prev) => {
      const agent = prev.find((a) => a.id === agentId)
      if (agent && agent.isEnabled) {
        setActiveFeedback({ agentId, message })

        // Auto-hide after 5s
        setTimeout(() => {
          setAgents((current) => current.map((a) => (a.id === agentId ? { ...a, isActive: false } : a)))
          setActiveFeedback((current) => (current?.agentId === agentId ? null : current))
        }, 5000)

        return prev.map((a) => (a.id === agentId ? { ...a, isActive: true } : a))
      }
      return prev
    })
  }

  const handleResult = useCallback(
    async (text: string, isFinal: boolean) => {
      if (isFinal && text.trim().length > 0) {
        const title = await generateNodeTitle(text)

        const newNode: NodeData = {
          id: generateId(),
          title, // AI-generated title
          content: text, // Full transcript preserved as context
          type: "requirement", // Default type, could be refined by AI later
          status: "pending",
          x: 100 + Math.random() * 400,
          y: 100 + Math.random() * 300,
          width: 288,
          height: 160,
        }

        setNodes((prev) => [...prev, newNode])

        processAgentFeedback(text)
      }
    },
    [processAgentFeedback],
  )

  const { isListening, transcript, startListening, stopListening, isSupported } = useSpeechRecognition({
    onResult: handleResult,
  })

  const toggleRecording = useCallback(() => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }, [isListening, startListening, stopListening])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "r") {
        e.preventDefault()
        toggleRecording()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [toggleRecording])

  const handleNodeSelect = (id: string) => {
    setSelectedNodes((prev) => (prev.includes(id) ? prev.filter((n) => n !== id) : [...prev, id]))
  }

  const handleNodePositionUpdate = (id: string, x: number, y: number) => {
    setNodes((prev) => prev.map((node) => (node.id === id ? { ...node, x, y } : node)))
  }

  const handleGroupDrag = (groupId: string, dx: number, dy: number) => {
    const group = groups.find((g) => g.id === groupId)
    if (!group) return

    setNodes((prev) =>
      prev.map((node) => {
        if (group.nodeIds.includes(node.id)) {
          return { ...node, x: node.x + dx, y: node.y + dy }
        }
        return node
      }),
    )
  }

  const handleCanvasClick = () => {
    setSelectedNodes([])
  }

  const handleSendToAgent = () => {
    setNodes((prev) => prev.map((node) => (selectedNodes.includes(node.id) ? { ...node, status: "processing" } : node)))

    setTimeout(() => {
      setNodes((prev) => prev.map((node) => (selectedNodes.includes(node.id) ? { ...node, status: "coded" } : node)))
      setSelectedNodes([])
    }, 3000)
  }

  const handleGroupRename = (groupId: string, newName: string) => {
    setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, name: newName } : g)))
  }

  const handleToggleAgent = (agentId: string) => {
    setAgents((prev) => prev.map((a) => (a.id === agentId ? { ...a, isEnabled: !a.isEnabled } : a)))
  }

  return (
    <main className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <div className="flex-1 relative">
        <CanvasBoard
          nodes={nodes}
          groups={groups}
          selectedNodes={selectedNodes}
          onNodeSelect={handleNodeSelect}
          onCanvasClick={handleCanvasClick}
          onNodePositionUpdate={handleNodePositionUpdate}
          onGroupDrag={handleGroupDrag} // Pass the new handler
          onGroupRename={handleGroupRename}
          agents={agents}
          onToggleAgent={handleToggleAgent}
        />

        <StatusPanel nodes={nodes} />

        <ControlBar
          isRecording={isListening}
          onToggleRecording={toggleRecording}
          onSendToAgent={handleSendToAgent}
          selectedCount={selectedNodes.length}
          transcript={transcript}
        />
      </div>

      <AgentSidebar agents={agents} activeFeedback={activeFeedback} onMarkAsRead={handleMarkAsRead} />
    </main>
  )
}
