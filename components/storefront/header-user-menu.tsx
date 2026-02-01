"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { logout } from "@/actions/auth";
import type { SafeUser } from "@/lib/db/users";

export function HeaderUserMenu({ user }: { user: SafeUser | null }) {
  if (!user) {
    return (
      <Button variant="default" size="default" asChild>
        <Link href="/auth/login">Connexion</Link>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        href="/account"
        className="text-xs font-medium hover:text-foreground text-muted-foreground"
      >
        {user.first_name}
      </Link>
      <form action={logout}>
        <Button variant="ghost" size="default" type="submit">
          Déconnexion
        </Button>
      </form>
    </div>
  );
}
