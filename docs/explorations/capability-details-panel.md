# Capability Details Panel - MVP Build Selection

> **Status:** Exploration (Not Implemented)
> **Date:** 2025-11-25

## Overview

Enable building individual capabilities (MVP approach) instead of entire features by adding a **CapabilityDetailsPanel** that opens when clicking a capability card on the canvas.

**User Goal:** Select specific capabilities to build an MVP version of a feature without building everything at once.

## Design Decisions

- **Single click** on a capability card opens its detail panel (replaces current selection toggle)
- **Shift+click** for multi-selection (preserves batch operation capability)
- **Minimal panel content:** Title, description, parent feature link, Build button
- Panel slides in from the right, similar to FeatureDetailsPanel

## Current State Analysis

| Component           | Current Behavior                                              |
| ------------------- | ------------------------------------------------------------- |
| NodeCard click      | Toggles selection in `selectedNodes` array                    |
| FeatureDetailsPanel | Opens when clicking feature group label                       |
| Build flow          | `generateBuildPrompt` takes array of `{title, content, type}` |

## Implementation Plan

### 1. Create CapabilityDetailsPanel Component

**New file:** `components/capability-details-panel.tsx`

```typescript
interface CapabilityDetailsPanelProps {
  capability: NodeData | null;
  parentFeature: NodeGroup | null;
  onClose: () => void;
  onBuild: (capability: NodeData) => void;
  onViewFeature: (featureId: string) => void;
}
```

**Panel Contents:**

- Header with capability title and close button
- Description section
- Parent feature link (clickable badge that opens FeatureDetailsPanel)
- "Build" button (blue, same style as feature Build button)

**Styling:** Mirror FeatureDetailsPanel - right-side slide-in, 384px width, spring animation

### 2. Add State in page.tsx

```typescript
const [selectedCapabilityId, setSelectedCapabilityId] = useState<string | null>(
  null
);
```

### 3. Update NodeCard Click Behavior

**In page.tsx - modify `handleNodeSelect`:**

```typescript
const handleNodeSelect = (id: string, event?: React.MouseEvent) => {
  if (event?.shiftKey) {
    // Shift+click: multi-select behavior (existing)
    setSelectedNodes((prev) =>
      prev.includes(id) ? prev.filter((n) => n !== id) : [...prev, id]
    );
  } else {
    // Regular click: open capability details panel
    setSelectedCapabilityId(id);
    setSelectedNodes([]); // Clear multi-selection
  }
};
```

**Update CanvasBoard and NodeCard** to pass the event object through `onSelect`.

### 4. Add Build Handler for Single Capability

```typescript
const handleBuildCapability = async (capability: NodeData) => {
  // Update status
  setNodes((prev) =>
    prev.map((n) =>
      n.id === capability.id ? { ...n, status: 'processing' } : n
    )
  );

  // Generate prompt for single capability
  const prompt = await generateBuildPrompt([
    {
      title: capability.title,
      content: capability.description,
      type: capability.type,
    },
  ]);

  setBuildPrompt(prompt);
  setIsPromptDialogOpen(true);

  // Mark as coded after delay
  setTimeout(() => {
    setNodes((prev) =>
      prev.map((n) => (n.id === capability.id ? { ...n, status: 'coded' } : n))
    );
  }, 3000);
};
```

### 5. Render CapabilityDetailsPanel

In page.tsx JSX, after FeatureDetailsPanel:

```tsx
<CapabilityDetailsPanel
  capability={nodes.find((n) => n.id === selectedCapabilityId) || null}
  parentFeature={
    groups.find(
      (g) => selectedCapabilityId && g.nodeIds.includes(selectedCapabilityId)
    ) || null
  }
  onClose={() => setSelectedCapabilityId(null)}
  onBuild={handleBuildCapability}
  onViewFeature={(featureId) => {
    setSelectedCapabilityId(null);
    setSelectedFeatureId(featureId);
  }}
/>
```

## Files to Modify

| File                                      | Changes                                                                     |
| ----------------------------------------- | --------------------------------------------------------------------------- |
| `components/capability-details-panel.tsx` | **NEW** - Create the panel component                                        |
| `app/page.tsx`                            | Add state, update handleNodeSelect, add handleBuildCapability, render panel |
| `components/node-card.tsx`                | Pass event object through onSelect callback                                 |
| `components/canvas-board.tsx`             | Update onNodeSelect prop type to include event                              |

## Panel Closing Behavior

- Close when clicking the X button
- Close when clicking outside the panel (canvas click)
- Close when opening FeatureDetailsPanel (via parent feature link)
- Close when opening a different capability

## Visual Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Canvas                                              │ CapabilityDetails │
│                                                      │ ─────────────────  │
│   ┌─────────┐   ┌─────────┐                         │ [Title]            │
│   │ Cap A   │   │ Cap B   │  ← click opens panel    │                    │
│   └─────────┘   └─────────┘                         │ Description...     │
│                                                      │                    │
│   ┌─────────────────────┐                           │ Parent Feature:    │
│   │ Feature Group       │                           │ [Auth System →]    │
│   └─────────────────────┘                           │                    │
│                                                      │ [Build]   [Close]  │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Implementation Order

1. Create `CapabilityDetailsPanel` component (minimal version)
2. Add `selectedCapabilityId` state to page.tsx
3. Update `handleNodeSelect` with shift-key logic
4. Update NodeCard and CanvasBoard to pass event
5. Add `handleBuildCapability` function
6. Render panel in page.tsx
7. Test: click capability → panel opens → Build → CodingAgentPanel shows
