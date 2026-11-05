/**
 * Centralized Spacing and Layout Tokens for the Unified Service Navigation Header.
 * Strict Rule: Every module (Food, Rides, Grocery, Courier) MUST use these exact metrics.
 */

export const HEADER_TOKENS = {
  // Horizontal margin from screen edge
  horizontalMargin: 16,

  // Location & actions row metrics
  locationRowHeight: 44,
  locationIconSize: 34,
  actionButtonSize: 38,
  actionButtonRadius: 19,

  // Spacing between location row and service tabs
  locationToTabsGap: 12,

  // Service tabs metrics
  tabsHeight: 50,
  tabsBorderRadius: 16,
  tabsPadding: 5,
  tabsItemHeight: 40,
  tabsItemRadius: 12,
  tabsShadowRadius: 12,

  // Spacing between service tabs and module content
  tabsToContentGap: 16,
} as const;
