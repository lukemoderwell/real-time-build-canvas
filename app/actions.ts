"use server"

import { generateText } from "ai"

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
      model: 'openai/gpt-4o-mini',
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
      maxTokens: 2000,
      temperature: 0.3,
    });

    return text.trim();
  } catch (error) {
    console.log('[v0] Error generating build prompt (using fallback):', error);
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

export async function generateNodeTitle(transcript: string): Promise<string> {
  console.log("[v0] Generating title for transcript:", transcript)
  try {
    const { text } = await generateText({
      model: "openai/gpt-4o-mini",
      prompt: `You are an expert product manager assistant in a high-level meeting about building a SaaS application.
      
Your task is to extract the core feature or requirement from the following transcript.
- Ignore conversational filler ("blah blah", "I think", "maybe").
- Focus on concrete software requirements (e.g., "Google Auth", "Stripe Subscription", "Admin Dashboard").
- If the user says "I want to build an app like X for Y", the title should be "X for Y" (e.g., "Airbnb for Horses").
- If the transcript is just noise or not a requirement, return "Note".
- Output ONLY the concise 2-5 word title. No explanations, no punctuation at the end.

Transcript: "${transcript}"

Title:`,
      maxTokens: 60,
      temperature: 0.2,
    })

    const title = text.trim().replace(/['"]/g, "")
    console.log("[v0] Generated title:", title)
    return title
  } catch (error) {
    console.log("[v0] Error generating node title (using fallback):", error)
    // Fallback to first 4 words if AI fails
    return transcript.split(" ").slice(0, 4).join(" ") + (transcript.split(" ").length > 4 ? "..." : "")
  }
}

export async function classifyRequirement(
  text: string,
): Promise<{ isRequirement: boolean; type: "product" | "design" | "technical" | "note" }> {
  try {
    const { text: result } = await generateText({
      model: "openai/gpt-4o-mini",
      prompt: `You are a super intelligent product manager listening to a messy, loose conversation about building a product. Your job is to identify if something important was said, and if so, what TYPE of requirement it is.

Analyze this transcript: "${text}"

CLASSIFICATION RULES:

**PRODUCT** - Business decisions, features, pricing, user needs, workflows, rules:
- Pricing/billing decisions: "twelve ninety-nine a month", "free tier with 100 credits"
- Business logic: "users can only create 3 projects", "pro users get priority support"
- Feature definitions: "users should be able to export to PDF", "we need notifications"
- User flows: "after signup, show them the dashboard", "when they click share..."

**DESIGN** - UI/UX, visual, interaction, user experience:
- Visual requirements: "listings should have full-screen images", "dark mode toggle"
- Layout decisions: "sidebar on the left", "cards in a grid"
- Interaction patterns: "hover to preview", "drag and drop to reorder"
- UX flows: "show loading spinner", "confirmation modal before delete"

**TECHNICAL** - Implementation, architecture, tech stack, infrastructure:
- Tech stack: "build with Next.js", "use Google authentication", "PostgreSQL database"
- Architecture: "make it real-time with websockets", "serverless functions"
- APIs/integrations: "integrate Stripe", "use OpenAI API"
- Infrastructure: "deploy on Vercel", "use Redis for caching"

**NOT A REQUIREMENT** - Don't create nodes for:
- Greetings, filler words, casual chat
- Vague questions without decisions: "what should we do about...?"
- Random thoughts without specificity: "I think maybe..."
- General observations: "that's interesting"

Some statements can be MULTIPLE types (e.g., "Next.js auth with a clean login page" = technical + design)

Respond with ONLY a JSON object (no markdown):
{
  "isRequirement": boolean,
  "type": "product" | "design" | "technical" | "note",
  "reason": "brief explanation"
}

If multiple types apply, pick the PRIMARY one. If not a requirement, use type "note" and set isRequirement to false.

Response:`,
      maxTokens: 100,
      temperature: 0.2,
    })

    let cleanText = result.trim()
    cleanText = cleanText.replace(/```json\s*/g, "").replace(/```\s*/g, "")
    const jsonStart = cleanText.indexOf("{")
    const jsonEnd = cleanText.lastIndexOf("}") + 1
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      cleanText = cleanText.substring(jsonStart, jsonEnd)
    }

    const parsed = JSON.parse(cleanText)
    return {
      isRequirement: parsed.isRequirement,
      type: parsed.type || "note",
    }
  } catch (error) {
    console.log("[v0] Error classifying requirement (using fallback):", error)
    // Fallback: conservative classification
    const lower = text.toLowerCase()
    if (lower.length < 15) return { isRequirement: false, type: "note" }

    // Simple keyword-based fallback
    if (
      lower.includes("price") ||
      lower.includes("cost") ||
      lower.includes("user") ||
      lower.includes("feature") ||
      lower.includes("workflow")
    ) {
      return { isRequirement: true, type: "product" }
    }
    if (
      lower.includes("design") ||
      lower.includes("ui") ||
      lower.includes("look") ||
      lower.includes("button") ||
      lower.includes("page")
    ) {
      return { isRequirement: true, type: "design" }
    }
    if (
      lower.includes("api") ||
      lower.includes("database") ||
      lower.includes("auth") ||
      lower.includes("next") ||
      lower.includes("react")
    ) {
      return { isRequirement: true, type: "technical" }
    }

    return { isRequirement: false, type: "note" }
  }
}

export async function generateAgentThoughts(
  transcript: string,
  agentRole: string,
  agentName: string,
): Promise<{ message: string | null; thought: string | null }> {
  try {
    const roleContext = {
      designer: {
        domain: "UI/UX design, user flows, visual hierarchy, accessibility, interaction patterns, design systems, prototyping",
        messageStyle: "Ask clarifying questions about user needs, visual requirements, or interaction patterns. Challenge vague requirements. Example: 'How should this look on mobile?' or 'Do we want this to feel playful or professional?'",
        thoughtStyle: "Private concerns about design feasibility, user experience implications, visual coherence, or missing specs. Be honest and critical. Example: 'They haven't mentioned mobile at all - this could be a disaster on small screens' or 'Love this direction, reminds me of the Stripe dashboard feel'",
      },
      backend: {
        domain: "APIs, databases, data models, authentication, authorization, security, performance, scalability, integrations, business logic",
        messageStyle: "Ask technical questions about data structure, security, scale, or implementation complexity. Flag potential issues. Example: 'What's the data model for this?' or 'How are we handling authentication here?'",
        thoughtStyle: "Private technical concerns, complexity estimates, security risks, or architectural decisions. Be realistic about challenges. Example: 'This is going to need real-time updates - websockets or polling?' or 'They're underestimating how complex this auth flow will be'",
      },
      cloud: {
        domain: "Infrastructure, deployment, hosting, CI/CD, auth providers (Auth0, Clerk, Supabase), cloud services (AWS, Vercel, Railway), monitoring, DevOps, scaling",
        messageStyle: "Ask about infrastructure needs, auth providers, hosting requirements, or deployment strategy. Example: 'Should we use Clerk or Supabase for auth?' or 'What's our hosting strategy?'",
        thoughtStyle: "Private concerns about infrastructure costs, deployment complexity, service choices, or scaling considerations. Example: 'If they want real-time, we'll need websockets - that rules out static hosting' or 'Vercel would be perfect for this, unless they need long-running tasks'",
      },
      visionary: {
        domain: "Product vision, user experience philosophy, simplicity, quality, innovation, market disruption, design thinking, the 'why' behind features",
        messageStyle: "Challenge the team to think bigger and focus on quality. Ask WHY we're building this and if it's simple enough. Push for excellence. Example: 'Why does the user need this?' or 'Can we make this simpler?' or 'Is this insanely great?'",
        thoughtStyle: "Brutally honest observations about whether we're settling for mediocrity, missing the bigger picture, or adding complexity. Question if this is truly innovative. Example: 'This feels like every other dashboard. Where's the magic?' or 'Finally, something that could actually change how people work' or 'Too many features. We need to cut half of these.'",
      },
    }

    const context = roleContext[agentRole as keyof typeof roleContext]

    const { text } = await generateText({
      model: "openai/gpt-4o-mini",
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
    })

    let cleanText = text.trim()

    // Remove markdown code blocks
    cleanText = cleanText.replace(/```json\s*/g, "").replace(/```\s*/g, "")

    // Find JSON object boundaries
    const jsonStart = cleanText.indexOf("{")
    const jsonEnd = cleanText.lastIndexOf("}") + 1

    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      cleanText = cleanText.substring(jsonStart, jsonEnd)
    }

    const object = JSON.parse(cleanText)

    if (!object.shouldRespond) {
      return { message: null, thought: null }
    }

    return {
      message: object.message || null,
      thought: object.thought || null,
    }
  } catch (error) {
    console.log(`[v0] Error generating thoughts for ${agentName}:`, error)
    return { message: null, thought: null }
  }
}
