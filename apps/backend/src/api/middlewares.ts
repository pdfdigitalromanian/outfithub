import { validateLockerSelection } from "../lib/shipping/validate-locker"
import { authRateLimit } from "../lib/security/rate-limit"
import {
  allowFields,
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
    { matcher: /^\/store\/carts\/[^/]+\/shipping-methods\/?$/, method: ["POST"], middlewares: [validateLockerSelection] },
    { matcher: /^\/auth(?:\/|$)/, method: ["POST"], middlewares: [authRateLimit()] },
    {
      // Storefront listings/PDP need category membership and the option title
      // of each variant option value (for color/size pickers and filters).
      matcher: "/store/products*",
      middlewares: [
        allowFields(
          "categories",
          "categories.id",
          "categories.handle",
          "categories.name",
          "variants.options.option",
          "variants.options.option.id",
          "variants.options.option.title",
          "variants.options.option_id"
        ),
      ],
    },
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
