import { z } from "@medusajs/framework/zod"

export const PostWishlistSchema = z.object({
  product_ids: z.array(z.string().min(1).max(64)).min(1).max(100),
})
export type PostWishlistBody = z.infer<typeof PostWishlistSchema>

export const GetLockersSchema = z.object({
  q: z.string().max(100).optional(),
  city: z.string().max(80).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
})
export type GetLockersQuery = z.infer<typeof GetLockersSchema>

export const PostIntegrationSchema = z.object({
  enabled: z.boolean().optional(),
  config: z.record(z.string(), z.union([z.string().max(5000), z.number(), z.boolean(), z.null()])).optional(),
  secrets: z.record(z.string(), z.union([z.string().max(20000), z.null()])).optional(),
})
export type PostIntegrationBody = z.infer<typeof PostIntegrationSchema>

export const PostChannelSyncSchema = z.object({
  product_ids: z.array(z.string()).max(1000).optional(),
  scope: z.enum(["products", "failed", "all"]).default("products"),
  providers: z.array(z.enum(["google_merchant", "meta", "tiktok_shop"])).optional(),
})
export type PostChannelSyncBody = z.infer<typeof PostChannelSyncSchema>

export const PostContentValueSchema = z.record(z.string(), z.unknown())

export const PostContentPageSchema = z.object({
  handle: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, digits and dashes"),
  title: z.string().min(1).max(200),
  body: z.string().max(200000),
  seo_title: z.string().max(200).nullish(),
  seo_description: z.string().max(400).nullish(),
  is_legal: z.boolean().optional(),
  published: z.boolean().optional(),
})
export type PostContentPageBody = z.infer<typeof PostContentPageSchema>

export const PostSeoSchema = z.object({
  meta_title: z.string().max(120).nullish(),
  meta_description: z.string().max(320).nullish(),
  og_image: z.string().url().max(2000).nullish().or(z.literal("")),
  canonical_path: z
    .string()
    .max(300)
    .regex(/^\/[^\s]*$/, "Must be a path starting with /")
    .nullish()
    .or(z.literal("")),
  image_alts: z.record(z.string(), z.string().max(200)).nullish(),
  noindex: z.boolean().nullish(),
})
export type PostSeoBody = z.infer<typeof PostSeoSchema>

export const PostSamedayShipmentSchema = z.object({
  order_id: z.string(),
  fulfillment_id: z.string(),
})
export type PostSamedayShipmentBody = z.infer<typeof PostSamedayShipmentSchema>
