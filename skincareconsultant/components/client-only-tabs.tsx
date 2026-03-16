"use client"

import { useState, useEffect } from "react"

/**
 * Renders children only after mount to avoid Radix Tabs generating different IDs on server vs client (hydration mismatch).
 * Shows a minimal placeholder until then.
 */
export function ClientOnlyTabs({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) {
    return (
      <div className="w-full rounded-lg border border-border bg-muted/20 p-6 min-h-[200px] flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    )
  }
  return <>{children}</>
}
