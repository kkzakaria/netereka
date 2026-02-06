"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth/client";
import { useRouter } from "next/navigation";
import {
  UserIcon,
  ShoppingBag01Icon,
  Location01Icon,
  FavouriteIcon,
  StarIcon,
  Logout01Icon,
  DashboardSquare01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

type User = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role?: string;
} | null;

function UserAvatar({ user }: { user: NonNullable<User> }) {
  const initials = (user.name || "?")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (user.image) {
    return (
      <Image
        src={user.image}
        alt={user.name}
        width={32}
        height={32}
        className="size-8 rounded-full object-cover"
      />
    );
  }

  return (
    <span className="flex size-8 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
      {initials}
    </span>
  );
}

const menuItems = [
  { href: "/account", label: "Mon profil", icon: UserIcon },
  { href: "/account/orders", label: "Mes commandes", icon: ShoppingBag01Icon },
  { href: "/account/addresses", label: "Mes adresses", icon: Location01Icon },
  { href: "/account/wishlist", label: "Mes favoris", icon: FavouriteIcon },
  { href: "/account/reviews", label: "Mes avis", icon: StarIcon },
];

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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Menu utilisateur"
        >
          <UserAvatar user={user} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-medium">{user.name}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </DropdownMenuLabel>
        {(user.role === "admin" || user.role === "super_admin") && (
          <DropdownMenuItem asChild>
            <Link href="/dashboard" target="_blank">
              <HugeiconsIcon icon={DashboardSquare01Icon} size={16} />
              Administration
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {menuItems.map((item) => (
          <DropdownMenuItem key={item.href} asChild>
            <Link href={item.href}>
              <HugeiconsIcon icon={item.icon} size={16} />
              {item.label}
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={async () => {
            await authClient.signOut();
            router.refresh();
          }}
        >
          <HugeiconsIcon icon={Logout01Icon} size={16} />
          Déconnexion
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
