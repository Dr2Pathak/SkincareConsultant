/**
 * Pinecone server-only client. Use in API routes for RAG retrieval and in ingestion script.
 */

import { Pinecone } from "@pinecone-database/pinecone"

let _client: Pinecone | null = null

export function getPineconeClient(): Pinecone {
  if (_client) return _client
  const apiKey = process.env.PINECONE_API_KEY
  if (!apiKey) {
    throw new Error("Missing PINECONE_API_KEY")
  }
  _client = new Pinecone({ apiKey })
  return _client
}

export function getPineconeIndexHost(): string {
  const host = process.env.PINECONE_INDEX_HOST ?? process.env.PINECONE_HOST
  if (!host) {
    throw new Error("Missing PINECONE_INDEX_HOST or PINECONE_HOST")
  }
  return host.replace(/^https?:\/\//, "")
}
