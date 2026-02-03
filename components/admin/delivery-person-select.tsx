"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { assignDeliveryPerson } from "@/actions/admin/orders";

interface DeliveryPersonSelectProps {
  orderId: string;
  currentPersonId: string | null;
  deliveryPersons: { id: string; name: string }[];
}

export function DeliveryPersonSelect({
  orderId,
  currentPersonId,
  deliveryPersons,
}: DeliveryPersonSelectProps) {
  const [isPending, startTransition] = useTransition();

  function handleChange(value: string) {
    if (value === currentPersonId) return;

    const person = value === "none" ? null : deliveryPersons.find((p) => p.id === value);

    startTransition(async () => {
      const result = await assignDeliveryPerson(
        orderId,
        value === "none" ? null : value,
        person?.name || null
      );
      if (result.success) {
        toast.success("Livreur assigné");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Select
      value={currentPersonId || "none"}
      onValueChange={handleChange}
      disabled={isPending}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Sélectionner un livreur" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Non assigné</SelectItem>
        {deliveryPersons.map((person) => (
          <SelectItem key={person.id} value={person.id}>
            {person.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
