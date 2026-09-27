"use client"

import { useEffect, useState } from "react"
import { Download } from "lucide-react"

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

/** Shows an "Install app" action when the browser offers PWA installation. */
export function InstallButton({ className }: { className?: string }) {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null)
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setEvt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener("beforeinstallprompt", onPrompt)
    return () => window.removeEventListener("beforeinstallprompt", onPrompt)
  }, [])
  if (!evt) return null
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        await evt.prompt()
        await evt.userChoice
        setEvt(null)
      }}
    >
      <Download className="h-4 w-4" /> Instalează aplicația
    </button>
  )
}
