/**
 * Persist chat message history per user so it survives navigation and tab close.
 * Uses localStorage keyed by user id (or "anonymous" when not signed in).
 */

import type { ChatMessage } from "./types"

const STORAGE_KEY_PREFIX = "skincare_chat_"
const MAX_MESSAGES = 200

function storageKey(userId: string | undefined): string {
  return `${STORAGE_KEY_PREFIX}${userId ?? "anonymous"}`
}

export interface StoredChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  citation?: string
  basedOnRoutine?: boolean
  timestamp: string
}

function toStored(m: ChatMessage): StoredChatMessage {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    citation: m.citation,
    basedOnRoutine: m.basedOnRoutine,
    timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : String(m.timestamp),
  }
}

function fromStored(m: StoredChatMessage): ChatMessage {
  return {
    ...m,
    timestamp: new Date(m.timestamp),
  }
}

export function loadChatHistory(userId: string | undefined): ChatMessage[] | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredChatMessage[]
    if (!Array.isArray(parsed)) return null
    return parsed.slice(-MAX_MESSAGES).map(fromStored)
  } catch {
    return null
  }
}

export function saveChatHistory(userId: string | undefined, messages: ChatMessage[]): void {
  if (typeof window === "undefined") return
  try {
    const toSave = messages.slice(-MAX_MESSAGES).map(toStored)
    localStorage.setItem(storageKey(userId), JSON.stringify(toSave))
  } catch {
    // ignore quota or parse errors
  }
}

/** Single consistent welcome message so chat doesn't start with random mock messages. */
export const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi! I'm your skincare consultant. I can help you understand your routine, check product compatibility, and answer questions about ingredients. How can I help you today?",
  timestamp: new Date(),
}
