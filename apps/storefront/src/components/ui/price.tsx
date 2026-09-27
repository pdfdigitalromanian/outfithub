import { formatMoney } from "@/lib/util/format"
import { cn } from "@/lib/util/cn"

export function Price({
  amount,
  original,
  currency = "ron",
  from,
  className,
  size = "md",
}: {
  amount: number | null
  original?: number | null
  currency?: string
  from?: boolean
  className?: string
  size?: "sm" | "md" | "lg"
}) {
  if (amount == null) return <span className={cn("text-muted", className)}>Indisponibil</span>
  const onSale = original != null && original > amount
  const pct = onSale ? Math.round((1 - amount / original!) * 100) : 0
  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-2", className)}>
      <span className={cn("tabular-nums", size === "lg" ? "text-xl font-medium" : size === "sm" ? "text-[0.8rem]" : "text-sm", onSale && "text-clay")}>
        {from && <span className="mr-1 text-muted">de la</span>}
        {formatMoney(amount, currency)}
      </span>
      {onSale && (
        <>
          <s className={cn("tabular-nums text-muted", size === "lg" ? "text-base" : "text-xs")} aria-label={`Preț inițial ${formatMoney(original, currency)}`}>
            {formatMoney(original, currency)}
          </s>
          <span className="rounded-full bg-clay-soft px-2 py-0.5 text-[0.68rem] font-semibold text-clay">−{pct}%</span>
        </>
      )}
    </span>
  )
}
