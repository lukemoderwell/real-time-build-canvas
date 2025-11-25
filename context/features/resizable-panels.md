# Resizable Panels

All side panels (Transcript, Agent Sidebar, Feature Details) are resizable via drag handles.

## How It Works

- `hooks/use-resizable.ts` - Reusable hook for resize logic
- `components/resize-handle.tsx` - Visual drag handle component

## Panel Configuration

| Panel | Direction | Min | Max | Storage Key |
|-------|-----------|-----|-----|-------------|
| TranscriptPanel | right | 200px | 500px | `transcript-panel-width` |
| AgentSidebar | left | 200px | 500px | `agent-sidebar-width` |
| FeatureDetailsPanel | left | 300px | 600px | `feature-panel-width` |

## Width Persistence

Widths are saved to localStorage and restored on page load. The parent component (`page.tsx`) must also read from localStorage to stay in sync:

```typescript
const [transcriptPanelWidth, setTranscriptPanelWidth] = useState(() => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('transcript-panel-width');
    // ... parse and validate
  }
  return 320; // default
});
```

## Canvas Positioning

The CanvasBoard uses dynamic `marginLeft` based on `transcriptPanelWidth` so the canvas area and its controls properly respond to panel resizing.
