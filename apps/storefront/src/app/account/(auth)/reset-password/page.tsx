import type { Metadata } from "next"
import { ResetPasswordForm, ResetRequestForm } from "@/components/account/auth-forms"

export const metadata: Metadata = { title: "Resetare parolă" }

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams
  return (
    <>
      <h1 className="display text-4xl">{token ? "Parolă nouă" : "Resetare parolă"}</h1>
      <p className="mb-8 mt-2 text-sm text-muted">
        {token ? "Alege o parolă nouă pentru contul tău." : "Îți trimitem pe e-mail un link pentru a seta o parolă nouă."}
      </p>
      {token ? <ResetPasswordForm token={token} /> : <ResetRequestForm />}
    </>
  )
}
