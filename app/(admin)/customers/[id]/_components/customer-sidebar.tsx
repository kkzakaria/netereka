"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatPrice, formatDateLong } from "@/lib/utils";
import { banCustomer, unbanCustomer } from "@/actions/admin/customers";
import type { CustomerSidebarData } from "@/lib/db/types";

interface CustomerSidebarProps {
  customer: CustomerSidebarData;
}

export function CustomerSidebar({ customer }: CustomerSidebarProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleBan() {
    startTransition(async () => {
      const result = await banCustomer(customer.id);
      if (!result.success) {
        toast.error(result.error || "Erreur lors du bannissement du client");
      } else {
        toast.success("Client banni avec succès");
        router.refresh();
      }
    });
  }

  function handleUnban() {
    startTransition(async () => {
      const result = await unbanCustomer(customer.id);
      if (!result.success) {
        toast.error(result.error || "Erreur lors du débannissement du client");
      } else {
        toast.success("Client débanni avec succès");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Statistiques</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Total commandes</span>
            <span className="font-semibold">{customer.order_count}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Total dépensé</span>
            <span className="font-mono font-semibold">
              {formatPrice(customer.total_spent)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Membre depuis</span>
            <span className="text-sm">{formatDateLong(customer.createdAt)}</span>
          </div>
          {customer.order_count > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Panier moyen</span>
              <span className="font-mono text-sm">
                {formatPrice(Math.round(customer.total_spent / customer.order_count))}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Admin Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Actions administrateur</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Ban / Unban */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">
              Statut du compte
            </label>
            {customer.banned !== 1 ? (
              <Button
                variant="destructive"
                className="w-full"
                onClick={handleBan}
                disabled={isPending}
              >
                {isPending ? "Mise à jour..." : "Bannir"}
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleUnban}
                  disabled={isPending}
                >
                  {isPending ? "Mise à jour..." : "Débannir"}
                </Button>
                {customer.banReason && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Raison : {customer.banReason}
                  </p>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
