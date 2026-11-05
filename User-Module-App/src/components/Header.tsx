import React from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "./Icon";
import { useApp } from "../state/AppState";
import { useNav } from "../navigation/Navigation";
import { initials } from "../lib/format";
import { useI18n } from "../lib/i18n";
import { useServiceTheme } from "../theme/themes";
import type { Service } from "../data/demo";

interface HeaderProps {
  dark?: boolean;
  serviceOverride?: Service;
}

export default function Header({ dark, serviceOverride }: HeaderProps) {
  const insets = useSafeAreaInsets();
  const { state, placeById, openLocationSheet } = useApp();
  const { push, switchTab } = useNav();
  const { t } = useI18n();

  const activeService = serviceOverride || state.service || "food";
  const theme = useServiceTheme(activeService);

  const currentPlace = placeById(state.defaultPlaceId) ?? state.places[0];
  const placeLabel = currentPlace
    ? `${currentPlace.label}, ${currentPlace.area.split(",")[0]}`
    : "Hazratganj, Lucknow";
  const unreadCount = state.notifications.filter((n) => !n.read).length;
  const isAuth = state.authenticated;
  const userInitials =
    isAuth && state.profile.name ? initials(state.profile.name) : "AK";

  // Grocery Header Layout (Screenshot 3)
  if (activeService === "grocery") {
    return (
      <View style={[styles.groceryHeaderWrap, { paddingTop: insets.top + 6 }]}>
        {/* Top Row: Brand Logo + Actions */}
        <View style={styles.groceryTopRow}>
          <View style={styles.groceryBrandWrap}>
            <View style={styles.leafIconWrap}>
              <Icon name="leaf" size={24} color="#1e8e3e" />
            </View>
            <View>
              <Text style={styles.groceryBrandTitle}>RoadRider</Text>
              <Text style={styles.groceryBrandSubtitle}>Grocery</Text>
            </View>
          </View>

          <View style={styles.actions}>
            {/* Notifications button */}
            <Pressable
              onPress={() => push({ name: "notifications" })}
              style={({ pressed }) => [
                styles.iconButtonLight,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Notifications"
            >
              <Icon name="bell" size={19} color="#141c16" />
              {unreadCount > 0 && <View style={styles.dot} />}
            </Pressable>

            {/* Profile Avatar */}
            <Pressable
              onPress={() => switchTab("account")}
              style={({ pressed }) => [
                styles.avatarGrocery,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Account profile"
            >
              <Text style={styles.avatarText}>{userInitials}</Text>
            </Pressable>
          </View>
        </View>

        {/* Bottom Row: Delivering To Location + 15 min Express Badge */}
        <View style={styles.groceryLocationRow}>
          <Pressable
            onPress={openLocationSheet}
            style={({ pressed }) => [styles.groceryLocationBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Change delivery location"
          >
            <View style={styles.groceryPinWrap}>
              <Icon name="pin" size={15} color="#1e8e3e" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.groceryLocationSmall}>
                {t("delivering_to", "Delivering to")}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                <Text style={styles.groceryLocationStrong} numberOfLines={1}>
                  {placeLabel}
                </Text>
                <Text style={styles.chevronGrocery}>⌄</Text>
              </View>
            </View>
          </Pressable>

          {/* 15 min Express Delivery Badge */}
          <View style={styles.fifteenMinBadge}>
            <Icon name="truck" size={14} color="#1e8e3e" />
            <Text style={styles.fifteenMinText}>15 min</Text>
          </View>
        </View>
      </View>
    );
  }

  // Rides Header Layout (Screenshot 2)
  if (activeService === "rides") {
    return (
      <View style={[styles.header, { paddingTop: insets.top + 6, height: 58 + insets.top }]}>
        <Pressable
          onPress={openLocationSheet}
          style={({ pressed }) => [styles.location, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Change pickup location"
        >
          <View style={styles.ridesLocIcon}>
            <Icon name="pin" size={16} color="#ffffff" />
          </View>
          <View style={styles.locationTextCol}>
            <Text style={styles.ridesLocationSmall}>
              {t("delivering_to", "DELIVERING TO")}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
              <Text style={styles.ridesLocationStrong} numberOfLines={1}>
                {placeLabel}
              </Text>
              <Text style={styles.chevronWhite}>⌄</Text>
            </View>
          </View>
        </Pressable>

        <View style={styles.actions}>
          <Pressable
            onPress={() => push({ name: "notifications" })}
            style={({ pressed }) => [
              styles.iconButtonRides,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Icon name="bell" size={19} color="#0f172a" />
            {unreadCount > 0 && <View style={styles.dot} />}
          </Pressable>

          <Pressable
            onPress={() => switchTab("account")}
            style={({ pressed }) => [
              styles.avatarRides,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Account profile"
          >
            <Text style={styles.avatarText}>{userInitials}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Food & Default Header Layout (Screenshot 1)
  const isDark = dark ?? true;
  const textColor = isDark ? "#ffffff" : "#171514";
  const subColor = isDark ? "rgba(255, 255, 255, 0.72)" : "#77716e";
  const iconBtnBg = isDark ? "rgba(0, 0, 0, 0.35)" : "#ffffff";
  const locIconBg = isDark ? "rgba(255, 255, 255, 0.16)" : theme.primarySoft;
  const locIconColor = isDark ? "#ffffff" : theme.primary;

  return (
    <View style={[styles.header, { paddingTop: insets.top + 6, height: 58 + insets.top }]}>
      {/* Location selector */}
      <Pressable
        onPress={openLocationSheet}
        style={({ pressed }) => [styles.location, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Change delivery location"
      >
        <View style={[styles.locationIcon, { backgroundColor: locIconBg }]}>
          <Icon name="pin" size={16} color={locIconColor} />
        </View>
        <View style={styles.locationTextCol}>
          <Text style={[styles.locationSmall, { color: subColor }]}>
            {t("delivering_to", "Delivering to")}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <Text style={[styles.locationStrong, { color: textColor }]} numberOfLines={1}>
              {placeLabel}
            </Text>
            <Text style={[styles.chevron, { color: subColor }]}>⌄</Text>
          </View>
        </View>
      </Pressable>

      <View style={styles.actions}>
        {/* Notifications button */}
        <Pressable
          onPress={() => push({ name: "notifications" })}
          style={({ pressed }) => [
            styles.iconButton,
            { backgroundColor: iconBtnBg },
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Notifications"
        >
          <Icon name="bell" size={19} color="#ffffff" />
          {unreadCount > 0 && <View style={styles.dot} />}
        </Pressable>

        {/* Profile Avatar */}
        <Pressable
          onPress={() => switchTab("account")}
          style={({ pressed }) => [
            styles.avatarFood,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Account profile"
        >
          <Text style={styles.avatarText}>{userInitials}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    zIndex: 10,
  },
  location: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    marginRight: 12,
  },
  locationIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  locationTextCol: {
    flex: 1,
  },
  locationSmall: {
    fontSize: 9.5,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  locationStrong: {
    fontSize: 13.5,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  chevron: {
    fontSize: 14,
    fontWeight: "800",
    marginTop: -2,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  iconButtonLight: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  iconButtonRides: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    shadowColor: "#000000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  dot: {
    position: "absolute",
    top: 7,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#ef4444",
  },
  avatarFood: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#c84b31",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#ffffff",
  },
  avatarRides: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1a73e8",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#ffffff",
  },
  avatarGrocery: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#13542a",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#ffffff",
  },
  avatarText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 12.5,
  },
  // Rides Specific
  ridesLocIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.28)",
    alignItems: "center",
    justifyContent: "center",
  },
  ridesLocationSmall: {
    fontSize: 9,
    fontWeight: "800",
    color: "rgba(255, 255, 255, 0.8)",
    letterSpacing: 0.6,
  },
  ridesLocationStrong: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: -0.2,
  },
  chevronWhite: {
    fontSize: 14,
    fontWeight: "800",
    color: "#ffffff",
    marginTop: -2,
  },
  // Grocery Specific Layout (Screenshot 3)
  groceryHeaderWrap: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: "#f6fbf7",
    zIndex: 10,
    gap: 10,
  },
  groceryTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  groceryBrandWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  leafIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#e6f4ea",
    alignItems: "center",
    justifyContent: "center",
  },
  groceryBrandTitle: {
    fontSize: 16.5,
    fontWeight: "900",
    color: "#141c16",
    lineHeight: 18,
  },
  groceryBrandSubtitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#1e8e3e",
    lineHeight: 15,
  },
  groceryLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 7,
    shadowColor: "#000000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#e4f3e7",
  },
  groceryLocationBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  groceryPinWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#e6f4ea",
    alignItems: "center",
    justifyContent: "center",
  },
  groceryLocationSmall: {
    fontSize: 9,
    fontWeight: "600",
    color: "#5f6e63",
  },
  groceryLocationStrong: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#141c16",
  },
  chevronGrocery: {
    fontSize: 13,
    fontWeight: "800",
    color: "#5f6e63",
    marginTop: -2,
  },
  fifteenMinBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#e6f4ea",
    paddingHorizontal: 8,
    paddingVertical: 4.5,
    borderRadius: 8,
  },
  fifteenMinText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#1e8e3e",
  },
  pressed: {
    opacity: 0.8,
  },
});
