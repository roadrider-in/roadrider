import React from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import Icon from "./Icon";
import { useApp } from "../state/AppState";
import { useNav } from "../navigation/Navigation";
import { colors, radii } from "../theme/tokens";

interface LocationRowsProps {
  courier?: boolean;
  onPickupClick?: () => void;
  onDropClick?: () => void;
}

export default function LocationRows({
  courier = false,
  onPickupClick,
  onDropClick,
}: LocationRowsProps) {
  const { state, placeById } = useApp();
  const { push } = useNav();

  const pickupPlaceId = courier ? state.courier.pickupId : state.ride.pickupId;
  const dropPlaceId = courier ? state.courier.dropId : state.ride.dropId;

  const pickupPlace = placeById(pickupPlaceId) ?? state.places[0];
  const dropPlace = placeById(dropPlaceId);

  const handlePickup = () => {
    if (onPickupClick) return onPickupClick();
    push({ name: "places", mode: courier ? "courierPickup" : "ridePickup" });
  };

  const handleDrop = () => {
    if (onDropClick) return onDropClick();
    push({ name: "places", mode: courier ? "courierDrop" : "rideDrop" });
  };

  return (
    <View style={styles.card}>
      <Pressable
        onPress={handlePickup}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        accessibilityRole="button"
      >
        <View style={[styles.dot, styles.dotGreen]} />
        <View style={styles.textCol}>
          <Text style={styles.sub}>
            {courier ? "PICKUP LOCATION" : "PICKUP"}
          </Text>
          <Text style={styles.label} numberOfLines={1}>
            {pickupPlace
              ? `${pickupPlace.label}, ${pickupPlace.area.split(",")[0]}`
              : "Select pickup"}
          </Text>
        </View>
        <Icon name="arrow" size={17} color={colors.muted} />
      </Pressable>

      <View style={styles.divider} />

      <Pressable
        onPress={handleDrop}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        accessibilityRole="button"
      >
        <View style={[styles.dot, styles.dotOrange]} />
        <View style={styles.textCol}>
          <Text style={styles.sub}>
            {courier ? "DELIVERY LOCATION" : "DESTINATION"}
          </Text>
          <Text
            style={[
              styles.label,
              !dropPlace && { color: colors.muted },
            ]}
            numberOfLines={1}
          >
            {dropPlace
              ? `${dropPlace.label}, ${dropPlace.area.split(",")[0]}`
              : courier
              ? "Add delivery address"
              : "Where to?"}
          </Text>
        </View>
        <Icon name="arrow" size={17} color={colors.muted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderRadius: radii.md,
    marginHorizontal: 16,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.05)",
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  divider: {
    height: 1,
    backgroundColor: colors.line,
    marginLeft: 40,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 14,
  },
  dotGreen: {
    backgroundColor: "#22c55e",
  },
  dotOrange: {
    backgroundColor: "#ef801f",
  },
  textCol: {
    flex: 1,
    marginRight: 10,
  },
  sub: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.muted,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
  },
  pressed: {
    backgroundColor: "rgba(0, 0, 0, 0.02)",
  },
});
