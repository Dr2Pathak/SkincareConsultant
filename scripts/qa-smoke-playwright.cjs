const { chromium } = require("playwright")
const fs = require("fs")
const path = require("path")

const BASE = process.env.BASE_URL || "http://localhost:3000"
const OUT = path.join(process.cwd(), ".perf", "qa-screenshots")

const ROUTES = [
  { path: "/", name: "home", expect: /SkinSafe/i },
  { path: "/routine", name: "routine", expect: /routine/i },
  { path: "/routine/calendar", name: "calendar", expect: /calendar|routine|sign in|schedule/i },
  { path: "/product-check", name: "product-check", expect: /Product Check/i },
  { path: "/chat", name: "chat", expect: /Chat/i },
  { path: "/ingredients", name: "ingredients", expect: /Ingredient/i },
  { path: "/login", name: "login", expect: /Sign in|Create account/i },
  { path: "/onboarding", name: "onboarding", expect: /skin|profile|onboard|tolerance|concern/i },
]

const NAV = [
  { label: "Routine", href: "/routine" },
  { label: "Calendar", href: "/routine/calendar" },
  { label: "Product Check", href: "/product-check" },
  { label: "Chat", href: "/chat" },
  { label: "Ingredient Map", href: "/ingredients" },
]

async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const results = []

  for (const viewport of [
    { name: "desktop", width: 1440, height: 900 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      colorScheme: "light",
    })
    const page = await context.newPage()
    const consoleErrors = []
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text())
    })
    page.on("pageerror", (err) => consoleErrors.push(String(err)))

    for (const route of ROUTES) {
      const entry = {
        viewport: viewport.name,
        route: route.path,
        ok: false,
        status: null,
        textMatch: false,
        navOk: null,
        consoleErrors: [],
        error: null,
      }
      try {
        const res = await page.goto(BASE + route.path, { waitUntil: "domcontentloaded", timeout: 45000 })
        entry.status = res ? res.status() : null
        await page.waitForTimeout(600)
        const body = await page.locator("body").innerText()
        entry.textMatch = route.expect.test(body)
        await page.screenshot({
          path: path.join(OUT, `${viewport.name}-${route.name}.png`),
          fullPage: false,
        })

        if (viewport.name === "desktop" && route.path === "/") {
          const navIssues = []
          for (const item of NAV) {
            await page.goto(BASE + "/", { waitUntil: "domcontentloaded" })
            await page.waitForTimeout(300)
            const link = page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: item.label })
            const visible = await link.isVisible().catch(() => false)
            if (!visible) {
              navIssues.push(`missing:${item.label}`)
              continue
            }
            await Promise.all([
              page.waitForURL((url) => {
                const u = url.toString()
                return (
                  u.includes(item.href) ||
                  u.includes(`redirect=${encodeURIComponent(item.href)}`) ||
                  u.includes(`redirect=${item.href.replaceAll("/", "%2F")}`)
                )
              }, { timeout: 15000 }).catch(() => null),
              link.click(),
            ])
            const url = page.url()
            const okDest =
              url.includes(item.href) ||
              url.includes(`redirect=${encodeURIComponent(item.href)}`) ||
              url.includes(`redirect=${item.href.replaceAll("/", "%2F")}`)
            if (!okDest) {
              navIssues.push(`href:${item.label}->${url}`)
            }
          }
          entry.navOk = navIssues.length === 0
          if (navIssues.length) entry.error = navIssues.join("; ")
          await page.goto(BASE + "/", { waitUntil: "domcontentloaded" })
        }

        entry.consoleErrors = consoleErrors.splice(0, consoleErrors.length).filter(
          (t) => !/fonts\.googleapis|favicon|Analytics|vercel/i.test(t),
        )
        entry.ok = entry.status !== null && entry.status < 400 && entry.textMatch && (entry.navOk === null || entry.navOk)
      } catch (e) {
        entry.error = String(e)
        entry.ok = false
      }
      results.push(entry)
      console.log(
        `${entry.ok ? "PASS" : "FAIL"} [${viewport.name}] ${route.path}` +
          (entry.error ? ` — ${entry.error}` : "") +
          (entry.consoleErrors.length ? ` — console:${entry.consoleErrors.length}` : ""),
      )
    }
    await context.close()
  }

  await browser.close()
  const failed = results.filter((r) => !r.ok)
  fs.writeFileSync(path.join(OUT, "smoke-report.json"), JSON.stringify(results, null, 2))
  console.log(`\n${results.length - failed.length}/${results.length} passed`)
  if (failed.length) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
