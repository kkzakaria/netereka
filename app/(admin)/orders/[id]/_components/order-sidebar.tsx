import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DeliveryPersonSelect } from "@/components/admin/delivery-person-select";
import { OrderNotesForm } from "@/components/admin/order-notes-form";
import { HugeiconsIcon } from "@hugeicons/react";
import { PrinterIcon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { getDeliveryPersons } from "@/lib/db/admin/orders";
import type { AdminOrderDetail } from "@/lib/db/types";

// Hoisted format options (rendering-hoist-jsx)
const dateTimeFormatOptions: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("fr-FR", dateTimeFormatOptions);
}

// Hoisted static icon (rendering-hoist-jsx)
const printerIcon = <HugeiconsIcon icon={PrinterIcon} size={16} className="mr-2" />;

interface OrderSidebarProps {
  order: AdminOrderDetail;
}

// Async component that fetches delivery persons (async-suspense-boundaries)
export async function OrderSidebarAsync({ order }: OrderSidebarProps) {
  const deliveryPersons = await getDeliveryPersons();

  return (
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
              {printerIcon}
              Voir facture
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// Skeleton for Suspense fallback
export function OrderSidebarSkeleton() {
  return (
    <div className="space-y-6">
      {[...Array(5)].map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
