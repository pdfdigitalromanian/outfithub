import { createHash } from "node:crypto"
import { dirname } from "node:path"
import { readFile } from "node:fs/promises"
import draftLabels from "./draft-order-ro.json"

// These dependencies contain UI strings outside Medusa's i18next resources.
// Scope transforms to their exact modules; never modify installed dependencies.
const inputModule = /@medusajs[\\/]ui[\\/]dist[\\/](?:esm|cjs)[\\/]components[\\/]input[\\/]input\.js$/
const draftModule = /@medusajs[\\/]draft-order[\\/]\.medusa[\\/]server[\\/]src[\\/]admin[\\/]index\.m?js$/
// Medusa 2.21.1 renders product-list child routes in both the table and composer.
const productListModule = /@medusajs[\\/]dashboard[\\/]dist[\\/]product-list-[^\\/]+\.m?js$/
export const fixProductListOutlet = (code: string) => code.replace(
  'widgetsZonePrefix: "product.list",',
  'widgetsZonePrefix: "product.list", hasOutlet: false,'
)

export const translateInputLabels = (code: string) => code
  .replaceAll('"Show password"', '"Afișează parola"')
  .replaceAll('"Hide password"', '"Ascunde parola"')

export function translateDraftLabels(code: string) {
  // Match complete literals, preserving identifiers, routes, enum values and data.
  const literals = Object.fromEntries(Object.entries(draftLabels).map(([en, ro]) => [JSON.stringify(en), JSON.stringify(ro)]))
  let translated = code.replace(/"(?:[^"\\]|\\.)*"/g, (literal) => {
    return literals[literal] ?? literal
  })
  // These fragments are assembled by the extension's activity renderer.
  translated = translated
    .replaceAll('type === "items" ? "item" : type === "shipping" ? "shipping method" : "promotion"', 'type === "items" ? "articol" : type === "shipping" ? "metodă de livrare" : "promoție"')
    .replaceAll('type === "items" ? "items" : type === "shipping" ? "shipping methods" : "promotions"', 'type === "items" ? "articole" : type === "shipping" ? "metode de livrare" : "promoții"')
    .replaceAll('`Added ${addedText}, removed ${removedText}`', '`Adăugate: ${addedText}; eliminate: ${removedText}`')
    .replaceAll('`Added ${addedText}`', '`Adăugate: ${addedText}`')
    .replaceAll('`Removed ${removedText}`', '`Eliminate: ${removedText}`')
    .replaceAll('"Promoții"} updated`', '"Promoții"} actualizate`')
    .replaceAll('"Promoții"} added`', '"Promoții"} adăugate`')
    .replaceAll('"Promoții"} removed`', '"Promoții"} eliminate`')
  translated = translated.replaceAll('type === "shipping_address" ? "shipping" : "billing"', 'type === "shipping_address" ? "livrare" : "facturare"')
  const countries = new Intl.DisplayNames(["ro"], { type: "region" })
  translated = translated.replace(/(iso_2: "([a-z]{2})",[^}]*?display_name: )"[^"\n]+"/g,
    (_, prefix: string, iso: string) => prefix + JSON.stringify(countries.of(iso.toUpperCase())))
  return translated
}

// Medusa mergeConfig appends arrays: return additions only, never its base plugins.
export function romanianAdminVite() {
  // Include translation changes in Vite's dependency cache key.
  const version = createHash("sha256").update(JSON.stringify(draftLabels) + translateDraftLabels.toString() + translateInputLabels.toString() + fixProductListOutlet.toString()).digest("hex").slice(0, 12)
  const name = `outfithub-romanian-ui-${version}`
  return {
    plugins: [{
      name,
      enforce: "pre" as const,
      transform(code: string, id: string) {
        const path = id.split("?")[0]
        if (inputModule.test(path)) return { code: translateInputLabels(code), map: null }
        if (productListModule.test(path)) return { code: fixProductListOutlet(code), map: null }
        if (draftModule.test(path)) return { code: translateDraftLabels(code), map: null }
      },
    }],
    optimizeDeps: {
      esbuildOptions: {
        plugins: [{
          name,
          setup(build: any) {
            for (const [filter, translate] of [[inputModule, translateInputLabels], [draftModule, translateDraftLabels], [productListModule, fixProductListOutlet]] as const) {
              build.onLoad({ filter }, async ({ path }: { path: string }) => ({
                contents: translate(await readFile(path, "utf8")),
                loader: "js",
                resolveDir: dirname(path),
              }))
            }
          },
        }],
      },
    },
  }
}
