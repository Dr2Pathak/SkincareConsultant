/**
 * Parse amaboh skincare ingredient CSV (renude-style columns).
 */

import * as fs from "fs"
import { parse } from "csv-parse/sync"
import { toSlug } from "./normalize-inci"

export interface AmabohIngredient {
  id: string
  name: string
  who_should_avoid: string
  who_is_it_good_for: string
  what_does_it_do: string
  what_is_it: string
  short_description: string
  scientific_name: string
}

const COLUMNS = [
  "name",
  "who_should_avoid",
  "who_is_it_good_for",
  "what_does_it_do",
  "what_is_it",
  "short_description",
  "scientific_name",
] as const

function getRow(row: Record<string, string>, key: string): string {
  const v = row[key] ?? row[key.replace(/_/g, " ")] ?? ""
  return String(v).trim()
}

/**
 * Parse CSV file and return typed AmabohIngredient[].
 */
export function parseAmabohCsv(filePath: string): AmabohIngredient[] {
  if (!fs.existsSync(filePath)) return []
  const content = fs.readFileSync(filePath, "utf-8")
  const rows = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as Record<string, string>[]

  const seen = new Set<string>()
  const result: AmabohIngredient[] = []

  for (const row of rows) {
    const name = getRow(row, "name")
    if (!name) continue
    const id = toSlug(name)
    if (seen.has(id)) continue
    seen.add(id)
    result.push({
      id,
      name,
      who_should_avoid: getRow(row, "who_should_avoid"),
      who_is_it_good_for: getRow(row, "who_is_it_good_for"),
      what_does_it_do: getRow(row, "what_does_it_do"),
      what_is_it: getRow(row, "what_is_it"),
      short_description: getRow(row, "short_description"),
      scientific_name: getRow(row, "scientific_name"),
    })
  }
  return result
}
