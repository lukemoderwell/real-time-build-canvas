'use server';

import { models } from '@/lib/models';
import { generateText } from 'ai';
import Tembo from '@tembo-io/sdk';

// Send a build prompt to Tembo
export async function sendToTembo(
  prompt: string,
  agent: string
): Promise<{ success: boolean; taskId?: string; error?: string }> {
  try {
    const apiKey = process.env.TEMBO_API_KEY;
    if (!apiKey) {
      return { success: false, error: 'TEMBO_API_KEY is not configured' };
    }

    const client = new Tembo({ apiKey });
    const task = await client.task.create({
      prompt,
      agent,
      repositories: process.env.TEMBO_REPOSITORY_URL
        ? [process.env.TEMBO_REPOSITORY_URL]
        : undefined,
      queueRightAway: true,
    });

    return { success: true, taskId: task.id };
  } catch (error) {
    console.error('Error sending to Tembo:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function generateBuildPrompt(
  nodes: Array<{ title: string; content: string; type: string }>
): Promise<string> {
  try {
    const nodesText = nodes
      .map(
        (node, idx) => `
${idx + 1}. [${node.type.toUpperCase()}] ${node.title}
   ${node.content}`
      )
      .join('\n');

    const { text } = await generateText({
      model: `openai/${models.medium}`,
      prompt: `You are a pragmatic design engineer focused on building MVPs - minimum viable implementations that prove a concept works.

You've been given the following requirements:

${nodesText}

Your job is to write a focused prompt that a coding agent can use to build an MVP version of this feature. The goal is SPEED - get something working fast so we can see it and iterate.

CRITICAL MVP PRINCIPLES:
- Strip down to the CORE functionality only - what's the simplest version that proves the concept?
- One happy path - skip edge cases, error handling can come later
- Prefer simple over complex - if there's a simpler way to achieve 80% of the value, do that
- Mock expensive integrations - use fake data, stub APIs, skip auth unless critical
- No polish - functional > pretty, we'll refine later
- Defer complexity - note what you're skipping but don't build it

WHAT TO AVOID IN MVP:
- Real-time sync (use polling or manual refresh)
- Complex authentication (use simple auth or skip entirely)
- Elaborate error handling (console.log is fine for now)
- Performance optimization
- Comprehensive validation
- External API integrations (mock them)

The prompt should:
1. Be clear and actionable
2. Explicitly state this is an MVP
3. List what's IN scope (minimal)
4. List what's deliberately OUT of scope (to add later)
5. Focus on demonstrating the feature works

Write the prompt as if briefing a developer who needs to ship something in hours, not days. Be direct. Focus on what to build NOW.

Output ONLY the prompt text, no markdown formatting, no explanations.`,
      maxOutputTokens: 2000,
      temperature: 0.3,
    });

    return text.trim();
  } catch (error) {
    console.error('Error generating build prompt:', error);
    throw error;
  }
}

export async function generateAgentThoughts(
  transcript: string,
  agentRole: string,
  agentName: string,
  previousThoughts: string[] = []
): Promise<{ message: string | null; thought: string | null }> {
  try {
    const roleDomains: Record<string, string> = {
      designer: 'UI/UX design, user flows, visual hierarchy, accessibility, interaction patterns',
      backend: 'APIs, databases, authentication, security, performance, scalability',
      cloud: 'Infrastructure, deployment, CI/CD, cloud services (AWS, Vercel), DevOps',
      visionary: 'Product vision, simplicity, quality, innovation, the "why" behind features',
    };

    const domain = roleDomains[agentRole];
    if (!domain) {
      console.log(`[v0] No domain found for role: ${agentRole}`);
      return { message: null, thought: null };
    }

    // Build context from previous thoughts (last 5 to keep prompt size reasonable)
    const recentThoughts = previousThoughts.slice(-5);
    const thoughtsContext =
      recentThoughts.length > 0
        ? `\n\nYOUR PREVIOUS DIARY ENTRIES (avoid repeating these ideas):
${recentThoughts.map((t, i) => `${i + 1}. "${t}"`).join('\n')}`
        : '';

    const { text } = await generateText({
      model: `openai/${models.small}`,
      prompt: `You are ${agentName}, a ${agentRole} expert in a product brainstorming session.
${thoughtsContext}

Transcript: "${transcript}"

Respond with JSON only:
{"message": "short question or null", "thought": "your reflection or null"}

Rules:
- message: Ask a clarifying question relevant to ${domain} (max 12 words), or null if nothing to ask
- thought: Your honest observation from a ${agentRole} perspective (max 35 words), or null only if truly nothing relevant
- Most transcripts should trigger a thought - you're always thinking about how this affects your domain
- Don't repeat previous thoughts

Example: {"message": "What's the data model?", "thought": "This needs careful API design."}`,
    });

    let cleanText = text.trim();

    // Remove markdown code blocks
    cleanText = cleanText.replace(/```json\s*/g, '').replace(/```\s*/g, '');

    // Find JSON object boundaries
    const jsonStart = cleanText.indexOf('{');
    const jsonEnd = cleanText.lastIndexOf('}') + 1;

    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      cleanText = cleanText.substring(jsonStart, jsonEnd);
    }

    let object;
    try {
      object = JSON.parse(cleanText);
    } catch {
      console.error(`[v0] JSON parse error for ${agentName}. Raw text:`, cleanText);
      return { message: null, thought: null };
    }

    return {
      message: object.message || null,
      thought: object.thought || null,
    };
  } catch (error) {
    console.error(`[v0] Error generating thoughts for ${agentName}:`, error);
    return { message: null, thought: null };
  }
}

// New feature-driven prompting system

export async function analyzeTranscript(
  transcript: string,
  existingGroups: Array<{ id: string; name: string; summary: string }>
): Promise<{
  type: 'feature' | 'capability' | 'noise';
  confidence: number;
  reasoning: string;
}> {
  try {
    const groupsContext =
      existingGroups.length > 0
        ? `\n\nEXISTING FEATURES:\n${existingGroups
            .map((g, i) => `${i + 1}. ${g.name}: ${g.summary}`)
            .join('\n')}`
        : '';

    const { text: result } = await generateText({
      model: `openai/${models.medium}`,
      prompt: `You are analyzing a product conversation to determine if someone is discussing a HIGH-LEVEL FEATURE or a SPECIFIC CAPABILITY.

DEFINITIONS:

**FEATURE** - A complete product feature that contains multiple capabilities:
- Examples: "Real-time collaboration", "User authentication system", "Payment processing", "Admin dashboard", "Project management tools", "Zapier integration"
- Characteristics: Broad, user-facing value proposition, something you'd list on a features page
- When to identify: User says things like "I want to build X" or "We need Y" or "The app should have Z"
- Be INCLUSIVE: If it sounds like a product feature, classify it as FEATURE

**CAPABILITY** - A specific aspect or requirement of a feature:
- Examples: "Multiple colored cursors", "Google OAuth login", "Stripe checkout page", "User search in admin panel", "Export to CSV", "Dark mode toggle"
- Characteristics: Specific, concrete, part of a larger feature, implementation detail
- When to identify: User describes HOW something works or a specific behavior/UI element

**NOISE** - Not a product requirement (be strict here, only classify as noise if truly not useful):
- Greetings: "hello", "hey there"
- Pure filler: "um", "like", "you know"
- Meta conversation: "let me think about this", "that's interesting"
- Vague questions with no decision: "what do you think we should do?"
- If in doubt between FEATURE and NOISE, choose FEATURE
${groupsContext}

TRANSCRIPT: "${transcript}"

Analyze this and determine:
1. Is this describing a high-level FEATURE, a specific CAPABILITY, or just NOISE?
2. How confident are you? (0.0 to 1.0)
3. Why?

Respond with ONLY this JSON (no markdown):
{
  "type": "feature" | "capability" | "noise",
  "confidence": 0.0 to 1.0,
  "reasoning": "brief explanation"
}`,
      maxOutputTokens: 150,
      temperature: 0.2,
    });

    let cleanText = result.trim();
    cleanText = cleanText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    const jsonStart = cleanText.indexOf('{');
    const jsonEnd = cleanText.lastIndexOf('}') + 1;
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      cleanText = cleanText.substring(jsonStart, jsonEnd);
    }

    const parsed = JSON.parse(cleanText);
    return {
      type: parsed.type || 'noise',
      confidence: parsed.confidence || 0.5,
      reasoning: parsed.reasoning || '',
    };
  } catch (error) {
    console.log('[v0] Error analyzing transcript:', error);
    return { type: 'noise', confidence: 0, reasoning: 'Error during analysis' };
  }
}

