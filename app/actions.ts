"use server"

import { generateText } from "ai"

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

export async function generateAgentThoughts(
  transcript: string,
  agentRole: string,
  agentName: string,
): Promise<{ message: string | null; thought: string | null }> {
  try {
    const { text } = await generateText({
      model: "openai/gpt-4o-mini",
      prompt: `You are ${agentName}, an expert ${agentRole} in a high-stakes product planning meeting for a new SaaS application.

Context: The team is brainstorming features. You are listening to the following transcript.

Transcript: "${transcript}"

Instructions:
1. Decide if this transcript is relevant to your domain (${agentRole}).
   - Designer: UI/UX, accessibility, dark mode, user flow, branding.
   - Backend: Database, API, security, performance, data structure.
   - Cloud: Infrastructure, deployment, auth providers, scaling, serverless.
2. Return a valid JSON object with the following structure:
   {
     "shouldRespond": boolean,
     "message": "string or null (max 15 words, public feedback)",
     "thought": "string or null (max 30 words, private diary note)"
   }

If IRRELEVANT, set shouldRespond to false.
If RELEVANT, set shouldRespond to true and provide a message and thought.

Respond ONLY with the JSON object. Do not include markdown formatting.`,
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
