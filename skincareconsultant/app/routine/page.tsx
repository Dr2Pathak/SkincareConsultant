"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Sun, Moon, Plus, PackagePlus, Layers, Check, FilePlus2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { RoutineStepEditor, AddStepButton } from "@/components/routine/routine-step-editor"
import { RoutineHealthCard } from "@/components/routine/routine-health"
import { RoutineInsightsCard } from "@/components/routine/routine-insights-card"
import { AddProductDialog, type AddToRoutinePart } from "@/components/routine/add-product-dialog"
import { ClientOnlyTabs } from "@/components/client-only-tabs"
import { useAuth } from "@/components/auth/auth-provider"
import { mockRoutine, mockRoutineHealth } from "@/lib/mock-data"
import { getRoutine, getRoutines, getRoutineHealth, getRoutineInsights, getMockProductsForPicker, searchProducts, saveRoutine, setCurrentRoutine, deleteRoutine, getProduct, USE_MOCK } from "@/lib/data"
import { generateId } from "@/lib/utils"
import type { RoutineStep, RoutineHealth, RoutineInsights, Product, SavedRoutineSummary } from "@/lib/types"

const ROUTINE_NAME_MAX_LENGTH = 64
const DEFAULT_ROUTINE_NAME = "My routine"

export default function RoutinePage() {
  const searchParams = useSearchParams()
  const addProductId = searchParams.get("addProduct")
  const { user } = useAuth()

  const [amSteps, setAmSteps] = useState<RoutineStep[]>(USE_MOCK ? mockRoutine.am : [])
  const [pmSteps, setPmSteps] = useState<RoutineStep[]>(USE_MOCK ? mockRoutine.pm : [])
  const [health, setHealth] = useState<RoutineHealth | null>(USE_MOCK ? mockRoutineHealth : null)
  const [insights, setInsights] = useState<RoutineInsights | null>(null)
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<"ok" | "error" | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [addProductDialogOpen, setAddProductDialogOpen] = useState(false)
  const [addProductInitialId, setAddProductInitialId] = useState<string | null>(null)
  const [currentRoutineId, setCurrentRoutineId] = useState<string | null>(null)
  const [currentRoutineName, setCurrentRoutineName] = useState<string | null>(null)
  const [savedRoutines, setSavedRoutines] = useState<SavedRoutineSummary[]>([])
  const [settingCurrent, setSettingCurrent] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Open "Add product" dialog when landing with ?addProduct=id
  useEffect(() => {
    if (addProductId) {
      setAddProductInitialId(addProductId)
      setAddProductDialogOpen(true)
    }
  }, [addProductId])

  useEffect(() => {
    if (USE_MOCK) return
    let cancelled = false
    setInsightsLoading(true)
    Promise.all([getRoutine(), getRoutineHealth(), getRoutineInsights(), user ? getRoutines() : Promise.resolve([])])
      .then(([routine, h, ins, list]) => {
        if (cancelled) return
        setAmSteps(Array.isArray(routine.am) ? routine.am : [])
        setPmSteps(Array.isArray(routine.pm) ? routine.pm : [])
        setHealth(h)
        setInsights(ins)
        setCurrentRoutineId(routine.id ?? null)
        setCurrentRoutineName(routine.name ?? null)
        setSavedRoutines(Array.isArray(list) ? list : [])
      })
      .finally(() => {
        if (!cancelled) setInsightsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user?.id])

  const products = getMockProductsForPicker()

  const handleSave = async () => {
    if (USE_MOCK) return
    setSaving(true)
    setSaveMessage(null)
    setSaveError(null)
    try {
      const rawName = (currentRoutineName ?? DEFAULT_ROUTINE_NAME).trim()
      const payload = {
        id: currentRoutineId ?? undefined,
        name: rawName || DEFAULT_ROUTINE_NAME,
        am: amSteps,
        pm: pmSteps,
      }
      const result = await saveRoutine(payload)
      if (result?.id && !currentRoutineId) setCurrentRoutineId(result.id)
      setSaveMessage("ok")
      setSaveError(null)
      setTimeout(() => setSaveMessage(null), 3000)
      Promise.all([getRoutine(), getRoutineHealth(), getRoutineInsights(), getRoutines()])
        .then(([r, h, ins, list]) => {
          setHealth(h)
          setInsights(ins)
          setSavedRoutines(list)
          if (r.id) setCurrentRoutineId(r.id)
          if (r.name) setCurrentRoutineName(r.name)
        })
        .catch(() => {})
    } catch (e) {
      setSaveMessage("error")
      setSaveError(e instanceof Error ? e.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  const handleSetCurrentRoutine = async (routineId: string) => {
    if (USE_MOCK || !user) return
    setSettingCurrent(routineId)
    try {
      await setCurrentRoutine(routineId)
      const [routine, h, ins, list] = await Promise.all([getRoutine(), getRoutineHealth(), getRoutineInsights(), getRoutines()])
      setAmSteps(Array.isArray(routine.am) ? routine.am : [])
      setPmSteps(Array.isArray(routine.pm) ? routine.pm : [])
      setHealth(h)
      setInsights(ins)
      setSavedRoutines(list)
      setCurrentRoutineId(routine.id ?? null)
      setCurrentRoutineName(routine.name ?? null)
    } finally {
      setSettingCurrent(null)
    }
  }

  const handleNewRoutine = () => {
    setAmSteps([])
    setPmSteps([])
    setCurrentRoutineId(null)
    setCurrentRoutineName(DEFAULT_ROUTINE_NAME)
  }

  const handleDeleteRoutine = async (routineId: string, name: string) => {
    if (USE_MOCK || !user) return
    if (typeof window === "undefined" || !window.confirm(`Delete routine "${name}"? This cannot be undone.`)) return
    setDeletingId(routineId)
    try {
      await deleteRoutine(routineId)
      const [routine, h, ins, list] = await Promise.all([getRoutine(), getRoutineHealth(), getRoutineInsights(), getRoutines()])
      setAmSteps(Array.isArray(routine.am) ? routine.am : [])
      setPmSteps(Array.isArray(routine.pm) ? routine.pm : [])
      setHealth(h)
      setInsights(ins)
      setSavedRoutines(list)
      setCurrentRoutineId(routine.id ?? null)
      setCurrentRoutineName(routine.name ?? null)
    } finally {
      setDeletingId(null)
    }
  }

  const handleUpdateStep = (steps: RoutineStep[], setSteps: (steps: RoutineStep[]) => void) => {
    return (updatedStep: RoutineStep) => {
      setSteps(steps.map((s) => (s.id === updatedStep.id ? updatedStep : s)))
    }
  }

  const handleDeleteStep = (steps: RoutineStep[], setSteps: (steps: RoutineStep[]) => void) => {
    return (stepId: string) => {
      const newSteps = steps.filter((s) => s.id !== stepId)
      // Reorder remaining steps
      setSteps(newSteps.map((s, index) => ({ ...s, order: index + 1 })))
    }
  }

  const handleAddStep = (
    steps: RoutineStep[],
    setSteps: (steps: RoutineStep[]) => void,
    prefix: string
  ) => {
    return () => {
      const newStep: RoutineStep = {
        id: `${prefix}-${generateId()}`,
        order: steps.length + 1,
        label: "New Step",
      }
      setSteps([...steps, newStep])
    }
  }

  const handleAddProductToRoutine = (product: Product, part: AddToRoutinePart) => {
    const steps = part === "am" ? amSteps : pmSteps
    const setSteps = part === "am" ? setAmSteps : setPmSteps
    const prefix = part === "am" ? "am" : "pm"
    const newStep: RoutineStep = {
      id: `${prefix}-${generateId()}`,
      order: steps.length + 1,
      label: product.name,
      productId: product.id,
      product,
    }
    setSteps([...steps, newStep])
    setAddProductInitialId(null)
    if (typeof window !== "undefined" && window.history.replaceState) {
      window.history.replaceState({}, "", "/routine")
    }
  }

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Your Routine</h1>
            <p className="mt-2 text-muted-foreground">
              Build and manage your AM and PM skincare routines. Track what products you use and when.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setAddProductInitialId(null)
                setAddProductDialogOpen(true)
              }}
              className="gap-2"
            >
              <PackagePlus className="h-4 w-4" aria-hidden="true" />
              Add product
            </Button>
            {!USE_MOCK && (
              <>
              {!user && (
                <span className="text-sm text-muted-foreground">
                  <a href="/login" className="underline hover:text-foreground">Sign in</a> to save your routine
                </span>
              )}
              {user && (
                <>
                  <Button variant="outline" onClick={handleNewRoutine} className="gap-2">
                    <FilePlus2 className="h-4 w-4" aria-hidden="true" />
                    New routine
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? "Saving..." : "Save routine"}
                  </Button>
                </>
              )}
              {saveMessage === "ok" && <span className="text-sm text-success">Saved</span>}
              {saveMessage === "error" && (
                <span className="text-sm text-destructive" role="alert">
                  {saveError ?? "Save failed"}
                </span>
              )}
              </>
            )}
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          {/* Routine Builder - Tabs rendered only after mount to avoid hydration mismatch (Radix IDs) */}
          <div className="space-y-6">
            {!USE_MOCK && user && (
              <div className="space-y-1.5">
                <label htmlFor="routine-name" className="text-sm font-medium text-foreground">
                  Routine name
                </label>
                <Input
                  id="routine-name"
                  type="text"
                  value={currentRoutineName ?? ""}
                  onChange={(e) => setCurrentRoutineName(e.target.value.slice(0, ROUTINE_NAME_MAX_LENGTH) || null)}
                  onBlur={() => {
                    const t = (currentRoutineName ?? "").trim()
                    setCurrentRoutineName(t || null)
                  }}
                  placeholder={DEFAULT_ROUTINE_NAME}
                  maxLength={ROUTINE_NAME_MAX_LENGTH}
                  className="max-w-sm"
                  aria-describedby="routine-name-hint"
                />
                <p id="routine-name-hint" className="text-xs text-muted-foreground">
                  Name this routine to tell it apart in My Routines. Save to apply.
                  {savedRoutines.length > 0 && (
                    <span className="ml-1">
                      If you reuse a name, the list may be harder to scan&mdash;consider using something unique.
                    </span>
                  )}
                </p>
              </div>
            )}
            <ClientOnlyTabs>
            <Tabs defaultValue="am" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="am" className="gap-2">
                  <Sun className="h-4 w-4" aria-hidden="true" />
                  Morning (AM)
                </TabsTrigger>
                <TabsTrigger value="pm" className="gap-2">
                  <Moon className="h-4 w-4" aria-hidden="true" />
                  Evening (PM)
                </TabsTrigger>
              </TabsList>

              <TabsContent value="am" className="space-y-3">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-foreground">
                    Morning Routine
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      ({amSteps.length} steps)
                    </span>
                  </h2>
                </div>

                {amSteps.length === 0 ? (
                  <div className="rounded-xl border-2 border-dashed border-border p-8 text-center">
                    <Sun className="mx-auto h-12 w-12 text-muted-foreground/50" aria-hidden="true" />
                    <h3 className="mt-4 text-lg font-medium text-foreground">No morning steps yet</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Start building your AM routine by adding your first step.
                    </p>
                    <Button className="mt-4" onClick={handleAddStep(amSteps, setAmSteps, "am")}>
                      <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                      Add First Step
                    </Button>
                  </div>
                ) : (
                  <>
                    {amSteps.map((step) => (
                      <RoutineStepEditor
                        key={step.id}
                        step={step}
                        products={products}
                        searchProducts={USE_MOCK ? undefined : searchProducts}
                        onUpdate={handleUpdateStep(amSteps, setAmSteps)}
                        onDelete={handleDeleteStep(amSteps, setAmSteps)}
                      />
                    ))}
                    <AddStepButton onAdd={handleAddStep(amSteps, setAmSteps, "am")} />
                  </>
                )}
              </TabsContent>

              <TabsContent value="pm" className="space-y-3">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-foreground">
                    Evening Routine
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      ({pmSteps.length} steps)
                    </span>
                  </h2>
                </div>

                {pmSteps.length === 0 ? (
                  <div className="rounded-xl border-2 border-dashed border-border p-8 text-center">
                    <Moon className="mx-auto h-12 w-12 text-muted-foreground/50" aria-hidden="true" />
                    <h3 className="mt-4 text-lg font-medium text-foreground">No evening steps yet</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Start building your PM routine by adding your first step.
                    </p>
                    <Button className="mt-4" onClick={handleAddStep(pmSteps, setPmSteps, "pm")}>
                      <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                      Add First Step
                    </Button>
                  </div>
                ) : (
                  <>
                    {pmSteps.map((step) => (
                      <RoutineStepEditor
                        key={step.id}
                        step={step}
                        products={products}
                        searchProducts={USE_MOCK ? undefined : searchProducts}
                        onUpdate={handleUpdateStep(pmSteps, setPmSteps)}
                        onDelete={handleDeleteStep(pmSteps, setPmSteps)}
                      />
                    ))}
                    <AddStepButton onAdd={handleAddStep(pmSteps, setPmSteps, "pm")} />
                  </>
                )}
              </TabsContent>
            </Tabs>
            </ClientOnlyTabs>
          </div>

          {/* Sidebar - Routine Health & Ingredient Insights */}
          <aside className="space-y-6">
            {health && <RoutineHealthCard health={health} />}
            {!USE_MOCK && (
              <RoutineInsightsCard
                insights={insights}
                loading={insightsLoading}
                hasRoutineProducts={insights?.hasRoutineProducts}
              />
            )}

            {!USE_MOCK && user && (
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
                  <Layers className="h-4 w-4" aria-hidden="true" />
                  My Routines
                </h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Health, insights, and chat use your current routine.
                </p>
                {savedRoutines.length === 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      No saved routines yet. Build your routine above and save, or start fresh.
                    </p>
                    <Button variant="outline" size="sm" className="w-full gap-2" onClick={handleNewRoutine}>
                      <FilePlus2 className="h-4 w-4" aria-hidden="true" />
                      New routine
                    </Button>
                  </div>
                ) : (
                  <>
                    <ul className="space-y-2" role="list">
                      {savedRoutines.map((r) => (
                        <li
                          key={r.id}
                          className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm"
                        >
                          <span className="font-medium text-foreground truncate min-w-0" title={r.name}>
                            {r.name}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            {r.is_current && (
                              <span className="inline-flex items-center gap-1 rounded bg-primary/15 px-1.5 py-0.5 text-xs font-medium text-primary">
                                <Check className="h-3 w-3" aria-hidden="true" />
                                Current
                              </span>
                            )}
                            {!r.is_current && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => handleSetCurrentRoutine(r.id)}
                                disabled={settingCurrent === r.id}
                              >
                                {settingCurrent === r.id ? "Switching…" : "Use this"}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDeleteRoutine(r.id, r.name)}
                              disabled={deletingId === r.id}
                              aria-label={`Delete ${r.name}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <Button variant="outline" size="sm" className="mt-3 w-full gap-2" onClick={handleNewRoutine}>
                      <FilePlus2 className="h-4 w-4" aria-hidden="true" />
                      New routine
                    </Button>
                  </>
                )}
              </div>
            )}

            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Quick Actions
              </h3>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href="/product-check">Check New Product</a>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href="/ingredients">View Ingredient Map</a>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href="/chat">Ask the Consultant</a>
                </Button>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <AddProductDialog
        open={addProductDialogOpen}
        onClose={() => {
          setAddProductDialogOpen(false)
          setAddProductInitialId(null)
          if (typeof window !== "undefined" && window.history.replaceState && addProductId) {
            window.history.replaceState({}, "", "/routine")
          }
        }}
        initialProductId={addProductInitialId}
        getProduct={getProduct}
        searchProducts={searchProducts}
        onAdd={handleAddProductToRoutine}
      />
    </div>
  )
}
