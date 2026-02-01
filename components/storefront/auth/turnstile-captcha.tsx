"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";

interface TurnstileCaptchaProps {
  onVerify: (token: string) => void;
  onError?: () => void;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: Record<string, unknown>
      ) => string;
      reset: (widgetId: string) => void;
    };
  }
}

export function TurnstileCaptcha({ onVerify, onError }: TurnstileCaptchaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  const renderWidget = () => {
    if (!containerRef.current || !window.turnstile || widgetIdRef.current)
      return;
    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!,
      callback: onVerify,
      "error-callback": onError,
      theme: "auto",
    });
  };

  useEffect(() => {
    renderWidget();
  });

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        onReady={renderWidget}
      />
      <div ref={containerRef} className="flex justify-center" />
    </>
  );
}
