"use client"

import { useEffect, useState } from "react"
import { Check, Clock, LocateFixed, MapPin, Search } from "lucide-react"
import { Modal } from "../ui/sheet"
import { Button } from "../ui/button"
import { cn } from "@/lib/util/cn"

export type Locker = {
  id: string
  name: string
  city: string | null
  county: string | null
  address: string | null
  postal_code: string | null
  lat: number | null
  lng: number | null
  schedule?: { day: number; openingHour: string; closingHour: string }[] | null
  distance_km?: number
}

/**
 * Searchable Sameday Easybox picker. Searches the backend locker cache by
 * name/city/address, or by distance using the browser's location (only on
 * explicit request). Returns the canonical Sameday locker ID.
 */
export function EasyboxSelector({
  open,
  onOpenChange,
  onSelect,
  initialCity,
  selectedId,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onSelect: (l: Locker) => void
  initialCity?: string
  selectedId?: string
}) {
  const [q, setQ] = useState(initialCity ?? "")
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [geoError, setGeoError] = useState<string | null>(null)
  const requestKey = `${q.trim()}|${coords?.lat ?? ""}|${coords?.lng ?? ""}`
  const [result, setResult] = useState<{ key: string; lockers: Locker[]; unavailable: boolean } | null>(null)
  const current = result?.key === requestKey ? result : null
  const lockers = current?.lockers ?? []
  const loading = open && (!!q.trim() || !!coords) && !current
  const unavailable = current?.unavailable ?? false

  useEffect(() => {
    if (!open || (!q.trim() && !coords)) return
    const controller = new AbortController()
    const t = setTimeout(async () => {
      const params = new URLSearchParams({ limit: "40" })
      if (q.trim()) params.set("q", q.trim())
      if (coords) {
        params.set("lat", String(coords.lat))
        params.set("lng", String(coords.lng))
      }
      try {
        const res = await fetch(`/api/lockers?${params}`, { signal: controller.signal })
        if (!res.ok) throw new Error("Locker search unavailable")
        const data = await res.json()
        if (!controller.signal.aborted) setResult({ key: requestKey, lockers: data.lockers ?? [], unavailable: data.available === false })
      } catch {
        if (!controller.signal.aborted) setResult({ key: requestKey, lockers: [], unavailable: true })
      }
    }, 220)
    return () => { clearTimeout(t); controller.abort() }
  }, [q, coords, open, requestKey])

  const locate = () => {
    setGeoError(null)
    if (!navigator.geolocation) return setGeoError("Browserul nu permite localizarea.")
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setGeoError("Nu am putut obține locația. Caută după oraș sau adresă."),
      { enableHighAccuracy: false, timeout: 8000 }
    )
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Alege Easybox" description="Caută după oraș, stradă sau numele locker-ului.">
      <div className="sticky top-0 z-10 -mx-6 bg-surface px-6 pb-3">
        <div className="flex gap-2">
          <label className="relative flex-1">
            <span className="sr-only">Caută Easybox</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
            <input
              autoFocus
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setCoords(null)
              }}
              placeholder="ex. Cluj-Napoca, Mărăști"
              className="h-12 w-full rounded-full border border-line bg-paper pl-11 pr-4 text-sm outline-none focus:border-ink"
            />
          </label>
          <Button type="button" variant="secondary" onClick={locate} className="h-12 shrink-0" aria-label="Folosește locația mea">
            <LocateFixed className="h-4 w-4" />
            <span className="hidden sm:inline">Lângă mine</span>
          </Button>
        </div>
        {geoError && <p className="mt-2 text-xs text-clay">{geoError}</p>}
      </div>

      <div className="min-h-[300px]" aria-live="polite" aria-busy={loading}>
        {unavailable ? (
          <p className="py-10 text-center text-sm text-muted">Lista Easybox nu este disponibilă momentan. Alege livrarea la adresă.</p>
        ) : loading && !lockers.length ? (
          <ul className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="skeleton h-20 rounded-md" />
            ))}
          </ul>
        ) : lockers.length ? (
          <ul className="flex flex-col gap-2" role="listbox" aria-label="Easybox disponibile">
            {lockers.map((l) => {
              const selected = l.id === selectedId
              return (
                <li key={l.id} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    onClick={() => onSelect(l)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-md border p-4 text-left transition-colors",
                      selected ? "border-ink bg-paper" : "border-line hover:border-stone hover:bg-paper"
                    )}
                  >
                    <span className={cn("mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full", selected ? "bg-ink text-paper" : "bg-paper-2")}>
                      {selected ? <Check className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-medium">{l.name}</span>
                        {l.distance_km != null && <span className="shrink-0 text-xs text-muted">{l.distance_km} km</span>}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted">
                        {[l.address, l.city, l.county].filter(Boolean).join(", ")}
                      </span>
                      {l.schedule?.length ? (
                        <span className="mt-1.5 inline-flex items-center gap-1 text-[0.7rem] text-muted">
                          <Clock className="h-3 w-3" /> {scheduleLabel(l.schedule)}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="py-10 text-center text-sm text-muted">
            {q.trim() || coords ? "Niciun Easybox găsit. Încearcă alt termen." : "Scrie orașul sau folosește locația ta pentru a vedea locker-ele din apropiere."}
          </p>
        )}
      </div>
    </Modal>
  )
}

function scheduleLabel(s: { day: number; openingHour: string; closingHour: string }[]) {
  const allDay = s.length >= 7 && s.every((d) => d.openingHour?.startsWith("00:00") && (d.closingHour?.startsWith("23:59") || d.closingHour?.startsWith("24")))
  if (allDay) return "Non-stop"
  const first = s[0]
  return `${first.openingHour?.slice(0, 5)}–${first.closingHour?.slice(0, 5)}`
}
