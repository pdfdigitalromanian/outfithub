import { NextResponse } from "next/server"
import { getProductsByIds } from "@/lib/data/products"

export async function GET(req: Request) {
  const ids = (new URL(req.url).searchParams.get("ids") ?? "").split(",").filter(Boolean).slice(0, 24)
  const products = await getProductsByIds(ids)
  return NextResponse.json({ products }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } })
}
