import { redactSecrets } from "../integrations/redact"
import { requestJson } from "../providers/http"

describe("provider credential redaction", () => {
  it("removes raw, URL-encoded and nested credentials", () => {
    expect(redactSecrets("Rejected key/a and key%2Fa and private-key", { token: "key/a", account: JSON.stringify({ private_key: "private-key" }) })).toBe("Rejected [redacted] and [redacted] and [redacted]")
  })
  it("does not expose a bearer token echoed by Meta", async () => {
    const fetchImpl = (async () => new Response(JSON.stringify({ error: { message: "Malformed access token EAAB-secret-token" } }), { status: 400 })) as typeof fetch
    await expect(requestJson("meta", "https://graph.facebook.com/v24.0/test", { fetchImpl, headers: { Authorization: "Bearer EAAB-secret-token" } })).rejects.toMatchObject({ message: "Malformed access token [redacted]" })
  })
})
