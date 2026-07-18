/**
 * In-process cache fallback when Redis is not configured (local dev, tests).
 */

type Entry = { value: string; expiresAt: number }

const store = new Map<string, Entry>()

function prune(key: string, entry: Entry | undefined): string | null {
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    store.delete(key)
    return null
  }
  return entry.value
}

export async function memoryGet(key: string): Promise<string | null> {
  return prune(key, store.get(key))
}

export async function memorySet(key: string, value: string, ttlSeconds: number): Promise<void> {
  store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 })
}

export async function memoryIncr(key: string): Promise<number> {
  const raw = await memoryGet(key)
  const next = (raw ? Number.parseInt(raw, 10) : 0) + 1
  await memorySet(key, String(next), 86400)
  return next
}

export async function memoryClearAll(): Promise<void> {
  store.clear()
}
