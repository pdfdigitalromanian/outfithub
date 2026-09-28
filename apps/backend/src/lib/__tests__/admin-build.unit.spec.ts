import fs from "node:fs"
import path from "node:path"
import { transformSync } from "esbuild"
import { translateInputLabels, romanianAdminVite } from "../../admin-build/romanian-ui"

describe("Romanian dependency UI compatibility", () => {
  it.each(["js", "mjs"])("translates the installed %s draft extension while preserving executable code and machine identifiers", (extension) => {
    const source = fs.readFileSync(path.join(process.cwd(), `node_modules/@medusajs/draft-order/.medusa/server/src/admin/index.${extension}`), "utf8")
    const id = `/node_modules/@medusajs/draft-order/.medusa/server/src/admin/index.${extension}`
    const output = romanianAdminVite().plugins[0].transform(source, id)!.code
    expect(output).toContain('label: "Ciorne"')
    expect(output).toContain('"Creează comandă ciornă"')
    expect(output).toContain('type === "items"')
    expect(output).toContain('display_name: "România"')
    expect(output).not.toContain('label: "Drafts"')
    expect(output).not.toContain('children: "Save"')
    expect(() => transformSync(output, { loader: "js" })).not.toThrow()
  })
  it("renders product create/edit routes only once through the existing table outlet", () => {
    const directory = path.join(process.cwd(), "node_modules/@medusajs/dashboard/dist")
    const files = fs.readdirSync(directory).filter((file) => /^product-list-.*\.m?js$/.test(file))
    expect(files.length).toBeGreaterThan(0)
    for (const file of files) {
      const id = path.join(directory, file)
      const output = romanianAdminVite().plugins[0].transform(fs.readFileSync(id, "utf8"), id)!.code
      expect(output).toContain('widgetsZonePrefix: "product.list", hasOutlet: false,')
      expect(() => transformSync(output, { loader: "js" })).not.toThrow()
    }
  })
  it("localizes password toggles and limits the Vite transform to the intended modules", () => {
    const source = 'const text = "Show password"; const hidden = "Hide password";'
    expect(translateInputLabels(source)).toContain('"Afișează parola"')
    expect(translateInputLabels(source)).toContain('"Ascunde parola"')
    const plugin = romanianAdminVite().plugins[0]
    expect(plugin.transform(source, "/app/custom/input.js")).toBeUndefined()
    expect(plugin.transform(source, "/node_modules/@medusajs/ui/dist/esm/components/input/input.js")?.code).toContain('"Afișează parola"')
  })
})
