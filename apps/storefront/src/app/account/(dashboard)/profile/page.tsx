import { getCustomer } from "@/lib/data/customer"
import { ProfileForm } from "@/components/account/profile-forms"

export default async function ProfilePage() {
  const customer = await getCustomer()
  return (
    <div className="max-w-xl rounded-xl bg-surface p-6 shadow-soft">
      <h2 className="mb-5 font-medium">Date personale</h2>
      <ProfileForm customer={{ first_name: customer?.first_name ?? "", last_name: customer?.last_name ?? "", phone: customer?.phone ?? "", email: customer?.email ?? "" }} />
    </div>
  )
}
