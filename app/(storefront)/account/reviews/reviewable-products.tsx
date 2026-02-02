"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ReviewForm } from "@/components/storefront/review-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ReviewableProduct {
  product_id: string;
  product_name: string;
  product_slug: string;
  order_number: string;
}

export function ReviewableProducts({ products }: { products: ReviewableProduct[] }) {
  const [selected, setSelected] = useState<ReviewableProduct | null>(null);

  return (
    <>
      <div className="space-y-2">
        {products.map((p) => (
          <div key={`${p.product_id}-${p.order_number}`} className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">{p.product_name}</p>
              <p className="text-xs text-muted-foreground">Commande {p.order_number}</p>
            </div>
            <Button size="xs" variant="outline" onClick={() => setSelected(p)}>
              Laisser un avis
            </Button>
          </div>
        ))}
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Laisser un avis</DialogTitle>
            <DialogDescription>
              Partagez votre expérience avec ce produit.
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <ReviewForm
              productId={selected.product_id}
              productName={selected.product_name}
              onDone={() => setSelected(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
