import { ImageResponse } from "next/og"

const VARIANTS: Record<string, { size: number; maskable?: boolean }> = {
  "192": { size: 192 },
  "512": { size: 512 },
  "maskable-512": { size: 512, maskable: true },
  "180": { size: 180 },
}

export function generateStaticParams() {
  return Object.keys(VARIANTS).map((variant) => ({ variant }))
}

/** PWA / touch icons rendered from the brand mark. */
export async function GET(_: Request, { params }: { params: Promise<{ variant: string }> }) {
  const { variant } = await params
  const v = VARIANTS[variant] ?? VARIANTS["512"]
  const s = v.size
  const ring = v.maskable ? s * 0.34 : s * 0.46
  return new ImageResponse(
    (
      <div style={{ width: s, height: s, display: "flex", alignItems: "center", justifyContent: "center", background: v.maskable ? "#161513" : "#f6f3ee" }}>
        <div
          style={{
            width: v.maskable ? s : s * 0.84,
            height: v.maskable ? s : s * 0.84,
            borderRadius: v.maskable ? 0 : s,
            background: "#161513",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ width: ring, height: ring, borderRadius: ring, border: `${Math.round(s * 0.085)}px solid #f6f3ee` }} />
        </div>
      </div>
    ),
    { width: s, height: s, headers: { "Cache-Control": "public, max-age=31536000, immutable" } }
  )
}
