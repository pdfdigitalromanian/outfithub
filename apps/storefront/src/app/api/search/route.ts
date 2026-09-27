import { NextResponse } from "next/server"
import { getProductCards } from "@/lib/data/products"
import { applyFilters } from "@/lib/catalog"

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 100)
  if (q.length < 2) return NextResponse.json({ products: [] })
  const products = applyFilters(await getProductCards(), { q, sort: "recommended" }).slice(0, 8)
  return NextResponse.json({ products }, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" } })
}
