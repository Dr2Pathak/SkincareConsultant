/**
 * Main pipeline: load config → raw data → parse → build graph + products → write outputs.
 * Run from repo root: npm run combine-datasets
 */

import { loadConfig, resolveConfigPath } from "./load-config"
import { loadCuratedRules } from "./load-curated-rules"
import { ensureRawData, getRawCsvPath, listRawCsvs } from "./fetch-raw"
import { parseAmabohCsv } from "./parse-amaboh"
import { parseCosIngCsv } from "./parse-cosing"
import { parseAllProductCsvs } from "./parse-products"
import { buildAliasMap } from "./normalize-inci"
import { buildGraph } from "./build-graph"
import { buildProducts } from "./build-products"
import { writeOutputs, writeRagOutputs } from "./write-outputs"

const noDownload = process.argv.includes("--no-download")
const dryRun = process.argv.includes("--dry-run")

async function main(): Promise<void> {
  try {
    const config = loadConfig()
    const rawDir = resolveConfigPath(config.rawDataDir)
    const outDir = resolveConfigPath(config.outputDir)

    await ensureRawData(noDownload || dryRun)

  const rules = loadCuratedRules(config.curatedRulesPath)

  // Amaboh ingredients
  const amabohPath =
    getRawCsvPath(config.rawDataDir, "skin-care-product-ingredients") ||
    getRawCsvPath(config.rawDataDir, "ingredients") ||
    getRawCsvPath(config.rawDataDir, "data")
  const amaboh = amabohPath ? parseAmabohCsv(amabohPath) : []
  if (amaboh.length > 0) {
    console.log(`Parsed ${amaboh.length} amaboh ingredients from ${amabohPath}`)
  } else if (!amabohPath) {
    console.warn("No amaboh ingredients CSV found; skipping.")
  }

  // Build alias map from amaboh names
  const aliasMap = buildAliasMap(
    amaboh.map((a) => ({ name: a.name, synonyms: a.scientific_name ? [a.scientific_name] : [] }))
  )

  // CosIng (optional)
  const cosingPath =
    getRawCsvPath(config.rawDataDir, "cosing") ||
    getRawCsvPath(config.rawDataDir, "cosing-ingredients")
  const cosing = cosingPath ? parseCosIngCsv(cosingPath) : []
  if (cosing.length > 0) {
    console.log(`Parsed ${cosing.length} CosIng rows from ${cosingPath}`)
    for (const row of cosing) {
      const k = row.inci.trim().toLowerCase()
      if (k) aliasMap[k] = row.inci.trim()
    }
  } else if (!cosingPath) {
    console.warn("No CosIng CSV found; skipping.")
  }

  // Products
  const productCsvs = listRawCsvs(config.rawDataDir).filter(
    (p) => !p.includes("ingredient") && !p.includes("cosing")
  )
  const rawProducts = parseAllProductCsvs(productCsvs, aliasMap)
  if (rawProducts.length > 0) {
    console.log(`Parsed ${rawProducts.length} products from ${productCsvs.length} CSV(s)`)
  } else if (productCsvs.length === 0) {
    console.warn("No product CSVs found; products output will be empty.")
  }

  const { nodes, edges } = buildGraph(amaboh, cosing, rules)
  const products = buildProducts(rawProducts)

  console.log(`Graph: ${nodes.length} nodes, ${edges.length} edges`)
  console.log(`Products: ${products.length}`)

  if (dryRun) {
    console.log("Dry run - skipping file writes")
    return
  }

  writeOutputs(outDir, products, nodes, edges)

  const ingredientChunks = amaboh.map((a) => ({
    id: a.id,
    text: [a.short_description, a.what_does_it_do, a.what_is_it].filter(Boolean).join(" "),
    metadata: { name: a.name },
  }))
  const productChunks = products.map((p) => ({
    id: p.id,
    text: [p.name, p.brand, p.category, p.description, p.inciList.join(", ")].filter(Boolean).join(" | "),
    metadata: { name: p.name, brand: p.brand },
  }))
  writeRagOutputs(outDir, ingredientChunks, productChunks)

  console.log(`Outputs written to ${outDir}`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const stack = err instanceof Error ? err.stack : undefined
    console.error("Pipeline failed:", msg)
    if (stack) console.error(stack)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error("Pipeline failed:", err instanceof Error ? err.message : err)
  process.exit(1)
})
