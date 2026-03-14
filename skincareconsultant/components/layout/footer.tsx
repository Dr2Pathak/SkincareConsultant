import Link from "next/link"
import { Droplets } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Droplets className="h-5 w-5 text-primary-foreground" aria-hidden="true" />
            </div>
            <span className="text-lg font-semibold text-foreground">SkinCare Consultant</span>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-4 text-sm" aria-label="Footer navigation">
            <Link href="/routine" className="text-muted-foreground hover:text-foreground transition-colors">
              Routine
            </Link>
            <Link href="/product-check" className="text-muted-foreground hover:text-foreground transition-colors">
              Product Check
            </Link>
            <Link href="/chat" className="text-muted-foreground hover:text-foreground transition-colors">
              Chat
            </Link>
            <Link href="/ingredients" className="text-muted-foreground hover:text-foreground transition-colors">
              Ingredients
            </Link>
          </nav>

          <p className="text-xs text-muted-foreground text-center md:text-right max-w-xs">
            For educational purposes only. Not a substitute for professional dermatological advice.
          </p>
        </div>
      </div>
    </footer>
  )
}
