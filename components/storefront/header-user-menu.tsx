"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";
import { useRouter } from "next/navigation";

type User = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
} | null;

export function HeaderUserMenu({ user }: { user: User }) {
  const router = useRouter();

  if (!user) {
    return (
      <Button variant="default" size="default" asChild>
        <Link href="/auth/sign-in">Connexion</Link>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        href="/account"
        className="text-xs font-medium hover:text-foreground text-muted-foreground"
      >
        {user.name}
      </Link>
      <Button
        variant="ghost"
        size="default"
        onClick={async () => {
          await authClient.signOut();
          router.refresh();
        }}
      >
        Déconnexion
      </Button>
    </div>
  );
}
