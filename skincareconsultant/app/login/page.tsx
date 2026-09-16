"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/components/auth/auth-provider"

function safeRedirectPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/routine"
  return raw
}

export default function LoginPage() {
  const { signIn, signUp } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [afterLoginPath, setAfterLoginPath] = useState("/routine")

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setAfterLoginPath(safeRedirectPath(params.get("redirect")))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const { error: err } = isSignUp
        ? await signUp(email.trim(), password)
        : await signIn(email.trim(), password)
      if (err) {
        setError(err)
        return
      }
      // Full navigation ensures auth cookies are sent before middleware runs on the target page.
      window.location.assign(afterLoginPath)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page-shell py-12 sm:py-16">
      <div className="mx-auto max-w-md surface-panel p-6 sm:p-8">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
        {isSignUp ? "Create account" : "Sign in"}
      </h1>
      <div className="barrier-rule mt-3" aria-hidden="true" />
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        {isSignUp
          ? "Create an account to save your routines and access them on any device."
          : "Sign in to save and load your skincare routine."}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-foreground">
            Email
          </label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1"
            required
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-foreground">
            Password
          </label>
          <Input
            id="password"
            type="password"
            autoComplete={isSignUp ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1"
            required
            minLength={6}
          />
          {isSignUp && (
            <p className="mt-1 text-xs text-muted-foreground">At least 6 characters</p>
          )}
        </div>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Please wait…" : isSignUp ? "Create account" : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
        <button
          type="button"
          className="font-medium text-primary underline hover:no-underline"
          onClick={() => {
            setIsSignUp(!isSignUp)
            setError(null)
          }}
        >
          {isSignUp ? "Sign in" : "Create account"}
        </button>
      </p>

      <p className="mt-8 text-center">
        <Link href="/routine" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to Routine
        </Link>
      </p>
      </div>
    </div>
  )
}
