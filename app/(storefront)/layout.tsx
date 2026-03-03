import { headers } from "next/headers";
import { preload } from "react-dom";
import { Header } from "@/components/storefront/header";
import { Footer } from "@/components/storefront/footer";
import { CartDrawer } from "@/components/storefront/cart-drawer";

const R2_URL = process.env.NEXT_PUBLIC_R2_URL;
const HERO_WIDTHS = [256, 384, 640, 750, 828, 1080, 1200];
const HERO_SIZES = "(max-width: 640px) 44vw, (max-width: 1024px) 45vw, 40vw";

// Inject a responsive image preload for the hero banner into the initial HTML bytes.
// The preload fires as soon as the layout streams (before the page Suspense resolves),
// so the browser fetches the correct DPR variant while D1 queries are still in flight.
async function maybePreloadHero() {
  if (!R2_URL) return;
  const imageKey = (await headers()).get("x-hero-image-key");
  if (!imageKey) return;
  const r2Url = `${R2_URL}/${imageKey}`;
  const cfUrl = (w: number) => `/cdn-cgi/image/width=${w},quality=75,format=auto/${r2Url}`;
  preload(cfUrl(384), {
    as: "image",
    fetchPriority: "high",
    imageSrcSet: HERO_WIDTHS.map((w) => `${cfUrl(w)} ${w}w`).join(", "),
    imageSizes: HERO_SIZES,
  });
}

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await maybePreloadHero();

  return (
    <>
      <Header />
      <main className="min-h-[calc(100dvh-8rem)]">{children}</main>
      <Footer />
      <CartDrawer />
    </>
  );
}
