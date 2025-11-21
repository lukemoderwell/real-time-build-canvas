'use client';

import { X } from 'lucide-react';
import type { NodeGroup } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface FeatureDetailsPanelProps {
  feature: NodeGroup | null;
  onClose: () => void;
}

export function FeatureDetailsPanel({
  feature,
  onClose,
}: FeatureDetailsPanelProps) {
  if (!feature) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-background border-l border-border shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold truncate">{feature.name}</h2>
          <Badge
            variant="secondary"
            className="mt-1"
            style={{ backgroundColor: `${feature.color}20`, color: feature.color }}
          >
            {feature.nodeIds.length} {feature.nodeIds.length === 1 ? 'capability' : 'capabilities'}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="ml-2 flex-shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 px-4">
        <div className="py-4 space-y-6">
          {/* Summary */}
          {feature.summary && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Summary
              </h3>
              <p className="text-sm leading-relaxed">{feature.summary}</p>
            </div>
          )}

          <Separator />

          {/* User Value */}
          {feature.userValue && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                User Value
              </h3>
              <p className="text-sm leading-relaxed">{feature.userValue}</p>
            </div>
          )}

          {feature.userValue && <Separator />}

          {/* Key Capabilities */}
          {feature.keyCapabilities && feature.keyCapabilities.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Key Capabilities
              </h3>
              <ul className="space-y-2">
                {feature.keyCapabilities.map((capability, idx) => (
                  <li key={idx} className="text-sm flex items-start">
                    <span className="mr-2 text-muted-foreground">•</span>
                    <span>{capability}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {feature.keyCapabilities && feature.keyCapabilities.length > 0 && <Separator />}

          {/* Technical Approach */}
          {feature.technicalApproach && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Technical Approach
              </h3>

              {feature.technicalApproach.options && feature.technicalApproach.options.length > 0 && (
                <div className="mb-3">
                  <h4 className="text-xs font-medium text-muted-foreground mb-2">Options</h4>
                  <ul className="space-y-1">
                    {feature.technicalApproach.options.map((option, idx) => (
                      <li key={idx} className="text-sm flex items-start">
                        <span className="mr-2 text-muted-foreground">•</span>
                        <span>{option}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {feature.technicalApproach.considerations && feature.technicalApproach.considerations.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-2">Considerations</h4>
                  <ul className="space-y-1">
                    {feature.technicalApproach.considerations.map((consideration, idx) => (
                      <li key={idx} className="text-sm flex items-start">
                        <span className="mr-2 text-muted-foreground">•</span>
                        <span>{consideration}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {feature.technicalApproach && <Separator />}

          {/* Open Questions */}
          {feature.openQuestions && feature.openQuestions.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Open Questions
              </h3>
              <ul className="space-y-2">
                {feature.openQuestions.map((question, idx) => (
                  <li key={idx} className="text-sm flex items-start">
                    <span className="mr-2 text-amber-500">?</span>
                    <span>{question}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {feature.openQuestions && feature.openQuestions.length > 0 && <Separator />}

          {/* Related Features */}
          {feature.relatedFeatures && feature.relatedFeatures.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Related Features
              </h3>
              <div className="flex flex-wrap gap-2">
                {feature.relatedFeatures.map((related, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {related}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {feature.relatedFeatures && feature.relatedFeatures.length > 0 && <Separator />}

          {/* Conversation History */}
          {feature.conversationHistory && feature.conversationHistory.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Conversation History
              </h3>
              <div className="space-y-3">
                {feature.conversationHistory.map((entry, idx) => (
                  <div key={idx} className="border border-border rounded-lg p-3 bg-secondary/20">
                    <div className="text-xs text-muted-foreground mb-1">
                      {new Date(entry.timestamp).toLocaleString()}
                    </div>
                    <p className="text-sm mb-2">{entry.transcript}</p>
                    {entry.insights && (
                      <div className="text-xs text-muted-foreground italic border-l-2 border-primary pl-2">
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
    </div>
  );
}
