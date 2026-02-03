"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface OrderFiltersProps {
  communes: string[];
}

export function OrderFilters({ communes }: OrderFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const createQueryString = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });
      // Reset page when filters change
      if (!("page" in updates)) {
        params.delete("page");
      }
      return params.toString();
    },
    [searchParams]
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const updates: Record<string, string | null> = {
      search: formData.get("search") as string,
      status: formData.get("status") as string,
      commune: formData.get("commune") as string,
      dateFrom: formData.get("dateFrom") as string,
      dateTo: formData.get("dateTo") as string,
    };

    startTransition(() => {
      router.push(`/orders?${createQueryString(updates)}`);
    });
  }

  function handleReset() {
    startTransition(() => {
      router.push("/orders");
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-3"
    >
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Recherche</label>
        <Input
          name="search"
          placeholder="N° commande, nom, tél..."
          defaultValue={searchParams.get("search") ?? ""}
          className="w-full sm:w-48"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Statut</label>
        <select
          name="status"
          defaultValue={searchParams.get("status") ?? "all"}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="all">Tous</option>
          <option value="pending">En attente</option>
          <option value="confirmed">Confirmée</option>
          <option value="preparing">Préparation</option>
          <option value="shipping">Livraison</option>
          <option value="delivered">Livrée</option>
          <option value="cancelled">Annulée</option>
          <option value="returned">Retournée</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Commune</label>
        <select
          name="commune"
          defaultValue={searchParams.get("commune") ?? ""}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">Toutes</option>
          {communes.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Date début</label>
        <Input
          name="dateFrom"
          type="date"
          defaultValue={searchParams.get("dateFrom") ?? ""}
          className="w-36"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Date fin</label>
        <Input
          name="dateTo"
          type="date"
          defaultValue={searchParams.get("dateTo") ?? ""}
          className="w-36"
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" variant="secondary" size="sm" disabled={isPending}>
          Filtrer
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleReset}
          disabled={isPending}
        >
          Réinitialiser
        </Button>
      </div>
    </form>
  );
}
