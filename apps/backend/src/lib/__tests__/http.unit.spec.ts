import { requestJson } from "../providers/http"

describe("provider request boundaries", () => {
  it("times out while consuming a response body", async () => {
    const fetchImpl = jest.fn(async (_url, init) => ({
      ok: true,
      text: () => new Promise((_resolve, reject) => {
        init.signal.addEventListener("abort", () => reject(new Error("Body timeout")))
      }),
    })) as unknown as typeof fetch
    await expect(requestJson("test", "https://example.com", { fetchImpl, timeoutMs: 10 })).rejects.toMatchObject({ kind: "network" })
  })
  it("preserves provider rejection classifications", async () => {
    const fetchImpl = jest.fn(async () => new Response(JSON.stringify({ message: "Invalid token" }), { status: 401 })) as unknown as typeof fetch
    await expect(requestJson("test", "https://example.com", { fetchImpl })).rejects.toMatchObject({ kind: "authentication", message: "Invalid token" })
  })
  it("preserves caller cancellation", async () => {
    const controller = new AbortController()
    controller.abort()
    const fetchImpl = jest.fn(async (_url, init) => {
      if (init.signal.aborted) throw new Error("cancelled")
      return new Response("{}")
    }) as unknown as typeof fetch
    await expect(requestJson("test", "https://example.com", { fetchImpl, signal: controller.signal })).rejects.toMatchObject({ kind: "network" })
  })
})
