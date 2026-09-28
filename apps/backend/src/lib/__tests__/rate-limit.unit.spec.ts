import { authRateLimit, type Counter } from "../security/rate-limit"

function response() {
  const res: any = { setHeader: jest.fn(), status: jest.fn(), json: jest.fn() }
  res.status.mockReturnValue(res)
  return res
}
const req = (email: string) => ({ method: "POST", body: { email }, socket: { remoteAddress: "127.0.0.1" } } as any)

describe("auth abuse protection", () => {
  it("normalizes accounts and stores no raw emails", async () => {
    const counter = jest.fn<ReturnType<Counter>, Parameters<Counter>>().mockResolvedValue({ count: 1, ttl: 1000 })
    const middleware = authRateLimit(counter)
    const next = jest.fn()
    await middleware(req(" ANA@example.com "), response(), next)
    await middleware(req("ana@example.com"), response(), next)
    expect(counter.mock.calls[1][0]).toBe(counter.mock.calls[3][0])
    expect(counter.mock.calls.flat().join(" ")).not.toContain("example.com")
    expect(next).toHaveBeenCalledTimes(2)
  })
  it("rejects exhausted account limits with Retry-After", async () => {
    const counter: Counter = async (key) => ({ count: key.includes("identity") ? 21 : 1, ttl: 45001 })
    const res = response(), next = jest.fn()
    await authRateLimit(counter)(req("ana@example.com"), res, next)
    expect(res.status).toHaveBeenCalledWith(429)
    expect(res.setHeader).toHaveBeenCalledWith("Retry-After", "46")
    expect(next).not.toHaveBeenCalled()
  })
  it("fails closed when the shared counter is unavailable", async () => {
    const res = response(), next = jest.fn()
    await authRateLimit(async () => { throw new Error("offline") })(req("ana@example.com"), res, next)
    expect(res.status).toHaveBeenCalledWith(503)
    expect(next).not.toHaveBeenCalled()
  })
})
