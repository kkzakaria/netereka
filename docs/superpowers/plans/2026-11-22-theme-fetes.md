# Thème des fêtes — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** un habillage festif de la boutique (bandeau refermable, guirlande d'étoiles, étoile près du logo, titres de section soulignés d'or, vœux dans le pied de page), activé côté serveur selon une fenêtre de dates, avec un aperçu réservé à l'admin.

**Architecture :** un module pur `lib/saison/` décide si la saison est visible à un instant donné. Le layout `(storefront)` résout cet état à chaque requête (date du serveur, cookie d'aperçu vérifié contre la session admin, cookie « bandeau fermé »). Il pose `data-saison="fetes"` sur un conteneur et passe `festif` à l'en-tête et au pied de page. Les couleurs festives sont des tokens oklch scopés sous cet attribut. Tout le décor est en SVG et CSS statiques. Le seul JS client ajouté est le bouton de fermeture.

**Tech Stack :** Next.js 16 App Router (RSC, `cookies()`), Tailwind CSS 4, Vitest (`environment: "node"`, rendu via `renderToStaticMarkup`), better-auth (`getOptionalSession`).

**Spec :** `docs/superpowers/specs/2026-11-22-theme-fetes-design.md`

## Global Constraints

- Fenêtre : du `2026-12-01T00:00:00Z` (inclus) au `2027-01-07T00:00:00Z` (exclu). Abidjan est en UTC+0, sans heure d'été.
- Identifiant de saison : `fetes-2026`. Il entre dans le nom du cookie de fermeture, pour que le bandeau réapparaisse l'an prochain.
- Date limite de livraison avant Noël : `null` tant que l'utilisateur ne l'a pas fournie. Sans date, aucune promesse de livraison dans le texte.
- La décision se prend côté serveur, jamais d'après l'horloge du navigateur.
- Aucun token existant (`--primary`, `--background`, …) n'est modifié. Rien hors du groupe `(storefront)`.
- Aucune animation, aucune image raster ajoutée. Décorations en `aria-hidden="true"`.
- Bouton de fermeture : cible d'au moins 44×44 px, `aria-label="Fermer le message des fêtes"`.
- Textes en français. Commits en Conventional Commits, scope `storefront`, avec la ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Les chemins contenant `(storefront)` sont cités entre guillemets en bash.

## Review Focus

1. **Le bandeau de l'an dernier.** Un client qui a fermé le bandeau 2026 doit le revoir en 2027 : le nom du cookie contient l'id de saison (test en Task 1).
2. **Un client revient après avoir fermé le bandeau.** Pas de flash puis disparition : le bandeau n'est pas rendu côté serveur (test en Task 2).
3. **Un cookie d'aperçu sur un compte client, ou sans session.** Le thème reste invisible hors fenêtre (test en Task 2).
4. **Le coût du cookie d'aperçu.** Un visiteur sans cookie d'aperçu ne doit déclencher aucune lecture de session : `getOptionalSession` n'est pas appelé (test en Task 2).
5. **Le mode sombre.** Le texte du bandeau et l'or restent lisibles (contraste AA) dans les deux modes : vérification au navigateur en Task 4.

---

## Fichiers

| Fichier | Rôle |
|---|---|
| `lib/saison/config.ts` (créer) | Constante `SAISON_FETES`, `saisonEnCours`, `nomCookieBandeau`, `messageBandeau` |
| `lib/saison/etat.ts` (créer) | `resoudreEtatSaison` (pur) + `getEtatSaison` (lit cookies et session) |
| `app/api/saison/apercu/route.ts` (créer) | `GET` admin-only, pose ou retire le cookie d'aperçu |
| `components/storefront/saison/bandeau-fetes.tsx` (créer) | Bandeau (RSC) |
| `components/storefront/saison/fermer-bandeau.tsx` (créer) | Bouton client qui pose le cookie et masque le bandeau |
| `components/storefront/saison/decor.tsx` (créer) | `GuirlandeEtoiles`, `EtoileLogo` (SVG statiques) |
| `app/globals.css` (modifier) | Tokens `--festif-*` + règle du soulignement des titres |
| `app/(storefront)/layout.tsx`, `components/storefront/header.tsx`, `footer.tsx`, `horizontal-section.tsx` (modifier) | Câblage |

---

### Task 1 : le module de saison (pur)

**Files :**
- Create : `lib/saison/config.ts`
- Test : `__tests__/unit/lib/saison/config.test.ts`

**Interfaces :**
- Produces :
  ```ts
  export interface Saison {
    id: string;                          // "fetes-2026"
    debut: string;                       // ISO UTC, inclus
    finExclusive: string;                // ISO UTC, exclu
    dateLimiteLivraisonNoel: string | null; // "YYYY-MM-DD" ou null
  }
  export const SAISON_FETES: Saison;
  export function saisonEnCours(maintenant: Date, saison?: Saison): boolean;
  export function nomCookieBandeau(saison?: Saison): string; // "netereka_bandeau_ferme_fetes-2026"
  export function messageBandeau(saison?: Saison): string;
  export const NOM_COOKIE_APERCU = "netereka_apercu_saison";
  ```

- [ ] **Step 1 : écrire les tests qui échouent**

  `describe("saisonEnCours")` :
  - `2026-11-30T23:59:59.999Z` → `false`
  - `2026-12-01T00:00:00.000Z` → `true`
  - `2026-12-31T23:59:59.999Z` et `2027-01-01T00:00:00.000Z` → `true` (passage d'année)
  - `2027-01-06T23:59:59.999Z` → `true`
  - `2027-01-07T00:00:00.000Z` → `false`

  `describe("nomCookieBandeau")` :
  - `nomCookieBandeau()` === `"netereka_bandeau_ferme_fetes-2026"`
  - `nomCookieBandeau({ ...SAISON_FETES, id: "fetes-2027" })` !== `nomCookieBandeau()`

  `describe("messageBandeau")` :
  - avec `dateLimiteLivraisonNoel: null` : vaut exactement `"Joyeuses fêtes ! Trouvez le cadeau high-tech idéal chez NETEREKA."` et ne contient pas `"avant le"`
  - avec `"2026-12-20"` : vaut exactement `"Joyeuses fêtes ! Commandez avant le 20 décembre pour être livré avant Noël."`
  - `SAISON_FETES.dateLimiteLivraisonNoel` est `null` (aucune promesse inventée)

- [ ] **Step 2 : lancer les tests et vérifier qu'ils échouent**

  Run : `npx vitest run __tests__/unit/lib/saison/config.test.ts`
  Expected : FAIL, module introuvable.

- [ ] **Step 3 : implémenter `lib/saison/config.ts`**

  Prendre les valeurs de Global Constraints. `messageBandeau` formate la date avec `Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" })`. Ajouter un commentaire d'en-tête : « Pour une nouvelle saison : changer `id`, `debut`, `finExclusive` et, une fois connue, `dateLimiteLivraisonNoel`. »

- [ ] **Step 4 : lancer les tests et vérifier qu'ils passent**

  Run : `npx vitest run __tests__/unit/lib/saison/config.test.ts`
  Expected : PASS.

- [ ] **Step 5 : commit**

  ```bash
  git add lib/saison/config.ts __tests__/unit/lib/saison/config.test.ts
  git commit -m "feat(storefront): fenetre de dates de la saison des fetes"
  ```

---

### Task 2 : résoudre l'état côté serveur et l'aperçu admin

**Files :**
- Create : `lib/saison/etat.ts`, `app/api/saison/apercu/route.ts`
- Test : `__tests__/unit/lib/saison/etat.test.ts`, `__tests__/unit/api/saison-apercu-route.test.ts`

**Interfaces :**
- Consumes : `saisonEnCours`, `nomCookieBandeau`, `NOM_COOKIE_APERCU`, `SAISON_FETES` (Task 1) ; `getOptionalSession`, `requireAdmin` (`lib/auth/guards.ts`).
- Produces :
  ```ts
  export interface EtatSaison { festif: boolean; bandeauVisible: boolean; apercu: boolean }
  export function resoudreEtatSaison(e: {
    maintenant: Date; apercuAdmin: boolean; bandeauFerme: boolean;
  }): EtatSaison;
  export async function getEtatSaison(): Promise<EtatSaison>;
  ```
  Règles : `festif = saisonEnCours(maintenant) || apercuAdmin` ; `bandeauVisible = festif && !bandeauFerme` ; `apercu = apercuAdmin && !saisonEnCours(maintenant)`.

- [ ] **Step 1 : écrire les tests qui échouent pour `resoudreEtatSaison`**

  - 2026-12-10, sans aperçu, bandeau non fermé → `{ festif: true, bandeauVisible: true, apercu: false }`
  - 2026-12-10, bandeau fermé → `bandeauVisible: false`, `festif: true`
  - 2026-11-25, sans aperçu → `{ festif: false, bandeauVisible: false, apercu: false }`
  - 2026-11-25, `apercuAdmin: true` → `{ festif: true, bandeauVisible: true, apercu: true }`

- [ ] **Step 2 : écrire les tests qui échouent pour `getEtatSaison`**

  Mocker `next/headers` (`cookies()` qui renvoie un `get(name)`) et `@/lib/auth/guards` (`getOptionalSession`). Figer l'heure avec `vi.useFakeTimers({ now: new Date("2026-11-25T10:00:00Z") })` et la rétablir dans `afterEach`. Repartir d'implémentations neuves dans `beforeEach` avec `mockReset()` (voir le gotcha Vitest de `CLAUDE.md`).
  - pas de cookie d'aperçu → `festif: false`, et `getOptionalSession` **n'est pas appelé**
  - cookie d'aperçu + session `role: "customer"` → `festif: false`
  - cookie d'aperçu + `getOptionalSession` qui renvoie `null` → `festif: false`
  - cookie d'aperçu + `role: "admin"` → `festif: true, apercu: true` (idem `super_admin`)
  - heure 2026-12-10 + cookie `netereka_bandeau_ferme_fetes-2026=1` → `bandeauVisible: false`
  - heure 2026-12-10 + cookie `netereka_bandeau_ferme_fetes-2025=1` → `bandeauVisible: true`

- [ ] **Step 3 : lancer les tests et vérifier qu'ils échouent**

  Run : `npx vitest run __tests__/unit/lib/saison/etat.test.ts`
  Expected : FAIL, module introuvable.

- [ ] **Step 4 : implémenter `lib/saison/etat.ts`**

  `getEtatSaison` lit `cookies()` une fois, n'appelle `getOptionalSession()` que si `NOM_COOKIE_APERCU` est présent, et considère l'admin vrai seulement pour `role` `admin` ou `super_admin`. Une exception de `getOptionalSession` est traitée comme « pas admin » et journalisée (`console.error("[saison] …")`), sans faire tomber la page.

- [ ] **Step 5 : lancer les tests et vérifier qu'ils passent**

  Run : `npx vitest run __tests__/unit/lib/saison/etat.test.ts`
  Expected : PASS.

- [ ] **Step 6 : écrire les tests qui échouent pour la route**

  Mocker `requireAdmin` : pour un non-admin, il lève l'erreur de redirection de `next/navigation` ; pour un admin, il résout.
  - non-admin → `requireAdmin` rejette, la route ne pose aucun cookie
  - admin, `GET /api/saison/apercu` → réponse 307 vers `/`, `set-cookie` contient `netereka_apercu_saison=1`, `HttpOnly`, `SameSite=lax`, `Path=/`, `Max-Age=86400`
  - admin, `GET /api/saison/apercu?desactiver=1` → `set-cookie` contient `netereka_apercu_saison=` et `Max-Age=0`

- [ ] **Step 7 : implémenter `app/api/saison/apercu/route.ts`**

  `export async function GET(request: NextRequest)` : `await requireAdmin()`, puis `NextResponse.redirect(new URL("/", request.url))` avec `response.cookies.set` ou `delete`. `secure` uniquement en production (`process.env.NODE_ENV === "production"`).

- [ ] **Step 8 : lancer les tests et vérifier qu'ils passent**

  Run : `npx vitest run __tests__/unit/lib/saison __tests__/unit/api/saison-apercu-route.test.ts`
  Expected : PASS.

- [ ] **Step 9 : commit**

  ```bash
  git add lib/saison/etat.ts app/api/saison/apercu/route.ts __tests__/unit/lib/saison/etat.test.ts __tests__/unit/api/saison-apercu-route.test.ts
  git commit -m "feat(storefront): etat de saison cote serveur et apercu reserve a l'admin"
  ```

---

### Task 3 : tokens et composants de décor

**Files :**
- Modify : `app/globals.css`
- Create : `components/storefront/saison/bandeau-fetes.tsx`, `fermer-bandeau.tsx`, `decor.tsx`
- Test : `__tests__/unit/components/saison-decor.test.ts`

**Interfaces :**
- Consumes : `messageBandeau`, `nomCookieBandeau`, `SAISON_FETES` (Task 1).
- Produces :
  ```tsx
  export function BandeauFetes({ apercu }: { apercu: boolean }): JSX.Element;          // RSC
  export function FermerBandeau({ nomCookie, maxAgeSecondes }: { nomCookie: string; maxAgeSecondes: number }): JSX.Element; // "use client"
  export function GuirlandeEtoiles(): JSX.Element;
  export function EtoileLogo(): JSX.Element;
  ```
  Tailwind : `bg-festif-bandeau`, `text-festif-bandeau-foreground`, `text-festif-or`, `text-festif-rouge`.

- [ ] **Step 1 : écrire les tests qui échouent** (rendu `renderToStaticMarkup`, comme `hero-banner-epinglage.test.ts`)

  - `BandeauFetes({ apercu: false })` : contient `messageBandeau()`, porte `role="region"` et `aria-label="Message des fêtes"`, et contient un bouton `aria-label="Fermer le message des fêtes"`
  - `BandeauFetes({ apercu: true })` : contient `"Aperçu — invisible pour les clients"`
  - `GuirlandeEtoiles()` et `EtoileLogo()` : la racine porte `aria-hidden="true"`, ne contient ni `<img`, ni `animate`, ni `<animate`
  - le bouton `FermerBandeau` porte les classes `size-11` (44 px)

- [ ] **Step 2 : lancer les tests et vérifier qu'ils échouent**

  Run : `npx vitest run __tests__/unit/components/saison-decor.test.ts`
  Expected : FAIL, module introuvable.

- [ ] **Step 3 : ajouter les tokens dans `app/globals.css`**

  Sous `[data-saison="fetes"]` : `--festif-or: oklch(0.80 0.14 85)`, `--festif-rouge: oklch(0.55 0.20 27)`, `--festif-bandeau: oklch(0.33 0.10 262)` (bleu marine de la marque), `--festif-bandeau-foreground: oklch(0.98 0 0)`. Sous `.dark [data-saison="fetes"]` : `--festif-or: oklch(0.85 0.13 88)`, `--festif-rouge: oklch(0.68 0.18 25)`, `--festif-bandeau: oklch(0.26 0.07 262)`. Les exposer dans `@theme inline` (`--color-festif-or: var(--festif-or)`, etc.). Ajouter `[data-saison="fetes"] [data-slot="section-title"]` : `text-decoration: underline; text-decoration-color: var(--festif-or); text-decoration-thickness: 3px; text-underline-offset: 6px;`.

- [ ] **Step 4 : implémenter les trois composants**

  `FermerBandeau` : au clic, `document.cookie = \`${nomCookie}=1; Path=/; Max-Age=${maxAgeSecondes}; SameSite=Lax\`` et masque l'élément `closest('[data-slot="bandeau-fetes"]')` via un état. `BandeauFetes` calcule `maxAgeSecondes` jusqu'à `SAISON_FETES.finExclusive`, avec un plancher à 86400. `GuirlandeEtoiles` : un SVG en ligne d'une hauteur de 12 px, en pleine largeur (`preserveAspectRatio="none"` sur un motif répété via `<pattern>`), étoiles en alternance `--festif-or` / `--festif-rouge`, fil en `currentColor` à faible opacité.

- [ ] **Step 5 : lancer les tests et vérifier qu'ils passent**

  Run : `npx vitest run __tests__/unit/components/saison-decor.test.ts`
  Expected : PASS.

- [ ] **Step 6 : commit**

  ```bash
  git add app/globals.css components/storefront/saison __tests__/unit/components/saison-decor.test.ts
  git commit -m "feat(storefront): bandeau, guirlande et tokens des fetes"
  ```

---

### Task 4 : câblage dans la boutique et vérification réelle

**Files :**
- Modify : `app/(storefront)/layout.tsx`, `components/storefront/header.tsx`, `components/storefront/footer.tsx`, `components/storefront/horizontal-section.tsx:20`
- Test : `__tests__/unit/components/saison-cablage.test.ts`

**Interfaces :**
- Consumes : `getEtatSaison` (Task 2), `BandeauFetes`, `GuirlandeEtoiles`, `EtoileLogo` (Task 3).
- Produces : `Header({ festif }: { festif: boolean })`, `Footer({ festif }: { festif: boolean })`.

- [ ] **Step 1 : écrire les tests qui échouent**

  - `Footer({ festif: true })` contient `"Toute l'équipe NETEREKA vous souhaite de belles fêtes"` ; `Footer({ festif: false })` ne le contient pas
  - `await Header({ festif: true })` (mocker `getActiveStores` et les îlots clients `SearchAutocomplete`, `CartIcon`, `HeaderAuth`, `StoreLocationButton`) contient le `aria-hidden` de la guirlande et de l'étoile ; avec `festif: false`, aucun des deux
  - `HorizontalSection` : le `<h2>` porte `data-slot="section-title"`

- [ ] **Step 2 : lancer les tests et vérifier qu'ils échouent**

  Run : `npx vitest run __tests__/unit/components/saison-cablage.test.ts`
  Expected : FAIL.

- [ ] **Step 3 : câbler**

  - Layout : `const etat = await getEtatSaison()`. Envelopper le contenu dans `<div data-saison={etat.festif ? "fetes" : undefined}>`, et rendre `{etat.bandeauVisible && <BandeauFetes apercu={etat.apercu} />}` avant `<Header festif={etat.festif} />`. `cookies()` rend toutes les routes de la boutique dynamiques, ce qui empêche une date figée au build ; le dire dans un commentaire.
  - Header : `EtoileLogo` positionnée en `absolute` près du logo, à l'intérieur du `Link` (qui devient `relative`). `GuirlandeEtoiles` en `absolute inset-x-0 bottom-0` dans le `<header>`.
  - Footer : la phrase de vœux au-dessus du copyright, en `text-festif-or`.
  - HorizontalSection : `data-slot="section-title"` sur le `<h2>`.

- [ ] **Step 4 : lancer toute la suite**

  Run : `npx tsc --noEmit && npm run lint && npm run test`
  Expected : tout passe.

- [ ] **Step 5 : vérification au navigateur**

  `npm run dev`, connexion avec le compte admin de `db/seeds/seed.sql`, puis `/api/saison/apercu`. Vérifier sur `/` et sur une fiche `/p/…`, en 375 px puis en desktop, en clair puis en sombre :
  - bandeau, guirlande, étoile, titres soulignés et vœux visibles
  - fermer le bandeau puis recharger : il ne réapparaît pas, sans flash
  - mesurer le contraste du texte du bandeau (≥ 4.5:1) dans les deux modes
  - en navigation privée (sans session) : aucun décor
  - `/api/saison/apercu?desactiver=1` : le décor disparaît

  Faire ensuite `git checkout CLAUDE.md` (`npm run dev` le réécrit).

- [ ] **Step 6 : vérifier le Worker construit**

  Run : `NEXT_PUBLIC_R2_URL=https://r2.netereka.ci npm run build:worker && npm run check:demarrage`
  Expected : build OK, `check:demarrage` sort avec le code 0.

- [ ] **Step 7 : commit**

  ```bash
  git add "app/(storefront)/layout.tsx" components/storefront/header.tsx components/storefront/footer.tsx components/storefront/horizontal-section.tsx __tests__/unit/components/saison-cablage.test.ts
  git commit -m "feat(storefront): activer l'habillage des fetes dans la boutique"
  ```
