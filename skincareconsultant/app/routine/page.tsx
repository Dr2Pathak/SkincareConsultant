"use client"

import { useState, useEffect } from "react"
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
import {
  getRoutineBootstrap,
  getMockProductsForPicker,
  searchProducts,
  saveRoutine,
  setCurrentRoutine,
  deleteRoutine,
  getProduct,
  downloadRoutineScheduleIcs,
  downloadHistoryCsv,
  USE_MOCK,
} from "@/lib/data"
import { generateId } from "@/lib/utils"
import type {
  RoutineStep,
  RoutineHealth,
  RoutineInsights,
  Product,
  SavedRoutineSummary,
} from "@/lib/types"
import type { RoutineScheduleEvent } from "@/lib/routine-schedule"

const ROUTINE_NAME_MAX_LENGTH = 64
const DEFAULT_ROUTINE_NAME = "My routine"

export default function RoutinePage() {
  const { user } = useAuth()
  const [addProductId, setAddProductId] = useState<string | null>(null)

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
  const [scheduleEvents, setScheduleEvents] = useState<RoutineScheduleEvent[]>([])
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [exportingIcs, setExportingIcs] = useState(false)
  const [exportingCsv, setExportingCsv] = useState(false)

  // Open "Add product" dialog when landing with ?addProduct=id
  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    setAddProductId(params.get("addProduct"))
  }, [])

  useEffect(() => {
    if (addProductId) {
      setAddProductInitialId(addProductId)
      setAddProductDialogOpen(true)
    }
  }, [addProductId])

  useEffect(() => {
    if (USE_MOCK || !user) return
    let cancelled = false
    setInsightsLoading(true)
    setScheduleLoading(true)
    getRoutineBootstrap()
      .then((res) => {
        if (cancelled) return
        setAmSteps(Array.isArray(res.routine.am) ? res.routine.am : [])
        setPmSteps(Array.isArray(res.routine.pm) ? res.routine.pm : [])
        setHealth(res.health)
        setInsights(res.insights)
        setCurrentRoutineId(res.routine.id ?? null)
        setCurrentRoutineName(res.routine.name ?? null)
        setSavedRoutines(Array.isArray(res.savedRoutines) ? res.savedRoutines : [])
        setScheduleEvents((Array.isArray(res.scheduleEvents) ? res.scheduleEvents : []) as RoutineScheduleEvent[])
      })
      .finally(() => {
        if (!cancelled) {
          setInsightsLoading(false)
          setScheduleLoading(false)
        }
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
      const res = await getRoutineBootstrap()
      setHealth(res.health)
      setInsights(res.insights)
      setSavedRoutines(res.savedRoutines)
      setCurrentRoutineId(res.routine.id ?? null)
      setCurrentRoutineName(res.routine.name ?? null)
      setScheduleEvents((res.scheduleEvents ?? []) as RoutineScheduleEvent[])
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
      const res = await getRoutineBootstrap()
      setAmSteps(Array.isArray(res.routine.am) ? res.routine.am : [])
      setPmSteps(Array.isArray(res.routine.pm) ? res.routine.pm : [])
      setHealth(res.health)
      setInsights(res.insights)
      setSavedRoutines(res.savedRoutines)
      setCurrentRoutineId(res.routine.id ?? null)
      setCurrentRoutineName(res.routine.name ?? null)
      setScheduleEvents((res.scheduleEvents ?? []) as RoutineScheduleEvent[])
    } finally {
      setSettingCurrent(null)
    }
  }

  const handleNewRoutine = () => {
    setAmSteps([])
    setPmSteps([])
    setCurrentRoutineId(null)
    setCurrentRoutineName(DEFAULT_ROUTINE_NAME)
    setScheduleEvents([])
  }

  const handleDeleteRoutine = async (routineId: string, name: string) => {
    if (USE_MOCK || !user) return
    if (typeof window === "undefined" || !window.confirm(`Delete routine "${name}"? This cannot be undone.`)) return
    setDeletingId(routineId)
    try {
      await deleteRoutine(routineId)
      const res = await getRoutineBootstrap()
      setAmSteps(Array.isArray(res.routine.am) ? res.routine.am : [])
      setPmSteps(Array.isArray(res.routine.pm) ? res.routine.pm : [])
      setHealth(res.health)
      setInsights(res.insights)
      setSavedRoutines(res.savedRoutines)
      setCurrentRoutineId(res.routine.id ?? null)
      setCurrentRoutineName(res.routine.name ?? null)
      setScheduleEvents((res.scheduleEvents ?? []) as RoutineScheduleEvent[])
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

  const handleDownloadIcs = async () => {
    if (USE_MOCK || !user) return
    try {
      setExportingIcs(true)
      const blob = await downloadRoutineScheduleIcs({
        routineId: currentRoutineId ?? undefined,
        includeAm: true,
        includePm: true,
        includeWeekly: false,
        horizonDays: 30,
      })
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = "skincare-routine-schedule.ics"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch {
      // Swallow and rely on generic UI error patterns later if needed.
    } finally {
      setExportingIcs(false)
    }
  }

  const handleDownloadHistoryCsv = async () => {
    if (USE_MOCK || !user) return
    try {
      setExportingCsv(true)
      const blob = await downloadHistoryCsv()
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = "skincare-history.csv"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch {
      // Swallow for now; rely on generic error patterns later if needed.
    } finally {
      setExportingCsv(false)
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

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
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

          {/* Sidebar - Routine Health, Insights, Calendar preview, Quick Actions */}
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
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-foreground">Calendar preview</h3>
                    <p className="text-xs text-muted-foreground">
                      A lightweight snapshot of the next 30 days. Download as a calendar file to
                      import elsewhere.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={handleDownloadIcs}
                    disabled={scheduleLoading || exportingIcs || scheduleEvents.length === 0}
                  >
                    {exportingIcs ? "Preparing…" : "Download .ics"}
                  </Button>
                </div>
                <div className="mt-3 space-y-2">
                  {scheduleLoading && (
                    <p className="text-xs text-muted-foreground">Building your calendar…</p>
                  )}
                  {!scheduleLoading && scheduleEvents.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No upcoming events yet. Add products to your AM or PM routine to see them
                      appear here.
                    </p>
                  )}
                  {!scheduleLoading && scheduleEvents.length > 0 && (
                    <div className="max-h-40 space-y-1 overflow-auto rounded-md border border-dashed border-border p-2 text-[11px]">
                      {scheduleEvents.slice(0, 12).map((evt) => (
                        <div
                          key={evt.id}
                          className="flex items-center justify-between gap-2 rounded px-2 py-1 hover:bg-accent/60"
                        >
                          <div className="min-w-0">
                            <div className="flex gap-2 font-medium text-muted-foreground">
                              <span>{evt.date}</span>
                              <span>•</span>
                              <span>{evt.time}</span>
                            </div>
                            <div className="truncate text-foreground">{evt.label}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-2 flex justify-end">
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto px-0 text-[11px] text-primary"
                      asChild
                    >
                      <a href="/routine/calendar">Open full calendar →</a>
                    </Button>
                  </div>
                </div>
              </div>
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
                {!USE_MOCK && user && (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={handleDownloadHistoryCsv}
                    disabled={exportingCsv}
                  >
                    {exportingCsv ? "Preparing export…" : "Export history (CSV)"}
                  </Button>
                )}
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
