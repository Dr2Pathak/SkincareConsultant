import { GraphVisualization } from "@/components/graph/graph-visualization"
import { Disclaimer } from "@/components/disclaimer"
import { mockKnowledgeGraph } from "@/lib/mock-data"

export const metadata = {
  title: "Ingredient Map",
  description: "Explore how skincare ingredients relate to each other and your skin concerns.",
}

export default function IngredientsPage() {
  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Knowledge Graph</h1>
          <p className="mt-2 text-muted-foreground max-w-2xl">
            Explore how ingredients, ingredient families, and skin concerns relate to each other.
            Click on any node to see its relationships.
          </p>
        </div>

        <GraphVisualization graph={mockKnowledgeGraph} />

        <Disclaimer className="mt-8">
          Ingredient relationships are based on general skincare knowledge and may not apply to
          every formulation. Individual reactions vary.
        </Disclaimer>
      </div>
    </div>
  )
}
