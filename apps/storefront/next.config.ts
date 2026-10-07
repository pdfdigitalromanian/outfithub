import type { NextConfig } from "next"

const remoteHosts = new Set<string>(["medusa-public-images.s3.eu-west-1.amazonaws.com", "localhost"])
for (const url of [process.env.MEDUSA_BACKEND_URL, process.env.NEXT_PUBLIC_IMAGE_HOST, process.env.S3_FILE_URL]) {
  if (!url) continue
  try {
    remoteHosts.add(new URL(url.startsWith("http") ? url : `https://${url}`).hostname)
  } catch {}
}

// Medusa reserves /admin for its API, so the dashboard stays on the backend (/app); /admin here only redirects to it.
const adminUrl = (process.env.ADMIN_URL || (process.env.MEDUSA_BACKEND_URL ? `${process.env.MEDUSA_BACKEND_URL.replace(/\/$/, "")}/app` : "")).replace(/\/$/, "")

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'; base-uri 'self'; form-action 'self'; object-src 'none'" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), payment=(self)" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
]

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Self-contained server for the Docker image (apps/storefront/Dockerfile); ignored by Vercel.
  output: "standalone",
  outputFileTracingRoot: __dirname,
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [60, 75, 85],
    deviceSizes: [375, 430, 640, 768, 1024, 1280, 1440, 1920],
    imageSizes: [64, 96, 128, 200, 256, 320, 400],
    remotePatterns: [...remoteHosts].map((hostname) => ({ protocol: hostname === "localhost" ? "http" : "https", hostname })),
    minimumCacheTTL: 60 * 60 * 24,
    // Local backend images (http://localhost:9000/static) only in development; never in production (SSRF).
    dangerouslyAllowLocalIP: process.env.NODE_ENV !== "production",
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ]
  },
  async redirects() {
    return [
      { source: "/store", destination: "/shop", permanent: true },
      { source: "/collections/all", destination: "/shop", permanent: true },
      ...(adminUrl
        ? [
            { source: "/admin", destination: adminUrl, permanent: false },
            { source: "/admin/:path*", destination: `${adminUrl}/:path*`, permanent: false },
          ]
        : []),
    ]
  },
}

export default nextConfig
