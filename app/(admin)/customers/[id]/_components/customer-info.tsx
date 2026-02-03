import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon, Cancel01Icon, Mail01Icon, SmartPhone01Icon } from "@hugeicons/core-free-icons";
import { formatDateLong } from "@/lib/utils";
import { ROLE_LABELS, ROLE_VARIANTS } from "@/lib/constants/customers";
import type { AdminCustomerDetail } from "@/lib/db/types";

interface CustomerInfoProps {
  customer: AdminCustomerDetail;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function CustomerInfo({ customer }: CustomerInfoProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Informations client</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16 shrink-0">
            {customer.image && (
              <AvatarImage src={customer.image} alt={customer.name} />
            )}
            <AvatarFallback className="text-lg">
              {getInitials(customer.name)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0 space-y-2">
            <div>
              <h3 className="text-lg font-semibold truncate">{customer.name}</h3>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <Badge variant={ROLE_VARIANTS[customer.role] || "secondary"}>
                  {ROLE_LABELS[customer.role] || customer.role}
                </Badge>
                {customer.is_active === 0 && (
                  <Badge variant="destructive">Inactif</Badge>
                )}
                {customer.emailVerified ? (
                  <Badge variant="outline" className="gap-1 text-green-600 border-green-600">
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={12} />
                    Email vérifié
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1 text-amber-600 border-amber-600">
                    <HugeiconsIcon icon={Cancel01Icon} size={12} />
                    Non vérifié
                  </Badge>
                )}
              </div>
            </div>

            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={Mail01Icon} size={14} />
                <span className="truncate">{customer.email}</span>
              </div>
              {customer.phone && (
                <div className="flex items-center gap-2">
                  <HugeiconsIcon icon={SmartPhone01Icon} size={14} />
                  <span>{customer.phone}</span>
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Membre depuis le {formatDateLong(customer.createdAt)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
