"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ORDER_STATUS_LABELS } from "@/lib/constants/orders";

interface OrderFiltersProps {
  communes: string[];
}

// All statuses plus "all" option
const STATUS_OPTIONS = [
  { value: "all", label: "Tous" },
  ...Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => ({
    value,
    label,
  })),
];

export function OrderFilters({ communes }: OrderFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Controlled state for selects
  const [status, setStatus] = useState(searchParams.get("status") ?? "all");
  const [commune, setCommune] = useState(searchParams.get("commune") ?? "all");

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
      status: status === "all" ? null : status,
      commune: commune === "all" ? null : commune,
      dateFrom: formData.get("dateFrom") as string,
      dateTo: formData.get("dateTo") as string,
    };

    startTransition(() => {
      router.push(`/orders?${createQueryString(updates)}`);
    });
  }

  function handleReset() {
    setStatus("all");
    setCommune("all");
    startTransition(() => {
      router.push("/orders");
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-3"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="search" className="text-xs text-muted-foreground">
          Recherche
        </Label>
        <Input
          id="search"
          name="search"
          placeholder="N° commande, nom, tél..."
          defaultValue={searchParams.get("search") ?? ""}
          className="w-full sm:w-48"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="status-select" className="text-xs text-muted-foreground">
          Statut
        </Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger id="status-select" className="w-36">
            <SelectValue placeholder="Tous" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="commune-select" className="text-xs text-muted-foreground">
          Commune
        </Label>
        <Select value={commune} onValueChange={setCommune}>
          <SelectTrigger id="commune-select" className="w-40">
            <SelectValue placeholder="Toutes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            {communes.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="dateFrom" className="text-xs text-muted-foreground">
          Date début
        </Label>
        <Input
          id="dateFrom"
          name="dateFrom"
          type="date"
          defaultValue={searchParams.get("dateFrom") ?? ""}
          className="w-36"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="dateTo" className="text-xs text-muted-foreground">
          Date fin
        </Label>
        <Input
          id="dateTo"
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
