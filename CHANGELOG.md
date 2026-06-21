# Changelog

## [1.14.0](https://github.com/kkzakaria/netereka/compare/v1.13.0...v1.14.0) (2026-06-21)


### Features

* **seo:** add #retours anchor to CGV for Merchant Center return policy URL ([#237](https://github.com/kkzakaria/netereka/issues/237)) ([be2493e](https://github.com/kkzakaria/netereka/commit/be2493e1aa1071a846ac979fa97783a4c93ebedd))
* **seo:** enrich Product schema with shippingRate, return policy & ratings ([#243](https://github.com/kkzakaria/netereka/issues/243)) ([e9d53b7](https://github.com/kkzakaria/netereka/commit/e9d53b721a857b8ce4f91666e93e5035d4f2bb09))
* **seo:** Google Merchant Center product feed at /feed.xml ([#232](https://github.com/kkzakaria/netereka/issues/232)) ([cb11427](https://github.com/kkzakaria/netereka/commit/cb114270e938eeb382a0c04e62c47263fcad82f9))


### Bug Fixes

* **ci:** select most-recent deployment when resolving canary to promote ([#227](https://github.com/kkzakaria/netereka/issues/227)) ([531cc86](https://github.com/kkzakaria/netereka/commit/531cc86b9da7ba0889a453c1f9f81ff74f8fcde3))
* **seo:** add CORS headers to /feed.xml for Merchant Center URL validation ([#239](https://github.com/kkzakaria/netereka/issues/239)) ([0e223a6](https://github.com/kkzakaria/netereka/commit/0e223a60e2474ef7d7155a261d552d913a45dae7))
* **seo:** include products & categories in sitemap (catalogue invisible to Google) ([#229](https://github.com/kkzakaria/netereka/issues/229)) ([afee8d8](https://github.com/kkzakaria/netereka/commit/afee8d8b08690a341d15d6240741a07a91dc3399))
* **storefront:** revert proxy.ts to middleware.ts for Cloudflare compatibility ([#222](https://github.com/kkzakaria/netereka/issues/222)) ([3b90edc](https://github.com/kkzakaria/netereka/commit/3b90edceb8be1f1c88a8dc67ef2e079a9d03ab16))


### Performance

* **seo:** reduce /feed.xml cache to 10min for fresher Merchant Center data ([#241](https://github.com/kkzakaria/netereka/issues/241)) ([897e55b](https://github.com/kkzakaria/netereka/commit/897e55b11bd513f4721a001c0e6f450cdee0b6d9))
* **storefront:** reduce initial homepage cards to lower mobile LCP ([#225](https://github.com/kkzakaria/netereka/issues/225)) ([790655d](https://github.com/kkzakaria/netereka/commit/790655ddfa99e5467f992f1ad78e9eb8348c35a5))


### Documentation

* **db:** make Drizzle the standard for all DB access ([#233](https://github.com/kkzakaria/netereka/issues/233)) ([d1cd07a](https://github.com/kkzakaria/netereka/commit/d1cd07a88a444f5f0a899ad1b701c424d33237ad))

## [1.13.0](https://github.com/kkzakaria/netereka/compare/v1.12.0...v1.13.0) (2026-05-24)


### Features

* **storefront:** fix "Charger plus" button to append products instead of paginating ([#218](https://github.com/kkzakaria/netereka/issues/218)) ([6106c19](https://github.com/kkzakaria/netereka/commit/6106c19faad9a16e13106f7f8971cf8c1ddeb377))


### Bug Fixes

* **storefront:** resolve Next.js 16 dev warnings ([#221](https://github.com/kkzakaria/netereka/issues/221)) ([7bf1b94](https://github.com/kkzakaria/netereka/commit/7bf1b9489e78048a72dc82c87508307404bea1c5))

## [1.12.0](https://github.com/kkzakaria/netereka/compare/v1.11.0...v1.12.0) (2026-05-09)


### Features

* **admin:** vision-based watermark filter on Brave candidates ([#211](https://github.com/kkzakaria/netereka/issues/211)) ([8d33a8f](https://github.com/kkzakaria/netereka/commit/8d33a8fd8277f481fa615d8b4cbb29a8eb5b9076))


### Bug Fixes

* **admin:** remove example chips from AI product creation prompt ([#215](https://github.com/kkzakaria/netereka/issues/215)) ([a054ce5](https://github.com/kkzakaria/netereka/commit/a054ce5c28b1b5324cb6c95c5f8a76ab6cd1de7e))

## [1.11.0](https://github.com/kkzakaria/netereka/compare/v1.10.0...v1.11.0) (2026-05-04)


### Features

* **admin:** give Claude an image_search tool (Brave) for product creation ([#209](https://github.com/kkzakaria/netereka/issues/209)) ([a93ed48](https://github.com/kkzakaria/netereka/commit/a93ed486f4120a22ef21663fa86a09a7a52eb4a2))


### Bug Fixes

* **admin:** constrain AI product output via strict JSON Schema ([#201](https://github.com/kkzakaria/netereka/issues/201)) ([dd52000](https://github.com/kkzakaria/netereka/commit/dd52000cadd634960c736e3e303d2d11605234c6))
* **admin:** drop oneOf in submit_product schema (Anthropic constraint) ([#203](https://github.com/kkzakaria/netereka/issues/203)) ([0c4b644](https://github.com/kkzakaria/netereka/commit/0c4b6441e3965b82845fc27004087f4715f644fa))
* **admin:** log Zod issues when AI product output fails validation ([#198](https://github.com/kkzakaria/netereka/issues/198)) ([3b6e879](https://github.com/kkzakaria/netereka/commit/3b6e8798f1e34b41f43d04831d54eee4aacd3a8f))
* **admin:** stop AI from hallucinating image URLs ([#207](https://github.com/kkzakaria/netereka/issues/207)) ([411834b](https://github.com/kkzakaria/netereka/commit/411834bac2af08fa7a4d7230aeae313243b9fa77))
* **admin:** unblock AI image preview + import (Referer / UA / diagnostics) ([#205](https://github.com/kkzakaria/netereka/issues/205)) ([aa9e1a2](https://github.com/kkzakaria/netereka/commit/aa9e1a25ee887aa8d7458b1c65f74bbe8eeb42b0))

## [1.10.0](https://github.com/kkzakaria/netereka/compare/v1.9.0...v1.10.0) (2026-04-25)


### Features

* **admin:** group sidebar into 3 sections + domain icons ([#196](https://github.com/kkzakaria/netereka/issues/196)) ([403d51f](https://github.com/kkzakaria/netereka/commit/403d51fda483a9023392f675bdca53aeb8214f72))
* **admin:** move AI config from env vars to admin settings ([#193](https://github.com/kkzakaria/netereka/issues/193)) ([b27ca98](https://github.com/kkzakaria/netereka/commit/b27ca983c30cf8b470681d4e4b30a81184005741))

## [1.9.0](https://github.com/kkzakaria/netereka/compare/v1.8.0...v1.9.0) (2026-04-19)


### Features

* **admin:** AI-powered product creation ([#186](https://github.com/kkzakaria/netereka/issues/186)) ([da68ef0](https://github.com/kkzakaria/netereka/commit/da68ef042713fca0d443f16a6e684ce0c1daedfd))
* **storefront:** restore Description + Caractéristiques tabs ([#183](https://github.com/kkzakaria/netereka/issues/183)) ([d8a2df8](https://github.com/kkzakaria/netereka/commit/d8a2df8f3ff919734d2a5397dc4ec70d78dff733))

## [1.8.0](https://github.com/kkzakaria/netereka/compare/v1.7.2...v1.8.0) (2026-04-18)


### Features

* **storefront:** Apple-like Product Story template ([#177](https://github.com/kkzakaria/netereka/issues/177)) ([0884eb4](https://github.com/kkzakaria/netereka/commit/0884eb4d375afa878881a7b2061f3e4b96855b59))

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
