import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createApiKeysWorkflow, linkSalesChannelsToApiKeyWorkflow, createSalesChannelsWorkflow } from "@medusajs/medusa/core-flows"

jest.setTimeout(Number(process.env.INTEGRATION_TEST_TIMEOUT_MS) || 120 * 1000)

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    let storeHeaders: Record<string, string>
    let adminHeaders: Record<string, string>

    beforeEach(async () => {
      const container = getContainer()
      const { result: [channel] } = await createSalesChannelsWorkflow(container).run({ input: { salesChannelsData: [{ name: "Web" }] } })
      const { result: [key] } = await createApiKeysWorkflow(container).run({
        input: { api_keys: [{ title: "Storefront", type: "publishable", created_by: "" }] },
      })
      await linkSalesChannelsToApiKeyWorkflow(container).run({ input: { id: key.id, add: [channel.id] } })
      storeHeaders = { "x-publishable-api-key": (key as any).token }

      const userModule = container.resolve(Modules.USER)
      const authModule = container.resolve(Modules.AUTH)
      const user = await userModule.createUsers({ email: "admin@test.ro" })
      const identity = await authModule.createAuthIdentities({
        provider_identities: [{ provider: "emailpass", entity_id: "admin@test.ro", provider_metadata: { password: "x" } }],
        app_metadata: { user_id: user.id },
      })
      const jwt = require("jsonwebtoken").sign(
        { actor_id: user.id, actor_type: "user", auth_identity_id: identity.id, app_metadata: { user_id: user.id } },
        "test",
        { expiresIn: "1d" }
      )
      adminHeaders = { authorization: `Bearer ${jwt}` }
      void container.resolve(ContainerRegistrationKeys.LOGGER)
    })

    describe("authentication limits", () => {
      it("limits repeated attempts for the same normalized account", async () => {
        const email = `rate-${Date.now()}@example.com`
        for (let i = 0; i < 20; i++) {
          const result = await api.post("/auth/customer/emailpass", { email, password: "wrong-password" }).catch((e) => e.response)
          expect(result.status).toBe(401)
        }
        const blocked = await api.post("/auth/customer/emailpass", { email: email.toUpperCase(), password: "wrong-password" }).catch((e) => e.response)
        expect(blocked.status).toBe(429)
        expect(Number(blocked.headers["retry-after"])).toBeGreaterThan(0)
      })
    })

    describe("store content", () => {
      it("returns default content, public tracking config and feature flags", async () => {
        const res = await api.get("/store/content", { headers: storeHeaders })
        expect(res.status).toBe(200)
        expect(res.data.content.company.trade_name).toBe("OutfitHub")
        expect(res.data.content.shipping.returns_days).toBe(30)
        expect(res.data.features.easybox).toBe(false)
        expect(JSON.stringify(res.data)).not.toMatch(/secret|password|access_token/i)
      })

      it("returns 404 for unknown pages", async () => {
        const res = await api.get("/store/content/pages/nope", { headers: storeHeaders }).catch((e) => e.response)
        expect(res.status).toBe(404)
      })
    })

    describe("wishlist", () => {
      it("requires customer authentication", async () => {
        const res = await api.get("/store/customers/me/wishlist", { headers: storeHeaders }).catch((e) => e.response)
        expect(res.status).toBe(401)
      })
    })

    describe("sameday lockers", () => {
      it("reports unavailable when Sameday is not configured", async () => {
        const res = await api.get("/store/sameday/lockers?q=cluj", { headers: storeHeaders })
        expect(res.data).toEqual({ available: false, lockers: [], count: 0 })
      })

      it("validates query parameters", async () => {
        const res = await api.get("/store/sameday/lockers?lat=999", { headers: storeHeaders }).catch((e) => e.response)
        expect(res.status).toBe(400)
      })
    })

    describe("admin integrations", () => {
      it("is protected", async () => {
        const res = await api.get("/admin/integrations").catch((e) => e.response)
        expect(res.status).toBe(401)
      })

      it("stores secrets encrypted and never returns them", async () => {
        const save = await api.post(
          "/admin/integrations/meta",
          { enabled: true, config: { pixel_id: "123" }, secrets: { access_token: "EAAB-super-secret-token" } },
          { headers: adminHeaders }
        )
        expect(save.status).toBe(200)
        expect(JSON.stringify(save.data)).not.toContain("super-secret")
        expect(save.data.integration.secrets.access_token).toMatch(/^••••/)
        // Verification runs against Meta; without network/valid token it must not claim success.
        expect(save.data.integration.status).not.toBe("connected")

        const pub = await api.get("/store/content", { headers: storeHeaders })
        expect(pub.data.tracking.meta).toEqual({ pixel_id: "123" })
      })

      it("marks incomplete configuration as not configured", async () => {
        const res = await api.post("/admin/integrations/sameday", { enabled: true, config: { environment: "demo" } }, { headers: adminHeaders })
        expect(res.data.integration.status).toBe("not_configured")
        expect(res.data.test.status).toBe("not_configured")
      })

      it("rejects unknown providers", async () => {
        const res = await api.post("/admin/integrations/nope", { enabled: true }, { headers: adminHeaders }).catch((e) => e.response)
        expect(res.status).toBe(404)
      })
    })

    describe("admin content", () => {
      it("sanitizes content updates to the known shape", async () => {
        const res = await api.post(
          "/admin/content/values/shipping",
          { free_shipping_threshold: 250, injected: "x", delivery_estimate: 5 },
          { headers: adminHeaders }
        )
        expect(res.data.value.free_shipping_threshold).toBe(250)
        expect(res.data.value.injected).toBeUndefined()
        expect(typeof res.data.value.delivery_estimate).toBe("string")
      })
    })
  },
})
