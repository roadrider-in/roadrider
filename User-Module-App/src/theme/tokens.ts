/**
 * RoadRider design system tokens (exact values from src/index.css)
 */

export const colors = {
  accent: "#c84b31",
  accentSoft: "#f8e7e2",
  ink: "#171514",
  muted: "#77716e",
  surface: "#ffffff",
  canvas: "#f5f3f0",
  line: "#ebe7e2",
  border: "#e5e0d8",
  star: "#f59e0b",
  success: "#22c55e",
  error: "#dc2626",
  warning: "#f59e0b",
  backdrop: "rgba(0, 0, 0, 0.5)",
  darkSurface: "#161c24",
  darkSurface2: "#1f2733",

  // Brand identity design tokens (extracted from login screen reference)
  brand: {
    terracotta: "#c84b31",        // Primary button and brand accent
    terracottaRider: "#d45b37",   // Secondary terracotta for illustration elements
    creamBg: "#fffdfa",           // Main warm off-white/cream background
    peachBg: "#faeadd",           // Soft peach for illustration container
    sageGreen: "#dce7d5",         // Muted sage green hill decoration
    beigeMuted: "#efd7c3",        // Muted beige hill decoration
    roadGrey: "#c7bcb3",          // Road divider element
    charcoal: "#171514",          // Primary heading and dark text
    charcoalBorder: "#25201d",    // Illustration phone frame
    lightGreyText: "#77716e",     // Supporting subtitle text
    captionGrey: "#9a928c",       // Input labels and taglines
    legalGrey: "#9a938e",         // Legal disclaimer text
    legalBold: "#5d5651",         // Legal strong text
    inputBorder: "#ddd6d0",       // Form input borders
    inputBorderActive: "#c84b31", // Form input focused border
    inputBg: "#ffffff",           // Input background
    backBtnBg: "#f4efeb",         // Rounded back navigation button background
    settingsBlue: "#3983f7",      // Blue accent for settings/auxiliary actions
  },

  // Vertical-specific theme palettes
  services: {
    food: {
      accent: "#c84b31",
      accentSoft: "#f7e6e1",
      badge: "#fef3ee",
    },
    rides: {
      accent: "#3983f7",
      accentSoft: "#e7f0fe",
      badge: "#eff5ff",
    },
    grocery: {
      accent: "#318454",
      accentSoft: "#e5f3e8",
      badge: "#edf7f0",
    },
    courier: {
      accent: "#ef801f",
      accentSoft: "#fff0de",
      badge: "#fff6eb",
    },
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radii = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  full: 9999,
} as const;

export const typography = {
  fontFamily: undefined, // Uses native system font (San Francisco / Roboto)
} as const;
