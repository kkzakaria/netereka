import type { BannerWithdrawImpact, ProductWithdrawImpact, WithdrawImpact } from "@/lib/db/withdraw-impact";

/**
 * Ce que l'écran d'un retrait DIT, décidé ici et non dans le JSX : Vitest
 * tourne sans jsdom, donc seule une fonction pure peut être testée — et c'est
 * le texte qui porte la relecture (§ 2.6 : un retrait est une absence, il faut
 * la nommer et la chiffrer).
 *
 * Règle de rédaction : un compte à zéro s'affiche (« 0 commande »), il ne
 * disparaît pas. Un chiffre absent laisse deviner qu'on ne l'a pas mesuré.
 * Aucun module serveur importé ici (types seulement) : utilisable partout.
 */

export interface WithdrawalLine {
  text: string;
  /** Mis en exergue : une conséquence qui mérite qu'on s'arrête. */
  warning?: boolean;
}

export interface WithdrawalReading {
  /** Renseigné quand la cible n'est déjà plus visible : le retrait ne changerait rien pour un client. */
  alreadyHidden: string | null;
  /** Ce qui cesse d'exister pour un client. */
  disappears: WithdrawalLine[];
  /** Ce qui reste attaché et n'est pas modifié. */
  stays: WithdrawalLine[];
  /** Pourquoi ce retrait n'est pas une suppression. */
  reversible: string;
  /** Ce que l'administrateur doit saisir pour confirmer. */
  confirmName: string;
}

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

export function productWithdrawalReading(i: ProductWithdrawImpact): WithdrawalReading {
  const visible = i.is_active && !i.is_draft;
  const disappears: WithdrawalLine[] = [];

  if (visible) {
    disappears.push({ text: `Sa page /p/${i.slug} : elle cessera de s'ouvrir pour les clients.` });
    disappears.push({
      text:
        i.category_trail.length === 0
          ? "Aucune page catégorie ne la listait (elle n'a pas de catégorie)."
          : `Sa présence dans ${plural(i.category_trail.length, "page catégorie", "pages catégorie")} : ` +
            `${i.category_trail.map((c) => c.name).join(", ")}.`,
    });
    disappears.push({ text: "Les résultats de la recherche." });
    if (i.is_featured) {
      // « Meilleures ventes » est inconditionnel. Le hero ne montre les fiches
      // en vedette que s'il n'y a AUCUNE bannière affichée (`buildSlides`), et
      // seulement les trois premières : le dire sans condition exagérerait.
      disappears.push({
        text: "Elle est EN VEDETTE : elle quitte la section « Meilleures ventes » de l'accueil.",
        warning: true,
      });
      disappears.push({
        text:
          i.displayed_banner_count === 0
            ? "Aucune bannière n'est affichée : le hero montre les fiches en vedette (les trois premières) et cette fiche peut en faire partie."
            : `Le hero n'est pas concerné : il affiche ${plural(i.displayed_banner_count, "bannière", "bannières")}, pas les fiches en vedette.`,
      });
    }
  }

  const stays: WithdrawalLine[] = [
    {
      text:
        `Stock restant : ${plural(i.stock_quantity, "unité", "unités")}` +
        ` (${plural(i.active_variant_count, "variante active", "variantes actives")}).`,
    },
    {
      text:
        i.orders_total === 0
          ? "Commandes qui la référencent : 0."
          : `Commandes qui la référencent : ${i.orders_total}` +
            (i.orders_open > 0 ? `, dont ${i.orders_open} en cours (à livrer)` : ", aucune en cours") +
            " — elles ne sont pas modifiées.",
      warning: i.orders_open > 0,
    },
    { text: `Listes d'envies qui la contiennent : ${i.wishlist_count}.` },
    { text: `Paniers WhatsApp qui la contiennent : ${i.whatsapp_cart_count}.` },
  ];

  return {
    alreadyHidden: visible
      ? null
      : i.is_draft
        ? "Cette fiche est un brouillon : aucun client ne la voit, ce retrait ne changerait rien."
        : "Cette fiche est déjà retirée : aucun client ne la voit, ce retrait ne changerait rien.",
    disappears,
    stays,
    reversible:
      "Ce retrait est réversible : rien n'est supprimé (contenu, images, variantes, stock, commandes). " +
      "La fiche se remet en ligne d'un clic depuis la liste des produits. C'est ce qui distingue un retrait d'une suppression.",
    confirmName: i.name,
  };
}

export function bannerWithdrawalReading(i: BannerWithdrawImpact): WithdrawalReading {
  const disappears: WithdrawalLine[] = [];
  let alreadyHidden: string | null = null;

  if (i.displayed_now) {
    disappears.push({
      text: `Sa place dans le carrousel de l'accueil : position ${i.position} sur ${i.displayed_total}.`,
    });
    disappears.push(
      i.displayed_after === 0
        ? {
            text: "C'est la dernière bannière affichée : le hero montrera à la place les produits en vedette.",
            warning: true,
          }
        : { text: `Il restera ${plural(i.displayed_after, "bannière", "bannières")} dans le carrousel.` },
    );
  } else if (i.window === "inactive") {
    alreadyHidden = "Cette bannière est déjà inactive : aucun client ne la voit, ce retrait ne changerait rien.";
  } else if (i.window === "expired") {
    alreadyHidden =
      `Sa date de fin (${i.ends_at}) est dépassée : elle n'est déjà plus affichée, ce retrait ne changerait rien pour un client.`;
  } else {
    alreadyHidden =
      `Elle est programmée à partir du ${i.starts_at} : elle n'est pas encore affichée. ` +
      "Le retrait l'empêcherait de jamais paraître.";
  }

  return {
    alreadyHidden,
    disappears,
    stays: [
      { text: "Son contenu, son image, son lien et ses dates ne sont pas modifiés." },
      { text: `Bannières affichées après le retrait : ${i.displayed_after}.` },
    ],
    reversible:
      "Ce retrait est réversible : rien n'est supprimé. La bannière se réactive d'un clic depuis la liste des " +
      "bannières. C'est ce qui distingue un retrait d'une suppression.",
    confirmName: i.title,
  };
}

export function withdrawalReading(impact: WithdrawImpact): WithdrawalReading {
  return impact.kind === "product" ? productWithdrawalReading(impact) : bannerWithdrawalReading(impact);
}

/**
 * Une modification de dates peut retirer une bannière sans s'appeler retrait :
 * une `ends_at` passée, ou une `starts_at` future, sort du carrousel dès
 * l'application (§ 2.6 : « un retrait noyé parmi des changements de champs se
 * clique sans être vu »). Renvoie l'avertissement à afficher sur l'écran d'un
 * `update`, ou `null`. Comparaison en chaînes, comme la vitrine. Pure.
 */
export function dateWithdrawalWarning(
  current: { is_active: number | boolean; starts_at: string | null; ends_at: string | null },
  payload: Record<string, unknown>,
  now: string,
): string | null {
  if (!("starts_at" in payload) && !("ends_at" in payload)) return null;
  const displayed = (b: { starts_at: string | null; ends_at: string | null }) =>
    (!b.starts_at || b.starts_at <= now) && (!b.ends_at || b.ends_at > now);
  if (!current.is_active || !displayed(current)) return null;
  const next = {
    starts_at: "starts_at" in payload ? (payload.starts_at as string | null) : current.starts_at,
    ends_at: "ends_at" in payload ? (payload.ends_at as string | null) : current.ends_at,
  };
  return displayed(next)
    ? null
    : "Ces dates retirent la bannière du carrousel dès l'application : c'est un retrait, sans la saisie de confirmation d'un retrait.";
}
