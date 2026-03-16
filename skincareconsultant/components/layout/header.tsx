"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { Menu, X, Droplets, LogIn, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAuth } from "@/components/auth/auth-provider"
import { ThemeToggle } from "@/components/theme-toggle"

const navItems = [
  { href: "/routine", label: "Routine" },
  { href: "/product-check", label: "Product Check" },
  { href: "/chat", label: "Chat" },
  { href: "/ingredients", label: "Ingredient Map" },
]

export function Header() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user, loading, signOut } = useAuth()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Droplets className="h-5 w-5 text-primary-foreground" aria-hidden="true" />
          </div>
          <span className="text-lg font-semibold text-foreground">SkinCare Consultant</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex md:items-center md:gap-1" aria-label="Main navigation">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                pathname === item.href
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
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

        {/* Mobile Menu Button */}
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

      {/* Mobile Navigation */}
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
                  "block rounded-md px-3 py-2 text-base font-medium transition-colors",
                  pathname === item.href
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
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
