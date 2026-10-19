import React from "react"
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native"
import { colors } from "../../theme/colors"
import { typography } from "../../theme/typography"
import { radius } from "../../theme/radius"
import { AppLogo } from "../common/AppLogo"
import { AppIcon } from "../common/AppIcon"
import { ToggleSwitch } from "../common/ToggleSwitch"
import { useAppNavigation } from "../../navigation/NavigationContext"
import { useVendor } from "../../context/VendorContext"
import { useOrders } from "../../context/OrderContext"

export const DesktopSidebar = ({
  isCollapsed = false,
  isDrawer = false,
  onClose = null,
}) => {
  const { currentScreen, navigate } = useAppNavigation()
  const { vendorType, setVendorType, activeStore, isOnline, setIsOnline } =
    useVendor()
  const { orders } = useOrders()

  const isGrocery = vendorType === "grocery"
  const newOrdersCount = orders.filter((o) => o.status === "new").length

  const handleNavigate = (screenId) => {
    navigate(screenId)
    if (isDrawer && onClose) {
      onClose()
    }
  }

  const handleModeChange = (mode) => {
    setVendorType(mode)
    navigate(mode === "grocery" ? "grocery-home" : "restaurant-home")
    if (isDrawer && onClose) {
      onClose()
    }
  }

  const navSections = [
    {
      title: "CORE",
      items: [
        {
          id: isGrocery ? "grocery-home" : "restaurant-home",
          label: "Dashboard",
          icon: "home",
        },
      ],
    },
    {
      title: "OPERATIONS",
      items: [
        {
          id: "incoming",
          label: "Live Orders",
          icon: "orders",
          badge: newOrdersCount > 0 ? String(newOrdersCount) : null,
          badgeColor: colors.terracotta,
        },
        {
          id: "active",
          label: "Active Orders",
          icon: "clock",
        },
        {
          id: isGrocery ? "catalog" : "menu",
          label: isGrocery ? "Product Catalog" : "Menu Management",
          icon: "catalog",
        },
        ...(isGrocery
          ? [
              {
                id: "picking",
                label: "Order Picking",
                icon: "check",
              },
              {
                id: "inventory",
                label: "Inventory & Stock",
                icon: "box",
              },
            ]
          : []),
      ],
    },
    {
      title: "MARKETING & GROWTH",
      items: [
        {
          id: "offers",
          label: "Offers & Coupons",
          icon: "tag",
        },
        {
          id: "reviews",
          label: "Reviews & Ratings",
          icon: "star",
        },
        {
          id: "analytics",
          label: "Sales Analytics",
          icon: "chart",
        },
      ],
    },
    {
      title: "SETTINGS & FINANCE",
      items: [
        {
          id: "restaurant-payout",
          label: "Payouts & Banking",
          icon: "wallet",
        },
        {
          id: "hours",
          label: "Operating Hours",
          icon: "clock",
        },
        {
          id: "delivery",
          label: "Delivery Radius",
          icon: "map",
        },
        {
          id: "account",
          label: "Store Profile",
          icon: "user",
        },
        {
          id: "support",
          label: "Support Center",
          icon: "help",
        },
      ],
    },
    {
      title: "REGISTRATION & KYC",
      items: [
        {
          id: "profile-kyc",
          label: "KYC & Legal Docs",
          icon: "check",
          badge: "Verified",
          badgeColor: "#10B981",
        },
        {
          id: "onboard-outlet",
          label: "Onboard New Outlet",
          icon: "plus",
        },
      ],
    },
  ]

  return (
    <View
      style={[
        styles.sidebar,
        isCollapsed && styles.sidebarCollapsed,
        isDrawer && styles.sidebarDrawer,
      ]}
    >
      {/* Brand & Outlet Switcher */}
      <View
        style={[
          styles.sidebarHeader,
          isCollapsed && styles.sidebarHeaderCollapsed,
        ]}
      >
        <View
          style={[styles.brandRow, isCollapsed && { justifyContent: "center" }]}
        >
          <View style={styles.brandWithBadge}>
            <AppLogo compact={isCollapsed} maxWidth={isCollapsed ? 48 : 136} />
            {!isCollapsed && (
              <View style={styles.portalBadge}>
                <Text style={styles.portalBadgeText}>PORTAL</Text>
              </View>
            )}
          </View>
          {isDrawer && onClose && (
            <TouchableOpacity
              style={styles.drawerCloseBtn}
              onPress={onClose}
              accessibilityLabel="Close navigation drawer"
              accessibilityRole="button"
            >
              <AppIcon name="close" size={18} color={colors.black} />
            </TouchableOpacity>
          )}
        </View>

        {/* Active Store selector */}
        {!isCollapsed ? (
          <>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.storeCard}
              onPress={() => handleNavigate("stores")}
            >
              <View style={styles.storeIconBox}>
                <AppIcon name="store" size={18} color={colors.terracotta} />
              </View>
              <View style={styles.storeDetails}>
                <Text style={styles.storeName} numberOfLines={1}>
                  {activeStore?.name || "Select Outlet"}
                </Text>
                <Text style={styles.storeLocality} numberOfLines={1}>
                  {activeStore?.locality || "Store Location"}
                </Text>
              </View>
              <AppIcon name="chevron" size={16} color={colors.charcoal} />
            </TouchableOpacity>

            {/* Vendor Mode Selector (Restaurant vs Grocery) */}
            <View style={styles.modeSelector}>
              <TouchableOpacity
                style={[styles.modeBtn, !isGrocery && styles.modeBtnActive]}
                onPress={() => handleModeChange("restaurant")}
              >
                <Text
                  style={[styles.modeText, !isGrocery && styles.modeTextActive]}
                >
                  Restaurant
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeBtn, isGrocery && styles.modeBtnActive]}
                onPress={() => handleModeChange("grocery")}
              >
                <Text
                  style={[styles.modeText, isGrocery && styles.modeTextActive]}
                >
                  Grocery
                </Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <TouchableOpacity
            style={styles.collapsedStoreBtn}
            onPress={() => handleNavigate("stores")}
            accessibilityLabel={activeStore?.name || "Store Outlet"}
          >
            <AppIcon name="store" size={20} color={colors.terracotta} />
          </TouchableOpacity>
        )}
      </View>

      {/* Navigation Sections */}
      <ScrollView
        style={styles.navScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={isCollapsed && { alignItems: "center" }}
      >
        {navSections.map((section) => (
          <View
            key={section.title}
            style={[
              styles.navSection,
              isCollapsed && styles.navSectionCollapsed,
            ]}
          >
            {!isCollapsed && (
              <Text style={styles.sectionTitle}>{section.title}</Text>
            )}
            {section.items.map((item) => {
              const isActive =
                currentScreen === item.id ||
                (item.id === "active" &&
                  ["active", "order-detail"].includes(currentScreen)) ||
                (item.id === "menu" &&
                  ["menu", "menu-item"].includes(currentScreen)) ||
                (item.id === "catalog" &&
                  ["catalog", "product", "import"].includes(currentScreen)) ||
                (item.id === "profile-kyc" &&
                  ["profile-kyc", "kyc"].includes(currentScreen)) ||
                (item.id === "onboard-outlet" &&
                  ["onboard-outlet", "role"].includes(currentScreen)) ||
                (item.id === "account" &&
                  [
                    "account",
                    "profile-business",
                    "profile-photos",
                    "profile-location",
                  ].includes(currentScreen))

              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.7}
                  style={[
                    styles.navItem,
                    isActive && styles.navItemActive,
                    isCollapsed && styles.navItemCollapsed,
                  ]}
                  onPress={() => handleNavigate(item.id)}
                  accessibilityLabel={item.label}
                >
                  <AppIcon
                    name={item.icon}
                    size={20}
                    color={isActive ? colors.terracotta : colors.charcoal}
                    strokeWidth={isActive ? 2.2 : 1.8}
                  />
                  {!isCollapsed && (
                    <>
                      <Text
                        style={[
                          styles.navLabel,
                          isActive && styles.navLabelActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                      {item.badge && (
                        <View
                          style={[
                            styles.itemBadge,
                            {
                              backgroundColor:
                                item.badgeColor || colors.terracotta,
                            },
                          ]}
                        >
                          <Text style={styles.itemBadgeText}>{item.badge}</Text>
                        </View>
                      )}
                    </>
                  )}
                  {isCollapsed && item.badge && (
                    <View style={styles.collapsedBadgeDot} />
                  )}
                </TouchableOpacity>
              )
            })}
          </View>
        ))}
      </ScrollView>

      {/* Bottom Online Toggle & Status */}
      <View
        style={[
          styles.sidebarFooter,
          isCollapsed && styles.sidebarFooterCollapsed,
        ]}
      >
        {!isCollapsed ? (
          <View style={styles.onlineStatusRow}>
            <View style={styles.statusInfo}>
              <View style={styles.liveIndicatorRow}>
                <View
                  style={[
                    styles.liveDot,
                    isOnline ? styles.liveDotOnline : styles.liveDotOffline,
                  ]}
                />
                <Text style={styles.liveStatusText}>
                  {isOnline ? "Online" : "Offline"}
                </Text>
              </View>
              <Text style={styles.liveStatusSub}>
                {isOnline ? "Accepting Orders" : "Store Paused"}
              </Text>
            </View>
            <ToggleSwitch on={isOnline} setOn={setIsOnline} />
          </View>
        ) : (
          <TouchableOpacity
            style={styles.collapsedToggleBtn}
            onPress={() => setIsOnline(!isOnline)}
            accessibilityLabel={isOnline ? "Store Online" : "Store Offline"}
          >
            <View
              style={[
                styles.liveDot,
                isOnline ? styles.liveDotOnline : styles.liveDotOffline,
              ]}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  sidebar: {
    width: 260,
    height: "100%",
    backgroundColor: colors.white,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    display: "flex",
    flexDirection: "column",
    zIndex: 10,
  },
  sidebarCollapsed: {
    width: 72,
  },
  sidebarDrawer: {
    width: 290,
    maxWidth: "85%",
    height: "100%",
    shadowColor: "#000000",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 20,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  sidebarHeader: {
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sidebarHeaderCollapsed: {
    padding: 12,
    alignItems: "center",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  brandWithBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  drawerCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.surfaceSubtle,
    justifyContent: "center",
    alignItems: "center",
  },
  portalBadge: {
    backgroundColor: "rgba(163, 94, 71, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  portalBadgeText: {
    fontSize: 9,
    fontFamily: typography.fonts.headingBold,
    fontWeight: "700",
    color: colors.terracotta,
    letterSpacing: 1,
  },
  storeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
    padding: 10,
    borderRadius: radius.card,
    marginBottom: 12,
  },
  collapsedStoreBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.card,
    backgroundColor: colors.surfaceSubtle,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  storeIconBox: {
    width: 32,
    height: 32,
    borderRadius: radius.button,
    backgroundColor: "rgba(163, 94, 71, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  storeDetails: {
    flex: 1,
  },
  storeName: {
    fontSize: 12.5,
    fontFamily: typography.fonts.heading,
    fontWeight: "600",
    color: colors.black,
  },
  storeLocality: {
    fontSize: 10.5,
    fontFamily: typography.fonts.body,
    color: colors.charcoal,
    marginTop: 1,
  },
  modeSelector: {
    flexDirection: "row",
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 8,
    padding: 3,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: "center",
    borderRadius: 6,
  },
  modeBtnActive: {
    backgroundColor: colors.white,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  modeText: {
    fontSize: 11,
    fontFamily: typography.fonts.bodyMedium,
    color: colors.charcoal,
    fontWeight: "500",
  },
  modeTextActive: {
    color: colors.terracotta,
    fontWeight: "700",
  },
  navScroll: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  navSection: {
    marginBottom: 20,
  },
  navSectionCollapsed: {
    marginBottom: 14,
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 9.5,
    fontFamily: typography.fonts.headingBold,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: colors.warmGrey,
    paddingHorizontal: 10,
    marginBottom: 6,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: radius.card,
    marginBottom: 2,
    gap: 12,
  },
  navItemCollapsed: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 0,
    position: "relative",
  },
  navItemActive: {
    backgroundColor: "rgba(163, 94, 71, 0.09)",
  },
  navLabel: {
    flex: 1,
    fontSize: 12.5,
    fontFamily: typography.fonts.bodyMedium,
    color: colors.charcoal,
  },
  navLabelActive: {
    color: colors.terracotta,
    fontFamily: typography.fonts.heading,
    fontWeight: "600",
  },
  itemBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  itemBadgeText: {
    color: colors.white,
    fontSize: 9.5,
    fontFamily: typography.fonts.headingBold,
    fontWeight: "700",
  },
  collapsedBadgeDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.terracotta,
  },
  sidebarFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  sidebarFooterCollapsed: {
    padding: 12,
    alignItems: "center",
  },
  onlineStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceSubtle,
    padding: 12,
    borderRadius: radius.card,
  },
  collapsedToggleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceSubtle,
    justifyContent: "center",
    alignItems: "center",
  },
  statusInfo: {
    flex: 1,
  },
  liveIndicatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveDotOnline: {
    backgroundColor: "#10B981",
  },
  liveDotOffline: {
    backgroundColor: colors.warmGrey,
  },
  liveStatusText: {
    fontSize: 12,
    fontFamily: typography.fonts.heading,
    fontWeight: "600",
    color: colors.black,
  },
  liveStatusSub: {
    fontSize: 10,
    fontFamily: typography.fonts.body,
    color: colors.charcoal,
  },
})
