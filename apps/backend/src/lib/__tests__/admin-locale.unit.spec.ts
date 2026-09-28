import fs from "node:fs"
import path from "node:path"
import overrides from "../../admin/i18n/ro.json"

function flatten(value: Record<string, any>, prefix = ""): Record<string, string> {
  return Object.fromEntries(Object.entries(value).flatMap(([key, item]) =>
    typeof item === "object" ? Object.entries(flatten(item, `${prefix}${key}.`)) : [[`${prefix}${key}`, item]]
  ))
}
const directory = path.join(process.cwd(), "node_modules/@medusajs/dashboard/src/i18n/translations")
const en = flatten(JSON.parse(fs.readFileSync(path.join(directory, "en.json"), "utf8")))
const ro = { ...flatten(JSON.parse(fs.readFileSync(path.join(directory, "ro.json"), "utf8"))), ...flatten(overrides) }

describe("Romanian admin translations", () => {
  it("covers every key of the installed Medusa version", () => {
    expect(Object.keys(en).filter((key) => !ro[key]?.trim())).toEqual([])
  })
  it("preserves interpolation variables and rich-text tags in custom additions", () => {
    const tokens = (value: string) => (value.match(/{{.*?}}|<\/?\d+>/g) || []).sort()
    for (const [key, value] of Object.entries(flatten(overrides))) {
      if (en[key]) expect({ key, tokens: tokens(value) }).toEqual({ key, tokens: tokens(en[key]) })
    }
  })
})
