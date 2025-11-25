'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { CanvasBoard } from '@/components/canvas-board';
import { AgentSidebar } from '@/components/agent-sidebar';
import { TranscriptPanel } from '@/components/transcript-panel';
import { ControlBar } from '@/components/control-bar';
import { StatusPanel } from '@/components/status-panel';
import { FeatureDetailsPanel } from '@/components/feature-details-panel';
import { CodingAgentPanel } from '@/components/coding-agent-panel';
import { Button } from '@/components/ui/button';
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
import { Sparkles, Loader2 } from 'lucide-react';
import type { Agent, NodeData, NodeGroup, TranscriptEntry } from '@/lib/types';
import { generateId } from '@/lib/utils';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
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
  const [isAgentSidebarOpen, setIsAgentSidebarOpen] = useState(true);
  const [transcriptEntries, setTranscriptEntries] = useState<TranscriptEntry[]>(
    []
  );
  const [currentSessionText, setCurrentSessionText] = useState('');
  const [fullTranscript, setFullTranscript] = useState('');
  const [buildPrompt, setBuildPrompt] = useState<string | null>(null);
  const [isPromptDialogOpen, setIsPromptDialogOpen] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const [codingAgentPanelPosition, setCodingAgentPanelPosition] = useState({
    x: 100,
    y: 100,
  });

  // Interval-based processing state
  const [transcriptBuffer, setTranscriptBuffer] = useState<string[]>([]);
  const [processingIntervalMs] = useState(10000); // 10 seconds (reduced from 30s for faster updates)
  const [autoAnalysisDelayMs] = useState(1500); // 1.5 seconds pause triggers auto-analysis
  const [isAnalyzing, setIsAnalyzing] = useState(false);
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

          const response = await generateAgentThoughts(
            text,
            agent.role,
            agent.name
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
          // Update existing feature group
          setGroups((prev) =>
            prev.map((g) => {
              if (g.id === match.matchedGroupId) {
                return {
                  ...g,
                  summary: featureDetails.summary || g.summary || '',
                  userValue: featureDetails.userValue || g.userValue || '',
                  keyCapabilities: [
                    ...new Set([
                      ...(g.keyCapabilities || []),
                      ...featureDetails.keyCapabilities,
                    ]),
                  ],
                  technicalApproach:
                    featureDetails.technicalApproach || g.technicalApproach,
                  openQuestions: [
                    ...new Set([
                      ...(g.openQuestions || []),
                      ...featureDetails.openQuestions,
                    ]),
                  ],
                  relatedFeatures: [
                    ...new Set([
                      ...(g.relatedFeatures || []),
                      ...featureDetails.relatedFeatures,
                    ]),
                  ],
                  conversationHistory: [
                    ...(g.conversationHistory || []),
                    {
                      timestamp: new Date(),
                      transcript: accumulatedText,
                      insights: analysis.reasoning,
                    },
                  ],
                };
              }
              return g;
            })
          );
        } else {
          // Create new feature group with randomized position to avoid stacking
          const newGroupId = generateId();
          const newGroup: NodeGroup = {
            id: newGroupId,
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

          // Create new capability node
          const newNodeId = generateId();
          const newNode: NodeData = {
            id: newNodeId,
            title: capabilityDetails.title,
            description: capabilityDetails.description,
            groupId: match.matchedGroupId,
            type: 'capability',
            x: 100 + Math.random() * 400,
            y: 100 + Math.random() * 300,
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
      setIsAnalyzing(false);
    }
  }, [transcriptBuffer, groups, processAgentFeedback]);

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

  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    isSupported,
  } = useSpeechRecognition({
    onResult: handleResult,
  });

  const toggleRecording = useCallback(async () => {
    if (isListening) {
      // When stopping, process any remaining transcript in buffer
      if (transcriptBuffer.length > 0) {
        await processAccumulatedTranscript();
      }

      // When stopping, create a new transcript entry if there's any text
      if (currentSessionText.trim()) {
        const newEntry: TranscriptEntry = {
          id: generateId(),
          speaker: 'me',
          text: currentSessionText.trim(),
          timestamp: Date.now(),
        };
        setTranscriptEntries((prev) => [...prev, newEntry]);
        setCurrentSessionText('');
        // Add a newline to full transcript when stopping
        setFullTranscript((prev) => prev + '\n\n');
      }
      stopListening();
    } else {
      // Clear current session when starting new recording (but keep full transcript)
      setCurrentSessionText('');
      startListening();
    }
  }, [
    isListening,
    startListening,
    stopListening,
    currentSessionText,
    transcriptBuffer,
    processAccumulatedTranscript,
  ]);

  // Perform the actual deletion (called directly or after confirmation)
  const performDelete = useCallback(() => {
    if (selectedNodes.length === 0) return;

    setNodes((prev) => prev.filter((node) => !selectedNodes.includes(node.id)));
    setGroups((prev) =>
      prev
        .map((group) => ({
          ...group,
          nodeIds: group.nodeIds.filter((id) => !selectedNodes.includes(id)),
        }))
        .filter((group) => group.nodeIds.length > 0)
    );
    setSelectedNodes([]);
    setDeleteConfirmation({ isOpen: false, featuresToDelete: [] });
  }, [selectedNodes]);

  // Check if deletion would remove features and show confirmation if needed
  const handleDelete = useCallback(() => {
    if (selectedNodes.length === 0) return;

    // Find features (groups) that would be completely deleted
    const featuresToDelete = groups.filter((group) => {
      // Check if all nodes in this group are selected for deletion
      const remainingNodes = group.nodeIds.filter(
        (id) => !selectedNodes.includes(id)
      );
      return remainingNodes.length === 0 && group.nodeIds.length > 0;
    });

    // Also check for empty features that might be selected via their group
    // (features with no capabilities that would be deleted)
    const emptyFeaturesToDelete = groups.filter(
      (group) => group.nodeIds.length === 0
    );

    const allFeaturesToDelete = [...featuresToDelete, ...emptyFeaturesToDelete];

    if (allFeaturesToDelete.length > 0) {
      // Show confirmation modal for feature deletion
      setDeleteConfirmation({
        isOpen: true,
        featuresToDelete: allFeaturesToDelete,
      });
    } else {
      // No features affected, delete capabilities directly
      performDelete();
    }
  }, [selectedNodes, groups, performDelete]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input
      const activeElement = document.activeElement;
      const isInput =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        (activeElement as HTMLElement)?.isContentEditable;

      if (isInput) return;

      if ((e.metaKey || e.ctrlKey) && e.key === 'r') {
        e.preventDefault();
        toggleRecording();
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        handleDelete();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleRecording, handleDelete]);

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

          const response = await generateAgentThoughts(
            fullTranscript,
            agent.role,
            agent.name
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
      setIsPromptDialogOpen(true);
    } catch (error) {
      console.error('Error generating build prompt:', error);
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
          onManualAnalyze={processAccumulatedTranscript}
          hasBufferedTranscript={transcriptBuffer.length > 0}
          isAnalyzing={isAnalyzing}
          isMinimized={!isTranscriptPanelOpen}
          onToggleMinimize={() => setIsTranscriptPanelOpen((prev) => !prev)}
        />

        {/* FAB for Analyze button when transcript is minimized */}
        {!isTranscriptPanelOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className='fixed bottom-28 left-8 z-30'
          >
            <Button
              onClick={processAccumulatedTranscript}
              disabled={transcriptBuffer.length === 0 || isAnalyzing}
              size='lg'
              className='rounded-full shadow-2xl h-14 w-14 p-0 flex items-center justify-center'
              variant={
                transcriptBuffer.length > 0 && !isAnalyzing
                  ? 'default'
                  : 'outline'
              }
            >
              {isAnalyzing ? (
                <Loader2 className='h-6 w-6 animate-spin' />
              ) : (
                <Sparkles className='h-6 w-6' />
              )}
            </Button>
            {transcriptBuffer.length > 0 && !isAnalyzing && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className='absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-popover border border-border rounded-lg px-3 py-2 shadow-lg whitespace-nowrap text-sm pointer-events-none'
              >
                Analyze transcript
              </motion.div>
            )}
          </motion.div>
        )}

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
          onToggleRecording={toggleRecording}
          isTranscriptPanelOpen={isTranscriptPanelOpen}
          onToggleTranscriptPanel={() =>
            setIsTranscriptPanelOpen((prev) => !prev)
          }
          isAgentSidebarOpen={isAgentSidebarOpen}
          codingAgentPanel={
            isPromptDialogOpen ? (
              <CodingAgentPanel
                prompt={buildPrompt}
                isGenerating={!buildPrompt}
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

        <StatusPanel nodes={nodes} />

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
              onClick={performDelete}
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
