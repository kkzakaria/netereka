import { and, isNotNull } from "drizzle-orm";
import { getDrizzle } from "@/lib/db/drizzle";
import { banners } from "@/lib/db/schema";
import { bannerClock, displayedBannerCondition, displayedBannerOrder } from "@/lib/db/storefront/banners";
import { getImageUrl } from "@/lib/utils/images";
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

    const banner = await db.query.banners.findFirst({
      // Même définition de « affichée » que le carrousel, plus une image.
      where: and(displayedBannerCondition(bannerClock()), isNotNull(banners.image_url)),
      orderBy: [...displayedBannerOrder],
      columns: { image_url: true },
    });

    const kv = await getKV();

    if (!banner?.image_url) {
      await kv.delete(KV_HERO_PRELOAD_KEY);
      return;
    }

    const r2Url = getImageUrl(banner.image_url);
    const path = r2Url.startsWith("/") ? r2Url.slice(1) : r2Url;
    const cfUrl = (w: number) => `/cdn-cgi/image/width=${w},quality=75,format=auto/${path}`;
    // Use a simple preload without imagesrcset/imagesizes: Cloudflare Early Hints garbles
    // multi-value imagesrcset (commas inside the quoted string are misread as Link header
    // value separators), causing the browser to skip the preload entirely.
    // width=640 matches what mobile browsers (DPR ~2-3, 44vw on 360-412px) actually request.
    const linkValue = `<${cfUrl(640)}>; rel=preload; as=image; fetchpriority=high`;

    await kv.put(KV_HERO_PRELOAD_KEY, linkValue);
  } catch (error) {
    console.error("[admin/banners] refreshHeroPreload error:", error);
  }
}

