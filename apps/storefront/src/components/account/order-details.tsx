import Image from "next/image"
import type { HttpTypes } from "@medusajs/types"
import { formatDate, formatMoney } from "@/lib/util/format"

const FULFILLMENT: Record<string, string> = {
  not_fulfilled: "În pregătire",
  partially_fulfilled: "Parțial pregătită",
  fulfilled: "Pregătită de expediere",
  partially_shipped: "Parțial expediată",
  shipped: "Expediată",
  partially_delivered: "Parțial livrată",
  delivered: "Livrată",
  canceled: "Anulată",
}

export const fulfillmentLabel = (s?: string | null) => (s ? FULFILLMENT[s] ?? s : "")

export function OrderDetails({ order }: { order: HttpTypes.StoreOrder }) {
  const c = order.currency_code
  const sa = order.shipping_address
  const method = order.shipping_methods?.[0]
  const locker = method?.data as any
  const labels = (order.fulfillments ?? []).flatMap((f: any) => f.labels ?? [])
  return (
    <div className="grid gap-6 md:grid-cols-5">
      <section className="rounded-xl bg-surface p-6 shadow-soft md:col-span-3" aria-label="Produse">
        <div className="mb-4 flex items-center justify-between text-sm">
          <span className="text-muted">Plasată {formatDate(order.created_at as unknown as string)}</span>
          <span className="rounded-full bg-paper-2 px-3 py-1 text-xs font-medium">{fulfillmentLabel(order.fulfillment_status)}</span>
        </div>
        <ul className="divide-y divide-line">
          {(order.items ?? []).map((i) => (
            <li key={i.id} className="flex items-center gap-4 py-4">
              <span className="product-frame relative h-20 w-16 shrink-0 overflow-hidden rounded-md">
                {i.thumbnail && <Image src={i.thumbnail} alt="" fill sizes="64px" className="object-cover" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{i.product_title}</span>
                <span className="block text-xs text-muted">
                  {i.variant_title} · {i.quantity} buc.
                </span>
              </span>
              <span className="text-sm tabular-nums">{formatMoney(i.total, c)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 flex flex-col gap-2 border-t border-line pt-4 text-sm">
          <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd className="tabular-nums">{formatMoney((order as any).original_item_total ?? order.item_total, c)}</dd></div>
          {(order.discount_total ?? 0) > 0 && <div className="flex justify-between"><dt className="text-muted">Reducere</dt><dd className="tabular-nums text-moss">−{formatMoney(order.discount_total, c)}</dd></div>}
          <div className="flex justify-between"><dt className="text-muted">Livrare</dt><dd className="tabular-nums">{order.shipping_total ? formatMoney(order.shipping_total, c) : "Gratuită"}</dd></div>
          <div className="flex justify-between text-base font-medium"><dt>Total</dt><dd className="tabular-nums">{formatMoney(order.total, c)}</dd></div>
          <p className="text-xs text-muted">Include TVA {formatMoney(order.tax_total, c)}</p>
        </dl>
      </section>
      <section className="flex flex-col gap-4 md:col-span-2" aria-label="Livrare">
        <div className="rounded-xl bg-surface p-6 shadow-soft">
          <h2 className="text-sm font-medium">Livrare</h2>
          <p className="mt-2 text-sm text-muted">{method?.name}</p>
          {locker?.locker_id ? (
            <p className="mt-2 text-sm">
              Easybox: <strong className="font-medium">{locker.locker_name}</strong>
              <span className="block text-xs text-muted">{[locker.locker_address, locker.locker_city].filter(Boolean).join(", ")}</span>
            </p>
          ) : sa ? (
            <p className="mt-2 text-sm">
              {sa.first_name} {sa.last_name}
              <br />
              {sa.address_1}
              {sa.address_2 ? `, ${sa.address_2}` : ""}
              <br />
              {sa.city}, {sa.province} {sa.postal_code}
              <br />
              {sa.phone}
            </p>
          ) : null}
          {labels.map((l: any) => (
            <a key={l.tracking_number} href={l.tracking_url} target="_blank" rel="noopener" className="mt-3 inline-block text-sm underline underline-offset-2">
              Urmărește coletul · AWB {l.tracking_number}
            </a>
          ))}
        </div>
      </section>
    </div>
  )
}
