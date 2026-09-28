import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { CheckCircle2 } from "lucide-react"
import { getOrder } from "@/lib/data/customer"
import { OrderDetails } from "@/components/account/order-details"
import { PurchaseTracker } from "@/components/checkout/purchase-tracker"
import { ButtonLink } from "@/components/ui/button"

export const metadata: Metadata = { title: "Comandă confirmată", robots: { index: false, follow: false } }
export const dynamic = "force-dynamic"

export default async function OrderConfirmedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const order = await getOrder(id)
  if (!order) notFound()
  return (
    <div className="container-page max-w-4xl pt-10 sm:pt-16">
      <div className="flex flex-col items-center text-center">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-moss-soft text-moss animate-rise">
          <CheckCircle2 className="h-8 w-8" />
        </span>
        <p className="eyebrow mt-6">Comanda #{order.display_id}</p>
        <h1 className="display mt-3 text-5xl sm:text-6xl">Mulțumim!</h1>
        <p className="mt-4 max-w-md text-muted">
          Am primit comanda. Adresa de e-mail pentru confirmare este <strong className="font-medium text-ink">{order.email}</strong>. Te anunțăm când pleacă spre tine.
        </p>
      </div>
      <div className="mt-12">
        <OrderDetails order={order} />
      </div>
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/shop" variant="secondary">
          Continuă cumpărăturile
        </ButtonLink>
        <ButtonLink href="/account/orders">Comenzile mele</ButtonLink>
      </div>
      <PurchaseTracker
        orderId={order.id}
        displayId={String(order.display_id)}
        value={order.total}
        currency={order.currency_code}
        items={(order.items ?? []).map((i) => ({ id: i.variant_sku || i.variant_id || i.id, name: i.product_title ?? "", price: i.unit_price, quantity: i.quantity }))}
      />
    </div>
  )
}
