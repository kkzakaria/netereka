import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * Returns false during SSR / first render and true after hydration.
 * Uses useSyncExternalStore to avoid the ESLint react-hooks/set-state-in-effect
 * rule that flags the common useState+useEffect "mounted" pattern.
 */
export function useMounted() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
