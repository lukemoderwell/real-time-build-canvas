export type AgentRole = 'designer' | 'backend' | 'cloud' | 'visionary';

export interface DiaryEntry {
  id: string;
  content: string;
  timestamp: number;
  isRead: boolean;
}

export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  avatar: string;
  color: string;
  isActive: boolean;
  isEnabled: boolean;
  diaryEntries: DiaryEntry[];
  crossedOffEntries: DiaryEntry[];
  unreadCount: number;
}

export interface NodeData {
  id: string;
  title: string;
  description: string; // Brief 1-2 sentence description of the capability
  groupId: string; // REQUIRED - every capability belongs to a feature
  type: 'capability';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ConversationEntry {
  timestamp: Date;
  transcript: string;
  insights: string;
}

export interface TechnicalApproach {
  options: string[];
  considerations: string[];
}

export interface NodeGroup {
  id: string;
  name: string;
  color: string;
  nodeIds: string[];
  centroid: { x: number; y: number };

  // Rich feature details (optional for backward compatibility)
  summary?: string; // 2-3 sentence plain English description
  userValue?: string; // Why users want this feature
  keyCapabilities?: string[]; // List of what it does
  technicalApproach?: TechnicalApproach; // Implementation options and considerations
  openQuestions?: string[]; // Decisions that need to be made
  relatedFeatures?: string[]; // Other features this connects to
  conversationHistory?: ConversationEntry[]; // All discussions about this feature
}

export interface CanvasState {
  nodes: NodeData[];
  groups: NodeGroup[];
  scale: number;
  offset: { x: number; y: number };
}

export interface TranscriptEntry {
  id: string;
  speaker: string;
  text: string;
  timestamp: number;
}
