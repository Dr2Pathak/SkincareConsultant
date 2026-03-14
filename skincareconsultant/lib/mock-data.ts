import type {
  UserProfile,
  Routine,
  Product,
  KnowledgeGraph,
  ChatMessage,
  CompatibilityResult,
  RoutineHealth,
} from "./types"

// Mock user profile
export const mockProfile: UserProfile = {
  skinTypes: ["combination", "sensitive"],
  concerns: ["acne", "pigmentation", "hydration"],
  avoidList: ["fragrance", "alcohol denat", "essential oils"],
  tolerance: "medium",
}

// Mock products
export const mockProducts: Product[] = [
  {
    id: "1",
    name: "Gentle Foaming Cleanser",
    brand: "CeraVe",
    category: "Cleanser",
    inciList: [
      "Aqua",
      "Glycerin",
      "Cocamidopropyl Betaine",
      "Sodium Lauroyl Sarcosinate",
      "Niacinamide",
      "Ceramide NP",
      "Ceramide AP",
      "Ceramide EOP",
    ],
    description: "A gentle, fragrance-free cleanser with ceramides and niacinamide.",
  },
  {
    id: "2",
    name: "Hyaluronic Acid 2% + B5",
    brand: "The Ordinary",
    category: "Serum",
    inciList: [
      "Aqua",
      "Sodium Hyaluronate",
      "Sodium Hyaluronate Crosspolymer",
      "Panthenol",
      "Ahnfeltia Concinna Extract",
    ],
    description: "Hydrating serum with multi-weight hyaluronic acid.",
  },
  {
    id: "3",
    name: "Retinol 0.5% in Squalane",
    brand: "The Ordinary",
    category: "Treatment",
    inciList: ["Squalane", "Caprylic/Capric Triglyceride", "Retinol", "Solanum Lycopersicum Extract"],
    description: "A stable retinol solution for anti-aging benefits.",
  },
  {
    id: "4",
    name: "Niacinamide 10% + Zinc 1%",
    brand: "The Ordinary",
    category: "Serum",
    inciList: [
      "Aqua",
      "Niacinamide",
      "Zinc PCA",
      "Tamarindus Indica Seed Gum",
      "Dimethyl Isosorbide",
      "Ethoxydiglycol",
    ],
    description: "High-strength niacinamide to reduce blemishes and control sebum.",
  },
  {
    id: "5",
    name: "Glycolic Acid 7% Toning Solution",
    brand: "The Ordinary",
    category: "Exfoliant",
    inciList: [
      "Aqua",
      "Glycolic Acid",
      "Rosa Damascena Flower Water",
      "Aloe Barbadensis Leaf Water",
      "Sodium Hydroxide",
      "Ginseng Root Extract",
    ],
    description: "A 7% glycolic acid toner for exfoliation and radiance.",
  },
  {
    id: "6",
    name: "Salicylic Acid 2% Solution",
    brand: "The Ordinary",
    category: "Exfoliant",
    inciList: ["Aqua", "Salicylic Acid", "Cocamidopropyl Dimethylamine", "Hydroxyethylcellulose"],
    description: "BHA solution for targeting blemishes and pore congestion.",
  },
  {
    id: "7",
    name: "Moisturizing Cream",
    brand: "CeraVe",
    category: "Moisturizer",
    inciList: [
      "Aqua",
      "Glycerin",
      "Cetearyl Alcohol",
      "Ceramide NP",
      "Ceramide AP",
      "Ceramide EOP",
      "Hyaluronic Acid",
      "Cholesterol",
    ],
    description: "Rich moisturizer with ceramides for dry and sensitive skin.",
  },
  {
    id: "8",
    name: "Ultra-Light Daily UV Defense SPF 50",
    brand: "Kiehl's",
    category: "Sunscreen",
    inciList: [
      "Aqua",
      "Homosalate",
      "Octisalate",
      "Avobenzone",
      "Octocrylene",
      "Glycerin",
      "Silica",
      "Niacinamide",
    ],
    description: "Lightweight daily sunscreen with SPF 50 protection.",
  },
  {
    id: "9",
    name: "Azelaic Acid Suspension 10%",
    brand: "The Ordinary",
    category: "Treatment",
    inciList: [
      "Aqua",
      "Azelaic Acid",
      "Dimethicone",
      "Isodecyl Neopentanoate",
      "Dimethicone/Bis-Isobutyl PPG-20 Crosspolymer",
    ],
    description: "Brightening treatment with azelaic acid for redness and blemishes.",
  },
  {
    id: "10",
    name: "Vitamin C Suspension 23% + HA Spheres 2%",
    brand: "The Ordinary",
    category: "Treatment",
    inciList: ["Ascorbic Acid", "Squalane", "Isodecyl Neopentanoate", "Sodium Hyaluronate"],
    description: "High-strength vitamin C for brightening and antioxidant protection.",
  },
  {
    id: "11",
    name: "Lactic Acid 10% + HA",
    brand: "The Ordinary",
    category: "Exfoliant",
    inciList: [
      "Aqua",
      "Lactic Acid",
      "Glycerin",
      "Sodium Hyaluronate Crosspolymer",
      "Arginine",
      "Potassium Citrate",
    ],
    description: "Gentle AHA exfoliant with lactic acid and hyaluronic acid.",
  },
  {
    id: "12",
    name: "Squalane Cleanser",
    brand: "The Ordinary",
    category: "Cleanser",
    inciList: ["Squalane", "Aqua", "Coco-Caprylate/Caprate", "Glycerin", "Sucrose Stearate"],
    description: "Gentle cleansing balm that transforms into an oil then milky emulsion.",
  },
]

