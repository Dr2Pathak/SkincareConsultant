/**
 * Load pipeline config from config.json (relative to repo root).
 * Paths in config are relative to process.cwd(); resolve them for use in scripts.
 */

import * as fs from "fs"
import * as path from "path"

export interface PipelineConfig {
  rawDataDir: string
  curatedRulesPath: string
  outputDir: string
  kaggle?: {
    ingredients?: string
    cosing?: string
    products?: string[]
  }
}

const CONFIG_FILENAME = "config.json"

/**
 * Find repo root by walking up for config.json or package.json with workspaces.
 */
function findRepoRoot(start: string): string {
  let dir = start
  for (;;) {
    const configPath = path.join(dir, "scripts", "combine-datasets", CONFIG_FILENAME)
    if (fs.existsSync(configPath)) return dir
    const pkgPath = path.join(dir, "package.json")
    if (fs.existsSync(pkgPath)) return dir
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return start
}

const repoRoot = findRepoRoot(process.cwd())

/**
 * Resolve a path from config (relative to repo root).
 * Rejects paths that resolve outside repo root to avoid path traversal.
 */
export function resolveConfigPath(relativePath: string): string {
  const normalized = path.normalize(relativePath)
  const resolved = path.isAbsolute(normalized)
    ? normalized
    : path.resolve(repoRoot, normalized)
  const rootReal = path.resolve(repoRoot).toLowerCase()
  const resolvedReal = path.resolve(resolved).toLowerCase()
  if (!resolvedReal.startsWith(rootReal)) {
    throw new Error(`Path resolves outside repo root: ${relativePath}`)
  }
  return resolved
}

let cached: PipelineConfig | null = null

/**
 * Load config from scripts/combine-datasets/config.json.
 * Paths remain as in file; use resolveConfigPath() when reading/writing files.
 */
export function loadConfig(): PipelineConfig {
  if (cached) return cached
  const configPath = path.join(repoRoot, "scripts", "combine-datasets", CONFIG_FILENAME)
  if (!fs.existsSync(configPath)) {
    throw new Error(`Config not found: ${configPath}. Run from repo root.`)
  }
  const raw = fs.readFileSync(configPath, "utf-8")
  let config: PipelineConfig
  try {
    config = JSON.parse(raw) as PipelineConfig
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(`Invalid config.json: ${msg}`)
  }
  if (!config.rawDataDir || !config.curatedRulesPath || !config.outputDir) {
    throw new Error("Config must include rawDataDir, curatedRulesPath, and outputDir.")
  }
  cached = config
  return config
}