export async function extractFeatureDetails(
  transcript: string,
  conversationHistory: string[]
): Promise<{
  name: string;
  summary: string;
  userValue: string;
  keyCapabilities: string[];
  technicalApproach?: { options: string[]; considerations: string[] };
  openQuestions: string[];
  relatedFeatures: string[];
}> {
  try {
    const historyContext =
      conversationHistory.length > 0
        ? `\n\nPREVIOUS CONVERSATION:\n${conversationHistory.join('\n')}`
        : '';

    const { text: result } = await generateText({
      model: `openai/${models.medium}`,
      prompt: `You are a product manager extracting feature requirements from a natural conversation.

CURRENT TRANSCRIPT: "${transcript}"${historyContext}

Extract a comprehensive feature specification with the following structure:

1. **NAME** (2-5 words): High-level feature title (e.g., "Real-time Collaboration", "Payment Processing")

2. **SUMMARY** (2-3 sentences, plain English): What IS this feature? Explain like talking to a non-technical person.

3. **USER VALUE** (1-2 sentences): WHY would users want this? What problem does it solve?

4. **KEY CAPABILITIES** (bullet list): WHAT specific things does it need to do? Extract concrete behaviors mentioned or implied.

5. **TECHNICAL APPROACH** (optional, only if technical details were discussed):
   - Options: Implementation approaches mentioned (e.g., "WebSockets for real-time", "OAuth for auth")
   - Considerations: Technical concerns or constraints (e.g., "Must scale to 100+ users", "Handle network failures")

6. **OPEN QUESTIONS** (bullet list): What decisions haven't been made? What seems uncertain?

7. **RELATED FEATURES** (list): What other features were mentioned or implied as dependencies?

Be inferential but conservative - extract what was actually discussed, not what you think they might need.

Respond with ONLY this JSON (no markdown):
{
  "name": "Feature Name",
  "summary": "2-3 sentence description",
  "userValue": "Why users want this",
  "keyCapabilities": ["capability 1", "capability 2"],
  "technicalApproach": {
    "options": ["option 1", "option 2"],
    "considerations": ["consideration 1"]
  },
  "openQuestions": ["question 1", "question 2"],
  "relatedFeatures": ["feature 1", "feature 2"]
}

Note: If no technical details were discussed, omit technicalApproach. Keep arrays empty if nothing to include.`,
      maxOutputTokens: 800,
      temperature: 0.3,
    });

    let cleanText = result.trim();
    cleanText = cleanText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    const jsonStart = cleanText.indexOf('{');
    const jsonEnd = cleanText.lastIndexOf('}') + 1;
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      cleanText = cleanText.substring(jsonStart, jsonEnd);
    }

    const parsed = JSON.parse(cleanText);
    return {
      name: parsed.name || 'Untitled Feature',
      summary: parsed.summary || '',
      userValue: parsed.userValue || '',
      keyCapabilities: parsed.keyCapabilities || [],
      technicalApproach: parsed.technicalApproach || undefined,
      openQuestions: parsed.openQuestions || [],
      relatedFeatures: parsed.relatedFeatures || [],
    };
  } catch (error) {
    console.log('[v0] Error extracting feature details:', error);
    return {
      name: 'Untitled Feature',
      summary: '',
      userValue: '',
      keyCapabilities: [],
      openQuestions: [],
      relatedFeatures: [],
    };
  }
}

