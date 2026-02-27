# Wishlist Auth Dialog — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Afficher le bouton favori sur toutes les product cards, même pour les utilisateurs non connectés ; un clic ouvre un dialogue d'authentification in-page qui, après connexion/inscription, ajoute automatiquement le produit aux favoris.

**Architecture:** `WishlistButtonDynamic` affiche toujours le bouton cœur. Quand la session est absente, un clic ouvre `AuthDialog` (nouveau composant, chargé dynamiquement). `SignInForm` et `SignUpForm` reçoivent `onSuccess?: () => void` — si fourni, ce callback remplace (ou précède) le `router.push`. Dans `AuthDialog`, `onSuccess` appelle `toggleWishlist(productId)` puis ferme le dialogue via Sonner toast.

**Tech Stack:** better-auth (`authClient.useSession()`), Cloudflare Turnstile (obligatoire), shadcn/ui Dialog, Zustand-free (server action directe), Sonner toasts, `next/dynamic` (ssr: false).

**Note sur les tests:** Le projet utilise Vitest en `environment: "node"` sans React Testing Library. Les composants client ne sont pas testables dans cette configuration. Seule la logique pure est testée. Les vérifications de composants se font via TypeScript (`tsc --noEmit`) et le pre-commit hook.

---

### Task 1: Créer la branche de travail

**Step 1: Créer et basculer sur la branche**

```bash
git checkout -b feat/wishlist-auth-dialog
```

**Step 2: Vérifier**

```bash
git branch --show-current
```
Expected: `feat/wishlist-auth-dialog`

---

### Task 2: Modifier `SignInForm` — ajouter le prop `onSuccess`

**Files:**
- Modify: `app/(auth)/auth/sign-in/sign-in-form.tsx:39`

**Context:** `SignInForm` est utilisé sur la page `/auth/sign-in`. Il redirige vers `/` après succès. On ajoute `onSuccess?: () => void`. Quand fourni (contexte dialogue), on appelle `onSuccess()` au lieu de rediriger.

**Step 1: Modifier la signature de la fonction et le bloc succès**

Remplacer la ligne 39 :
```tsx
export function SignInForm() {
```
Par :
```tsx
interface SignInFormProps {
  onSuccess?: () => void;
}

export function SignInForm({ onSuccess }: SignInFormProps = {}) {
```

Puis remplacer le bloc succès (lignes 83-86) :
```tsx
      } else {
        router.push("/");
        router.refresh();
      }
```
Par :
```tsx
      } else {
        if (onSuccess) {
          onSuccess();
        } else {
          router.push("/");
          router.refresh();
        }
      }
```

**Step 2: Vérifier TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "sign-in-form"
```
Expected: aucune sortie (pas d'erreur)

**Step 3: Commit**

```bash
git add "app/(auth)/auth/sign-in/sign-in-form.tsx"
git commit -m "feat(auth): add optional onSuccess prop to SignInForm"
```

---

### Task 3: Modifier `SignUpForm` — ajouter le prop `onSuccess`

**Files:**
- Modify: `app/(auth)/auth/sign-up/sign-up-form.tsx:41`

**Context:** `SignUpForm` redirige vers `/auth/verify-email?email=...` après succès (obligatoire — better-auth crée une session immédiatement mais l'email doit être vérifié). Quand `onSuccess` est fourni, on l'appelle EN PLUS de la redirection vers verify-email (pour fermer le dialogue et déclencher l'action wishlist pendant que l'utilisateur vérifie son email).

**Step 1: Modifier la signature de la fonction et le bloc succès**

Remplacer la ligne 41 :
```tsx
export function SignUpForm() {
```
Par :
```tsx
interface SignUpFormProps {
  onSuccess?: () => void;
}

export function SignUpForm({ onSuccess }: SignUpFormProps = {}) {
```

Puis remplacer le bloc succès (lignes 87-89) :
```tsx
      } else {
        router.push(`/auth/verify-email?email=${encodeURIComponent(data.email)}`);
      }
```
Par :
```tsx
      } else {
        onSuccess?.();
        router.push(`/auth/verify-email?email=${encodeURIComponent(data.email)}`);
      }
```

**Step 2: Vérifier TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "sign-up-form"
```
Expected: aucune sortie

**Step 3: Commit**

```bash
git add "app/(auth)/auth/sign-up/sign-up-form.tsx"
git commit -m "feat(auth): add optional onSuccess prop to SignUpForm"
```

---

### Task 4: Créer `AuthDialog`

**Files:**
- Create: `components/storefront/auth-dialog.tsx`

**Context:** Ce composant est un `Dialog` shadcn/ui qui embarque `SignInForm` ou `SignUpForm`. Il gère le switch entre les deux vues. Il reçoit `productId` et appelle `toggleWishlist` lors du succès de l'auth. Utiliser Sonner `toast` pour le feedback.

**Step 1: Créer le fichier**

