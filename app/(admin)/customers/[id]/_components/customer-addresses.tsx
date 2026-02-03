import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HugeiconsIcon } from "@hugeicons/react";
import { Location01Icon } from "@hugeicons/core-free-icons";
import type { Address } from "@/lib/db/types";

interface CustomerAddressesProps {
  addresses: Address[];
}

export function CustomerAddresses({ addresses }: CustomerAddressesProps) {
  if (addresses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Carnet d&apos;adresses</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Aucune adresse enregistrée</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">
          Carnet d&apos;adresses ({addresses.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {addresses.map((address) => (
            <div
              key={address.id}
              className="flex gap-3 rounded-lg border p-3"
              style={{ contentVisibility: "auto", containIntrinsicSize: "0 80px" }}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <HugeiconsIcon
                  icon={Location01Icon}
                  size={20}
                  className="text-muted-foreground"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm truncate">{address.label}</span>
                  {address.is_default === 1 && (
                    <Badge variant="secondary" className="text-[10px]">
                      Par défaut
                    </Badge>
                  )}
                </div>
                <p className="text-sm">{address.full_name}</p>
                <p className="text-sm text-muted-foreground">{address.street}</p>
                <p className="text-sm text-muted-foreground">
                  {address.commune}, {address.city}
                </p>
                <p className="text-sm text-muted-foreground">{address.phone}</p>
                {address.instructions && (
                  <p className="text-xs text-muted-foreground mt-1 italic">
                    &quot;{address.instructions}&quot;
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
