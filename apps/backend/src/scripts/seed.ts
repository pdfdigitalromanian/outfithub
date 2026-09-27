import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules, ProductStatus } from "@medusajs/framework/utils"
import {
  createApiKeysWorkflow,
  createCollectionsWorkflow,
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows"
import { CONTENT_MODULE } from "../modules/content"
import type ContentModuleService from "../modules/content/service"
import { DEFAULT_PAGES } from "../lib/content/legal-pages"
import { applyCategorySeo, applyCollectionSeo, applyProductSeo } from "../lib/seo/apply"

/**
 * Seeds a Romanian store: RON region with VAT-inclusive prices (21% standard
 * VAT since 1 Aug 2025), Sameday home + Easybox shipping (free over 300 lei),
 * a demo catalog (clearly demo data — replace with your own products) and the
 * default legal pages. Safe to run once on an empty database.
 */
const IMG = "https://medusa-public-images.s3.eu-west-1.amazonaws.com"
const SIZES = ["S", "M", "L", "XL"]

export default async function seed({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const fulfillmentModule = container.resolve(Modules.FULFILLMENT)
  const salesChannelModule = container.resolve(Modules.SALES_CHANNEL)
  const storeModule = container.resolve(Modules.STORE)
  const regionModule = container.resolve(Modules.REGION)
  const content = container.resolve<ContentModuleService>(CONTENT_MODULE)

  // Legal/static pages are seeded independently so they can be restored later.
  const existingPages = await content.listContentPages({}, { select: ["handle"] })
  const have = new Set(existingPages.map((p) => p.handle))
  const missingPages = DEFAULT_PAGES.filter((p) => !have.has(p.handle))
  if (missingPages.length) {
    await content.createContentPages(missingPages.map((p) => ({ ...p, published: true })))
    logger.info(`Seeded ${missingPages.length} content page(s).`)
  }

  if ((await regionModule.listRegions({ name: "România" })).length) {
    logger.info("Store already seeded – skipping commerce data.")
    return
  }

  logger.info("Seeding store…")
  const [store] = await storeModule.listStores()
  let [salesChannel] = await salesChannelModule.listSalesChannels({ name: "OutfitHub Web" })
  if (!salesChannel) {
    const { result } = await createSalesChannelsWorkflow(container).run({
      input: { salesChannelsData: [{ name: "OutfitHub Web", description: "Magazinul online" }] },
    })
    salesChannel = result[0]
  }

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        name: "OutfitHub",
        supported_currencies: [{ currency_code: "ron", is_default: true, is_tax_inclusive: true }],
        default_sales_channel_id: salesChannel.id,
      },
    },
  })

  const { result: regions } = await createRegionsWorkflow(container).run({
    input: {
      regions: [
        {
          name: "România",
          currency_code: "ron",
          countries: ["ro"],
          automatic_taxes: true,
          is_tax_inclusive: true,
          payment_providers: [
            "pp_system_default",
            ...(process.env.STRIPE_API_KEY ? ["pp_stripe_stripe"] : []),
          ],
        },
      ],
    },
  })
  const region = regions[0]

  await createTaxRegionsWorkflow(container).run({
    input: [
      {
        country_code: "ro",
        provider_id: "tp_system",
        default_tax_rate: { name: "TVA standard", rate: 21, code: "TVA21" },
      },
    ],
  })

  const { result: locations } = await createStockLocationsWorkflow(container).run({
    input: {
      locations: [{ name: "Depozit București", address: { city: "București", country_code: "RO", address_1: "" } }],
    },
  })
  const location = locations[0]
  await updateStoresWorkflow(container).run({
    input: { selector: { id: store.id }, update: { default_location_id: location.id } },
  })

  for (const provider of ["manual_manual", "sameday_sameday"]) {
    await link.create({
      [Modules.STOCK_LOCATION]: { stock_location_id: location.id },
      [Modules.FULFILLMENT]: { fulfillment_provider_id: provider },
    })
  }

  let [profile] = await fulfillmentModule.listShippingProfiles({ type: "default" })
  if (!profile) {
    const { result } = await createShippingProfilesWorkflow(container).run({
      input: { data: [{ name: "Standard", type: "default" }] },
    })
    profile = result[0]
  }

  const fulfillmentSet = await fulfillmentModule.createFulfillmentSets({
    name: "Livrare România",
    type: "shipping",
    service_zones: [{ name: "România", geo_zones: [{ country_code: "ro", type: "country" }] }],
  })
  await link.create({
    [Modules.STOCK_LOCATION]: { stock_location_id: location.id },
    [Modules.FULFILLMENT]: { fulfillment_set_id: fulfillmentSet.id },
  })

  const zoneId = fulfillmentSet.service_zones[0].id
  const storeRules = [
    { attribute: "enabled_in_store", value: "true", operator: "eq" as const },
    { attribute: "is_return", value: "false", operator: "eq" as const },
  ]
  const freeOver = (amount: number) => [
    { region_id: region.id, amount },
    { currency_code: "ron", amount },
    { region_id: region.id, amount: 0, rules: [{ attribute: "item_total", operator: "gte", value: 300 }] },
  ]
  await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name: "Curier Sameday la adresă",
        price_type: "flat",
        provider_id: "sameday_sameday",
        service_zone_id: zoneId,
        shipping_profile_id: profile.id,
        data: { id: "sameday-home" },
        type: { label: "Curier la adresă", description: "Livrare în 1–2 zile lucrătoare.", code: "sameday-home" },
        prices: freeOver(19.99) as any,
        rules: storeRules,
      },
      {
        name: "Sameday Easybox",
        price_type: "flat",
        provider_id: "sameday_sameday",
        service_zone_id: zoneId,
        shipping_profile_id: profile.id,
        data: { id: "sameday-easybox" },
        type: { label: "Easybox", description: "Ridici din locker, non-stop.", code: "sameday-easybox" },
        prices: freeOver(14.99) as any,
        rules: storeRules,
      },
      {
        name: "Ridicare personală",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: zoneId,
        shipping_profile_id: profile.id,
        type: { label: "Ridicare personală", description: "Din showroom, după confirmare.", code: "pickup" },
        prices: [{ region_id: region.id, amount: 0 }, { currency_code: "ron", amount: 0 }],
        rules: storeRules,
      },
    ],
  })

  await linkSalesChannelsToStockLocationWorkflow(container).run({ input: { id: location.id, add: [salesChannel.id] } })

  const { data: keys } = await query.graph({ entity: "api_key", fields: ["id", "token"], filters: { type: "publishable" } })
  let apiKey = keys[0] as { id: string; token: string } | undefined
  if (!apiKey) {
    const { result } = await createApiKeysWorkflow(container).run({
      input: { api_keys: [{ title: "Storefront", type: "publishable", created_by: "" }] },
    })
    apiKey = result[0] as any
  }
  await linkSalesChannelsToApiKeyWorkflow(container).run({ input: { id: apiKey!.id, add: [salesChannel.id] } })

  logger.info("Seeding catalog (demo data)…")
  const { result: categories } = await createProductCategoriesWorkflow(container).run({
    input: {
      product_categories: [
        { name: "Tricouri", handle: "tricouri", is_active: true, description: "Tricouri din bumbac greu, croieli relaxate și culori esențiale." },
        { name: "Hanorace", handle: "hanorace", is_active: true, description: "Hanorace din molton periat, confortabile de dimineața până seara." },
        { name: "Pantaloni", handle: "pantaloni", is_active: true, description: "Pantaloni jogger și pantaloni scurți pentru zilele relaxate." },
      ],
    },
  })
  const cat = (h: string) => categories.find((c) => c.handle === h)!.id

  const { result: collections } = await createCollectionsWorkflow(container).run({
    input: {
      collections: [
        { title: "Esențiale", handle: "esentiale", metadata: { description: "Piesele de bază pe care le porți în fiecare zi." } },
        { title: "Lounge", handle: "lounge", metadata: { description: "Confort pentru acasă și pentru drumuri scurte." } },
      ],
    },
  })
  const col = (h: string) => collections.find((c) => c.handle === h)!.id

  const sizeVariants = (base: string, color: string, colorCode: string, price: number) =>
    SIZES.map((size) => ({
      title: `${color} / ${size}`,
      sku: `${base}-${colorCode}-${size}`,
      options: { Culoare: color, Mărime: size },
      manage_inventory: true,
      prices: [{ amount: price, currency_code: "ron" }],
    }))

  const common = {
    status: ProductStatus.PUBLISHED,
    shipping_profile_id: profile.id,
    sales_channels: [{ id: salesChannel.id }],
    weight: 400,
  }

  await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          ...common,
          title: "Tricou Essential",
          subtitle: "Bumbac 100%, 220 g/m²",
          description:
            "Tricoul pe care îl porți cel mai des. Bumbac organic de 220 g/m², guler dublu care își păstrează forma și o croială dreaptă, ușor lejeră. Prespălat, ca să nu se strângă la primul spălat.",
          handle: "tricou-essential",
          material: "100% bumbac organic",
          collection_id: col("esentiale"),
          category_ids: [cat("tricouri")],
          thumbnail: `${IMG}/tee-black-front.png`,
          images: ["tee-black-front", "tee-black-back", "tee-white-front", "tee-white-back"].map((i) => ({ url: `${IMG}/${i}.png` })),
          options: [
            { title: "Culoare", values: ["Negru", "Alb"] },
            { title: "Mărime", values: SIZES },
          ],
          variants: [...sizeVariants("OH-TEE", "Negru", "BLK", 129), ...sizeVariants("OH-TEE", "Alb", "WHT", 129)],
        },
        {
          ...common,
          title: "Tricou Heavyweight Alb",
          subtitle: "Bumbac 280 g/m², croială boxy",
          description:
            "Material dens, cu tușeu uscat, și o croială boxy cu umeri căzuți. Arată bine singur, dar și sub o cămașă descheiată. Tiv dublu la mâneci și la bază.",
          handle: "tricou-heavyweight-alb",
          material: "100% bumbac",
          collection_id: col("esentiale"),
          category_ids: [cat("tricouri")],
          thumbnail: `${IMG}/tee-white-front.png`,
          images: ["tee-white-front", "tee-white-back"].map((i) => ({ url: `${IMG}/${i}.png` })),
          options: [
            { title: "Culoare", values: ["Alb"] },
            { title: "Mărime", values: SIZES },
          ],
          variants: sizeVariants("OH-HVY", "Alb", "WHT", 149),
        },
        {
          ...common,
          title: "Hanorac Vintage",
          subtitle: "Molton periat, efect spălat",
          description:
            "Hanorac fără glugă din molton periat de 400 g/m², vopsit în piesă pentru un aspect ușor decolorat. Manșete și bandă elastică în coaste, umeri coborâți, siluetă relaxată.",
          handle: "hanorac-vintage",
          material: "80% bumbac, 20% poliester reciclat",
          collection_id: col("lounge"),
          category_ids: [cat("hanorace")],
          thumbnail: `${IMG}/sweatshirt-vintage-front.png`,
          images: ["sweatshirt-vintage-front", "sweatshirt-vintage-back"].map((i) => ({ url: `${IMG}/${i}.png` })),
          options: [
            { title: "Culoare", values: ["Grafit"] },
            { title: "Mărime", values: SIZES },
          ],
          variants: sizeVariants("OH-SWT", "Grafit", "GRF", 289),
        },
        {
          ...common,
          title: "Pantaloni Jogger",
          subtitle: "Talie elastică, buzunare adânci",
          description:
            "Pantaloni jogger din molton moale, cu șnur în talie, buzunare laterale adânci și manșete la gleznă. Suficient de îngrijiți pentru o cafea în oraș.",
          handle: "pantaloni-jogger",
          material: "80% bumbac, 20% poliester",
          collection_id: col("lounge"),
          category_ids: [cat("pantaloni")],
          thumbnail: `${IMG}/sweatpants-gray-front.png`,
          images: ["sweatpants-gray-front", "sweatpants-gray-back"].map((i) => ({ url: `${IMG}/${i}.png` })),
          options: [
            { title: "Culoare", values: ["Gri melanj"] },
            { title: "Mărime", values: SIZES },
          ],
          variants: sizeVariants("OH-JOG", "Gri melanj", "GRY", 249),
        },
        {
          ...common,
          title: "Pantaloni scurți Vintage",
          subtitle: "Lungime deasupra genunchiului",
          description:
            "Pantaloni scurți din același molton ca hanoracul Vintage. Talie elastică cu șnur, buzunare laterale și un buzunar la spate. Perfecți pentru vară și sală.",
          handle: "pantaloni-scurti-vintage",
          material: "80% bumbac, 20% poliester reciclat",
          collection_id: col("lounge"),
          category_ids: [cat("pantaloni")],
          thumbnail: `${IMG}/shorts-vintage-front.png`,
          images: ["shorts-vintage-front", "shorts-vintage-back"].map((i) => ({ url: `${IMG}/${i}.png` })),
          options: [
            { title: "Culoare", values: ["Grafit"] },
            { title: "Mărime", values: SIZES },
          ],
          variants: sizeVariants("OH-SRT", "Grafit", "GRF", 169),
        },
      ],
    },
  })

  const { data: items } = await query.graph({ entity: "inventory_item", fields: ["id", "sku"] })
  await createInventoryLevelsWorkflow(container).run({
    input: {
      inventory_levels: items.map((i: any) => ({
        location_id: location.id,
        inventory_item_id: i.id,
        // One demo SKU is sold out to showcase out-of-stock handling.
        stocked_quantity: i.sku === "OH-SRT-GRF-XL" ? 0 : 40,
      })),
    },
  })

  logger.info("Generating SEO…")
  const { data: products } = await query.graph({ entity: "product", fields: ["id"] })
  for (const p of products) await applyProductSeo(container, p.id)
  for (const c of collections) await applyCollectionSeo(container, c.id)
  for (const c of categories) await applyCategorySeo(container, c.id)

  logger.info("Seed complete.")
  logger.info(`Publishable API key (NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY): ${apiKey!.token}`)
}
