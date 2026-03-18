/* eslint-disable no-console */
/**
 * Vercel/CI builds often install with `--omit=dev` / production-only deps.
 * That can omit `husky`, which would otherwise make `npm install` fail during
 * the `prepare` lifecycle script. This script safely no-ops if husky isn't
 * available and only runs when the binary exists.
 */

const fs = require("fs")
const path = require("path")
const { spawnSync } = require("child_process")

const rootDir = __dirname // .../scripts
const binDir = path.join(rootDir, "..", "node_modules", ".bin")
const huskyBin = process.platform === "win32" ? "husky.cmd" : "husky"
const binPath = path.join(binDir, huskyBin)

if (!fs.existsSync(binPath)) {
  console.log("[prepare-husky] husky binary not found; skipping hook install.")
  process.exit(0)
}

try {
  const res = spawnSync(binPath, { stdio: "inherit", shell: false })
  process.exit(res.status ?? 0)
} catch (err) {
  console.warn("[prepare-husky] husky install failed; continuing.", err)
  process.exit(0)
}

