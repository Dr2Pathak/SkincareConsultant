import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { RoutineInsightsCard } from "./routine-insights-card"

describe("RoutineInsightsCard", () => {
  it("renders title and empty state when no routine products", () => {
    render(<RoutineInsightsCard insights={{ conflicts: [], helps: [], hasRoutineProducts: false }} />)
    expect(screen.getByRole("region", { name: /ingredient insights/i })).toBeInTheDocument()
    expect(screen.getByText(/add products to your routine and save/i)).toBeInTheDocument()
  })

  it("renders conflicts and benefits when present", () => {
    render(
      <RoutineInsightsCard
        insights={{
          conflicts: [{ aLabel: "Retinol", bLabel: "Glycolic Acid" }],
          helps: [{ ingredient: "Niacinamide", targets: ["barrier", "hydration"] }],
          hasRoutineProducts: true,
        }}
        hasRoutineProducts={true}
      />
    )
    expect(screen.getByText(/Conflicts & caution/i)).toBeInTheDocument()
    expect(screen.getByText(/avoid combining or use on alternate days/i)).toBeInTheDocument()
    const benefitsHeadings = screen.getAllByRole("heading", { name: /Benefits/i })
    expect(benefitsHeadings.some((el) => el.textContent === "Benefits")).toBe(true)
    expect(screen.getByText(/barrier, hydration/)).toBeInTheDocument()
  })

  it("shows loading state", () => {
    render(<RoutineInsightsCard insights={null} loading />)
    expect(screen.getByText(/loading insights/i)).toBeInTheDocument()
  })

  it("shows disclaimer when there is content", () => {
    render(
      <RoutineInsightsCard
        insights={{
          conflicts: [{ aLabel: "A", bLabel: "B" }],
          helps: [],
          hasRoutineProducts: true,
        }}
        hasRoutineProducts={true}
      />
    )
    const disclaimers = screen.getAllByText(/Not a substitute for professional advice/i)
    expect(disclaimers.length).toBeGreaterThanOrEqual(1)
  })
})
