/**
 * Parse CosIng-style CSV (INCI, functions, etc.). Optional pipeline input.
 */

import * as fs from "fs"
import { parse } from "csv-parse/sync"
import { toSlug } from "./normalize-inci"

export interface CosIngRow {
  inci: string
  id: string
  functions: string
}

function getRow(row: Record<string, string>, key: string): string {
  const v = row[key] ?? row[key.toLowerCase()] ?? ""
  return String(v).trim()
}

/**
 * Parse CosIng CSV. Expects at least an INCI-name column; function column optional.
 */
export function parseCosIngCsv(filePath: string): CosIngRow[] {
  if (!fs.existsSync(filePath)) return []
  const content = fs.readFileSync(filePath, "utf-8")
  const rows = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as Record<string, string>[]

  const result: CosIngRow[] = []
  const seen = new Set<string>()

  for (const row of rows) {
    const inci =
      getRow(row, "inci") ||
      getRow(row, "INCI Name") ||
      getRow(row, "name") ||
      getRow(row, "Substance") ||
      ""
    if (!inci) continue
    const id = toSlug(inci)
    if (seen.has(id)) continue
    seen.add(id)
    const functions =
      getRow(row, "functions") ||
      getRow(row, "Function") ||
      getRow(row, "EC/List Number") ||
      ""
    result.push({ inci, id, functions })
  }
  return result
}
