'use client';

import { useState, useCallback, useEffect } from 'react';
import { CanvasBoard } from '@/components/canvas-board';
import { AgentSidebar } from '@/components/agent-sidebar';
import { TranscriptPanel } from '@/components/transcript-panel';
import { ControlBar } from '@/components/control-bar';
import { StatusPanel } from '@/components/status-panel';
import { FeatureDetailsPanel } from '@/components/feature-details-panel';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
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
  const [transcriptEntries, setTranscriptEntries] = useState<TranscriptEntry[]>(
    []
  );
  const [currentSessionText, setCurrentSessionText] = useState('');
  const [fullTranscript, setFullTranscript] = useState('');
  const [buildPrompt, setBuildPrompt] = useState<string | null>(null);
  const [isPromptDialogOpen, setIsPromptDialogOpen] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);

  // Interval-based processing state
  const [transcriptBuffer, setTranscriptBuffer] = useState<string[]>([]);
  const [processingIntervalMs] = useState(30000); // 30 seconds
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Feature details panel state
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);

  const addAgentThought = useCallback((agentId: string, content: string) => {
    console.log('[v0] Adding agent thought:', agentId, content);
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

  const handleDeleteDiaryEntry = useCallback((agentId: string, entryId: string) => {
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
  }, []);

  const handleCrossOffDiaryEntry = useCallback((agentId: string, entryId: string) => {
    setAgents((prev) =>
      prev.map((agent) => {
        if (agent.id === agentId) {
          const entry = agent.diaryEntries.find((e) => e.id === entryId);
          if (entry) {
            return {
              ...agent,
              diaryEntries: agent.diaryEntries.filter((e) => e.id !== entryId),
              crossedOffEntries: [...agent.crossedOffEntries, entry],
            };
          }
        }
        return agent;
      })
    );
  }, []);

  const triggerAgentFeedback = useCallback((agentId: string, message: string) => {
    setAgents((prev) => {
      const agent = prev.find((a) => a.id === agentId);
      if (!agent || !agent.isEnabled) return prev;

      // If enabled, set active
      return prev.map((a) => (a.id === agentId ? { ...a, isActive: true } : a));
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
  }, []);

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
      console.log('[v0] Processing accumulated transcript:', accumulatedText);

    // Analyze what type of content this is
    const analysis = await analyzeTranscript(
      accumulatedText,
      groups.map((g) => ({ id: g.id, name: g.name, summary: g.summary || '' }))
    );

    console.log('[v0] Analysis result:', analysis);

    if (analysis.type === 'noise' && analysis.confidence > 0.85) {
      // Only skip if it's VERY clearly noise with very high confidence
      console.log('[v0] Skipping - very high confidence noise');
      setTranscriptBuffer([]);
      return;
    }

    // If low confidence or classified as noise but not confidently, try to extract as feature anyway
    if (analysis.type === 'noise' || analysis.confidence < 0.6) {
      console.log('[v0] Low confidence or uncertain noise, attempting feature extraction anyway');
      analysis.type = 'feature';
    }

    if (analysis.type === 'feature') {
      // Extract feature details
      const featureDetails = await extractFeatureDetails(
        accumulatedText,
        transcriptBuffer
      );

      console.log('[v0] Creating/updating feature:', featureDetails.name);

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
        console.log(
          '[v0] Updating existing feature:',
          match.matchedGroupId
        );
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
        // Create new feature group
        console.log('[v0] Creating new feature group');
        const newGroup: NodeGroup = {
          id: generateId(),
          name: featureDetails.name,
          color: `hsl(${Math.random() * 360}, 70%, 60%)`,
          nodeIds: [],
          centroid: { x: 200, y: 200 },
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

        console.log(
          '[v0] Creating capability:',
          capabilityDetails.title,
          'for group:',
          match.matchedGroupId
        );

        // Create new capability node
        const newNode: NodeData = {
          id: generateId(),
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
        console.log(
          '[v0] No matching feature found for capability - treating as new feature'
        );
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
          centroid: { x: 200, y: 200 },
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
    } finally {
      setIsAnalyzing(false);
    }
  }, [transcriptBuffer, groups, processAgentFeedback]);

  const handleResult = useCallback(
    async (text: string, isFinal: boolean) => {
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
    },
    []
  );

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
  }, [isListening, startListening, stopListening, currentSessionText, transcriptBuffer, processAccumulatedTranscript]);

  const handleDelete = useCallback(() => {
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
  }, [selectedNodes]);

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

  // Interval-based transcript processing
  useEffect(() => {
    if (!isListening) return;

    const intervalId = setInterval(() => {
      processAccumulatedTranscript();
    }, processingIntervalMs);

    return () => clearInterval(intervalId);
  }, [isListening, processingIntervalMs, processAccumulatedTranscript]);

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

    setNodes((prev) =>
      prev.map((node) => {
        if (group.nodeIds.includes(node.id)) {
          return { ...node, x: node.x + dx, y: node.y + dy };
        }
        return node;
      })
    );
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
          content: node.content,
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
        {isTranscriptPanelOpen && (
          <TranscriptPanel
            fullTranscript={fullTranscript}
            currentSessionText={currentSessionText}
            isRecording={isListening}
            onManualAnalyze={processAccumulatedTranscript}
            hasBufferedTranscript={transcriptBuffer.length > 0}
            isAnalyzing={isAnalyzing}
          />
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
      />

      {/* Feature Details Panel */}
      <FeatureDetailsPanel
        feature={groups.find((g) => g.id === selectedFeatureId) || null}
        onClose={() => setSelectedFeatureId(null)}
      />

      {/* Build Prompt Dialog */}
      <Dialog open={isPromptDialogOpen} onOpenChange={setIsPromptDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Build Prompt for Coding Agent</DialogTitle>
            <DialogDescription>
              Copy this prompt and hand it off to your coding agent to build the
              selected requirements.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="bg-secondary/30 rounded-lg p-4 border border-border">
              <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed text-foreground">
                {buildPrompt || 'Generating prompt...'}
              </pre>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleCopyPrompt}
              className="flex items-center gap-2"
            >
              {promptCopied ? (
                <>
                  <Check size={16} />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={16} />
                  Copy Prompt
                </>
              )}
            </Button>
            <Button onClick={() => setIsPromptDialogOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
