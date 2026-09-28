"use client"

import { forwardRef, useImperativeHandle, useMemo } from "react"
import { loadStripe } from "@stripe/stripe-js/pure"
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js"

export type StripeHandle = { confirm: () => Promise<{ ok: boolean; error?: string }> }

/** Stripe Payment Element; confirmation happens right before completing the cart. */
export const StripePayment = forwardRef<StripeHandle, { stripeKey: string; clientSecret: string; email: string }>(function StripePayment(
  { stripeKey, clientSecret, email },
  ref
) {
  const stripePromise = useMemo(() => loadStripe(stripeKey), [stripeKey])
  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        locale: "ro",
        appearance: {
          theme: "flat",
          variables: { colorPrimary: "#161513", colorBackground: "#fffdfa", borderRadius: "12px", fontFamily: "system-ui, sans-serif" },
        },
      }}
    >
      <Inner ref={ref} email={email} />
    </Elements>
  )
})

const Inner = forwardRef<StripeHandle, { email: string }>(function Inner({ email }, ref) {
  const stripe = useStripe()
  const elements = useElements()
  useImperativeHandle(ref, () => ({
    confirm: async () => {
      if (!stripe || !elements) return { ok: false, error: "Stripe nu s-a încărcat." }
      const { error: submitError } = await elements.submit()
      if (submitError) return { ok: false, error: submitError.message }
      const { error } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
        confirmParams: { return_url: `${location.origin}/checkout/return`, payment_method_data: { billing_details: { email } } },
      })
      return error ? { ok: false, error: error.message } : { ok: true }
    },
  }))
  return <PaymentElement options={{ layout: "tabs" }} />
})
