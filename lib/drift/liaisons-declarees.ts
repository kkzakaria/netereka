/**
 * Miroir d'exécution de l'interface `CloudflareEnv` d'`env.d.ts`.
 *
 * Pourquoi dupliquer : `env.d.ts` ne contient que des types, et les types sont
 * effacés à la compilation. La vérification au démarrage du Worker a besoin de
 * la liste sous forme de DONNÉES, à l'exécution, dans un bundle qui ne peut ni
 * lire un fichier ni charger le compilateur TypeScript.
 *
 * Pourquoi cette duplication n'est pas une dérive de plus : le test
 * `__tests__/unit/drift/liaisons-declarees.test.ts` relit `env.d.ts` avec l'API
 * du compilateur TypeScript et exige l'égalité, nom par nom et `?` par `?`. La
 * copie ne peut donc pas s'écarter de l'original sans faire rougir le hook de
 * pré-commit. C'est le même garde-fou, appliqué à lui-même.
 *
 * `requise: false` correspond au `?` d'`env.d.ts`. Ce n'est pas décoratif :
 * requis veut dire « doit être présent », optionnel « peut manquer ».
 */

import type { LiaisonDeclaree } from "./types";

export const LIAISONS_DECLAREES: readonly LiaisonDeclaree[] = [
  { nom: "DB", requise: true },
  { nom: "KV", requise: true },
  { nom: "R2", requise: true },
  { nom: "NEXT_INC_CACHE_R2_BUCKET", requise: true },
  { nom: "ASSETS", requise: true },
  { nom: "BETTER_AUTH_SECRET", requise: true },
  { nom: "GOOGLE_CLIENT_ID", requise: true },
  { nom: "GOOGLE_CLIENT_SECRET", requise: true },
  { nom: "FACEBOOK_APP_ID", requise: true },
  { nom: "FACEBOOK_APP_SECRET", requise: true },
  { nom: "APPLE_CLIENT_ID", requise: true },
  { nom: "APPLE_CLIENT_SECRET", requise: true },
  { nom: "SITE_URL", requise: true },
  { nom: "TURNSTILE_SECRET_KEY", requise: true },
  { nom: "CRON_SECRET", requise: false },
  { nom: "RESEND_API_KEY", requise: false },
  { nom: "RESEND_FROM_EMAIL", requise: false },
  { nom: "BRAVE_SEARCH_API_KEY", requise: false },
  { nom: "XAI_API_KEY", requise: false },
  { nom: "AI_IMAGE_MONTHLY_LIMIT", requise: false },
];
