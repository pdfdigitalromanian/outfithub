import { formatMoney } from "@/lib/util/format"

export function FreeShippingProgress({ subtotal, threshold, currency }: { subtotal: number; threshold: number; currency: string }) {
  if (!threshold) return null
  const remaining = Math.max(0, threshold - subtotal)
  const pct = Math.min(100, (subtotal / threshold) * 100)
  return (
    <div className="rounded-md bg-paper-2 p-3">
      <p className="text-xs text-ink-2">
        {remaining > 0 ? (
          <>
            Mai adaugă <strong className="font-semibold">{formatMoney(remaining, currency)}</strong> pentru livrare gratuită.
          </>
        ) : (
          <>Ai livrare gratuită la această comandă.</>
        )}
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sand" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label="Progres livrare gratuită">
        <div className="h-full rounded-full bg-moss transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
