/**
 * Clé KV du préchargement LCP du hero. Module sans import : le middleware (edge)
 * et `refreshHeroPreload` (serveur, Drizzle) la partagent sans que le premier
 * tire les dépendances du second.
 */
export const KV_HERO_PRELOAD_KEY = "hero:lcp:preload-url";
