/**
 * GET /api/products?q= — search products in Supabase.
 * GET /api/products?id= — get single product by id.
 */

import { NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase/server"
import type { Product } from "@/lib/types"

function rowToProduct(row: {
  id: string
  name: string
  brand: string
  inci_list: string[] | unknown
  category?: string | null
  description?: string | null
}): Product {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    inciList: Array.isArray(row.inci_list) ? row.inci_list : [],
    category: row.category ?? undefined,
    description: row.description ?? undefined,
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    const q = searchParams.get("q")?.trim()

    const supabase = getSupabaseServer()

    if (id) {
      const { data, error } = await supabase.from("products").select("*").eq("id", id).maybeSingle()
      if (error) {
        console.error("Product fetch error", { id, error: error.message })
        return NextResponse.json({ error: "Product not found" }, { status: 404 })
      }
      if (!data) return NextResponse.json(null)
      return NextResponse.json(rowToProduct(data))
    }

    if (!q) {
      return NextResponse.json([])
    }
    const safeQ = q.slice(0, 200)

    const { data, error } = await supabase
      .from("products")
      .select("id, name, brand, inci_list, category, description")
      .or(`name.ilike.%${safeQ}%,brand.ilike.%${safeQ}%`)
      .limit(50)

    if (error) {
      console.error("Product search error", { q: q.slice(0, 50), error: error.message })
      return NextResponse.json({ error: "Search failed" }, { status: 500 })
    }

    const products = (data ?? []).map(rowToProduct)
    return NextResponse.json(products)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("GET /api/products failed", { error: message })
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}
