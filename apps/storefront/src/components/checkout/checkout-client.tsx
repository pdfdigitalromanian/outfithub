"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { Check, ChevronDown, Lock, MapPin, Package, Store, Truck, Wallet, CreditCard } from "lucide-react"
import type { HttpTypes } from "@medusajs/types"
import {
  initiatePaymentAction,
  placeOrderAction,
  setShippingMethodAction,
  updateCheckoutDetailsAction,
  type AddressInput,
  type TrackingContext,
} from "@/lib/actions/cart"
import { useCart } from "../providers"
import { Button } from "../ui/button"
import { Checkbox, Field, SelectField } from "../ui/input"
import { EasyboxSelector, type Locker } from "./easybox-selector"
import { PromoCode, Totals } from "../cart/cart-summary"
import { StripePayment, type StripeHandle } from "./stripe-payment"
import { RO_COUNTIES } from "@/lib/ro-counties"
import { formatMoney } from "@/lib/util/format"
import { track } from "@/lib/client/tracking"
import { readConsent, readCookie } from "@/lib/client/consent"
import { cn } from "@/lib/util/cn"

type Step = "details" | "delivery" | "payment"

type CustomerLite = {
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  addresses: HttpTypes.StoreCustomerAddress[]
}

const EMPTY: AddressInput = { first_name: "", last_name: "", phone: "", address_1: "", address_2: "", city: "", province: "", postal_code: "", company: "" }

const PAYMENT_LABELS: Record<string, { title: string; body: string; icon: typeof Wallet }> = {
  pp_system_default: { title: "Plata la livrare (ramburs)", body: "Plătești curierului, numerar sau cu cardul.", icon: Wallet },
  pp_stripe_stripe: { title: "Card online", body: "Visa, Mastercard, Apple Pay, Google Pay – procesat securizat de Stripe.", icon: CreditCard },
}

const isEasybox = (o: HttpTypes.StoreCartShippingOption) => (o.data as any)?.id === "sameday-easybox" || (o as any).type?.code === "sameday-easybox"

function trackingContext(): TrackingContext {
  const consent = readConsent()
  const ga = readCookie("_ga")
  return {
    consent: { analytics: !!consent?.analytics, marketing: !!consent?.marketing },
    ...(consent?.marketing
      ? {
          fbp: readCookie("_fbp"),
          fbc: readCookie("_fbc") ?? (new URLSearchParams(location.search).get("fbclid") ? `fb.1.${Date.now()}.${new URLSearchParams(location.search).get("fbclid")}` : undefined),
          ttp: readCookie("_ttp"),
          ttclid: readCookie("ttclid"),
        }
      : {}),
    ...(consent?.analytics && ga ? { ga_client_id: ga.split(".").slice(-2).join(".") } : {}),
    page_url: location.origin + "/checkout",
  }
}

