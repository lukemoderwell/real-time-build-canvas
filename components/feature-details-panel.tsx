'use client';

import { X, Terminal, Trash2, Plus, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { NodeGroup } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useResizable } from '@/hooks/use-resizable';
import { ResizeHandle } from '@/components/resize-handle';

interface FeatureDetailsPanelProps {
  feature: NodeGroup | null;
  onClose: () => void;
  onSendToAgent?: (feature: NodeGroup) => void;
  onDelete?: (feature: NodeGroup) => void;
  onCreateRelatedFeature?: (featureName: string) => void;
  isBuildingPrompt?: boolean;
}

export function FeatureDetailsPanel({
  feature,
  onClose,
  onSendToAgent,
  onDelete,
  onCreateRelatedFeature,
  isBuildingPrompt = false,
}: FeatureDetailsPanelProps) {
  const { width, isResizing, handleMouseDown } = useResizable({
    initialWidth: 384,
    minWidth: 300,
    maxWidth: 600,
    direction: 'left',
    storageKey: 'feature-panel-width',
  });

  return (
    <AnimatePresence>
      {feature && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          style={{ width: `${width}px` }}
          className='fixed right-0 top-0 h-full bg-background border-l border-border shadow-2xl z-50 flex flex-col'
        >
          <ResizeHandle
            direction='left'
            onMouseDown={handleMouseDown}
            isResizing={isResizing}
          />
          {/* Header */}
          <div className='flex items-center justify-between p-4 border-b border-border'>
            <div className='flex-1 min-w-0'>
              <h2 className='text-lg font-semibold truncate'>{feature.name}</h2>
              <Badge
                variant='secondary'
                className='mt-1'
                style={{
                  backgroundColor: `${feature.color}20`,
                  color: feature.color,
                }}
              >
                {feature.nodeIds.length}{' '}
                {feature.nodeIds.length === 1 ? 'capability' : 'capabilities'}
              </Badge>
            </div>
            <div className='flex items-center gap-2 ml-2'>
              {onSendToAgent && (
                <Button
                  onClick={() => onSendToAgent(feature)}
                  size='sm'
                  className='flex items-center gap-2 bg-primary hover:bg-primary/90 text-white'
                  disabled={isBuildingPrompt}
                >
                  {isBuildingPrompt ? (
                    <>
                      <Loader2 className='h-4 w-4 animate-spin' />
                      <span>Building...</span>
                    </>
                  ) : (
                    <>
                      <Terminal className='h-4 w-4' />
                      <span>Build</span>
                    </>
                  )}
                </Button>
              )}
              {onDelete && (
                <Button
                  onClick={() => onDelete(feature)}
                  size='sm'
                  variant='ghost'
                  className='text-destructive hover:text-destructive hover:bg-destructive/10'
                >
                  <Trash2 className='h-4 w-4' />
                </Button>
              )}
              <Button
                variant='ghost'
                size='sm'
                onClick={onClose}
                className='flex-shrink-0'
              >
                <X className='h-4 w-4' />
              </Button>
            </div>
          </div>

          {/* Content */}
          <ScrollArea className='flex-1 min-h-0'>
            <div className='px-4 py-4 space-y-6'>
              {/* Summary */}
              {feature.summary && (
                <div>
                  <h3 className='text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2'>
                    Summary
                  </h3>
                  <p className='text-sm leading-relaxed'>{feature.summary}</p>
                </div>
              )}

              <Separator />

              {/* User Value */}
              {feature.userValue && (
                <div>
                  <h3 className='text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2'>
                    User Value
                  </h3>
                  <p className='text-sm leading-relaxed'>{feature.userValue}</p>
                </div>
              )}

              {feature.userValue && <Separator />}

              {/* Key Capabilities */}
              {feature.keyCapabilities &&
                feature.keyCapabilities.length > 0 && (
                  <div>
                    <h3 className='text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2'>
                      Key Capabilities
                    </h3>
                    <ul className='space-y-2'>
                      {feature.keyCapabilities.map((capability, idx) => (
                        <li key={idx} className='text-sm flex items-start'>
                          <span className='mr-2 text-muted-foreground'>•</span>
                          <span>{capability}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              {feature.keyCapabilities &&
                feature.keyCapabilities.length > 0 && <Separator />}

              {/* Technical Approach */}
              {feature.technicalApproach && (
                <div>
                  <h3 className='text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2'>
                    Technical Approach
                  </h3>

                  {feature.technicalApproach.options &&
                    feature.technicalApproach.options.length > 0 && (
                      <div className='mb-3'>
                        <h4 className='text-xs font-medium text-muted-foreground mb-2'>
                          Options
                        </h4>
                        <ul className='space-y-1'>
                          {feature.technicalApproach.options.map(
                            (option, idx) => (
                              <li
                                key={idx}
                                className='text-sm flex items-start'
                              >
                                <span className='mr-2 text-muted-foreground'>
                                  •
                                </span>
                                <span>{option}</span>
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    )}

                  {feature.technicalApproach.considerations &&
                    feature.technicalApproach.considerations.length > 0 && (
                      <div>
                        <h4 className='text-xs font-medium text-muted-foreground mb-2'>
                          Considerations
                        </h4>
                        <ul className='space-y-1'>
                          {feature.technicalApproach.considerations.map(
                            (consideration, idx) => (
                              <li
                                key={idx}
                                className='text-sm flex items-start'
                              >
                                <span className='mr-2 text-muted-foreground'>
                                  •
                                </span>
                                <span>{consideration}</span>
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    )}
                </div>
              )}

              {feature.technicalApproach && <Separator />}

              {/* Open Questions */}
              {feature.openQuestions && feature.openQuestions.length > 0 && (
                <div>
                  <h3 className='text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2'>
                    Open Questions
                  </h3>
                  <ul className='space-y-2'>
                    {feature.openQuestions.map((question, idx) => (
                      <li key={idx} className='text-sm flex items-start'>
                        <span className='mr-2 text-amber-500'>?</span>
                        <span>{question}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {feature.openQuestions && feature.openQuestions.length > 0 && (
                <Separator />
              )}

              {/* Related Features */}
              {feature.relatedFeatures &&
                feature.relatedFeatures.length > 0 && (
                  <div>
                    <h3 className='text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2'>
                      Related Features
                    </h3>
                    <div className='flex flex-wrap gap-2'>
                      {feature.relatedFeatures.map((related, idx) => (
                        <Badge
                          key={idx}
                          variant='outline'
                          className={`text-xs ${
                            onCreateRelatedFeature
                              ? 'cursor-pointer hover:bg-primary/10 hover:border-primary transition-colors group'
                              : ''
                          }`}
                          onClick={() => onCreateRelatedFeature?.(related)}
                        >
                          {related}
                          {onCreateRelatedFeature && (
                            <Plus className='h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity' />
                          )}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

              {feature.relatedFeatures &&
                feature.relatedFeatures.length > 0 && <Separator />}

              {/* Conversation History */}
              {feature.conversationHistory &&
                feature.conversationHistory.length > 0 && (
                  <div>
                    <h3 className='text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2'>
                      Conversation History
                    </h3>
                    <div className='space-y-3'>
                      {feature.conversationHistory.map((entry, idx) => (
                        <div
                          key={idx}
                          className='border border-border rounded-lg p-3 bg-secondary/20'
                        >
                          <div className='text-xs text-muted-foreground mb-1'>
                            {new Date(entry.timestamp).toLocaleString()}
                          </div>
                          <p className='text-sm mb-2'>{entry.transcript}</p>
                          {entry.insights && (
                            <div className='text-xs text-muted-foreground italic border-l-2 border-primary pl-2'>
                              {entry.insights}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          </ScrollArea>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
