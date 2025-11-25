import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { NodeGroup, TechnicalApproach } from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateId() {
  return Math.random().toString(36).substring(2, 9)
}

interface FeatureDetails {
  summary: string
  userValue: string
  keyCapabilities: string[]
  technicalApproach?: TechnicalApproach
  openQuestions: string[]
  relatedFeatures: string[]
}

interface ConversationContext {
  transcript: string
  reasoning: string
}

/**
 * Merges new feature details into an existing group, deduplicating arrays
 */
export function mergeFeatureDetails(
  group: NodeGroup,
  details: FeatureDetails,
  conversation: ConversationContext,
  additionalNodeIds: string[] = []
): NodeGroup {
  return {
    ...group,
    nodeIds: [...group.nodeIds, ...additionalNodeIds],
    summary: details.summary || group.summary || '',
    userValue: details.userValue || group.userValue || '',
    keyCapabilities: [
      ...new Set([...(group.keyCapabilities || []), ...details.keyCapabilities]),
    ],
    technicalApproach: details.technicalApproach || group.technicalApproach,
    openQuestions: [
      ...new Set([...(group.openQuestions || []), ...details.openQuestions]),
    ],
    relatedFeatures: [
      ...new Set([...(group.relatedFeatures || []), ...details.relatedFeatures]),
    ],
    conversationHistory: [
      ...(group.conversationHistory || []),
      {
        timestamp: new Date(),
        transcript: conversation.transcript,
        insights: conversation.reasoning,
      },
    ],
  }
}
