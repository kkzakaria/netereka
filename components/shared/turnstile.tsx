"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "compact" | "invisible";
        }
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

const SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ??
  "1x00000000000000000000AA"; // test key fallback

export function Turnstile({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function renderWidget() {
      if (!window.turnstile || !container) return;
      if (widgetIdRef.current) return; // already rendered

      widgetIdRef.current = window.turnstile.render(container, {
        sitekey: SITE_KEY,
        callback: (token: string) => {
          // Set hidden input value for form submission
          const input = container.querySelector<HTMLInputElement>(
            'input[name="cf-turnstile-response"]'
          );
          if (input) input.value = token;
        },
        "expired-callback": () => {
          const input = container.querySelector<HTMLInputElement>(
            'input[name="cf-turnstile-response"]'
          );
          if (input) input.value = "";
        },
        theme: "auto",
        size: "normal",
      });
    }

    // Load script if not yet loaded
    if (!document.querySelector('script[src*="turnstile"]')) {
      const script = document.createElement("script");
      script.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.onload = renderWidget;
      document.head.appendChild(script);
    } else {
      // Script already loaded, try rendering
      if (window.turnstile) {
        renderWidget();
      } else {
        // Script loading, wait for it
        const interval = setInterval(() => {
          if (window.turnstile) {
            clearInterval(interval);
            renderWidget();
          }
        }, 100);
        return () => clearInterval(interval);
      }
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, []);

  return (
    <div className={className} ref={containerRef}>
      <input type="hidden" name="cf-turnstile-response" />
    </div>
  );
}
