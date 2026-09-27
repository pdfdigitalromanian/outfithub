import type { Metadata } from "next"
import { WifiOff } from "lucide-react"
import { ButtonLink } from "@/components/ui/button"

export const metadata: Metadata = { title: "Ești offline", robots: { index: false } }

export default function OfflinePage() {
  return (
    <div className="container-page flex flex-col items-center py-24 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-full bg-paper-2">
        <WifiOff className="h-6 w-6" />
      </span>
      <h1 className="display mt-6 text-5xl">Ești offline</h1>
      <p className="mt-3 max-w-sm text-muted">Verifică conexiunea la internet. Paginile vizitate recent sunt disponibile în continuare.</p>
      <ButtonLink href="/" className="mt-8">
        Reîncearcă
      </ButtonLink>
    </div>
  )
}
