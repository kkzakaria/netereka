"use client";

import { CartSync } from "@/components/storefront/cart-sync";
import { CookieBanner } from "@/components/storefront/cookie-banner";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CartSync />
      <GoogleAnalytics />
      {children}
      <CookieBanner />
    </>
  );
}
