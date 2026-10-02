-- migration-safety: acknowledged reason="audit_log porte une FOREIGN KEY (actor_id) REFERENCES users(id) heritee des migrations ecrites a la main, vers la table users qui compte 0 ligne depuis que better-auth stocke les comptes dans user (76 lignes). Toute ecriture d audit violait donc la contrainte, et comme createRevision depose la revision ET son audit dans le MEME lot D1, aucune ecriture MCP ne pouvait aboutir : mesure en production, audit_log compte 0 ligne depuis sa creation. SQLite ne sait pas retirer une contrainte par ALTER, d ou la reecriture de la table. Elle est vide, donc aucune donnee n est en jeu."

-- Reecriture sans la contrainte. Le schema Drizzle (lib/db/schema.ts) n a JAMAIS
-- declare cette FK : la source de verite disait qu il n y en avait pas, c est
-- pourquoi db:generate ne pouvait pas proposer ce correctif et pourquoi la
-- divergence a survecu si longtemps.
--
-- Pas de FK vers user(id) non plus, et c est delibere : une piste d audit doit
-- survivre a la suppression de son acteur. actor_name est stocke denormalise
-- exactement pour ca ; une CASCADE effacerait l historique, un RESTRICT
-- empecherait de supprimer un compte. content_revisions, la table la plus
-- recente du meme motif, n a deja aucune FK — celle-ci etait la retardataire.
CREATE TABLE `audit_log_new` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text NOT NULL,
	`actor_name` text NOT NULL,
	`action` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`details` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);--> statement-breakpoint

-- Vide en production, mais une migration ne doit pas dependre de la vacuite de
-- ce qu elle reecrit : une base locale ou de recette peut en porter.
INSERT INTO `audit_log_new` (`id`, `actor_id`, `actor_name`, `action`, `target_type`, `target_id`, `details`, `created_at`)
  SELECT `id`, `actor_id`, `actor_name`, `action`, `target_type`, `target_id`, `details`, `created_at` FROM `audit_log`;--> statement-breakpoint

-- D1 n enveloppe PAS un --file dans une transaction (scripts/migrate.sh:156) :
-- entre ce DROP et le RENAME qui suit, audit_log n existe pas. La fenetre dure
-- quelques millisecondes, et pendant ce temps une ecriture d audit echouerait —
-- alors qu aujourd hui elles echouent TOUTES. L echange est favorable, mais il
-- se dit.
DROP TABLE `audit_log`;--> statement-breakpoint
ALTER TABLE `audit_log_new` RENAME TO `audit_log`;--> statement-breakpoint

-- Les QUATRE index de production, recrees a l identique : supprimer une table
-- emporte les siens. idx_audit_log_target existait en base sans etre declare
-- dans schema.ts, et idx_audit_log_created y est DESC alors que le code
-- l ecrivait sans ordre. Les reconstruire depuis le seul schema Drizzle aurait
-- perdu l un et l ordre de l autre, en silence.
CREATE INDEX `idx_audit_log_actor` ON `audit_log` (`actor_id`);--> statement-breakpoint
CREATE INDEX `idx_audit_log_action` ON `audit_log` (`action`);--> statement-breakpoint
CREATE INDEX `idx_audit_log_target` ON `audit_log` (`target_type`,`target_id`);--> statement-breakpoint
CREATE INDEX `idx_audit_log_created` ON `audit_log` (`created_at` DESC);
