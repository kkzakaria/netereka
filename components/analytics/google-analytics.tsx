"use client";

import Script from "next/script";
import { useConsentStore, useConsentHydrated } from "@/stores/consent-store";

const GA_ID = process.env.NEXT_PUBLIC_GA4_ID;

export function GoogleAnalytics() {
  const consent = useConsentStore((s) => s.consent);
  const hydrated = useConsentHydrated();

  if (!GA_ID) return null;
  if (!hydrated) return null;
  if (!consent?.analytics) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-config" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`}
      </Script>
    </>
  );
}
