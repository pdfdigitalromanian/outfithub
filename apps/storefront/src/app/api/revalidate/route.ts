import { revalidateTag } from "next/cache"
import { NextResponse } from "next/server"
import { timingSafeEqual } from "crypto"

/**
 * On-demand cache purge called by the Medusa backend when products, content
 * or SEO change. Requires the shared REVALIDATE_SECRET (Bearer token).
 */
export async function POST(req: Request) {
  const secret = process.env.REVALIDATE_SECRET
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "")
  if (!secret || given.length !== secret.length || !timingSafeEqual(Buffer.from(given), Buffer.from(secret))) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  const body = (await req.json().catch(() => ({}))) as { tags?: unknown }
  const tags = Array.isArray(body.tags) ? body.tags.filter((t): t is string => typeof t === "string" && /^[\w:-]{1,120}$/.test(t)).slice(0, 50) : []
  for (const tag of tags) revalidateTag(tag, "max")
  return NextResponse.json({ revalidated: tags })
}
