'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { CanvasBoard } from '@/components/canvas-board';
import { AgentSidebar } from '@/components/agent-sidebar';
import { TranscriptPanel } from '@/components/transcript-panel';
import { ControlBar } from '@/components/control-bar';
// import { StatusPanel } from '@/components/status-panel';
import { FeatureDetailsPanel } from '@/components/feature-details-panel';
import { CodingAgentPanel } from '@/components/coding-agent-panel';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Agent, NodeData, NodeGroup } from '@/lib/types';
import { generateId, mergeFeatureDetails, findNonOverlappingPosition, positionNewNodes, generateRandomColor } from '@/lib/utils';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { useSpacebarRecording } from '@/hooks/use-spacebar-recording';
import {
  generateAgentThoughts,
  generateBuildPrompt,
  analyzeTranscript,
  extractFeatureDetails,
  findMatchingFeature,
  extractCapabilityDetails,
} from './actions';

// Mock Agents
const INITIAL_AGENTS: Agent[] = [
  {
    id: '1',
    name: 'Sarah',
    role: 'designer',
    avatar: '',
    color: '#ec4899',
    isActive: false,
    isEnabled: true,
    diaryEntries: [],
    crossedOffEntries: [],
    unreadCount: 0,
  },
  {
    id: '2',
    name: 'Mike',
    role: 'backend',
    avatar: '',
    color: '#3b82f6',
    isActive: false,
    isEnabled: true,
    diaryEntries: [],
    crossedOffEntries: [],
    unreadCount: 0,
  },
  {
    id: '3',
    name: 'Alex',
    role: 'cloud',
    avatar: '',
    color: '#f59e0b',
    isActive: false,
    isEnabled: true,
    diaryEntries: [],
    crossedOffEntries: [],
    unreadCount: 0,
  },
  {
    id: '4',
    name: 'Steve',
    role: 'visionary',
    avatar: '',
    color: '#8b5cf6',
    isActive: false,
    isEnabled: true,
    diaryEntries: [],
    crossedOffEntries: [],
    unreadCount: 0,
  },
];

