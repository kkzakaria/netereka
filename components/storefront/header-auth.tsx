"use client";

import { authClient } from "@/lib/auth/client";
import { HeaderUserMenu } from "@/components/storefront/header-user-menu";

export function HeaderAuth() {
  const session = authClient.useSession();

  if (session.isPending) {
    return <div className="h-8 w-20 animate-pulse rounded-md bg-muted" />;
  }

  const user = session.data?.user
    ? {
        id: session.data.user.id,
        name: session.data.user.name,
        email: session.data.user.email,
        image: session.data.user.image ?? undefined,
        role: session.data.user.role ?? undefined,
      }
    : null;

  return <HeaderUserMenu user={user} />;
}
