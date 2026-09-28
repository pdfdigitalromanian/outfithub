import type { Metadata } from "next"
import { PaymentReturn } from "@/components/checkout/payment-return"

export const metadata: Metadata = { title: "Confirmarea plății", robots: { index: false, follow: false }, referrer: "no-referrer" }

export default function PaymentReturnPage() {
  return <PaymentReturn />
}
