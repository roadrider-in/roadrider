import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  BackHandler,
  Dimensions,
  Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import GoogleMap from "../../components/GoogleMap";
import Icon from "../../components/Icon";
import RideTripDetailsSheet from "../../components/RideTripDetailsSheet";
import RideCancelSheet from "../../components/RideCancelSheet";
import { supabase } from "../../lib/supabase";
import { parseBackendStatus } from "../../lib/orderService";
import { useNav } from "../../navigation/Navigation";
import { useApp } from "../../state/AppState";
import { rupees } from "../../lib/pricing";
import { DEFAULT_CENTER, type LatLng } from "../../lib/googleMaps";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface WaitingForRiderProps {
  orderId: string;
}

export default function WaitingForRider({ orderId }: WaitingForRiderProps) {
  const insets = useSafeAreaInsets();
  const { push, reset } = useNav();
  const { state, showToast, placeById, cancelOrder } = useApp();

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTimedOut, setIsTimedOut] = useState(false);
  const [showTripDetails, setShowTripDetails] = useState(false);
  const [showCancelSheet, setShowCancelSheet] = useState(false);

  // Retrieve the order from AppState or fallback
  const order = state.orders.find((o) => o.id === orderId || o.dbId === orderId);
  const dbId = order?.dbId || (orderId.startsWith("RR-") ? null : orderId);
  const displayId = order?.id || orderId;

  const handleMinimize = () => {
    showToast("Finding drivers in background. You can continue using the app.");
    push({ name: "mainTabs", screen: "rides" });
  };

  useEffect(() => {
    const onBackPress = () => {
      handleMinimize();
      return true;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, []);

  // Locations
  const pickupPlace = placeById(state.ride.pickupId) ?? state.places[0] ?? {
    label: "Current Location",
    line: "Pickup location, Lucknow",
    coords: DEFAULT_CENTER,
  };
  const dropPlace = placeById(state.ride.dropId) ?? {
    label: "Destination",
    line: order?.destination || "Selected drop location, Lucknow",
    coords: { lat: 26.8665, lng: 81.0063 },
  };

  const pickupCoords: LatLng = pickupPlace.coords ?? DEFAULT_CENTER;
  const dropCoords: LatLng = dropPlace.coords ?? { lat: 26.8665, lng: 81.0063 };

  // Vehicle info
  const vehicleOption = state.ride.optionId || "auto";
  const vehicleName =
    vehicleOption === "bike"
      ? "Bike Taxi"
      : vehicleOption === "shared_auto"
      ? "Shared Auto"
      : vehicleOption === "cab"
      ? "Cab Economy"
      : vehicleOption === "xl"
      ? "Cab Premium"
      : "Auto";

  const vehicleIcon =
    vehicleOption === "bike"
      ? "bike"
      : vehicleOption === "cab" || vehicleOption === "xl"
      ? "car"
      : "auto";

  const totalFare = order?.bill?.toPay || 104;

  // Progress Bar Animation (Smooth looping progress)
  const progressBarAnim = useRef(new Animated.Value(0)).current;
  const vehiclePulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const progressLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(progressBarAnim, {
          toValue: 1,
          duration: 2200,
          useNativeDriver: false,
        }),
        Animated.timing(progressBarAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }),
      ])
    );
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(vehiclePulseAnim, {
          toValue: 1.07,
          duration: 1100,
          useNativeDriver: true,
        }),
        Animated.timing(vehiclePulseAnim, {
          toValue: 1,
          duration: 1100,
          useNativeDriver: true,
        }),
      ])
    );
    progressLoop.start();
    pulseLoop.start();
    return () => {
      progressLoop.stop();
      pulseLoop.stop();
    };
  }, [progressBarAnim, vehiclePulseAnim]);

  // Elapsed timer (timeout after 180 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((s) => {
        if (s >= 180 && !isTimedOut) {
          setIsTimedOut(true);
        }
        return s + 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isTimedOut]);

  // Supabase Realtime Subscription for Captain Assignment
  useEffect(() => {
    if (!supabase) return;

    // Check if order already has partner assigned
    if (order?.partnerId || (order?.status !== undefined && order.status >= 1)) {
      showToast("Captain accepted your booking!");
      push({ name: "rideTracking", orderId: order.id });
      return;
    }

    const channelName = `waiting-ride-${dbId || displayId}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: dbId ? `id=eq.${dbId}` : undefined,
        },
        (payload) => {
          const updated = payload.new as any;
          if (!updated) return;

          const hasRider = Boolean(updated.partner_id);
          const status = parseBackendStatus(updated.order_status || "");

          if (hasRider || status >= 1) {
            showToast("Captain confirmed! Connecting to live tracking...");
            push({ name: "rideTracking", orderId: order?.id || displayId });
          } else if (status === -1 || updated.order_status === "cancelled") {
            showToast("Ride was cancelled.");
            reset([{ name: "mainTabs", screen: "rides" }]);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rides",
          filter: dbId ? `id=eq.${dbId}` : undefined,
        },
        (payload) => {
          const updated = payload.new as any;
          if (!updated) return;

          if (updated.partner_id || (updated.status && updated.status !== "searching")) {
            showToast("Captain confirmed! Connecting to live tracking...");
            push({ name: "rideTracking", orderId: order?.id || displayId });
          } else if (updated.status === "cancelled") {
            cancelOrder(order?.id || displayId, "Cancelled by partner/system");
            showToast("Ride was cancelled.");
            reset([{ name: "mainTabs", screen: "rides" }]);
          }
        }
      )
      .subscribe();

    return () => {
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [dbId, displayId, order?.partnerId, order?.status, push, reset, showToast, cancelOrder]);

  const handleCancelled = async (reason: string) => {
    setShowCancelSheet(false);
    await cancelOrder(order?.id || displayId, reason);
    reset([{ name: "mainTabs", screen: "rides" }]);
  };

  const progressBarWidth = progressBarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Map in Upper Half (Reference Screenshot 1) */}
      <View style={styles.mapWrap}>
        <GoogleMap
          origin={{
            lat: pickupCoords.lat,
            lng: pickupCoords.lng,
            label: pickupPlace.label || "Pickup",
          }}
          destination={{
            lat: dropCoords.lat,
            lng: dropCoords.lng,
            label: dropPlace.label || "Drop",
          }}
          showRoute
          theme="blue"
          interactive
        />

        {/* Floating Minimize Button */}
        <SafeAreaView style={styles.topBarOverlay} edges={["top"]}>
          <TouchableOpacity
            style={styles.floatingBackBtn}
            onPress={handleMinimize}
            hitSlop={8}
            accessibilityLabel="Minimize search"
          >
            <Icon name="back" size={20} color="#172033" />
          </TouchableOpacity>
        </SafeAreaView>
      </View>

      {/* Bottom Sheet: Searching in progress (Reference Screenshot 1) */}
      <View style={[styles.bottomSheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        {/* Drag handle */}
        <View style={styles.dragHandle} />

        {/* Searching Title */}
        <Text style={styles.sheetTitle}>Searching in progress</Text>

        {/* Animated Progress Bar */}
        <View style={styles.progressBarTrack}>
          <Animated.View
            style={[styles.progressBarFill, { width: progressBarWidth }]}
          />
        </View>

        {/* Vehicle Fare & Trip Details Card (Reference Screenshot 1) */}
        <View style={styles.vehicleCard}>
          <View style={styles.vehicleCardLeft}>
            <Animated.View
              style={[
                styles.vehicleIconCircle,
                { transform: [{ scale: vehiclePulseAnim }] },
              ]}
            >
              <Icon name={vehicleIcon as any} size={28} color="#1769E8" />
            </Animated.View>
            <View style={styles.vehicleCardInfo}>
              <Text style={styles.totalFareLabel}>Total Fare</Text>
              <Text style={styles.totalFareValue}>{rupees(totalFare)}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.tripDetailsBtn}
            activeOpacity={0.8}
            onPress={() => setShowTripDetails(true)}
          >
            <Text style={styles.tripDetailsBtnText}>Trip Details</Text>
          </TouchableOpacity>
        </View>

        {/* Dotted separator */}
        <View style={styles.dottedLine} />

        {/* Active Order Pill Tab & Waiting Subtext */}
        <View style={styles.waitingContentRow}>
          <View style={styles.activeOrderPill}>
            <View style={styles.activeOrderBadgeNum}>
              <Text style={styles.activeOrderNumText}>1</Text>
            </View>
            <Text style={styles.activeOrderText}>Active Order</Text>
          </View>
          <Text style={styles.whileWaitingText}>
            Connecting to nearby captains in Lucknow...
          </Text>
        </View>

        {/* If searching timed out, offer retry or cancellation */}
        {isTimedOut && (
          <View style={styles.timeoutNotice}>
            <Text style={styles.timeoutText}>
              Captains are currently in high demand. We are continuing the search.
            </Text>
          </View>
        )}

        {/* Cancel Search Button */}
        <TouchableOpacity
          style={styles.cancelSearchBtn}
          activeOpacity={0.8}
          onPress={() => setShowCancelSheet(true)}
        >
          <Text style={styles.cancelSearchBtnText}>Cancel Search</Text>
        </TouchableOpacity>
      </View>

      {/* Trip Details Bottom Sheet */}
      <RideTripDetailsSheet
        visible={showTripDetails}
        onClose={() => setShowTripDetails(false)}
        vehicleName={vehicleName}
        vehicleIcon={vehicleIcon}
        pickupName={pickupPlace.label}
        pickupAddress={pickupPlace.line || "Pickup location, Lucknow"}
        dropName={dropPlace.label}
        dropAddress={dropPlace.line || "Destination, Lucknow"}
        totalFare={totalFare}
        baseFare={Math.round(totalFare * 0.35)}
        distanceFare={Math.round(totalFare * 0.5)}
        timeFare={Math.round(totalFare * 0.1)}
        taxesFare={Math.round(totalFare * 0.05)}
        paymentMethod="Paying via cash"
        onCancelRide={() => {
          setShowTripDetails(false);
          setShowCancelSheet(true);
        }}
      />

      {/* Cancellation Sheet */}
      <RideCancelSheet
        visible={showCancelSheet}
        onClose={() => setShowCancelSheet(false)}
        orderId={order?.id || displayId}
        onCancelled={handleCancelled}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F9FF",
  },
  mapWrap: {
    flex: 1,
    position: "relative",
  },
  topBarOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
    pointerEvents: "box-none",
    zIndex: 10,
  },
  floatingBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  bottomSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 10,
    elevation: 8,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#172033",
    letterSpacing: -0.3,
    marginBottom: 12,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#EAF3FF",
    overflow: "hidden",
    marginBottom: 16,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#1769E8",
    borderRadius: 3,
  },
  vehicleCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 14,
  },
  vehicleCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  vehicleIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EAF3FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#DCE8F8",
  },
  vehicleCardInfo: {},
  totalFareLabel: {
    fontSize: 12,
    color: "#68758A",
    fontWeight: "600",
  },
  totalFareValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#172033",
    marginTop: 2,
  },
  tripDetailsBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
  },
  tripDetailsBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#172033",
  },
  dottedLine: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginBottom: 14,
  },
  waitingContentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  activeOrderPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#172033",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 6,
  },
  activeOrderBadgeNum: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#F59E0B",
    alignItems: "center",
    justifyContent: "center",
  },
  activeOrderNumText: {
    color: "#172033",
    fontSize: 11,
    fontWeight: "800",
  },
  activeOrderText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  whileWaitingText: {
    flex: 1,
    fontSize: 12,
    color: "#68758A",
  },
  timeoutNotice: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
  },
  timeoutText: {
    fontSize: 12,
    color: "#B45309",
    textAlign: "center",
  },
  cancelSearchBtn: {
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  cancelSearchBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#68758A",
  },
});
