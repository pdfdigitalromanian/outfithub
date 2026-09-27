import type { Metadata } from "next"
import { RegisterForm } from "@/components/account/auth-forms"

export const metadata: Metadata = { title: "Creează cont" }

export default function RegisterPage() {
  return (
    <>
      <h1 className="display text-4xl">Creează cont</h1>
      <p className="mb-8 mt-2 text-sm text-muted">Urmărești comenzile și îți salvezi favoritele pe orice dispozitiv.</p>
      <RegisterForm />
    </>
  )
}
