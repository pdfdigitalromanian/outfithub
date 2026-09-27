import { FetchLike, ProviderError, kindFromStatus } from "./http"

/**
 * Sameday Courier REST API client (https://api.sameday.ro).
 * Endpoints mirror the official sameday-courier/php-sdk v2.4.
 * Authentication: POST /api/authenticate with X-AUTH-USERNAME / X-AUTH-PASSWORD,
 * then X-AUTH-TOKEN on every call. Tokens are cached and refreshed on 401/403.
 */
export const SAMEDAY_HOSTS = {
  production: "https://api.sameday.ro",
  demo: "https://sameday-api.demo.zitec.com",
} as const

export type SamedayEnvironment = keyof typeof SAMEDAY_HOSTS

export type SamedayToken = { token: string; expires_at: string }

export type SamedayCredentials = {
  username: string
  password: string
  environment?: SamedayEnvironment
}

export type SamedayService = {
  id: number
  name: string
  serviceCode: string
  deliveryType?: { id: number; name: string }
  defaultServices?: boolean
  serviceOptionalTaxes?: Array<{ id: number; name: string; code: string }>
}

export type SamedayLockerDto = {
  lockerId: number
  name: string
  county: string
  city: string
  address: string
  postalCode: string
  lat: number | string
  lng: number | string
  schedule?: Array<{ day: number; openingHour: string; closingHour: string }>
  oohType?: number
}

export type SamedayPickupPoint = {
  id: number
  alias?: string
  address?: string
  defaultPickupPoint?: boolean
  county?: { id: number; name: string }
  city?: { id: number; name: string }
  pickupPointContactPerson?: Array<{ id: number; name: string; phoneNumber: string; defaultContactPerson?: boolean }>
}

export type SamedayAwbRecipient = {
  name: string
  phoneNumber: string
  email: string
  address: string
  city?: string | number
  county?: string | number
  cityString?: string
  countyString?: string
  postalCode?: string
  personType?: 0 | 1
}

export type SamedayCreateAwbInput = {
  pickupPoint: number | string
  contactPerson?: number | string
  service: number | string
  packageType?: 0 | 1 | 2
  awbPayment?: 1
  cashOnDelivery?: number
  insuredValue?: number
  thirdPartyPickup?: 0 | 1
  awbRecipient: SamedayAwbRecipient
  parcels: Array<{ weight: number; width?: number; length?: number; height?: number }>
  observation?: string
  clientInternalReference?: string
  lockerLastMile?: number | string
  currency?: string
}

export type SamedayAwbResult = {
  awbNumber: string
  awbCost: number
  parcels: Array<{ position: number; awbNumber: string }>
}

export class SamedayClient {
  private readonly host: string
  private token: SamedayToken | null

  constructor(
    private readonly creds: SamedayCredentials,
    opts: { token?: SamedayToken | null; onToken?: (t: SamedayToken) => Promise<void> | void; fetchImpl?: FetchLike } = {}
  ) {
    if (!creds.username || !creds.password) {
      throw new ProviderError("sameday", "not_configured", "Sameday username/password are not configured")
    }
    // SAMEDAY_API_HOST allows pointing to a staging/mock server (tests, QA).
    this.host = (process.env.SAMEDAY_API_HOST || SAMEDAY_HOSTS[creds.environment ?? "production"] || SAMEDAY_HOSTS.production).replace(/\/$/, "")
    this.token = opts.token ?? null
    this.onToken = opts.onToken
    this.fetchImpl = opts.fetchImpl ?? fetch
  }

  private readonly onToken?: (t: SamedayToken) => Promise<void> | void
  private readonly fetchImpl: FetchLike

  private tokenValid() {
    return !!this.token && new Date(this.token.expires_at).getTime() - Date.now() > 60_000
  }

