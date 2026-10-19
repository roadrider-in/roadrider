import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapArt from "../../components/MapArt";
import Logo from "../../components/Logo";
import Button from "../../components/Button";
import Icon from "../../components/Icon";
import type { EtaResult } from "../../components/GoogleMap";
import { RESTAURANTS, GROCERY_HUB, PARTNER, type Service } from "../../data/demo";
import { PRESET_COORDS, type LatLng } from "../../lib/googleMaps";
import { useNav } from "../../navigation/Navigation";
import { useApp } from "../../state/AppState";

interface OrderStatusProps {
  orderId: string;
  initialView?: "confirmed" | "tracking";
}

const SERVICE_THEMES: Record<
  Service,
  { accent: string; accentSoft: string }
> = {
  food: { accent: "#c84b31", accentSoft: "#f8e7e2" },
  rides: { accent: "#3983f7", accentSoft: "rgba(57, 131, 247, 0.16)" },
  grocery: { accent: "#318454", accentSoft: "#e5f3e8" },
  courier: { accent: "#ef801f", accentSoft: "#fff0de" },
};

export default function OrderStatus({
  orderId,
  initialView = "confirmed",
}: OrderStatusProps) {
  const { push } = useNav();
  const { state, setOrderStatus, showToast } = useApp();
  const [view, setView] = useState<"confirmed" | "tracking">(initialView);
  const [liveEta, setLiveEta] = useState<EtaResult | null>(null);

  const order =
    state.orders.find((o) => o.id === orderId || o.dbId === orderId) ??
    state.orders[0];
  const service: Service = order?.service ?? "food";
  const theme = SERVICE_THEMES[service] ?? SERVICE_THEMES.food;
  const isRide = service === "rides";
  const isCancelled = order?.status === -1;

  // Auto-switch to live tracking view when status advances past Confirmed
  React.useEffect(() => {
    if (order && order.status >= 1 && view === "confirmed") {
      setView("tracking");
    }
  }, [order?.status, view]);

  const restaurant = useMemo(() => {
    if (service === "food") {
      return (
        RESTAURANTS.find(
          (r) =>
            r.name.toLowerCase() === order?.title?.toLowerCase() ||
            r.id === (order as any)?.storeId
        ) || RESTAURANTS[0]
      );
    }
    return null;
  }, [order, service]);

  const userPlace =
    state.places.find((p) => p.id === state.defaultPlaceId) ?? state.places[0];

  const destinationCoords: LatLng = useMemo(() => {
    if (isRide) {
      const drop = state.places.find((p) => p.id === state.ride.dropId);
      if (drop?.coords) return { ...drop.coords, label: drop.label };
      return PRESET_COORDS.aminabad;
    }
    if (userPlace?.coords) {
      return { ...userPlace.coords, label: userPlace.label };
    }
    return PRESET_COORDS.home;
  }, [userPlace, isRide, state.places, state.ride.dropId]);

  const originCoords: LatLng = useMemo(() => {
    if (restaurant) {
      return { ...restaurant.coords, label: restaurant.name };
    }
    if (service === "grocery") {
      return { ...GROCERY_HUB.coords, label: GROCERY_HUB.name };
    }
    if (isRide) {
      const pickup = state.places.find((p) => p.id === state.ride.pickupId);
      if (pickup?.coords) return { ...pickup.coords, label: pickup.label };
      return PRESET_COORDS.home;
    }
    return PRESET_COORDS.aminabad;
  }, [restaurant, service, isRide, state.places, state.ride.pickupId]);

  const driverCoords: LatLng = useMemo(() => {
    const lat = originCoords.lat * 0.45 + destinationCoords.lat * 0.55;
    const lng = originCoords.lng * 0.45 + destinationCoords.lng * 0.55;
    return { lat, lng, label: `${PARTNER.name} (Driver)` };
  }, [originCoords, destinationCoords]);

  const handleNext = () => {
    if (view === "confirmed") {
      setView("tracking");
    } else {
      if (order) {
        setOrderStatus(order.id, 3);
      }
      push({ name: "complete", orderId });
    }
  };

  const handleCallPartner = () => {
    showToast(
      `Calling RoadRider Partner ${PARTNER.name} (+91 98765 00123)...`
    );
  };

  const currentStep = order?.status ?? (view === "tracking" ? 2 : 0);
  const displayDuration = liveEta
    ? liveEta.durationText
    : isRide
    ? "4 min"
    : "18 minutes";

  return (
    <View style={styles.statusPage}>
      <StatusBar barStyle="light-content" />

      {/* Map Header with Float Buttons */}
      <View style={styles.statusMap}>
        <MapArt
          origin={originCoords}
          destination={destinationCoords}
          driver={driverCoords}
          etaText={displayDuration}
          etaUnit="away"
          onEtaCalculated={setLiveEta}
        />

        <SafeAreaView style={styles.statusTop} edges={["top"]}>
          <Logo />
          <TouchableOpacity
            onPress={() => push({ name: "help", orderId })}
            style={styles.helpButton}
          >
            <Text style={styles.helpText}>Help</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>

      {/* Tracking Bottom Sheet matching Figma */}
      <View style={styles.trackingSheet}>
        <View style={styles.drag} />

        <ScrollView
          style={styles.sheetScroll}
          contentContainerStyle={styles.sheetScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text
            style={[
              styles.eyebrow,
              { color: isCancelled ? "#ef4444" : theme.accent },
            ]}
          >
            {isCancelled
              ? "ORDER CANCELLED"
              : view === "confirmed"
              ? "BOOKING CONFIRMED"
              : "LIVE UPDATE"}
          </Text>

          <Text style={[styles.title, isCancelled && { color: "#b91c1c" }]}>
            {isCancelled
              ? "Order was cancelled"
              : view === "confirmed"
              ? isRide
                ? `Meet ${PARTNER.name.split(" ")[0]}, your driver`
                : "We're on it!"
              : isRide
              ? "You're on your way"
              : `Arriving in ${displayDuration}`}
          </Text>

          <Text style={styles.description}>
            {isCancelled
              ? "This order was cancelled. Any amount charged will be refunded to your RoadRider Wallet."
              : view === "confirmed"
              ? "Everything is set. We'll keep you updated."
              : "Your RoadRider partner is moving smoothly toward the destination."}
          </Text>

          {/* Partner Card matching Figma */}
          {!isCancelled && (
            <View style={styles.partner}>
              <View style={styles.partnerAvatar}>
                <Text style={styles.avatarText}>{PARTNER.initials}</Text>
              </View>
              <View style={styles.partnerInfo}>
                <Text style={styles.partnerName}>{PARTNER.name}</Text>
                <View style={styles.partnerStats}>
                  <Icon name="star" size={12} color="#edb63d" />
                  <Text style={styles.partnerStatsText}>
                    {" "}{PARTNER.rating} · {PARTNER.trips} deliveries
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={handleCallPartner}
                style={[
                  styles.partnerPhoneBtn,
                  { backgroundColor: theme.accentSoft },
                ]}
              >
                <Icon name="phone" size={18} color={theme.accent} />
              </TouchableOpacity>
            </View>
          )}

          {/* Status Steps matching Figma */}
          {!isCancelled && (
            <View style={styles.statusSteps}>
              <View style={styles.stepsLine} />
              {["Confirmed", "Picked up", "On the way", "Delivered"].map(
                (label, n) => {
                  const isDone =
                    n < (view === "tracking" ? 3 : 1) || n <= currentStep;
                  return (
                    <View key={label} style={styles.stepCol}>
                      <View
                        style={[
                          styles.stepCircle,
                          isDone && { backgroundColor: theme.accent },
                        ]}
                      >
                        {isDone && (
                          <Icon name="check" size={11} color="#ffffff" />
                        )}
                      </View>
                      <Text
                        style={[
                          styles.stepLabel,
                          isDone && {
                            color: theme.accent,
                            fontWeight: "700",
                          },
                        ]}
                      >
                        {label}
                      </Text>
                    </View>
                  );
                }
              )}
            </View>
          )}

          <View style={{ marginTop: 22 }}>
            <Button
              onPress={
                isCancelled ? () => push({ name: "orders" }) : handleNext
              }
              accentColor={theme.accent}
            >
              {isCancelled
                ? "Back to orders"
                : view === "confirmed"
                ? "View live tracking"
                : isRide
                ? "Complete trip"
                : "Mark as delivered"}
            </Button>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statusPage: {
    flex: 1,
    backgroundColor: "#faf9f7",
  },
  statusMap: {
    height: 330,
    position: "relative",
  },
  statusTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  helpButton: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 13,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  helpText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#171514",
  },
  trackingSheet: {
    flex: 1,
    backgroundColor: "#faf9f7",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    paddingTop: 13,
    paddingHorizontal: 18,
    paddingBottom: 25,
    zIndex: 2,
  },
  drag: {
    backgroundColor: "#d6d0ca",
    borderRadius: 5,
    width: 38,
    height: 4,
    alignSelf: "center",
    marginBottom: 20,
  },
  sheetScroll: {
    flex: 1,
  },
  sheetScrollContent: {
    paddingBottom: 30,
  },
  eyebrow: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.8,
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#171514",
    letterSpacing: -0.5,
    marginBottom: 7,
  },
  description: {
    fontSize: 10,
    color: "#77716e",
    lineHeight: 15,
  },
  partner: {
    borderWidth: 1,
    borderColor: "#ebe7e2",
    backgroundColor: "#ffffff",
    borderRadius: 15,
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    padding: 11,
    marginTop: 16,
  },
  partnerAvatar: {
    backgroundColor: "#283744",
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  partnerInfo: {
    flex: 1,
  },
  partnerName: {
    fontSize: 11,
    fontWeight: "700",
    color: "#171514",
  },
  partnerStats: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  partnerStatsText: {
    fontSize: 8,
    color: "#77716e",
  },
  partnerPhoneBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  statusSteps: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 3,
    marginVertical: 24,
    position: "relative",
  },
  stepsLine: {
    position: "absolute",
    top: 8,
    left: "8%",
    right: "8%",
    height: 1,
    backgroundColor: "#d9d3ce",
  },
  stepCol: {
    zIndex: 1,
    alignItems: "center",
    gap: 6,
  },
  stepCircle: {
    backgroundColor: "#ded9d5",
    width: 17,
    height: 17,
    borderRadius: 8.5,
    alignItems: "center",
    justifyContent: "center",
  },
  stepLabel: {
    fontSize: 7,
    color: "#96908b",
    fontWeight: "600",
  },
});
