import { MedusaError, MedusaService } from "@medusajs/framework/utils"
import IntegrationConnection from "./models/integration-connection"
import ChannelSync from "./models/channel-sync"
import IntegrationLog from "./models/integration-log"
import SamedayLocker from "./models/sameday-locker"
import SamedayShipment from "./models/sameday-shipment"
import { decryptJson, deriveKey, encryptJson, maskSecret } from "../../lib/integrations/crypto"
import {
  INTEGRATIONS,
  IntegrationProvider,
  isIntegrationProvider,
  missingRequiredFields,
} from "../../lib/integrations/registry"

type ModuleOptions = { encryptionKey?: string }

export type ConnectionStatus = "not_configured" | "authorization_required" | "connected" | "error"

export type ResolvedIntegration = {
  provider: IntegrationProvider
  enabled: boolean
  status: ConnectionStatus
  config: Record<string, unknown>
  secrets: Record<string, unknown>
}

class IntegrationsModuleService extends MedusaService({
  IntegrationConnection,
  ChannelSync,
  IntegrationLog,
  SamedayLocker,
  SamedayShipment,
}) {
  protected readonly options_: ModuleOptions
  private key_: Buffer | null = null

  constructor(container: Record<string, unknown>, options: ModuleOptions = {}) {
    super(...arguments)
    this.options_ = options
  }

  private key(): Buffer {
    if (!this.key_) {
      this.key_ = deriveKey(this.options_.encryptionKey || process.env.INTEGRATIONS_ENCRYPTION_KEY)
    }
    return this.key_
  }

  private assertProvider(provider: string): asserts provider is IntegrationProvider {
    if (!isIntegrationProvider(provider)) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, `Unknown integration provider: ${provider}`)
    }
  }

  private async findConnection(provider: IntegrationProvider) {
    const [conn] = await this.listIntegrationConnections({ provider })
    return conn ?? null
  }

  /** Full configuration including decrypted secrets. Server-side use only. */
  async resolveIntegration(provider: IntegrationProvider): Promise<ResolvedIntegration> {
    const conn = await this.findConnection(provider)
    const defaults = Object.fromEntries(
      INTEGRATIONS[provider].fields
        .filter((f) => !f.secret && f.default !== undefined)
        .map((f) => [f.key, f.default])
    )
    if (!conn) {
      return { provider, enabled: false, status: "not_configured", config: defaults, secrets: {} }
    }
    return {
      provider,
      enabled: conn.enabled,
      status: conn.status as ConnectionStatus,
      config: { ...defaults, ...((conn.config as Record<string, unknown>) ?? {}) },
      secrets: decryptJson(conn.secrets_encrypted, this.key()),
    }
  }

  /** Safe representation for the admin UI: secrets are masked, never returned. */
  async describeIntegration(provider: IntegrationProvider) {
    const def = INTEGRATIONS[provider]
    const conn = await this.findConnection(provider)
    const resolved = await this.resolveIntegration(provider)
    const secretFields = def.fields.filter((f) => f.secret)
    return {
      ...def,
      enabled: resolved.enabled,
      status: conn?.status ?? "not_configured",
      status_message: conn?.status_message ?? null,
      last_checked_at: conn?.last_checked_at ?? null,
      config: resolved.config,
      secrets: Object.fromEntries(secretFields.map((f) => [f.key, maskSecret(resolved.secrets[f.key])])),
      missing_fields: missingRequiredFields(provider, resolved.config, resolved.secrets),
    }
  }

  async describeAll() {
    return Promise.all(Object.keys(INTEGRATIONS).map((p) => this.describeIntegration(p as IntegrationProvider)))
  }

  /**
   * Saves configuration. Secret fields left empty keep their stored value; a
   * secret explicitly set to null is removed.
   */
  async saveIntegration(
    provider: string,
    input: { enabled?: boolean; config?: Record<string, unknown>; secrets?: Record<string, unknown> }
  ) {
    this.assertProvider(provider)
    const def = INTEGRATIONS[provider]
    const current = await this.resolveIntegration(provider)
    const allowedConfig = new Set(def.fields.filter((f) => !f.secret).map((f) => f.key))
    const allowedSecrets = new Set(def.fields.filter((f) => f.secret).map((f) => f.key))

    const config = { ...current.config }
    for (const [k, v] of Object.entries(input.config ?? {})) {
      if (allowedConfig.has(k)) {
        config[k] = typeof v === "string" ? v.trim() : v
      }
    }
    const secrets: Record<string, unknown> = { ...current.secrets }
    for (const [k, v] of Object.entries(input.secrets ?? {})) {
      if (!allowedSecrets.has(k) && !k.startsWith("_")) {
        continue
      }
      if (v === null) {
        delete secrets[k]
      } else if (typeof v === "string" && v.trim() !== "") {
        secrets[k] = v.trim()
      } else if (typeof v !== "string" && v !== undefined) {
        secrets[k] = v
      }
    }

    const credentialsChanged = Object.values(input.secrets ?? {}).some((v) => v !== undefined && v !== "")
    if (credentialsChanged) {
      // Cached provider tokens belong to the previous credentials.
      for (const k of Object.keys(secrets)) if (k.startsWith("_token")) delete secrets[k]
    }
    const missing = missingRequiredFields(provider, config, secrets)
    const conn = await this.findConnection(provider)
    let status: ConnectionStatus = (conn?.status as ConnectionStatus) ?? "not_configured"
    let status_message = conn?.status_message ?? null
    if (missing.length) {
      status = "not_configured"
      status_message = `Missing: ${missing.join(", ")}`
    } else if (status === "not_configured" || credentialsChanged) {
      status = def.oauth && !secrets["access_token"] ? "authorization_required" : "error"
      status_message =
        status === "authorization_required"
          ? "Credentials saved. Authorize the seller account to finish the connection."
          : "Credentials saved but not verified yet. Run “Test connection”."
    }

    const data = {
      provider,
      enabled: input.enabled ?? conn?.enabled ?? false,
      config,
      secrets_encrypted: encryptJson(secrets, this.key()),
      status,
      status_message,
    }
    if (conn) {
      await this.updateIntegrationConnections({ id: conn.id, ...data })
    } else {
      await this.createIntegrationConnections(data)
    }
    return this.describeIntegration(provider)
  }

  /** Merges internal secret values (e.g. OAuth tokens) without touching config. */
  async storeSecrets(provider: IntegrationProvider, patch: Record<string, unknown>) {
    const current = await this.resolveIntegration(provider)
    const conn = await this.findConnection(provider)
    const secrets = { ...current.secrets, ...patch }
    if (conn) {
      await this.updateIntegrationConnections({ id: conn.id, secrets_encrypted: encryptJson(secrets, this.key()) })
    } else {
      await this.createIntegrationConnections({
        provider,
        config: current.config,
        secrets_encrypted: encryptJson(secrets, this.key()),
      })
    }
  }

  async setConfigValues(provider: IntegrationProvider, patch: Record<string, unknown>) {
    const conn = await this.findConnection(provider)
    if (!conn) {
      return
    }
    await this.updateIntegrationConnections({
      id: conn.id,
      config: { ...((conn.config as Record<string, unknown>) ?? {}), ...patch },
    })
  }

  async setStatus(provider: IntegrationProvider, status: ConnectionStatus, message: string | null) {
    const conn = await this.findConnection(provider)
    if (!conn) {
      return
    }
    await this.updateIntegrationConnections({
      id: conn.id,
      status,
      status_message: message ? message.slice(0, 2000) : null,
      last_checked_at: new Date(),
    })
  }

  async log(provider: string, level: "info" | "warn" | "error", message: string, context?: Record<string, unknown>) {
    await this.createIntegrationLogs({ provider, level, message: message.slice(0, 4000), context: context ?? null })
  }

  /** Public (non-secret) values that the storefront may use, e.g. pixel IDs. */
  async publicConfig() {
    const out: Record<string, Record<string, unknown>> = {}
    for (const provider of Object.keys(INTEGRATIONS) as IntegrationProvider[]) {
      const def = INTEGRATIONS[provider]
      const publicFields = def.fields.filter((f) => f.public && !f.secret)
      if (!publicFields.length) {
        continue
      }
      const conn = await this.findConnection(provider)
      if (!conn?.enabled) {
        continue
      }
      const config = (conn.config as Record<string, unknown>) ?? {}
      out[provider] = Object.fromEntries(publicFields.map((f) => [f.key, config[f.key] ?? null]))
    }
    return out
  }
}

export default IntegrationsModuleService
