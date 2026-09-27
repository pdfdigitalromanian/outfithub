import crypto from "crypto"
import { SamedayClient, mapSamedayStatus, toFormBody } from "../providers/sameday"
import { signTikTokShopRequest } from "../providers/tiktok-shop"
import { encodeProductName, toMicros } from "../providers/google-merchant"
import { verifyMetaSignature } from "../providers/meta"
import { backoffDelayMs } from "../channels/sync-engine"

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })

describe("Sameday client", () => {
  const saved = process.env.SAMEDAY_API_HOST
  beforeEach(() => delete process.env.SAMEDAY_API_HOST)
  afterAll(() => { if (saved) process.env.SAMEDAY_API_HOST = saved })

  it("encodes nested form bodies like PHP http_build_query", () => {
    const body = toFormBody({ awbRecipient: { name: "Ana", cityString: "Cluj" }, parcels: [{ weight: 1 }], lockerLastMile: undefined })
    expect(decodeURIComponent(body)).toBe("awbRecipient[name]=Ana&awbRecipient[cityString]=Cluj&parcels[0][weight]=1")
  })

  it("authenticates, caches the token and retries once on 401", async () => {
    const calls: Array<{ url: string; headers: Record<string, string> }> = []
    let lockersCalls = 0
    const fetchImpl = (async (url: string, init: RequestInit) => {
      calls.push({ url, headers: init.headers as Record<string, string> })
      if (url.endsWith("/api/authenticate")) return jsonResponse(200, { token: `tok${calls.length}`, expire_at: "2099-01-01 10:00" })
      lockersCalls++
      if (lockersCalls === 1) return jsonResponse(401, { message: "expired" })
      return jsonResponse(200, { data: [{ lockerId: 12, name: "easybox" }], pages: 1 })
    }) as unknown as typeof fetch
    const onToken = jest.fn()
    const client = new SamedayClient({ username: "u", password: "p", environment: "demo" }, { fetchImpl, onToken })
    const lockers = await client.getLockers()
    expect(lockers).toEqual([{ lockerId: 12, name: "easybox" }])
    expect(calls[0].url).toBe("https://sameday-api.demo.zitec.com/api/authenticate")
    expect(calls[0].headers["X-AUTH-USERNAME"]).toBe("u")
    expect(calls.filter((c) => c.url.endsWith("/api/authenticate"))).toHaveLength(2)
    expect(calls.at(-1)!.headers["X-AUTH-TOKEN"]).toBe("tok3")
    expect(onToken).toHaveBeenCalledTimes(2)
  })

  it("maps rejected credentials to an authentication error", async () => {
    const fetchImpl = (async () => jsonResponse(403, { message: "Bad credentials" })) as unknown as typeof fetch
    const client = new SamedayClient({ username: "u", password: "bad" }, { fetchImpl })
    await expect(client.getServices()).rejects.toMatchObject({ kind: "authorization" })
  })

  it("maps statuses", () => {
    expect(mapSamedayStatus({ statusState: "Livrat" })).toBe("delivered")
    expect(mapSamedayStatus({ status: "Anulat" })).toBe("canceled")
    expect(mapSamedayStatus({ statusLabel: "In tranzit" })).toBe("in_transit")
  })
})

describe("TikTok Shop signing", () => {
  it("signs path + sorted params (excluding sign/access_token) + body wrapped in the secret", () => {
    const secret = "sec"
    const query = { timestamp: "1700000000", app_key: "key", access_token: "ignored", shop_cipher: "C1" }
    const body = '{"a":1}'
    const expectedInput = "sec" + "/product/202309/products" + "app_keykey" + "shop_cipherC1" + "timestamp1700000000" + body + "sec"
    const expected = crypto.createHmac("sha256", secret).update(expectedInput).digest("hex")
    expect(signTikTokShopRequest("/product/202309/products", query, body, secret)).toBe(expected)
  })
})

describe("Google Merchant helpers", () => {
  it("encodes product names as unpadded base64url", () => {
    expect(encodeProductName("en", "US", "sku/123")).toBe("ZW5-VVN-c2t1LzEyMw")
  })
  it("converts to micros", () => {
    expect(toMicros(129.99)).toBe("129990000")
  })
})

describe("Meta webhook signature", () => {
  it("validates X-Hub-Signature-256", () => {
    const body = '{"object":"page"}'
    const sig = "sha256=" + crypto.createHmac("sha256", "appsecret").update(body).digest("hex")
    expect(verifyMetaSignature(body, sig, "appsecret")).toBe(true)
    expect(verifyMetaSignature(body, sig, "other")).toBe(false)
    expect(verifyMetaSignature(body, undefined, "appsecret")).toBe(false)
  })
})

describe("sync back-off", () => {
  it("grows exponentially and caps at 6h", () => {
    expect(backoffDelayMs(1)).toBe(60_000)
    expect(backoffDelayMs(3)).toBe(240_000)
    expect(backoffDelayMs(20)).toBe(6 * 3600_000)
  })
})