export async function findMatchingFeature(
  transcript: string,
  existingGroups: Array<{
    id: string;
    name: string;
    summary: string;
    keyCapabilities: string[];
  }>
): Promise<{
  matchedGroupId: string | null;
  confidence: number;
  reasoning: string;
}> {
  try {
    if (existingGroups.length === 0) {
      return {
        matchedGroupId: null,
        confidence: 1.0,
        reasoning: 'No existing features to match',
      };
    }

    const groupsContext = existingGroups
      .map(
        (g, i) =>
          `${i + 1}. [ID: ${g.id}] ${g.name}\n   Summary: ${
            g.summary
          }\n   Capabilities: ${g.keyCapabilities.join(', ')}`
      )
      .join('\n\n');

    const { text: result } = await generateText({
      model: `openai/${models.medium}`,
      prompt: `You are matching a new capability to an existing feature group.

TRANSCRIPT: "${transcript}"

EXISTING FEATURES:
${groupsContext}

Does this transcript describe something that belongs to one of the existing features above?

Consider:
- Is it a specific capability or aspect of an existing feature?
- Does it relate semantically to the feature's purpose?
- Would it make sense grouped under that feature?

Respond with ONLY this JSON (no markdown):
{
  "matchedGroupId": "the ID of matching feature" or null,
  "confidence": 0.0 to 1.0,
  "reasoning": "why this matches (or doesn't)"
}

If confidence is below 0.7, return null - better to create a new feature than mismatch.`,
      maxOutputTokens: 150,
      temperature: 0.2,
    });

    let cleanText = result.trim();
    cleanText = cleanText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    const jsonStart = cleanText.indexOf('{');
    const jsonEnd = cleanText.lastIndexOf('}') + 1;
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      cleanText = cleanText.substring(jsonStart, jsonEnd);
    }

    const parsed = JSON.parse(cleanText);
    return {
      matchedGroupId: parsed.matchedGroupId || null,
      confidence: parsed.confidence || 0,
      reasoning: parsed.reasoning || '',
    };
  } catch (error) {
    console.log('[v0] Error finding matching feature:', error);
    return {
      matchedGroupId: null,
      confidence: 0,
      reasoning: 'Error during matching',
    };
  }
}

