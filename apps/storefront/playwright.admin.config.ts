import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./tests/admin",
  timeout: 300_000,
  expect: { timeout: 30_000 },
  workers: 1,
  reporter: "list",
  use: {
    baseURL: process.env.ADMIN_BASE_URL || "http://localhost:9000",
    locale: "ro-RO",
    actionTimeout: 30_000,
    navigationTimeout: 45_000,
    trace: "retain-on-failure",
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
  },
})
