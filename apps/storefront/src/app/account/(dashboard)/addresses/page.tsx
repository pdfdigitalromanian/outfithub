import { getCustomer } from "@/lib/data/customer"
import { AddressBook } from "@/components/account/profile-forms"

export default async function AddressesPage() {
  const customer = await getCustomer()
  return <AddressBook addresses={(customer?.addresses ?? []) as any} />
}
