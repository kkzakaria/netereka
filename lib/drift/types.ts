/**
 * Vocabulaire du contrôle de dérive.
 *
 * La dérive, ici, c'est l'écart entre ce que le code SUPPOSE de son
 * environnement et ce que cet environnement EST réellement. Deux incidents du
 * 2026-10-02 ont fixé la forme de ce module :
 *
 *   A — `audit_log` portait en base une `FOREIGN KEY (actor_id) REFERENCES
 *       users(id)` que `lib/db/schema.ts` n'a jamais déclarée. La source de
 *       vérité disait « pas de clé étrangère », donc `db:generate` ne pouvait
 *       rien proposer et aucune base locale ne la reproduisait. Résultat :
 *       aucune écriture d'audit n'a jamais abouti en production.
 *
 *   B — `lib/media/image-search.ts` lisait `env.BRAVE_API_KEY` ; le secret posé
 *       sur le Worker s'appelle `BRAVE_SEARCH_API_KEY`.
 *
 * A est un SURPLUS dans la réalité, B un MANQUE. Un contrôle qui ne cherche que
 * « déclaré mais absent » aurait attrapé B et manqué A entièrement. D'où
 * `SensEcart` : les deux sens sont de première classe, et le sens
 * `present_non_declare` n'est pas une note en bas de page.
 */

/** Dans quel sens l'écart penche. */
export type SensEcart =
  /** Le code l'annonce, la réalité ne l'a pas. (Incident B, premier versant.) */
  | "declare_absent"
  /** La réalité le porte, le code l'ignore. (Incident A, et B second versant.) */
  | "present_non_declare"
  /** Présent des deux côtés, mais pas sous la même forme. */
  | "divergent";

/**
 * - `erreur` : une dérive qui peut casser quelque chose, ou qui l'a déjà fait.
 * - `avertissement` : une dérive réelle mais dont on sait qu'elle est bénigne,
 *   ou qu'on ne sait pas qualifier plus finement sans risquer de crier à tort.
 * - `information` : pas un écart. Une absence que le code autorise
 *   explicitement (une liaison déclarée optionnelle qui manque). Listée parce
 *   qu'un humain veut la voir, jamais comptée contre le code de sortie.
 */
export type Gravite = "erreur" | "avertissement" | "information";

export type Domaine = "base" | "liaisons";

export type Categorie =
  | "table"
  | "colonne"
  | "nullabilite"
  | "cle_primaire"
  | "index"
  | "contrainte_unique"
  | "cle_etrangere"
  | "contrainte_check"
  | "liaison";

/**
 * Rapprochement entre deux écarts de sens opposés dont les noms se ressemblent.
 *
 * C'est la moitié utile du rapport sur l'incident B : « BRAVE_API_KEY est
 * déclarée et absente » et « BRAVE_SEARCH_API_KEY est présente et non
 * déclarée » sont deux faits ; les lire côte à côte est le diagnostic.
 */
export interface Rapprochement {
  /** Le nom de l'autre écart. */
  avec: string;
  /** Pourquoi on les rapproche, en français, à l'intention d'un humain. */
  raison: string;
}

export interface Ecart {
  domaine: Domaine;
  categorie: Categorie;
  sens: SensEcart;
  gravite: Gravite;
  /** Ce sur quoi porte l'écart : `audit_log.actor_id`, `BRAVE_API_KEY`… */
  cible: string;
  /** Phrase complète, en français, lisible sans connaître ce module. */
  message: string;
  rapprochement?: Rapprochement;
  /**
   * Identifiant d'une cause PARTAGÉE par plusieurs écarts.
   *
   * Dix-neuf paragraphes identiques à un nom de table près, c'est un rapport
   * qu'on arrête de lire — et un garde-fou qu'on arrête de croire. Quand
   * plusieurs écarts ont la même origine, ils portent le même `motif` et le
   * rapport les regroupe sous une seule explication.
   */
  motif?: string;
  /** Libellé court du motif, affiché en tête du groupe. */
  motifLibelle?: string;
  /** Explication de la cause, imprimée une fois pour tout le groupe. */
  motifExplication?: string;
}