  async authenticate(): Promise<SamedayToken> {
    const res = await this.raw("POST", "/api/authenticate", {
      auth: false,
      form: { remember_me: "1" },
      headers: {
        "X-AUTH-USERNAME": this.creds.username,
        "X-AUTH-PASSWORD": this.creds.password,
      },
    })
    if (!res?.token) {
      throw new ProviderError("sameday", "authentication", "Sameday did not return an authentication token")
    }
    // expire_at format: "YYYY-MM-DD HH:mm" (Europe/Bucharest). Fallback: 12h.
    const parsed = typeof res.expire_at === "string" ? new Date(res.expire_at.replace(" ", "T") + ":00+03:00") : null
    const expires = parsed && !isNaN(parsed.getTime()) ? parsed : new Date(Date.now() + 12 * 3600_000)
    this.token = { token: res.token, expires_at: expires.toISOString() }
    await this.onToken?.(this.token)
    return this.token
  }

  private async raw(
    method: string,
    path: string,
    opts: {
      auth?: boolean
      query?: Record<string, string | number | undefined>
      form?: Record<string, unknown>
      headers?: Record<string, string>
      binary?: boolean
      retried?: boolean
    } = {}
  ): Promise<any> {
    const auth = opts.auth ?? true
    if (auth && !this.tokenValid()) {
      await this.authenticate()
    }
    const url = new URL(this.host + path)
    for (const [k, v] of Object.entries(opts.query ?? {})) {
      if (v !== undefined) url.searchParams.set(k, String(v))
    }
    const headers: Record<string, string> = { Accept: "application/json", ...(opts.headers ?? {}) }
    if (auth && this.token) headers["X-AUTH-TOKEN"] = this.token.token
    let body: string | undefined
    if (opts.form) {
      headers["Content-Type"] = "application/x-www-form-urlencoded"
      body = toFormBody(opts.form)
    }
    let res: Response
    try {
      res = await this.fetchImpl(url.toString(), { method, headers, body })
    } catch (e) {
      throw new ProviderError("sameday", "network", `Sameday network error: ${(e as Error).message}`)
    }
    if ((res.status === 401 || res.status === 403) && auth && !opts.retried) {
      this.token = null
      return this.raw(method, path, { ...opts, retried: true })
    }
    if (opts.binary && res.ok) {
      return Buffer.from(await res.arrayBuffer())
    }
    const text = await res.text()
    let json: any = null
    try {
      json = text ? JSON.parse(text) : null
    } catch {
      json = text
    }
    if (!res.ok) {
      const msg =
        json?.error?.message ||
        json?.message ||
        (json?.errors ? JSON.stringify(json.errors).slice(0, 500) : null) ||
        `Sameday HTTP ${res.status}`
      throw new ProviderError("sameday", kindFromStatus(res.status), msg, res.status, json)
    }
    return json
  }

  private async paginate<T>(path: string, query: Record<string, string | number> = {}, perPage = 500): Promise<T[]> {
    const out: T[] = []
    let page = 1
    for (;;) {
      const res = await this.raw("GET", path, { query: { ...query, page, countPerPage: perPage } })
      const data: T[] = res?.data ?? []
      out.push(...data)
      const pages = Number(res?.pages ?? 1)
      if (page >= pages || !data.length) break
      page++
    }
    return out
  }

  getServices() {
    return this.paginate<SamedayService>("/api/client/services")
  }

  getPickupPoints() {
    return this.paginate<SamedayPickupPoint>("/api/client/pickup-points")
  }

  getLockers() {
    return this.paginate<SamedayLockerDto>("/api/client/lockers")
  }

  getOohLocations() {
    return this.paginate<SamedayLockerDto & { oohId: number }>("/api/client/ooh-locations")
  }

