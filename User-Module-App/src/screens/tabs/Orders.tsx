import React, { useEffect, useState, useRef } from "react";
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
import GlobalLocationHeader from "../../components/GlobalLocationHeader";
import { serviceMeta, type Service } from "../../data/demo";
import { formatDay } from "../../lib/format";
import { rupees } from "../../lib/pricing";
import { useNav } from "../../navigation/Navigation";
import { useApp } from "../../state/AppState";
import { colors, radii } from "../../theme/tokens";
import { useI18n } from "../../lib/i18n";

/**
 * Guest Orders View shown when user is not authenticated.
 * Clean, animated screen prompting login without displaying fake orders.
 */
function GuestOrdersView({
  onLogin,
  onBrowse,
}: {
  onLogin: () => void;
  onBrowse: () => void;
}) {
  const { t } = useI18n();

  // Subtle floating motion for illustration
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
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
    loop.start();
    return () => loop.stop();
  }, [floatAnim]);

  const perks = [
    {
      icon: "car",
      title: t("order_perk_live_title", "Live GPS Delivery Tracking"),
      desc: t("order_perk_live_desc", "See your captain moving toward your doorstep in real time"),
    },
    {
      icon: "bag",
      title: t("order_perk_receipts_title", "Instant Invoices & History"),
      desc: t("order_perk_receipts_desc", "Access itemized bills and past order summaries anytime"),
    },
    {
      icon: "shield",
      title: t("order_perk_support_title", "Order Support & Refunds"),
      desc: t("order_perk_support_desc", "Quick resolution for delivery delays or quality issues"),
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />
      <UtilityHeader
        title={t("nav_orders", "Your orders")}
        subtitle="TRACK & REORDER"
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.guestCard}>
          <Animated.View
            style={[
              styles.guestArtWrapper,
              { transform: [{ translateY: floatAnim }] },
            ]}
          >
            <View style={styles.guestArtGlow} />
            <View style={styles.guestArtCircle}>
              <Icon name="box" size={36} color={colors.accent} />
            </View>
          </Animated.View>

          <Text style={styles.guestTitle}>
            {t("orders_login_title", "Log In to View Orders")}
          </Text>
          <Text style={styles.guestSubtitle}>
            {t(
              "orders_login_sub",
              "Please log in or create an account to track your live deliveries, view past orders, and download receipts."
            )}
          </Text>

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
              style={styles.guestBrowseBtn}
              onPress={onBrowse}
              activeOpacity={0.8}
            >
              <Icon name="home" size={15} color={colors.accent} />
              <Text style={styles.guestBrowseBtnText}>
                {t("browse_food", "Browse restaurants")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Perks list */}
        <View style={styles.perksCard}>
          {perks.map((p, i) => (
            <View
              key={i}
              style={[
                styles.perkRow,
                i < perks.length - 1 && styles.perkRowBorder,
              ]}
            >
              <View style={styles.perkIconCircle}>
                <Icon name={p.icon} size={16} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.perkTitle}>{p.title}</Text>
                <Text style={styles.perkDesc}>{p.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * Authenticated Orders screen displaying real orders from Supabase.
 */
export default function Orders() {
  const { push } = useNav();
  const { state, syncOrders } = useApp();
  const { t } = useI18n();
  const [tab, setTab] = useState<"active" | "past">("active");

  useEffect(() => {
    if (state.authenticated) {
      syncOrders?.();
    }
  }, [state.authenticated]);

  // Guest users see the dedicated Login Required Screen!
  if (!state.authenticated) {
    return (
      <GuestOrdersView
        onLogin={() => push({ name: "phone" })}
        onBrowse={() => push({ name: "mainTabs", screen: "home" })}
      />
    );
  }

  const isActiveOrder = (o: any) =>
    o.status !== -1 && (o.service === "rides" ? o.status < 4 : o.status < 3);

  const activeOrders = state.orders.filter(isActiveOrder);
  const pastOrders = state.orders.filter((o) => !isActiveOrder(o));
  const listOrders = tab === "active" ? activeOrders : pastOrders;
  const activeCount = activeOrders.length;

  const serviceColors = {
    food: { color: "#c84b31", bg: "#f7e6e1" },
    rides: { color: "#3983f7", bg: "#e4efff" },
    grocery: { color: "#318454", bg: "#e5f3e8" },
    courier: { color: "#ef801f", bg: "#fff0de" },
  };

  const serviceIcons = {
    food: "food",
    rides: "car",
    grocery: "bag",
    courier: "box",
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />
      <UtilityHeader
        title={t("nav_orders", "Your orders")}
        subtitle="ALL ROADRIDER SERVICES"
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Delivery Location Selector */}
        <View style={styles.locationBarContainer}>
          <GlobalLocationHeader />
        </View>

        {/* Figma Utility Tabs */}
        <View style={styles.utilityTabs}>
          <TouchableOpacity
            onPress={() => setTab("active")}
            style={[
              styles.utilityTabBtn,
              tab === "active" && styles.utilityTabBtnActive,
            ]}
            activeOpacity={0.7}
          >
            <View style={styles.tabContentRow}>
              <Text
                style={[
                  styles.utilityTabText,
                  tab === "active" && styles.utilityTabTextActive,
                ]}
              >
                Active
              </Text>
              <View style={styles.badgeI}>
                <Text style={styles.badgeIText}>{activeCount}</Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setTab("past")}
            style={[
              styles.utilityTabBtn,
              tab === "past" && styles.utilityTabBtnActive,
            ]}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.utilityTabText,
                tab === "past" && styles.utilityTabTextActive,
              ]}
            >
              Past ({pastOrders.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Real Order List */}
        <View style={styles.crossOrderList}>
          {listOrders.length > 0 ? (
            listOrders.map((o) => {
              const sColor = serviceColors[o.service] || serviceColors.food;
              const iconName = serviceIcons[o.service] || "food";
              const label = serviceMeta[o.service]?.label || "Food";
              const statusDesc =
                o.status < 3
                  ? "In progress · Tap to track"
                  : `Delivered · ${formatDay(o.completedAt ?? o.createdAt)}`;

              return (
                <TouchableOpacity
                  key={o.id}
                  style={styles.orderArticle}
                  activeOpacity={0.8}
                  onPress={() => {
                    if (isActiveOrder(o)) {
                      if (o.service === "rides") {
                        if (!o.partnerId && o.status <= 0) {
                          push({ name: "waitingForRider", orderId: o.id });
                        } else {
                          push({ name: "rideTracking", orderId: o.id });
                        }
                      } else if (o.service === "courier") {
                        if (!o.partnerId && o.status <= 0) {
                          push({ name: "courierSearching", orderId: o.id });
                        } else {
                          push({ name: "courierTracking", orderId: o.id });
                        }
                      } else {
                        push({ name: "status", orderId: o.id });
                      }
                    } else {
                      push({ name: "orderDetail", orderId: o.id });
                    }
                  }}
                >
                  <View
                    style={[
                      styles.serviceOrderIcon,
                      { backgroundColor: sColor.bg },
                    ]}
                  >
                    <Icon name={iconName} size={20} color={sColor.color} />
                  </View>
                  <View style={styles.orderArticleMid}>
                    <Text
                      style={[
                        styles.orderServiceTag,
                        { color: sColor.color },
                      ]}
                    >
                      {label} · {tab === "active" ? "ACTIVE" : "PAST"}
                    </Text>
                    <Text style={styles.orderArticleTitle} numberOfLines={1}>
                      {o.title || "RoadRider Order"}
                    </Text>
                    <Text style={styles.orderArticleSmall}>{statusDesc}</Text>
                  </View>
                  <View style={styles.orderPriceRow}>
                    <Text style={styles.orderPriceStrong}>
                      {rupees(o.bill.toPay)}
                    </Text>
                    <Icon name="arrow" size={16} color={colors.ink} />
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Icon name="box" size={32} color={colors.muted} />
              </View>
              <Text style={styles.emptyTitle}>
                {tab === "active"
                  ? t("no_active_orders", "No active orders")
                  : t("no_past_orders", "No past orders")}
              </Text>
              <Text style={styles.emptySub}>
                {tab === "active"
                  ? t(
                      "no_active_sub",
                      "When you place an order with an approved vendor or book a ride, it will appear here in real time."
                    )
                  : t(
                      "no_past_sub",
                      "Your completed and delivered orders will be saved here."
                    )}
              </Text>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => push({ name: "mainTabs", screen: "home" })}
                style={styles.browseBtn}
              >
                <Text style={styles.browseBtnText}>
                  {t("browse_food", "Browse restaurants")}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
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
  locationBarContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.06)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  // Guest Orders Styles
  guestCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  guestArtWrapper: {
    width: 80,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    position: "relative",
  },
  guestArtGlow: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(200, 75, 49, 0.12)",
  },
  guestArtCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  guestTitle: {
    fontSize: 19,
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
  guestBrowseBtn: {
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
  guestBrowseBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.accent,
  },
  perksCard: {
    backgroundColor: "#ffffff",
    borderRadius: radii.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
  },
  perkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  perkRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#f4f2ef",
  },
  perkIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  perkTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
  },
  perkDesc: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  // Authenticated Orders Styles
  utilityTabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    marginBottom: 12,
  },
  utilityTabBtn: {
    minWidth: 80,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    marginBottom: -1,
  },
  utilityTabBtnActive: {
    borderBottomColor: colors.accent,
  },
  tabContentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  utilityTabText: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: "600",
  },
  utilityTabTextActive: {
    color: colors.accent,
    fontWeight: "800",
  },
  badgeI: {
    backgroundColor: colors.accent,
    borderRadius: radii.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  badgeIText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "800",
  },
  crossOrderList: {
    gap: 10,
  },
  orderArticle: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 14,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.line,
  },
  serviceOrderIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  orderArticleMid: {
    flex: 1,
  },
  orderServiceTag: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  orderArticleTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
  },
  orderArticleSmall: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  orderPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginLeft: 8,
  },
  orderPriceStrong: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.ink,
  },
  emptyContainer: {
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.line,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#f5f4f0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.ink,
    marginTop: 4,
    textAlign: "center",
  },
  emptySub: {
    fontSize: 12,
    color: colors.muted,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  browseBtn: {
    marginTop: 16,
    backgroundColor: colors.accent,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radii.md,
  },
  browseBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
});
