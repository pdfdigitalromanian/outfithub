"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Cookie } from "lucide-react"
import { useConsent } from "../providers"
import { Button } from "../ui/button"
import { Modal } from "../ui/sheet"
import { cn } from "@/lib/util/cn"

const CATEGORIES = [
  {
    key: "necessary" as const,
    title: "Strict necesare",
    body: "Coșul, autentificarea, securitatea și memorarea acestor preferințe. Nu pot fi dezactivate.",
    locked: true,
  },
  { key: "preferences" as const, title: "Preferințe", body: "Memorează produsele vizualizate recent și alte alegeri de afișare." },
  { key: "analytics" as const, title: "Analiză", body: "Statistici agregate despre cum este folosit site-ul (Google Analytics)." },
  { key: "marketing" as const, title: "Marketing", body: "Măsurarea campaniilor și reclame relevante (Meta, TikTok, Google Ads)." },
]

/**
 * Consent banner with equal-weight Accept / Reject buttons (EDPB guidance)
 * and granular preferences. Re-openable via the “Setări cookie” footer link.
 */
export function ConsentBanner() {
  const { decided, consent, save, preferencesOpen, openPreferences } = useConsent()
  const [mounted, setMounted] = useState(false)
  const [draft, setDraft] = useState({ preferences: false, analytics: false, marketing: false })

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), [])
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (consent) setDraft({ preferences: consent.preferences, analytics: consent.analytics, marketing: consent.marketing })
  }, [consent])

  if (!mounted) return null

  return (
    <>
      {!decided && (
        <div
          role="region"
          aria-label="Consimțământ cookie-uri"
          className="fixed inset-x-2 bottom-2 z-40 mx-auto max-w-[960px] animate-rise rounded-lg border border-white/60 glass p-4 sm:inset-x-4 sm:bottom-4 sm:p-5"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex items-start gap-3">
              <span aria-hidden className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-paper">
                <Cookie className="h-4 w-4" />
              </span>
              <p className="text-sm leading-relaxed text-ink-2">
                Folosim cookie-uri necesare pentru funcționarea magazinului și, doar cu acordul tău, cookie-uri de analiză și
                marketing. Detalii în{" "}
                <Link href="/pages/politica-cookies" className="underline underline-offset-2">
                  Politica de cookies
                </Link>
                .
              </p>
            </div>
            <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex">
              <Button variant="secondary" size="sm" onClick={() => openPreferences(true)} className="col-span-2 sm:col-span-1">
                Personalizează
              </Button>
              <Button variant="outline" size="sm" onClick={() => save({ preferences: false, analytics: false, marketing: false })}>
                Refuză tot
              </Button>
              <Button variant="primary" size="sm" onClick={() => save({ preferences: true, analytics: true, marketing: true })}>
                Accept tot
              </Button>
            </div>
          </div>
        </div>
      )}
      <Modal
        open={preferencesOpen}
        onOpenChange={openPreferences}
        title="Setări cookie"
        description="Alege ce categorii de cookie-uri accepți. Îți poți schimba opțiunea oricând."
      >
        <ul className="flex flex-col divide-y divide-line">
          {CATEGORIES.map((c) => {
            const checked = c.locked ? true : draft[c.key as keyof typeof draft]
            return (
              <li key={c.key} className="flex items-start justify-between gap-4 py-4">
                <div>
                  <p className="text-sm font-medium" id={`consent-${c.key}`}>
                    {c.title}
                  </p>
                  <p className="mt-1 text-sm text-muted">{c.body}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={checked}
                  aria-labelledby={`consent-${c.key}`}
                  disabled={c.locked}
                  onClick={() => !c.locked && setDraft((d) => ({ ...d, [c.key]: !d[c.key as keyof typeof d] }))}
                  className={cn(
                    "relative mt-1 h-7 w-12 shrink-0 rounded-full transition-colors",
                    checked ? "bg-ink" : "bg-stone",
                    c.locked && "opacity-60"
                  )}
                >
                  <span className={cn("absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform", checked ? "translate-x-6" : "translate-x-1")} />
                </button>
              </li>
            )
          })}
        </ul>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Button variant="outline" onClick={() => save({ preferences: false, analytics: false, marketing: false })}>
            Refuză tot
          </Button>
          <Button variant="secondary" onClick={() => save(draft)}>
            Salvează alegerea
          </Button>
          <Button onClick={() => save({ preferences: true, analytics: true, marketing: true })}>Accept tot</Button>
        </div>
      </Modal>
    </>
  )
}

export function CookieSettingsLink({ className }: { className?: string }) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event("oh:open-consent"))}>
      Setări cookie
    </button>
  )
}