// Mock routine
export const mockRoutine: Routine = {
  am: [
    { id: "am-1", order: 1, label: "Cleanser", productId: "1", product: mockProducts[0] },
    { id: "am-2", order: 2, label: "Serum", productId: "4", product: mockProducts[3] },
    { id: "am-3", order: 3, label: "Moisturizer", productId: "7", product: mockProducts[6] },
    { id: "am-4", order: 4, label: "Sunscreen", productId: "8", product: mockProducts[7] },
  ],
  pm: [
    { id: "pm-1", order: 1, label: "Cleanser", productId: "1", product: mockProducts[0] },
    { id: "pm-2", order: 2, label: "Exfoliant", productId: "5", product: mockProducts[4] },
    { id: "pm-3", order: 3, label: "Treatment", productId: "3", product: mockProducts[2] },
    { id: "pm-4", order: 4, label: "Moisturizer", productId: "7", product: mockProducts[6] },
  ],
}

// Mock knowledge graph
export const mockKnowledgeGraph: KnowledgeGraph = {
  nodes: [
    // Ingredients
    { id: "niacinamide", label: "Niacinamide", type: "ingredient" },
    { id: "retinol", label: "Retinol", type: "ingredient" },
    { id: "glycolic-acid", label: "Glycolic Acid", type: "ingredient" },
    { id: "salicylic-acid", label: "Salicylic Acid", type: "ingredient" },
    { id: "hyaluronic-acid", label: "Hyaluronic Acid", type: "ingredient" },
    { id: "vitamin-c", label: "Vitamin C", type: "ingredient" },
    { id: "azelaic-acid", label: "Azelaic Acid", type: "ingredient" },
    { id: "ceramides", label: "Ceramides", type: "ingredient" },
    { id: "lactic-acid", label: "Lactic Acid", type: "ingredient" },
    { id: "panthenol", label: "Panthenol", type: "ingredient" },

    // Families
    { id: "aha", label: "AHA", type: "family" },
    { id: "bha", label: "BHA", type: "family" },
    { id: "retinoids", label: "Retinoids", type: "family" },
    { id: "humectants", label: "Humectants", type: "family" },
    { id: "antioxidants", label: "Antioxidants", type: "family" },
    { id: "barrier-repair", label: "Barrier Repair", type: "family" },

    // Concerns
    { id: "acne", label: "Acne", type: "concern" },
    { id: "pigmentation", label: "Pigmentation", type: "concern" },
    { id: "anti-aging", label: "Anti-aging", type: "concern" },
    { id: "sensitive-skin", label: "Sensitive Skin", type: "concern" },
    { id: "hydration", label: "Hydration", type: "concern" },
    { id: "redness", label: "Redness", type: "concern" },
  ],
  edges: [
    // Belongs to relationships
    { from: "glycolic-acid", to: "aha", type: "belongs_to" },
    { from: "lactic-acid", to: "aha", type: "belongs_to" },
    { from: "salicylic-acid", to: "bha", type: "belongs_to" },
    { from: "retinol", to: "retinoids", type: "belongs_to" },
    { from: "hyaluronic-acid", to: "humectants", type: "belongs_to" },
    { from: "panthenol", to: "humectants", type: "belongs_to" },
    { from: "vitamin-c", to: "antioxidants", type: "belongs_to" },
    { from: "niacinamide", to: "antioxidants", type: "belongs_to" },
    { from: "ceramides", to: "barrier-repair", type: "belongs_to" },

    // Helps relationships
    { from: "niacinamide", to: "acne", type: "helps" },
    { from: "niacinamide", to: "pigmentation", type: "helps" },
    { from: "salicylic-acid", to: "acne", type: "helps" },
    { from: "glycolic-acid", to: "pigmentation", type: "helps" },
    { from: "glycolic-acid", to: "anti-aging", type: "helps" },
    { from: "retinol", to: "anti-aging", type: "helps" },
    { from: "retinol", to: "acne", type: "helps" },
    { from: "retinol", to: "pigmentation", type: "helps" },
    { from: "vitamin-c", to: "pigmentation", type: "helps" },
    { from: "vitamin-c", to: "anti-aging", type: "helps" },
    { from: "azelaic-acid", to: "acne", type: "helps" },
    { from: "azelaic-acid", to: "redness", type: "helps" },
    { from: "azelaic-acid", to: "pigmentation", type: "helps" },
    { from: "hyaluronic-acid", to: "hydration", type: "helps" },
    { from: "ceramides", to: "sensitive-skin", type: "helps" },
    { from: "ceramides", to: "hydration", type: "helps" },
    { from: "lactic-acid", to: "pigmentation", type: "helps" },
    { from: "lactic-acid", to: "hydration", type: "helps" },

    // Conflicts with relationships
    { from: "retinol", to: "aha", type: "conflicts_with" },
    { from: "retinol", to: "bha", type: "conflicts_with" },
    { from: "retinol", to: "vitamin-c", type: "conflicts_with" },
    { from: "aha", to: "bha", type: "conflicts_with" },
    { from: "vitamin-c", to: "aha", type: "conflicts_with" },
  ],
}

