import React from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "./Icon";
import { useApp } from "../state/AppState";
import { useNav } from "../navigation/Navigation";
import { initials } from "../lib/format";
import { useI18n, type TranslationKey } from "../lib/i18n";
import { getServiceTheme } from "../theme/themes";
import { HEADER_TOKENS } from "../theme/headerTokens";
import type { Service } from "../data/demo";

export interface UnifiedServiceHeaderProps {
  service: Service;
  onSelectService: (service: Service) => void;
}

export default function UnifiedServiceHeader({
  service,
  onSelectService,
}: UnifiedServiceHeaderProps) {
  const insets = useSafeAreaInsets();
  const { state, placeById, openLocationSheet } = useApp();
  const { push, switchTab } = useNav();
  const { t } = useI18n();

  const theme = getServiceTheme(service);

  const currentPlace = placeById(state.defaultPlaceId) ?? state.places[0];
  const placeLabel = currentPlace
    ? `${currentPlace.label}, ${(currentPlace.area || "Lucknow").split(",")[0]}`
    : "Hazratganj, Lucknow";
  const unreadCount = state.notifications.filter((n) => !n.read).length;
  const isAuth = state.authenticated;
  const userInitials =
    isAuth && state.profile.name ? initials(state.profile.name) : "AK";

  const tabs: [Service, string, string, TranslationKey][] = [
    ["food", "food", "Food", "service_food"],
    ["rides", "car", "Rides", "service_rides"],
    ["grocery", "bag", "Grocery", "service_grocery"],
    ["courier", "box", "Courier", "service_courier"],
  ];

  return (
    <View
      style={[
        styles.headerContainer,
        {
          paddingTop: insets.top + 8,
          backgroundColor: theme.background,
        },
      ]}
    >
      {/* ================= 1. LOCATION & USER ACTIONS ROW ================= */}
      <View style={styles.locationRow}>
        {/* Delivery Location Selector */}
        <Pressable
          onPress={openLocationSheet}
          style={({ pressed }) => [styles.locationBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Change delivery location"
        >
          <View
            style={[
              styles.locationIconWrap,
              { backgroundColor: theme.primarySoft },
            ]}
          >
            <Icon name="pin" size={17} color={theme.primary} />
          </View>
          <View style={styles.locationTextCol}>
            <Text style={styles.locationCaption}>
              {t("delivering_to", "DELIVERING TO")}
            </Text>
            <View style={styles.locationTitleRow}>
              <Text
                style={[styles.locationTitle, { color: theme.textPrimary }]}
                numberOfLines={1}
              >
                {placeLabel}
              </Text>
              <Text style={styles.chevronIcon}>⌄</Text>
            </View>
          </View>
        </Pressable>

        {/* Right Actions: Notification & Profile */}
        <View style={styles.actionsRow}>
          {/* Notifications Button */}
          <Pressable
            onPress={() => push({ name: "notifications" })}
            style={({ pressed }) => [
              styles.notificationBtn,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Icon name="bell" size={19} color="#1e293b" />
            {unreadCount > 0 && <View style={styles.unreadDot} />}
          </Pressable>

          {/* Profile Avatar Button */}
          <Pressable
            onPress={() => switchTab("account")}
            style={({ pressed }) => [
              styles.avatarBtn,
              { backgroundColor: theme.primary },
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Account profile"
          >
            <Text style={styles.avatarText}>{userInitials}</Text>
          </Pressable>
        </View>
      </View>

      {/* ================= 2. FIXED SERVICE TABS CONTAINER ================= */}
      <View style={styles.tabsContainer}>
        {tabs.map(([id, icon, fallbackLabel, key]) => {
          const isActive = id === service;
          const label = t(key, fallbackLabel);
          const tabTheme = getServiceTheme(id);

          return (
            <Pressable
              key={id}
              onPress={() => onSelectService(id)}
              style={({ pressed }) => [
                styles.tabItem,
                isActive && [
                  styles.tabItemActive,
                  { backgroundColor: tabTheme.primary },
                ],
                pressed && styles.pressed,
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={label}
            >
              <Icon
                name={icon}
                size={16}
                color={isActive ? "#ffffff" : "#64748b"}
              />
              <Text
                style={[
                  styles.tabLabel,
                  isActive && styles.tabLabelActive,
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: HEADER_TOKENS.horizontalMargin,
    paddingBottom: HEADER_TOKENS.tabsToContentGap,
    zIndex: 20,
  },
  // Location Row
  locationRow: {
    height: HEADER_TOKENS.locationRowHeight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: HEADER_TOKENS.locationToTabsGap,
  },
  locationBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginRight: 10,
  },
  locationIconWrap: {
    width: HEADER_TOKENS.locationIconSize,
    height: HEADER_TOKENS.locationIconSize,
    borderRadius: HEADER_TOKENS.locationIconSize / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  locationTextCol: {
    flex: 1,
    justifyContent: "center",
  },
  locationCaption: {
    fontSize: 9,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  locationTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  locationTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  chevronIcon: {
    fontSize: 13,
    fontWeight: "900",
    color: "#64748b",
    marginTop: -2,
  },
  // Actions
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  notificationBtn: {
    width: HEADER_TOKENS.actionButtonSize,
    height: HEADER_TOKENS.actionButtonSize,
    borderRadius: HEADER_TOKENS.actionButtonRadius,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.06)",
    shadowColor: "#000000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  unreadDot: {
    position: "absolute",
    top: 7,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#ef4444",
  },
  avatarBtn: {
    width: HEADER_TOKENS.actionButtonSize,
    height: HEADER_TOKENS.actionButtonSize,
    borderRadius: HEADER_TOKENS.actionButtonRadius,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#ffffff",
    shadowColor: "#000000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  avatarText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 12.5,
  },
  // Service Tabs Container
  tabsContainer: {
    height: HEADER_TOKENS.tabsHeight,
    borderRadius: HEADER_TOKENS.tabsBorderRadius,
    padding: HEADER_TOKENS.tabsPadding,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.06)",
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: HEADER_TOKENS.tabsShadowRadius,
    elevation: 3,
  },
  tabItem: {
    flex: 1,
    height: HEADER_TOKENS.tabsItemHeight,
    borderRadius: HEADER_TOKENS.tabsItemRadius,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 6,
  },
  tabItemActive: {
    shadowColor: "#000000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  tabLabelActive: {
    color: "#ffffff",
    fontWeight: "800",
  },
  pressed: {
    opacity: 0.8,
  },
});
