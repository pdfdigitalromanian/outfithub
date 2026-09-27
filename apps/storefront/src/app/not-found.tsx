import Link from "next/link"
import { ButtonLink } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="container-page flex flex-col items-center py-24 text-center">
      <p className="eyebrow">Eroare 404</p>
      <h1 className="display mt-4 text-6xl sm:text-7xl">Pagina nu există</h1>
      <p className="mt-4 max-w-md text-muted">Poate a fost mutată sau produsul nu mai este disponibil.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/shop">Vezi produsele</ButtonLink>
        <ButtonLink href="/" variant="secondary">
          Acasă
        </ButtonLink>
      </div>
      <p className="mt-10 text-sm text-muted">
        Ai nevoie de ajutor? <Link href="/pages/contact" className="underline underline-offset-2">Contactează-ne</Link>
      </p>
    </div>
  )
}
