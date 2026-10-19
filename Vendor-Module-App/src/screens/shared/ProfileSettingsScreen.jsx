import React, { useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from "react-native"
import { colors } from "../../theme/colors"
import { typography } from "../../theme/typography"
import { radius } from "../../theme/radius"
import { AppHeader } from "../../components/common/AppHeader"
import { AppButton } from "../../components/common/AppButton"
import { AppCard } from "../../components/common/AppCard"
import { AppIcon } from "../../components/common/AppIcon"
import { useResponsive } from "../../theme/useResponsive"
import { useAppNavigation } from "../../navigation/NavigationContext"
import { useVendor } from "../../context/VendorContext"
import { useOnboarding } from "../../context/OnboardingContext"
import { useOrders } from "../../context/OrderContext"
import { supabase } from "../../lib/supabase.js"
import { authApi } from "../../services/api/authApi.js"

export const ProfileSettingsScreen = () => {
  const { navigate, goBack } = useAppNavigation()
  const { isMobile } = useResponsive()
  const {
    activeStore,
    vendor,
    vendorId: contextVendorId,
    isLoadingStores,
    resetVendorState,
  } = useVendor()
  const {
    businessDetails,
    verificationStatus,
    vendorId: onboardingVendorId,
    isLoadingSavedState,
    resetOnboarding,
  } = useOnboarding()
  const { resetOrderState } = useOrders()
  const [showSignOutModal, setShowSignOutModal] = useState(false)

  const ownerName =
    businessDetails?.ownerName || vendor?.owner_name || "Merchant Partner"
  const businessName =
    businessDetails?.businessName ||
    vendor?.business_name ||
    activeStore?.name ||
    "Business Outlet"
  const resolvedVendorId =
    activeStore?.vendorId || contextVendorId || onboardingVendorId || vendor?.id
  const merchantIdDisplay = resolvedVendorId
    ? `Owner • ID: ${resolvedVendorId.slice(0, 8).toUpperCase()}`
    : "Owner • Setup Pending"
  const storeDisplay = activeStore?.name
    ? `${activeStore.name}${
        activeStore.locality ? ` (${activeStore.locality})` : ""
      }`
    : businessName

  const businessSections = [
    {
      group: "STORE PROFILE & KYC",
      items: [
        {
          icon: "store",
          title: "Business details",
          subtitle: `${businessName} · ${ownerName}`,
          target: "profile-business",
        },
        {
          icon: "check",
          title: "KYC & regulatory documents",
          subtitle: "FSSAI license, GSTIN, PAN cards",
          target: "profile-kyc",
          badge:
            verificationStatus === "verified" ? "Verified" : "Waiting Approval",
        },
        {
          icon: "camera",
          title: "Store photos & logo",
          subtitle: "Storefront, kitchen, branding logo",
          target: "profile-photos",
        },
        {
          icon: "map",
          title: "Location & service radius",
          subtitle: "Store address & delivery radius coverage",
          target: "profile-location",
        },
        {
          icon: "clock",
          title: "Application verification status",
          subtitle:
            verificationStatus === "verified"
              ? "Verified & Active"
              : "Waiting for Approval",
          target: "pending",
          badge: verificationStatus === "verified" ? "Active" : "Pending",
        },
      ],
    },
    {
      group: "PAYOUTS & OPERATIONS",
      items: [
        {
          icon: "wallet",
          title: "Bank account & settlements",
          subtitle: "View automated payout settlements (Read-only)",
          target: "bank",
        },
        {
          icon: "store",
          title: "Manage outlets & branches",
          subtitle: "Switch or manage multiple store profiles",
          target: "stores",
        },
        {
          icon: "bell",
          title: "Notifications & sound alerts",
          subtitle: "Pause/resume alerts, volume & sound",
          target: "notifications",
        },
        {
          icon: "clock",
          title: "Operating hours & holiday schedule",
          subtitle: "Daily timings & scheduled closures",
          target: "hours",
        },
      ],
    },
    {
      group: "SUPPORT & OUTLETS",
      items: [
        {
          icon: "help",
          title: "Help & partner support",
          subtitle: "Raise an issue ticket, customer care hotline",
          target: "support",
        },
        {
          icon: "plus",
          title: "Register new store profile",
          subtitle: "Onboard a new restaurant or grocery outlet",
          target: "role",
        },
      ],
    },
  ]

  const handleConfirmSignOut = async () => {
    setShowSignOutModal(false)
    try {
      await authApi.signOut();
    } catch (err) {
      console.warn("[SignOut notice]", err)
    }
    if (resetVendorState) {
      resetVendorState()
    }
    if (resetOnboarding) {
      resetOnboarding()
    }
    if (resetOrderState) {
      resetOrderState()
    }
    navigate("signin")
  }

  const avatarText =
    ownerName
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "MP"

  return (
    <View style={styles.container}>
      {isMobile && <AppHeader title="Account & Settings" onBack={goBack} />}
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          !isMobile && styles.scrollContentDesktop,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Hero */}
        <View
          style={[styles.profileHero, !isMobile && styles.profileHeroDesktop]}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{avatarText}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.userName}>{ownerName}</Text>
            <Text style={styles.userRole}>{merchantIdDisplay}</Text>
            <Text style={styles.storeTag}>{storeDisplay}</Text>
          </View>
          {/* Item 15: Replace Edit Profile with Switch Profile */}
          <TouchableOpacity
            style={styles.switchProfileBtn}
            onPress={() => navigate("stores")}
            activeOpacity={0.8}
          >
            <AppIcon name="store" size={14} color={colors.white} />
            <Text style={styles.switchProfileText}>Switch Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Menu Groups */}
        <View style={styles.groupsContainer}>
          {businessSections.map((section) => (
            <View key={section.group} style={styles.groupBlock}>
              <Text style={styles.groupHeading}>{section.group}</Text>
              <AppCard style={styles.menuCard}>
                {section.items.map((item, idx) => (
                  <TouchableOpacity
                    key={item.title}
                    activeOpacity={0.7}
                    onPress={() => navigate(item.target)}
                    style={[
                      styles.menuRow,
                      idx === section.items.length - 1 && styles.lastMenuRow,
                    ]}
                  >
                    <View style={styles.itemIconBox}>
                      <AppIcon
                        name={item.icon}
                        size={19}
                        color={colors.charcoal}
                      />
                    </View>
                    <View style={styles.menuInfo}>
                      <Text style={styles.menuTitle}>{item.title}</Text>
                      <Text style={styles.menuSub}>{item.subtitle}</Text>
                    </View>
                    {item.badge && (
                      <View
                        style={[
                          styles.badge,
                          item.badge === "Verified" || item.badge === "Active"
                            ? styles.badgeVerified
                            : styles.badgeWarning,
                        ]}
                      >
                        <Text
                          style={[
                            styles.badgeText,
                            item.badge === "Verified" || item.badge === "Active"
                              ? styles.badgeTextVerified
                              : styles.badgeTextWarning,
                          ]}
                        >
                          {item.badge}
                        </Text>
                      </View>
                    )}
                    <AppIcon name="chevron" size={17} color={colors.charcoal} />
                  </TouchableOpacity>
                ))}
              </AppCard>
            </View>
          ))}
        </View>

        {/* Item 24: Sign Out Button */}
        <View style={styles.signOutBox}>
          <AppButton
            secondary
            onPress={() => setShowSignOutModal(true)}
            style={styles.signOutBtn}
          >
            Sign Out
          </AppButton>
          <Text style={styles.versionText}>
            RoadRider Merchant Operations Platform • v2.4.0 • Build 2026.09
          </Text>
        </View>
      </ScrollView>

      {/* Item 24: Sign Out Confirmation Modal */}
      {showSignOutModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconCircle}>
              <AppIcon name="user" size={24} color={colors.terracotta} />
            </View>
            <Text style={styles.modalTitle}>Sign Out</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to sign out? You will need to log in again
              to manage your store.
            </Text>
            <View style={styles.modalActions}>
              <AppButton
                secondary
                onPress={() => setShowSignOutModal(false)}
                style={styles.modalBtn}
              >
                Cancel
              </AppButton>
              <AppButton onPress={handleConfirmSignOut} style={styles.modalBtn}>
                Sign Out
              </AppButton>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 36,
  },
  scrollContentDesktop: {
    padding: 32,
    maxWidth: 960,
    width: "100%",
    alignSelf: "center",
  },
  profileHero: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 16,
    backgroundColor: colors.white,
    padding: 20,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: "#E8E5E2",
    marginBottom: 24,
  },
  profileHeroDesktop: {
    padding: 24,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: colors.black,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: colors.white,
    fontFamily: typography.fonts.headingBold,
    fontWeight: "700",
    fontSize: 18,
  },
  profileInfo: {
    flex: 1,
    minWidth: 140,
  },
  userName: {
    fontSize: 17,
    fontWeight: "700",
    fontFamily: typography.fonts.headingBold,
    color: colors.black,
    marginBottom: 2,
  },
  userRole: {
    fontSize: 12,
    fontFamily: typography.fonts.body,
    color: colors.charcoal,
  },
  storeTag: {
    fontSize: 11,
    fontFamily: typography.fonts.heading,
    fontWeight: "600",
    color: colors.terracotta,
    marginTop: 3,
  },
  switchProfileBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.button,
    backgroundColor: colors.black,
  },
  switchProfileText: {
    fontSize: 11.5,
    fontFamily: typography.fonts.heading,
    fontWeight: "600",
    color: colors.white,
  },
  groupsContainer: {
    gap: 24,
  },
  groupBlock: {},
  groupHeading: {
    fontSize: 10,
    fontFamily: typography.fonts.headingBold,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: colors.warmGrey,
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  menuCard: {
    padding: 0,
    borderRadius: radius.card,
    overflow: "hidden",
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceSubtle,
    gap: 12,
  },
  lastMenuRow: {
    borderBottomWidth: 0,
  },
  itemIconBox: {
    width: 34,
    height: 34,
    borderRadius: radius.button,
    backgroundColor: colors.surfaceSubtle,
    justifyContent: "center",
    alignItems: "center",
  },
  menuInfo: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 13,
    fontFamily: typography.fonts.heading,
    fontWeight: "600",
    color: colors.black,
  },
  menuSub: {
    fontSize: 11,
    fontFamily: typography.fonts.body,
    color: colors.charcoal,
    marginTop: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeVerified: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
  },
  badgeWarning: {
    backgroundColor: "rgba(163, 94, 71, 0.12)",
  },
  badgeText: {
    fontSize: 10,
    fontFamily: typography.fonts.headingBold,
    fontWeight: "700",
  },
  badgeTextVerified: {
    color: "#065F46",
  },
  badgeTextWarning: {
    color: colors.terracotta,
  },
  signOutBox: {
    marginTop: 28,
    alignItems: "center",
    gap: 14,
  },
  signOutBtn: {
    width: "100%",
    maxWidth: 340,
  },
  versionText: {
    fontSize: 10.5,
    fontFamily: typography.fonts.body,
    color: colors.warmGrey,
    textAlign: "center",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    padding: 24,
    maxWidth: 400,
    width: "100%",
    alignItems: "center",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
  },
  modalIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(163, 94, 71, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: typography.fonts.headingBold,
    color: colors.black,
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 13,
    fontFamily: typography.fonts.body,
    color: colors.charcoal,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    flexWrap: "wrap",
  },
  modalBtn: {
    flex: 1,
    minWidth: 110,
  },
})
