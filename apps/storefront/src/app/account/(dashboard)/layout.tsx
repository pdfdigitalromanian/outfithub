import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getCustomer } from "@/lib/data/customer"
import { AccountNav } from "@/components/account/account-nav"

export const metadata: Metadata = { title: "Contul meu", robots: { index: false, follow: false } }
export const dynamic = "force-dynamic"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const customer = await getCustomer()
  if (!customer) redirect("/account/login")
  return (
    <div className="container-page pt-8 sm:pt-12">
      <p className="eyebrow">Contul meu</p>
      <h1 className="display mt-2 text-5xl sm:text-6xl">Salut, {customer.first_name || "acolo"}</h1>
      <div className="mt-10 grid gap-8 lg:grid-cols-12">
        <aside className="min-w-0 lg:col-span-3">
          <AccountNav />
        </aside>
        <div className="min-w-0 lg:col-span-9">{children}</div>
      </div>
    </div>
  )
}
