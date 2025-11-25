'use server';

import { models } from '@/lib/models';
import { generateText } from 'ai';

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
      prompt: `You are a best-in-class design engineer tasked with building a feature set based on product requirements.

You've been given the following requirements:

${nodesText}

Your job is to write a comprehensive, detailed prompt that a coding agent can use to build exactly what's been specified. The prompt should:

1. Be clear, specific, and actionable
2. Include all technical details needed for implementation
3. Specify the tech stack preferences if mentioned
4. Include UI/UX requirements if specified
5. Include business logic and rules if specified
6. Be formatted in a way that a coding agent can execute immediately
7. Group related requirements logically
8. Include any edge cases or constraints mentioned

Write the prompt as if you're briefing a senior developer. Be thorough but concise. Focus on what needs to be built, not how to build it (let the coding agent figure that out).

Output ONLY the prompt text, no markdown formatting, no explanations.`,
      maxOutputTokens: 2000,
      temperature: 0.3,
    });

    return text.trim();
  } catch (error) {
    console.log('Error generating build prompt (using fallback):', error);
    // Fallback: create a simple structured prompt
    const nodesText = nodes
      .map(
        (node, idx) => `
${idx + 1}. [${node.type.toUpperCase()}] ${node.title}
   ${node.content}`
      )
      .join('\n');

    return `You are a best-in-class design engineer. Build the following requirements:

${nodesText}

Please implement these features with:
- Clean, maintainable code
- Proper error handling
- Responsive design where applicable
- Following best practices for the chosen tech stack`;
  }
}

export async function generateAgentThoughts(
  transcript: string,
  agentRole: string,
  agentName: string
): Promise<{ message: string | null; thought: string | null }> {
  try {
    const roleContext = {
      designer: {
        domain:
          'UI/UX design, user flows, visual hierarchy, accessibility, interaction patterns, design systems, prototyping',
        messageStyle:
          "Ask clarifying questions about user needs, visual requirements, or interaction patterns. Challenge vague requirements. Example: 'How should this look on mobile?' or 'Do we want this to feel playful or professional?'",
        thoughtStyle:
          "Private concerns about design feasibility, user experience implications, visual coherence, or missing specs. Be honest and critical. Example: 'They haven't mentioned mobile at all - this could be a disaster on small screens' or 'Love this direction, reminds me of the Stripe dashboard feel'",
      },
      backend: {
        domain:
          'APIs, databases, data models, authentication, authorization, security, performance, scalability, integrations, business logic',
        messageStyle:
          "Ask technical questions about data structure, security, scale, or implementation complexity. Flag potential issues. Example: 'What's the data model for this?' or 'How are we handling authentication here?'",
        thoughtStyle:
          "Private technical concerns, complexity estimates, security risks, or architectural decisions. Be realistic about challenges. Example: 'This is going to need real-time updates - websockets or polling?' or 'They're underestimating how complex this auth flow will be'",
      },
      cloud: {
        domain:
          'Infrastructure, deployment, hosting, CI/CD, auth providers (Auth0, Clerk, Supabase), cloud services (AWS, Vercel, Railway), monitoring, DevOps, scaling',
        messageStyle:
          "Ask about infrastructure needs, auth providers, hosting requirements, or deployment strategy. Example: 'Should we use Clerk or Supabase for auth?' or 'What's our hosting strategy?'",
        thoughtStyle:
          "Private concerns about infrastructure costs, deployment complexity, service choices, or scaling considerations. Example: 'If they want real-time, we'll need websockets - that rules out static hosting' or 'Vercel would be perfect for this, unless they need long-running tasks'",
      },
      visionary: {
        domain:
          "Product vision, user experience philosophy, simplicity, quality, innovation, market disruption, design thinking, the 'why' behind features",
        messageStyle:
          "Challenge the team to think bigger and focus on quality. Ask WHY we're building this and if it's simple enough. Push for excellence. Example: 'Why does the user need this?' or 'Can we make this simpler?' or 'Is this insanely great?'",
        thoughtStyle:
          "Brutally honest observations about whether we're settling for mediocrity, missing the bigger picture, or adding complexity. Question if this is truly innovative. Example: 'This feels like every other dashboard. Where's the magic?' or 'Finally, something that could actually change how people work' or 'Too many features. We need to cut half of these.'",
      },
    };

    const context = roleContext[agentRole as keyof typeof roleContext];

    if (!context) {
      console.log(`[v0] No role context found for role: ${agentRole}`);
      return { message: null, thought: null };
    }

    const { text } = await generateText({
      model: `openai/${models.small}`,
      prompt: `You are ${agentName}, a ${agentRole} engineer listening to a product brainstorming session.

Domain expertise: ${context.domain}

Someone just said: "${transcript}"

Your response has TWO parts:

1. PUBLIC MESSAGE (optional): ${context.messageStyle}
   - Only respond if this is relevant to your domain
   - Keep it SHORT (max 12 words)
   - Mostly ASK QUESTIONS to clarify requirements
   - Sometimes offer brief insights or flag concerns
   - Sound natural and conversational
   - If not relevant to your domain, don't say anything

2. PRIVATE THOUGHT (optional): ${context.thoughtStyle}
   - Personal reflection for your own diary
   - Can be longer (max 35 words)
   - Be honest, critical, and realistic
   - Include concerns, observations, or excitement
   - Not everything needs a thought - only if you have something meaningful to note

Return ONLY this JSON (no markdown):
{
  "shouldRespond": boolean (true if relevant to your domain),
  "message": "question or brief insight" or null,
  "thought": "honest private reflection" or null
}

Examples of GOOD responses:
- Designer hearing "user dashboard": {"shouldRespond": true, "message": "What's the main action users take here?", "thought": "Dashboard could mean anything. Need to see user flows before I can design anything useful."}
- Backend hearing "auth": {"shouldRespond": true, "message": "Are we doing social login or email/password?", "thought": "Auth is always more complex than they think. Magic links? 2FA? Need to pin this down early."}
- Cloud hearing "deployment": {"shouldRespond": true, "message": "Vercel or self-hosted?", "thought": "If they want WebSockets we can't use Vercel. Need to understand the real-time requirements first."}
- Visionary hearing "admin panel with lots of features": {"shouldRespond": true, "message": "Why do they need all these features?", "thought": "We're building feature soup again. What's the ONE thing users desperately need? Start there."}
- Visionary hearing "landing page": {"shouldRespond": true, "message": "What feeling should users get when they see it?", "thought": "This is our first impression. It needs to be unforgettable. Can't just be another gradient hero section."}

Examples of responses to IGNORE (not your domain):
- Designer hearing "database schema": {"shouldRespond": false, "message": null, "thought": null}
- Backend hearing "color palette": {"shouldRespond": false, "message": null, "thought": null}`,
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

    const object = JSON.parse(cleanText);

    if (!object.shouldRespond) {
      return { message: null, thought: null };
    }

    return {
      message: object.message || null,
      thought: object.thought || null,
    };
  } catch (error) {
    console.log(`[v0] Error generating thoughts for ${agentName}:`, error);
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
