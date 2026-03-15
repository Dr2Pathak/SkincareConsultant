/**
 * Parse product CSVs (name, brand, ingredients string) and normalize inciList.
 */

import * as fs from "fs"
import { parse } from "csv-parse/sync"
import { normalizeInci, toSlug } from "./normalize-inci"

export interface RawProduct {
  name: string
  brand: string
  inciList: string[]
  category?: string
  description?: string
}

function getRow(row: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    const v = row[key] ?? row[key.toLowerCase()] ?? row[key.replace(/_/g, " ")] ?? ""
    if (String(v).trim()) return String(v).trim()
  }
  return ""
}

/**
 * Extract INCI-like list from a cell that may contain narrative + comma-separated ingredients.
 * Prefer the line with the most commas (likely the INCI list); fallback to full string split.
 */
function extractInciLine(ingredientsStr: string): string {
  const trimmed = ingredientsStr.trim()
  if (!trimmed) return ""
  const lines = trimmed.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
  if (lines.length === 0) return trimmed
  let best = lines[0]
  let maxCommas = (lines[0].match(/,/g) || []).length
  for (let i = 1; i < lines.length; i++) {
    const n = (lines[i].match(/,/g) || []).length
    if (n > maxCommas && lines[i].length > 20) {
      maxCommas = n
      best = lines[i]
    }
  }
  return best
}

/**
 * Parse a single product CSV. Tries common column names for name, brand, ingredients.
 */
export function parseProductCsv(
  filePath: string,
  aliasMap: Record<string, string>
): RawProduct[] {
  if (!fs.existsSync(filePath)) return []
  const content = fs.readFileSync(filePath, "utf-8")
  // relax_quotes: tolerate malformed CSV from Kaggle; downstream validation/spot-checks recommended
  const rows = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
    relax_quotes: true,
    quote: '"',
  }) as Record<string, string>[]

  const result: RawProduct[] = []
  for (const row of rows) {
    const name = getRow(
      row,
      "name",
      "product",
      "product_name",
      "cosmetic_name",
      "Name"
    )
    const brand = getRow(row, "brand", "Brand", "brand_name")
    const ingredientsStr = getRow(
      row,
      "ingredients",
      "Ingredients",
      "inci",
      "ingredient_list"
    )
    if (!name) continue
    const inciSource = ingredientsStr ? extractInciLine(ingredientsStr) : ""
    const inciList = inciSource
      ? inciSource
          .split(/[,;|]/)
          .map((s) => normalizeInci(s.trim(), aliasMap))
          .filter((s) => s.length >= 2)
      : []
    result.push({
      name,
      brand: brand || "Unknown",
      inciList,
      category: getRow(row, "category", "Category", "type") || undefined,
      description: getRow(row, "description", "Description") || undefined,
    })
  }
  return result
}

/**
 * Parse multiple product CSVs and merge (dedupe by name+brand).
 */
export function parseAllProductCsvs(
  filePaths: string[],
  aliasMap: Record<string, string>
): RawProduct[] {
  const byKey = new Map<string, RawProduct>()
  for (const path of filePaths) {
    const list = parseProductCsv(path, aliasMap)
    for (const p of list) {
      const key = `${p.name.toLowerCase()}|${p.brand.toLowerCase()}`
      if (!byKey.has(key)) byKey.set(key, p)
    }
  }
  return Array.from(byKey.values())
}
