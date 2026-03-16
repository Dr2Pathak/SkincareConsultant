export type HistoryCsvRow = {
  date: string
  routineId: string | null
  routineName: string | null
  changeType: string | null
  changeSummary: string | null
  productsInvolved: string | null
  activesInvolved: string | null
  irritationScore: number | null
  drynessScore: number | null
  breakoutsScore: number | null
  notes: string | null
}

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes("\n") || value.includes('"')) {
    const escaped = value.replace(/"/g, '""')
    return `"${escaped}"`
  }
  return value
}

export function rowsToCsv(rows: HistoryCsvRow[]): string {
  const header = [
    "date",
    "routine_id",
    "routine_name",
    "change_type",
    "change_summary",
    "products_involved",
    "actives_involved",
    "irritation_score",
    "dryness_score",
    "breakouts_score",
    "notes",
  ]
  const lines: string[] = [header.join(",")]

  for (const row of rows) {
    const cols: (string | number | null)[] = [
      row.date,
      row.routineId,
      row.routineName,
      row.changeType,
      row.changeSummary,
      row.productsInvolved,
      row.activesInvolved,
      row.irritationScore,
      row.drynessScore,
      row.breakoutsScore,
      row.notes,
    ]
    const line = cols
      .map((c) => {
        if (c === null || c === undefined) return ""
        if (typeof c === "number") return String(c)
        return escapeCsvField(c)
      })
      .join(",")
    lines.push(line)
  }

  return lines.join("\r\n")
}

