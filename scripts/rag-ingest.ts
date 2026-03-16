/**
 * Ingest RAG chunks from scripts/out/rag-ingredients.json and rag-products.json
 * into Pinecone using Gemini embeddings (gemini-embedding-001, 3072 dim).
 * Run from repo root with env set (or copy skincareconsultant/.env.local and load it):
 *   GEMINI_API_KEY, PINECONE_API_KEY, PINECONE_INDEX_HOST
 * Example: npx tsx scripts/rag-ingest.ts
 */

import * as fs from "fs"
import * as path from "path"
import { config } from "dotenv"
import { GoogleGenAI } from "@google/genai"
import { Pinecone } from "@pinecone-database/pinecone"

// Load env from skincareconsultant/.env.local when run from repo root
config({ path: path.join(__dirname, "..", "skincareconsultant", ".env.local") })

const OUT = path.join(__dirname, "out")
const EMBED_BATCH = 20
const UPSERT_BATCH = 100
const EMBED_MODEL = "gemini-embedding-001"

type RagChunk = { id: string; text: string; metadata?: Record<string, string> }

async function loadChunks(): Promise<RagChunk[]> {
  const ingredientsPath = path.join(OUT, "rag-ingredients.json")
  const productsPath = path.join(OUT, "rag-products.json")
  if (!fs.existsSync(ingredientsPath) || !fs.existsSync(productsPath)) {
    throw new Error("Run npm run combine-datasets first to generate rag-ingredients.json and rag-products.json")
  }
  const ingredients: RagChunk[] = JSON.parse(fs.readFileSync(ingredientsPath, "utf-8"))
  const products: RagChunk[] = JSON.parse(fs.readFileSync(productsPath, "utf-8"))
  return [
    ...ingredients.map((c) => ({ ...c, metadata: { ...c.metadata, type: "ingredient" } })),
    ...products.map((c) => ({ ...c, metadata: { ...c.metadata, type: "product" } })),
  ]
}

async function embedBatch(ai: GoogleGenAI, texts: string[]): Promise<number[][]> {
  const result = await ai.models.embedContent({
    model: EMBED_MODEL,
    contents: texts,
  })
  const embeddings = result.embeddings
  if (!embeddings?.length) throw new Error("Gemini returned no embeddings")
  return embeddings.map((e: { values?: number[] }) => (e.values ?? []) as number[])
}

async function main() {
  const geminiKey = process.env.GEMINI_API_KEY
  const pineconeKey = process.env.PINECONE_API_KEY
  const host = process.env.PINECONE_INDEX_HOST ?? process.env.PINECONE_HOST
  if (!geminiKey || !pineconeKey || !host) {
    console.error("Set GEMINI_API_KEY, PINECONE_API_KEY, and PINECONE_INDEX_HOST (or PINECONE_HOST)")
    process.exit(1)
  }

  const chunks = await loadChunks()
  console.log(`Loaded ${chunks.length} chunks (ingredients + products)`)

  const ai = new GoogleGenAI({ apiKey: geminiKey })
  const pc = new Pinecone({ apiKey: pineconeKey })
  const indexHost = host.replace(/^https?:\/\//, "")
  const index = pc.index({ host: indexHost })

  let embedded = 0
  const records: Array<{ id: string; values: number[]; metadata: Record<string, string> }> = []

  for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
    const batch = chunks.slice(i, i + EMBED_BATCH)
    const texts = batch.map((c) => c.text)
    const vectors = await embedBatch(ai, texts)
    for (let j = 0; j < batch.length; j++) {
      const chunk = batch[j]
      // Preserve all existing metadata fields from the pipeline, but ensure
      // we always have a type and a short text field for RAG context.
      const meta: Record<string, string> = {
        ...(chunk.metadata ?? {}),
        type: chunk.metadata?.type ?? "ingredient",
        text: chunk.text.slice(0, 2000),
      }
      if (chunk.metadata?.name) meta.name = chunk.metadata.name
      if (chunk.metadata?.brand) meta.brand = chunk.metadata.brand
      records.push({ id: chunk.id, values: vectors[j], metadata: meta })
    }
    embedded += batch.length
    console.log(`Embedded ${embedded}/${chunks.length}`)
  }

  for (let i = 0; i < records.length; i += UPSERT_BATCH) {
    const batch = records.slice(i, i + UPSERT_BATCH)
    await index.upsert({ records: batch })
    console.log(`Upserted ${Math.min(i + UPSERT_BATCH, records.length)}/${records.length}`)
  }

  console.log("RAG ingestion done.")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
