import { romanianAdminVite } from "./src/admin-build/romanian-ui"
import { loadEnv, defineConfig } from "@medusajs/framework/utils"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

const REDIS_URL = process.env.REDIS_URL
const IS_PROD = process.env.NODE_ENV === "production"

if (IS_PROD) {
  for (const key of ["JWT_SECRET", "COOKIE_SECRET", "DATABASE_URL", "INTEGRATIONS_ENCRYPTION_KEY"]) {
    if (!process.env[key]) {
      throw new Error(`[outfithub] Missing required environment variable ${key}`)
    }
  }
}

/**
 * Infrastructure modules switch to Redis-backed implementations when REDIS_URL
 * is present (required in production / multi-instance deployments).
 */
const redisModules = REDIS_URL
  ? [
      {
        resolve: "@medusajs/medusa/caching",
        options: {
          providers: [
            {
              resolve: "@medusajs/caching-redis",
              id: "caching-redis",
              is_default: true,
              options: { redisUrl: process.env.CACHE_REDIS_URL || REDIS_URL },
            },
          ],
        },
      },
      {
        resolve: "@medusajs/medusa/event-bus-redis",
        options: { redisUrl: REDIS_URL },
      },
      {
        resolve: "@medusajs/medusa/workflow-engine-redis",
        options: { redis: { redisUrl: REDIS_URL } },
      },
      {
        resolve: "@medusajs/medusa/locking",
        options: {
          providers: [
            {
              resolve: "@medusajs/medusa/locking-redis",
              id: "locking-redis",
              is_default: true,
              options: { redisUrl: process.env.LOCKING_REDIS_URL || REDIS_URL },
            },
          ],
        },
      },
    ]
  : []

/**
 * File storage: S3-compatible storage (Supabase Storage, Cloudflare R2, AWS S3)
 * when S3_BUCKET is configured, local disk otherwise (development only).
 */
const fileModule = {
  resolve: "@medusajs/medusa/file",
  options: {
    providers: process.env.S3_BUCKET
      ? [
          {
            resolve: "@medusajs/medusa/file-s3",
            id: "s3",
            options: {
              file_url: process.env.S3_FILE_URL,
              access_key_id: process.env.S3_ACCESS_KEY_ID,
              secret_access_key: process.env.S3_SECRET_ACCESS_KEY,
              region: process.env.S3_REGION,
              bucket: process.env.S3_BUCKET,
              endpoint: process.env.S3_ENDPOINT,
              additional_client_config: {
                forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== "false",
              },
            },
          },
        ]
      : [
          {
            resolve: "@medusajs/medusa/file-local",
            id: "local",
            options: {
              backend_url: `${process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"}/static`,
            },
          },
        ],
  },
}

/**
 * Payments: the built-in system provider is always available and is exposed to
 * shoppers as "Cash on delivery" (ramburs). Stripe is enabled when a key exists.
 */
const paymentProviders: Array<Record<string, unknown>> = []
if (process.env.STRIPE_API_KEY) {
  paymentProviders.push({
    resolve: "@medusajs/medusa/payment-stripe",
    id: "stripe",
    options: {
      apiKey: process.env.STRIPE_API_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
      capture: false,
    },
  })
}

/**
 * Notifications: SendGrid when configured, local (logs) otherwise.
 */
const notificationModule = {
  resolve: "@medusajs/medusa/notification",
  options: {
    providers: process.env.SENDGRID_API_KEY
      ? [
          {
            resolve: "@medusajs/medusa/notification-sendgrid",
            id: "sendgrid",
            options: {
              channels: ["email"],
              api_key: process.env.SENDGRID_API_KEY,
              from: process.env.SENDGRID_FROM,
            },
          },
        ]
      : [
          {
            resolve: "@medusajs/medusa/notification-local",
            id: "local",
            options: { channels: ["email"] },
          },
        ],
  },
}

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    databaseDriverOptions: process.env.DATABASE_SSL === "true"
      ? { connection: { ssl: { rejectUnauthorized: false } } }
      : undefined,
    redisUrl: REDIS_URL,
    workerMode: (process.env.MEDUSA_WORKER_MODE as "shared" | "worker" | "server") || "shared",
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
  },
  admin: {
    vite: romanianAdminVite,
    disable: process.env.DISABLE_MEDUSA_ADMIN === "true",
    backendUrl: process.env.MEDUSA_BACKEND_URL,
  },
  modules: [
    ...redisModules,
    fileModule,
    notificationModule,
    {
      resolve: "@medusajs/medusa/payment",
      options: { providers: paymentProviders },
    },
    {
      resolve: "@medusajs/medusa/fulfillment",
      options: {
        providers: [
          { resolve: "@medusajs/medusa/fulfillment-manual", id: "manual" },
          { resolve: "./src/modules/sameday-fulfillment", id: "sameday" },
        ],
      },
    },
    { resolve: "./src/modules/content" },
    { resolve: "./src/modules/seo" },
    { resolve: "./src/modules/wishlist" },
    {
      resolve: "./src/modules/integrations",
      options: { encryptionKey: process.env.INTEGRATIONS_ENCRYPTION_KEY },
    },
  ],
})

