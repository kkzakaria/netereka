"use client";

import {
  createContext,
  useContext,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type ViewMode = "table" | "cards" | "auto";

interface ViewContextValue {
  mode: ViewMode;
  setMode: (mode: ViewMode) => void;
  effectiveMode: "table" | "cards";
}

const ViewContext = createContext<ViewContextValue | null>(null);

const BREAKPOINT = 1024;

function getIsMobileSnapshot() {
  return window.matchMedia(`(max-width: ${BREAKPOINT - 1}px)`).matches;
}

function getIsMobileServerSnapshot() {
  return false;
}

function subscribeToMediaQuery(callback: () => void) {
  const mq = window.matchMedia(`(max-width: ${BREAKPOINT - 1}px)`);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

export function ViewProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ViewMode>("auto");
  const isMobile = useSyncExternalStore(
    subscribeToMediaQuery,
    getIsMobileSnapshot,
    getIsMobileServerSnapshot
  );

  const effectiveMode: "table" | "cards" =
    mode === "auto" ? (isMobile ? "cards" : "table") : mode;

  return (
    <ViewContext.Provider value={{ mode, setMode, effectiveMode }}>
      {children}
    </ViewContext.Provider>
  );
}

export function useViewMode() {
  const ctx = useContext(ViewContext);
  if (!ctx) {
    throw new Error("useViewMode must be used within a ViewProvider");
  }
  return ctx;
}
