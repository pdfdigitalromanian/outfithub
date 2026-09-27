import { FetchLike, ProviderError, requestJson } from "./http"

/** TikTok Events API 2.0 (server-side) — separate from TikTok Shop. */
const BASE = "https://business-api.tiktok.com/open_api/v1.3"

export type TikTokEventsConfig = {
  access_token: string
  pixel_code: string
  advertiser_id?: string
  test_event_code?: string
}

export type TikTokServerEvent = {
  event: string
  event_time: number
  event_id?: string
  user?: Record<string, unknown>
  properties?: Record<string, unknown>
  page?: { url?: string; referrer?: string }
}

type TikTokEnvelope<T> = { code: number; message: string; data?: T; request_id?: string }

export class TikTokEventsClient {
  constructor(private readonly cfg: TikTokEventsConfig, private readonly fetchImpl: FetchLike = fetch) {
    if (!cfg.access_token || !cfg.pixel_code) {
      throw new ProviderError("tiktok_events", "not_configured", "TikTok pixel code / access token are not configured")
    }
  }

  private check<T>(res: TikTokEnvelope<T>): T {
    if (res.code !== 0) {
      // 40001/40100/40104/40105 = auth problems
      const kind = [40001, 40100, 40104, 40105].includes(res.code) ? "authentication" : res.code === 40002 ? "authorization" : "bad_request"
      throw new ProviderError("tiktok_events", kind, `TikTok: ${res.message} (code ${res.code})`, undefined, res)
    }
    return res.data as T
  }

  async listPixels() {
    if (!this.cfg.advertiser_id) {
      throw new ProviderError("tiktok_events", "not_configured", "Advertiser ID is required to verify the connection")
    }
    const url = new URL(`${BASE}/pixel/list/`)
    url.searchParams.set("advertiser_id", this.cfg.advertiser_id)
    url.searchParams.set("code", this.cfg.pixel_code)
    const res = await requestJson<TikTokEnvelope<{ pixels: Array<{ pixel_code: string; pixel_name: string }> }>>(
      "tiktok_events",
      url.toString(),
      { headers: { "Access-Token": this.cfg.access_token }, fetchImpl: this.fetchImpl }
    )
    return this.check(res)
  }

  async track(events: TikTokServerEvent[]) {
    const res = await requestJson<TikTokEnvelope<unknown>>("tiktok_events", `${BASE}/event/track/`, {
      method: "POST",
      headers: { "Access-Token": this.cfg.access_token, "Content-Type": "application/json" },
      body: JSON.stringify({
        event_source: "web",
        event_source_id: this.cfg.pixel_code,
        ...(this.cfg.test_event_code ? { test_event_code: this.cfg.test_event_code } : {}),
        data: events,
      }),
      fetchImpl: this.fetchImpl,
    })
    return this.check(res)
  }
}
