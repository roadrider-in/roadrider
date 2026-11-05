import React from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "./Icon";
import type { TabName } from "../navigation/types";
import { useI18n, type TranslationKey } from "../lib/i18n";
import { useApp } from "../state/AppState";
import { useServiceTheme } from "../theme/themes";

export interface BottomNavProps {
  active: TabName;
  count: number;
  onSelect: (value: TabName) => void;
}

export default function BottomNav({ active, count, onSelect }: BottomNavProps) {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 6);
  const { t } = useI18n();
  const { state } = useApp();
  const theme = useServiceTheme();

  const items: [TabName, string, string, TranslationKey][] = [
    ["home", "home", "Home", "nav_home"],
    ["rides", "car", "Rides", "service_rides"],
    ["navcart", "cart", "Cart", "nav_cart"],
    ["orders", "list", "Orders", "nav_orders"],
    ["account", "user", "Account", "nav_account"],
  ];

  const effectiveActive: TabName =
    active === "home" && state.service === "rides"
      ? "rides"
      : active;

  return (
    <View style={[styles.nav, { paddingBottom: bottomPadding, height: 68 + bottomPadding }]}>
      {items.map(([id, icon, fallbackLabel, key]) => {
        const isActive = id === effectiveActive;
        const label = t(key, fallbackLabel);
        return (
          <Pressable
            key={id}
            onPress={() => onSelect(id)}
            style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={label}
          >
            <View
              style={[
                styles.iconSpan,
                isActive && {
                  backgroundColor: theme.bottomNavActiveBg,
                },
              ]}
            >
              <Icon
                name={icon}
                size={21}
                color={isActive ? theme.bottomNavActive : "#94a3b8"}
              />
              {id === "navcart" && count > 0 && (
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: theme.bottomNavBadgeBg },
                  ]}
                >
                  <Text style={styles.badgeText}>
                    {count > 9 ? "9+" : count}
                  </Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.label,
                isActive && {
                  color: theme.bottomNavActive,
                  fontWeight: "800",
                },
              ]}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    backgroundColor: "#fffffff8",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.06)",
    paddingTop: 8,
    paddingHorizontal: 8,
    shadowColor: "#000000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 10,
    elevation: 8,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  iconSpan: {
    width: 38,
    height: 28,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    backgroundColor: "transparent",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: "#ffffff",
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 9.5,
    fontWeight: "900",
    lineHeight: 11,
  },
  label: {
    fontSize: 10.5,
    color: "#64748b",
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.7,
  },
});
