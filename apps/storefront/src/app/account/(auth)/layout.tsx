import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getCustomer } from "@/lib/data/customer"

export const metadata: Metadata = { robots: { index: false, follow: true } }
export const dynamic = "force-dynamic"

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if (await getCustomer()) redirect("/account")
  return (
    <div className="container-page flex justify-center pt-10 sm:pt-16">
      <div className="w-full max-w-md rounded-xl bg-surface p-6 shadow-soft sm:p-10">{children}</div>
    </div>
  )
}
