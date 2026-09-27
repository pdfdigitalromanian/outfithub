import Link from "next/link"
import { listOrders } from "@/lib/data/customer"
import { formatDate, formatMoney } from "@/lib/util/format"
import { fulfillmentLabel } from "@/components/account/order-details"
import { ButtonLink } from "@/components/ui/button"

export default async function OrdersPage() {
  const { orders } = await listOrders(50)
  if (!orders.length) {
    return (
      <div className="rounded-xl bg-paper-2 px-6 py-16 text-center">
        <p className="display text-3xl">Nicio comandă încă</p>
        <ButtonLink href="/shop" className="mt-6">
          Începe cumpărăturile
        </ButtonLink>
      </div>
    )
  }
  return (
    <ul className="flex flex-col gap-3">
      {orders.map((o) => (
        <li key={o.id}>
          <Link href={`/account/orders/${o.id}`} className="flex flex-col gap-3 rounded-xl bg-surface p-5 shadow-soft transition-shadow hover:shadow-float sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">Comanda #{o.display_id}</p>
              <p className="text-sm text-muted">
                {formatDate(o.created_at as unknown as string)} · {(o.items ?? []).reduce((s, i) => s + i.quantity, 0)} produse
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="rounded-full bg-paper-2 px-3 py-1 text-xs">{fulfillmentLabel(o.fulfillment_status)}</span>
              <span className="font-medium tabular-nums">{formatMoney(o.total, o.currency_code)}</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}
