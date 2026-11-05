import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Linking,
  Alert,
  ActivityIndicator,
  ScrollView,
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
import { PRESET_COORDS, type LatLng, computeDistanceKm } from "../../lib/googleMaps";
import { useNav } from "../../navigation/Navigation";
import { useApp } from "../../state/AppState";
import { rupees } from "../../lib/pricing";
import { useLiveTracking } from "../../hooks/useLiveTracking";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface RideTrackingProps {
  orderId: string;
}

type PartnerProfile = {
  id: string;
  full_name: string;
  phone: string;
  rating: number;
  total_jobs_done: number;
  current_lat?: number | null;
  current_lng?: number | null;
  last_location_at?: string | null;
  vehicle_type?: string;
  vehicle_number?: string;
  photo_url?: string;
};

export default function RideTracking({ orderId }: RideTrackingProps) {
  const insets = useSafeAreaInsets();
  const { push, reset } = useNav();
  const { state, setOrderStatus, showToast, placeById, cancelOrder } = useApp();

  const handleMinimize = () => {
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

  const order = state.orders.find((o) => o.id === orderId || o.dbId === orderId);
  const dbId = order?.dbId || (orderId.startsWith("RR-") ? null : orderId);
  const displayId = order?.id || orderId;

  const [partner, setPartner] = useState<PartnerProfile | null>(null);
  const [isLoadingPartner, setIsLoadingPartner] = useState(true);
  const [currentStatus, setCurrentStatus] = useState<string>(
    order?.orderStatus || "accepted"
  );
  const [backendOtp, setBackendOtp] = useState<string | null>(null);
  const [showTripDetails, setShowTripDetails] = useState(false);
  const [showCancelSheet, setShowCancelSheet] = useState(false);

  // Real-time tracking hook (Supabase Realtime + DB polling fallback)
  const liveTracking = useLiveTracking(dbId || orderId);

  // Sync status if liveTracking gets an update
  useEffect(() => {
    if (liveTracking.orderStatus && liveTracking.orderStatus !== currentStatus) {
      setCurrentStatus(liveTracking.orderStatus);
      const parsed = parseBackendStatus(liveTracking.orderStatus);
      if (parsed >= 4 || liveTracking.orderStatus === "completed") {
        showToast("Ride completed! Hope you had a great trip.");
        push({ name: "complete", orderId: order?.id || displayId });
      } else if (parsed === -1 || liveTracking.orderStatus === "cancelled") {
        cancelOrder(order?.id || displayId, "Cancelled");
        showToast("Ride was cancelled.");
        reset([{ name: "mainTabs", screen: "rides" }]);
      }
    }
  }, [liveTracking.orderStatus]);

  // Dynamic Ride PIN: try Supabase RPC, fallback to clean digits of order ID
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
          console.warn("[RideTracking] Notice fetching delivery OTP:", e);
        }
      }
    }
    fetchDynamicOtp();
    return () => {
      isMounted = false;
    };
  }, [dbId]);

  const rideOtp = useMemo(() => {
    if (backendOtp && backendOtp.length === 4) return backendOtp;
    const cleanDigits = (order?.id || orderId).replace(/[^0-9]/g, "");
    if (cleanDigits.length >= 4) {
      return cleanDigits.slice(-4);
    }
    return "3178";
  }, [backendOtp, order?.id, orderId]);

  const otpDigits = useMemo(() => {
    const pinStr = String(rideOtp).padEnd(4, "0");
    return [pinStr[0], pinStr[1], pinStr[2], pinStr[3]];
  }, [rideOtp]);

  // Coordinates from order metadata, state, or placeById
  const pickupPlace = placeById(state.ride.pickupId) ?? state.places[0] ?? {
    label: "Gomti nagar",
    line: "Gomti Nagar Railway Station Road, Vibhuti Khand",
    coords: { lat: 26.8665, lng: 81.0063 },
  };
  const dropPlace = placeById(state.ride.dropId) ?? {
    label: "Platinum Mall",
    line: "Golf City, Hariharpur, Lucknow",
    coords: { lat: 26.8315, lng: 80.9238 },
  };

  const originCoords: LatLng = useMemo(() => {
    if ((order as any)?.pickup_latitude && (order as any)?.pickup_longitude) {
      return {
        lat: Number((order as any).pickup_latitude),
        lng: Number((order as any).pickup_longitude),
        label: (order as any).pickup_address || "Pickup",
      };
    }
    if ((order as any)?.metadata?.pickupCoords) {
      return {
        lat: (order as any).metadata.pickupCoords.lat,
        lng: (order as any).metadata.pickupCoords.lng,
        label: (order as any).metadata.pickupAddress || "Pickup",
      };
    }
    if (state.ride.pickupCoords) {
      return {
        lat: state.ride.pickupCoords.lat,
        lng: state.ride.pickupCoords.lng,
        label: state.ride.pickupAddress || pickupPlace.label,
      };
    }
    if (pickupPlace?.coords) {
      return { ...pickupPlace.coords, label: pickupPlace.label };
    }
    return PRESET_COORDS.home;
  }, [order, state.ride, pickupPlace]);

  const destinationCoords: LatLng = useMemo(() => {
    if ((order as any)?.destination_latitude && (order as any)?.destination_longitude) {
      return {
        lat: Number((order as any).destination_latitude),
        lng: Number((order as any).destination_longitude),
        label: (order as any).destination_address || "Drop",
      };
    }
    if ((order as any)?.metadata?.dropCoords) {
      return {
        lat: (order as any).metadata.dropCoords.lat,
        lng: (order as any).metadata.dropCoords.lng,
        label: (order as any).metadata.dropAddress || "Drop",
      };
    }
    if (state.ride.dropCoords) {
      return {
        lat: state.ride.dropCoords.lat,
        lng: state.ride.dropCoords.lng,
        label: state.ride.dropAddress || dropPlace.label,
      };
    }
    if (dropPlace?.coords) {
      return { ...dropPlace.coords, label: dropPlace.label };
    }
    return PRESET_COORDS.aminabad;
  }, [order, state.ride, dropPlace]);

  // Active captain profile
  const activePartner: PartnerProfile | null = useMemo(() => {
    if (liveTracking.partner) {
      return {
        id: liveTracking.partner.id || partner?.id || "partner-1",
        full_name: liveTracking.partner.full_name || partner?.full_name || "Captain",
        phone: liveTracking.partner.phone || partner?.phone || "",
        rating: Number(liveTracking.partner.rating || partner?.rating || 4.9),
        total_jobs_done: liveTracking.partner.total_jobs_done || partner?.total_jobs_done || 100,
        current_lat: liveTracking.partner.current_lat ?? partner?.current_lat,
        current_lng: liveTracking.partner.current_lng ?? partner?.current_lng,
        vehicle_type: liveTracking.partner.vehicle_type || partner?.vehicle_type || "Motorcycle",
        vehicle_number: liveTracking.partner.vehicle_number || partner?.vehicle_number || "UP32 RR 0001",
        photo_url: liveTracking.partner.photo_url || partner?.photo_url,
      };
    }
    return partner;
  }, [liveTracking.partner, partner]);

  // Real captain GPS coordinates - strictly real GPS, never simulated offsets
  const riderCoords: LatLng | undefined = useMemo(() => {
    if (liveTracking.captainLocation) {
      return {
        lat: liveTracking.captainLocation.lat,
        lng: liveTracking.captainLocation.lng,
        label: `${activePartner?.full_name || "Captain"} (Live)`,
      };
    }
    if (
      activePartner?.current_lat &&
      activePartner?.current_lng &&
      typeof activePartner.current_lat === "number" &&
      typeof activePartner.current_lng === "number"
    ) {
      return {
        lat: activePartner.current_lat,
        lng: activePartner.current_lng,
        label: `${activePartner.full_name} (Captain)`,
      };
    }
    return undefined;
  }, [liveTracking.captainLocation, activePartner]);

  // Real distance calculation (Road distance preferred, geodesic fallback only if GPS reported)
  const captainDistanceMeters = useMemo(() => {
    if (liveTracking.roadDistanceKm != null && liveTracking.roadDistanceKm > 0) {
      return Math.round(liveTracking.roadDistanceKm * 1000);
    }
    if (riderCoords && originCoords) {
      const km = computeDistanceKm(riderCoords, originCoords);
      return Math.round(km * 1000);
    }
    return null;
  }, [liveTracking.roadDistanceKm, riderCoords, originCoords]);

  // Fetch partner info from Supabase
  useEffect(() => {
    let isMounted = true;
    async function loadPartner() {
      if (!supabase) {
        setIsLoadingPartner(false);
        return;
      }

      const partnerIdToFetch = order?.partnerId;
      if (!partnerIdToFetch) {
        if (dbId) {
          const { data: ord } = await supabase
            .from("orders")
            .select("partner_id, order_status")
            .eq("id", dbId)
            .maybeSingle();

          if (ord?.order_status) {
            setCurrentStatus(ord.order_status);
          }

          if (ord?.partner_id) {
            const { data: p } = await supabase
              .from("partners")
              .select("*")
              .eq("id", ord.partner_id)
              .maybeSingle();

            if (isMounted && p) {
              setPartner(p);
            }
          }
        }
        setIsLoadingPartner(false);
        return;
      }

      const { data: p } = await supabase
        .from("partners")
        .select("*")
        .eq("id", partnerIdToFetch)
        .maybeSingle();

      if (isMounted) {
        if (p) setPartner(p);
        setIsLoadingPartner(false);
      }
    }

    loadPartner();
    return () => {
      isMounted = false;
    };
  }, [dbId, order?.partnerId]);

  // Realtime subscription for orders and rides updates
  useEffect(() => {
    if (!supabase) return;

    const channelName = `ride-tracking-${dbId || displayId}-${Date.now()}`;
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
        async (payload) => {
          const updated = payload.new as any;
          if (!updated) return;

          if (updated.order_status) {
            setCurrentStatus(updated.order_status);
          }

          if (updated.partner_id && (!partner || partner.id !== updated.partner_id)) {
            if (supabase) {
              const { data: p } = await supabase
                .from("partners")
                .select("*")
                .eq("id", updated.partner_id)
                .maybeSingle();
              if (p) setPartner(p);
            }
          }

          const parsed = parseBackendStatus(updated.order_status || "");
          if (parsed >= 4 || updated.order_status === "completed") {
            showToast("Ride completed! Hope you had a great trip.");
            push({ name: "complete", orderId: order?.id || displayId });
          } else if (parsed === -1 || updated.order_status === "cancelled") {
            cancelOrder(order?.id || displayId, "Cancelled");
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
        async (payload) => {
          const updated = payload.new as any;
          if (!updated) return;

          if (updated.status) {
            setCurrentStatus(updated.status);
          }

          if (updated.status === "completed") {
            showToast("Ride completed! Hope you had a great trip.");
            push({ name: "complete", orderId: order?.id || displayId });
          } else if (updated.status === "cancelled") {
            cancelOrder(order?.id || displayId, "Cancelled");
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
  }, [dbId, displayId, order?.id, partner, push, reset, showToast, cancelOrder]);

  const handleCallCaptain = () => {
    if (partner?.phone) {
      Linking.openURL(`tel:${partner.phone}`).catch(() => {
        showToast(`Captain phone: ${partner.phone}`);
      });
    } else {
      showToast("Captain phone number not available.");
    }
  };

  const handleMessageCaptain = () => {
    push({ name: "chatSupport", orderId: order?.id || displayId });
  };

  const handleSafetyPress = () => {
    Alert.alert(
      "RoadRider Safety Toolkit",
      "Your ride is monitored with 24x7 RoadRider Safety Shield.\n\n• Emergency Police SOS: 112\n• RoadRider Safety Hotline: 1800-ROAD-RIDER\n• Share live ride tracking with trusted contacts.",
      [
        {
          text: "Call Police (112)",
          onPress: () => Linking.openURL("tel:112"),
          style: "destructive",
        },
        { text: "Share Trip", onPress: () => showToast("Trip link copied to clipboard!") },
        { text: "Close", style: "cancel" },
      ]
    );
  };

  const handleCancelled = async (reason: string) => {
    setShowCancelSheet(false);
    await cancelOrder(order?.id || displayId, reason);
    reset([{ name: "mainTabs", screen: "rides" }]);
  };

  const captainName = activePartner?.full_name || "Captain";
  const vehiclePlate = activePartner?.vehicle_number || "UP32 RR 0001";
  const vehicleModel = activePartner?.vehicle_type || "Motorcycle";
  const captainRating = activePartner?.rating ? Number(activePartner.rating).toFixed(1) : "4.9";
  const totalFare = order?.bill?.toPay || 104;

  const bannerText = useMemo(() => {
    if (currentStatus === "arrived") return "Captain has arrived at your pickup-point";
    if (currentStatus === "in_progress" || currentStatus === "started") return "Trip in progress to destination";
    if (currentStatus === "accepted") return "Captain is on the way to pickup";
    return "Walk to your pickup-point";
  }, [currentStatus]);

  const etaLabel = useMemo(() => {
    if (currentStatus === "in_progress" || currentStatus === "started") return "Arriving in";
    return "Pickup in";
  }, [currentStatus]);

  const etaValue = useMemo(() => {
    if (liveTracking.estimatedDurationMins) {
      return `${liveTracking.estimatedDurationMins} mins`;
    }
    return "3-5 mins";
  }, [liveTracking.estimatedDurationMins]);

  const distanceLabel = useMemo(() => {
    if (captainDistanceMeters != null) {
      if (captainDistanceMeters < 1000) {
        return `Captain ${captainDistanceMeters} m away`;
      }
      return `Captain ${(captainDistanceMeters / 1000).toFixed(1)} km away`;
    }
    if (liveTracking.isStale) {
      return "Waiting for captain GPS...";
    }
    return "Captain en route";
  }, [captainDistanceMeters, liveTracking.isStale]);

  const vehicleOption = state.ride.optionId || "bike";
  const vehicleName =
    vehicleOption === "bike"
      ? "Bike"
      : vehicleOption === "shared_auto"
      ? "Shared Auto"
      : vehicleOption === "cab"
      ? "Cab Economy"
      : vehicleOption === "xl"
      ? "Cab Premium"
      : "Auto";

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Map Upper Section (Reference Screenshot 3) */}
      <View style={styles.mapContainer}>
        <GoogleMap
          origin={originCoords}
          destination={destinationCoords}
          driver={riderCoords}
          captainLocation={liveTracking.captainLocation || undefined}
          routeCoordinates={liveTracking.routeCoordinates.length > 0 ? liveTracking.routeCoordinates : undefined}
          showRecenterBtn
          showRoute
          theme="blue"
          interactive
        />

        {/* Top Header Overlay: Minimize down arrow */}
        <SafeAreaView style={styles.topHeaderOverlay} edges={["top"]}>
          <TouchableOpacity
            style={styles.floatingMinimizeBtn}
            onPress={handleMinimize}
            hitSlop={8}
            accessibilityLabel="Minimize tracking"
          >
            <Icon name="chevron-down" size={20} color="#172033" />
          </TouchableOpacity>
        </SafeAreaView>
      </View>

      {/* Tracking Bottom Sheet (Reference Screenshot 3) */}
      <View style={[styles.bottomSheet, { paddingBottom: Math.max(insets.bottom, 16) + 4 }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.sheetScrollContent}
        >
          {/* Top Bar: Down Handle & Safety Button */}
          <View style={styles.sheetTopBar}>
            <TouchableOpacity onPress={handleMinimize} hitSlop={8}>
              <Icon name="chevron-down" size={20} color="#68758A" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.safetyBtn}
              activeOpacity={0.8}
              onPress={handleSafetyPress}
            >
              <Icon name="shield" size={14} color="#1769E8" />
              <Text style={styles.safetyBtnText}>Safety</Text>
            </TouchableOpacity>
          </View>

          {/* Blue Notification Banner (Reference Screenshot 3) */}
          <View style={styles.blueBanner}>
            <Text style={styles.blueBannerText}>{bannerText}</Text>
          </View>

          {/* Pickup ETA & Distance Info Row (Reference Screenshot 3) */}
          <View style={styles.etaInfoRow}>
            <View style={styles.etaTextCol}>
              <Text style={styles.etaPickupTitle}>
                {etaLabel} <Text style={styles.etaGreenText}>{etaValue}</Text>
              </Text>
              <Text style={styles.etaDistanceSub}>{distanceLabel}</Text>
            </View>

            {/* Thumbnail preview of pickup point landmark */}
            <View style={styles.landmarkThumbnail}>
              <Icon name="pin" size={18} color="#16A34A" />
            </View>
          </View>

          {/* START YOUR ORDER WITH PIN (Reference Screenshot 3) */}
          <View style={styles.pinSection}>
            <Text style={styles.pinLabel}>Start your order with PIN</Text>
            <View style={styles.pinBoxesRow}>
              {otpDigits.map((digit, idx) => (
                <View key={idx} style={styles.pinBox}>
                  <Text style={styles.pinDigitText}>{digit}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* CAPTAIN & VEHICLE CARD (Reference Screenshot 3) */}
          <View style={styles.captainCard}>
            <View style={styles.captainCardTop}>
              <View style={styles.vehicleInfoCol}>
                <Text style={styles.vehiclePlateText}>{vehiclePlate}</Text>
                <Text style={styles.vehicleModelText}>{vehicleModel}</Text>
                <Text style={styles.captainNameText} numberOfLines={1}>
                  {captainName}
                </Text>
              </View>

              <View style={styles.captainPhotoWrap}>
                <View style={styles.captainAvatarCircle}>
                  <Icon name="user" size={24} color="#1769E8" />
                </View>
                <View style={styles.neverCancelsBadge}>
                  <Text style={styles.neverCancelsBadgeText}>Never Cancels 💜</Text>
                </View>
              </View>
            </View>

            {/* Message / Call Captain Buttons */}
            <View style={styles.contactButtonsRow}>
              <TouchableOpacity
                style={styles.messageCaptainBtn}
                activeOpacity={0.8}
                onPress={handleMessageCaptain}
              >
                <Icon name="chat" size={16} color="#172033" />
                <Text style={styles.messageCaptainText}>
                  Message {captainName.split(" ")[0]}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.callCaptainBtn}
                activeOpacity={0.8}
                onPress={handleCallCaptain}
              >
                <Icon name="phone" size={17} color="#1769E8" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Pickup Location & Trip Details Row */}
          <View style={styles.pickupTripRow}>
            <View style={styles.pickupTextCol}>
              <Text style={styles.pickupFromLabel}>Pickup From</Text>
              <Text style={styles.pickupAddressText} numberOfLines={1}>
                {pickupPlace.line || `${pickupPlace.label}, Lucknow`}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.tripDetailsBtn}
              activeOpacity={0.8}
              onPress={() => setShowTripDetails(true)}
            >
              <Text style={styles.tripDetailsBtnText}>Trip Details</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {/* Insurance and Compensation Notices (Reference Screenshot 3) */}
          <View style={styles.noticesContainer}>
            <Text style={styles.noticeText}>
              Your bike rides are insured by Acko Insurance{" "}
              <Text style={styles.noticeLink}>Learn More</Text>
            </Text>
            <Text style={styles.noticeText}>
              We strive to compensate our captains fairly for their time and effort{" "}
              <Text style={styles.noticeLink}>Know More</Text>
            </Text>
          </View>
        </ScrollView>
      </View>

      {/* Trip Details Bottom Sheet */}
      <RideTripDetailsSheet
        visible={showTripDetails}
        onClose={() => setShowTripDetails(false)}
        vehicleName={vehicleName}
        vehicleIcon={vehicleOption === "bike" ? "bike" : vehicleOption === "cab" ? "car" : "auto"}
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
        captainName={captainName}
        captainRating={Number(captainRating)}
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
  mapContainer: {
    flex: 1,
    position: "relative",
  },
  topHeaderOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
    pointerEvents: "box-none",
    zIndex: 10,
  },
  floatingMinimizeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
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
    maxHeight: SCREEN_HEIGHT * 0.62,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 12,
    elevation: 8,
  },
  sheetScrollContent: {
    paddingBottom: 20,
  },
  sheetTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  safetyBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EAF3FF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DCE8F8",
    gap: 5,
  },
  safetyBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1769E8",
  },
  blueBanner: {
    backgroundColor: "#1769E8",
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  blueBannerText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  etaInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  etaTextCol: {
    flex: 1,
  },
  etaPickupTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#172033",
  },
  etaGreenText: {
    color: "#16A34A",
  },
  etaDistanceSub: {
    fontSize: 12.5,
    color: "#68758A",
    marginTop: 2,
  },
  landmarkThumbnail: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F0FDF4",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  pinSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 14,
  },
  pinLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#172033",
  },
  pinBoxesRow: {
    flexDirection: "row",
    gap: 6,
  },
  pinBox: {
    width: 28,
    height: 32,
    borderRadius: 6,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  pinDigitText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#172033",
  },
  captainCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 14,
  },
  captainCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  vehicleInfoCol: {
    flex: 1,
  },
  vehiclePlateText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#172033",
    letterSpacing: 0.5,
  },
  vehicleModelText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#68758A",
    marginTop: 2,
  },
  captainNameText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#172033",
    marginTop: 4,
  },
  captainPhotoWrap: {
    alignItems: "flex-end",
  },
  captainAvatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EAF3FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#DCE8F8",
  },
  neverCancelsBadge: {
    backgroundColor: "#F3E8FF",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#E9D5FF",
  },
  neverCancelsBadgeText: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#7E22CE",
  },
  contactButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  messageCaptainBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingVertical: 9,
    borderRadius: 12,
    gap: 8,
  },
  messageCaptainText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#172033",
  },
  callCaptainBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#EAF3FF",
    borderWidth: 1,
    borderColor: "#DCE8F8",
    alignItems: "center",
    justifyContent: "center",
  },
  pickupTripRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  pickupTextCol: {
    flex: 1,
    marginRight: 10,
  },
  pickupFromLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#68758A",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  pickupAddressText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#172033",
    marginTop: 2,
  },
  tripDetailsBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
  },
  tripDetailsBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#172033",
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginBottom: 10,
  },
  noticesContainer: {
    gap: 6,
  },
  noticeText: {
    fontSize: 11,
    color: "#68758A",
    lineHeight: 15,
  },
  noticeLink: {
    color: "#1769E8",
    fontWeight: "700",
  },
});
