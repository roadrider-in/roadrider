import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  Animated,
  StatusBar,
  BackHandler,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import GoogleMap from "../../components/GoogleMap";
import Icon from "../../components/Icon";
import CourierTripDetailsSheet from "../../components/CourierTripDetailsSheet";
import CourierCancelModal from "../../components/CourierCancelModal";
import { supabase } from "../../lib/supabase";
import { parseBackendStatus } from "../../lib/orderService";
import { useNav } from "../../navigation/Navigation";
import { useApp } from "../../state/AppState";
import { DEFAULT_CENTER, type LatLng } from "../../lib/googleMaps";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface CourierSearchingProps {
  orderId: string;
}

export default function CourierSearching({ orderId }: CourierSearchingProps) {
  const insets = useSafeAreaInsets();
  const { push, reset } = useNav();
  const { state, showToast, placeById, cancelOrder } = useApp();

  const [showTripDetails, setShowTripDetails] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Retrieve order from state
  const order = state.orders.find((o) => o.id === orderId || o.dbId === orderId);
  const dbId = order?.dbId || (orderId.startsWith("RR-") ? null : orderId);
  const displayId = order?.id || orderId;

  // Locations
  const pickupPlace = placeById(state.courier.pickupId) ?? state.places[0] ?? {
    label: "Current Location",
    line: "104, Golf City, Lucknow",
    coords: DEFAULT_CENTER,
  };

  const dropPlace = placeById(state.courier.dropId) ?? {
    label: "Destination",
    line: order?.destination || "Park view apartment, Gomti Nagar",
    coords: { lat: 26.8665, lng: 81.0063 },
  };

  const pickupCoords: LatLng = useMemo(() => {
    if (state.courier.pickupCoords) return state.courier.pickupCoords;
    return {
      lat: pickupPlace.coords?.lat ?? DEFAULT_CENTER.lat,
      lng: pickupPlace.coords?.lng ?? DEFAULT_CENTER.lng,
      label: pickupPlace.label,
    };
  }, [state.courier.pickupCoords, pickupPlace]);

  // Handle hardware back
  useEffect(() => {
    const onBackPress = () => {
      showToast("Searching in background. You can continue using RoadRider.");
      push({ name: "mainTabs", screen: "home" });
      return true;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, []);

  // Animated looping progress bar
  const progressAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(progressAnim, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: false,
        }),
        Animated.timing(progressAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: false,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -5,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [progressAnim, floatAnim]);

  // Transition to tracking when captain is assigned
  const handleCaptainAssigned = () => {
    push({ name: "courierTracking", orderId: displayId });
  };

  // Live Supabase polling & simulation
  useEffect(() => {
    let isMounted = true;
    let pollInterval: any = null;
    const client = supabase;

    if (client && dbId) {
      pollInterval = setInterval(async () => {
        try {
          const { data, error } = await client
            .from("orders")
            .select("order_status, delivery_status, partner_id")
            .eq("id", dbId)
            .maybeSingle();

          if (isMounted && data) {
            const statusNum = parseBackendStatus(data.order_status || "");
            const isAssigned =
              data.delivery_status === "assigned" ||
              data.order_status === "accepted" ||
              data.partner_id ||
              statusNum >= 1;

            if (isAssigned) {
              if (pollInterval) clearInterval(pollInterval);
              handleCaptainAssigned();
            }
          }
        } catch (e) {
          console.warn("[CourierSearching] Polling notice:", e);
        }
      }, 3000);
    }

    // Auto-advance simulation after 8 seconds if no real backend response yet
    const simTimer = setTimeout(() => {
      if (isMounted) {
        handleCaptainAssigned();
      }
    }, 8000);

    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
      clearTimeout(simTimer);
    };
  }, [dbId, displayId]);

  const handleCancelOrder = async (reason: string) => {
    await cancelOrder(order?.id || displayId, reason);
    setShowCancelModal(false);
    reset([{ name: "mainTabs", screen: "home" }]);
  };

  const totalFare = order?.bill?.toPay || state.courier.fare || 86;

  // Interpolated progress bar styles
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ["15%", "60%", "100%"],
  });

  const progressTranslate = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-50, SCREEN_WIDTH - 60],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Map with pulsing center */}
      <View style={StyleSheet.absoluteFill}>
        <GoogleMap
          origin={pickupCoords}
          theme="blue"
          showsUserLocation={true}
          showRecenterBtn={true}
        />
      </View>

      {/* Floating Minimize Button */}
      <SafeAreaView style={styles.topBar} edges={["top"]}>
        <TouchableOpacity
          style={styles.floatingRoundBtn}
          onPress={() => {
            showToast("Searching in background. We'll notify when captain is assigned.");
            push({ name: "mainTabs", screen: "home" });
          }}
          accessibilityRole="button"
          accessibilityLabel="Minimize search"
        >
          <Icon name="arrow" size={20} color="#151B2B" />
        </TouchableOpacity>
      </SafeAreaView>

      {/* Bottom Sheet Card */}
      <View style={[styles.bottomContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {/* Active Order Docked Pill */}
        <View style={styles.activeOrderPill}>
          <View style={styles.orderNumberBadge}>
            <Text style={styles.orderNumberText}>1</Text>
          </View>
          <Text style={styles.activeOrderText}>Active Order</Text>
        </View>

        <View style={styles.sheetCard}>
          {/* Drag handle */}
          <View style={styles.dragHandleWrap}>
            <View style={styles.dragHandle} />
          </View>

          {/* Title */}
          <Text style={styles.searchingTitle}>Searching in progress</Text>

          {/* Animated Progress Bar */}
          <View style={styles.progressBarBg}>
            <Animated.View
              style={[
                styles.progressBarFill,
                {
                  width: progressWidth,
                },
              ]}
            />
          </View>

          {/* Fare & Trip Details Card */}
          <View style={styles.fareCard}>
            <Animated.View style={[styles.vehicleIconWrap, { transform: [{ translateY: floatAnim }] }]}>
              <Text style={styles.vehicleEmoji}>🛵</Text>
            </Animated.View>

            <View style={styles.fareInfoCol}>
              <Text style={styles.fareCaption}>Total Fare</Text>
              <Text style={styles.fareAmount}>₹{totalFare}</Text>
            </View>

            <TouchableOpacity
              style={styles.tripDetailsBtn}
              onPress={() => setShowTripDetails(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.tripDetailsBtnText}>Trip Details</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.cancelLinkRow}>
            <TouchableOpacity
              onPress={() => setShowCancelModal(true)}
              hitSlop={{ top: 8, bottom: 8, left: 14, right: 14 }}
            >
              <Text style={styles.cancelLinkText}>Cancel Parcel Booking</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Trip Details Sheet */}
      <CourierTripDetailsSheet
        visible={showTripDetails}
        order={order}
        onClose={() => setShowTripDetails(false)}
        onRequestCancel={() => {
          setShowTripDetails(false);
          setShowCancelModal(true);
        }}
      />

      {/* Cancel Modal */}
      <CourierCancelModal
        visible={showCancelModal}
        orderId={displayId}
        onClose={() => setShowCancelModal(false)}
        onConfirmCancel={handleCancelOrder}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    paddingHorizontal: 16,
    zIndex: 10,
  },
  floatingRoundBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 4,
    marginTop: 6,
  },
  bottomContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
  },
  activeOrderPill: {
    alignSelf: "flex-start",
    backgroundColor: "#0F172A",
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 8,
    marginLeft: 6,
    gap: 6,
    shadowColor: "#000000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  orderNumberBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#FBBF24",
    alignItems: "center",
    justifyContent: "center",
  },
  orderNumberText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#0F172A",
  },
  activeOrderText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  sheetCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 16,
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 10,
    elevation: 6,
  },
  dragHandleWrap: {
    alignItems: "center",
    paddingVertical: 6,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
  },
  searchingTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1E3A8A",
    marginTop: 4,
    marginBottom: 14,
    letterSpacing: -0.3,
  },
  progressBarBg: {
    width: "100%",
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E2E8F0",
    overflow: "hidden",
    marginBottom: 16,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: "#1E3A8A",
  },
  fareCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  vehicleIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  vehicleEmoji: {
    fontSize: 22,
  },
  fareInfoCol: {
    flex: 1,
  },
  fareCaption: {
    fontSize: 11,
    color: "#68758A",
    fontWeight: "600",
  },
  fareAmount: {
    fontSize: 18,
    fontWeight: "800",
    color: "#151B2B",
    marginTop: 1,
  },
  tripDetailsBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
  },
  tripDetailsBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#151B2B",
  },
  cancelLinkRow: {
    alignItems: "center",
    marginTop: 14,
  },
  cancelLinkText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#EF4444",
  },
});
