import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import FlowHeader from "../../components/FlowHeader";
import MapArt from "../../components/MapArt";
import LocationRows from "../../components/LocationRows";
import Button from "../../components/Button";
import Icon from "../../components/Icon";
import { RIDE_OPTIONS } from "../../data/demo";
import { rupees } from "../../lib/pricing";
import { useNav } from "../../navigation/Navigation";
import { useApp } from "../../state/AppState";

export default function RideConfirm() {
  const { push } = useNav();
  const { state } = useApp();

  const opt =
    RIDE_OPTIONS.find((r) => r.id === state.ride.optionId) ?? RIDE_OPTIONS[1];

  const pickupPlace =
    state.places.find((p) => p.id === state.ride.pickupId) ?? state.places[0];
  const dropPlace =
    state.places.find((p) => p.id === state.ride.dropId) ??
    state.places[1] ??
    state.places[0];

  const pickupCoords = pickupPlace?.coords
    ? { ...pickupPlace.coords, label: pickupPlace.label }
    : undefined;
  const dropCoords = dropPlace?.coords
    ? { ...dropPlace.coords, label: dropPlace.label }
    : undefined;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="light-content" />
      <FlowHeader title="Confirm booking" dark />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Map Route Preview matching Figma */}
        <View style={styles.mapContainer}>
          <MapArt
            origin={pickupCoords}
            destination={dropCoords}
            etaText={opt.eta}
            etaUnit="arrival"
          />
        </View>

        {/* Driver / Ride Preview Card matching Figma */}
        <View style={styles.driverPreview}>
          <View style={styles.vehicleIcon}>
            <Icon name="car" size={24} color="#3983f7" />
          </View>
          <View style={styles.driverInfo}>
            <Text style={styles.driverSmall}>YOUR RIDE</Text>
            <Text style={styles.driverName}>{opt.name}</Text>
            <Text style={styles.driverTagline}>{opt.tagline}</Text>
          </View>
          <Text style={styles.driverFare}>{rupees(opt.fare)}</Text>
        </View>

        {/* Location Pickup & Drop Rows */}
        <View style={styles.locationsWrapper}>
          <LocationRows />
        </View>

        {/* ETA Info Strip matching Figma */}
        <View style={styles.infoStrip}>
          <Icon name="clock" size={15} color="#3983f7" />
          <Text style={styles.infoStripText}>
            Driver arrives in <Text style={styles.boldText}>{opt.eta}</Text>
          </Text>
        </View>
      </ScrollView>

      {/* Sticky Bottom Actions matching Figma */}
      <View style={styles.bottomAction}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => push({ name: "paymentMethods" })}
          style={styles.payRow}
        >
          <Icon name="card" size={16} color="#ffffff" />
          <Text style={styles.payRowLabel}>RoadRider Wallet</Text>
          <Text style={styles.payRowBalance}>₹{state.wallet?.balance ?? 320}</Text>
          <Icon name="arrow" size={14} color="rgba(255, 255, 255, 0.5)" />
        </TouchableOpacity>

        <Button
          onPress={() => push({ name: "cart", service: "rides" })}
          style={{ backgroundColor: "#3983f7" }}
        >
          Confirm {opt.name} · {rupees(opt.fare)}
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d1b2c",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 130,
  },
  mapContainer: {
    height: 220,
    width: "100%",
  },
  driverPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 8,
  },
  vehicleIcon: {
    backgroundColor: "rgba(57, 131, 247, 0.16)",
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  driverInfo: {
    flex: 1,
  },
  driverSmall: {
    fontSize: 7,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.5)",
    letterSpacing: 1.1,
  },
  driverName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#ffffff",
    marginVertical: 1,
  },
  driverTagline: {
    fontSize: 9,
    color: "rgba(255, 255, 255, 0.5)",
  },
  driverFare: {
    fontSize: 17,
    fontWeight: "800",
    color: "#3983f7",
  },
  locationsWrapper: {
    paddingHorizontal: 18,
    marginTop: 10,
  },
  infoStrip: {
    marginHorizontal: 18,
    marginTop: 12,
    backgroundColor: "rgba(255, 255, 255, 0.07)",
    borderRadius: 13,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  infoStripText: {
    fontSize: 10,
    color: "#ffffff",
  },
  boldText: {
    fontWeight: "700",
    color: "#3983f7",
  },
  bottomAction: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#0d1b2c",
    paddingHorizontal: 18,
    paddingBottom: 24,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
  },
  payRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    height: 40,
    marginBottom: 8,
  },
  payRowLabel: {
    flex: 1,
    fontSize: 10,
    fontWeight: "600",
    color: "#ffffff",
  },
  payRowBalance: {
    fontSize: 10,
    fontWeight: "700",
    color: "#ffffff",
  },
});
