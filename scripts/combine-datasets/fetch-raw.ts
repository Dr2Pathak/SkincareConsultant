/**
 * Ensure raw CSV data is available: download via Kaggle CLI (if installed) or Kaggle REST API.
 */

import * as fs from "fs"
import * as path from "path"
import { execSync } from "child_process"
import { loadConfig, resolveConfigPath } from "./load-config"
const yauzl = require("yauzl")

const KAGGLE_CREDENTIALS = (() => {
  const key =
    process.env.KAGGLE_KEY ||
    process.env.KAGGLE_API_TOKEN ||
    ""
  const username = process.env.KAGGLE_USERNAME || ""
  if (username && key)
    return { username, key }
  const home =
    process.env.USERPROFILE || process.env.HOME || process.env.HOMEPATH || ""
  const kagglePath = path.join(home, ".kaggle", "kaggle.json")
  if (fs.existsSync(kagglePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(kagglePath, "utf-8"))
      const k = data.key || data.KAGGLE_API_TOKEN || ""
      const u = data.username || ""
      if (u && k) return { username: u, key: k }
    } catch {
      console.warn("Failed to load Kaggle credentials from ~/.kaggle/kaggle.json (missing or invalid)")
    }
  }
  return null
})()

/** Allow only safe chars for dataset slug to avoid shell injection. */
function safeSlug(s: string): boolean {
  return /^[a-zA-Z0-9/-]+$/.test(s)
}

/** Check if Kaggle CLI is on PATH. */
function isKaggleCliAvailable(): boolean {
  try {
    if (process.platform === "win32") {
      execSync("where kaggle", { stdio: "pipe" })
    } else {
      execSync("which kaggle", { stdio: "pipe" })
    }
    return true
  } catch {
    return false
  }
}

/**
 * Download a Kaggle dataset zip via REST API and extract to targetDir.
 */
