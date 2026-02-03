import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminHeader } from "@/components/admin/admin-header";
import { OrderStatusTimeline } from "@/components/storefront/order-status-timeline";
import { OrderStatusActions } from "@/components/admin/order-status-actions";
import { OrderNotesForm } from "@/components/admin/order-notes-form";
import { DeliveryPersonSelect } from "@/components/admin/delivery-person-select";
import { OrderStatusHistory } from "@/components/admin/order-status-history";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft02Icon, PrinterIcon } from "@hugeicons/core-free-icons";
import { formatPrice } from "@/lib/utils";
import { getAdminOrderById, getDeliveryPersons } from "@/lib/db/admin/orders";

interface Props {
  params: Promise<{ id: string }>;
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params;
  const [order, deliveryPersons] = await Promise.all([
    getAdminOrderById(id),
    getDeliveryPersons(),
  ]);

  if (!order) notFound();

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/orders">
            <HugeiconsIcon icon={ArrowLeft02Icon} size={20} />
          </Link>
        </Button>
        <AdminHeader title={`Commande ${order.order_number}`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Status Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Statut</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <OrderStatusTimeline status={order.status} />
              <Separator />
              <OrderStatusActions orderId={order.id} currentStatus={order.status} />
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                Articles ({order.items.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                  >
                    <div>
                      <p className="font-medium">{item.product_name}</p>
                      {item.variant_name && (
                        <p className="text-xs text-muted-foreground">
                          {item.variant_name}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {formatPrice(item.unit_price)} × {item.quantity}
                      </p>
                    </div>
                    <p className="font-mono text-sm">
                      {formatPrice(item.total_price)}
                    </p>
                  </div>
                ))}
              </div>

              <Separator className="my-4" />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sous-total</span>
                  <span className="font-mono">{formatPrice(order.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Livraison</span>
                  <span className="font-mono">
                    {formatPrice(order.delivery_fee)}
                  </span>
                </div>
                {order.discount_amount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Réduction</span>
                    <span className="font-mono">
                      -{formatPrice(order.discount_amount)}
                    </span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-medium">
                  <span>Total</span>
                  <span className="font-mono">{formatPrice(order.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Historique des statuts</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderStatusHistory history={order.status_history} />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Client Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Client</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-medium">{order.user_name}</p>
              <p className="text-muted-foreground">{order.user_email}</p>
              {order.user_phone && (
                <p className="text-muted-foreground">{order.user_phone}</p>
              )}
            </CardContent>
          </Card>

          {/* Delivery Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Livraison</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">Adresse</p>
                <p>{order.delivery_address}</p>
                <p>{order.delivery_commune}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Téléphone</p>
                <p>{order.delivery_phone}</p>
              </div>
              {order.delivery_instructions && (
                <div>
                  <p className="text-muted-foreground">Instructions</p>
                  <p>{order.delivery_instructions}</p>
                </div>
              )}
              {order.estimated_delivery && (
                <div>
                  <p className="text-muted-foreground">Livraison estimée</p>
                  <p>{formatDateTime(order.estimated_delivery)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Delivery Person */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Livreur assigné</CardTitle>
            </CardHeader>
            <CardContent>
              <DeliveryPersonSelect
                orderId={order.id}
                currentPersonId={order.delivery_person_id}
                deliveryPersons={deliveryPersons}
              />
              {order.delivery_person_name && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Actuellement : {order.delivery_person_name}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Internal Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Notes internes</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderNotesForm
                orderId={order.id}
                initialNotes={order.internal_notes}
              />
            </CardContent>
          </Card>

          {/* Timestamps */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Dates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Créée</span>
                <span>{formatDateTime(order.created_at)}</span>
              </div>
              {order.confirmed_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Confirmée</span>
                  <span>{formatDateTime(order.confirmed_at)}</span>
                </div>
              )}
              {order.preparing_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Préparation</span>
                  <span>{formatDateTime(order.preparing_at)}</span>
                </div>
              )}
              {order.shipping_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expédition</span>
                  <span>{formatDateTime(order.shipping_at)}</span>
                </div>
              )}
              {order.delivered_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Livrée</span>
                  <span>{formatDateTime(order.delivered_at)}</span>
                </div>
              )}
              {order.cancelled_at && (
                <div className="flex justify-between text-destructive">
                  <span>Annulée</span>
                  <span>{formatDateTime(order.cancelled_at)}</span>
                </div>
              )}
              {order.returned_at && (
                <div className="flex justify-between text-destructive">
                  <span>Retournée</span>
                  <span>{formatDateTime(order.returned_at)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cancellation/Return Reason */}
          {(order.cancellation_reason || order.return_reason) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  {order.status === "cancelled"
                    ? "Raison d'annulation"
                    : "Raison du retour"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {order.cancellation_reason || order.return_reason}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full" asChild>
                <Link href={`/orders/${order.id}/invoice`}>
                  <HugeiconsIcon icon={PrinterIcon} size={16} className="mr-2" />
                  Voir facture
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
