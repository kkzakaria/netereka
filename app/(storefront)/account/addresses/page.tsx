import { requireAuth } from "@/lib/auth/guards";
import { getUserAddresses } from "@/lib/db/addresses";
import { AddressList } from "./address-list";

export default async function AddressesPage() {
  const session = await requireAuth();
  const addresses = await getUserAddresses(session.user.id);

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold">Mes adresses</h2>
      <AddressList addresses={addresses} />
    </div>
  );
}
