// Profile types
export interface UserProfile {
  skinTypes: SkinType[]
  concerns: Concern[]
  avoidList: string[]
  tolerance: ToleranceLevel
}

export type SkinType =
  | "oily"
  | "dry"
  | "combination"
  | "sensitive"
  | "acne-prone"
  | "rosacea-prone"

export type Concern =
  | "acne"
  | "pigmentation"
  | "anti-aging"
  | "barrier-repair"
  | "redness"
  | "hydration"
  | "texture"
  | "dark-circles"

export type ToleranceLevel = "low" | "medium" | "high"

// Routine types
export interface RoutineStep {
  id: string
  order: number
  label: string
  productId?: string
  product?: Product
}

export interface Routine {
  id?: string
  name?: string
  am: RoutineStep[]
  pm: RoutineStep[]
}

/** Saved routine summary for listing (e.g. My Routines). */
export interface SavedRoutineSummary {
  id: string
  name: string
  am: RoutineStep[]
  pm: RoutineStep[]
  is_current: boolean
  updated_at?: string
}

// Product types
export interface Product {
  id: string
  name: string
  brand: string
  inciList: string[]
  category?: string
  description?: string
}

// Compatibility result types
export type VerdictType = "ready" | "patch_test" | "not_recommended"

export interface CompatibilityDimension {
  label: string
  status: "good" | "warning" | "danger"
  description: string
}

export interface IngredientNote {
  ingredientName: string
  note: string
  type: "positive" | "neutral" | "warning" | "danger"
}

export interface CompatibilityResult {
  verdict: VerdictType
  score?: number
  scoreLabel?: string
  summary: string
  dimensions?: {
    safety?: CompatibilityDimension
    goalAlignment?: CompatibilityDimension
    redundancy?: CompatibilityDimension
  }
  reasons: string[]
  ingredientNotes?: IngredientNote[]
}

// Knowledge graph types
export type NodeType = "ingredient" | "family" | "concern"
export type EdgeType = "belongs_to" | "conflicts_with" | "helps"

export interface GraphNode {
  id: string
  label: string
  type: NodeType
}

export interface GraphEdge {
  from: string
  to: string
  type: EdgeType
}

export interface KnowledgeGraph {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

// Chat types
export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  citation?: string
  basedOnRoutine?: boolean
  timestamp: Date
}

// Routine Health types
export interface RoutineHealthWarning {
  type: "exfoliation" | "conflict" | "redundancy" | "missing"
  severity: "info" | "warning" | "danger"
  message: string
  details?: string
}

export interface RoutineHealth {
  score: number
  warnings: RoutineHealthWarning[]
  exfoliationLoad: number
  retinoidStrength: number
  conflictCount: number
}

/** Knowledge-graph insights for ingredients in the user's routine (conflicts & helps). */
export interface RoutineInsights {
  conflicts: Array<{ aLabel: string; bLabel: string }>
  helps: Array<{ ingredient: string; targets: string[] }>
  /** True when the routine used for the request had at least one product (so empty insights = no graph data for those products). */
  hasRoutineProducts?: boolean
}
