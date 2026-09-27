import {
  defineMiddlewares,
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework/http"
import {
  GetLockersSchema,
  PostChannelSyncSchema,
  PostContentPageSchema,
  PostContentValueSchema,
  PostIntegrationSchema,
  PostSamedayShipmentSchema,
  PostSeoSchema,
  PostWishlistSchema,
} from "./validators"

export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/customers/me/wishlist",
      method: ["POST"],
      middlewares: [validateAndTransformBody(PostWishlistSchema)],
    },
    {
      matcher: "/store/sameday/lockers",
      method: ["GET"],
      middlewares: [validateAndTransformQuery(GetLockersSchema, {})],
    },
    {
      matcher: "/admin/integrations/:provider",
      method: ["POST"],
      middlewares: [validateAndTransformBody(PostIntegrationSchema)],
    },
    {
      matcher: "/admin/channels/sync",
      method: ["POST"],
      middlewares: [validateAndTransformBody(PostChannelSyncSchema)],
    },
    {
      matcher: "/admin/content/values/:key",
      method: ["POST"],
      middlewares: [validateAndTransformBody(PostContentValueSchema)],
    },
    {
      matcher: "/admin/content/pages",
      method: ["POST"],
      middlewares: [validateAndTransformBody(PostContentPageSchema)],
    },
    {
      matcher: "/admin/content/pages/:id",
      method: ["POST"],
      middlewares: [validateAndTransformBody(PostContentPageSchema.partial())],
    },
    {
      matcher: "/admin/seo/:type/:id",
      method: ["POST"],
      middlewares: [validateAndTransformBody(PostSeoSchema)],
    },
    {
      matcher: "/admin/sameday/shipments",
      method: ["POST"],
      middlewares: [validateAndTransformBody(PostSamedayShipmentSchema)],
    },
    {
      matcher: "/webhooks/*",
      bodyParser: { preserveRawBody: true },
    },
  ],
})