// ---------------------------------------------------------------------------
// Domaine « base » — les deux descriptions comparées
// ---------------------------------------------------------------------------

export interface FormeColonne {
  nom: string;
  nonNul: boolean;
}

export interface FormeIndex {
  nom: string;
  unique: boolean;
  /**
   * Colonnes dans l'ordre de l'index. `null` quand on n'a pas su les lire de
   * façon fiable (index sur expression, par exemple) : le moteur compare alors
   * la seule présence de l'index et le dit, plutôt que d'inventer un écart.
   */
  colonnes: string[] | null;
}

export interface FormeCleEtrangere {
  colonnes: string[];
  tableCible: string;
  colonnesCibles: string[];
}

export interface FormeTable {
  nom: string;
  colonnes: FormeColonne[];
  /** Colonnes de la clé primaire, dans l'ordre. */
  clePrimaire: string[];
  /**
   * Index NON UNIQUES créés explicitement (`CREATE INDEX`), comparés par leur
   * nom. Les index uniques en sont exclus et passent par `unicites` : leur nom
   * n'est pas une information fiable (voir ci-dessous).
   */
  index: FormeIndex[];
  /**
   * Toutes les façons de dire « ces colonnes sont uniques », réduites à la
   * seule chose comparable : la liste de colonnes.
   *
   * Pourquoi pas le nom : SQLite n'en garde aucun pour un `UNIQUE` écrit en
   * ligne (il invente `sqlite_autoindex_…`), tandis que drizzle-kit, pour le
   * même `.unique()`, émet un `CREATE UNIQUE INDEX` baptisé
   * `<table>_<colonne>_unique`. Les deux formes expriment exactement la même
   * contrainte ; comparer les noms produirait un écart dans chaque sens sur
   * chaque table concernée — seize faux écarts sur cette base. Mesuré.
   */
  unicites: string[][];
  clesEtrangeres: FormeCleEtrangere[];
  /** Noms des contraintes `CHECK` nommées (`CONSTRAINT x CHECK (…)`). */
  checksNommes: string[];
  /**
   * Nombre de `CHECK` sans nom. SQLite ne conserve pas le nom d'une contrainte
   * écrite en ligne ; une table créée par une migration manuelle en porte donc
   * d'anonymes là où Drizzle en déclare de nommées. Sans ce compte, le moteur
   * annoncerait « contrainte absente » alors qu'elle est là.
   */
  checksAnonymes: number;
}

export interface FormeBase {
  tables: FormeTable[];
}

// ---------------------------------------------------------------------------
// Domaine « liaisons » — les deux descriptions comparées
// ---------------------------------------------------------------------------

export interface LiaisonDeclaree {
  nom: string;
  /**
   * Vient du `?` d'`env.d.ts`. Requise = « doit être présente » ; optionnelle =
   * « peut manquer ». C'est ce qui donne enfin du poids au `?` : une optionnelle
   * absente n'est pas un écart, une requise absente en est un.
   */
  requise: boolean;
}

export interface LiaisonReelle {
  nom: string;
  /** `secret_text`, `d1`, `kv_namespace`, `plain_text`… tel que Cloudflare le dit. */
  type: string;
  /** D'où on l'a vue : `version déployée`, `wrangler secret list`, `wrangler.jsonc`… */
  source: string;
}

/**
 * Tables qui existent en base sans avoir à être déclarées dans
 * `lib/db/schema.ts` : elles appartiennent à SQLite, à D1 ou à l'outil de
 * migration. Les exclure ici, à un seul endroit nommé, plutôt que de laisser
 * chaque appelant bricoler son filtre.
 */
export const TABLES_HORS_PERIMETRE: readonly string[] = [
  "sqlite_sequence",
  "sqlite_stat1",
  "sqlite_stat4",
  "_cf_KV",
  "_cf_METADATA",
  "d1_migrations",
  "_drizzle_migrations",
];
