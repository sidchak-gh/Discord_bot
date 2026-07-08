import { GoogleGenerativeAI } from '@google/generative-ai'

export type AITriage = {
  severity: 'P1' | 'P2' | 'P3'
  summary: string
  reasoning: string
}

/**
 * Uses Gemini to triage an incident and assign P1/P2/P3 severity.
 * Returns default P3 on failure.
 */
export async function triageWithGemini(data: {
  title: string
  description: string
  affectedSystem: string
}): Promise<AITriage> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set')
  }
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  const prompt = `You are an on-call incident triage system for a software engineering team.

Given an incident report, respond with ONLY a valid JSON object (no markdown, no explanation):
{
  "severity": "P1" | "P2" | "P3",
  "summary": "<one sentence plain-English summary of what is wrong>",
  "reasoning": "<one sentence explaining why you assigned this severity>"
}

Severity guide:
- P1: Production system completely down, data loss risk, or major revenue impact. Requires immediate response.
- P2: Major feature or service is significantly degraded. Many users affected. Urgent but not all-hands.
- P3: Minor issue, degraded non-critical feature, or informational. Can be handled during business hours.

Incident Report:
Title: ${data.title}
Affected System: ${data.affectedSystem || 'Not specified'}
Description: ${data.description}

Respond with ONLY the JSON object. Nothing else.`

  const result = await model.generateContent(prompt)
  const text = result.response.text().trim()

  const cleaned = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim()

  const parsed = JSON.parse(cleaned)

  return {
    severity: ['P1', 'P2', 'P3'].includes(parsed.severity) ? parsed.severity : 'P3',
    summary: typeof parsed.summary === 'string' ? parsed.summary : '',
    reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : '',
  }
}
