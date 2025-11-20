export type AgentRole = "designer" | "backend" | "cloud" | "product"

export interface DiaryEntry {
  id: string
  content: string
  timestamp: number
  isRead: boolean
}

export interface Agent {
  id: string
  name: string
  role: AgentRole
  avatar: string
  color: string
  isActive: boolean
  isEnabled: boolean
  diaryEntries: DiaryEntry[]
  unreadCount: number
}

export interface NodeData {
  id: string
  title: string
  content: string
  type: "feature" | "requirement" | "bug" | "note"
  status: "pending" | "processing" | "coded" | "review"
  x: number
  y: number
  groupId?: string
  width: number
  height: number
  agentFeedback?: {
    agentId: string
    message: string
  }[]
}

export interface NodeGroup {
  id: string
  name: string
  color: string
  nodeIds: string[]
  centroid: { x: number; y: number }
}

export interface CanvasState {
  nodes: NodeData[]
  groups: NodeGroup[]
  scale: number
  offset: { x: number; y: number }
}
