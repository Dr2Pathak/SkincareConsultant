import { cacheGet, cacheSet } from "@/lib/cache/redis"

const CHAT_LIMIT = Number.parseInt(process.env.CHAT_RATE_LIMIT_PER_MIN ?? "30", 10)
const WINDOW_SECONDS = 60

export type RateLimitResult = { allowed: boolean; remaining: number; limit: number }

export async function checkChatRateLimit(userId: string): Promise<RateLimitResult> {
  if (process.env.NODE_ENV === "test") {
    return { allowed: true, remaining: CHAT_LIMIT, limit: CHAT_LIMIT }
  }
  const key = `skinsafe:ratelimit:chat:${userId}`
  const raw = await cacheGet(key)
  const count = raw ? Number.parseInt(raw, 10) : 0
  if (count >= CHAT_LIMIT) {
    return { allowed: false, remaining: 0, limit: CHAT_LIMIT }
  }
  const next = count + 1
  await cacheSet(key, String(next), WINDOW_SECONDS)
  return { allowed: true, remaining: Math.max(0, CHAT_LIMIT - next), limit: CHAT_LIMIT }
}
