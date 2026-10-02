-- migration-safety: acknowledged reason="Phase de contraction mesuree. Les quatre colonnes Story sont vides sur les 1068 fiches de production et les trois tables OAuth 1.6 comptent 0 ligne. Surtout : la PR 358, promue a 100 % avant celle-ci, a retire ces colonnes du schema Drizzle, donc aucune version vivante ne les nomme plus. Sans cette etape prealable, les deux db.select() sans projection de lib/db/product-drafts.ts auraient echoue pendant la fenetre ou l ancienne version sert 90 a 100 % du trafic. better-auth 1.7 valide son schema a la premiere requete : l absence de ces tables a ete verifiee en local, les quatre routes d authentification repondent 200 sans SCHEMA_MISMATCH."

-- Les tables filles AVANT leur parent : oauthAccessToken.clientId et
-- oauthConsent.clientId referencent oauthApplication.clientId. Les trois sont
-- vides, donc l ordre est indifferent aujourd hui — mais une migration ne doit
-- pas dependre de la vacuite des tables qu elle supprime.
DROP TABLE `oauthAccessToken`;--> statement-breakpoint
DROP TABLE `oauthConsent`;--> statement-breakpoint
DROP TABLE `oauthApplication`;--> statement-breakpoint

-- Les quatre colonnes Story. Leur contenu a ete converti en faq_html et en
-- description HTML ; mesure avant suppression : zero valeur non vide sur 1068.
ALTER TABLE `products` DROP COLUMN `tagline`;--> statement-breakpoint
ALTER TABLE `products` DROP COLUMN `highlights`;--> statement-breakpoint
ALTER TABLE `products` DROP COLUMN `feature_blocks`;--> statement-breakpoint
ALTER TABLE `products` DROP COLUMN `faq`;

-- ai_config n'est PAS supprimee ici, bien qu'elle n'ait plus aucun lecteur : sa
-- ligne unique porte deux identifiants vivants, et sa brave_api_key est la seule
-- copie lisible d une cle Brave — celle du Worker ne se relit pas. Voir le
-- commentaire de la table dans lib/db/schema.ts.
