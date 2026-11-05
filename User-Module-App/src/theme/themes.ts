import { useApp } from "../state/AppState";
import type { Service } from "../data/demo";

export interface ServiceTheme {
  id: Service;
  name: string;
  // Primary palette
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primarySoft: string;
  // Secondary / Accent
  secondary: string;
  accent: string;
  accentSoft: string;
  accentLight: string;
  // Surfaces & Backgrounds
  background: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  borderSubtle: string;
  cardBg: string;
  // Text colors
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textOnPrimary: string;
  // Component-specific tokens
  headerText: string;
  headerSubText: string;
  serviceTabActiveBg: string;
  serviceTabActiveText: string;
  searchBorder: string;
  searchBg: string;
  searchPlaceholder: string;
  searchIconColor: string;
  searchFilterBtnBg: string;
  searchFilterBtnColor: string;
  badgeBg: string;
  badgeText: string;
  buttonPrimaryBg: string;
  buttonPrimaryText: string;
  bottomNavActive: string;
  bottomNavActiveBg: string;
  bottomNavBadgeBg: string;
  bannerGradient: [string, string];
  pillBg: string;
  starColor: string;
}

export const FOOD_THEME: ServiceTheme = {
  id: "food",
  name: "RoadRider Food",
  primary: "#c84b31",
  primaryDark: "#a63a24",
  primaryLight: "#d95b43",
  primarySoft: "#fcebe6",
  secondary: "#f97316",
  accent: "#ea580c",
  accentSoft: "#fef3ee",
  accentLight: "#ffedd5",
  background: "#faf7f2",
  surface: "#ffffff",
  surfaceMuted: "#f7f4ee",
  border: "#f0eae1",
  borderSubtle: "#f5f0e8",
  cardBg: "#ffffff",
  textPrimary: "#171514",
  textSecondary: "#6e6762",
  textMuted: "#9c948e",
  textOnPrimary: "#ffffff",
  headerText: "#ffffff",
  headerSubText: "rgba(255, 255, 255, 0.72)",
  serviceTabActiveBg: "#c84b31",
  serviceTabActiveText: "#ffffff",
  searchBorder: "#f0eae1",
  searchBg: "#ffffff",
  searchPlaceholder: "#8d8580",
  searchIconColor: "#c84b31",
  searchFilterBtnBg: "#fcebe6",
  searchFilterBtnColor: "#c84b31",
  badgeBg: "#fee2e2",
  badgeText: "#c84b31",
  buttonPrimaryBg: "#c84b31",
  buttonPrimaryText: "#ffffff",
  bottomNavActive: "#c84b31",
  bottomNavActiveBg: "#fcebe6",
  bottomNavBadgeBg: "#c84b31",
  bannerGradient: ["#8a1f11", "#c84b31"],
  pillBg: "#fff5f0",
  starColor: "#1e8e3e",
};

export const RIDES_THEME: ServiceTheme = {
  id: "rides",
  name: "RoadRider Rides",
  primary: "#1769E8",
  primaryDark: "#0849B8",
  primaryLight: "#4B91F5",
  primarySoft: "#EAF3FF",
  secondary: "#4B91F5",
  accent: "#1769E8",
  accentSoft: "#EAF3FF",
  accentLight: "#DCE8F8",
  background: "#F5F9FF",
  surface: "#FFFFFF",
  surfaceMuted: "#EAF3FF",
  border: "#DCE8F8",
  borderSubtle: "#EAF3FF",
  cardBg: "#FFFFFF",
  textPrimary: "#172033",
  textSecondary: "#68758A",
  textMuted: "#8A99AD",
  textOnPrimary: "#FFFFFF",
  headerText: "#FFFFFF",
  headerSubText: "rgba(255, 255, 255, 0.85)",
  serviceTabActiveBg: "#1769E8",
  serviceTabActiveText: "#FFFFFF",
  searchBorder: "#DCE8F8",
  searchBg: "#FFFFFF",
  searchPlaceholder: "#68758A",
  searchIconColor: "#1769E8",
  searchFilterBtnBg: "#EAF3FF",
  searchFilterBtnColor: "#1769E8",
  badgeBg: "#EAF3FF",
  badgeText: "#1769E8",
  buttonPrimaryBg: "#1769E8",
  buttonPrimaryText: "#FFFFFF",
  bottomNavActive: "#1769E8",
  bottomNavActiveBg: "#EAF3FF",
  bottomNavBadgeBg: "#1769E8",
  bannerGradient: ["#0849B8", "#1769E8"],
  pillBg: "#EAF3FF",
  starColor: "#F59E0B",
};

