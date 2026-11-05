import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Animated,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import UtilityHeader from "../../components/UtilityHeader";
import Icon from "../../components/Icon";
import Button from "../../components/Button";
import { serviceMeta, type Service } from "../../data/demo";
import { initials, prettyPhone } from "../../lib/format";
import { rupees } from "../../lib/pricing";
import { useNav } from "../../navigation/Navigation";
import { useApp } from "../../state/AppState";
import { colors, radii } from "../../theme/tokens";
import { useI18n, SUPPORTED_LANGUAGES } from "../../lib/i18n";

/**
 * Guest Account View displayed when user is not authenticated.
 * NO dummy profile data (No "Arjun Khanna", no "+91 98765 43210").
 * Prompts user to log in or create an account with attractive native animations.
 */
function GuestAccountView({
  onLogin,
  onBrowse,
}: {
  onLogin: () => void;
  onBrowse: () => void;
}) {
  const { t, language, setLanguage } = useI18n();
  const { setService } = useApp();
  const { push } = useNav();

  // Subtle floating illustration animation (recreating Figma Make motion style)
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -8,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale, {
          toValue: 1.05,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulseScale, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    floatLoop.start();
    pulseLoop.start();

    return () => {
      floatLoop.stop();
      pulseLoop.stop();
    };
  }, [floatAnim, pulseScale]);

  const benefits = [
    {
      icon: "car",
      title: t("benefit_live_tracking_title", "Live Real-Time Tracking"),
      desc: t("benefit_live_tracking_desc", "Watch your captain and delivery orders in real time"),
    },
    {
      icon: "pin",
      title: t("benefit_saved_places_title", "Saved Addresses"),
      desc: t("benefit_saved_places_desc", "Save Home, Office & favorite spots for instant delivery"),
    },
    {
      icon: "bag",
      title: t("benefit_reorder_title", "Order History & Easy Reordering"),
      desc: t("benefit_reorder_desc", "Access invoices and reorder your favorite meals in 1 tap"),
    },
    {
      icon: "shield",
      title: t("benefit_support_title", "24/7 Priority Support"),
      desc: t("benefit_support_desc", "Dedicated in-app live chat and immediate ticket resolution"),
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />
      <UtilityHeader
        title={t("nav_account", "Account")}
        subtitle={t("welcome_to_roadrider", "ROADRIDER ACCOUNT")}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Login-Required Card with Motion Art */}
        <View style={styles.guestHeroCard}>
          <Animated.View
            style={[
              styles.guestArtContainer,
              {
                transform: [{ translateY: floatAnim }, { scale: pulseScale }],
              },
            ]}
          >
            <View style={styles.guestArtGlow} />
            <View style={styles.guestArtBadge}>
              <Icon name="user" size={38} color={colors.accent} />
            </View>
          </Animated.View>

          <Text style={styles.guestTitle}>
            {t("your_roadrider_account", "Your RoadRider Account")}
          </Text>
          <Text style={styles.guestSubtitle}>
            {t(
              "account_login_sub",
              "Log in or create an account to access your profile, manage orders, save addresses and enjoy a personalized experience."
            )}
          </Text>

          {/* CTA Buttons */}
          <View style={styles.guestBtnGroup}>
            <Button onPress={onLogin} accentColor={colors.accent}>
              <View style={styles.btnContentRow}>
                <Text style={styles.primaryBtnText}>
                  {t("login_signup", "Login / Sign Up")}
                </Text>
                <Icon name="arrow" size={17} color="#ffffff" />
              </View>
            </Button>

            <TouchableOpacity
              style={styles.guestSecondaryBtn}
              onPress={onBrowse}
              activeOpacity={0.8}
            >
              <Icon name="home" size={15} color={colors.accent} />
              <Text style={styles.guestSecondaryBtnText}>
                {t("browse_as_guest", "Continue Browsing")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Benefits List */}
        <View style={styles.benefitsCard}>
          <Text style={styles.benefitsHeader}>
            {t("unlock_benefits_title", "WHAT YOU UNLOCK WITH AN ACCOUNT")}
          </Text>
          {benefits.map((b, i) => (
            <View
              key={i}
              style={[
                styles.benefitRow,
                i < benefits.length - 1 && styles.benefitRowBorder,
              ]}
            >
              <View style={styles.benefitIconBox}>
                <Icon name={b.icon} size={16} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.benefitTitle}>{b.title}</Text>
                <Text style={styles.benefitDesc}>{b.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Language Selection Card */}
        <View style={styles.languageCard}>
          <View style={styles.languageHeader}>
            <Icon name="tag" size={15} color={colors.accent} />
            <Text style={styles.languageTitle}>
              {t("lang_settings", "Language / भाषा")}
            </Text>
          </View>
          <View style={styles.languageRow}>
            {SUPPORTED_LANGUAGES.map((l) => {
              const isSelected = language === l.name;
              return (
                <TouchableOpacity
                  key={l.code}
                  style={[styles.langBtn, isSelected && styles.langBtnSelected]}
                  onPress={() => setLanguage(l.name)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.langBtnText,
                      isSelected && styles.langBtnTextSelected,
                    ]}
                  >
                    {l.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Explore Services */}
        <View style={styles.exploreServices}>
          <Text style={styles.exploreServicesP}>
            {t("explore_services_title", "Explore RoadRider Services")}
          </Text>
          <View style={styles.exploreButtonsRow}>
            {(["food", "rides", "grocery", "courier"] as Service[]).map((s) => (
              <TouchableOpacity
                key={s}
                style={styles.exploreBtn}
                onPress={() => {
                  setService(s);
                  onBrowse();
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.exploreBtnText}>
                  {serviceMeta[s].label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Help & Support Shortcut */}
        <TouchableOpacity
          style={styles.guestHelpRow}
          onPress={() => push({ name: "help" })}
          activeOpacity={0.8}
        >
          <Icon name="shield" size={16} color={colors.muted} />
          <Text style={styles.guestHelpText}>
            {t("help_support", "Help & Support")}
          </Text>
          <Icon name="arrow" size={14} color={colors.muted} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * Authenticated Account Screen with real profile data from Supabase.
 */
export default function Account() {
  const { push, switchTab, reset } = useNav();
  const { state, setService, signOut, showToast, openLocationSheet } = useApp();
  const { language, setLanguage, t } = useI18n();
  const [activityTab, setActivityTab] = useState<"active" | "past">("active");

  const isAuth = state.authenticated;

  // If user is guest / not authenticated, show proper Login-Required screen!
  if (!isAuth) {
    return (
      <GuestAccountView
        onLogin={() => push({ name: "phone" })}
        onBrowse={() => switchTab("home")}
      />
    );
  }

  // Real authenticated user details from Supabase (NO fake "Arjun Khanna")
  const userName = state.profile.name || "RoadRider Member";
  const userPhone = state.profile.phone
    ? `+91 ${prettyPhone(state.profile.phone)}`
    : "";
  const userInitials = state.profile.name
    ? initials(state.profile.name)
    : "RR";

  const activeOrders = state.orders.filter(
    (o) => o.status !== -1 && o.status < 4
  );
  const pastOrders = state.orders.filter(
    (o) => o.status === -1 || o.status >= 4
  );
  const currentPreview =
    activityTab === "active" ? activeOrders[0] : pastOrders[0];

  const handleSelectService = (s: Service) => {
    setService(s);
    switchTab("home");
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      showToast(t("signed_out_success", "Signed out successfully"));
    } catch {
      showToast(t("could_not_sign_out", "Could not sign out"));
    }
  };

  const menuItems = [
    {
      icon: "pin" as const,
      label: t("loc_saved_addresses", "Saved addresses"),
      onPress: () => openLocationSheet(),
    },
    {
      icon: "card" as const,
      label: "Payment methods",
      route: { name: "paymentMethods" as const },
    },
    {
      icon: "box" as const,
      label: t("nav_orders", "Your orders"),
      route: { name: "orders" as const },
    },
    {
      icon: "shield" as const,
      label: t("help_support", "Help & support"),
      route: { name: "help" as const },
    },
    {
      icon: "user" as const,
      label: "Profile & settings",
      route: { name: "profile" as const },
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />
      <UtilityHeader
        title={t("nav_account", "Account")}
        subtitle="PROFILE & SETTINGS"
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Real Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLargeText}>{userInitials}</Text>
          </View>
          <View style={styles.profileDetails}>
            <Text style={styles.userName}>{userName}</Text>
            {Boolean(userPhone) && (
              <Text style={styles.userPhone}>{userPhone}</Text>
            )}
          </View>
          <TouchableOpacity
            onPress={() => push({ name: "profile" })}
            activeOpacity={0.7}
          >
            <Text style={styles.editBtnText}>{t("edit", "Edit")}</Text>
          </TouchableOpacity>
        </View>

        {/* Language Selection Card */}
        <View style={styles.languageCard}>
          <View style={styles.languageHeader}>
            <Icon name="tag" size={15} color={colors.accent} />
            <Text style={styles.languageTitle}>
              {t("lang_settings", "Language / भाषा")}
            </Text>
          </View>
          <View style={styles.languageRow}>
            {SUPPORTED_LANGUAGES.map((l) => {
              const isSelected = language === l.name;
              return (
                <TouchableOpacity
                  key={l.code}
                  style={[styles.langBtn, isSelected && styles.langBtnSelected]}
                  onPress={() => setLanguage(l.name)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.langBtnText,
                      isSelected && styles.langBtnTextSelected,
                    ]}
                  >
                    {l.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Section Heading: Real Activity */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>
            {t("your_activity", "Your activity")}
          </Text>
          <TouchableOpacity onPress={() => push({ name: "orders" })}>
            <Text style={styles.seeAllText}>{t("loc_see_all", "See all")}</Text>
          </TouchableOpacity>
        </View>

        {/* Order Tabs */}
        <View style={styles.orderTabs}>
          <TouchableOpacity
            onPress={() => setActivityTab("active")}
            style={[
              styles.orderTabBtn,
              activityTab === "active" && styles.orderTabBtnSelected,
            ]}
          >
            <Text
              style={[
                styles.orderTabText,
                activityTab === "active" && styles.orderTabTextSelected,
              ]}
            >
              Active ({activeOrders.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActivityTab("past")}
            style={[
              styles.orderTabBtn,
              activityTab === "past" && styles.orderTabBtnSelected,
            ]}
          >
            <Text
              style={[
                styles.orderTabText,
                activityTab === "past" && styles.orderTabTextSelected,
              ]}
            >
              Past ({pastOrders.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Real Order Item or Empty State */}
        {currentPreview ? (
          <TouchableOpacity
            style={styles.activeOrder}
            activeOpacity={0.8}
            onPress={() =>
              push({ name: "status", orderId: currentPreview.id })
            }
          >
            <View style={styles.orderIcon}>
              <Icon
                name={
                  currentPreview.service === "rides"
                    ? "car"
                    : currentPreview.service === "grocery"
                    ? "bag"
                    : currentPreview.service === "courier"
                    ? "box"
                    : "food"
                }
                size={20}
                color={colors.accent}
              />
            </View>
            <View style={styles.activeOrderInfo}>
              <Text style={styles.activeOrderSmall}>
                {serviceMeta[currentPreview.service].label.toUpperCase()} ·{" "}
                {currentPreview.status === 2
                  ? "ON THE WAY"
                  : currentPreview.status < 2
                  ? "CONFIRMED"
                  : "COMPLETED"}
              </Text>
              <Text style={styles.activeOrderStrong} numberOfLines={1}>
                {currentPreview.title}
              </Text>
              <Text style={styles.activeOrderP}>
                {currentPreview.status < 3
                  ? "In progress · Tap to track"
                  : "Delivered safely"}
              </Text>
            </View>
            <Icon name="arrow" size={16} color={colors.ink} />
          </TouchableOpacity>
        ) : (
          <View style={styles.emptyOrderBox}>
            <View style={styles.emptyOrderIconCircle}>
              <Icon name="box" size={24} color={colors.muted} />
            </View>
            <Text style={styles.emptyOrderTitle}>
              {t("no_orders_yet", "No orders placed yet")}
            </Text>
            <Text style={styles.emptyOrderSubtitle}>
              {t(
                "no_orders_yet_sub",
                "Explore top restaurants near you to place your first order."
              )}
            </Text>
            <TouchableOpacity
              style={styles.emptyOrderBtn}
              onPress={() => switchTab("home")}
              activeOpacity={0.8}
            >
              <Text style={styles.emptyOrderBtnText}>
                {t("browse_food", "Browse restaurants")}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Menu List */}
        <View style={styles.menuList}>
          {menuItems.map((item, index) => {
            const isLast = index === menuItems.length - 1;
            return (
              <TouchableOpacity
                key={item.label}
                style={[styles.menuButton, !isLast && styles.menuButtonBorder]}
                onPress={() => {
                  if ((item as any).onPress) {
                    (item as any).onPress();
                  } else if ((item as any).route) {
                    push((item as any).route);
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={styles.menuIconSpan}>
                  <Icon name={item.icon} size={18} color={colors.muted} />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Icon name="arrow" size={18} color={colors.ink} />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Explore Services */}
        <View style={styles.exploreServices}>
          <Text style={styles.exploreServicesP}>
            {t("explore_services_title", "Explore RoadRider Services")}
          </Text>
          <View style={styles.exploreButtonsRow}>
            {(["food", "rides", "grocery", "courier"] as Service[]).map((s) => (
              <TouchableOpacity
                key={s}
                style={styles.exploreBtn}
                onPress={() => handleSelectService(s)}
                activeOpacity={0.7}
              >
                <Text style={styles.exploreBtnText}>
                  {serviceMeta[s].label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={handleSignOut}
          activeOpacity={0.8}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f5f2",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 90,
  },
  // Guest Account Styles
  guestHeroCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.line,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },
  guestArtContainer: {
    width: 88,
    height: 88,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    position: "relative",
  },
  guestArtGlow: {
    position: "absolute",
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(200, 75, 49, 0.12)",
  },
  guestArtBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.9)",
  },
  guestTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.ink,
    textAlign: "center",
    marginBottom: 8,
  },
  guestSubtitle: {
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 19,
    paddingHorizontal: 8,
    marginBottom: 20,
  },
  guestBtnGroup: {
    width: "100%",
    gap: 10,
  },
  btnContentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  guestSecondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: "#ffffff",
  },
  guestSecondaryBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.accent,
  },
  benefitsCard: {
    backgroundColor: "#ffffff",
    borderRadius: radii.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 16,
  },
  benefitsHeader: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.muted,
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  benefitRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#f4f2ef",
  },
  benefitIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  benefitTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
  },
  benefitDesc: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
    lineHeight: 15,
  },
  guestHelpRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
    paddingVertical: 16,
    marginTop: 10,
  },
  guestHelpText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
  },
  // Authenticated Profile Styles
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.line,
  },
  avatarLarge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLargeText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "800",
  },
  profileDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.ink,
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: "600",
  },
  editBtnText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "700",
  },
  languageCard: {
    backgroundColor: "#ffffff",
    borderRadius: radii.xl,
    padding: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: colors.line,
  },
  languageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  languageTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
  },
  languageRow: {
    flexDirection: "row",
    gap: 10,
  },
  langBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.canvas,
  },
  langBtnSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  langBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.ink,
  },
  langBtnTextSelected: {
    color: "#ffffff",
    fontWeight: "700",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.4,
    color: colors.ink,
  },
  seeAllText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.accent,
  },
  orderTabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    gap: 10,
  },
  orderTabBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    marginBottom: -1,
  },
  orderTabBtnSelected: {
    borderBottomColor: colors.accent,
  },
  orderTabText: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: "600",
  },
  orderTabTextSelected: {
    color: colors.accent,
    fontWeight: "800",
  },
  activeOrder: {
    backgroundColor: "#ffffff",
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.line,
    marginTop: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  orderIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.lg,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  activeOrderInfo: {
    flex: 1,
  },
  activeOrderSmall: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.accent,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  activeOrderStrong: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.ink,
  },
  activeOrderP: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  emptyOrderBox: {
    backgroundColor: "#ffffff",
    borderRadius: radii.xl,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  emptyOrderIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#f5f4f0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  emptyOrderTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.ink,
    marginBottom: 4,
  },
  emptyOrderSubtitle: {
    fontSize: 12,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 17,
    marginBottom: 14,
    paddingHorizontal: 12,
  },
  emptyOrderBtn: {
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radii.md,
  },
  emptyOrderBtnText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "700",
  },
  menuList: {
    backgroundColor: "#ffffff",
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.line,
    marginTop: 18,
    overflow: "hidden",
  },
  menuButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  menuButtonBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#f4f2ef",
  },
  menuIconSpan: {
    width: 24,
    alignItems: "center",
  },
  menuLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
    textAlign: "left",
  },
  exploreServices: {
    marginTop: 18,
  },
  exploreServicesP: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.muted,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  exploreButtonsRow: {
    flexDirection: "row",
    gap: 7,
  },
  exploreBtn: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 8,
    paddingHorizontal: 11,
  },
  exploreBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.ink,
  },
  signOutBtn: {
    marginTop: 24,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fef2f2",
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: "#fee2e2",
  },
  signOutText: {
    color: "#dc2626",
    fontSize: 13,
    fontWeight: "800",
  },
});
