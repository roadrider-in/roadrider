import React from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "./Icon";
import type { TabName } from "../navigation/types";
import { colors } from "../theme/tokens";

export interface BottomNavProps {
  active: TabName;
  count: number;
  onSelect: (value: TabName) => void;
}

export default function BottomNav({ active, count, onSelect }: BottomNavProps) {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 6);

  const items: [TabName, string, string][] = [
    ["navcart", "cart", "Cart"],
    ["wallet", "wallet", "Wallet"],
    ["orders", "list", "Orders"],
    ["account", "user", "Account"],
  ];

  return (
    <View style={[styles.nav, { paddingBottom: bottomPadding, height: 70 + bottomPadding }]}>
      {items.map(([id, icon, label]) => {
        const isActive = id === active;
        return (
          <Pressable
            key={id}
            onPress={() => onSelect(id)}
            style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={label}
          >
            <View style={[styles.iconSpan, isActive && styles.iconSpanActive]}>
              <Icon
                name={icon}
                size={21}
                color={isActive ? colors.accent : "#a09c98"}
              />
              {id === "navcart" && count > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {count > 9 ? "9+" : count}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.label, isActive && styles.labelActive]}>
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
    backgroundColor: "#fffffff5",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 8,
    paddingHorizontal: 6,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  iconSpan: {
    width: 34,
    height: 27,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    backgroundColor: "transparent",
  },
  iconSpanActive: {
    backgroundColor: colors.accentSoft,
  },
  badge: {
    position: "absolute",
    top: -5,
    right: -3,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: "#ffffff",
    borderRadius: 9,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 7,
    fontWeight: "700",
  },
  label: {
    fontSize: 9,
    fontWeight: "600",
    color: "#a09c98",
  },
  labelActive: {
    color: colors.accent,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.75,
  },
});