export async function downloadKaggleDatasetViaApi(
  datasetSlug: string,
  targetDir: string
): Promise<void> {
  if (!KAGGLE_CREDENTIALS) {
    throw new Error(
      "Kaggle credentials not found. Set KAGGLE_USERNAME and KAGGLE_KEY, or place kaggle.json in ~/.kaggle/"
    )
  }
  const [owner, dataset] = datasetSlug.split("/")
  if (!owner || !dataset || !safeSlug(datasetSlug)) {
    throw new Error("Invalid dataset slug; expected owner/dataset")
  }
  const url = `https://www.kaggle.com/api/v1/datasets/download/${owner}/${dataset}`
  const auth = Buffer.from(
    `${KAGGLE_CREDENTIALS.username}:${KAGGLE_CREDENTIALS.key}`,
    "utf-8"
  ).toString("base64")
  const res = await fetch(url, {
    headers: { Authorization: `Basic ${auth}` },
    redirect: "follow",
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Kaggle API ${res.status}: ${text.slice(0, 200)}`)
  }
  const buf = Buffer.from(await res.arrayBuffer())
  const zipPath = path.join(targetDir, "dataset.zip")
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true })
  }
  fs.writeFileSync(zipPath, buf)
  const resolvedTarget = path.resolve(targetDir)
  await new Promise<void>((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err: Error | null, zipfile: unknown) => {
      if (err) {
        fs.unlinkSync(zipPath)
        return reject(err)
      }
      const z = zipfile as {
        readEntry: () => void
        on: (ev: string, fn: (entry?: { fileName: string }) => void) => void
        openReadStream: (entry: unknown, cb: (e: Error | null, stream: NodeJS.ReadableStream) => void) => void
        close: () => void
      }
      if (!z) {
        fs.unlinkSync(zipPath)
        return reject(new Error("Failed to open zip"))
      }
      const onError = (e: Error) => {
        z.close()
        try { fs.unlinkSync(zipPath) } catch { /* ignore */ }
        reject(e)
      }
      z.readEntry()
      z.on("entry", (entry?: { fileName: string }) => {
        if (!entry) return
        if (/\/$/.test(entry.fileName)) {
          const dir = path.join(resolvedTarget, entry.fileName)
          const resolvedDir = path.resolve(dir)
          if (!resolvedDir.startsWith(resolvedTarget + path.sep) && resolvedDir !== resolvedTarget) {
            z.readEntry()
            return
          }
          if (!fs.existsSync(resolvedDir)) fs.mkdirSync(resolvedDir, { recursive: true })
          z.readEntry()
          return
        }
        const dest = path.resolve(resolvedTarget, entry.fileName)
        if (!dest.startsWith(resolvedTarget + path.sep) && dest !== resolvedTarget) {
          z.readEntry()
          return
        }
        z.openReadStream(entry, (e: Error | null, readStream: NodeJS.ReadableStream) => {
          if (e) {
            z.close()
            try { fs.unlinkSync(zipPath) } catch { /* ignore */ }
            return reject(e)
          }
          const dir = path.dirname(dest)
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
          const writeStream = fs.createWriteStream(dest)
          writeStream.on("error", onError)
          readStream.pipe(writeStream).on("finish", () => z.readEntry())
        })
      })
      z.on("end", () => {
        z.close()
        try { fs.unlinkSync(zipPath) } catch { /* ignore */ }
        resolve()
      })
    })
  })
}

/**
 * Download a Kaggle dataset into targetDir. Uses CLI if on PATH, else REST API.
 */
async function downloadKaggleDataset(
  datasetSlug: string,
  targetDir: string
): Promise<void> {
  if (!KAGGLE_CREDENTIALS) {
    throw new Error(
      "Kaggle credentials not found. Set KAGGLE_USERNAME and KAGGLE_KEY, or place kaggle.json in ~/.kaggle/"
    )
  }
  if (!safeSlug(datasetSlug)) {
    throw new Error("Invalid dataset slug for Kaggle download")
  }
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true })
  }
  if (isKaggleCliAvailable()) {
    try {
      const execOpts = { stdio: "inherit" as const, shell: true } as unknown as import("child_process").ExecSyncOptions
      execSync(`kaggle datasets download -p "${targetDir}" "${datasetSlug}"`, execOpts)
      const files = fs.readdirSync(targetDir)
      const zip = files.find((f) => f.endsWith(".zip"))
      if (zip) {
        const zipPath = path.join(targetDir, zip)
        if (process.platform === "win32") {
          execSync(
            `powershell -Command "Expand-Archive -Path '${zipPath.replace(/'/g, "''")}' -DestinationPath '${targetDir.replace(/'/g, "''")}' -Force"`,
            execOpts
          )
        } else {
          execSync(`unzip -o "${zipPath}" -d "${targetDir}"`, execOpts)
        }
        fs.unlinkSync(zipPath)
      }
      return
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      throw new Error(`Kaggle download failed for ${datasetSlug}: ${msg}`)
    }
  }
  await downloadKaggleDatasetViaApi(datasetSlug, targetDir)
}

/**
 * Get path to a CSV file in raw dir. Prefer exact filename; else look for first CSV in dataset subfolder.
 */
export function getRawCsvPath(
  rawDir: string,
  preferredFilename: string
): string | null {
  const resolved = resolveConfigPath(rawDir)
  const exact = path.join(resolved, preferredFilename)
  if (fs.existsSync(exact) && fs.statSync(exact).isFile()) return exact
  const byBase = preferredFilename.replace(/\.[^.]+$/, "").toLowerCase()
  const entries = fs.readdirSync(resolved, { withFileTypes: true })
  for (const e of entries) {
    if (e.isFile() && e.name.toLowerCase().endsWith(".csv")) {
      if (e.name.toLowerCase().includes(byBase)) {
        return path.join(resolved, e.name)
      }
    }
    if (e.isDirectory() && e.name.toLowerCase().includes(byBase)) {
      const sub = path.join(resolved, e.name)
      const files = fs.readdirSync(sub)
      const csv = files.find((f) => f.toLowerCase().endsWith(".csv"))
      if (csv) return path.join(sub, csv)
    }
  }
  for (const e of entries) {
    if (e.isDirectory()) {
      const sub = path.join(resolved, e.name)
      const files = fs.readdirSync(sub)
      const csv = files.find((f) => f.toLowerCase().endsWith(".csv"))
      if (csv) return path.join(sub, csv)
    }
  }
  const anyCsv = entries.find(
    (e) => e.isFile() && e.name.toLowerCase().endsWith(".csv")
  )
  return anyCsv ? path.join(resolved, anyCsv.name) : null
}

/**
 * Ensure raw data dir exists and optionally download Kaggle datasets.
 * If skipDownload is true, only ensure dir exists and do not call Kaggle.
 */
export async function ensureRawData(skipDownload = false): Promise<string> {
  const config = loadConfig()
  const rawDir = resolveConfigPath(config.rawDataDir)
  if (!fs.existsSync(rawDir)) {
    fs.mkdirSync(rawDir, { recursive: true })
  }
  if (skipDownload || !config.kaggle) return rawDir

  const { ingredients, cosing, products } = config.kaggle
  if (ingredients) {
    const sub = path.join(rawDir, "amaboh-ingredients")
    if (!fs.existsSync(sub) || fs.readdirSync(sub).length === 0) {
      await downloadKaggleDataset(ingredients, sub)
    }
  }
  if (cosing) {
    const sub = path.join(rawDir, "cosing")
    if (!fs.existsSync(sub) || fs.readdirSync(sub).length === 0) {
      await downloadKaggleDataset(cosing, sub)
    }
  }
  if (products && products.length > 0) {
    for (let i = 0; i < products.length; i++) {
      const sub = path.join(rawDir, `products-${i}`)
      if (!fs.existsSync(sub) || fs.readdirSync(sub).length === 0) {
        await downloadKaggleDataset(products[i], sub)
      }
    }
  }
  return rawDir
}

/**
 * List all CSV paths under raw dir (for product datasets).
 */
export function listRawCsvs(rawDir: string): string[] {
  const resolved = resolveConfigPath(rawDir)
  const out: string[] = []
  function walk(dir: string): void {
    if (!fs.existsSync(dir)) return
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name)
      if (e.isDirectory()) walk(full)
      else if (e.name.toLowerCase().endsWith(".csv")) out.push(full)
    }
  }
  walk(resolved)
  return out
}
