/**
 * Gemini server-only: embeddings (gemini-embedding-001, 3072 dim) and chat.
 */

import { GoogleGenAI } from "@google/genai"

let _ai: GoogleGenAI | null = null

function getGemini(): GoogleGenAI {
  if (_ai) return _ai
  const key = process.env.GEMINI_API_KEY
  if (!key) {
    throw new Error("Missing GEMINI_API_KEY")
  }
  _ai = new GoogleGenAI({ apiKey: key })
  return _ai
}

/** Model for embeddings (3072 dimensions). */
const EMBED_MODEL = "gemini-embedding-001"

/** Generate embedding for one or more texts. Returns array of 3072-dim vectors. */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const ai = getGemini()
  const result = await ai.models.embedContent({
    model: EMBED_MODEL,
    contents: texts,
  })
  const embeddings = result.embeddings
  if (!embeddings?.length) {
    throw new Error("Gemini embedContent returned no embeddings")
  }
  return embeddings.map((e) => (e.values as number[]) ?? [])
}

/** Generate chat completion with system + user message. Uses Gemini 2.5 Flash (2.0 Flash is deprecated). */
export async function generateChatReply(systemPrompt: string, userMessage: string): Promise<string> {
  const ai = getGemini()
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      { role: "user", parts: [{ text: `${systemPrompt}\n\nUser: ${userMessage}` }] },
    ],
  })
  const text = response.text
  return typeof text === "string" ? text : (text ?? "").toString()
}