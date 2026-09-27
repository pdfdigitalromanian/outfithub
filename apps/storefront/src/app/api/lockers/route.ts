import { NextResponse } from "next/server"
import { BACKEND_URL } from "@/lib/medusa"
import { PUBLISHABLE_KEY } from "@/lib/env"

/** Proxies the Easybox search to Medusa so the browser never calls the backend directly. */
export async function GET(req: Request) {
  const src = new URL(req.url).searchParams
  const params = new URLSearchParams()
  for (const k of ["q", "city", "lat", "lng", "limit"]) {
    const v = src.get(k)
    if (v) params.set(k, v.slice(0, 100))
  }
  try {
    const res = await fetch(`${BACKEND_URL}/store/sameday/lockers?${params}`, {
      headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
      next: { revalidate: 300 },
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.ok ? 200 : res.status })
  } catch {
    return NextResponse.json({ available: false, lockers: [], count: 0 }, { status: 502 })
  }
}
