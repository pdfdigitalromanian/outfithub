import { ImageResponse } from "next/og"

export const size = { width: 180, height: 180 }
export const contentType = "image/png"

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: 180, height: 180, background: "#161513", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 70, height: 70, borderRadius: 70, border: "15px solid #f6f3ee" }} />
      </div>
    ),
    size
  )
}
