"use client";

import Script from "next/script";
import { useConsentStore } from "@/stores/consent-store";
import { useMounted } from "@/hooks/use-mounted";

const GA_ID_RE = /^G-[A-Z0-9]+$/;
const GA_ID = process.env.NEXT_PUBLIC_GA4_ID;
const validGaId = GA_ID && GA_ID_RE.test(GA_ID) ? GA_ID : null;

export function GoogleAnalytics() {
  const consent = useConsentStore((s) => s.consent);
  const mounted = useMounted();

  if (!validGaId || !mounted || !consent?.analytics) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${validGaId}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-config" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${validGaId}');`}
      </Script>
    </>
  );
}
