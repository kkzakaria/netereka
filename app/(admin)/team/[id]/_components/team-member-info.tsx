"use client";

import { memo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Mail01Icon,
  SmartPhone01Icon,
  UserAccountIcon,
  Briefcase01Icon,
} from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TEAM_ROLE_LABELS, TEAM_ROLE_VARIANTS } from "@/lib/constants/team";
import type { TeamMemberDetail } from "@/lib/db/types";

interface TeamMemberInfoProps {
  member: TeamMemberDetail;
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase();
}

// Hoisted static icons
const mailIcon = <HugeiconsIcon icon={Mail01Icon} size={16} className="text-muted-foreground" />;
const phoneIcon = <HugeiconsIcon icon={SmartPhone01Icon} size={16} className="text-muted-foreground" />;
const roleIcon = <HugeiconsIcon icon={UserAccountIcon} size={16} className="text-muted-foreground" />;
const jobIcon = <HugeiconsIcon icon={Briefcase01Icon} size={16} className="text-muted-foreground" />;

export const TeamMemberInfo = memo(function TeamMemberInfo({
  member,
}: TeamMemberInfoProps) {
  const roleKey = member.role as "admin" | "super_admin";
  const fullName = `${member.first_name} ${member.last_name}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informations</CardTitle>
        <CardDescription>Profil du membre de l&apos;équipe</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          {/* Avatar */}
          <Avatar className="h-20 w-20 shrink-0">
            {member.avatar_url && (
              <AvatarImage src={member.avatar_url} alt={fullName} />
            )}
            <AvatarFallback className="text-2xl">
              {getInitials(member.first_name, member.last_name)}
            </AvatarFallback>
          </Avatar>

          {/* Info */}
          <div className="flex-1 space-y-4">
            <div>
              <h2 className="text-xl font-semibold">{fullName}</h2>
              {member.job_title && (
                <p className="text-sm text-muted-foreground">
                  {member.job_title}
                </p>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {/* Email */}
              <div className="flex items-center gap-2">
                {mailIcon}
                <span className="text-sm">{member.email}</span>
              </div>

              {/* Phone */}
              <div className="flex items-center gap-2">
                {phoneIcon}
                <span className="text-sm">
                  {member.phone || "Non renseigné"}
                </span>
              </div>

              {/* Role */}
              <div className="flex items-center gap-2">
                {roleIcon}
                <Badge variant={TEAM_ROLE_VARIANTS[roleKey] || "secondary"}>
                  {TEAM_ROLE_LABELS[roleKey] || member.role}
                </Badge>
              </div>

              {/* Job title */}
              {member.job_title && (
                <div className="flex items-center gap-2">
                  {jobIcon}
                  <span className="text-sm">{member.job_title}</span>
                </div>
              )}
            </div>

            {/* Status */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Statut:</span>
              {member.is_active === 1 ? (
                <Badge variant="outline" className="text-green-600">
                  Actif
                </Badge>
              ) : (
                <Badge variant="destructive">Inactif</Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
