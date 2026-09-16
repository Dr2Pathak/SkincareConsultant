import Link from "next/link"

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border/70 bg-card/60">
      <div className="page-shell py-10">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-sm">
            <p className="font-display text-2xl font-semibold tracking-tight text-foreground">SkinSafe</p>
            <div className="barrier-rule mt-3" aria-hidden="true" />
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Guidance for calmer routines — check compatibility before you layer, not after your skin reacts.
            </p>
          </div>

          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm" aria-label="Footer navigation">
            <Link href="/routine" className="text-muted-foreground transition-colors hover:text-foreground">
              Routine
            </Link>
            <Link href="/product-check" className="text-muted-foreground transition-colors hover:text-foreground">
              Product Check
            </Link>
            <Link href="/chat" className="text-muted-foreground transition-colors hover:text-foreground">
              Chat
            </Link>
            <Link href="/ingredients" className="text-muted-foreground transition-colors hover:text-foreground">
              Ingredients
            </Link>
          </nav>
        </div>

        <p className="mt-8 border-t border-border/60 pt-5 text-xs text-muted-foreground">
          Educational guidance only — not medical advice. Patch test new products and talk with a clinician when needed.
        </p>
      </div>
    </footer>
  )
}