```tsx
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

  async function handleAuthSuccess() {
    onOpenChange(false);
    try {
      const result = await toggleWishlist(productId);
      if (result.success) {
        toast.success(result.added ? "Ajouté aux favoris" : "Retiré des favoris");
      } else {
        toast.error("Impossible de mettre à jour les favoris.");
      }
    } catch {
      toast.error("Impossible de mettre à jour les favoris.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
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
```

**Step 2: Vérifier TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "auth-dialog"
```
Expected: aucune sortie

**Step 3: Commit**

```bash
git add components/storefront/auth-dialog.tsx
git commit -m "feat(storefront): add AuthDialog component for wishlist auth flow"
```

---

### Task 5: Modifier `WishlistButtonDynamic` — toujours visible

**Files:**
- Modify: `components/storefront/wishlist-button-dynamic.tsx`

**Context:** Actuellement la ligne 18 retourne `null` quand `!session.data?.user || isWishlisted === undefined`. On doit :
1. Toujours afficher un bouton cœur, même sans session
2. Charger `AuthDialog` via `next/dynamic` avec `ssr: false`
3. Quand non connecté et clic → ouvrir l'`AuthDialog`
4. Quand connecté → comportement inchangé via `WishlistButton`

**Step 1: Réécrire le fichier**

```tsx
"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { authClient } from "@/lib/auth/client";
import { WishlistButton } from "@/components/storefront/wishlist-button";
import { checkWishlist } from "@/actions/wishlist";
import { cn } from "@/lib/utils";

const AuthDialog = dynamic(
  () =>
    import("@/components/storefront/auth-dialog")
      .then((m) => m.AuthDialog)
      .catch((err) => {
        console.error("[wishlist-button-dynamic] Failed to load AuthDialog chunk", err);
        throw err;
      }),
  { ssr: false }
);

export function WishlistButtonDynamic({ productId }: { productId: string }) {
  const session = authClient.useSession();
  const [isWishlisted, setIsWishlisted] = useState<boolean | undefined>(undefined);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (session.data?.user) {
      checkWishlist(productId).then(setIsWishlisted).catch(console.error);
    }
  }, [session.data?.user, productId]);

  // Authenticated and wishlist status known
  if (session.data?.user && isWishlisted !== undefined) {
    return (
      <WishlistButton
        productId={productId}
        isWishlisted={isWishlisted}
        onToggled={setIsWishlisted}
      />
    );
  }

  // Not authenticated (or session loading) — show ghost button
  if (!session.data?.user) {
    return (
      <>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDialogOpen(true);
          }}
          className={cn(
            "flex size-8 items-center justify-center rounded-full bg-background/80 text-muted-foreground backdrop-blur-sm transition-colors hover:text-destructive"
          )}
          aria-label="Ajouter aux favoris"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className="size-[45%]"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>

        <AuthDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          productId={productId}
        />
      </>
    );
  }

  // Authenticated but wishlist status still loading — render nothing (brief flash avoided)
  return null;
}
```

**Pourquoi `return null` à la fin ?** Quand l'utilisateur est connecté mais que `isWishlisted` est encore `undefined` (appel en cours), on retourne `null` pour éviter d'afficher le bouton ghost (qui ouvrirait le dialogue auth inutilement). Ce cas est bref (< 1 requête réseau).

**Step 2: Vérifier TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "wishlist"
```
Expected: aucune sortie

**Step 3: Vérifier le lint**

```bash
npm run lint 2>&1 | grep -A2 "wishlist-button-dynamic\|auth-dialog\|sign-in-form\|sign-up-form" | head -40
```
Expected: aucune erreur sur ces fichiers

**Step 4: Lancer tous les tests**

```bash
npm run test
```
Expected: all tests passing (les tests existants ne sont pas affectés par ces changements)

**Step 5: Commit final**

```bash
git add components/storefront/wishlist-button-dynamic.tsx
git commit -m "feat(storefront): show wishlist button for unauthenticated users with auth dialog"
```

---

## Vérification manuelle post-implémentation

1. Démarrer le serveur : `npm run dev`
2. Ouvrir une page catalogue en navigation privée (non connecté)
3. Vérifier : le bouton cœur est visible sur chaque product card
4. Cliquer le cœur → un dialogue "Connectez-vous pour sauvegarder" s'ouvre avec le formulaire sign-in
5. Cliquer "S'inscrire" → bascule vers le formulaire sign-up
6. Se connecter avec un compte existant → le dialogue se ferme + toast "Ajouté aux favoris"
7. Le cœur est maintenant rempli (rouge)

---

## Résumé des fichiers touchés

| Fichier | Action |
|---------|--------|
| `app/(auth)/auth/sign-in/sign-in-form.tsx` | Modify — ajouter `onSuccess` prop |
| `app/(auth)/auth/sign-up/sign-up-form.tsx` | Modify — ajouter `onSuccess` prop |
| `components/storefront/auth-dialog.tsx` | Create — nouveau composant dialogue |
| `components/storefront/wishlist-button-dynamic.tsx` | Modify — toujours visible + ouvre AuthDialog |
