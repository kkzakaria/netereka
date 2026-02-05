import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/guards";
import { getOrderByNumber, getOrderItems } from "@/lib/db/orders";
import { OrderConfirmation } from "@/components/storefront/order-confirmation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Commande confirmée",
  robots: { index: false, follow: false },
};

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const session = await requireAuth();
  const params = await searchParams;
  const orderNumber = params.order;

  if (!orderNumber) redirect("/");

  const order = await getOrderByNumber(orderNumber, session.user.id);
  if (!order) redirect("/");

  const items = await getOrderItems(order.id);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <OrderConfirmation order={order} items={items} />
    </div>
  );
}
