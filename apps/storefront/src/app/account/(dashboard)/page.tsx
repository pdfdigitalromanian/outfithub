import Link from "next/link"
import { getCustomer, listOrders } from "@/lib/data/customer"
import { formatDate, formatMoney } from "@/lib/util/format"
import { fulfillmentLabel } from "@/components/account/order-details"

export default async function AccountOverview() {
  const [customer, { orders, count }] = await Promise.all([getCustomer(), listOrders(3)])
  const address = customer?.addresses?.find((a) => a.is_default_shipping) ?? customer?.addresses?.[0]
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card title="Profil" href="/account/profile">
        <p>
          {customer?.first_name} {customer?.last_name}
        </p>
        <p className="text-muted">{customer?.email}</p>
        {customer?.phone && <p className="text-muted">{customer.phone}</p>}
      </Card>
      <Card title="Adresă implicită" href="/account/addresses">
        {address ? (
          <p className="text-muted">
            {address.address_1}, {address.city}, {address.province}
          </p>
        ) : (
          <p className="text-muted">Nu ai adrese salvate.</p>
        )}
      </Card>
      <div className="rounded-xl bg-surface p-6 shadow-soft md:col-span-2">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-medium">Comenzi recente</h2>
          <Link href="/account/orders" className="text-sm underline underline-offset-2">
            Toate ({count})
          </Link>
        </div>
        {orders.length ? (
          <ul className="divide-y divide-line">
            {orders.map((o) => (
              <li key={o.id}>
                <Link href={`/account/orders/${o.id}`} className="flex items-center justify-between gap-4 py-3 text-sm hover:opacity-80">
                  <span>
                    <span className="font-medium">#{o.display_id}</span>
                    <span className="ml-3 text-muted">{formatDate(o.created_at as unknown as string)}</span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="hidden rounded-full bg-paper-2 px-3 py-1 text-xs sm:inline">{fulfillmentLabel(o.fulfillment_status)}</span>
                    <span className="tabular-nums">{formatMoney(o.total, o.currency_code)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Încă nu ai plasat nicio comandă.</p>
        )}
      </div>
    </div>
  )
}

function Card({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-surface p-6 text-sm shadow-soft">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-medium">{title}</h2>
        <Link href={href} className="text-xs underline underline-offset-2">
          Editează
        </Link>
      </div>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  )
}
