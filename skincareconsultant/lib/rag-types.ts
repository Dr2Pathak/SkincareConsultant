export type RagDocType = "ingredient" | "product" | "guidance" | "faq"

export interface RagMetadata {
  type?: RagDocType
  /** Human-readable name or title, e.g. ingredient or product name. */
  name?: string
  /** Short text chunk used for RAG context. */
  text?: string
  /** Canonical ingredient or product identifier where available. */
  id?: string
  productId?: string
  brand?: string
  /** Tags for concerns/goals this doc relates to (e.g. acne, pigmentation). */
  concernTags?: string[]
  /** Raw metadata passthrough from older ingestions. */
  [key: string]: unknown
}

