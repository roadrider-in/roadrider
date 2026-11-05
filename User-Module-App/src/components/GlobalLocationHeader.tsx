import React from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import Icon from "./Icon";
import { useApp } from "../state/AppState";
import { colors } from "../theme/tokens";
import { useI18n } from "../lib/i18n";

export interface GlobalLocationHeaderProps {
  dark?: boolean;
  style?: any;
}

export default function GlobalLocationHeader({
  dark = false,
  style,
}: GlobalLocationHeaderProps) {
  const { state, placeById, openLocationSheet } = useApp();
  const { t } = useI18n();

  const currentPlace = placeById(state.defaultPlaceId) ?? state.places[0];
  const placeLabel = currentPlace
    ? `${currentPlace.label}, ${currentPlace.area.split(",")[0]}`
    : "Select Delivery Location";

  const textColor = dark ? "#ffffff" : colors.ink;
  const subColor = dark ? "rgba(255, 255, 255, 0.65)" : "#77716e";
  const locIconBg = dark ? "rgba(255, 255, 255, 0.14)" : colors.accentSoft;
  const locIconColor = dark ? "#ffffff" : colors.accent;

  return (
    <Pressable
      onPress={openLocationSheet}
      style={({ pressed }) => [styles.location, pressed && styles.pressed, style]}
      accessibilityRole="button"
      accessibilityLabel="Change delivery location"
    >
      <View style={[styles.locationIcon, { backgroundColor: locIconBg }]}>
        <Icon name="pin" size={16} color={locIconColor} />
      </View>
      <View style={styles.locationTextCol}>
        <Text style={[styles.locationSmall, { color: subColor }]}>
          {t("delivering_to", "DELIVERING TO")}
        </Text>
        <Text
          style={[styles.locationStrong, { color: textColor }]}
          numberOfLines={1}
        >
          {placeLabel}
        </Text>
      </View>
      <Text style={[styles.chevron, { color: subColor }]}>⌄</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  location: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: "75%",
    gap: 8,
  },
  locationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  locationTextCol: {
    flex: 1,
  },
  locationSmall: {
    fontSize: 8.5,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  locationStrong: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  chevron: {
    fontSize: 14,
    fontWeight: "800",
    marginTop: -2,
  },
  pressed: {
    opacity: 0.8,
  },
});
