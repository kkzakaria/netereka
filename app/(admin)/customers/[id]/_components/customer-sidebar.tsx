"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice, formatDateLong } from "@/lib/utils";
import { toggleCustomerActive } from "@/actions/admin/customers";
import type { AdminCustomerDetail } from "@/lib/db/types";

interface CustomerSidebarProps {
  customer: AdminCustomerDetail;
}

export function CustomerSidebar({ customer }: CustomerSidebarProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleToggleActive() {
    setError(null);
    startTransition(async () => {
      const result = await toggleCustomerActive(customer.id);
      if (!result.success) {
        setError(result.error || "Erreur lors du changement de statut");
      } else {
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
            <span className="text-sm text-muted-foreground">Statut</span>
            {customer.is_active === 1 ? (
              <Badge variant="outline" className="text-green-600">Actif</Badge>
            ) : (
              <Badge variant="destructive">Inactif</Badge>
            )}
          </div>
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
          <CardTitle className="text-sm">Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {/* Toggle active status */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">
              Statut du compte
            </label>
            <Button
              variant={customer.is_active === 1 ? "destructive" : "default"}
              className="w-full"
              onClick={handleToggleActive}
              disabled={isPending}
            >
              {isPending
                ? "Mise à jour..."
                : customer.is_active === 1
                ? "Désactiver le compte"
                : "Activer le compte"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
