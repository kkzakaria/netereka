import { requireAuth } from "@/lib/auth/guards";
import { getActiveDeliveryZones } from "@/lib/db/delivery-zones";
import { getUserAddresses } from "@/lib/db/addresses";
import { CheckoutForm } from "@/components/storefront/checkout-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Passer la commande",
  robots: { index: false, follow: false },
};

interface SessionUser {
  id: string;
  name: string;
  phone?: string;
}

export default async function CheckoutPage() {
  const session = await requireAuth();
  const user = session.user as SessionUser;

  const [zones, addresses] = await Promise.all([
    getActiveDeliveryZones(),
    getUserAddresses(user.id),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-8 text-2xl font-bold">Passer la commande</h1>
      <CheckoutForm
        zones={zones}
        savedAddresses={addresses}
        userName={user.name}
        userPhone={user.phone}
      />
    </div>
  );
}
