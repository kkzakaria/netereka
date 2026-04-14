"use client";

import { createContext, useContext, type ReactNode } from "react";

const WhatsAppNumberContext = createContext<string | null>(null);

export function WhatsAppNumberProvider({
  value,
  children,
}: {
  value: string | null;
  children: ReactNode;
}) {
  return (
    <WhatsAppNumberContext.Provider value={value}>
      {children}
    </WhatsAppNumberContext.Provider>
  );
}

export function useWhatsAppNumber(): string | null {
  return useContext(WhatsAppNumberContext);
}
