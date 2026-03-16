/**
 * GET /api/health — reports which backend services are configured (no secrets).
 * Use to verify env vars are set. Features:
 * - supabase: auth, profiles, routines, products
 * - neo4j: knowledge graph (ingredient map), compatibility conflicts, routine-health conflicts
 * - pinecone + gemini: chat (RAG)
 */

import { NextResponse } from "next/server"
import { getEnvHealth } from "@/lib/env"

export async function GET() {
  const health = getEnvHealth()
  return NextResponse.json({
    services: {
      supabase: health.supabase,
      neo4j: health.neo4j,
      pinecone: health.pinecone,
      gemini: health.gemini,
    },
    message: health.message,
  })
}