export async function extractCapabilityDetails(
  transcript: string
): Promise<{ title: string; description: string }> {
  try {
    const { text: result } = await generateText({
      model: `openai/${models.small}`,
      prompt: `Extract a capability from this transcript.

TRANSCRIPT: "${transcript}"

A capability is a specific feature requirement or behavior. Extract:

1. **TITLE** (2-5 words): Concise name for this capability (e.g., "Multiple colored cursors", "Real-time commenting")

2. **DESCRIPTION** (1-2 sentences): Brief explanation of what this capability does or how it works

Respond with ONLY this JSON (no markdown):
{
  "title": "Capability Title",
  "description": "Brief description"
}`,
      maxOutputTokens: 150,
      temperature: 0.2,
    });

    let cleanText = result.trim();
    cleanText = cleanText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    const jsonStart = cleanText.indexOf('{');
    const jsonEnd = cleanText.lastIndexOf('}') + 1;
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      cleanText = cleanText.substring(jsonStart, jsonEnd);
    }

    const parsed = JSON.parse(cleanText);
    return {
      title: parsed.title || 'Untitled Capability',
      description: parsed.description || '',
    };
  } catch (error) {
    console.log('[v0] Error extracting capability:', error);
    return {
      title: 'Untitled Capability',
      description: transcript.slice(0, 100),
    };
  }
}
