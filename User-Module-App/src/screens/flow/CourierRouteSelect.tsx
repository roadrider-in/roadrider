import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  Image,
  Modal,
  TextInput,
  ActivityIndicator,
  Animated,
  Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import GoogleMap, { type EtaResult } from "../../components/GoogleMap";
import Icon from "../../components/Icon";
import { useNav } from "../../navigation/Navigation";
import { useApp } from "../../state/AppState";
import { DEFAULT_CENTER, type LatLng } from "../../lib/googleMaps";
import { rupees } from "../../lib/pricing";
import {
  calculateRoadRoute,
  type ComputedRouteResult,
} from "../../services/routesService";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function CourierRouteSelect() {
  const insets = useSafeAreaInsets();
  const { back, push } = useNav();
  const {
    state,
    setCourier,
    placeOrder,
    placeById,
    applyPromo,
    showToast,
  } = useApp();

  const [selectedVehicle, setSelectedVehicle] = useState<"bike" | "3wheeler">("bike");
  const [payAt, setPayAt] = useState<"pickup" | "drop">("pickup");
  const [showPromoBanner, setShowPromoBanner] = useState(true);
  const [showPaymentPicker, setShowPaymentPicker] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "wallet" | "upi">("cod");
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [isBooking, setIsBooking] = useState(false);

  // Locations
  const pickupPlace = placeById(state.courier.pickupId) ?? state.places[0] ?? {
    label: "104, Golf City",
    line: "104, Golf City, Lucknow, Muzaffar Nagar Ghusval, Uttar Pradesh 226002",
    coords: DEFAULT_CENTER,
  };

  const dropPlace = placeById(state.courier.dropId) ?? {
    label: "Park view apartment",
    line: "Park view apartment, Sector 1, Gomti Nagar, Lucknow",
    coords: { lat: 26.8665, lng: 81.0063 },
  };

  const originCoords: LatLng = useMemo(() => {
    if (state.courier.pickupCoords) return state.courier.pickupCoords;
    return {
      lat: pickupPlace.coords?.lat ?? DEFAULT_CENTER.lat,
      lng: pickupPlace.coords?.lng ?? DEFAULT_CENTER.lng,
      label: pickupPlace.label,
    };
  }, [state.courier.pickupCoords, pickupPlace]);

  const destCoords: LatLng = useMemo(() => {
    if (state.courier.dropCoords) return state.courier.dropCoords;
    return {
      lat: dropPlace.coords?.lat ?? 26.8665,
      lng: dropPlace.coords?.lng ?? 81.0063,
      label: dropPlace.label,
    };
  }, [state.courier.dropCoords, dropPlace]);

  const [routeEta, setRouteEta] = useState<{ distanceKm: number; durationMins: number }>({
    distanceKm: 5.4,
    durationMins: 18,
  });

  const [routeResult, setRouteResult] = useState<ComputedRouteResult | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  // Calculate real road route via Google Routes API through Supabase
  useEffect(() => {
    let isMounted = true;
    if (originCoords && destCoords) {
      setIsLoadingRoute(true);
      calculateRoadRoute(originCoords, destCoords).then((res) => {
        if (isMounted && res) {
          setRouteResult(res);
          setRouteEta({
            distanceKm: res.distanceKm,
            durationMins: res.durationMinutes,
          });
        }
        if (isMounted) setIsLoadingRoute(false);
      });
    }
    return () => {
      isMounted = false;
    };
  }, [originCoords.lat, originCoords.lng, destCoords.lat, destCoords.lng]);

  const handleEtaCalculated = (eta: EtaResult) => {
    // Only update if road route API hasn't loaded yet
    if (!routeResult) {
      const kmMatch = eta.distanceText.match(/([\d.]+)/);
      const minMatch = eta.durationText.match(/([\d.]+)/);
      const distanceKm = kmMatch ? parseFloat(kmMatch[1]) : 5.4;
      const durationMins = minMatch ? parseInt(minMatch[1], 10) : 18;
      setRouteEta({ distanceKm, durationMins });
    }
  };

  // Base pricing
  const baseBikeFare = Math.round(50 + Math.max(0, routeEta.distanceKm - 2) * 10);
  const base3WheelerFare = Math.round(90 + Math.max(0, routeEta.distanceKm - 2) * 15);

  const appliedPromo = state.promos.courier;
  const promoDiscount = appliedPromo === "DIWALI100" ? 50 : 0;

  const bikeFinalFare = Math.max(30, baseBikeFare - promoDiscount);
  const threeWheelerFinalFare = Math.max(60, base3WheelerFare - promoDiscount);

  const currentFare = selectedVehicle === "bike" ? bikeFinalFare : threeWheelerFinalFare;

  // Calculate drop time dynamically
  const dropTime = useMemo(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + (routeEta.durationMins || 18));
    return now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
  }, [routeEta.durationMins]);

  const handleApplyCoupon = (code: string) => {
    const clean = code.trim().toUpperCase();
    if (clean === "DIWALI100") {
      applyPromo("courier", "DIWALI100");
      showToast("🎉 Coupon DIWALI100 applied: Flat ₹50 OFF!");
      setShowCouponModal(false);
    } else {
      showToast("Invalid coupon code. Try DIWALI100");
    }
  };

  const handleBook = async () => {
    try {
      setIsBooking(true);
      const pickupAddressStr =
        state.courier.pickupAddress || pickupPlace.line || pickupPlace.label;
      const dropAddressStr =
        state.courier.dropAddress || dropPlace.line || dropPlace.label;

      setCourier({
        vehicleType: selectedVehicle,
        payAt,
        fare: currentFare,
        weight: selectedVehicle === "bike" ? "Upto 20 kgs" : "Upto 500 kgs",
        routePolyline: routeResult?.encodedPolyline,
        roadDistanceKm: routeResult?.distanceKm ?? routeEta.distanceKm,
        estimatedDurationMins: routeResult?.durationMinutes ?? routeEta.durationMins,
        pickupAddress: pickupAddressStr,
        dropAddress: dropAddressStr,
      });

      const destinationStr = `${pickupPlace.label || "Pickup"} → ${dropPlace.label || "Drop"}`;
      const res = await placeOrder("courier", paymentMethod, destinationStr);
      if (res.ok && res.order) {
        push({ name: "courierSearching", orderId: res.order.id });
      } else {
        showToast((res as any).error || "Could not create courier booking. Please try again.");
      }
    } catch (e: any) {
      showToast(e?.message || "Booking failed.");
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Full Screen Map Preview */}
      <View style={StyleSheet.absoluteFill}>
        <GoogleMap
          origin={originCoords}
          destination={destCoords}
          routeCoordinates={routeResult?.coordinates}
          theme="blue"
          showRecenterBtn={true}
          showsUserLocation={true}
          onEtaCalculated={handleEtaCalculated}
        />
      </View>

      {/* Floating Header Destination Pill */}
      <SafeAreaView style={styles.topBar} edges={["top"]}>
        <View style={styles.topRow}>
          {/* Back button */}
          <TouchableOpacity
            style={styles.floatingRoundBtn}
            onPress={back}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Icon name="arrow" size={20} color="#151B2B" />
          </TouchableOpacity>

          {/* Destination pill with edit pencil */}
          <TouchableOpacity
            style={styles.destinationPill}
            onPress={back}
            activeOpacity={0.85}
          >
            <Text style={styles.destinationPillText} numberOfLines={1}>
              {dropPlace.label}
            </Text>
            <Text style={styles.editIcon}>✏️</Text>
          </TouchableOpacity>

          {/* Recenter button */}
          <TouchableOpacity
            style={styles.floatingRoundBtn}
            onPress={() => showToast("Centered on route")}
            accessibilityRole="button"
            accessibilityLabel="Recenter map"
          >
            <Icon name="pin" size={18} color="#151B2B" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Bottom Sheet Container */}
      <View style={[styles.bottomContainer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        {/* Floating Multi-Parcel Promotional Card */}
        {showPromoBanner && (
          <View style={styles.multiParcelBanner}>
            <View style={styles.bannerLeftCol}>
              <Text style={styles.bannerTitle}>Send multiple parcels!</Text>
              <Text style={styles.bannerSubtitle}>One after another</Text>
            </View>
            <View style={styles.bannerGraphicWrap}>
              <Text style={styles.boxesGraphic}>📦📦</Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowPromoBanner(false)}
              style={styles.closeBannerBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.closeBannerIcon}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Vehicle Selection Sheet */}
        <View style={styles.sheetCard}>
          {/* Grab handle */}
          <View style={styles.dragHandleWrap}>
            <View style={styles.dragHandle} />
          </View>

          {/* Vehicle Option 1: Parcel on Bike */}
          <TouchableOpacity
            style={[
              styles.vehicleOptionCard,
              selectedVehicle === "bike" && styles.vehicleOptionCardActive,
            ]}
            onPress={() => setSelectedVehicle("bike")}
            activeOpacity={0.88}
          >
            <View style={styles.vehicleIconWrap}>
              <Text style={styles.vehicleEmoji}>🛵</Text>
            </View>

            <View style={styles.vehicleDetailsCol}>
              <View style={styles.vehicleTitleRow}>
                <Text style={styles.vehicleName}>Parcel on Bike</Text>
                <View style={styles.fastestBadge}>
                  <Text style={styles.fastestBadgeText}>FASTEST</Text>
                </View>
              </View>
              <Text style={styles.vehicleCapacity}>Send upto 20 kgs</Text>
              <Text style={styles.vehicleTimeText}>
                4 mins away • Drop {dropTime}
              </Text>
            </View>

            <View style={styles.vehiclePriceCol}>
              <Text style={styles.vehiclePrice}>₹{bikeFinalFare}</Text>
              {promoDiscount > 0 && (
                <Text style={styles.vehicleStriked}>₹{baseBikeFare}</Text>
              )}
            </View>
          </TouchableOpacity>

          {/* Vehicle Option 2: Parcel on 3-wheeler */}
          <TouchableOpacity
            style={[
              styles.vehicleOptionCard,
              selectedVehicle === "3wheeler" && styles.vehicleOptionCardActive,
            ]}
            onPress={() => setSelectedVehicle("3wheeler")}
            activeOpacity={0.88}
          >
            <View style={styles.vehicleIconWrap}>
              <Text style={styles.vehicleEmoji}>🛺</Text>
            </View>

            <View style={styles.vehicleDetailsCol}>
              <Text style={styles.vehicleName}>Parcel on 3-wheeler</Text>
              <Text style={styles.vehicleCapacity}>Send upto 500 kgs</Text>
              <Text style={styles.vehicleTimeText}>
                4 mins • Drop {dropTime}
              </Text>
            </View>

            <View style={styles.vehiclePriceCol}>
              <Text style={styles.vehiclePrice}>₹{threeWheelerFinalFare}</Text>
              {promoDiscount > 0 && (
                <Text style={styles.vehicleStriked}>₹{base3WheelerFare}</Text>
              )}
            </View>
          </TouchableOpacity>

          {/* Horizontal Actions Row: Payment & Offers */}
          <View style={styles.actionsRow}>
            {/* Payment Method Selector */}
            <TouchableOpacity
              style={styles.actionPillBtn}
              onPress={() => setShowPaymentPicker(true)}
              activeOpacity={0.8}
            >
              <Icon name="wallet" size={17} color="#151B2B" />
              <Text style={styles.actionPillText}>
                {paymentMethod === "cod"
                  ? "Cash"
                  : paymentMethod === "wallet"
                  ? "Wallet"
                  : "UPI"}
              </Text>
              <Text style={styles.chevronIcon}>›</Text>
            </TouchableOpacity>

            {/* Offers / Coupons */}
            <TouchableOpacity
              style={styles.actionPillBtn}
              onPress={() => setShowCouponModal(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.percentIcon}>%</Text>
              <Text style={styles.actionPillText}>
                {appliedPromo ? `${appliedPromo} applied` : "Offers"}
              </Text>
              <Text style={styles.chevronIcon}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Payment Timing Row: Pay at Pickup vs Pay at Drop */}
          <View style={styles.payAtRow}>
            <View style={styles.payAtLabelCol}>
              <Icon name="wallet" size={18} color="#151B2B" />
              <Text style={styles.payAtLabel}>PAY AT</Text>
            </View>

            <View style={styles.payAtSegment}>
              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  payAt === "pickup" && styles.segmentBtnActive,
                ]}
                onPress={() => setPayAt("pickup")}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.segmentBtnText,
                    payAt === "pickup" && styles.segmentBtnTextActive,
                  ]}
                >
                  Pickup
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  payAt === "drop" && styles.segmentBtnActive,
                ]}
                onPress={() => setPayAt("drop")}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.segmentBtnText,
                    payAt === "drop" && styles.segmentBtnTextActive,
                  ]}
                >
                  Drop
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Main Booking Action Button */}
          <TouchableOpacity
            style={styles.bookCtaBtn}
            onPress={handleBook}
            disabled={isBooking}
            activeOpacity={0.88}
          >
            {isBooking ? (
              <ActivityIndicator color="#151B2B" size="small" />
            ) : (
              <Text style={styles.bookCtaBtnText}>
                {selectedVehicle === "bike"
                  ? "Book Parcel on Bike"
                  : "Book Parcel on 3-wheeler"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Payment Method Modal */}
      <Modal
        visible={showPaymentPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPaymentPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Choose Payment Method</Text>

            <TouchableOpacity
              style={[
                styles.methodRow,
                paymentMethod === "cod" && styles.methodRowActive,
              ]}
              onPress={() => {
                setPaymentMethod("cod");
                setShowPaymentPicker(false);
              }}
            >
              <Text style={styles.methodEmoji}>💵</Text>
              <View style={styles.methodInfo}>
                <Text style={styles.methodName}>Cash on Delivery</Text>
                <Text style={styles.methodSub}>Pay cash at {payAt}</Text>
              </View>
              {paymentMethod === "cod" && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.methodRow,
                paymentMethod === "upi" && styles.methodRowActive,
              ]}
              onPress={() => {
                setPaymentMethod("upi");
                setShowPaymentPicker(false);
              }}
            >
              <Text style={styles.methodEmoji}>⚡</Text>
              <View style={styles.methodInfo}>
                <Text style={styles.methodName}>UPI / QR Code</Text>
                <Text style={styles.methodSub}>Google Pay, PhonePe, Paytm</Text>
              </View>
              {paymentMethod === "upi" && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.methodRow,
                paymentMethod === "wallet" && styles.methodRowActive,
              ]}
              onPress={() => {
                setPaymentMethod("wallet");
                setShowPaymentPicker(false);
              }}
            >
              <Text style={styles.methodEmoji}>👛</Text>
              <View style={styles.methodInfo}>
                <Text style={styles.methodName}>RoadRider Wallet</Text>
                <Text style={styles.methodSub}>Balance: ₹{state.wallet.balance}</Text>
              </View>
              {paymentMethod === "wallet" && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setShowPaymentPicker(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Coupon Modal */}
      <Modal
        visible={showCouponModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCouponModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Apply Courier Coupon</Text>
            <View style={styles.couponInputRow}>
              <TextInput
                style={styles.couponInput}
                placeholder="Enter coupon code"
                placeholderTextColor="#94A3B8"
                value={couponInput}
                onChangeText={setCouponInput}
                autoCapitalize="characters"
              />
              <TouchableOpacity
                style={styles.couponApplyBtn}
                onPress={() => handleApplyCoupon(couponInput)}
              >
                <Text style={styles.couponApplyText}>Apply</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.suggestedCoupon}
              onPress={() => handleApplyCoupon("DIWALI100")}
            >
              <View style={styles.suggestedBadge}>
                <Text style={styles.suggestedCode}>DIWALI100</Text>
              </View>
              <Text style={styles.suggestedDesc}>
                Flat ₹50 OFF on your first parcel booking!
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setShowCouponModal(false)}
            >
              <Text style={styles.modalCancelText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    zIndex: 10,
    paddingHorizontal: 16,
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
  destinationPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    gap: 8,
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 4,
    maxWidth: SCREEN_WIDTH - 120,
  },
  destinationPillText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#151B2B",
  },
  editIcon: {
    fontSize: 12,
  },
  bottomContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
  },
  multiParcelBanner: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  bannerLeftCol: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1E40AF",
    letterSpacing: -0.2,
  },
  bannerSubtitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 2,
  },
  bannerGraphicWrap: {
    paddingHorizontal: 8,
  },
  boxesGraphic: {
    fontSize: 22,
  },
  closeBannerBtn: {
    padding: 4,
  },
  closeBannerIcon: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "800",
  },
  sheetCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
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
  vehicleOptionCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    marginBottom: 10,
    gap: 12,
  },
  vehicleOptionCardActive: {
    borderColor: "#1E3A8A",
    backgroundColor: "#F8FAFF",
  },
  vehicleIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  vehicleEmoji: {
    fontSize: 24,
  },
  vehicleDetailsCol: {
    flex: 1,
  },
  vehicleTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  vehicleName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#151B2B",
    letterSpacing: -0.2,
  },
  fastestBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  fastestBadgeText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#15803D",
  },
  vehicleCapacity: {
    fontSize: 12,
    color: "#68758A",
    fontWeight: "500",
    marginTop: 2,
  },
  vehicleTimeText: {
    fontSize: 12,
    color: "#68758A",
    marginTop: 2,
  },
  vehiclePriceCol: {
    alignItems: "flex-end",
  },
  vehiclePrice: {
    fontSize: 20,
    fontWeight: "800",
    color: "#151B2B",
  },
  vehicleStriked: {
    fontSize: 12,
    color: "#94A3B8",
    textDecorationLine: "line-through",
    marginTop: 1,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
    marginBottom: 10,
  },
  actionPillBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 8,
  },
  percentIcon: {
    fontSize: 15,
    fontWeight: "800",
    color: "#151B2B",
  },
  actionPillText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#151B2B",
  },
  chevronIcon: {
    fontSize: 16,
    color: "#68758A",
    fontWeight: "700",
  },
  payAtRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    marginBottom: 8,
  },
  payAtLabelCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  payAtLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#151B2B",
    letterSpacing: 0.5,
  },
  payAtSegment: {
    flexDirection: "row",
    gap: 8,
  },
  segmentBtn: {
    paddingHorizontal: 20,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  segmentBtnActive: {
    backgroundColor: "#1E3A8A",
    borderColor: "#1E3A8A",
  },
  segmentBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#68758A",
  },
  segmentBtnTextActive: {
    color: "#FFFFFF",
  },
  bookCtaBtn: {
    height: 52,
    backgroundColor: "#FBBF24",
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    shadowColor: "#F59E0B",
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
  },
  bookCtaBtnText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#151B2B",
    letterSpacing: -0.2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#151B2B",
    marginBottom: 14,
  },
  methodRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 10,
    gap: 12,
  },
  methodRowActive: {
    borderColor: "#1E3A8A",
    backgroundColor: "#F8FAFF",
  },
  methodEmoji: {
    fontSize: 22,
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#151B2B",
  },
  methodSub: {
    fontSize: 11,
    color: "#68758A",
    marginTop: 1,
  },
  checkmark: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E3A8A",
  },
  couponInputRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  couponInput: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 12,
    fontWeight: "700",
    color: "#151B2B",
  },
  couponApplyBtn: {
    height: 46,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: "#151B2B",
    alignItems: "center",
    justifyContent: "center",
  },
  couponApplyText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  suggestedCoupon: {
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FFEDD5",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  suggestedBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#EA580C",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  suggestedCode: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  suggestedDesc: {
    fontSize: 12,
    color: "#9A3412",
    fontWeight: "500",
  },
  modalCancelBtn: {
    paddingVertical: 12,
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#68758A",
  },
});
