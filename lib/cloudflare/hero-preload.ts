import { getDrizzle } from "@/lib/db/drizzle";
import { bannerClock, displayedBannerCondition, displayedBannerOrder } from "@/lib/db/storefront/banners";
import { getImageUrl } from "@/lib/utils/images";
import { premiereImageDuContenu } from "@/lib/cloudflare/hero-preload-image";
import { getKV } from "@/lib/cloudflare/context";
import { KV_HERO_PRELOAD_KEY } from "@/lib/cloudflare/hero-preload-key";


/**
 * Partagé par les actions d'administration des bannières ET par l'application
 * d'une révision : un fichier `"use server"` ne peut exporter que des actions
 * appelables depuis le navigateur, et celle-ci n'a pas à l'être.
 */
// Cache the first active banner's CF image URL in KV so middleware can send a
// Link: <...>; rel=preload response header — allowing the browser to start the
// hero image fetch at TTFB (0ms) rather than after downloading ~340KB of HTML.
export async function refreshHeroPreload(): Promise<void> {
  try {
    const db = await getDrizzle();

    // La PREMIÈRE bannière affichée, qu'elle porte une image ou non.
    //
    // Avant, la requête ajoutait `isNotNull(banners.image_url)` : elle prenait
    // donc la première bannière AVEC une image, pas la première affichée. Si la
    // tête du carrousel n'en avait pas, on préchargeait l'image d'une
    // diapositive que le visiteur ne voit pas d'abord — des octets dépensés
    // pour rien, et le vrai LCP non préchargé. Le préchargement doit décrire la
    // première diapositive, puisque c'est elle que le navigateur peint.
    const banner = await db.query.banners.findFirst({
      // Même définition de « affichée » que le carrousel, même ordre.
      where: displayedBannerCondition(bannerClock()),
      orderBy: [...displayedBannerOrder],
      columns: { image_url: true, content_html: true },
    });

    const kv = await getKV();

    // Ce que le navigateur chargera vraiment, dans cet ordre de priorité.
    //
    // 1. L'image que la COMPOSITION désigne. Une diapositive libre rend son
    //    propre `<img src>` : on précharge cette adresse telle quelle, sans y
    //    appliquer de transformation. C'est le seul moyen que les deux
    //    s'accordent — l'auteur a pu choisir une URL déjà transformée, une
    //    autre largeur, ou une image qui n'est pas celle de `image_url`.
    // 2. Sinon, la colonne `image_url`, transformée comme avant : c'est le
    //    chemin du gabarit de repli, où `width=640` garde son sens puisque
    //    c'est React qui rend l'image, dans une colonne de 44vw.
    const depuisContenu = premiereImageDuContenu(banner?.content_html);

    let href: string | null = null;
    if (depuisContenu) {
      href = depuisContenu;
    } else if (banner?.image_url) {
      const r2Url = getImageUrl(banner.image_url);
      const path = r2Url.startsWith("/") ? r2Url.slice(1) : r2Url;
      // width=640 matches what mobile browsers (DPR ~2-3, 44vw on 360-412px) actually request.
      href = `/cdn-cgi/image/width=640,quality=75,format=auto/${path}`;
    }

    if (!href) {
      await kv.delete(KV_HERO_PRELOAD_KEY);
      return;
    }

    // `href` vient d'un HTML d'auteur. Un `<` , un `>` , une espace ou un
    // caractère de contrôle casseraient l'en-tête `Link` : `Headers.set`
    // lèverait dans le middleware, qui perdrait le préchargement ET
    // journalerait une erreur en production, pour une valeur qu'on aurait pu
    // refuser ici une fois pour toutes. L'assainisseur a déjà validé le
    // SCHÉMA de l'URL ; ce contrôle-ci porte sur ce qu'un en-tête accepte.
    if (!/^[^<>\s"']+$/.test(href)) {
      console.warn("[hero-preload] URL impropre à un en-tête Link, préchargement abandonné", { href });
      await kv.delete(KV_HERO_PRELOAD_KEY);
      return;
    }

    // Use a simple preload without imagesrcset/imagesizes: Cloudflare Early Hints garbles
    // multi-value imagesrcset (commas inside the quoted string are misread as Link header
    // value separators), causing the browser to skip the preload entirely.
    const linkValue = `<${href}>; rel=preload; as=image; fetchpriority=high`;

    await kv.put(KV_HERO_PRELOAD_KEY, linkValue);
  } catch (error) {
    console.error("[admin/banners] refreshHeroPreload error:", error);
  }
}

