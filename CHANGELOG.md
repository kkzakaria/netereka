# Changelog

## [1.7.0](https://github.com/kkzakaria/netereka/compare/v1.6.0...v1.7.0) (2026-04-16)


### Features

* **admin:** align product edit form with wizard ([#135](https://github.com/kkzakaria/netereka/issues/135)) ([6f4df80](https://github.com/kkzakaria/netereka/commit/6f4df80b2945d3ccce8d812dacb542ca5012c5c1))
* **admin:** auto-generate slug and SKU on product save ([#133](https://github.com/kkzakaria/netereka/issues/133)) ([36d887f](https://github.com/kkzakaria/netereka/commit/36d887ff5bf62854fbf4addc7eac84b3825ab01a))
* **admin:** guided product creation wizard ([#134](https://github.com/kkzakaria/netereka/issues/134)) ([d000333](https://github.com/kkzakaria/netereka/commit/d000333f6a4c3813929847c7a5ca9eaae7677811))
* **admin:** HTML/CSS editor for product descriptions ([#136](https://github.com/kkzakaria/netereka/issues/136)) ([2f5af0f](https://github.com/kkzakaria/netereka/commit/2f5af0f5878719bfaf0e7481d035dd4c6fc1f8c0))
* **auth:** comment out Apple sign-in button (pending configuration) ([2866ef3](https://github.com/kkzakaria/netereka/commit/2866ef35dcaebc529c80bf47b85a32b46531137f))
* **auth:** email OTP for sign-up verification and password reset ([#107](https://github.com/kkzakaria/netereka/issues/107)) ([9d0c763](https://github.com/kkzakaria/netereka/commit/9d0c763214e257d8bbb263173f9199ca5f7d85c1))
* **auth:** hide Apple sign-in button (pending configuration) ([48d4fcb](https://github.com/kkzakaria/netereka/commit/48d4fcb8ad24b2891cf01e9e3b739d966a42f0fe))
* **auth:** migrate to better-auth admin plugin with agent role ([#124](https://github.com/kkzakaria/netereka/issues/124)) ([8978d41](https://github.com/kkzakaria/netereka/commit/8978d4116f555340d5eec57c43c1a4c9b3dab0ad))
* **banners:** auto-assign display_order on creation ([#122](https://github.com/kkzakaria/netereka/issues/122)) ([fe4e3d2](https://github.com/kkzakaria/netereka/commit/fe4e3d2bf93593fdbb53fa9db5e3eb45405832c7))
* **banners:** drag-and-drop reordering ([#123](https://github.com/kkzakaria/netereka/issues/123)) ([5eb95b2](https://github.com/kkzakaria/netereka/commit/5eb95b2717599cbc9e1b207dba40debb67cc4821))
* **category:** show subcategories as filter on category pages ([#116](https://github.com/kkzakaria/netereka/issues/116)) ([1c8c06f](https://github.com/kkzakaria/netereka/commit/1c8c06f5d6944c3fd837a785a72edda3778cca47))
* **ci:** Cloudflare Versions pipeline + release-please (Phase 3+4+5) ([#156](https://github.com/kkzakaria/netereka/issues/156)) ([208a54b](https://github.com/kkzakaria/netereka/commit/208a54b69d5fed418af44b7fa24424021787e3c8))
* **ci:** migration safety lint + Conventional Commits enforcement (Phase 1+2) ([#155](https://github.com/kkzakaria/netereka/issues/155)) ([31953d8](https://github.com/kkzakaria/netereka/commit/31953d83094ba8662a5c59cfad9de333909a4b07))
* **ci:** WhatsApp Worker CD + release pipeline documentation (Phase 6+7) ([#158](https://github.com/kkzakaria/netereka/issues/158)) ([dd5b264](https://github.com/kkzakaria/netereka/commit/dd5b264f776101ba8fb03fc310087286c46a9e33))
* **editor:** listes à puces et insertion d'images dans l'éditeur riche ([#131](https://github.com/kkzakaria/netereka/issues/131)) ([faf44db](https://github.com/kkzakaria/netereka/commit/faf44dbd98ea94a9451cde3b4e7d205e890eca07))
* **email:** use noreply@ for OTP emails, commandes@ for order emails ([28d656d](https://github.com/kkzakaria/netereka/commit/28d656deb13c209208dab5a281cc72e92fa4609b))
* **filters:** replace price inputs with dual-handle slider + inputs ([#112](https://github.com/kkzakaria/netereka/issues/112)) ([c8a0fad](https://github.com/kkzakaria/netereka/commit/c8a0fad83039f911687c5102a1cd586a6bcd59a4))
* **filters:** truncate brand list with expand and inline search ([#111](https://github.com/kkzakaria/netereka/issues/111)) ([87834e9](https://github.com/kkzakaria/netereka/commit/87834e9665630b4524f3122c59431d056a23b209))
* **images:** plug Cloudflare Image Resizing loader (CF Images activated) ([#99](https://github.com/kkzakaria/netereka/issues/99)) ([02cd849](https://github.com/kkzakaria/netereka/commit/02cd8496253453cf36bffff4e74a41c790d00105))
* **images:** use Cloudflare Image Resizing to fix LCP ([#97](https://github.com/kkzakaria/netereka/issues/97)) ([1a1d868](https://github.com/kkzakaria/netereka/commit/1a1d868c3441a426f0f91513fbff01ae11c71c17))
* **product-card:** add cart and wishlist action buttons ([#118](https://github.com/kkzakaria/netereka/issues/118)) ([908fd34](https://github.com/kkzakaria/netereka/commit/908fd3440bfe2dc11c96739e4a89f40e284aac14))
* remove AI implementation ([#95](https://github.com/kkzakaria/netereka/issues/95)) ([4bf9d57](https://github.com/kkzakaria/netereka/commit/4bf9d572598813b0cf026405cf25a0fb1f8ef939))
* **security:** add HTTP security headers via next.config.ts ([#100](https://github.com/kkzakaria/netereka/issues/100)) ([6b0af6d](https://github.com/kkzakaria/netereka/commit/6b0af6d3df7f543e80ae754e6a51f87d2b5c7bcc))
* store locations management (admin CRUD + dynamic header) ([#141](https://github.com/kkzakaria/netereka/issues/141)) ([ccb08f6](https://github.com/kkzakaria/netereka/commit/ccb08f65a5d823a747044eb3c39e60fee4431e87))
* **storefront:** add store location map icon in header ([#140](https://github.com/kkzakaria/netereka/issues/140)) ([8bf8862](https://github.com/kkzakaria/netereka/commit/8bf8862337a47b58a9a36f58e6c08f3ddfee1826))
* **storefront:** wishlist button for unauthenticated users with auth dialog ([#119](https://github.com/kkzakaria/netereka/issues/119)) ([72692f0](https://github.com/kkzakaria/netereka/commit/72692f0bd0283a78ecbb23b1281e4b058b7da46b))
* WhatsApp Core Bot (Phase 1) — Worker + LLM + catalogue ([#144](https://github.com/kkzakaria/netereka/issues/144)) ([330d715](https://github.com/kkzakaria/netereka/commit/330d7155bac89ff5623ee660d5e7006cd2c6841d))
* **whatsapp:** allow configuring public number without full API setup ([#149](https://github.com/kkzakaria/netereka/issues/149)) ([b4c868f](https://github.com/kkzakaria/netereka/commit/b4c868fec0e4a34728deb6bb2e9192b8d0214bc9))
* **wishlist:** align wishlist button style with cart button ([#120](https://github.com/kkzakaria/netereka/issues/120)) ([10e1412](https://github.com/kkzakaria/netereka/commit/10e141295f1e072947555da85c16d885beac2e81))


### Bug Fixes

* **admin:** editor dimensions and HTML preview in sheet ([#137](https://github.com/kkzakaria/netereka/issues/137)) ([a02498f](https://github.com/kkzakaria/netereka/commit/a02498fd626e2d822bc9868306e46316b26584ad))
* **admin:** fix empty editor dialog and HTML editor width ([98e6c83](https://github.com/kkzakaria/netereka/commit/98e6c83e04f5ee80c13e1d73408caa6be30b1f6f))
* **admin:** fix empty editor dialog detection and HTML editor width ([82e5956](https://github.com/kkzakaria/netereka/commit/82e59564d9cc33d676f0fa99957dc4736e4827ef))
* **admin:** fix SectionNav not highlighting SEO and Visibilité sections ([#94](https://github.com/kkzakaria/netereka/issues/94)) ([bc6015c](https://github.com/kkzakaria/netereka/commit/bc6015cb08fd751ed35460621cf72f80565bf5d9))
* **admin:** make HTML editor adapt to available width ([78fe920](https://github.com/kkzakaria/netereka/commit/78fe920872ed9e2d34d0ed5a14d965ca0a6d33e2))
* **admin:** prevent page-level scroll caused by Radix Switch bubble inputs ([#93](https://github.com/kkzakaria/netereka/issues/93)) ([c9b6024](https://github.com/kkzakaria/netereka/commit/c9b6024613f2eac5d5b3a6de679efa333c231b49))
* **admin:** resolve DescriptionEditor hydration mismatch ([05e047f](https://github.com/kkzakaria/netereka/commit/05e047f7bf5a84c7d55f30445c0cc761b422397e))
* **admin:** resolve RichTextEditor hydration mismatch ([#132](https://github.com/kkzakaria/netereka/issues/132)) ([4fe6910](https://github.com/kkzakaria/netereka/commit/4fe691065d83aafbb210052a9f558b5878102abf))
* **admin:** rewrite SectionNav scroll-spy with scroll listener ([9f4c39d](https://github.com/kkzakaria/netereka/commit/9f4c39d0ef457492eb3aa80e053edb09b3c3d5b9))
* **admin:** set min 400px / max 800px with scroll for both editors ([12a3b1a](https://github.com/kkzakaria/netereka/commit/12a3b1aa6e0a98fa4f96d3d8ad678c47851b0257))
* **admin:** skip confirmation dialog when editor is empty ([7a1c08a](https://github.com/kkzakaria/netereka/commit/7a1c08ab9518d785b43523f595233d696e40e1d5))
* **admin:** skip dialog for empty Lexical editor, fix HTML editor width ([fe15e2b](https://github.com/kkzakaria/netereka/commit/fe15e2b4579262fb75c77ba931f685b7237dded8))
* **auth:** address PR review issues — error handling, logging, schemas ([cee9e38](https://github.com/kkzakaria/netereka/commit/cee9e38e7854d6264d3acccca1a8797675a7ff8b))
* **avatar:** use unoptimized for OAuth profile photos in header ([#108](https://github.com/kkzakaria/netereka/issues/108)) ([5480e16](https://github.com/kkzakaria/netereka/commit/5480e1691b2146fbc87f9c87fe3ec61d32f8328e))
* **category:** hide category filter on category pages ([#115](https://github.com/kkzakaria/netereka/issues/115)) ([bf95c65](https://github.com/kkzakaria/netereka/commit/bf95c654cd07f7100d827bb2dc21a23c087bcd2f))
* **category:** remove subcategory filter from category pages ([#117](https://github.com/kkzakaria/netereka/issues/117)) ([4fcaeef](https://github.com/kkzakaria/netereka/commit/4fcaeef7762932f9dc01c7c9cae425acfd0f5015))
* **category:** remove subcategory grid from category page ([#113](https://github.com/kkzakaria/netereka/issues/113)) ([07e3dba](https://github.com/kkzakaria/netereka/commit/07e3dba8a3bf2f022728659447c96e7ae5ed9d80))
* **ci:** add --remote flag to KV put in seed-hero-preload script ([#105](https://github.com/kkzakaria/netereka/issues/105)) ([7a8712a](https://github.com/kkzakaria/netereka/commit/7a8712a4ace9b3174428fd30af2a6e0ff16c1bcf))
* **ci:** deploy.yml picks wrong baseline + deploy-whatsapp hits OpenNext ([#160](https://github.com/kkzakaria/netereka/issues/160)) ([ae43713](https://github.com/kkzakaria/netereka/commit/ae43713abf216987e819e9d84f9dce062083e1fe))
* **deploy:** add R2 binding for OpenNext incremental cache ([#139](https://github.com/kkzakaria/netereka/issues/139)) ([840ba2e](https://github.com/kkzakaria/netereka/commit/840ba2ee55624f8f8861d3b2aeb2056fdb17f0ee))
* **deps:** resolve 27 npm audit vulnerabilities ([#138](https://github.com/kkzakaria/netereka/issues/138)) ([f43bb57](https://github.com/kkzakaria/netereka/commit/f43bb57172bef4362c76955ab8791ae18658677f))
* **email:** return failure when RESEND_API_KEY is not configured ([8b0df04](https://github.com/kkzakaria/netereka/commit/8b0df04ad456158bb4184b6d4e0ebb900173f9a3))
* **image-loader:** include width in dev URLs + add db:sync script ([#110](https://github.com/kkzakaria/netereka/issues/110)) ([e52ac79](https://github.com/kkzakaria/netereka/commit/e52ac79995ec40d3fd2cb9261bcbd4eb7898d1fe))
* **image-loader:** revert accidental http/https bypass ([#109](https://github.com/kkzakaria/netereka/issues/109)) ([aa12345](https://github.com/kkzakaria/netereka/commit/aa123457afc8b2956bb27ee13c4da5ec5cabab03))
* **lcp:** simple preload header to bypass CF Early Hints garbling ([#128](https://github.com/kkzakaria/netereka/issues/128)) ([629e2e7](https://github.com/kkzakaria/netereka/commit/629e2e7b7f9784258c725ae27fcc7dc78b49ca9b))
* **release:** address CodeRabbit feedback on pipeline spec+plan ([#154](https://github.com/kkzakaria/netereka/issues/154)) ([ef5efdc](https://github.com/kkzakaria/netereka/commit/ef5efdcedfdf0937edd77eabc7ff1173021d04fc))
* **seo:** fix sitemap 500 error and extend robots.txt AI bot rules ([#96](https://github.com/kkzakaria/netereka/issues/96)) ([4f63879](https://github.com/kkzakaria/netereka/commit/4f63879b4f118c7fbc29f2a9490070c89be42c38))
* **storefront:** match WhatsApp button size to Add to Cart button ([df99081](https://github.com/kkzakaria/netereka/commit/df99081524bd8759f36ebe1d7b9f0bc839912226))
* **storefront:** place WhatsApp button below Add to Cart on variant products ([69a7563](https://github.com/kkzakaria/netereka/commit/69a75633589b5b855d8db06196eb7dd346ccb304))
* **stores:** remove redundant and() wrapper, hide sort_order on create ([84c5c23](https://github.com/kkzakaria/netereka/commit/84c5c2369514976aab2209439f68295cf6d65ab9))
* **whatsapp:** decouple storefront buttons from bot is_active flag ([#151](https://github.com/kkzakaria/netereka/issues/151)) ([03baa0d](https://github.com/kkzakaria/netereka/commit/03baa0dcf9bb92143b36ba92560a3694ea4d4e46))


### Performance

* **homepage:** stream above-fold content to unblock LCP ([#127](https://github.com/kkzakaria/netereka/issues/127)) ([d4e114f](https://github.com/kkzakaria/netereka/commit/d4e114f44ffae154e7c5bfbf71493a2e001312d2))
* LCP optimization — remove inlineCss, fix preload pipeline, reduce client bundle ([#126](https://github.com/kkzakaria/netereka/issues/126)) ([c433f3a](https://github.com/kkzakaria/netereka/commit/c433f3a4fd0a8cc583f7a3bbaee258956d44ecd7))
* **lcp:** add HTTP Link preload header for hero banner via KV cache ([#103](https://github.com/kkzakaria/netereka/issues/103)) ([d0daf50](https://github.com/kkzakaria/netereka/commit/d0daf504fa9f3c231637156b95516d79b44ef171))
* **lcp:** add server-side preload for hero banner image ([#101](https://github.com/kkzakaria/netereka/issues/101)) ([1b2dae2](https://github.com/kkzakaria/netereka/commit/1b2dae21f373733a3b72d3abcf00a6a79bc1cc0e))
* **lcp:** inject responsive hero preload in storefront layout ([#129](https://github.com/kkzakaria/netereka/issues/129)) ([24b1c32](https://github.com/kkzakaria/netereka/commit/24b1c32d64c0f18aa7af9b8faf1001c0ca230005))
* **lcp:** use react-dom preload() to inject banner preload into &lt;head&gt; ([#102](https://github.com/kkzakaria/netereka/issues/102)) ([0668aa3](https://github.com/kkzakaria/netereka/commit/0668aa30d3dab3f539917d561e82de8b4ca926f6))


### Refactoring

* **admin:** post-merge cleanup from PR [#124](https://github.com/kkzakaria/netereka/issues/124) ([#125](https://github.com/kkzakaria/netereka/issues/125)) ([8249ac8](https://github.com/kkzakaria/netereka/commit/8249ac8ff62a59fa7f68b3493e5427e7511edc0c))
* **admin:** use DropdownMenu and ActionSheet for store actions ([#143](https://github.com/kkzakaria/netereka/issues/143)) ([8b63c7f](https://github.com/kkzakaria/netereka/commit/8b63c7f4df1f4deb171d20d6a9e044c8d4eebef7))
* **auth:** convert sign-in and sign-up pages to Server Components ([115c93c](https://github.com/kkzakaria/netereka/commit/115c93c2abd169bb70e839ca3723e9d06b3c0406))
* use Dialog instead of Sheet for store form ([#142](https://github.com/kkzakaria/netereka/issues/142)) ([83f9cd1](https://github.com/kkzakaria/netereka/commit/83f9cd19dd04b216c4e95c7294de50f43d55448d))
* **whatsapp:** move public number to admin config (instead of env var) ([#146](https://github.com/kkzakaria/netereka/issues/146)) ([e9ed47c](https://github.com/kkzakaria/netereka/commit/e9ed47cb02c6bc6657eb77487c0df5d0724988d7))


### Documentation

* **claude:** add session learnings — WhatsApp integration + common gotchas ([#152](https://github.com/kkzakaria/netereka/issues/152)) ([8f7f8f7](https://github.com/kkzakaria/netereka/commit/8f7f8f7acfb228c30d408c8695f667e1299a0b0d))
* **claude:** document auth route group pattern and middleware scope ([68332b4](https://github.com/kkzakaria/netereka/commit/68332b420294833b4b15291ab801fcc1917c3d0b))
* **release:** full pipeline redesign — spec + implementation plan ([#153](https://github.com/kkzakaria/netereka/issues/153)) ([ca679cc](https://github.com/kkzakaria/netereka/commit/ca679cc3b0a096c9670219ed70c8886a0fd781b9))
