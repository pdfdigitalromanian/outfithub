"use client"

import { useRouter } from "next/navigation"
import { useActionState, useEffect, useState } from "react"
import { useFormStatus } from "react-dom"
import { Plus } from "lucide-react"
import { deleteAddressAction, saveAddressAction, updateProfileAction } from "@/lib/actions/account"
import { Button } from "../ui/button"
import { Checkbox, Field, SelectField } from "../ui/input"
import { Modal } from "../ui/sheet"
import { RO_COUNTIES } from "@/lib/ro-counties"

function Submit({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" loading={pending}>
      {children}
    </Button>
  )
}

export function ProfileForm({ customer }: { customer: { first_name: string; last_name: string; phone: string; email: string } }) {
  const [state, action] = useActionState(updateProfileAction, null)
  return (
    <form action={action} className="flex flex-col gap-4">
      {state?.error && <p role="alert" className="text-sm text-clay">{state.error}</p>}
      {state?.success && <p role="status" className="text-sm text-moss">{state.success}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Prenume" name="first_name" defaultValue={customer.first_name} autoComplete="given-name" />
        <Field label="Nume" name="last_name" defaultValue={customer.last_name} autoComplete="family-name" />
      </div>
      <Field label="Telefon" name="phone" type="tel" defaultValue={customer.phone} autoComplete="tel" />
      <Field label="E-mail" defaultValue={customer.email} disabled hint="Pentru schimbarea e-mailului contactează-ne." />
      <div>
        <Submit>Salvează</Submit>
      </div>
    </form>
  )
}

type Address = {
  id: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  address_1: string | null
  address_2: string | null
  city: string | null
  province: string | null
  postal_code: string | null
  company: string | null
  is_default_shipping: boolean
}

export function AddressBook({ addresses }: { addresses: Address[] }) {
  const router = useRouter()
  const [editing, setEditing] = useState<Address | "new" | null>(null)
  return (
    <div>
      <div className="grid gap-4 md:grid-cols-2">
        {addresses.map((a) => (
          <div key={a.id} className="flex flex-col rounded-xl bg-surface p-6 text-sm shadow-soft">
            {a.is_default_shipping && <span className="mb-3 self-start rounded-full bg-moss-soft px-3 py-1 text-xs text-moss">Implicită</span>}
            <p className="font-medium">
              {a.first_name} {a.last_name}
            </p>
            <p className="mt-1 text-muted">
              {a.address_1}
              {a.address_2 ? `, ${a.address_2}` : ""}
              <br />
              {a.city}, {a.province} {a.postal_code}
              <br />
              {a.phone}
            </p>
            <div className="mt-4 flex gap-4">
              <button type="button" onClick={() => setEditing(a)} className="underline underline-offset-2">
                Editează
              </button>
              <button
                type="button"
                className="text-muted underline underline-offset-2"
                onClick={async () => {
                  await deleteAddressAction(a.id)
                  router.refresh()
                }}
              >
                Șterge
              </button>
            </div>
          </div>
        ))}
        <button type="button" onClick={() => setEditing("new")} className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-stone text-sm text-muted hover:border-ink hover:text-ink">
          <Plus className="h-5 w-5" /> Adaugă adresă
        </button>
      </div>
      <Modal open={!!editing} onOpenChange={(o) => !o && setEditing(null)} title={editing === "new" ? "Adresă nouă" : "Editează adresa"}>
        {editing && (
          <AddressForm
            address={editing === "new" ? null : editing}
            onDone={() => {
              setEditing(null)
              router.refresh()
            }}
          />
        )}
      </Modal>
    </div>
  )
}

function AddressForm({ address, onDone }: { address: Address | null; onDone: () => void }) {
  const [state, action] = useActionState(saveAddressAction, null)
  useEffect(() => {
    if (state?.success) onDone()
  }, [state, onDone])
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="id" value={address?.id ?? ""} />
      {state?.error && <p role="alert" className="text-sm text-clay sm:col-span-2">{state.error}</p>}
      <Field label="Prenume" name="first_name" defaultValue={address?.first_name ?? ""} required />
      <Field label="Nume" name="last_name" defaultValue={address?.last_name ?? ""} required />
      <Field label="Telefon" name="phone" type="tel" defaultValue={address?.phone ?? ""} required wrapperClassName="sm:col-span-2" />
      <Field label="Stradă, număr" name="address_1" defaultValue={address?.address_1 ?? ""} required wrapperClassName="sm:col-span-2" />
      <Field label="Bloc, scară, apartament" name="address_2" defaultValue={address?.address_2 ?? ""} wrapperClassName="sm:col-span-2" />
      <Field label="Localitate" name="city" defaultValue={address?.city ?? ""} required />
      <SelectField label="Județ" name="province" defaultValue={address?.province ?? ""} options={[{ value: "", label: "Alege" }, ...RO_COUNTIES.map((c) => ({ value: c, label: c }))]} />
      <Field label="Cod poștal" name="postal_code" defaultValue={address?.postal_code ?? ""} />
      <Field label="Companie" name="company" defaultValue={address?.company ?? ""} />
      <Checkbox name="is_default_shipping" defaultChecked={address?.is_default_shipping} label="Adresă implicită de livrare" className="sm:col-span-2" />
      <div className="sm:col-span-2">
        <Submit>Salvează adresa</Submit>
      </div>
    </form>
  )
}
