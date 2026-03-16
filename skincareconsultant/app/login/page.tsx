"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/components/auth/auth-provider"

export default function LoginPage() {
  const router = useRouter()
  const { signIn, signUp } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

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
      router.push("/routine")
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-12">
      <h1 className="text-2xl font-bold text-foreground">
        {isSignUp ? "Create account" : "Sign in"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
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
  )
}
