import type { Metadata } from "next"
import { LoginForm } from "@/components/account/auth-forms"

export const metadata: Metadata = { title: "Autentificare" }

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams
  return (
    <>
      <h1 className="display text-4xl">Bine ai revenit</h1>
      <p className="mb-8 mt-2 text-sm text-muted">Intră în cont pentru comenzi, adrese și favorite.</p>
      <LoginForm next={next} />
    </>
  )
}
