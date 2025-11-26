import type { NodeData, NodeGroup } from './types';

interface KeywordPattern {
  keywords: string[];
  groupName: string;
  color: string;
}

const GROUP_PATTERNS: KeywordPattern[] = [
  {
    keywords: [
      'auth',
      'login',
      'signup',
      'password',
      'oauth',
      'session',
      'user',
      'sso',
      'mfa',
    ],
    groupName: 'Authentication',
    color: '#3b82f6',
  },
  {
    keywords: [
      'payment',
      'stripe',
      'checkout',
      'subscription',
      'billing',
      'invoice',
      'plan',
      'pricing',
      'credit card',
    ],
    groupName: 'Billing & Payments',
    color: '#8b5cf6',
  },
  {
    keywords: [
      'database',
      'postgres',
      'supabase',
      'sql',
      'query',
      'storage',
      'data',
      'schema',
      'table',
      'record',
    ],
    groupName: 'Data Layer',
    color: '#06b6d4',
  },
  {
    keywords: [
      'ui',
      'design',
      'component',
      'layout',
      'style',
      'theme',
      'dark mode',
      'css',
      'frontend',
      'ux',
    ],
    groupName: 'Design System',
    color: '#ec4899',
  },
  {
    keywords: [
      'api',
      'endpoint',
      'route',
      'handler',
      'backend',
      'server',
      'function',
      'middleware',
      'controller',
    ],
    groupName: 'Backend API',
    color: '#10b981',
  },
  {
    keywords: [
      'email',
      'notification',
      'alert',
      'message',
      'send',
      'communication',
      'sms',
      'push',
    ],
    groupName: 'Notifications',
    color: '#f59e0b',
  },
  {
    keywords: [
      'admin',
      'dashboard',
      'analytics',
      'chart',
      'report',
      'metrics',
      'stats',
      'moderation',
    ],
    groupName: 'Admin & Analytics',
    color: '#ef4444',
  },
  {
    keywords: ['onboarding', 'tutorial', 'guide', 'welcome', 'setup', 'flow'],
    groupName: 'Onboarding',
    color: '#84cc16',
  },
];

const PROXIMITY_THRESHOLD = 400;
const MIN_GROUP_SIZE = 2;

function generateSmartGroupName(nodes: NodeData[]): string {
  const wordCounts: Record<string, number> = {};
  const stopWords = new Set([
    'the',
    'a',
    'an',
    'and',
    'or',
    'but',
    'in',
    'on',
    'at',
    'to',
    'for',
    'of',
    'with',
    'is',
    'are',
    'we',
    'need',
    'add',
    'create',
    'make',
    'should',
    'feature',
    'requirement',
  ]);

  nodes.forEach((node) => {
    const words = `${node.title} ${node.content}`
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/);
    words.forEach((word) => {
      if (word.length > 3 && !stopWords.has(word)) {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      }
    });
  });

  const sortedWords = Object.entries(wordCounts).sort((a, b) => b[1] - a[1]);

  if (sortedWords.length > 0) {
    const topWord = sortedWords[0][0];
    return topWord.charAt(0).toUpperCase() + topWord.slice(1) + ' Features';
  }

  return 'New Feature Group';
}

export function updateGroups(
  nodes: NodeData[],
  currentGroups: NodeGroup[]
): NodeGroup[] {
  // Create a map of currently grouped node IDs to avoid moving them
  const groupedNodeIds = new Set<string>();
  currentGroups.forEach((g) =>
    g.nodeIds.forEach((id) => groupedNodeIds.add(id))
  );

  // Identify ungrouped nodes
  const ungroupedNodes = nodes.filter((n) => !groupedNodeIds.has(n.id));

  if (ungroupedNodes.length === 0) return currentGroups;

  const updatedGroups = [...currentGroups];
  const nodesToGroup = [...ungroupedNodes];
  const assignedInThisPass = new Set<string>();

  // 1. Try to add ungrouped nodes to EXISTING groups based on strong keyword matches
  for (const node of nodesToGroup) {
    if (assignedInThisPass.has(node.id)) continue;

    const text = `${node.title} ${node.content}`.toLowerCase();

    // Check against existing groups first (if they match a pattern)
    for (const group of updatedGroups) {
      const pattern = GROUP_PATTERNS.find((p) => p.groupName === group.name); // Simple check, could be robust
      if (pattern && pattern.keywords.some((k) => text.includes(k))) {
        group.nodeIds.push(node.id);
        assignedInThisPass.add(node.id);
        break;
      }
    }
  }

  // 2. Form NEW groups from remaining ungrouped nodes
  const remainingNodes = nodesToGroup.filter(
    (n) => !assignedInThisPass.has(n.id)
  );

  // A. Keyword clustering for new groups
  for (const pattern of GROUP_PATTERNS) {
    const matchingNodes = remainingNodes.filter((node) => {
      if (assignedInThisPass.has(node.id)) return false;
      const text = `${node.title} ${node.content}`.toLowerCase();
      return pattern.keywords.some((keyword) => text.includes(keyword));
    });

    if (matchingNodes.length >= MIN_GROUP_SIZE) {
      updatedGroups.push({
        id: `group-${pattern.groupName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
        name: pattern.groupName,
        color: pattern.color,
        nodeIds: matchingNodes.map((n) => n.id),
        centroid: { x: 0, y: 0 }, // Will be calculated by renderer or layout engine
      });
      matchingNodes.forEach((n) => assignedInThisPass.add(n.id));
    }
  }

  // B. Proximity clustering for whatever is left
  const stillUngrouped = remainingNodes.filter(
    (n) => !assignedInThisPass.has(n.id)
  );
  const proximityClusters: NodeData[][] = [];

  for (const node of stillUngrouped) {
    let addedToCluster = false;
    // Check against existing proximity clusters being formed
    for (const cluster of proximityClusters) {
      const avgX = cluster.reduce((sum, n) => sum + n.x, 0) / cluster.length;
      const avgY = cluster.reduce((sum, n) => sum + n.y, 0) / cluster.length;
      const distance = Math.sqrt((node.x - avgX) ** 2 + (node.y - avgY) ** 2);

      if (distance < PROXIMITY_THRESHOLD) {
        cluster.push(node);
        addedToCluster = true;
        break;
      }
    }
    if (!addedToCluster) {
      proximityClusters.push([node]);
    }
  }

  // Convert clusters to groups
  proximityClusters.forEach((cluster) => {
    if (cluster.length >= MIN_GROUP_SIZE) {
      const name = generateSmartGroupName(cluster);
      const colors = ['#64748b', '#6366f1', '#14b8a6', '#f97316'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      updatedGroups.push({
        id: `group-smart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: name,
        color: randomColor,
        nodeIds: cluster.map((n) => n.id),
        centroid: { x: 0, y: 0 },
      });
    }
  });

  return updatedGroups;
}
