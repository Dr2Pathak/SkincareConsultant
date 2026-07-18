/**
 * Distributed cache: Upstash Redis (serverless) with in-memory fallback.
 */

import * as memory from "./memory-store"
import { upstashGet, upstashSet, upstashIncr, upstashExpire } from "./upstash-rest"

export function isRedisConfigured(): boolean {
  return (
    typeof process.env.UPSTASH_REDIS_REST_URL === "string" &&
    process.env.UPSTASH_REDIS_REST_URL.length > 0 &&
    typeof process.env.UPSTASH_REDIS_REST_TOKEN === "string" &&
    process.env.UPSTASH_REDIS_REST_TOKEN.length > 0
  )
}

export function cacheBackend(): "redis" | "memory" {
  return isRedisConfigured() ? "redis" : "memory"
}

export async function cacheGet(key: string): Promise<string | null> {
  if (!isRedisConfigured()) return memory.memoryGet(key)
  try {
    return await upstashGet(key)
  } catch (err) {
    console.warn("Redis GET failed, falling back to miss", {
      key: key.slice(0, 40),
      error: err instanceof Error ? err.message : "unknown",
    })
    return null
  }
}

export async function cacheSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  if (!isRedisConfigured()) {
    await memory.memorySet(key, value, ttlSeconds)
    return
  }
  try {
    await upstashSet(key, value, ttlSeconds)
  } catch (err) {
    console.warn("Redis SET failed", {
      key: key.slice(0, 40),
      error: err instanceof Error ? err.message : "unknown",
    })
    await memory.memorySet(key, value, ttlSeconds)
  }
}

export async function cacheIncr(key: string): Promise<number> {
  if (!isRedisConfigured()) return memory.memoryIncr(key)
  try {
    const n = await upstashIncr(key)
    await upstashExpire(key, 86400)
    return n
  } catch {
    return memory.memoryIncr(key)
  }
}

export async function cacheClearForTests(): Promise<void> {
  await memory.memoryClearAll()
}
