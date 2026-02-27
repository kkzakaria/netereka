# Wishlist Auth Dialog — Design

**Goal:** Afficher le bouton favori sur toutes les product cards, même pour les utilisateurs non connectés ; un clic ouvre un dialogue d'authentification in-page, et après connexion/inscription, le produit est automatiquement ajouté aux favoris.

**Architecture:** Le composant `WishlistButtonDynamic` affiche toujours le bouton. Quand la session est absente, un clic ouvre un nouveau composant `AuthDialog` (chargé dynamiquement). `SignInForm` et `SignUpForm` reçoivent un prop optionnel `onSuccess` : quand fourni, il remplace le `router.push("/")` existant. Le callback ferme le dialogue et appelle `toggleWishlist`.

**Tech Stack:** better-auth (`authClient.useSession()`), Cloudflare Turnstile (requis sur tous les formulaires auth), shadcn/ui Dialog, Zustand (cart store pattern), Sonner (toasts), next/dynamic (lazy load du dialogue).

---

## Composants

### Modifié : `components/storefront/wishlist-button-dynamic.tsx`

- Supprimer le `return null` quand non connecté
- Quand `!session.data?.user` : rendre un bouton cœur (style identique à `WishlistButton` mais sans état actif) qui ouvre `AuthDialog`
- `AuthDialog` chargé via `next/dynamic` avec `ssr: false`

### Modifié : `app/(auth)/auth/sign-in/sign-in-form.tsx`

- Ajouter `onSuccess?: () => void` aux props
- Si fourni : appeler `onSuccess()` au lieu de `router.push("/")` + `router.refresh()`
- Comportement existant inchangé quand absent

### Modifié : `app/(auth)/auth/sign-up/sign-up-form.tsx`

- Même ajout `onSuccess?: () => void`
- Même logique conditionnelle

### Nouveau : `components/storefront/auth-dialog.tsx`

- Props : `open`, `onOpenChange`, `onSuccess: () => void`, `productId: string`
- State local : `view: "sign-in" | "sign-up"`
- `DialogContent` avec `DialogTitle` ("Connectez-vous pour sauvegarder")
- Embed `SignInForm` / `SignUpForm` avec `onSuccess`
- Lien de switch "Pas encore de compte ? S'inscrire" / "Déjà un compte ? Se connecter"

---

## Flux de données

```
clic wishlist (non connecté)
  → AuthDialog s'ouvre
  → utilisateur remplit SignInForm ou SignUpForm
  → auth réussie → onSuccess()
    → AuthDialog fermé
    → toggleWishlist(productId) appelé
    → toast de confirmation
```

---

## Gestion des erreurs

- Erreurs de formulaire (champ invalide, mauvais mot de passe) : gérées inline par les formulaires existants
- Échec de `toggleWishlist` après auth : toast d'erreur Sonner
- Dialogue fermé avant la fin de l'auth : aucune action wishlist, état propre

---

## Tests

- `WishlistButtonDynamic` non connecté : rend un bouton (pas `null`), clic déclenche l'ouverture du dialogue
- `AuthDialog` : rend sign-in par défaut, switch vers sign-up au clic du lien
- `SignInForm` avec `onSuccess` : appelle `onSuccess()` à la connexion réussie (pas de redirect)
- `SignUpForm` avec `onSuccess` : idem