export const GROCERY_THEME: ServiceTheme = {
  id: "grocery",
  name: "RoadRider Grocery",
  primary: "#1e8e3e",
  primaryDark: "#137333",
  primaryLight: "#34a853",
  primarySoft: "#e6f4ea",
  secondary: "#22c55e",
  accent: "#16a34a",
  accentSoft: "#edf7f0",
  accentLight: "#dcfce7",
  background: "#f6fbf7",
  surface: "#ffffff",
  surfaceMuted: "#edf5ef",
  border: "#d6ebd9",
  borderSubtle: "#e4f3e7",
  cardBg: "#ffffff",
  textPrimary: "#141c16",
  textSecondary: "#4d5b51",
  textMuted: "#6d7d71",
  textOnPrimary: "#ffffff",
  headerText: "#141c16",
  headerSubText: "#5f6e63",
  serviceTabActiveBg: "#1e8e3e",
  serviceTabActiveText: "#ffffff",
  searchBorder: "#d1ead6",
  searchBg: "#ffffff",
  searchPlaceholder: "#5f6e63",
  searchIconColor: "#1e8e3e",
  searchFilterBtnBg: "#e6f4ea",
  searchFilterBtnColor: "#1e8e3e",
  badgeBg: "#dcfce7",
  badgeText: "#15803d",
  buttonPrimaryBg: "#1e8e3e",
  buttonPrimaryText: "#ffffff",
  bottomNavActive: "#1e8e3e",
  bottomNavActiveBg: "#e6f4ea",
  bottomNavBadgeBg: "#1e8e3e",
  bannerGradient: ["#0f5132", "#1e8e3e"],
  pillBg: "#edf7f0",
  starColor: "#1e8e3e",
};

export const COURIER_THEME: ServiceTheme = {
  id: "courier",
  name: "RoadRider Courier",
  primary: "#E87518",
  primaryDark: "#C25D0E",
  primaryLight: "#F59E0B",
  primarySoft: "#FFF4EB",
  secondary: "#F59E0B",
  accent: "#E87518",
  accentSoft: "#FFF7F0",
  accentLight: "#FEF3C7",
  background: "#F5F8FC",
  surface: "#FFFFFF",
  surfaceMuted: "#F5F8FC",
  border: "#E4EAF1",
  borderSubtle: "#EEF3F8",
  cardBg: "#FFFFFF",
  textPrimary: "#151B2B",
  textSecondary: "#68758A",
  textMuted: "#8A99AD",
  textOnPrimary: "#FFFFFF",
  headerText: "#FFFFFF",
  headerSubText: "rgba(255, 255, 255, 0.85)",
  serviceTabActiveBg: "#E87518",
  serviceTabActiveText: "#FFFFFF",
  searchBorder: "#E4EAF1",
  searchBg: "#FFFFFF",
  searchPlaceholder: "#68758A",
  searchIconColor: "#E87518",
  searchFilterBtnBg: "#FFF4EB",
  searchFilterBtnColor: "#E87518",
  badgeBg: "#FFF4EB",
  badgeText: "#E87518",
  buttonPrimaryBg: "#E87518",
  buttonPrimaryText: "#FFFFFF",
  bottomNavActive: "#E87518",
  bottomNavActiveBg: "#FFF4EB",
  bottomNavBadgeBg: "#E87518",
  bannerGradient: ["#D96B12", "#E87518"],
  pillBg: "#FFF4EB",
  starColor: "#F59E0B",
};

export const THEMES_BY_SERVICE: Record<Service, ServiceTheme> = {
  food: FOOD_THEME,
  rides: RIDES_THEME,
  grocery: GROCERY_THEME,
  courier: COURIER_THEME,
};

/**
 * Returns the theme tokens for the specified service,
 * or dynamically resolves from AppState if omitted.
 */
export function getServiceTheme(service: Service = "food"): ServiceTheme {
  return THEMES_BY_SERVICE[service] || FOOD_THEME;
}

/**
 * React Hook for functional components:
 * Resolves the theme reactive to state.service.
 * Pass `overrideService` to explicitly force a specific module's styling (e.g. food details screen).
 */
export function useServiceTheme(overrideService?: Service): ServiceTheme {
  const { state } = useApp();
  const activeService = overrideService || state.service || "food";
  return getServiceTheme(activeService);
}
