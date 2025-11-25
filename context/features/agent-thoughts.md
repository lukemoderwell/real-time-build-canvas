# Agent Thoughts System

Four expert agents (Sarah/Designer, Mike/Backend, Alex/Cloud, Steve/Visionary) listen to transcript and generate thoughts.

## How Thoughts Are Generated

`generateAgentThoughts()` in `app/actions.ts` sends transcript to the AI with:
- Agent's role and domain expertise
- Last 5 previous diary entries (to avoid repetition)

The AI returns:
- `message` - Optional public question (max 12 words)
- `thought` - Optional private diary entry (max 35 words)

## Avoiding Duplicate Thoughts

Previous thoughts are passed to the prompt so agents build on ideas rather than repeating them.

## Race Condition Prevention

Multiple triggers can call `processAccumulatedTranscript()` simultaneously (auto-analysis timeout, interval, PTT stop). We use a ref-based guard:

```typescript
const isAnalyzingRef = useRef(false);

const processAccumulatedTranscript = useCallback(async () => {
  if (isAnalyzingRef.current) return; // Prevents race condition
  isAnalyzingRef.current = true;
  setIsAnalyzing(true);

  try {
    // ... processing
  } finally {
    isAnalyzingRef.current = false;
    setIsAnalyzing(false);
  }
}, [...]);
```

State alone isn't sufficient because `setIsAnalyzing(true)` is async and multiple calls can slip through before it updates.
