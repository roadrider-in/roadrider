import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import UtilityHeader from "../../components/UtilityHeader";
import Icon from "../../components/Icon";
import { serviceMeta, type Service } from "../../data/demo";
import { initials, prettyPhone } from "../../lib/format";
import { rupees } from "../../lib/pricing";
import { useNav } from "../../navigation/Navigation";
import { useApp } from "../../state/AppState";
import { colors } from "../../theme/tokens";

export default function Account() {
  const { push, switchTab, reset } = useNav();
  const { state, setService, signOut, showToast } = useApp();
  const [activityTab, setActivityTab] = useState<"active" | "past">("active");

  const isAuth = state.authenticated;
  const userName = isAuth && state.profile.name ? state.profile.name : "Arjun Khanna";
  const userPhone =
    isAuth && state.profile.phone
      ? `+91 ${prettyPhone(state.profile.phone)}`
      : "+91 98765 43210";
  const userInitials =
    isAuth && state.profile.name ? initials(state.profile.name) : "AK";

  const walletBalance = isAuth ? `${rupees(state.wallet.balance)}.00` : "₹320.00";

  const activeOrders = state.orders.filter((o) => o.status < 3);
  const pastOrders = state.orders.filter((o) => o.status >= 3);
  const currentPreview =
    activityTab === "active" ? activeOrders[0] : pastOrders[0];

  const handleSelectService = (s: Service) => {
    setService(s);
    switchTab("home");
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      showToast("Signed out successfully");
      reset([{ name: "phone" }]);
    } catch {
      showToast("Could not sign out");
    }
  };

  const menuItems = [
    {
      icon: "pin" as const,
      label: "Saved addresses",
      route: { name: "places" as const, mode: "manage" as const },
    },
    {
      icon: "card" as const,
      label: "Payment methods",
      route: { name: "paymentMethods" as const },
    },
    {
      icon: "box" as const,
      label: "Your orders",
      route: { name: "orders" as const },
    },
    {
      icon: "shield" as const,
      label: "Help & support",
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
      <UtilityHeader title="Account" subtitle="PROFILE & SETTINGS" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLargeText}>{userInitials}</Text>
          </View>
          <View style={styles.profileDetails}>
            <Text style={styles.userName}>{userName}</Text>
            <Text style={styles.userPhone}>{userPhone}</Text>
          </View>
          <TouchableOpacity
            onPress={() => push({ name: "profile" })}
            activeOpacity={0.7}
          >
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Figma Wallet Card in Account */}
        <View style={styles.walletCard}>
          <View style={styles.walletCardInfo}>
            <Text style={styles.walletCardSub}>ROADRIDER WALLET</Text>
            <Text style={styles.walletCardStrong}>{walletBalance}</Text>
            <Text style={styles.walletCardP}>Available balance</Text>
          </View>
          <TouchableOpacity
            style={styles.walletCardBtn}
            onPress={() => push({ name: "addMoney" })}
            activeOpacity={0.8}
          >
            <Text style={styles.walletCardBtnText}>+ Add money</Text>
          </TouchableOpacity>
        </View>

        {/* Section Heading: Your Activity */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Your activity</Text>
          <TouchableOpacity onPress={() => push({ name: "orders" })}>
            <Text style={styles.seeAllText}>See all</Text>
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
              Active
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
              Past
            </Text>
          </TouchableOpacity>
        </View>

        {/* Active Order Item */}
        {currentPreview ? (
          <TouchableOpacity
            style={styles.activeOrder}
            activeOpacity={0.8}
            onPress={() =>
              push({ name: "orderDetail", orderId: currentPreview.id })
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
                color="#c84b31"
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
                  ? "Arriving in 18 minutes"
                  : "Delivered safely"}
              </Text>
            </View>
            <Icon name="arrow" size={16} color={colors.ink} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.activeOrder}
            activeOpacity={0.8}
            onPress={() => push({ name: "orders" })}
          >
            <View style={styles.orderIcon}>
              <Icon name="food" size={20} color="#c84b31" />
            </View>
            <View style={styles.activeOrderInfo}>
              <Text style={styles.activeOrderSmall}>FOOD · ON THE WAY</Text>
              <Text style={styles.activeOrderStrong}>Royal Biryani House</Text>
              <Text style={styles.activeOrderP}>Arriving in 18 minutes</Text>
            </View>
            <Icon name="arrow" size={16} color={colors.ink} />
          </TouchableOpacity>
        )}

        {/* Figma Menu List */}
        <View style={styles.menuList}>
          {menuItems.map((item, index) => {
            const isLast = index === menuItems.length - 1;
            return (
              <TouchableOpacity
                key={item.label}
                style={[styles.menuButton, !isLast && styles.menuButtonBorder]}
                onPress={() => push(item.route as any)}
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
          <Text style={styles.exploreServicesP}>Explore services</Text>
          <View style={styles.exploreButtonsRow}>
            {(["food", "rides", "grocery", "courier"] as Service[]).map((s) => (
              <TouchableOpacity
                key={s}
                style={styles.exploreBtn}
                onPress={() => handleSelectService(s)}
                activeOpacity={0.7}
              >
                <Text style={styles.exploreBtnText}>{serviceMeta[s].label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Sign Out Button if Authenticated */}
        {isAuth && (
          <TouchableOpacity
            style={styles.signOutBtn}
            onPress={handleSignOut}
            activeOpacity={0.8}
          >
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        )}
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
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarLarge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#c84b31",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLargeText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  profileDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.ink,
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 10,
    color: colors.muted,
  },
  editBtnText: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: "700",
  },
  walletCard: {
    backgroundColor: "#1f1c1a",
    borderRadius: 19,
    marginTop: 20,
    padding: 19,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  walletCardInfo: {
    flex: 1,
  },
  walletCardSub: {
    fontSize: 7,
    letterSpacing: 1.2,
    color: "rgba(255, 255, 255, 0.55)",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  walletCardStrong: {
    fontSize: 26,
    fontWeight: "800",
    color: "#ffffff",
    marginTop: 2,
  },
  walletCardP: {
    fontSize: 8,
    color: "rgba(255, 255, 255, 0.5)",
    marginTop: 2,
  },
  walletCardBtn: {
    backgroundColor: "#ffffff",
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  walletCardBtnText: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.ink,
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
    fontSize: 10,
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
    fontSize: 10,
    color: colors.muted,
  },
  orderTabTextSelected: {
    color: colors.accent,
    fontWeight: "700",
  },
  activeOrder: {
    backgroundColor: "#ffffff",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.line,
    marginTop: 11,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  orderIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: "#f7e6e1",
    alignItems: "center",
    justifyContent: "center",
  },
  activeOrderInfo: {
    flex: 1,
  },
  activeOrderSmall: {
    fontSize: 7,
    fontWeight: "700",
    color: "#c84b31",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  activeOrderStrong: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.ink,
  },
  activeOrderP: {
    fontSize: 8,
    color: colors.muted,
    marginTop: 2,
  },
  menuList: {
    backgroundColor: "#ffffff",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.line,
    marginTop: 18,
    overflow: "hidden",
  },
  menuButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 10,
  },
  menuButtonBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  menuIconSpan: {
    width: 24,
    alignItems: "center",
  },
  menuLabel: {
    flex: 1,
    fontSize: 10,
    fontWeight: "700",
    color: colors.ink,
    textAlign: "left",
  },
  exploreServices: {
    marginTop: 18,
  },
  exploreServicesP: {
    fontSize: 9,
    color: colors.muted,
    marginBottom: 8,
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
    fontSize: 9,
    fontWeight: "700",
    color: colors.ink,
  },
  signOutBtn: {
    marginTop: 24,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  signOutText: {
    color: colors.error,
    fontSize: 12,
    fontWeight: "700",
  },
});
