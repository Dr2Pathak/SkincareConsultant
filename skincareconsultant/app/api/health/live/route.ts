/**
 * GET /api/health/live — liveness (process is up).
 */

import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({ status: "alive", timestamp: new Date().toISOString() })
}
