"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, ArrowLeft, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Disclaimer } from "@/components/disclaimer"
import { useAuth } from "@/components/auth/auth-provider"
import { cn } from "@/lib/utils"
import { suggestIngredients, saveOnboardingProfile, USE_MOCK } from "@/lib/data"
import type { SkinType, Concern, ToleranceLevel } from "@/lib/types"

const skinTypes: { value: SkinType; label: string; description: string }[] = [
  { value: "oily", label: "Oily", description: "Excess shine, enlarged pores" },
  { value: "dry", label: "Dry", description: "Tight feeling, flakiness" },
  { value: "combination", label: "Combination", description: "Oily T-zone, dry cheeks" },
  { value: "sensitive", label: "Sensitive", description: "Reacts easily, prone to redness" },
  { value: "acne-prone", label: "Acne-Prone", description: "Frequent breakouts" },
  { value: "rosacea-prone", label: "Rosacea-Prone", description: "Chronic redness, visible vessels" },
]

const concerns: { value: Concern; label: string }[] = [
  { value: "acne", label: "Acne & Breakouts" },
  { value: "pigmentation", label: "Dark Spots & Pigmentation" },
  { value: "anti-aging", label: "Fine Lines & Wrinkles" },
  { value: "barrier-repair", label: "Damaged Barrier" },
  { value: "redness", label: "Redness & Irritation" },
  { value: "hydration", label: "Hydration & Moisture" },
  { value: "texture", label: "Texture & Pores" },
  { value: "dark-circles", label: "Dark Circles" },
]

const toleranceLevels: { value: ToleranceLevel; label: string; description: string }[] = [
  {
    value: "low",
    label: "Low Tolerance",
    description: "Prefer gentle formulas, react easily to actives",
  },
  {
    value: "medium",
    label: "Medium Tolerance",
    description: "Can handle some actives with proper introduction",
  },
  {
    value: "high",
    label: "High Tolerance",
    description: "Experienced with actives, rarely have reactions",
  },
]

const SUGGEST_DEBOUNCE_MS = 300