export function CheckoutClient({
  initialCart,
  shippingOptions,
  paymentProviders,
  customer,
  stripeKey,
}: {
  initialCart: HttpTypes.StoreCart
  shippingOptions: HttpTypes.StoreCartShippingOption[]
  paymentProviders: string[]
  customer: CustomerLite | null
  stripeKey: string
}) {
  const router = useRouter()
  const { setCart: setGlobalCart } = useCart()
  const [cart, setCartState] = useState(initialCart)
  const setCart = (c: HttpTypes.StoreCart | null) => {
    if (c) setCartState(c)
    setGlobalCart(c)
  }

  const hasDetails = !!cart.email && !!cart.shipping_address?.address_1
  const hasShipping = (cart.shipping_methods?.length ?? 0) > 0
  const [step, setStep] = useState<Step>(hasDetails ? (hasShipping ? "payment" : "delivery") : "details")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    track("begin_checkout", {
      value: initialCart.item_total ?? 0,
      currency: initialCart.currency_code,
      items: (initialCart.items ?? []).map((i) => ({ id: i.variant_sku || i.variant_id || i.id, name: i.product_title ?? "", price: i.unit_price, quantity: i.quantity })),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* -------------------------------------------------- step 1: details */
  const defaultAddress = customer?.addresses?.find((a) => a.is_default_shipping) ?? customer?.addresses?.[0]
  const fromCart = cart.shipping_address
  const [email, setEmail] = useState(cart.email ?? customer?.email ?? "")
  const [address, setAddress] = useState<AddressInput>(() =>
    fromCart?.address_1
      ? {
          first_name: fromCart.first_name ?? "",
          last_name: fromCart.last_name ?? "",
          phone: fromCart.phone ?? "",
          address_1: fromCart.address_1 ?? "",
          address_2: fromCart.address_2 ?? "",
          city: fromCart.city ?? "",
          province: fromCart.province ?? "",
          postal_code: fromCart.postal_code ?? "",
          company: fromCart.company ?? "",
        }
      : defaultAddress
        ? {
            first_name: defaultAddress.first_name ?? "",
            last_name: defaultAddress.last_name ?? "",
            phone: defaultAddress.phone ?? "",
            address_1: defaultAddress.address_1 ?? "",
            address_2: defaultAddress.address_2 ?? "",
            city: defaultAddress.city ?? "",
            province: defaultAddress.province ?? "",
            postal_code: defaultAddress.postal_code ?? "",
            company: defaultAddress.company ?? "",
          }
        : { ...EMPTY, first_name: customer?.first_name ?? "", last_name: customer?.last_name ?? "", phone: customer?.phone ?? "" }
  )
  const [billingSame, setBillingSame] = useState(true)
  const [billing, setBilling] = useState<AddressInput>(EMPTY)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const e: Record<string, string> = {}
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = "Introdu o adresă de e-mail validă."
    const check = (a: AddressInput, prefix: string) => {
      if (!a.first_name.trim()) e[`${prefix}first_name`] = "Obligatoriu"
      if (!a.last_name.trim()) e[`${prefix}last_name`] = "Obligatoriu"
      if (!/^(\+?40|0)\d{9}$/.test(a.phone.replace(/[\s.-]/g, ""))) e[`${prefix}phone`] = "Număr de telefon românesc valid, ex. 07xx xxx xxx"
      if (a.address_1.trim().length < 5) e[`${prefix}address_1`] = "Stradă și număr"
      if (!a.city.trim()) e[`${prefix}city`] = "Obligatoriu"
      if (!a.province) e[`${prefix}province`] = "Alege județul"
      if (a.postal_code && !/^\d{6}$/.test(a.postal_code.trim())) e[`${prefix}postal_code`] = "6 cifre"
    }
    check(address, "")
    if (!billingSame) check(billing, "b_")
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submitDetails = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setError(null)
    if (!validate()) {
      document.querySelector<HTMLElement>("[aria-invalid=true]")?.focus()
      return
    }
    setBusy(true)
    const res = await updateCheckoutDetailsAction({ email, shipping: address, billing: billingSame ? null : billing, tracking: trackingContext() })
    setBusy(false)
    if (res.error) return setError(res.error)
    setCart(res.cart)
    setStep("delivery")
  }

  /* ------------------------------------------------- step 2: delivery */
  const currentMethod = cart.shipping_methods?.[0]
  const [selectedOption, setSelectedOption] = useState<string | null>(currentMethod?.shipping_option_id ?? null)
  const [locker, setLocker] = useState<Locker | null>(() => {
    const d = currentMethod?.data as any
    return d?.locker_id ? { id: d.locker_id, name: d.locker_name, address: d.locker_address, city: d.locker_city, county: null, postal_code: null, lat: null, lng: null } : null
  })
  const [lockerOpen, setLockerOpen] = useState(false)

  const chooseOption = async (opt: HttpTypes.StoreCartShippingOption, withLocker?: Locker) => {
    setSelectedOption(opt.id)
    setError(null)
    if (isEasybox(opt) && !withLocker) {
      if (locker) return chooseOption(opt, locker)
      setLockerOpen(true)
      return
    }
    setBusy(true)
    const res = await setShippingMethodAction(
      opt.id,
      withLocker
        ? { locker_id: withLocker.id, locker_name: withLocker.name, locker_address: withLocker.address ?? "", locker_city: withLocker.city ?? "" }
        : undefined
    )
    setBusy(false)
    if (res.error) return setError(res.error)
    setCart(res.cart)
    track("add_shipping_info", { value: res.cart?.total ?? 0, currency: res.cart?.currency_code, shipping_tier: opt.name })
  }

  const deliveryValid = hasShipping && (!shippingOptions.find((o) => o.id === currentMethod?.shipping_option_id && isEasybox(o)) || !!(currentMethod?.data as any)?.locker_id)

  /* -------------------------------------------------- step 3: payment */
  const activeSession = cart.payment_collection?.payment_sessions?.[0]
  const [provider, setProvider] = useState<string>(activeSession?.provider_id ?? paymentProviders[0] ?? "")
  const [clientSecret, setClientSecret] = useState<string | undefined>((activeSession?.data as any)?.client_secret)
  const [terms, setTerms] = useState(false)
  const [termsError, setTermsError] = useState(false)
  const stripeRef = useRef<StripeHandle>(null)

  useEffect(() => {
    if (step !== "payment" || !provider) return
    if (activeSession?.provider_id === provider && (provider !== "pp_stripe_stripe" || clientSecret)) return
    let cancelled = false
    ;(async () => {
      setBusy(true)
      const res = await initiatePaymentAction(provider)
      if (cancelled) return
      setBusy(false)
      if (res.error) return setError(res.error)
      setCart(res.cart)
      setClientSecret(res.clientSecret)
      track("add_payment_info", { value: res.cart?.total ?? 0, currency: res.cart?.currency_code, payment_type: provider })
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, provider])

  const placeOrder = async () => {
    setError(null)
    if (!terms) {
      setTermsError(true)
      return
    }
    setBusy(true)
    if (provider.startsWith("pp_stripe")) {
      const ok = await stripeRef.current?.confirm()
      if (!ok?.ok) {
        setBusy(false)
        return setError(ok?.error ?? "Plata nu a fost confirmată.")
      }
    }
    const res = await placeOrderAction()
    if (res.orderId) {
      setGlobalCart(null)
      router.push(`/order/${res.orderId}/confirmed`)
      return
    }
    setBusy(false)
    setError(res.error ?? "Comanda nu a putut fi plasată.")
    if (res.cart) setCart(res.cart)
  }

  const items = cart.items ?? []
  const sa = cart.shipping_address

  return (
    <div className="container-page pt-6 sm:pt-10">
      <div className="grid items-start gap-8 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-7">
          <h1 className="display mb-8 text-4xl sm:text-5xl">Finalizează comanda</h1>

          {error && (
            <div role="alert" className="mb-6 rounded-md border border-clay/30 bg-clay-soft px-4 py-3 text-sm text-clay">
              {error}
            </div>
          )}

          {/* STEP 1 */}
          <StepCard n={1} title="Date de livrare" active={step === "details"} done={hasDetails && step !== "details"} onEdit={() => setStep("details")}
            summary={sa?.address_1 ? (
              <p className="text-sm text-muted">
                {cart.email}
                <br />
                {sa.first_name} {sa.last_name}, {sa.phone}
                <br />
                {sa.address_1}
                {sa.address_2 ? `, ${sa.address_2}` : ""}, {sa.city}, {sa.province} {sa.postal_code}
              </p>
            ) : null}
          >
            <form onSubmit={submitDetails} noValidate className="flex flex-col gap-4">
              <Field label="E-mail" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} hint="Aici primești confirmarea și AWB-ul." />
              {!customer && (
                <p className="text-xs text-muted">
                  Ai cont?{" "}
                  <Link href="/account/login?next=/checkout" className="underline underline-offset-2">
                    Autentifică-te
                  </Link>{" "}
                  pentru adrese salvate.
                </p>
              )}
              <AddressFields value={address} onChange={setAddress} errors={errors} prefix="" />
              <Checkbox label="Adresa de facturare este aceeași" checked={billingSame} onChange={(e) => setBillingSame(e.target.checked)} />
              {!billingSame && (
                <div className="flex flex-col gap-4 rounded-lg bg-paper-2 p-4">
                  <p className="text-sm font-medium">Adresa de facturare</p>
                  <AddressFields value={billing} onChange={setBilling} errors={errors} prefix="b_" showCompany />
                </div>
              )}
              <Button type="submit" size="lg" loading={busy} className="mt-2">
                Continuă spre livrare
              </Button>
            </form>
          </StepCard>

          {/* STEP 2 */}
          <StepCard
            n={2}
            title="Metodă de livrare"
            active={step === "delivery"}
            done={deliveryValid && step === "payment"}
            onEdit={hasDetails ? () => setStep("delivery") : undefined}
            summary={currentMethod ? (
              <p className="text-sm text-muted">
                {currentMethod.name} · {currentMethod.amount ? formatMoney(currentMethod.amount, cart.currency_code) : "Gratuit"}
                {(currentMethod.data as any)?.locker_name && (
                  <>
                    <br />
                    Easybox: {(currentMethod.data as any).locker_name}
                  </>
                )}
              </p>
            ) : null}
          >
            <fieldset>
              <legend className="sr-only">Alege metoda de livrare</legend>
              <div className="flex flex-col gap-3">
                {shippingOptions.length === 0 && <p className="text-sm text-muted">Nu există metode de livrare pentru această adresă.</p>}
                {shippingOptions.map((opt) => {
                  const active = selectedOption === opt.id
                  const Icon = isEasybox(opt) ? Package : (opt as any).type?.code === "pickup" ? Store : Truck
                  const amount = (opt as any).calculated_price?.calculated_amount ?? opt.amount
                  return (
                    <div key={opt.id} className={cn("rounded-lg border bg-surface transition-colors", active ? "border-ink" : "border-line hover:border-stone")}>
                      <label className="flex cursor-pointer items-start gap-4 p-4">
                        <input type="radio" name="shipping" className="sr-only" checked={active} onChange={() => chooseOption(opt)} />
                        <span aria-hidden className={cn("mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2", active ? "border-ink" : "border-stone")}>
                          {active && <span className="h-2.5 w-2.5 rounded-full bg-ink" />}
                        </span>
                        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-muted" aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-3">
                            <span className="text-sm font-medium">{opt.name}</span>
                            <span className="text-sm tabular-nums">{amount ? formatMoney(amount, cart.currency_code) : "Gratuit"}</span>
                          </span>
                          {(opt as any).type?.description && <span className="mt-0.5 block text-xs text-muted">{(opt as any).type.description}</span>}
                        </span>
                      </label>
                      {isEasybox(opt) && active && (
                        <div className="border-t border-line px-4 py-3">
                          {locker ? (
                            <div className="flex items-start justify-between gap-3">
                              <p className="flex items-start gap-2 text-sm">
                                <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                                <span>
                                  <strong className="font-medium">{locker.name}</strong>
                                  <span className="block text-xs text-muted">{[locker.address, locker.city].filter(Boolean).join(", ")}</span>
                                </span>
                              </p>
                              <button type="button" onClick={() => setLockerOpen(true)} className="shrink-0 text-xs underline underline-offset-2">
                                Schimbă
                              </button>
                            </div>
                          ) : (
                            <Button type="button" variant="outline" size="sm" onClick={() => setLockerOpen(true)}>
                              <MapPin className="h-4 w-4" /> Alege Easybox
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </fieldset>
            <Button type="button" size="lg" className="mt-5 w-full" disabled={!deliveryValid} loading={busy} onClick={() => setStep("payment")}>
              Continuă spre plată
            </Button>
          </StepCard>

          {/* STEP 3 */}
          <StepCard n={3} title="Plată" active={step === "payment"} done={false}>
            <fieldset>
              <legend className="sr-only">Metoda de plată</legend>
              <div className="flex flex-col gap-3">
                {paymentProviders.map((p) => {
                  const meta = PAYMENT_LABELS[p] ?? { title: p, body: "", icon: Wallet }
                  const active = provider === p
                  return (
                    <label key={p} className={cn("flex cursor-pointer items-start gap-4 rounded-lg border bg-surface p-4", active ? "border-ink" : "border-line hover:border-stone")}>
                      <input type="radio" name="payment" className="sr-only" checked={active} onChange={() => setProvider(p)} />
                      <span aria-hidden className={cn("mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2", active ? "border-ink" : "border-stone")}>
                        {active && <span className="h-2.5 w-2.5 rounded-full bg-ink" />}
                      </span>
                      <meta.icon className="mt-0.5 h-5 w-5 shrink-0 text-muted" aria-hidden />
                      <span>
                        <span className="block text-sm font-medium">{meta.title}</span>
                        <span className="block text-xs text-muted">{meta.body}</span>
                      </span>
                    </label>
                  )
                })}
                {paymentProviders.length === 0 && <p className="text-sm text-clay">Nicio metodă de plată nu este configurată pentru această regiune.</p>}
              </div>
            </fieldset>
            {provider.startsWith("pp_stripe") && stripeKey && clientSecret && (
              <div className="mt-4 rounded-lg border border-line bg-surface p-4">
                <StripePayment ref={stripeRef} stripeKey={stripeKey} clientSecret={clientSecret} email={cart.email ?? ""} />
              </div>
            )}
            <div className="mt-6">
              <Checkbox
                checked={terms}
                onChange={(e) => {
                  setTerms(e.target.checked)
                  setTermsError(false)
                }}
                aria-invalid={termsError || undefined}
                label={
                  <>
                    Am citit și sunt de acord cu{" "}
                    <Link href="/pages/termeni-si-conditii" target="_blank" className="underline underline-offset-2">
                      Termenii și condițiile
                    </Link>{" "}
                    și{" "}
                    <Link href="/pages/politica-de-confidentialitate" target="_blank" className="underline underline-offset-2">
                      Politica de confidențialitate
                    </Link>
                    .
                  </>
                }
              />
              {termsError && (
                <p role="alert" className="mt-2 text-xs text-clay">
                  Trebuie să accepți termenii pentru a plasa comanda.
                </p>
              )}
            </div>
            <Button type="button" size="lg" className="mt-6 w-full" loading={busy} disabled={!deliveryValid || !provider} onClick={placeOrder}>
              <Lock className="h-4 w-4" /> Plasează comanda · {formatMoney(cart.total, cart.currency_code)}
            </Button>
            <p className="mt-3 text-center text-xs text-muted">Comanda implică obligația de plată.</p>
          </StepCard>
        </div>

        <aside className="lg:sticky lg:top-24 lg:col-span-5" aria-label="Sumar comandă">
          <OrderSummary cart={cart} items={items} />
        </aside>
      </div>

      <EasyboxSelector
        open={lockerOpen}
        onOpenChange={setLockerOpen}
        initialCity={sa?.city ?? ""}
        selectedId={locker?.id}
        onSelect={(l) => {
          setLocker(l)
          setLockerOpen(false)
          const opt = shippingOptions.find(isEasybox)
          if (opt) void chooseOption(opt, l)
        }}
      />
    </div>
  )
}

function OrderSummary({ cart, items }: { cart: HttpTypes.StoreCart; items: HttpTypes.StoreCartLineItem[] }) {
  const [open, setOpen] = useState(false)
  const count = items.reduce((s, i) => s + i.quantity, 0)
  const content = (
    <div className="flex flex-col gap-5">
      <ul className="flex flex-col gap-4">
        {items.map((i) => (
          <li key={i.id} className="flex items-center gap-3">
            <span className="product-frame relative h-16 w-13 shrink-0 overflow-hidden rounded-sm" style={{ width: 52 }}>
              {i.thumbnail && <Image src={i.thumbnail} alt="" fill sizes="52px" className="object-cover" />}
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1 text-[0.65rem] text-paper">{i.quantity}</span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm">{i.product_title}</span>
              <span className="block truncate text-xs text-muted">{i.variant_title}</span>
            </span>
            <span className="text-sm tabular-nums">{formatMoney(i.total ?? i.unit_price * i.quantity, cart.currency_code)}</span>
          </li>
        ))}
      </ul>
      <PromoCode cart={cart} />
      <Totals cart={cart} />
    </div>
  )
  return (
    <div className="rounded-xl bg-surface p-5 shadow-soft sm:p-6">
      <button type="button" className="flex w-full items-center justify-between lg:hidden" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="text-sm font-medium">
          Sumar ({count} {count === 1 ? "produs" : "produse"})
        </span>
        <span className="flex items-center gap-2 text-sm font-medium tabular-nums">
          {formatMoney(cart.total, cart.currency_code)}
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
        </span>
      </button>
      <h2 className="mb-5 hidden text-lg font-medium lg:block">Sumar comandă</h2>
      <div className={cn("mt-5 lg:mt-0 lg:block", open ? "block" : "hidden")}>{content}</div>
    </div>
  )
}

function StepCard({
  n,
  title,
  active,
  done,
  onEdit,
  summary,
  children,
}: {
  n: number
  title: string
  active: boolean
  done: boolean
  onEdit?: () => void
  summary?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className={cn("mb-4 rounded-xl border bg-surface/60 p-5 transition-colors sm:p-6", active ? "border-ink/20 bg-surface shadow-soft" : "border-line")} aria-current={active ? "step" : undefined}>
      <div className="flex items-center justify-between gap-4">
        <h2 className="flex items-center gap-3 text-base font-medium">
          <span className={cn("grid h-7 w-7 place-items-center rounded-full text-xs", done ? "bg-moss text-white" : active ? "bg-ink text-paper" : "bg-paper-2 text-muted")}>
            {done ? <Check className="h-3.5 w-3.5" /> : n}
          </span>
          {title}
        </h2>
        {!active && done && onEdit && (
          <button type="button" onClick={onEdit} className="text-sm underline underline-offset-2">
            Modifică
          </button>
        )}
      </div>
      {active ? <div className="mt-5">{children}</div> : done && summary ? <div className="mt-3 pl-10">{summary}</div> : null}
    </section>
  )
}

function AddressFields({
  value,
  onChange,
  errors,
  prefix,
  showCompany,
}: {
  value: AddressInput
  onChange: (v: AddressInput) => void
  errors: Record<string, string>
  prefix: string
  showCompany?: boolean
}) {
  const set = (k: keyof AddressInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => onChange({ ...value, [k]: e.target.value })
  const ac = prefix ? "billing" : "shipping"
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="Prenume" autoComplete={`${ac} given-name`} required value={value.first_name} onChange={set("first_name")} error={errors[`${prefix}first_name`]} />
      <Field label="Nume" autoComplete={`${ac} family-name`} required value={value.last_name} onChange={set("last_name")} error={errors[`${prefix}last_name`]} />
      <Field label="Telefon" type="tel" inputMode="tel" autoComplete={`${ac} tel`} required value={value.phone} onChange={set("phone")} error={errors[`${prefix}phone`]} wrapperClassName="sm:col-span-2" />
      <Field label="Stradă, număr" autoComplete={`${ac} address-line1`} required value={value.address_1} onChange={set("address_1")} error={errors[`${prefix}address_1`]} wrapperClassName="sm:col-span-2" />
      <Field label="Bloc, scară, etaj, apartament" autoComplete={`${ac} address-line2`} value={value.address_2 ?? ""} onChange={set("address_2")} wrapperClassName="sm:col-span-2" />
      <Field label="Localitate" autoComplete={`${ac} address-level2`} required value={value.city} onChange={set("city")} error={errors[`${prefix}city`]} />
      <div className="flex flex-col gap-1">
        <SelectField
          label="Județ"
          autoComplete={`${ac} address-level1`}
          value={value.province}
          onChange={set("province")}
          aria-invalid={!!errors[`${prefix}province`] || undefined}
          options={[{ value: "", label: "Alege județul" }, ...RO_COUNTIES.map((c) => ({ value: c, label: c }))]}
        />
        {errors[`${prefix}province`] && <p className="px-1 text-xs text-danger">{errors[`${prefix}province`]}</p>}
      </div>
      <Field label="Cod poștal" inputMode="numeric" autoComplete={`${ac} postal-code`} value={value.postal_code} onChange={set("postal_code")} error={errors[`${prefix}postal_code`]} />
      {(showCompany || value.company) && <Field label="Companie (opțional)" autoComplete={`${ac} organization`} value={value.company ?? ""} onChange={set("company")} />}
    </div>
  )
}
