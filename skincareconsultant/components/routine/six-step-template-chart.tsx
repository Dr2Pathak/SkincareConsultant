"use client"

import { useEffect, useState } from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"
import { ChevronDown } from "lucide-react"

const STORAGE_KEY = "skincare_show_six_step_template_chart"

/** Educational template only—not personalized to the user. */
const TEMPLATE_DATA = [
  { slot: "1", label: "Cleanse", role: "Remove oil, SPF, debris" },
  { slot: "2", label: "Treat (AM/PM)", role: "Targeted actives" },
  { slot: "3", label: "Hydrate", role: "Humectants, essences" },
  { slot: "4", label: "Moisturize", role: "Seal barrier" },
  { slot: "5", label: "Eyes (opt.)", role: "Thinner skin" },
  { slot: "6", label: "SPF (AM)", role: "Daytime only" },
].map((row) => ({
  ...row,
  /** Equal bar height: emphasis is order, not quantity */
  weight: 1,
}))

const chartConfig = {
  weight: {
    label: "Typical step",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

export function SixStepTemplateChart() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY)
      if (v === "1") setOpen(true)
    } catch {
      /* ignore */
    }
  }, [])

  const persistOpen = (next: boolean) => {
    setOpen(next)
    try {
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0")
    } catch {
      /* ignore */
    }
  }

  return (
    <Collapsible open={open} onOpenChange={persistOpen} className="rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">Typical 6-step routine (reference)</p>
          <p className="text-xs text-muted-foreground">
            General template for education only—not a prescription for your skin. Adjust to your dermatologist&apos;s
            advice.
          </p>
        </div>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="shrink-0 gap-1">
            {open ? "Hide chart" : "Show chart"}
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent>
        <div className="p-4 pt-2">
          <ChartContainer config={chartConfig} className="h-[220px] w-full">
            <BarChart accessibilityLayer data={TEMPLATE_DATA} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} interval={0} fontSize={11} />
              <YAxis hide domain={[0, 1.2]} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    hideIndicator
                    labelFormatter={(_, payload) => {
                      const row = payload?.[0]?.payload as { label?: string; role?: string }
                      return row ? `${row.label}: ${row.role ?? ""}` : ""
                    }}
                  />
                }
              />
              <Bar dataKey="weight" fill="var(--color-weight)" radius={4} maxBarSize={48} />
            </BarChart>
          </ChartContainer>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
