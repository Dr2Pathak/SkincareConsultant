/**
 * Load products from scripts/out/products.json into Supabase.
 * Run from repo root. Loads env from skincareconsultant/.env.local if present.
 * Example: npm run load-products
 */

import * as fs from "fs"
import * as path from "path"
import { config } from "dotenv"
import { createClient } from "@supabase/supabase-js"

config({ path: path.join(__dirname, "..", "skincareconsultant", ".env.local") })

const outPath = path.join(__dirname, "out", "products.json")

function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
    process.exit(1)
  }

  if (!fs.existsSync(outPath)) {
    console.error("Run npm run combine-datasets first to generate scripts/out/products.json")
    process.exit(1)
  }

  const raw = fs.readFileSync(outPath, "utf-8")
  const products: Array<{
    id: string
    name: string
    brand: string
    inciList: string[]
    category?: string
    description?: string
  }> = JSON.parse(raw)

  const supabase = createClient(url, key)
  const rows = products.map((p) => ({
    id: p.id,
    name: p.name,
    brand: p.brand,
    inci_list: p.inciList,
    category: p.category ?? null,
    description: p.description ?? null,
  }))

  const BATCH = 100
  let done = 0
  const run = async () => {
    for (let i = 0; i < rows.length; i += BATCH) {
      const chunk = rows.slice(i, i + BATCH)
      const { error } = await supabase.from("products").upsert(chunk, { onConflict: "id" })
      if (error) {
        console.error("Upsert error:", error.message)
        process.exit(1)
      }
      done += chunk.length
      console.log(`Upserted ${done}/${rows.length}`)
    }
  }

  run()
    .then(() => console.log("Done."))
    .catch((e) => {
      console.error(e)
      process.exit(1)
    })
}

main()
