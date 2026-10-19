import React from "react"
import {
  View,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { colors } from "../../theme/colors"
import { useResponsive } from "../../theme/useResponsive"
import { useAppNavigation } from "../../navigation/NavigationContext"
import { DesktopSidebar } from "./DesktopSidebar"
import { DesktopTopNav } from "./DesktopTopNav"
import { DesktopOnboardingShell } from "./DesktopOnboardingShell"
import { BottomTabBar } from "../navigation/BottomTabBar"

const ONBOARDING_SCREENS = [
  "splash",
  "role",
  "phone",
  "business",
  "tax",
  "address",
  "kyc",
  "photos",
  "terms",
  "pending",
  "approved",
]

const FULLSCREEN_MODAL_SCREENS = [
  "order-detail",
  "menu-item",
  "product",
  "import",
  "picking",
  "bank",
  "stores",
  "states",
]

export const AppShell = ({ children }) => {
  const { isMobile, isTablet, isDesktop } = useResponsive()
  const { currentScreen, isDrawerOpen, closeDrawer } = useAppNavigation()

  const isOnboarding = ONBOARDING_SCREENS.includes(currentScreen)
  const hideMobileBottomBar =
    isOnboarding || FULLSCREEN_MODAL_SCREENS.includes(currentScreen)

  const renderDrawer = () => {
    if (!isDrawerOpen) return null
    return (
      <View style={styles.drawerOverlay}>
        <TouchableOpacity
          style={styles.drawerBackdrop}
          activeOpacity={1}
          onPress={closeDrawer}
          accessibilityLabel="Close navigation drawer"
          accessibilityRole="button"
        />
        <View style={styles.drawerSheet}>
          <DesktopSidebar isDrawer onClose={closeDrawer} />
        </View>
      </View>
    )
  }

  // 1. Splash Screen Mode (Welcome Entry)
  if (currentScreen === "splash") {
    return (
      <SafeAreaView style={styles.mobileSafeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
        <View style={styles.splashWrapper}>{children}</View>
      </SafeAreaView>
    )
  }

  // 2. Onboarding Steps Mode (role, phone, business, tax, address, kyc, photos, terms, pending, approved)
  if (isOnboarding) {
    if (isDesktop || isTablet) {
      return <DesktopOnboardingShell>{children}</DesktopOnboardingShell>
    }

    // Mobile Onboarding
    return (
      <SafeAreaView style={styles.mobileSafeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
        <View style={styles.mobileContent}>{children}</View>
      </SafeAreaView>
    )
  }

  // 3. Desktop Mode (Laptop & Desktop Displays >= 1024px)
  if (isDesktop) {
    return (
      <View style={styles.desktopRoot}>
        <DesktopSidebar />
        <View style={styles.desktopMain}>
          <DesktopTopNav />
          <View style={styles.desktopContentArea}>{children}</View>
        </View>
      </View>
    )
  }

  // 4. Tablet Mode (768px - 1023px)
  if (isTablet) {
    return (
      <View style={styles.tabletRoot}>
        <View style={styles.tabletMain}>
          <DesktopTopNav />
          <View style={styles.tabletContentArea}>{children}</View>
        </View>
        {renderDrawer()}
      </View>
    )
  }

  // 5. Mobile Mode (< 768px)
  return (
    <SafeAreaView style={styles.mobileSafeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <View style={styles.mobileContent}>{children}</View>
      {!hideMobileBottomBar && <BottomTabBar />}
      {renderDrawer()}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  // Desktop
  desktopRoot: {
    flex: 1,
    flexDirection: "row",
    height: "100%",
    width: "100%",
    backgroundColor: colors.background,
  },
  desktopMain: {
    flex: 1,
    height: "100%",
    display: "flex",
    flexDirection: "column",
    backgroundColor: colors.background,
  },
  desktopContentArea: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: colors.background,
  },

  // Tablet
  tabletRoot: {
    flex: 1,
    flexDirection: "column",
    height: "100%",
    width: "100%",
    backgroundColor: colors.background,
  },
  tabletMain: {
    flex: 1,
    height: "100%",
    backgroundColor: colors.background,
  },
  tabletContentArea: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: colors.background,
  },

  // Mobile
  mobileSafeArea: {
    flex: 1,
    backgroundColor: colors.white,
    width: "100%",
    height: "100%",
  },
  mobileContent: {
    flex: 1,
    width: "100%",
    backgroundColor: colors.background,
  },
  splashWrapper: {
    flex: 1,
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.white,
  },

  // Drawer (Mobile & Tablet)
  drawerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    flexDirection: "row",
  },
  drawerBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  drawerSheet: {
    height: "100%",
    width: 290,
    maxWidth: "85%",
    backgroundColor: colors.white,
    zIndex: 10000,
  },
})
