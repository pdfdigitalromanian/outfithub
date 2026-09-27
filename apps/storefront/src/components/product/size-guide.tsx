"use client"

import { Modal } from "../ui/sheet"

const ROWS = [
  ["S", "88–94", "74–80", "170–176"],
  ["M", "94–100", "80–86", "176–182"],
  ["L", "100–106", "86–92", "182–188"],
  ["XL", "106–112", "92–98", "186–192"],
]

export function SizeGuide({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Ghid de mărimi" description="Măsurători corporale, în centimetri. Croielile relaxate sunt gândite să cadă lejer.">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-muted">
              <th className="py-3 pr-4 font-medium">Mărime</th>
              <th className="py-3 pr-4 font-medium">Piept</th>
              <th className="py-3 pr-4 font-medium">Talie</th>
              <th className="py-3 font-medium">Înălțime</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r[0]} className="border-b border-line last:border-0">
                {r.map((c, i) => (
                  <td key={i} className={i === 0 ? "py-3 pr-4 font-medium" : "py-3 pr-4 tabular-nums"}>
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-sm text-muted">Între două mărimi? Pentru un fit mai relaxat alege mărimea mai mare.</p>
    </Modal>
  )
}