export default function Page() {
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [groups, setGroups] = useState<NodeGroup[]>([]);
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS);
  const [activeFeedback, setActiveFeedback] = useState<{
    agentId: string;
    message: string;
  } | null>(null);
  const [isTranscriptPanelOpen, setIsTranscriptPanelOpen] = useState(true);
  const [transcriptPanelWidth, setTranscriptPanelWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('transcript-panel-width');
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed >= 200 && parsed <= 500) {
          return parsed;
        }
      }
    }
    return 320;
  });
  const [isAgentSidebarOpen, setIsAgentSidebarOpen] = useState(true);
  const [currentSessionText, setCurrentSessionText] = useState('');
  const [fullTranscript, setFullTranscript] = useState('');
  const [buildPrompt, setBuildPrompt] = useState<string | null>(null);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [isPromptDialogOpen, setIsPromptDialogOpen] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const [codingAgentPanelPosition, setCodingAgentPanelPosition] = useState({
    x: 100,
    y: 100,
  });

  // Interval-based processing state
  const [transcriptBuffer, setTranscriptBuffer] = useState<string[]>([]);
  const processingIntervalMs = 10000; // 10 seconds
  const autoAnalysisDelayMs = 1500; // 1.5 seconds pause triggers auto-analysis
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const isAnalyzingRef = useRef(false); // Ref to prevent race conditions
  const autoAnalysisTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Feature details panel state
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(
    null
  );

  // Delete confirmation modal state
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    featuresToDelete: NodeGroup[];
  }>({ isOpen: false, featuresToDelete: [] });

  const addAgentThought = useCallback((agentId: string, content: string) => {
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
          };
        }
        return agent;
      })
    );
  }, []);

  const handleMarkAsRead = (agentId: string) => {
    setAgents((prev) =>
      prev.map((agent) => {
        if (agent.id === agentId) {
          return {
            ...agent,
            unreadCount: 0,
            diaryEntries: agent.diaryEntries.map((e) => ({
              ...e,
              isRead: true,
            })),
          };
        }
        return agent;
      })
    );
  };

  const handleDeleteDiaryEntry = useCallback(
    (agentId: string, entryId: string) => {
      setAgents((prev) =>
        prev.map((agent) => {
          if (agent.id === agentId) {
            return {
              ...agent,
              diaryEntries: agent.diaryEntries.filter((e) => e.id !== entryId),
            };
          }
          return agent;
        })
      );
    },
    []
  );

  const handleCrossOffDiaryEntry = useCallback(
    (agentId: string, entryId: string) => {
      setAgents((prev) =>
        prev.map((agent) => {
          if (agent.id === agentId) {
            const entry = agent.diaryEntries.find((e) => e.id === entryId);
            if (entry) {
              return {
                ...agent,
                diaryEntries: agent.diaryEntries.filter(
                  (e) => e.id !== entryId
                ),
                crossedOffEntries: [...agent.crossedOffEntries, entry],
              };
            }
          }
          return agent;
        })
      );
    },
    []
  );

  const triggerAgentFeedback = useCallback(
    (agentId: string, message: string) => {
      setAgents((prev) => {
        const agent = prev.find((a) => a.id === agentId);
        if (!agent || !agent.isEnabled) return prev;

        // If enabled, set active
        return prev.map((a) =>
          a.id === agentId ? { ...a, isActive: true } : a
        );
      });

      setAgents((prev) => {
        const agent = prev.find((a) => a.id === agentId);
        if (agent && agent.isEnabled) {
          setActiveFeedback({ agentId, message });

          // Auto-hide after 5s
          setTimeout(() => {
            setAgents((current) =>
              current.map((a) =>
                a.id === agentId ? { ...a, isActive: false } : a
              )
            );
            setActiveFeedback((current) =>
              current?.agentId === agentId ? null : current
            );
          }, 5000);

          return prev.map((a) =>
            a.id === agentId ? { ...a, isActive: true } : a
          );
        }
        return prev;
      });
    },
    []
  );

  const processAgentFeedback = useCallback(
    async (text: string) => {
      // We iterate through all enabled agents and ask them to "listen" to the transcript
      await Promise.all(
        agents.map(async (agent) => {
          if (!agent.isEnabled) return;

          const previousThoughts = agent.diaryEntries.map((entry) => entry.content);
          const response = await generateAgentThoughts(
            text,
            agent.role,
            agent.name,
            previousThoughts
          );

          if (response.message) {
            triggerAgentFeedback(agent.id, response.message);
          }

          if (response.thought) {
            addAgentThought(agent.id, response.thought);
          }
        })
      );
    },
    [agents, addAgentThought, triggerAgentFeedback]
  );

  const processAccumulatedTranscript = useCallback(async () => {
    if (transcriptBuffer.length === 0) return;

    // Use ref to prevent race conditions - check and set atomically
    if (isAnalyzingRef.current) return;
    isAnalyzingRef.current = true;
    setIsAnalyzing(true);

    try {
      const accumulatedText = transcriptBuffer.join(' ');

      // Analyze what type of content this is
      const analysis = await analyzeTranscript(
        accumulatedText,
        groups.map((g) => ({
          id: g.id,
          name: g.name,
          summary: g.summary || '',
        }))
      );

      if (analysis.type === 'noise' && analysis.confidence > 0.85) {
        // Only skip if it's VERY clearly noise with very high confidence
        setTranscriptBuffer([]);
        return;
      }

      // If low confidence or classified as noise but not confidently, try to extract as feature anyway
      if (analysis.type === 'noise' || analysis.confidence < 0.6) {
        analysis.type = 'feature';
      }

      if (analysis.type === 'feature') {
        // Extract feature details
        const featureDetails = await extractFeatureDetails(
          accumulatedText,
          transcriptBuffer
        );

        // Check if feature already exists (semantic matching)
        const match = await findMatchingFeature(
          accumulatedText,
          groups.map((g) => ({
            id: g.id,
            name: g.name,
            summary: g.summary || '',
            keyCapabilities: g.keyCapabilities || [],
          }))
        );

        if (match.matchedGroupId && match.confidence >= 0.7) {
          // Update existing feature group and create nodes for new capabilities
          const existingGroup = groups.find((g) => g.id === match.matchedGroupId);
          const existingCapabilities = existingGroup?.keyCapabilities || [];
          const existingNodeTitles = nodes
            .filter((n) => n.groupId === match.matchedGroupId)
            .map((n) => n.title.toLowerCase());

          // Find new capabilities that don't have nodes yet
          const newCapabilities = featureDetails.keyCapabilities.filter(
            (cap) =>
              !existingCapabilities.includes(cap) &&
              !existingNodeTitles.includes(cap.toLowerCase())
          );

          // Create nodes for new capabilities with non-overlapping positions
          const newCapabilityNodes: NodeData[] = (() => {
            if (newCapabilities.length === 0 || !existingGroup) return [];

            const positions = positionNewNodes(
              nodes,
              existingGroup.centroid,
              newCapabilities.length,
              288,
              160,
              match.matchedGroupId
            );

            return newCapabilities.map((capability, index) => ({
              id: generateId(),
              title: capability,
              description: '',
              groupId: match.matchedGroupId!,
              type: 'capability' as const,
              x: positions[index].x,
              y: positions[index].y,
              width: 288,
              height: 160,
            }));
          })();

          if (newCapabilityNodes.length > 0) {
            setNodes((prev) => [...prev, ...newCapabilityNodes]);
          }

          // Update group using helper
          const conversation = { transcript: accumulatedText, reasoning: analysis.reasoning };
          setGroups((prev) =>
            prev.map((g) =>
              g.id === match.matchedGroupId
                ? mergeFeatureDetails(g, featureDetails, conversation, newCapabilityNodes.map((n) => n.id))
                : g
            )
          );
        } else {
          // Create new feature group with randomized position to avoid stacking
          const newGroupId = generateId();
          const baseCentroid = {
            x: 200 + Math.random() * 600,
            y: 200 + Math.random() * 400,
          };

          // Create capability nodes with non-overlapping positions
          const positions = positionNewNodes(
            nodes,
            baseCentroid,
            featureDetails.keyCapabilities.length,
            288,
            160
          );

          const capabilityNodes: NodeData[] = featureDetails.keyCapabilities.map(
            (capability, index) => ({
              id: generateId(),
              title: capability,
              description: '',
              groupId: newGroupId,
              type: 'capability' as const,
              x: positions[index]?.x ?? baseCentroid.x,
              y: positions[index]?.y ?? baseCentroid.y,
              width: 288,
              height: 160,
            })
          );

          const newGroup: NodeGroup = {
            id: newGroupId,
            name: featureDetails.name,
            color: generateRandomColor(),
            nodeIds: capabilityNodes.map((n) => n.id),
            centroid: baseCentroid,
            summary: featureDetails.summary,
            userValue: featureDetails.userValue,
            keyCapabilities: featureDetails.keyCapabilities,
            technicalApproach: featureDetails.technicalApproach,
            openQuestions: featureDetails.openQuestions,
            relatedFeatures: featureDetails.relatedFeatures,
            conversationHistory: [
              {
                timestamp: new Date(),
                transcript: accumulatedText,
                insights: analysis.reasoning,
              },
            ],
          };

          // Add capability nodes
          if (capabilityNodes.length > 0) {
            setNodes((prev) => [...prev, ...capabilityNodes]);
          }
          setGroups((prev) => [...prev, newGroup]);
        }
      } else if (analysis.type === 'capability') {
        // Find which feature this capability belongs to
        const match = await findMatchingFeature(
          accumulatedText,
          groups.map((g) => ({
            id: g.id,
            name: g.name,
            summary: g.summary || '',
            keyCapabilities: g.keyCapabilities || [],
          }))
        );

        if (match.matchedGroupId && match.confidence >= 0.7) {
          // Extract capability details
          const capabilityDetails = await extractCapabilityDetails(
            accumulatedText
          );

          // Find the group's centroid for positioning
          const targetGroup = groups.find((g) => g.id === match.matchedGroupId);
          const centroid = targetGroup?.centroid || { x: 400, y: 300 };

          // Find non-overlapping position
          const position = findNonOverlappingPosition(
            nodes,
            centroid,
            288,
            160,
            match.matchedGroupId
          );

          // Create new capability node
          const newNodeId = generateId();
          const newNode: NodeData = {
            id: newNodeId,
            title: capabilityDetails.title,
            description: capabilityDetails.description,
            groupId: match.matchedGroupId,
            type: 'capability',
            x: position.x,
            y: position.y,
            width: 288,
            height: 160,
          };

          setNodes((prev) => [...prev, newNode]);

          // Add node to group
          setGroups((prev) =>
            prev.map((g) => {
              if (g.id === match.matchedGroupId) {
                return {
                  ...g,
                  nodeIds: [...g.nodeIds, newNode.id],
                  conversationHistory: [
                    ...(g.conversationHistory || []),
                    {
                      timestamp: new Date(),
                      transcript: accumulatedText,
                      insights: `Added capability: ${capabilityDetails.title}`,
                    },
                  ],
                };
              }
              return g;
            })
          );

          processAgentFeedback(accumulatedText);
        } else {
          // No matching feature - treat as new feature instead
          const featureDetails = await extractFeatureDetails(
            accumulatedText,
            transcriptBuffer
          );

          const newGroup: NodeGroup = {
            id: generateId(),
            name: featureDetails.name,
            color: `hsl(${Math.random() * 360}, 70%, 60%)`,
            nodeIds: [],
            centroid: {
              x: 200 + Math.random() * 600,
              y: 200 + Math.random() * 400,
            },
            summary: featureDetails.summary,
            userValue: featureDetails.userValue,
            keyCapabilities: featureDetails.keyCapabilities,
            technicalApproach: featureDetails.technicalApproach,
            openQuestions: featureDetails.openQuestions,
            relatedFeatures: featureDetails.relatedFeatures,
            conversationHistory: [
              {
                timestamp: new Date(),
                transcript: accumulatedText,
                insights: analysis.reasoning,
              },
            ],
          };
          setGroups((prev) => [...prev, newGroup]);
        }
      }

      // Clear buffer
      setTranscriptBuffer([]);
    } catch (error) {
      console.error('[v0] Error during transcript analysis:', error);
      throw error;
    } finally {
      isAnalyzingRef.current = false;
      setIsAnalyzing(false);
    }
  }, [transcriptBuffer, groups, nodes, processAgentFeedback]);

  const handleResult = useCallback(async (text: string, isFinal: boolean) => {
    if (!isFinal) {
      // Update current session text with interim results (this replaces previous interim)
      setCurrentSessionText(text);
      return;
    }

    if (isFinal && text.trim().length > 0) {
      const finalText = text.trim();

      // Add final text to current session
      setCurrentSessionText((prev) => {
        const newText = prev ? `${prev} ${finalText}` : finalText;
        return newText;
      });

      // Add final text to full transcript
      setFullTranscript((prev) => {
        // Append with space if there's existing text
        return prev + (prev && !prev.endsWith('\n\n') ? ' ' : '') + finalText;
      });

      // Add to transcript buffer for interval processing
      setTranscriptBuffer((prev) => [...prev, finalText]);
    }
  }, []);

  const { isListening, startListening, stopListening } = useSpeechRecognition({
    onResult: handleResult,
  });

  // Helper to stop recording with transcript processing
  const handleStopRecording = useCallback(async () => {
    if (currentSessionText.trim()) {
      setCurrentSessionText('');
      setFullTranscript((prev) => prev + '\n\n');
    }
    stopListening();

    if (transcriptBuffer.length > 0) {
      await processAccumulatedTranscript();
    }
  }, [transcriptBuffer, processAccumulatedTranscript, currentSessionText, stopListening]);

  // Helper to stop PTT recording with immediate analysis
  const handleStopPTT = useCallback(async () => {
    if (currentSessionText.trim()) {
      setCurrentSessionText('');
      setFullTranscript((prev) => prev + '\n\n');
    }
    stopListening();

    // Small delay to allow final speech results to arrive
    setTimeout(() => {
      processAccumulatedTranscript();
    }, 300);
  }, [currentSessionText, stopListening, processAccumulatedTranscript]);

  // Spacebar recording hook
  const { recordingMode, toggleRecording } = useSpacebarRecording({
    isListening,
    startListening,
    stopListening,
    onStopRecording: handleStopRecording,
    onStopPTT: handleStopPTT,
  });

  // Delete only capabilities (used by backspace/delete key)
  // This will NOT delete features - only removes capabilities from them
  const handleDelete = useCallback(() => {
    if (selectedNodes.length === 0) return;

    setNodes((prev) => prev.filter((node) => !selectedNodes.includes(node.id)));
    setGroups((prev) =>
      prev.map((group) => ({
        ...group,
        nodeIds: group.nodeIds.filter((id) => !selectedNodes.includes(id)),
      }))
      // Note: We no longer filter out empty groups here - features persist even when empty
    );
    setSelectedNodes([]);
  }, [selectedNodes]);

  // Perform feature deletion (called after confirmation)
  const performFeatureDelete = useCallback(() => {
    const featureIds = deleteConfirmation.featuresToDelete.map((f) => f.id);

    // Delete all capabilities belonging to these features
    setNodes((prev) =>
      prev.filter((node) => !featureIds.includes(node.groupId))
    );

    // Delete the features themselves
    setGroups((prev) => prev.filter((group) => !featureIds.includes(group.id)));

    // Clear selection and close panel if the deleted feature was selected
    if (selectedFeatureId && featureIds.includes(selectedFeatureId)) {
      setSelectedFeatureId(null);
    }

    setDeleteConfirmation({ isOpen: false, featuresToDelete: [] });
  }, [deleteConfirmation.featuresToDelete, selectedFeatureId]);

  // Request to delete a feature (shows confirmation modal)
  const handleDeleteFeature = useCallback((feature: NodeGroup) => {
    setDeleteConfirmation({
      isOpen: true,
      featuresToDelete: [feature],
    });
  }, []);

  // Delete key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isInput =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        (activeElement as HTMLElement)?.isContentEditable;

      if (isInput) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        handleDelete();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDelete]);

  // Auto-analysis: Trigger analysis automatically after a pause in speech
  useEffect(() => {
    if (!isListening || transcriptBuffer.length === 0 || isAnalyzing) {
      // Clear timeout if we're not listening, buffer is empty, or already analyzing
      if (autoAnalysisTimeoutRef.current) {
        clearTimeout(autoAnalysisTimeoutRef.current);
        autoAnalysisTimeoutRef.current = null;
      }
      return;
    }

    // Check if buffer has meaningful content (at least 2 items or total length > 50 chars)
    const totalLength = transcriptBuffer.join(' ').length;
    const hasMeaningfulContent = transcriptBuffer.length >= 2 || totalLength > 50;

    if (hasMeaningfulContent) {
      // Clear any existing timeout
      if (autoAnalysisTimeoutRef.current) {
        clearTimeout(autoAnalysisTimeoutRef.current);
      }

      // Set up debounced auto-analysis after a pause
      autoAnalysisTimeoutRef.current = setTimeout(() => {
        if (transcriptBuffer.length > 0 && !isAnalyzing) {
          processAccumulatedTranscript();
        }
        autoAnalysisTimeoutRef.current = null;
      }, autoAnalysisDelayMs);
    }

    return () => {
      if (autoAnalysisTimeoutRef.current) {
        clearTimeout(autoAnalysisTimeoutRef.current);
        autoAnalysisTimeoutRef.current = null;
      }
    };
  }, [transcriptBuffer, isListening, isAnalyzing, autoAnalysisDelayMs, processAccumulatedTranscript]);

  // Interval-based transcript processing (fallback - ensures nothing gets stuck)
  useEffect(() => {
    if (!isListening) return;

    const intervalId = setInterval(() => {
      // Only process if there's content and we're not already analyzing
      if (transcriptBuffer.length > 0 && !isAnalyzing) {
        processAccumulatedTranscript();
      }
    }, processingIntervalMs);

    return () => clearInterval(intervalId);
  }, [isListening, processingIntervalMs, processAccumulatedTranscript, transcriptBuffer.length, isAnalyzing]);

  // Staggered agent thinking intervals - consolidated and optimized
  useEffect(() => {
    if (!fullTranscript.trim()) return;

    // Track last processed transcript length per agent
    const lastProcessedLength = new Map<string, number>();
    const agentIntervalMap = new Map([
      ['Sarah', 30000], // 30 seconds
      ['Steve', 40000], // 40 seconds
      ['Mike', 45000], // 45 seconds
      ['Alex', 60000], // 60 seconds
    ]);

    const intervalIds = agents
      .filter((agent) => agent.isEnabled && agentIntervalMap.has(agent.name))
      .map((agent) => {
        const interval = agentIntervalMap.get(agent.name)!;
        lastProcessedLength.set(agent.name, 0);

        const intervalId = setInterval(async () => {
          const currentLength = fullTranscript.trim().length;
          const lastLength = lastProcessedLength.get(agent.name) || 0;

          // Only process if transcript has meaningfully changed (at least 50 new characters)
          if (currentLength === 0 || currentLength - lastLength < 50) {
            return;
          }

          lastProcessedLength.set(agent.name, currentLength);

          const previousThoughts = agent.diaryEntries.map((entry) => entry.content);
          const response = await generateAgentThoughts(
            fullTranscript,
            agent.role,
            agent.name,
            previousThoughts
          );

          if (response.thought) {
            addAgentThought(agent.id, response.thought);
          }
        }, interval);

        return intervalId;
      });

    return () => {
      intervalIds.forEach((id) => clearInterval(id));
    };
  }, [agents, fullTranscript, addAgentThought]);

  const handleNodeSelect = (id: string) => {
    setSelectedNodes((prev) =>
      prev.includes(id) ? prev.filter((n) => n !== id) : [...prev, id]
    );
  };

  const handleNodePositionUpdate = (id: string, x: number, y: number) => {
    setNodes((prev) =>
      prev.map((node) => (node.id === id ? { ...node, x, y } : node))
    );
  };

  const handleGroupDrag = (groupId: string, dx: number, dy: number) => {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;

    // Update node positions for groups with nodes
    setNodes((prev) =>
      prev.map((node) => {
        if (group.nodeIds.includes(node.id)) {
          return { ...node, x: node.x + dx, y: node.y + dy };
        }
        return node;
      })
    );

    // Update centroid for empty groups
    if (group.nodeIds.length === 0) {
      setGroups((prev) =>
        prev.map((g) => {
          if (g.id === groupId) {
            return {
              ...g,
              centroid: {
                x: g.centroid.x + dx,
                y: g.centroid.y + dy,
              },
            };
          }
          return g;
        })
      );
    }
  };

  const handleCanvasClick = () => {
    setSelectedNodes([]);
  };

  const handleSendToAgent = async () => {
    const selectedNodesData = nodes.filter((node) =>
      selectedNodes.includes(node.id)
    );

    if (selectedNodesData.length === 0) return;

    // Update node statuses
    setNodes((prev) =>
      prev.map((node) =>
        selectedNodes.includes(node.id)
          ? { ...node, status: 'processing' }
          : node
      )
    );

    // Generate build prompt
    try {
      const prompt = await generateBuildPrompt(
        selectedNodesData.map((node) => ({
          title: node.title,
          content: node.description,
          type: node.type,
        }))
      );
      setBuildPrompt(prompt);
      setIsPromptDialogOpen(true);
    } catch (error) {
      console.error('Error generating build prompt:', error);
    }

    setTimeout(() => {
      setNodes((prev) =>
        prev.map((node) =>
          selectedNodes.includes(node.id) ? { ...node, status: 'coded' } : node
        )
      );
    }, 3000);
  };

  const handleSendFeatureToAgent = async (feature: NodeGroup) => {
    const featureNodes = nodes.filter((node) =>
      feature.nodeIds.includes(node.id)
    );

    if (featureNodes.length === 0) return;

    // Update node statuses
    setNodes((prev) =>
      prev.map((node) =>
        feature.nodeIds.includes(node.id)
          ? { ...node, status: 'processing' }
          : node
      )
    );

    // Open panel immediately with loading state
    setBuildPrompt(null);
    setIsGeneratingPrompt(true);
    setIsPromptDialogOpen(true);

    // Generate build prompt
    try {
      const prompt = await generateBuildPrompt(
        featureNodes.map((node) => ({
          title: node.title,
          content: node.description,
          type: node.type,
        }))
      );
      setBuildPrompt(prompt);
    } catch (error) {
      console.error('Error generating build prompt:', error);
    } finally {
      setIsGeneratingPrompt(false);
    }

    setTimeout(() => {
      setNodes((prev) =>
        prev.map((node) =>
          feature.nodeIds.includes(node.id)
            ? { ...node, status: 'coded' }
            : node
        )
      );
    }, 3000);
  };

  const handleGroupRename = (groupId: string, newName: string) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, name: newName } : g))
    );
  };

  const handleGroupClick = (groupId: string) => {
    setSelectedFeatureId(groupId);
  };

  // Create a new feature from a related feature name
  const handleCreateRelatedFeature = useCallback((featureName: string) => {
    // Check if a feature with this name already exists
    const existingFeature = groups.find(
      (g) => g.name.toLowerCase() === featureName.toLowerCase()
    );

    if (existingFeature) {
      // If it exists, just open its details panel
      setSelectedFeatureId(existingFeature.id);
      return;
    }

    // Create a new feature group
    const newGroupId = generateId();
    const baseCentroid = {
      x: 200 + Math.random() * 600,
      y: 200 + Math.random() * 400,
    };

    const newGroup: NodeGroup = {
      id: newGroupId,
      name: featureName,
      color: generateRandomColor(),
      nodeIds: [],
      centroid: baseCentroid,
      summary: '',
      userValue: '',
      keyCapabilities: [],
      technicalApproach: undefined,
      openQuestions: [],
      relatedFeatures: [],
      conversationHistory: [
        {
          timestamp: new Date(),
          transcript: `Created from related feature link`,
          insights: 'Feature created for exploration - describe it to add details',
        },
      ],
    };

    setGroups((prev) => [...prev, newGroup]);

    // Open the new feature's details panel
    setSelectedFeatureId(newGroupId);
  }, [groups]);

  const handleToggleAgent = (agentId: string) => {
    setAgents((prev) =>
      prev.map((a) =>
        a.id === agentId ? { ...a, isEnabled: !a.isEnabled } : a
      )
    );
  };

  const handleCopyPrompt = async () => {
    if (buildPrompt) {
      await navigator.clipboard.writeText(buildPrompt);
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
    }
  };

  return (
    <main className='flex h-screen w-screen overflow-hidden bg-background text-foreground'>
      <div className='flex-1 relative'>
        <TranscriptPanel
          fullTranscript={fullTranscript}
          currentSessionText={currentSessionText}
          isRecording={isListening}
          recordingMode={recordingMode}
          isAnalyzing={isAnalyzing}
          isMinimized={!isTranscriptPanelOpen}
          onToggleMinimize={() => setIsTranscriptPanelOpen((prev) => !prev)}
          width={transcriptPanelWidth}
          onWidthChange={setTranscriptPanelWidth}
        />

        <CanvasBoard
          nodes={nodes}
          groups={groups}
          selectedNodes={selectedNodes}
          onNodeSelect={handleNodeSelect}
          onCanvasClick={handleCanvasClick}
          onNodePositionUpdate={handleNodePositionUpdate}
          onGroupDrag={handleGroupDrag}
          onGroupRename={handleGroupRename}
          onGroupClick={handleGroupClick}
          isRecording={isListening}
          recordingMode={recordingMode}
          onToggleRecording={toggleRecording}
          isTranscriptPanelOpen={isTranscriptPanelOpen}
          onToggleTranscriptPanel={() =>
            setIsTranscriptPanelOpen((prev) => !prev)
          }
          isAgentSidebarOpen={isAgentSidebarOpen}
          transcriptPanelWidth={transcriptPanelWidth}
          codingAgentPanel={
            isPromptDialogOpen ? (
              <CodingAgentPanel
                prompt={buildPrompt}
                isGenerating={isGeneratingPrompt}
                onClose={() => setIsPromptDialogOpen(false)}
                onCopy={handleCopyPrompt}
                copied={promptCopied}
                x={codingAgentPanelPosition.x}
                y={codingAgentPanelPosition.y}
                scale={1}
                onPositionUpdate={(x, y) => {
                  setCodingAgentPanelPosition({ x, y });
                }}
              />
            ) : null
          }
        />

        {/* <StatusPanel nodes={nodes} /> */}

        <ControlBar
          onSendToAgent={handleSendToAgent}
          selectedCount={selectedNodes.length}
        />
      </div>

      <AgentSidebar
        agents={agents}
        activeFeedback={activeFeedback}
        onMarkAsRead={handleMarkAsRead}
        onToggleAgent={handleToggleAgent}
        onDeleteDiaryEntry={handleDeleteDiaryEntry}
        onCrossOffDiaryEntry={handleCrossOffDiaryEntry}
        isMinimized={!isAgentSidebarOpen}
        onToggleMinimize={() => setIsAgentSidebarOpen((prev) => !prev)}
      />

      {/* Feature Details Panel */}
      <FeatureDetailsPanel
        feature={groups.find((g) => g.id === selectedFeatureId) || null}
        onClose={() => setSelectedFeatureId(null)}
        onSendToAgent={handleSendFeatureToAgent}
        onDelete={handleDeleteFeature}
        onCreateRelatedFeature={handleCreateRelatedFeature}
        isBuildingPrompt={isGeneratingPrompt}
      />

      {/* Delete Feature Confirmation Modal */}
      <AlertDialog
        open={deleteConfirmation.isOpen}
        onOpenChange={(open) =>
          setDeleteConfirmation((prev) => ({ ...prev, isOpen: open }))
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Feature?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{' '}
              {deleteConfirmation.featuresToDelete.length === 1 ? (
                <>
                  the feature{' '}
                  <span className='font-semibold text-foreground'>
                    &quot;{deleteConfirmation.featuresToDelete[0]?.name}&quot;
                  </span>
                </>
              ) : (
                <>
                  <span className='font-semibold text-foreground'>
                    {deleteConfirmation.featuresToDelete.length} features
                  </span>
                  :{' '}
                  {deleteConfirmation.featuresToDelete
                    .map((f) => f.name)
                    .join(', ')}
                </>
              )}{' '}
              and all associated capabilities. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={performFeatureDelete}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
