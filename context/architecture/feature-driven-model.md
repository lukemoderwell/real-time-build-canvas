# Feature-Driven Architecture

**Created:** November 21, 2024
**Status:** Implemented

## Overview

Build Canvas uses a hierarchical model where **Groups represent Features** and **Nodes represent Capabilities**. This structure emerged from the insight that product conversations naturally organize into high-level features with specific capabilities underneath.

## The Model

```
Feature Group (e.g., "Real-time Collaboration")
├── Capability Node: "Multiple colored cursors"
├── Capability Node: "Real-time commenting"
└── Capability Node: "Presence indicators"
```

### Groups = Features
Groups are the primary organizational unit. Each group represents a complete product feature.

**What's stored:**
- `name` - Feature title (e.g., "Real-time Collaboration")
- `summary` - 2-3 sentence plain English description
- `userValue` - Why users want this feature
- `keyCapabilities` - List of what it does
- `technicalApproach` - Implementation options and considerations (optional)
- `openQuestions` - Decisions that need to be made
- `relatedFeatures` - Connected features
- `conversationHistory` - All discussions about this feature with timestamps and insights

**Visual:**
- Rendered as dashed border containers on the canvas
- Colored accent for visual distinction
- Clickable to open feature details panel

### Nodes = Capabilities
Nodes are simple, specific requirements that belong to a feature.

**What's stored:**
- `title` - Short name (e.g., "Multiple colored cursors")
- `description` - Brief 1-2 sentence explanation
- `groupId` - Parent feature (required)
- `type` - Always "capability"

**Visual:**
- Small cards inside feature groups
- Show title + brief description
- Colored top border matching parent group

## How It Works

### 1. Speech Input
User speaks naturally about what they want to build:
> "I want real-time collaboration with multiple cursors"

### 2. Analysis
AI determines if this is a:
- **FEATURE** - High-level product feature (creates/updates group)
- **CAPABILITY** - Specific requirement (creates node in matching group)
- **NOISE** - Not actionable (skips)

### 3. Feature Detection
If it's a feature:
- Semantic matching checks if it relates to existing features
- Either updates existing feature or creates new group
- Extracts: summary, user value, capabilities, technical notes, open questions

### 4. Capability Detection
If it's a capability:
- AI matches it to the most relevant feature group
- Creates a node with that `groupId`
- Adds to parent feature's conversation history

## Processing Modes

**Interval-based (default):**
- Accumulates transcript for 30 seconds
- Processes batch when interval fires
- Better context, less immediate

**Manual trigger:**
- Click "Analyze" button in transcript panel
- Processes accumulated transcript on demand
- Gives user control over when features are created

## Design Rationale

**Why hierarchical?**
- Mirrors how people think about products (features → details)
- Prevents flat list chaos as projects grow
- Natural grouping for handoff to builders

**Why "back of card" details?**
- Front shows simple title (visual glanceability)
- Back stores rich context (comprehensive for builders)
- Gradual disclosure - complexity hidden until needed

**Why AI-driven grouping?**
- Humans speak naturally, not in structured formats
- Semantic matching better than keyword-based
- Adapts as conversation evolves

## Related

- `ai-prompting/transcript-analysis.md` - How AI analyzes speech
- `features/feature-details-panel.md` - Viewing rich feature info
- `decisions/interval-based-processing.md` - Why 30-second batches
