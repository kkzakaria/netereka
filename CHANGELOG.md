# Changelog

## [1.7.2](https://github.com/kkzakaria/netereka/compare/v1.7.1...v1.7.2) (2026-04-16)


### Bug Fixes

* **storefront:** redesign product card mobile actions to prevent overflow ([#172](https://github.com/kkzakaria/netereka/issues/172)) ([0f5fd35](https://github.com/kkzakaria/netereka/commit/0f5fd3521aab818144392b03a2a97ffa356f3221))

## [1.7.1](https://github.com/kkzakaria/netereka/compare/v1.7.0...v1.7.1) (2026-04-16)


### Documentation

* **claude:** capture release pipeline operational lessons ([#167](https://github.com/kkzakaria/netereka/issues/167)) ([10da99c](https://github.com/kkzakaria/netereka/commit/10da99c0a3432f8e97a1e04548ad913df7be448b))

## [1.7.0](https://github.com/kkzakaria/netereka/compare/v1.6.0...v1.7.0) (2026-04-16)

Accumulation de 2 mois de développement depuis `v1.6.0` (2026-02-24) : 82 commits regroupés en une seule release. Les sections ci-dessous thématisent le travail ; la liste exhaustive originale reste accessible via le `git log v1.6.0..v1.7.0`.

### 🚀 Major features

- **WhatsApp Commerce (Phase 1)** — Worker dédié Cloudflare, bot conversationnel avec LLM, catalogue navigable, session utilisateur ([#144](https://github.com/kkzakaria/netereka/issues/144))
- **WhatsApp Storefront integration** — boutons "Commander sur WhatsApp" sur produits et panier ([#148](https://github.com/kkzakaria/netereka/issues/148))
- **WhatsApp admin dashboard** — configuration API, masquage des secrets, métriques ([#148](https://github.com/kkzakaria/netereka/issues/148))
- **Admin product wizard** — création guidée avec cascade catégories, auto-slug, auto-SKU, éditeur HTML/CSS ([#133](https://github.com/kkzakaria/netereka/issues/133), [#134](https://github.com/kkzakaria/netereka/issues/134), [#135](https://github.com/kkzakaria/netereka/issues/135), [#136](https://github.com/kkzakaria/netereka/issues/136))
- **Store locations** — admin CRUD + icône map dynamique dans le header ([#140](https://github.com/kkzakaria/netereka/issues/140), [#141](https://github.com/kkzakaria/netereka/issues/141))
- **AI-powered product creation** (ajouté puis retiré) — itération produite puis supprimée au profit du wizard manuel guidé ([#73](https://github.com/kkzakaria/netereka/issues/73), [#81](https://github.com/kkzakaria/netereka/issues/81), [#95](https://github.com/kkzakaria/netereka/issues/95))

### 🔧 Infrastructure — Release Pipeline Refonte

Refonte complète du pipeline de déploiement :

- **Cloudflare Versions canary 10/90** — chaque merge déploie à 10% du trafic, promote manuelle via workflow pour passer à 100%, rollback instantané ([#156](https://github.com/kkzakaria/netereka/issues/156))
- **release-please + Conventional Commits** — versioning SemVer auto, CHANGELOG auto, enforcement commit-msg Husky ([#155](https://github.com/kkzakaria/netereka/issues/155), [#156](https://github.com/kkzakaria/netereka/issues/156))
- **Migration safety lint** — bloque `DROP COLUMN / RENAME COLUMN / ALTER NOT NULL sans DEFAULT` dans les migrations Drizzle, bypass marker documenté ([#155](https://github.com/kkzakaria/netereka/issues/155))
- **WhatsApp Worker CD** — workflow séparé path-filtered, smoke check post-deploy ([#158](https://github.com/kkzakaria/netereka/issues/158))
- **Documentation** — `docs/RELEASE_PIPELINE.md` (388 lignes, 5 runbooks, troubleshooting) ([#158](https://github.com/kkzakaria/netereka/issues/158))

### ✨ Features

#### Authentification
- Email OTP pour vérification sign-up et reset password ([#107](https://github.com/kkzakaria/netereka/issues/107))
- Migration better-auth admin plugin avec rôle agent ([#124](https://github.com/kkzakaria/netereka/issues/124))
- Configuration email : `noreply@` pour OTP, `commandes@` pour commandes ([28d656d](https://github.com/kkzakaria/netereka/commit/28d656deb13c209208dab5a281cc72e92fa4609b))
- Apple sign-in masqué en attendant la config ([2866ef3](https://github.com/kkzakaria/netereka/commit/2866ef35dcaebc529c80bf47b85a32b46531137f), [48d4fcb](https://github.com/kkzakaria/netereka/commit/48d4fcb8ad24b2891cf01e9e3b739d966a42f0fe))

#### Admin UX
- Éditeur riche avec listes à puces et insertion d'images ([#131](https://github.com/kkzakaria/netereka/issues/131))
- Banners : drag-and-drop reordering, auto-assignment du display_order ([#122](https://github.com/kkzakaria/netereka/issues/122), [#123](https://github.com/kkzakaria/netereka/issues/123))

#### Storefront
- Boutons cart/wishlist sur product-card ([#118](https://github.com/kkzakaria/netereka/issues/118))
- Wishlist button pour users non authentifiés avec dialog auth ([#119](https://github.com/kkzakaria/netereka/issues/119), [#120](https://github.com/kkzakaria/netereka/issues/120))
- Slider dual-handle pour filtre prix ([#112](https://github.com/kkzakaria/netereka/issues/112))
- Filtre marques avec expand + recherche inline ([#111](https://github.com/kkzakaria/netereka/issues/111))
- Subcategories comme filtre sur pages catégories ([#116](https://github.com/kkzakaria/netereka/issues/116))

#### Images / Performance
- **Cloudflare Image Resizing** — fix LCP ([#97](https://github.com/kkzakaria/netereka/issues/97), [#99](https://github.com/kkzakaria/netereka/issues/99))
- Security headers HTTP via `next.config.ts` ([#100](https://github.com/kkzakaria/netereka/issues/100))

### 🐛 Bug Fixes

#### Admin / Editor (série de fixes UX)
- Dimensions éditeur, preview HTML dans sheet ([#137](https://github.com/kkzakaria/netereka/issues/137))
- Dialog vide detection, width HTML editor ([98e6c83](https://github.com/kkzakaria/netereka/commit/98e6c83e04f5ee80c13e1d73408caa6be30b1f6f), [82e5956](https://github.com/kkzakaria/netereka/commit/82e59564d9cc33d676f0fa99957dc4736e4827ef), [fe15e2b](https://github.com/kkzakaria/netereka/commit/fe15e2b4579262fb75c77ba931f685b7237dded8))
- Width adaptative, min 400px / max 800px ([78fe920](https://github.com/kkzakaria/netereka/commit/78fe920872ed9e2d34d0ed5a14d965ca0a6d33e2), [12a3b1a](https://github.com/kkzakaria/netereka/commit/12a3b1aa6e0a98fa4f96d3d8ad678c47851b0257))
- Hydration mismatches DescriptionEditor + RichTextEditor ([05e047f](https://github.com/kkzakaria/netereka/commit/05e047f7bf5a84c7d55f30445c0cc761b422397e), [#132](https://github.com/kkzakaria/netereka/issues/132))
- SectionNav highlight + scroll-spy ([#94](https://github.com/kkzakaria/netereka/issues/94), [9f4c39d](https://github.com/kkzakaria/netereka/commit/9f4c39d0ef457492eb3aa80e053edb09b3c3d5b9))
- Radix Switch bubble inputs scroll bug ([#93](https://github.com/kkzakaria/netereka/issues/93))

#### Release Pipeline (hotfix post-refonte)
- `deploy.yml` sort deployments desc + `deploy-whatsapp.yml` OPEN_NEXT_DEPLOY=1 ([#160](https://github.com/kkzakaria/netereka/issues/160))

#### Security / Dependencies
- Résolution de 27 vulnérabilités npm ([#138](https://github.com/kkzakaria/netereka/issues/138))

#### LCP / Images
- Preload header simple pour bypass CF Early Hints ([#128](https://github.com/kkzakaria/netereka/issues/128))
- Image loader : width dans dev URLs + script `db:sync` ([#110](https://github.com/kkzakaria/netereka/issues/110))
- Revert bypass http/https accidentel ([#109](https://github.com/kkzakaria/netereka/issues/109))

#### Category / Filters
- Hide category filter sur pages catégories ([#115](https://github.com/kkzakaria/netereka/issues/115))
- Remove subcategory filter + grid ([#113](https://github.com/kkzakaria/netereka/issues/113), [#117](https://github.com/kkzakaria/netereka/issues/117))

#### Divers
- Email : failure quand `RESEND_API_KEY` absent ([8b0df04](https://github.com/kkzakaria/netereka/commit/8b0df04ad456158bb4184b6d4e0ebb900173f9a3))
- Avatar OAuth : `unoptimized` dans header ([#108](https://github.com/kkzakaria/netereka/issues/108))
- Deploy R2 binding pour OpenNext incremental cache ([#139](https://github.com/kkzakaria/netereka/issues/139))
- Auth review issues : error handling, logging, schemas ([cee9e38](https://github.com/kkzakaria/netereka/commit/cee9e38e7854d6264d3acccca1a8797675a7ff8b))

### 📚 Documentation

- `docs/RELEASE_PIPELINE.md` — référence complète du pipeline (concepts, 6 workflows, 5 runbooks, troubleshooting, évolution vers staging)
- `CLAUDE.md` — section "Release Pipeline" avec mental model + pointeur
- Session learnings WhatsApp integration + common gotchas ([#152](https://github.com/kkzakaria/netereka/issues/152))

### 🔨 Chore

- Align release-please manifest with actual project version (1.0.0 → 1.6.0) ([#163](https://github.com/kkzakaria/netereka/issues/163))
