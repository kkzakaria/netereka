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

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function TurnstileCaptcha({ onVerify, onError }: TurnstileCaptchaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onVerifyRef = useRef(onVerify);
  const onErrorRef = useRef(onError);
  onVerifyRef.current = onVerify;
  onErrorRef.current = onError;

  const renderWidget = () => {
    if (!containerRef.current || !window.turnstile || widgetIdRef.current || !TURNSTILE_SITE_KEY)
      return;
    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      callback: (token: string) => onVerifyRef.current(token),
      "error-callback": () => onErrorRef.current?.(),
      theme: "auto",
    });
  };

  useEffect(() => {
    renderWidget();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!TURNSTILE_SITE_KEY) return null;

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