// Mock chat messages
export const mockChatMessages: ChatMessage[] = [
  {
    id: "1",
    role: "assistant",
    content:
      "Hi! I'm your skincare consultant. I can help you understand your routine, check product compatibility, and answer questions about ingredients. How can I help you today?",
    timestamp: new Date(Date.now() - 3600000),
  },
  {
    id: "2",
    role: "user",
    content: "Can I use retinol and glycolic acid together?",
    timestamp: new Date(Date.now() - 3500000),
  },
  {
    id: "3",
    role: "assistant",
    content:
      "Based on your routine, I'd recommend not using retinol and glycolic acid in the same routine. Both are potent actives that can cause irritation when combined. Instead, consider alternating nights - use glycolic acid one night and retinol the next. This gives your skin time to benefit from both without overwhelming it.",
    basedOnRoutine: true,
    citation: "Routine analysis",
    timestamp: new Date(Date.now() - 3400000),
  },
]

// Mock compatibility results
export const mockCompatibilityResults: Record<string, CompatibilityResult> = {
  safe: {
    verdict: "ready",
    score: 92,
    scoreLabel: "A",
    summary:
      "This product is well-suited for your skin type and complements your existing routine without conflicts.",
    dimensions: {
      safety: {
        label: "Safety",
        status: "good",
        description: "No known irritants for your skin type. All ingredients are within safe concentrations.",
      },
      goalAlignment: {
        label: "Goal Alignment",
        status: "good",
        description: "Contains niacinamide and hyaluronic acid, which support your hydration and acne goals.",
      },
      redundancy: {
        label: "Redundancy",
        status: "good",
        description: "Adds beneficial ingredients not already in your routine.",
      },
    },
    reasons: [
      "Contains ceramides that support your barrier repair goals",
      "Fragrance-free formula suitable for sensitive skin",
      "Niacinamide concentration is complementary to your existing serum",
    ],
    ingredientNotes: [
      { ingredientName: "Niacinamide", note: "Supports acne and pigmentation goals", type: "positive" },
      { ingredientName: "Ceramide NP", note: "Excellent for barrier repair", type: "positive" },
      { ingredientName: "Hyaluronic Acid", note: "Boosts hydration synergistically", type: "positive" },
    ],
  },
  caution: {
    verdict: "patch_test",
    score: 68,
    scoreLabel: "C+",
    summary:
      "This product may work for you, but contains some ingredients that warrant caution given your profile.",
    dimensions: {
      safety: {
        label: "Safety",
        status: "warning",
        description:
          "Contains glycolic acid at 7% - may cause sensitivity when combined with your nightly retinol.",
      },
      goalAlignment: {
        label: "Goal Alignment",
        status: "good",
        description: "AHA exfoliation supports your pigmentation and texture goals.",
      },
      redundancy: {
        label: "Redundancy",
        status: "warning",
        description: "You already have an exfoliant in your PM routine.",
      },
    },
    reasons: [
      "High AHA concentration + your nightly retinol → potential irritation risk",
      "Consider using on alternate nights from your retinol",
      "Start with once weekly application to assess tolerance",
    ],
    ingredientNotes: [
      {
        ingredientName: "Glycolic Acid",
        note: "7% concentration may conflict with retinol use",
        type: "warning",
      },
      { ingredientName: "Aloe Barbadensis", note: "Soothing ingredient, good for sensitive skin", type: "positive" },
      { ingredientName: "Rosa Damascena", note: "May contain fragrant compounds", type: "neutral" },
    ],
  },
  notRecommended: {
    verdict: "not_recommended",
    score: 35,
    scoreLabel: "D",
    summary:
      "This product is not recommended for your current routine due to significant compatibility issues.",
    dimensions: {
      safety: {
        label: "Safety",
        status: "danger",
        description:
          "Contains alcohol denat (high in your avoid list) and fragrance that may irritate sensitive skin.",
      },
      goalAlignment: {
        label: "Goal Alignment",
        status: "warning",
        description: "While it targets acne, the formulation may compromise your barrier repair goals.",
      },
      redundancy: {
        label: "Redundancy",
        status: "danger",
        description: "Adding this would mean 3 exfoliating products - significant over-exfoliation risk.",
      },
    },
    reasons: [
      "Contains alcohol denat - on your avoid list for drying/irritating potential",
      "Fragrance included - flagged in your sensitivities",
      "Would create excessive exfoliation load (3 exfoliants total)",
      "High pH may compromise your skin barrier",
    ],
    ingredientNotes: [
      { ingredientName: "Alcohol Denat", note: "On your avoid list - may cause dryness", type: "danger" },
      { ingredientName: "Parfum", note: "Contains fragrance - flagged sensitivity", type: "danger" },
      {
        ingredientName: "Salicylic Acid",
        note: "Beneficial for acne, but redundant with existing products",
        type: "warning",
      },
    ],
  },
}

