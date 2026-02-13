"use client";

import { useState, useEffect } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ConsentState {
  consent: { analytics: boolean } | null;
  acceptAll: () => void;
  rejectAll: () => void;
  updateConsent: (category: "analytics", value: boolean) => void;
}

export const useConsentStore = create<ConsentState>()(
  persist(
    (set) => ({
      consent: null,

      acceptAll: () => set({ consent: { analytics: true } }),

      rejectAll: () => set({ consent: { analytics: false } }),

      updateConsent: (_category, value) =>
        set(() => ({
          consent: { analytics: value },
        })),
    }),
    {
      name: "netereka-consent:v1",
      partialize: (state) => ({ consent: state.consent }),
    }
  )
);

export function useConsentHydrated() {
  const [hydrated, setHydrated] = useState(
    () => useConsentStore.persist?.hasHydrated?.() ?? false
  );

  if (!hydrated && (useConsentStore.persist?.hasHydrated?.() ?? false)) {
    setHydrated(true);
  }

  useEffect(() => {
    const unsub = useConsentStore.persist?.onFinishHydration?.(() =>
      setHydrated(true)
    );
    return () => unsub?.();
  }, []);

  return hydrated;
}
