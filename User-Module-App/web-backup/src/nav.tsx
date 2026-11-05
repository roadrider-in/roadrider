import { createContext, useContext, useEffect } from "react";
import type { Service } from "./ui";

export type Screen = "home" | "detail" | "cart" | "address" | "payment" | "confirmed" | "tracking" | "complete" | "navcart" | "orders" | "account";
export type Route = { id: string; params?: any };

export type NavApi = {
  service: Service;
  selectService: (s: Service) => void;
  go: (s: Screen) => void;
  open: (id: string, params?: any) => void;
  replace: (id: string, params?: any) => void;
  close: () => void;
  closeAll: () => void;
  browse: (s: Service) => void;
  startFlow: (s: Service) => void;
  /** Marks the current screen as holding unsaved input so tab changes ask for confirmation. */
  setGuard: (active: boolean) => void;
  toast: (message: string, tone?: "success" | "error" | "info" | "warning") => void;
};
export const NavCtx = createContext<NavApi | null>(null);
const fallbackNav: NavApi = {
  service: "food",
  selectService: () => {},
  go: () => {},
  open: () => {},
  replace: () => {},
  close: () => {},
  closeAll: () => {},
  browse: () => {},
  startFlow: () => {},
  setGuard: () => {},
  toast: () => {},
};

export function useNav(): NavApi {
  const v = useContext(NavCtx);
  if (!v) {
    console.warn("[useNav] Warning: useNav was called outside NavCtx.Provider. Using safe fallback API.");
    return fallbackNav;
  }
  return v;
}

/** Registers unsaved-form state with the app shell while `active` is true. */
export function useLeaveGuard(active: boolean) {
  const { setGuard } = useNav();
  useEffect(() => { setGuard(active); return () => setGuard(false); }, [active, setGuard]);
}
