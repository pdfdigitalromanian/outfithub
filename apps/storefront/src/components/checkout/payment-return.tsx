"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { LoaderCircle } from "lucide-react"
import { placeOrderAction } from "@/lib/actions/cart"
import { Button, ButtonLink } from "../ui/button"
import { useCart } from "../providers"

/** The backend verifies payment authorization. Query-string status is never trusted. */
export function PaymentReturn() {
  const router = useRouter()
  const { setCart } = useCart()
  const started = useRef(false)
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(true)

  async function complete() {
    setBusy(true)
    setError(undefined)
    try {
      const result = await placeOrderAction()
      if (result.orderId) {
        setCart(null)
        router.replace(`/order/${result.orderId}/confirmed`)
        return
      }
      setError(result.error ?? "Plata este încă în curs de confirmare. Încearcă din nou în câteva momente.")
    } catch {
      setError("Conexiunea a fost întreruptă. Poți reîncerca verificarea comenzii.")
    }
    setBusy(false)
  }

  useEffect(() => {
    if (started.current) return
    started.current = true
    // Remove Stripe client secrets from the address bar before further navigation.
    window.history.replaceState(null, "", "/checkout/return")
    void complete()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="container-page flex min-h-[65vh] flex-col items-center justify-center py-16 text-center">
      {busy && <LoaderCircle aria-hidden className="mb-6 h-8 w-8 animate-spin text-clay" />}
      <p className="eyebrow">Ultimul pas</p>
      <h1 className="display mt-3 text-4xl sm:text-5xl">Confirmăm comanda</h1>
      <p role={error ? "alert" : "status"} className="mt-5 max-w-md text-muted">{error || "Verificăm plata în siguranță. Te vom duce la comanda ta imediat ce este confirmată."}</p>
      {!busy && <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button onClick={() => void complete()}>Verifică din nou</Button>
        <ButtonLink href="/checkout" variant="secondary">Înapoi la comandă</ButtonLink>
      </div>}
    </div>
  )
}
