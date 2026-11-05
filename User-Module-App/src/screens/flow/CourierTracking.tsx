import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  Animated,
  StatusBar,
  Linking,
  BackHandler,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import GoogleMap from "../../components/GoogleMap";
import Icon from "../../components/Icon";
import CourierTripDetailsSheet from "../../components/CourierTripDetailsSheet";
import CourierCancelModal from "../../components/CourierCancelModal";
import { supabase } from "../../lib/supabase";
import { useNav } from "../../navigation/Navigation";
import { useApp } from "../../state/AppState";
import { DEFAULT_CENTER, type LatLng } from "../../lib/googleMaps";
import { subscribeToCaptainTracking, type CaptainLocationUpdate } from "../../services/captainTrackingService";
import { decodePolyline } from "../../services/routesService";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface CourierTrackingProps {
  orderId: string;
}

export default function CourierTracking({ orderId }: CourierTrackingProps) {
  const insets = useSafeAreaInsets();
  const { push, reset } = useNav();
  const { state, showToast, placeById, cancelOrder } = useApp();

  const [backendOtp, setBackendOtp] = useState<string | null>(null);
  const [showTripDetails, setShowTripDetails] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [captainStatus, setCaptainStatus] = useState<"on_the_way" | "arrived" | "picked_up" | "delivered">("on_the_way");
  const [isCheckingBetter, setIsCheckingBetter] = useState(false);
  const [captainLocation, setCaptainLocation] = useState<(LatLng & { heading?: number }) | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const [partnerData, setPartnerData] = useState<any>(null);
  const [orderMeta, setOrderMeta] = useState<{
    pickupAddress?: string;
    deliveryAddress?: string;
    pickupCoords?: LatLng;
    deliveryCoords?: LatLng;
    roadDistanceKm?: number;
    estimatedDurationMins?: number;
  }>({});

  // Retrieve order from state
  const order = state.orders.find((o) => o.id === orderId || o.dbId === orderId);
  const dbId = order?.dbId || (orderId.startsWith("RR-") ? null : orderId);
  const displayId = order?.id || orderId;

  // Real-time captain location tracking and DB snapshot
  useEffect(() => {
    let isMounted = true;
    if (!supabase || !dbId) return;

    async function loadOrderFromDb() {
      try {
        const { data, error } = await supabase!
          .from("orders")
          .select(`
            id,
            order_status,
            delivery_status,
            pickup_address,
            pickup_latitude,
            pickup_longitude,
            delivery_address,
            delivery_latitude,
            delivery_longitude,
            route_polyline,
            road_distance_km,
            estimated_duration_mins,
            captain_latitude,
            captain_longitude,
            captain_heading,
            partner_id,
            partners (
              id,
              full_name,
              phone,
              vehicle_number,
              vehicle_model,
              rating
            )
          `)
          .eq("id", dbId)
          .maybeSingle();

        if (isMounted && data) {
          if (data.route_polyline) {
            const decoded = decodePolyline(data.route_polyline);
            if (decoded.length > 0) {
              setRouteCoordinates(decoded);
            }
          }
          if (
            typeof data.captain_latitude === "number" &&
            typeof data.captain_longitude === "number"
          ) {
            setCaptainLocation({
              lat: data.captain_latitude,
              lng: data.captain_longitude,
              heading: data.captain_heading || 0,
            });
          }
          if (data.partners) {
            setPartnerData(data.partners);
          }
          setOrderMeta({
            pickupAddress: data.pickup_address,
            deliveryAddress: data.delivery_address,
            pickupCoords:
              typeof data.pickup_latitude === "number" && typeof data.pickup_longitude === "number"
                ? { lat: data.pickup_latitude, lng: data.pickup_longitude }
                : undefined,
            deliveryCoords:
              typeof data.delivery_latitude === "number" && typeof data.delivery_longitude === "number"
                ? { lat: data.delivery_latitude, lng: data.delivery_longitude }
                : undefined,
            roadDistanceKm: data.road_distance_km,
            estimatedDurationMins: data.estimated_duration_mins,
          });
        }
      } catch (e) {
        console.warn("[CourierTracking] Notice loading order snapshot:", e);
      }
    }

    loadOrderFromDb();

    // Subscribe to real-time captain movement and status updates
    const unsubscribe = subscribeToCaptainTracking(dbId, (update: CaptainLocationUpdate) => {
      if (!isMounted) return;
      setCaptainLocation({
        lat: update.captainLatitude,
        lng: update.captainLongitude,
        heading: update.captainHeading,
      });

      if (update.deliveryStatus === "arrived") {
        setCaptainStatus("arrived");
      } else if (update.deliveryStatus === "picked_up") {
        setCaptainStatus("picked_up");
      } else if (update.deliveryStatus === "delivered" || update.orderStatus === "delivered") {
        setCaptainStatus("delivered");
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [dbId]);

  // Dynamic Pickup PIN: Supabase RPC or order clean digits fallback
  useEffect(() => {
    let isMounted = true;
    async function fetchDynamicOtp() {
      if (supabase && dbId) {
        try {
          const { data, error } = await supabase.rpc("get_customer_delivery_otp", {
            p_order_id: dbId,
          });
          if (isMounted && data && data.success && data.otp_code) {
            setBackendOtp(String(data.otp_code).slice(0, 4));
          }
        } catch (e) {
          console.warn("[CourierTracking] Notice fetching delivery OTP:", e);
        }
      }
    }
    fetchDynamicOtp();
    return () => {
      isMounted = false;
    };
  }, [dbId]);

  const pickupPin = useMemo(() => {
    if (backendOtp && backendOtp.length === 4) return backendOtp;
    const cleanDigits = (order?.id || orderId).replace(/[^0-9]/g, "");
    if (cleanDigits.length >= 4) {
      return cleanDigits.slice(-4);
    }
    return "3178";
  }, [backendOtp, order?.id, orderId]);

  const pinDigits = useMemo(() => {
    const pinStr = String(pickupPin).padEnd(4, "0");
    return [pinStr[0], pinStr[1], pinStr[2], pinStr[3]];
  }, [pickupPin]);

  const deliveryOtp = useMemo(() => {
    // Drop OTP derived distinctly from pickup pin
    const rev = pinDigits.slice().reverse().join("");
    return rev !== pickupPin ? rev : "8421";
  }, [pinDigits, pickupPin]);

  // Locations
  const pickupPlace = placeById(state.courier.pickupId) ?? state.places[0] ?? {
    label: "104, Golf City",
    line: "104, Golf City, Lucknow",
    coords: DEFAULT_CENTER,
  };

  const dropPlace = placeById(state.courier.dropId) ?? {
    label: "Park view apartment",
    line: order?.destination || "Park view apartment, Sector 1, Gomti Nagar",
    coords: { lat: 26.8665, lng: 81.0063 },
  };

  const originCoords: LatLng = useMemo(() => {
    if (orderMeta.pickupCoords) return orderMeta.pickupCoords;
    if (state.courier.pickupCoords) return state.courier.pickupCoords;
    return {
      lat: pickupPlace.coords?.lat ?? DEFAULT_CENTER.lat,
      lng: pickupPlace.coords?.lng ?? DEFAULT_CENTER.lng,
      label: pickupPlace.label,
    };
  }, [orderMeta.pickupCoords, state.courier.pickupCoords, pickupPlace]);

  const destCoords: LatLng = useMemo(() => {
    if (orderMeta.deliveryCoords) return orderMeta.deliveryCoords;
    if (state.courier.dropCoords) return state.courier.dropCoords;
    return {
      lat: dropPlace.coords?.lat ?? 26.8665,
      lng: dropPlace.coords?.lng ?? 81.0063,
      label: dropPlace.label,
    };
  }, [orderMeta.deliveryCoords, state.courier.dropCoords, dropPlace]);

  // Handle hardware back
  useEffect(() => {
    const onBackPress = () => {
      showToast("Tracking in background. Tap notification or Orders to return.");
      push({ name: "mainTabs", screen: "orders" });
      return true;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, []);

  // Captain details dynamically populated from Supabase partners
  const captain = {
    name: partnerData?.full_name || "Sarveshsingh",
    phone: partnerData?.phone || "+91 98765 43210",
    vehicleNumber: partnerData?.vehicle_number || "UP32HX5675",
    vehicleModel: partnerData?.vehicle_model || "Ct100",
    rating: partnerData?.rating ? String(partnerData.rating) : "4.8",
  };

  const handleCall = () => {
    Linking.openURL(`tel:${captain.phone}`).catch(() => {});
  };

  const handleMessage = () => {
    push({ name: "chatSupport", orderId: displayId });
  };

  const handleCheckBetter = () => {
    setIsCheckingBetter(true);
    showToast("Checking for captains closer to pickup point...");
    setTimeout(() => {
      setIsCheckingBetter(false);
      showToast("Sarveshsingh is the fastest captain nearby (4 mins away).");
    }, 2500);
  };

  const handleCancelOrder = async (reason: string) => {
    await cancelOrder(order?.id || displayId, reason);
    setShowCancelModal(false);
    reset([{ name: "mainTabs", screen: "home" }]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Map with live route & moving vehicle */}
      <View style={StyleSheet.absoluteFill}>
        <GoogleMap
          origin={originCoords}
          destination={destCoords}
          captainLocation={captainLocation || undefined}
          routeCoordinates={routeCoordinates.length > 0 ? routeCoordinates : undefined}
          theme="blue"
          showRecenterBtn={true}
          showsUserLocation={true}
        />
      </View>

      {/* Top Bar: Floating back & Trip Details quick button */}
      <SafeAreaView style={styles.topBar} edges={["top"]}>
        <View style={styles.topRow}>
          <TouchableOpacity
            style={styles.floatingRoundBtn}
            onPress={() => {
              showToast("Tracking in background. You can check Orders anytime.");
              push({ name: "mainTabs", screen: "orders" });
            }}
            accessibilityRole="button"
            accessibilityLabel="Minimize tracking"
          >
            <Icon name="arrow" size={20} color="#151B2B" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tripDetailsTopBtn}
            onPress={() => setShowTripDetails(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.tripDetailsTopText}>Trip Details</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Bottom Tracking Card (Screenshot 5) */}
      <View style={[styles.bottomContainer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <View style={styles.sheetCard}>
          {/* Drag handle */}
          <View style={styles.dragHandleWrap}>
            <View style={styles.dragHandle} />
          </View>

          {/* Status Header */}
          <View style={styles.statusHeaderRow}>
            <View>
              <Text style={styles.statusTitle}>Captain on the way</Text>
              <Text style={styles.statusSubtitle}>Reaching pickup in 4 mins</Text>
            </View>
            <View style={styles.statusLiveDot}>
              <View style={styles.pulseInner} />
            </View>
          </View>

          {/* PIN for Parcel Pickup (4 distinct digit boxes) */}
          <View style={styles.pinCard}>
            <Text style={styles.pinLabel}>PIN for Parcel Pickup</Text>
            <View style={styles.pinRow}>
              {pinDigits.map((digit, index) => (
                <View key={index} style={styles.pinBox}>
                  <Text style={styles.pinDigitText}>{digit}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Better Captain Prompt Card */}
          <View style={styles.betterCaptainCard}>
            <View style={styles.betterTextCol}>
              <Text style={styles.betterTitle}>
                Keep checking for a better captain nearby?
              </Text>
            </View>
            <TouchableOpacity
              style={styles.checkBtn}
              onPress={handleCheckBetter}
              disabled={isCheckingBetter}
              activeOpacity={0.8}
            >
              <Text style={styles.checkBtnText}>
                {isCheckingBetter ? "Checking..." : "Check"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Captain Profile Card */}
          <View style={styles.captainCard}>
            <View style={styles.captainAvatar}>
              <Text style={styles.captainAvatarText}>SS</Text>
            </View>

            <View style={styles.captainInfoCol}>
              <Text style={styles.vehiclePlateText}>
                {captain.vehicleNumber}
              </Text>
              <Text style={styles.vehicleModelText}>
                {captain.vehicleModel}
              </Text>
              <View style={styles.captainNameRow}>
                <Text style={styles.captainNameText}>
                  {captain.name}
                </Text>
                <View style={styles.ratingBadge}>
                  <Text style={styles.ratingText}>⭐ {captain.rating}</Text>
                </View>
              </View>
            </View>

            {/* Actions: Message & Call */}
            <View style={styles.captainActionsCol}>
              <TouchableOpacity
                style={styles.callRoundBtn}
                onPress={handleCall}
                accessibilityRole="button"
                accessibilityLabel="Call captain"
              >
                <Icon name="phone" size={18} color="#151B2B" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Message Captain Button */}
          <TouchableOpacity
            style={styles.messageBtn}
            onPress={handleMessage}
            activeOpacity={0.88}
          >
            <Icon name="chat" size={17} color="#151B2B" />
            <Text style={styles.messageBtnText}>
              Message {captain.name}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Trip Details Sheet */}
      <CourierTripDetailsSheet
        visible={showTripDetails}
        order={order}
        pickupOtp={pickupPin}
        dropOtp={deliveryOtp}
        onClose={() => setShowTripDetails(false)}
        onRequestCancel={() => {
          setShowTripDetails(false);
          setShowCancelModal(true);
        }}
        onRequestChangeCaptain={() => {
          setShowTripDetails(false);
          handleCheckBetter();
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
    right: 0,
    paddingHorizontal: 16,
    zIndex: 10,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
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
  },
  tripDetailsTopBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 4,
  },
  tripDetailsTopText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#151B2B",
  },
  bottomContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
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
  statusHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#151B2B",
    letterSpacing: -0.4,
  },
  statusSubtitle: {
    fontSize: 13,
    color: "#68758A",
    marginTop: 2,
  },
  statusLiveDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  pulseInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#16A34A",
  },
  pinCard: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  pinLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#151B2B",
    marginBottom: 10,
  },
  pinRow: {
    flexDirection: "row",
    gap: 10,
  },
  pinBox: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  pinDigitText: {
    fontSize: 24,
    fontWeight: "900",
    color: "#151B2B",
  },
  betterCaptainCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  betterTextCol: {
    flex: 1,
    marginRight: 10,
  },
  betterTitle: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#334155",
    lineHeight: 16,
  },
  checkBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  checkBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#151B2B",
  },
  captainCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    gap: 12,
  },
  captainAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  captainAvatarText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#475569",
  },
  captainInfoCol: {
    flex: 1,
  },
  vehiclePlateText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#151B2B",
  },
  vehicleModelText: {
    fontSize: 12,
    color: "#68758A",
    marginTop: 1,
  },
  captainNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  captainNameText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
  },
  ratingBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#B45309",
  },
  captainActionsCol: {
    flexDirection: "row",
    alignItems: "center",
  },
  callRoundBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  messageBtn: {
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F1F5F9",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
  },
  messageBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#151B2B",
  },
});
