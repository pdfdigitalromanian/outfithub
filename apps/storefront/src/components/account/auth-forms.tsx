"use client"

import Link from "next/link"
import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { loginAction, registerAction, requestPasswordResetAction, resetPasswordAction, type FormState } from "@/lib/actions/account"
import { Button } from "../ui/button"
import { Checkbox, Field } from "../ui/input"

function Submit({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="lg" loading={pending} className="w-full">
      {children}
    </Button>
  )
}

function Status({ state }: { state: FormState }) {
  if (!state) return null
  return state.error ? (
    <p role="alert" className="rounded-md bg-clay-soft px-4 py-3 text-sm text-clay">
      {state.error}
    </p>
  ) : state.success ? (
    <p role="status" className="rounded-md bg-moss-soft px-4 py-3 text-sm text-moss">
      {state.success}
    </p>
  ) : null
}

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(loginAction, null)
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <Status state={state} />
      <Field label="E-mail" name="email" type="email" autoComplete="email" required />
      <Field label="Parolă" name="password" type="password" autoComplete="current-password" required />
      <Link href="/account/reset-password" className="self-end text-xs text-muted underline-offset-2 hover:underline">
        Ai uitat parola?
      </Link>
      <Submit>Autentificare</Submit>
      <p className="text-center text-sm text-muted">
        Nu ai cont?{" "}
        <Link href="/account/register" className="text-ink underline underline-offset-2">
          Creează unul
        </Link>
      </p>
    </form>
  )
}

export function RegisterForm() {
  const [state, action] = useActionState(registerAction, null)
  return (
    <form action={action} className="flex flex-col gap-4">
      <Status state={state} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Prenume" name="first_name" autoComplete="given-name" required />
        <Field label="Nume" name="last_name" autoComplete="family-name" required />
      </div>
      <Field label="E-mail" name="email" type="email" autoComplete="email" required />
      <Field label="Parolă" name="password" type="password" autoComplete="new-password" minLength={8} required hint="Minim 8 caractere." />
      <Checkbox
        name="terms"
        required
        label={
          <>
            Sunt de acord cu{" "}
            <Link href="/pages/termeni-si-conditii" className="underline underline-offset-2" target="_blank">
              Termenii
            </Link>{" "}
            și am citit{" "}
            <Link href="/pages/politica-de-confidentialitate" className="underline underline-offset-2" target="_blank">
              Politica de confidențialitate
            </Link>
            .
          </>
        }
      />
      <Submit>Creează cont</Submit>
      <p className="text-center text-sm text-muted">
        Ai deja cont?{" "}
        <Link href="/account/login" className="text-ink underline underline-offset-2">
          Autentifică-te
        </Link>
      </p>
    </form>
  )
}

export function ResetRequestForm() {
  const [state, action] = useActionState(requestPasswordResetAction, null)
  return (
    <form action={action} className="flex flex-col gap-4">
      <Status state={state} />
      <Field label="E-mail" name="email" type="email" autoComplete="email" required />
      <Submit>Trimite link de resetare</Submit>
    </form>
  )
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPasswordAction, null)
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <Status state={state} />
      <Field label="Parola nouă" name="password" type="password" autoComplete="new-password" minLength={8} required />
      <Submit>Salvează parola</Submit>
      {state?.success && (
        <Link href="/account/login" className="text-center text-sm underline underline-offset-2">
          Mergi la autentificare
        </Link>
      )}
    </form>
  )
}
