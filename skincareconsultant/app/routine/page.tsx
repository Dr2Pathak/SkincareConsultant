"use client"

import { useState } from "react"
import { Sun, Moon, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RoutineStepEditor, AddStepButton } from "@/components/routine/routine-step-editor"
import { RoutineHealthCard } from "@/components/routine/routine-health"
import { mockRoutine, mockProducts, mockRoutineHealth } from "@/lib/mock-data"
import { generateId } from "@/lib/utils"
import type { RoutineStep } from "@/lib/types"

export default function RoutinePage() {
  const [amSteps, setAmSteps] = useState<RoutineStep[]>(mockRoutine.am)
  const [pmSteps, setPmSteps] = useState<RoutineStep[]>(mockRoutine.pm)

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

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Your Routine</h1>
          <p className="mt-2 text-muted-foreground">
            Build and manage your AM and PM skincare routines. Track what products you use and when.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          {/* Routine Builder */}
          <div className="space-y-6">
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
                        products={mockProducts}
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
                        products={mockProducts}
                        onUpdate={handleUpdateStep(pmSteps, setPmSteps)}
                        onDelete={handleDeleteStep(pmSteps, setPmSteps)}
                      />
                    ))}
                    <AddStepButton onAdd={handleAddStep(pmSteps, setPmSteps, "pm")} />
                  </>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar - Routine Health */}
          <aside className="space-y-6">
            <RoutineHealthCard health={mockRoutineHealth} />

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
    </div>
  )
}