  async createAwb(input: SamedayCreateAwbInput): Promise<SamedayAwbResult> {
    const packageWeight = input.parcels.reduce((s, p) => s + p.weight, 0)
    const form: Record<string, unknown> = {
      pickupPoint: input.pickupPoint,
      contactPerson: input.contactPerson,
      packageType: input.packageType ?? 0,
      packageNumber: input.parcels.length,
      packageWeight,
      service: input.service,
      awbPayment: input.awbPayment ?? 1,
      cashOnDelivery: input.cashOnDelivery ?? 0,
      insuredValue: input.insuredValue ?? 0,
      thirdPartyPickup: input.thirdPartyPickup ?? 0,
      awbRecipient: { personType: 0, ...input.awbRecipient },
      parcels: input.parcels,
      observation: input.observation,
      clientInternalReference: input.clientInternalReference,
      lockerLastMile: input.lockerLastMile,
      currency: input.currency,
    }
    return this.raw("POST", "/api/awb", { form })
  }

  estimateCost(input: SamedayCreateAwbInput): Promise<{ amount: number; currency: string; time: number }> {
    const packageWeight = input.parcels.reduce((s, p) => s + p.weight, 0)
    return this.raw("POST", "/api/awb/estimate-cost", {
      form: {
        pickupPoint: input.pickupPoint,
        contactPerson: input.contactPerson,
        packageType: input.packageType ?? 0,
        packageNumber: input.parcels.length,
        packageWeight,
        service: input.service,
        awbPayment: 1,
        cashOnDelivery: input.cashOnDelivery ?? 0,
        insuredValue: input.insuredValue ?? 0,
        thirdPartyPickup: 0,
        awbRecipient: input.awbRecipient,
        parcels: input.parcels,
      },
    })
  }

  cancelAwb(awb: string) {
    return this.raw("DELETE", `/api/awb/${encodeURIComponent(awb)}`)
  }

  downloadLabel(awb: string, format: "A4" | "A6" = "A6"): Promise<Buffer> {
    return this.raw("GET", `/api/awb/download/${encodeURIComponent(awb)}/${format}`, { binary: true })
  }

  getAwbStatus(awb: string): Promise<{
    expeditionSummary: { delivered: boolean; canceled: boolean; awbNumber: string }
    expeditionHistory: Array<{ statusId: number; status: string; statusLabel: string; statusState: string; statusDate: string; county: string; reason: string }>
    expeditionStatus: { statusId: number; status: string; statusLabel: string; statusState: string; statusDate: string }
  }> {
    return this.raw("GET", `/api/client/awb/${encodeURIComponent(awb)}/status`)
  }

  statusSync(startTimestamp: number, endTimestamp: number) {
    return this.paginate<{
      statusId: number
      status: string
      parcelAwbNumber: string
      statusLabel: string
      statusState: string
      statusDate: string
    }>("/api/client/status-sync", { startTimestamp, endTimestamp })
  }
}

/** PHP-style bracketed form encoding (a[b][0][c]=v) as expected by the API. */
export function toFormBody(data: Record<string, unknown>): string {
  const parts: string[] = []
  const walk = (prefix: string, value: unknown) => {
    if (value === undefined || value === null) return
    if (Array.isArray(value)) {
      value.forEach((v, i) => walk(`${prefix}[${i}]`, v))
    } else if (typeof value === "object") {
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) walk(`${prefix}[${k}]`, v)
    } else {
      parts.push(`${encodeURIComponent(prefix)}=${encodeURIComponent(String(value))}`)
    }
  }
  for (const [k, v] of Object.entries(data)) walk(k, v)
  return parts.join("&")
}

/**
 * Maps Sameday status labels/states to our shipment status.
 * Sameday statusState values include e.g. "Livrat", "Anulat", "Returnat".
 */
export function mapSamedayStatus(s: { status?: string; statusLabel?: string; statusState?: string }) {
  const text = `${s.status ?? ""} ${s.statusLabel ?? ""} ${s.statusState ?? ""}`.toLowerCase()
  if (/anulat|cancel/.test(text)) return "canceled" as const
  if (/returnat|retur|return/.test(text)) return "returned" as const
  if (/livrat|delivered|ridicat/.test(text)) return "delivered" as const
  return "in_transit" as const
}
