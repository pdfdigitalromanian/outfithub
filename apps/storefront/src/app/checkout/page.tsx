import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { CheckoutClient } from "@/components/checkout/checkout-client"
import { listPaymentProviders, listShippingOptions, retrieveCart } from "@/lib/data/cart"
import { getCustomer } from "@/lib/data/customer"
import { getStoreConfig } from "@/lib/data/content"
import { STRIPE_PUBLIC_KEY } from "@/lib/env"

export const metadata: Metadata = { title: "Finalizare comandă", robots: { index: false, follow: false } }
export const dynamic = "force-dynamic"

export default async function CheckoutPage() {
  const cart = await retrieveCart()
  if (!cart || !cart.items?.length) redirect("/cart")
  const [shippingOptions, providers, customer, config] = await Promise.all([
    listShippingOptions(cart.id),
    listPaymentProviders(cart.region_id!),
    getCustomer(),
    getStoreConfig(),
  ])
  // Easybox is only offered when Sameday is connected (locker IDs can be validated).
  const options = shippingOptions.filter((o) => ((o.data as any)?.id === "sameday-easybox" ? config.features.easybox : true))
  const payments = providers.filter((p) => p.id.startsWith("pp_system") || (p.id.startsWith("pp_stripe") && !!STRIPE_PUBLIC_KEY))
  return (
    <CheckoutClient
      initialCart={cart}
      shippingOptions={options}
      paymentProviders={payments.map((p) => p.id)}
      customer={customer ? { email: customer.email, first_name: customer.first_name, last_name: customer.last_name, phone: customer.phone ?? null, addresses: customer.addresses ?? [] } : null}
      stripeKey={STRIPE_PUBLIC_KEY}
    />
  )
}
