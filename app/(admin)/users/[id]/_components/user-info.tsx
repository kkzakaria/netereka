import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon, Cancel01Icon, Mail01Icon, SmartPhone01Icon } from "@hugeicons/core-free-icons";
import { formatDateLong } from "@/lib/utils";
import { ROLE_LABELS, ROLE_VARIANTS } from "@/lib/constants/customers";
import type { AdminUser } from "@/lib/db/admin/users";

interface UserInfoProps {
  user: AdminUser;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function UserInfo({ user }: UserInfoProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">
          Informations utilisateur
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16 shrink-0">
            {user.image && (
              <AvatarImage src={user.image} alt={user.name} />
            )}
            <AvatarFallback className="text-lg">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0 space-y-2">
            <div>
              <h3 className="text-lg font-semibold truncate">{user.name}</h3>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <Badge variant={ROLE_VARIANTS[user.role] || "secondary"}>
                  {ROLE_LABELS[user.role] || user.role}
                </Badge>
                {user.emailVerified ? (
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
                <span className="truncate">{user.email}</span>
              </div>
              {user.phone && (
                <div className="flex items-center gap-2">
                  <HugeiconsIcon icon={SmartPhone01Icon} size={14} />
                  <span>{user.phone}</span>
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Membre depuis le {formatDateLong(user.createdAt)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
