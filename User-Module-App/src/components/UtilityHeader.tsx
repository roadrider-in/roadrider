import React from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import Icon from "./Icon";
import { useNav } from "../navigation/Navigation";
import { useApp } from "../state/AppState";
import { colors, radii } from "../theme/tokens";

interface UtilityHeaderProps {
  title: string;
  subtitle: string;
}

export default function UtilityHeader({ title, subtitle }: UtilityHeaderProps) {
  const { push } = useNav();
  const { state } = useApp();
  const unreadCount = state.notifications.filter((n) => !n.read).length;

  return (
    <View style={styles.header}>
      <View style={styles.titleCol}>
        <Text style={styles.subtitle}>{subtitle.toUpperCase()}</Text>
        <Text style={styles.title}>{title}</Text>
      </View>

      <Pressable
        onPress={() => push({ name: "notifications" })}
        style={({ pressed }) => [styles.bellBtn, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Notifications"
      >
        <Icon name="bell" size={20} color={colors.ink} />
        {unreadCount > 0 && <View style={styles.dot} />}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleCol: {
    flex: 1,
  },
  subtitle: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.5,
    color: colors.muted,
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: -0.6,
    color: colors.ink,
  },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: "rgba(0, 0, 0, 0.04)",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  dot: {
    position: "absolute",
    top: 9,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.accent,
  },
  pressed: {
    opacity: 0.6,
  },
});
