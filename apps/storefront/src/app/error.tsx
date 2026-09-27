"use client"

import { useEffect } from "react"
import { Button, ButtonLink } from "@/components/ui/button"

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])
  return (
    <div className="container-page flex flex-col items-center py-24 text-center">
      <p className="eyebrow">Ceva nu a mers</p>
      <h1 className="display mt-4 text-5xl sm:text-6xl">Ne pare rău</h1>
      <p className="mt-4 max-w-md text-muted">A apărut o eroare neașteptată. Încearcă din nou în câteva momente.</p>
      <div className="mt-8 flex gap-3">
        <Button onClick={reset}>Reîncearcă</Button>
        <ButtonLink href="/" variant="secondary">
          Acasă
        </ButtonLink>
      </div>
      {error.digest && <p className="mt-6 text-xs text-subtle">Cod: {error.digest}</p>}
    </div>
  )
}
