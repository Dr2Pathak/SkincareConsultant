/**
 * Build Product[] from raw products (id, name, brand, inciList, category?, description?).
 */

import type { Product } from "../../skincareconsultant/lib/types"
import type { RawProduct } from "./parse-products"
import { toSlug } from "./normalize-inci"

const CATEGORY_KEYWORDS: Record<string, string> = {
  cleanser: "Cleanser",
  serum: "Serum",
  moisturizer: "Moisturizer",
  sunscreen: "Sunscreen",
  spf: "Sunscreen",
  toner: "Toner",
  exfoliant: "Exfoliant",
  treatment: "Treatment",
  oil: "Oil",
  mask: "Mask",
  cream: "Moisturizer",
  gel: "Serum",
}

function inferCategory(name: string, description?: string): string | undefined {
  const text = `${name} ${description || ""}`.toLowerCase()
  for (const [key, cat] of Object.entries(CATEGORY_KEYWORDS)) {
    if (text.includes(key)) return cat
  }
  return undefined
}

/**
 * Generate stable id from name + brand.
 */
function productId(name: string, brand: string, index: number): string {
  const base = toSlug(`${name}-${brand}`)
  return base ? `${base}-${index}` : `product-${index}`
}

/**
 * Build Product[] from raw products; dedupe by (name, brand), assign id and optional category/description.
 */
export function buildProducts(rawList: RawProduct[]): Product[] {
  const seen = new Set<string>()
  const result: Product[] = []
  let index = 0
  for (const r of rawList) {
    const key = `${r.name.toLowerCase().trim()}|${r.brand.toLowerCase().trim()}`
    if (seen.has(key)) continue
    seen.add(key)
    const id = productId(r.name, r.brand, index++)
    const category = r.category || inferCategory(r.name, r.description)
    const description =
      r.description ||
      (r.inciList.length > 0
        ? `Contains ${r.inciList.length} ingredients.`
        : undefined)
    result.push({
      id,
      name: r.name.trim(),
      brand: r.brand.trim(),
      inciList: r.inciList,
      category,
      description,
    })
  }
  return result
}
