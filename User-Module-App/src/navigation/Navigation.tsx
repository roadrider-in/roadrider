import React, { createContext, useContext, useMemo } from "react";
import {
  NavigationProp,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import type {
  RootStackParamList,
  RouteSpec,
  TabName,
  PlacesMode,
} from "./types";

export type { TabName, PlacesMode, RouteSpec };

export const TAB_NAMES: TabName[] = [
  "home",
  "navcart",
  "orders",
  "account",
];

export const isTab = (
  name: string
): name is TabName => (TAB_NAMES as string[]).includes(name);

export interface NavContextType {
  push: (r: RouteSpec) => void;
  replace: (r: RouteSpec) => void;
  reset: (routes: RouteSpec[]) => void;
  back: () => void;
  pop: (count?: number) => void;
  canGoBack: () => boolean;
  switchTab: (t: TabName) => void;
}

const NavContext = createContext<NavContextType | null>(null);

/**
 * Hook providing uniform navigation actions across all native screens,
 * matching original RoadRider push/back/switchTab contracts while backed by React Navigation.
 */
export function useNav() {
  let nav: NavigationProp<RootStackParamList> | null = null;
  try {
    nav = useNavigation<NavigationProp<RootStackParamList>>();
  } catch {
    nav = null;
  }

  const push = (r: RouteSpec) => {
    if (!nav) return;
    if (r.name === "mainTabs") {
      (nav as any).navigate("mainTabs", { screen: (r as any).screen || "home" });
      return;
    }
    if (isTab(r.name)) {
      (nav as any).navigate("mainTabs", { screen: r.name });
      return;
    }
    const { name, ...params } = r as any;
    (nav as any).navigate(name, params);
  };

  const replace = (r: RouteSpec) => {
    if (!nav) return;
    if (r.name === "mainTabs") {
      (nav as any).reset({
        index: 0,
        routes: [
          { name: "mainTabs", params: { screen: (r as any).screen || "home" } },
        ],
      });
      return;
    }
    if (isTab(r.name)) {
      (nav as any).reset({
        index: 0,
        routes: [{ name: "mainTabs", params: { screen: r.name } }],
      });
      return;
    }
    const { name, ...params } = r as any;
    (nav as any).replace(name, params);
  };

  const reset = (routes: RouteSpec[]) => {
    if (!nav) return;
    const last = routes[routes.length - 1];
    if (last && (isTab(last.name) || last.name === "mainTabs")) {
      const screen =
        last.name === "mainTabs" ? (last as any).screen || "home" : last.name;
      nav.reset({
        index: 0,
        routes: [{ name: "mainTabs", params: { screen } }],
      });
      return;
    }
    if (last) {
      const { name, ...params } = last as any;
      nav.reset({
        index: 0,
        routes: [{ name, params }],
      });
    }
  };

  const back = () => {
    if (!nav) return;
    if (nav.canGoBack()) {
      nav.goBack();
    } else {
      (nav as any).navigate("mainTabs", { screen: "home" });
    }
  };

  const pop = (count: number = 1) => {
    if (!nav) return;
    if ((nav as any).pop) {
      (nav as any).pop(count);
    } else if (nav.canGoBack()) {
      nav.goBack();
    } else {
      (nav as any).navigate("mainTabs", { screen: "home" });
    }
  };

  const canGoBack = () => {
    if (!nav) return false;
    return nav.canGoBack();
  };

  const switchTab = (t: TabName) => {
    if (!nav) return;
    (nav as any).navigate("mainTabs", { screen: t });
  };

  return {
    push,
    replace,
    reset,
    back,
    pop,
    canGoBack,
    switchTab,
  };
}
