import React from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import Icon from "./Icon";
import type { Service } from "../data/demo";
import { useI18n, type TranslationKey } from "../lib/i18n";
import { getServiceTheme } from "../theme/themes";

interface ServiceTabsProps {
  service: Service;
  onSelect: (value: Service) => void;
}

export default function ServiceTabs({ service, onSelect }: ServiceTabsProps) {
  const { t } = useI18n();

  const items: [Service, string, string, TranslationKey][] = [
    ["food", "food", "Food", "service_food"],
    ["rides", "car", "Rides", "service_rides"],
    ["grocery", "bag", "Grocery", "service_grocery"],
    ["courier", "box", "Courier", "service_courier"],
  ];

  const currentTheme = getServiceTheme(service);

  return (
    <View style={styles.container}>
      {items.map(([id, icon, fallbackLabel, key]) => {
        const isActive = id === service;
        const label = t(key, fallbackLabel);
        const itemTheme = getServiceTheme(id);

        return (
          <Pressable
            key={id}
            onPress={() => onSelect(id)}
            style={({ pressed }) => [
              styles.tab,
              isActive && [
                styles.tabActive,
                { backgroundColor: itemTheme.serviceTabActiveBg },
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
                styles.label,
                isActive && styles.labelActive,
              ]}
              numberOfLines={1}
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
  container: {
    height: 50,
    marginHorizontal: 16,
    padding: 5,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 16,
    elevation: 4,
    zIndex: 10,
  },
  tab: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 8,
  },
  tabActive: {
    shadowColor: "#000000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  label: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#475569",
  },
  labelActive: {
    color: "#ffffff",
    fontWeight: "800",
  },
  pressed: {
    opacity: 0.85,
  },
});
