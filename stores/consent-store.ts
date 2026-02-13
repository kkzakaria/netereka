"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ConsentState {
  consent: { analytics: boolean } | null;
  acceptAll: () => void;
  rejectAll: () => void;
  resetConsent: () => void;
  updateConsent: (category: "analytics", value: boolean) => void;
}

export const useConsentStore = create<ConsentState>()(
  persist(
    (set) => ({
      consent: null,

      acceptAll: () => set({ consent: { analytics: true } }),

      rejectAll: () => set({ consent: { analytics: false } }),

      resetConsent: () => set({ consent: null }),

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
