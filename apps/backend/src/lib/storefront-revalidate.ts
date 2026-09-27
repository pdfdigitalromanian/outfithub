/**
 * Purges storefront caches by tag (Next.js revalidateTag via /api/revalidate).
 * Fire-and-forget: a storefront outage must never break admin operations.
 */
export async function revalidateStorefront(tags: string[]) {
  const secret = process.env.STOREFRONT_REVALIDATE_SECRET
  const url = process.env.STOREFRONT_URL
  if (!secret || !url || !tags.length) return
  try {
    await fetch(`${url.replace(/\/$/, "")}/api/revalidate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
      body: JSON.stringify({ tags: [...new Set(tags)] }),
      signal: AbortSignal.timeout(5000),
    })
  } catch {
    // ignored – caches also expire on their own (60–900s)
  }
}
