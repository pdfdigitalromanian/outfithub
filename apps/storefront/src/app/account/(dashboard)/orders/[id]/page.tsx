import Link from "next/link"
import { notFound } from "next/navigation"
import { getCustomer, getOrder } from "@/lib/data/customer"
import { OrderDetails } from "@/components/account/order-details"

export default async function AccountOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [order, customer] = await Promise.all([getOrder(id), getCustomer()])
  if (!order || !customer || (order as any).customer_id && (order as any).customer_id !== customer.id) notFound()
  return (
    <div>
      <Link href="/account/orders" className="text-sm text-muted hover:text-ink">
        ← Toate comenzile
      </Link>
      <h2 className="display mb-6 mt-3 text-4xl">Comanda #{order.display_id}</h2>
      <OrderDetails order={order} />
      <p className="mt-6 text-sm text-muted">
        Vrei să returnezi ceva? Vezi <Link href="/pages/retur" className="underline underline-offset-2">procedura de retur</Link>.
      </p>
    </div>
  )
}
