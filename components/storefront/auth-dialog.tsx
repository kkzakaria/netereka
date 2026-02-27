"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SignInForm } from "@/app/(auth)/auth/sign-in/sign-in-form";
import { SignUpForm } from "@/app/(auth)/auth/sign-up/sign-up-form";
import { toggleWishlist } from "@/actions/wishlist";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
}

type View = "sign-in" | "sign-up";

export function AuthDialog({ open, onOpenChange, productId }: Props) {
  const [view, setView] = useState<View>("sign-in");

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) setView("sign-in");
    onOpenChange(nextOpen);
  }

  async function handleAuthSuccess() {
    onOpenChange(false);
    try {
      const result = await toggleWishlist(productId);
      if (result.success) {
        toast.success(result.added ? "Ajouté aux favoris" : "Retiré des favoris");
      } else {
        toast.error("Impossible de mettre à jour les favoris.");
      }
    } catch (err) {
      // Re-throw Next.js redirect errors — these must propagate
      if (
        err instanceof Error &&
        typeof (err as { digest?: string }).digest === "string" &&
        (err as { digest?: string }).digest!.startsWith("NEXT_REDIRECT")
      ) {
        throw err;
      }
      toast.error("Impossible de mettre à jour les favoris.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm overflow-y-auto max-h-[90svh]">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">
            {view === "sign-in" ? "Connectez-vous pour sauvegarder" : "Créer un compte"}
          </DialogTitle>
        </DialogHeader>

        {view === "sign-in" ? (
          <>
            <SignInForm onSuccess={handleAuthSuccess} />
            <p className="text-center text-sm text-muted-foreground mt-2">
              Pas encore de compte ?{" "}
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => setView("sign-up")}
              >
                S&apos;inscrire
              </button>
            </p>
          </>
        ) : (
          <>
            <SignUpForm onSuccess={handleAuthSuccess} />
            <p className="text-center text-sm text-muted-foreground mt-2">
              Déjà un compte ?{" "}
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => setView("sign-in")}
              >
                Se connecter
              </button>
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
