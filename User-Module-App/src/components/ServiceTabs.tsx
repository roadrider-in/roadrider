import React from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import Icon from "./Icon";
import type { Service } from "../data/demo";
import { colors } from "../theme/tokens";

interface ServiceTabsProps {
  service: Service;
  onSelect: (value: Service) => void;
}

export default function ServiceTabs({ service, onSelect }: ServiceTabsProps) {
  const items: [Service, string, string][] = [
    ["food", "food", "Food"],
    ["rides", "car", "Rides"],
    ["grocery", "bag", "Grocery"],
    ["courier", "box", "Courier"],
  ];

  return (
    <View style={styles.container}>
      {items.map(([id, icon, label]) => {
        const isActive = id === service;
        return (
          <Pressable
            key={id}
            onPress={() => onSelect(id)}
            style={({ pressed }) => [
              styles.tab,
              isActive && styles.tabActive,
              pressed && styles.pressed,
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <Icon
              name={icon}
              size={16}
              color={isActive ? colors.accent : "#99928d"}
            />
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {label}
            </Text>
            {isActive && <View style={styles.activeIndicator} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 48,
    marginHorizontal: 14,
    padding: 4,
    borderRadius: 14,
    backgroundColor: "#fffffff0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#19110c",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 4,
    zIndex: 6,
  },
  tab: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    position: "relative",
  },
  tabActive: {
    backgroundColor: colors.accentSoft,
  },
  label: {
    fontSize: 9,
    fontWeight: "600",
    color: "#99928d",
  },
  labelActive: {
    color: colors.accent,
    fontWeight: "800",
  },
  activeIndicator: {
    position: "absolute",
    bottom: 2,
    left: 14,
    right: 14,
    height: 2,
    backgroundColor: colors.accent,
    borderRadius: 1,
  },
  pressed: {
    opacity: 0.8,
  },
});
