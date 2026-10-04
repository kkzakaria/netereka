-- Trois index que la PRODUCTION porte déjà, hérités des migrations écrites à
-- la main (`db/migrations-legacy/0001_initial.sql` et `0002_better_auth.sql`)
-- et jamais repris par la ligne de base Drizzle. Les déclarer dans
-- `lib/db/schema.ts` fait converger les deux ; cette migration les crée là où
-- ils manquent — les bases locales, reconstruites depuis `drizzle/*.sql`.
--
-- `IF NOT EXISTS` n'est pas une précaution de style : sans lui, cette
-- migration ÉCHOUE sur la production, où les trois existent depuis toujours.
-- drizzle-kit ne le génère pas, puisqu'il croit créer ce qui n'existe nulle
-- part. Et `scripts/migrate.sh` passe par `d1 execute --file`, qui n'est pas
-- transactionnel : un échec au milieu laisserait le fichier à moitié appliqué.
CREATE INDEX IF NOT EXISTS `idx_promo_codes_code` ON `promo_codes` (`code`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_session_token` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_user_email` ON `user` (`email`);
