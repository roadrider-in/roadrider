# RoadRider Vendor Mobile App

React + React Native vendor mobile application running in Figma Make.

## Development Server

A Vite development server is **already running** on `$PORT` (default 8443).

- Preview URL: Accessible through the preview panel
- Hot reload: Changes to source files are reflected immediately
- Toolchain: React 19 + React Native Web + Vite

## Project Architecture (React Native)

All application code is written using **pure React and React Native primitives** (`View`, `Text`, `StyleSheet`, `TouchableOpacity`, `ScrollView`, `TextInput`, `SafeAreaView`) with standard `.jsx` and `.js` files.

### Directory Structure

- `src/App.jsx` — Application root, context providers, and desktop 36-screen inspector
- `src/main.jsx` — Mounts `src/App.jsx` into the root DOM element
- `src/index.css` — Global typography fonts (`Poppins`, `DM Sans`) and base styling
- `src/navigation/`
  - `NavigationContext.jsx` — Stack navigation (`navigate`, `goBack`, screen history)
  - `RootNavigator.jsx` — Coordinates all 36 screens & safe area handling
- `src/components/`
  - `common/` — Reusable atoms: `AppButton`, `AppInput`, `AppHeader`, `AppCard`, `AppIcon`, `AppLogo`, `StatusBadge`, `ToggleSwitch`, `MetricCard`, `EmptyState`, `ErrorState`, `SvgAdapter`
  - `navigation/` — `BottomTabBar` (dynamic tab switching between Restaurant and Grocery)
- `src/context/`
  - `VendorContext.jsx` — Vendor type (`restaurant` / `grocery`), active store, online/offline status
  - `OnboardingContext.jsx` — Onboarding form state across all 11 steps
  - `OrderContext.jsx` — Real-time order lifecycle, prep time selectors, accept/reject/ready actions
- `src/screens/`
  - `onboarding/` — 11 screens: Splash, Choose Business, Mobile Verification, Business Details, Tax/Bank, Address & Radius, KYC, Store Photos, Terms, Pending, Approved
  - `restaurant/` — 12 screens: Home, Incoming Orders, Active Orders, Order Details, Menu Management, Add Menu Item, Offers, Operating Hours, Delivery Settings, Reviews, Payouts, Support
  - `grocery/` — 8 screens: Grocery Home, Product Catalog, Add Product, Bulk Import, Inventory, Low-Stock Alerts, Order Picking, Sales Analytics
  - `shared/` — 5 screens: Notifications, Profile & Settings, Bank Account, Store Switcher, Empty & Error States
- `src/data/` — Typed mock repositories: `mockOrders`, `mockMenu`, `mockProducts`, `mockAnalytics`, `mockNotifications`
- `src/services/api/` — API layer abstractions: `client`, `authApi`, `orderApi`, `catalogApi`, `payoutApi`
- `src/theme/` — Centralized design tokens: `colors.js`, `typography.js`, `spacing.js`, `radius.js`, `shadows.js`, `index.js`

## Design System Guidelines

- **Primary Colors:** Terracotta (`#A35E47`), Warm Grey (`#9C9A9A`), Charcoal (`#464646`), Black (`#000000`), White (`#FFFFFF`).
- **Typography:** `Poppins` for titles/numbers, `DM Sans` for body/labels.
- **Styling:** Use React Native `StyleSheet.create` with tokens from `src/theme/`. Do not hardcode ad-hoc colors.
- **Components:** Reuse existing components from `src/components/common/` rather than re-creating buttons, cards, or inputs.