export default function OnboardingPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [step, setStep] = useState(1)
  const [selectedSkinTypes, setSelectedSkinTypes] = useState<SkinType[]>([])
  const [selectedConcerns, setSelectedConcerns] = useState<Concern[]>([])
  const [avoidInput, setAvoidInput] = useState("")
  const [avoidList, setAvoidList] = useState<string[]>([])
  const [tolerance, setTolerance] = useState<ToleranceLevel>("medium")
  const [avoidSuggestions, setAvoidSuggestions] = useState<string[]>([])
  const [avoidSuggestLoading, setAvoidSuggestLoading] = useState(false)
  const [completeError, setCompleteError] = useState<string | null>(null)
  const [completing, setCompleting] = useState(false)
  const suggestWrapRef = useRef<HTMLDivElement>(null)

  const totalSteps = 4

  const toggleSkinType = (type: SkinType) => {
    setSelectedSkinTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    )
  }

  const toggleConcern = (concern: Concern) => {
    setSelectedConcerns((prev) =>
      prev.includes(concern) ? prev.filter((c) => c !== concern) : [...prev, concern],
    )
  }

  const addAvoidItem = useCallback((raw?: string) => {
    const trimmed = (raw ?? avoidInput).trim()
    if (trimmed && !avoidList.includes(trimmed)) {
      setAvoidList((prev) => [...prev, trimmed])
    }
    setAvoidInput("")
    setAvoidSuggestions([])
  }, [avoidInput, avoidList])

  const pickSuggestion = (s: string) => {
    if (!avoidList.includes(s)) {
      setAvoidList((prev) => [...prev, s])
    }
    setAvoidInput("")
    setAvoidSuggestions([])
  }

  const removeAvoidItem = (item: string) => {
    setAvoidList((prev) => prev.filter((i) => i !== item))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      addAvoidItem()
    }
  }

  useEffect(() => {
    if (step !== 3) return
    const q = avoidInput.trim()
    if (q.length < 2) {
      setAvoidSuggestions([])
      return
    }
    let cancelled = false
    const t = setTimeout(() => {
      setAvoidSuggestLoading(true)
      suggestIngredients(q)
        .then((list) => {
          if (!cancelled) {
            setAvoidSuggestions(list.filter((s) => !avoidList.includes(s)))
          }
        })
        .catch(() => {
          if (!cancelled) setAvoidSuggestions([])
        })
        .finally(() => {
          if (!cancelled) setAvoidSuggestLoading(false)
        })
    }, SUGGEST_DEBOUNCE_MS)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [avoidInput, step, avoidList])

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (suggestWrapRef.current && !suggestWrapRef.current.contains(e.target as Node)) {
        setAvoidSuggestions([])
      }
    }
    document.addEventListener("mousedown", onDocMouseDown)
    return () => document.removeEventListener("mousedown", onDocMouseDown)
  }, [])

  const handleComplete = async () => {
    setCompleteError(null)
    if (!USE_MOCK && !user) {
      router.push(`/login?redirect=${encodeURIComponent("/onboarding")}`)
      return
    }
    setCompleting(true)
    try {
      await saveOnboardingProfile({
        skinTypes: selectedSkinTypes,
        concerns: selectedConcerns,
        avoidList,
        tolerance,
      })
      router.push("/routine")
      router.refresh()
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not save your profile. Try again."
      setCompleteError(msg)
    } finally {
      setCompleting(false)
    }
  }

  const canProceed = () => {
    switch (step) {
      case 1:
        return selectedSkinTypes.length > 0
      case 2:
        return selectedConcerns.length > 0
      case 3:
        return true
      case 4:
        return true
      default:
        return false
    }
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <p className="font-display text-2xl font-semibold tracking-tight text-foreground">Your skin profile</p>
          <div className="barrier-rule mt-3" aria-hidden="true" />
          <div className="mb-2 mt-5 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Step {step} of {totalSteps}
            </span>
            <span>{Math.round((step / totalSteps) * 100)}% complete</span>
          </div>
          <div className="h-2 rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-primary transition-all duration-300"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {step === 1 && (
          <section aria-labelledby="skin-type-heading">
            <h1 id="skin-type-heading" className="font-display text-2xl font-semibold tracking-tight text-foreground">
              What&apos;s your skin type?
            </h1>
            <p className="mt-2 text-muted-foreground">
              Select all that apply. This helps us understand your skin&apos;s baseline.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {skinTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => toggleSkinType(type.value)}
                  className={cn(
                    "flex flex-col items-start rounded-xl border-2 p-4 text-left transition-all",
                    selectedSkinTypes.includes(type.value)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50",
                  )}
                  aria-pressed={selectedSkinTypes.includes(type.value)}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="font-medium text-foreground">{type.label}</span>
                    {selectedSkinTypes.includes(type.value) && (
                      <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                    )}
                  </div>
                  <span className="mt-1 text-sm text-muted-foreground">{type.description}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {step === 2 && (
          <section aria-labelledby="concerns-heading">
            <h1 id="concerns-heading" className="text-2xl font-bold text-foreground">
              What are your skin goals?
            </h1>
            <p className="mt-2 text-muted-foreground">
              Select the concerns you&apos;d like to address with your routine.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {concerns.map((concern) => (
                <button
                  key={concern.value}
                  type="button"
                  onClick={() => toggleConcern(concern.value)}
                  className={cn(
                    "flex items-center justify-between rounded-xl border-2 p-4 text-left transition-all",
                    selectedConcerns.includes(concern.value)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50",
                  )}
                  aria-pressed={selectedConcerns.includes(concern.value)}
                >
                  <span className="font-medium text-foreground">{concern.label}</span>
                  {selectedConcerns.includes(concern.value) && (
                    <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                  )}
                </button>
              ))}
            </div>
          </section>
        )}

        {step === 3 && (
          <section aria-labelledby="avoid-heading">
            <h1 id="avoid-heading" className="text-2xl font-bold text-foreground">
              Ingredients to Avoid
            </h1>
            <p className="mt-2 text-muted-foreground">
              Search common ingredients from our catalog or add your own. This is optional.
            </p>

            <Disclaimer variant="warning" className="mt-4">
              We use this to flag ingredients in product checks. This is not medical advice.
            </Disclaimer>

            <div className="mt-6" ref={suggestWrapRef}>
              <Label htmlFor="avoid-input" className="sr-only">
                Add ingredient to avoid
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="avoid-input"
                    placeholder="Type 2+ characters to search (e.g. retinol)"
                    value={avoidInput}
                    onChange={(e) => setAvoidInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoComplete="off"
                    aria-autocomplete="list"
                    aria-controls="avoid-suggest-list"
                    aria-expanded={avoidSuggestions.length > 0}
                  />
                  {(avoidSuggestLoading || avoidSuggestions.length > 0) && (
                    <ul
                      id="avoid-suggest-list"
                      role="listbox"
                      className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md border border-border bg-popover py-1 text-sm shadow-md"
                    >
                      {avoidSuggestLoading && avoidSuggestions.length === 0 && (
                        <li className="px-3 py-2 text-muted-foreground">Searching…</li>
                      )}
                      {avoidSuggestions.map((s) => (
                        <li key={s} role="option">
                          <button
                            type="button"
                            className="w-full px-3 py-2 text-left hover:bg-accent"
                            onClick={() => pickSuggestion(s)}
                          >
                            {s}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <Button type="button" onClick={() => addAvoidItem()} disabled={!avoidInput.trim()}>
                  Add custom
                </Button>
              </div>

              {avoidList.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {avoidList.map((item) => (
                    <Badge
                      key={item}
                      variant="secondary"
                      className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => removeAvoidItem(item)}
                    >
                      {item}
                      <span className="ml-1" aria-hidden="true">
                        ×
                      </span>
                      <span className="sr-only">Remove {item}</span>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {step === 4 && (
          <section aria-labelledby="tolerance-heading">
            <h1 id="tolerance-heading" className="text-2xl font-bold text-foreground">
              Active Ingredient Tolerance
            </h1>
            <p className="mt-2 text-muted-foreground">
              How well does your skin handle active ingredients like retinol, acids, and vitamin C?
            </p>

            <RadioGroup
              value={tolerance}
              onValueChange={(value) => setTolerance(value as ToleranceLevel)}
              className="mt-6 space-y-3"
            >
              {toleranceLevels.map((level) => (
                <label
                  key={level.value}
                  className={cn(
                    "flex cursor-pointer items-start gap-4 rounded-xl border-2 p-4 transition-all",
                    tolerance === level.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50",
                  )}
                >
                  <RadioGroupItem value={level.value} id={level.value} className="mt-0.5" />
                  <div>
                    <span className="font-medium text-foreground">{level.label}</span>
                    <p className="mt-1 text-sm text-muted-foreground">{level.description}</p>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </section>
        )}

        {completeError && (
          <p className="mt-4 text-sm text-destructive" role="alert">
            {completeError}
          </p>
        )}

        <div className="mt-8 flex items-center justify-between">
          <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={step === 1}>
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Back
          </Button>

          {step < totalSteps ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
              Continue
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
          ) : (
            <Button onClick={() => void handleComplete()} disabled={completing}>
              {completing ? "Saving…" : "Complete Setup"}
              <Check className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
