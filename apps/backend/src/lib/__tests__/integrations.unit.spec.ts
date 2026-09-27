import crypto from "crypto"
import { decryptJson, deriveKey, encryptJson, maskSecret } from "../integrations/crypto"
import { INTEGRATIONS, missingRequiredFields } from "../integrations/registry"
import { ProviderError } from "../providers/http"

describe("credential encryption", () => {
  const key = deriveKey(crypto.randomBytes(32).toString("hex"))

  it("round-trips secrets with AES-256-GCM and random IVs", () => {
    const a = encryptJson({ token: "s3cret" }, key)
    const b = encryptJson({ token: "s3cret" }, key)
    expect(a).not.toEqual(b)
    expect(a).not.toContain("s3cret")
    expect(decryptJson(a, key)).toEqual({ token: "s3cret" })
  })

  it("rejects tampered ciphertext", () => {
    const enc = encryptJson({ token: "x" }, key).split(".")
    enc[3] = Buffer.from("tampered").toString("base64")
    expect(() => decryptJson(enc.join("."), key)).toThrow()
  })

  it("requires a key", () => {
    expect(() => deriveKey(undefined)).toThrow(/INTEGRATIONS_ENCRYPTION_KEY/)
    expect(deriveKey("passphrase")).toHaveLength(32)
  })

  it("masks secrets", () => {
    expect(maskSecret("abcdefghijkl")).toBe("••••ijkl")
    expect(maskSecret("")).toBeNull()
  })
})

describe("integration registry", () => {
  it("never marks secret fields as public", () => {
    for (const def of Object.values(INTEGRATIONS)) {
      for (const f of def.fields) expect(f.secret && f.public).toBeFalsy()
    }
  })

  it("reports missing required fields", () => {
    expect(missingRequiredFields("sameday", { environment: "demo" }, { username: "u" })).toEqual(["password"])
  })

  it("maps provider errors to connection statuses", () => {
    expect(new ProviderError("x", "authentication", "m").connectionStatus).toBe("authorization_required")
    expect(new ProviderError("x", "not_configured", "m").connectionStatus).toBe("not_configured")
    expect(new ProviderError("x", "server", "m").retryable).toBe(true)
    expect(new ProviderError("x", "bad_request", "m").retryable).toBe(false)
  })
})