// Mock routine health
export const mockRoutineHealth: RoutineHealth = {
  score: 72,
  exfoliationLoad: 2,
  retinoidStrength: 1,
  conflictCount: 1,
  warnings: [
    {
      type: "conflict",
      severity: "warning",
      message: "Potential conflict detected",
      details:
        "Your PM routine contains both glycolic acid (AHA) and retinol. Consider alternating nights to reduce irritation risk.",
    },
    {
      type: "exfoliation",
      severity: "info",
      message: "Moderate exfoliation load",
      details:
        "You have 2 exfoliating products in your routine. Monitor for signs of over-exfoliation like redness or sensitivity.",
    },
    {
      type: "missing",
      severity: "info",
      message: "Consider adding antioxidants to AM",
      details: "A vitamin C serum in the morning could enhance your pigmentation goals and provide sun protection support.",
    },
  ],
}

// Helper functions for mock data
export function getProductById(id: string): Product | undefined {
  return mockProducts.find((p) => p.id === id)
}

export function searchProducts(query: string): Product[] {
  const trimmed = query.trim()
  if (!trimmed) return []
  const lowerQuery = trimmed.toLowerCase()
  return mockProducts.filter(
    (p) =>
      p.name.toLowerCase().includes(lowerQuery) ||
      p.brand.toLowerCase().includes(lowerQuery) ||
      p.category?.toLowerCase().includes(lowerQuery) ||
      p.inciList.some((i) => i.toLowerCase().includes(lowerQuery))
  )
}

export function getCompatibilityResult(productId: string): CompatibilityResult {
  // Simulate different results based on product
  const product = getProductById(productId)
  if (!product) {
    return mockCompatibilityResults.notRecommended
  }

  // Check for conflicting ingredients
  const hasAvoidedIngredient = product.inciList.some((ing) =>
    mockProfile.avoidList.some((avoid) => ing.toLowerCase().includes(avoid.toLowerCase()))
  )

  if (hasAvoidedIngredient) {
    return mockCompatibilityResults.notRecommended
  }

  // Check for actives that may conflict with routine
  const hasAHA = product.inciList.some((ing) =>
    ["glycolic acid", "lactic acid", "mandelic acid"].some((aha) => ing.toLowerCase().includes(aha))
  )

  if (hasAHA) {
    return mockCompatibilityResults.caution
  }

  return mockCompatibilityResults.safe
}
