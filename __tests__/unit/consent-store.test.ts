import { describe, it, expect, beforeEach } from "vitest";
import { useConsentStore } from "@/stores/consent-store";

describe("useConsentStore", () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useConsentStore.setState({ consent: null });
  });

  it("le consentement initial est null", () => {
    expect(useConsentStore.getState().consent).toBeNull();
  });

  describe("acceptAll", () => {
    it("active analytics", () => {
      useConsentStore.getState().acceptAll();
      expect(useConsentStore.getState().consent).toEqual({
        analytics: true,
      });
    });
  });

  describe("rejectAll", () => {
    it("désactive analytics", () => {
      useConsentStore.getState().rejectAll();
      expect(useConsentStore.getState().consent).toEqual({
        analytics: false,
      });
    });

    it("passe de accepté à refusé", () => {
      useConsentStore.getState().acceptAll();
      useConsentStore.getState().rejectAll();
      expect(useConsentStore.getState().consent).toEqual({
        analytics: false,
      });
    });
  });

  describe("resetConsent", () => {
    it("remet le consentement à null", () => {
      useConsentStore.getState().acceptAll();
      useConsentStore.getState().resetConsent();
      expect(useConsentStore.getState().consent).toBeNull();
    });
  });

  describe("updateConsent", () => {
    it("active analytics individuellement", () => {
      useConsentStore.getState().updateConsent("analytics", true);
      expect(useConsentStore.getState().consent).toEqual({
        analytics: true,
      });
    });

    it("désactive analytics individuellement", () => {
      useConsentStore.getState().updateConsent("analytics", false);
      expect(useConsentStore.getState().consent).toEqual({
        analytics: false,
      });
    });

    it("peut basculer de true à false", () => {
      useConsentStore.getState().updateConsent("analytics", true);
      useConsentStore.getState().updateConsent("analytics", false);
      expect(useConsentStore.getState().consent?.analytics).toBe(false);
    });
  });
});
