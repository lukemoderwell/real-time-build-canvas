import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { NodeData, NodeGroup, TechnicalApproach } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

export function generateRandomColor(): string {
  const hue = Math.floor(Math.random() * 360);
  const saturation = 70;
  const lightness = 60;

  const c = ((1 - Math.abs((2 * lightness) / 100 - 1)) * saturation) / 100;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = lightness / 100 - c / 2;

  let r = 0,
    g = 0,
    b = 0;

  if (0 <= hue && hue < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (60 <= hue && hue < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (120 <= hue && hue < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (180 <= hue && hue < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (240 <= hue && hue < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (300 <= hue && hue < 360) {
    r = c;
    g = 0;
    b = x;
  }

  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const NODE_PADDING = 20; // Gap between nodes

function rectsOverlap(a: Rect, b: Rect): boolean {
  return !(
    a.x + a.width + NODE_PADDING <= b.x ||
    b.x + b.width + NODE_PADDING <= a.x ||
    a.y + a.height + NODE_PADDING <= b.y ||
    b.y + b.height + NODE_PADDING <= a.y
  );
}

/**
 * Finds a non-overlapping position for a new node near a centroid
 */
export function findNonOverlappingPosition(
  existingNodes: NodeData[],
  centroid: { x: number; y: number },
  nodeWidth: number,
  nodeHeight: number,
  groupId?: string
): { x: number; y: number } {
  // Filter to only nodes in the same group if specified
  const relevantNodes = groupId
    ? existingNodes.filter((n) => n.groupId === groupId)
    : existingNodes;

  const newRect: Rect = { x: 0, y: 0, width: nodeWidth, height: nodeHeight };

  // Try grid positions in expanding rings around centroid
  const gridSpacingX = nodeWidth + NODE_PADDING;
  const gridSpacingY = nodeHeight + NODE_PADDING;

  for (let ring = 0; ring < 10; ring++) {
    for (let dx = -ring; dx <= ring; dx++) {
      for (let dy = -ring; dy <= ring; dy++) {
        // Only check positions on the current ring's edge
        if (Math.abs(dx) !== ring && Math.abs(dy) !== ring) continue;

        const candidateX = centroid.x + dx * gridSpacingX;
        const candidateY = centroid.y + dy * gridSpacingY;
        newRect.x = candidateX;
        newRect.y = candidateY;

        const hasOverlap = relevantNodes.some((node) =>
          rectsOverlap(newRect, {
            x: node.x,
            y: node.y,
            width: node.width,
            height: node.height,
          })
        );

        if (!hasOverlap) {
          return { x: candidateX, y: candidateY };
        }
      }
    }
  }

  // Fallback: offset from centroid if all grid positions fail
  return {
    x: centroid.x + relevantNodes.length * 50,
    y: centroid.y + relevantNodes.length * 30,
  };
}

/**
 * Positions multiple new nodes in a grid pattern, avoiding existing nodes
 */
export function positionNewNodes(
  existingNodes: NodeData[],
  centroid: { x: number; y: number },
  count: number,
  nodeWidth: number,
  nodeHeight: number,
  groupId?: string
): Array<{ x: number; y: number }> {
  const positions: Array<{ x: number; y: number }> = [];
  const simulatedNodes = [...existingNodes];

  for (let i = 0; i < count; i++) {
    const pos = findNonOverlappingPosition(
      simulatedNodes,
      centroid,
      nodeWidth,
      nodeHeight,
      groupId
    );
    positions.push(pos);

    // Add this position to simulated nodes so next iteration avoids it
    simulatedNodes.push({
      id: `temp-${i}`,
      title: '',
      description: '',
      groupId: groupId || '',
      type: 'capability',
      x: pos.x,
      y: pos.y,
      width: nodeWidth,
      height: nodeHeight,
    });
  }

  return positions;
}

interface FeatureDetails {
  summary: string;
  userValue: string;
  keyCapabilities: string[];
  technicalApproach?: TechnicalApproach;
  openQuestions: string[];
  relatedFeatures: string[];
}

interface ConversationContext {
  transcript: string;
  reasoning: string;
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
      ...new Set([
        ...(group.keyCapabilities || []),
        ...details.keyCapabilities,
      ]),
    ],
    technicalApproach: details.technicalApproach || group.technicalApproach,
    openQuestions: [
      ...new Set([...(group.openQuestions || []), ...details.openQuestions]),
    ],
    relatedFeatures: [
      ...new Set([
        ...(group.relatedFeatures || []),
        ...details.relatedFeatures,
      ]),
    ],
    conversationHistory: [
      ...(group.conversationHistory || []),
      {
        timestamp: new Date(),
        transcript: conversation.transcript,
        insights: conversation.reasoning,
      },
    ],
  };
}
