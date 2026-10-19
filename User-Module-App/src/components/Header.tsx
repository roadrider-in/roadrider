import React from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "./Icon";
import { useApp } from "../state/AppState";
import { useNav } from "../navigation/Navigation";
import { initials } from "../lib/format";
import { colors } from "../theme/tokens";

interface HeaderProps {
  dark?: boolean;
}

export default function Header({ dark = false }: HeaderProps) {
  const insets = useSafeAreaInsets();
  const { state, placeById } = useApp();
  const { push, switchTab } = useNav();

  const currentPlace = placeById(state.defaultPlaceId) ?? state.places[0];
  const placeLabel = currentPlace
    ? `${currentPlace.label}, ${currentPlace.area.split(",")[0]}`
    : "Hazratganj, Lucknow";
  const unreadCount = state.notifications.filter((n) => !n.read).length;
  const isAuth = state.authenticated;
  const userInitials =
    isAuth && state.profile.name ? initials(state.profile.name) : "AK";

  const textColor = dark ? "#ffffff" : colors.ink;
  const subColor = dark ? "rgba(255, 255, 255, 0.65)" : "#77716e";
  const iconBtnBg = dark ? "rgba(255, 255, 255, 0.13)" : "#ffffff";
  const locIconBg = dark ? "rgba(255, 255, 255, 0.14)" : colors.accentSoft;
  const locIconColor = dark ? "#ffffff" : colors.accent;

  return (
    <View style={[styles.header, { paddingTop: insets.top + 6, height: 58 + insets.top }]}>
      {/* Location selector */}
      <Pressable
        onPress={() => push({ name: "places", mode: "delivery" })}
        style={({ pressed }) => [styles.location, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Change delivery location"
      >
        <View style={[styles.locationIcon, { backgroundColor: locIconBg }]}>
          <Icon name="pin" size={16} color={locIconColor} />
        </View>
        <View style={styles.locationTextCol}>
          <Text style={[styles.locationSmall, { color: subColor }]}>DELIVERING TO</Text>
          <Text style={[styles.locationStrong, { color: textColor }]} numberOfLines={1}>
            {placeLabel}
          </Text>
        </View>
        <Text style={[styles.chevron, { color: subColor }]}>⌄</Text>
      </Pressable>

      <View style={styles.actions}>
        {/* Notifications button */}
        <Pressable
          onPress={() => push({ name: "notifications" })}
          style={({ pressed }) => [
            styles.iconButton,
            { backgroundColor: iconBtnBg },
            !dark && styles.iconButtonShadow,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Notifications"
        >
          <Icon name="bell" size={19} color={textColor} />
          {unreadCount > 0 && <View style={styles.dot} />}
        </Pressable>

        {/* Profile Avatar */}
        <Pressable
          onPress={() => switchTab("account")}
          style={({ pressed }) => [
            styles.avatar,
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
    paddingHorizontal: 18,
    zIndex: 5,
  },
  location: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
    marginRight: 12,
  },
  locationIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  locationTextCol: {
    flexShrink: 1,
    justifyContent: "center",
  },
  locationSmall: {
    fontSize: 8,
    fontWeight: "600",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  locationStrong: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  chevron: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 4,
    marginTop: -2,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  iconButtonShadow: {
    shadowColor: "#2f241a",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  dot: {
    position: "absolute",
    top: 7,
    right: 7,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
    borderWidth: 1.5,
    borderColor: "#ffffff",
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#c84b31",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.8,
  },
});
