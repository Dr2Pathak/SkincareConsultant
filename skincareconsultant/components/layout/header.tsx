"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import type { LucideIcon } from "lucide-react"
import { Menu, X, LogIn, LogOut, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAuth } from "@/components/auth/auth-provider"
import { ThemeToggle } from "@/components/theme-toggle"

const navItems: { href: string; label: string; icon?: LucideIcon }[] = [
  { href: "/routine", label: "Routine" },
  { href: "/routine/calendar", label: "Calendar", icon: Calendar },
  { href: "/product-check", label: "Product Check" },
  { href: "/chat", label: "Chat" },
  { href: "/ingredients", label: "Ingredient Map" },
]

function isNavActive(pathname: string, href: string): boolean {
  if (pathname === href) return true
  if (href === "/routine/calendar") return pathname.startsWith("/routine/calendar")
  return false
}

function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-full border border-primary/30 bg-primary/10",
        className,
      )}
      aria-hidden="true"
    >
      <span className="h-3 w-3 rounded-full bg-primary shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary)_25%,transparent)]" />
    </span>
  )
}

export function Header() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user, loading, signOut } = useAuth()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="page-shell flex h-[4.25rem] items-center justify-between">
        <Link href="/" className="group flex items-center gap-2.5">
          <BrandMark />
          <span className="font-display text-xl font-semibold tracking-tight text-foreground">
            SkinSafe
          </span>
        </Link>

        <nav className="hidden md:flex md:items-center md:gap-1" aria-label="Main navigation">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "inline-flex items-center gap-1.5 border-b-2 px-2.5 py-2 text-sm font-medium transition-colors",
                isNavActive(pathname, item.href)
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
              )}
            >
              {item.icon ? <item.icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden /> : null}
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex md:items-center md:gap-2">
          {!loading && (
            <>
              {user ? (
                <Button variant="ghost" size="sm" onClick={() => signOut()}>
                  <LogOut className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  Sign out
                </Button>
              ) : (
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/login">
                    <LogIn className="mr-1.5 h-4 w-4" aria-hidden="true" />
                    Sign in
                  </Link>
                </Button>
              )}
            </>
          )}
          <ThemeToggle size="icon" />
          <Button variant="ghost" size="sm" asChild>
            <Link href="/onboarding">Profile</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/product-check">Check Product</Link>
          </Button>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-menu"
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
        >
          {mobileMenuOpen ? (
            <X className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Menu className="h-5 w-5" aria-hidden="true" />
          )}
        </Button>
      </div>

      {mobileMenuOpen && (
        <nav
          id="mobile-menu"
          className="border-t border-border bg-background md:hidden"
          aria-label="Mobile navigation"
        >
          <div className="space-y-1 px-4 py-3">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 border-l-2 px-3 py-2.5 text-base font-medium transition-colors",
                  isNavActive(pathname, item.href)
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-transparent text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.icon ? <item.icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden /> : null}
                {item.label}
              </Link>
            ))}
            <div className="flex flex-col gap-2 pt-2">
              <ThemeToggle size="sm" className="self-start" />
              {user ? (
                <Button variant="outline" size="sm" className="w-full" onClick={() => signOut()}>
                  <LogOut className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  Sign out
                </Button>
              ) : (
                <Button variant="outline" size="sm" asChild className="w-full">
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                    <LogIn className="mr-1.5 h-4 w-4" aria-hidden="true" />
                    Sign in
                  </Link>
                </Button>
              )}
              <Button variant="outline" size="sm" asChild className="w-full">
                <Link href="/onboarding">Profile</Link>
              </Button>
              <Button size="sm" asChild className="w-full">
                <Link href="/product-check">Check Product</Link>
              </Button>
            </div>
          </div>
        </nav>
      )}
    </header>
  )
}
